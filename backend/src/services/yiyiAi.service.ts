import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { logWarn } from "../logger";
import type { YiyiOwnerChatMessage, YiyiProfile, YiyiTrashItem } from "../types/yiyi";
import { disableDoubaoThinking } from "./openaiCompat";
import {
  loadYiyiBridgeSystemTemplate,
  loadYiyiBridgeUserTemplate,
  loadYiyiOwnerSystemTemplate,
  loadYiyiOwnerUserTemplate,
  loadYiyiTopicsSystemTemplate,
  loadYiyiTopicsUserTemplate,
} from "./yiyiPromptFiles";

const MAX_HISTORY_CHARS = 3000;
const MAX_REPLY_LEN = 240;
const MAX_TOPICS = 4;

export type YiyiOwnerReplyResult = {
  reply: string;
  topics: string[];
  profile: YiyiProfile;
};

export type YiyiBridgeSimResult = {
  status: "effective" | "blocked";
  summary: string;
  tags: string[];
  blockedReason?: string;
  transcript: { from: "a" | "b"; text: string }[];
};

export class YiyiAiService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  buildTrashBlock(items: YiyiTrashItem[]): string {
    const enabled = items.filter((x) => x.enabled);
    if (enabled.length === 0) return "（未设置排斥项）";
    return enabled.map((x) => `· ${x.label}${x.hint ? `（${x.hint}）` : ""}`).join("\n");
  }

  buildProfileBlock(profile: YiyiProfile): string {
    return [
      `关注方向：${profile.socialDirection}`,
      `性格：${profile.personality}`,
      `其它：${profile.other}`,
      `标签：社交 ${profile.tags.social.join("、") || "无"}；性格 ${profile.tags.personality.join("、") || "无"}；其它 ${profile.tags.other.join("、") || "无"}`,
    ].join("\n");
  }

  private formatOwnerHistory(messages: YiyiOwnerChatMessage[]): string {
    const lines = messages.slice(-16).map((m) => {
      const who = m.from === "me" ? "用户" : "YiYi";
      return `[${who}] ${m.text.replace(/\s+/g, " ").trim()}`;
    });
    let history = lines.join("\n");
    if (history.length > MAX_HISTORY_CHARS) {
      history = history.slice(history.length - MAX_HISTORY_CHARS);
    }
    return history || "（尚无对话）";
  }

  private async callJsonLlm(system: string, user: string, temperature = 0.75): Promise<Record<string, unknown>> {
    if (!system.trim() || !user.trim()) throw new Error("AI_PROMPT_EMPTY");

    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const body: Record<string, unknown> = {
      model: OPENAI_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    disableDoubaoThinking(body);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") throw new Error("AI_TIMEOUT");
      logWarn("yiyi_ai.fetch_failed", { message: e instanceof Error ? e.message : String(e) });
      throw new Error("AI_PROVIDER_ERROR");
    } finally {
      clearTimeout(timer);
    }

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error("AI_PROVIDER_ERROR");

    const choices = raw.choices as unknown;
    if (!Array.isArray(choices) || choices.length < 1) throw new Error("AI_PARSE_ERROR");
    const content = (choices[0] as { message?: { content?: string } })?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("AI_PARSE_ERROR");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      throw new Error("AI_PARSE_ERROR");
    }
    if (!parsed || typeof parsed !== "object") throw new Error("AI_PARSE_ERROR");
    return parsed as Record<string, unknown>;
  }

  private parseProfile(raw: unknown, fallback: YiyiProfile): YiyiProfile {
    if (!raw || typeof raw !== "object") return fallback;
    const p = raw as Record<string, unknown>;
    const tagsRaw = p.tags;
    const tagsObj = tagsRaw && typeof tagsRaw === "object" ? (tagsRaw as Record<string, unknown>) : {};
    const pickTags = (key: string): string[] => {
      const arr = tagsObj[key];
      if (!Array.isArray(arr)) return fallback.tags[key as keyof YiyiProfile["tags"]];
      return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()).slice(0, 8);
    };
    return {
      socialDirection: typeof p.socialDirection === "string" && p.socialDirection.trim() ? p.socialDirection.trim() : fallback.socialDirection,
      personality: typeof p.personality === "string" && p.personality.trim() ? p.personality.trim() : fallback.personality,
      other: typeof p.other === "string" && p.other.trim() ? p.other.trim() : fallback.other,
      tags: {
        social: pickTags("social"),
        personality: pickTags("personality"),
        other: pickTags("other"),
      },
    };
  }

  async ownerReply(args: {
    trash: YiyiTrashItem[];
    profile: YiyiProfile;
    history: YiyiOwnerChatMessage[];
    userText: string;
  }): Promise<YiyiOwnerReplyResult> {
    const system = loadYiyiOwnerSystemTemplate();
    const userTpl = loadYiyiOwnerUserTemplate();
    const user = userTpl
      .replaceAll("{{TRASH_BLOCK}}", this.buildTrashBlock(args.trash))
      .replaceAll("{{PROFILE_BLOCK}}", this.buildProfileBlock(args.profile))
      .replaceAll("{{CHAT_HISTORY}}", this.formatOwnerHistory(args.history))
      .replaceAll("{{USER_TEXT}}", args.userText.trim())
      .trimEnd();

    const parsed = await this.callJsonLlm(system, user, 0.8);
    const replyRaw = parsed.reply;
    if (typeof replyRaw !== "string" || !replyRaw.trim()) throw new Error("AI_PARSE_ERROR");
    let reply = replyRaw.replace(/\r\n/g, "\n").trim();
    if (reply.length > MAX_REPLY_LEN) reply = reply.slice(0, MAX_REPLY_LEN);

    const topicsRaw = parsed.topics;
    const topics: string[] = [];
    if (Array.isArray(topicsRaw)) {
      for (const t of topicsRaw) {
        if (typeof t !== "string") continue;
        const s = t.trim();
        if (!s) continue;
        topics.push(s.length > 80 ? s.slice(0, 80) : s);
        if (topics.length >= MAX_TOPICS) break;
      }
    }

    const profile = this.parseProfile(parsed.profile, args.profile);
    return { reply, topics, profile };
  }

  async suggestTopics(profile: YiyiProfile): Promise<string[]> {
    const system = loadYiyiTopicsSystemTemplate();
    const user = loadYiyiTopicsUserTemplate().replaceAll("{{PROFILE_BLOCK}}", this.buildProfileBlock(profile)).trimEnd();
    const parsed = await this.callJsonLlm(system, user, 0.85);
    const topicsRaw = parsed.topics;
    if (!Array.isArray(topicsRaw)) throw new Error("AI_PARSE_ERROR");
    const topics: string[] = [];
    for (const t of topicsRaw) {
      if (typeof t !== "string") continue;
      const s = t.trim();
      if (!s) continue;
      topics.push(s.length > 80 ? s.slice(0, 80) : s);
      if (topics.length >= MAX_TOPICS) break;
    }
    if (topics.length === 0) throw new Error("AI_PARSE_ERROR");
    return topics;
  }

  async simulateBridge(args: {
    ownerAName: string;
    profileA: YiyiProfile;
    trashA: YiyiTrashItem[];
    ownerBName: string;
    profileB: YiyiProfile;
    trashB: YiyiTrashItem[];
  }): Promise<YiyiBridgeSimResult> {
    const system = loadYiyiBridgeSystemTemplate();
    const userTpl = loadYiyiBridgeUserTemplate();
    const user = userTpl
      .replaceAll("{{OWNER_A_NAME}}", args.ownerAName || "用户A")
      .replaceAll("{{PROFILE_A_BLOCK}}", this.buildProfileBlock(args.profileA))
      .replaceAll("{{TRASH_A_BLOCK}}", this.buildTrashBlock(args.trashA))
      .replaceAll("{{OWNER_B_NAME}}", args.ownerBName || "用户B")
      .replaceAll("{{PROFILE_B_BLOCK}}", this.buildProfileBlock(args.profileB))
      .replaceAll("{{TRASH_B_BLOCK}}", this.buildTrashBlock(args.trashB))
      .trimEnd();

    const parsed = await this.callJsonLlm(system, user, 0.7);
    const statusRaw = parsed.status;
    if (statusRaw !== "effective" && statusRaw !== "blocked") throw new Error("AI_PARSE_ERROR");

    const summaryRaw = parsed.summary;
    if (typeof summaryRaw !== "string" || !summaryRaw.trim()) throw new Error("AI_PARSE_ERROR");
    const summary = summaryRaw.trim().slice(0, 400);

    const tags: string[] = [];
    if (Array.isArray(parsed.tags)) {
      for (const t of parsed.tags) {
        if (typeof t !== "string") continue;
        const s = t.trim();
        if (!s) continue;
        tags.push(s.slice(0, 24));
        if (tags.length >= 6) break;
      }
    }

    const transcript: YiyiBridgeSimResult["transcript"] = [];
    if (Array.isArray(parsed.transcript)) {
      for (const line of parsed.transcript) {
        if (!line || typeof line !== "object") continue;
        const from = (line as { from?: unknown }).from;
        const text = (line as { text?: unknown }).text;
        if ((from !== "a" && from !== "b") || typeof text !== "string" || !text.trim()) continue;
        transcript.push({ from, text: text.trim().slice(0, 320) });
        if (transcript.length >= 12) break;
      }
    }
    if (transcript.length < 2) throw new Error("AI_PARSE_ERROR");

    let blockedReason: string | undefined;
    if (statusRaw === "blocked") {
      const br = parsed.blockedReason;
      blockedReason = typeof br === "string" && br.trim() ? br.trim().slice(0, 200) : "触发沟通边界";
    }

    return { status: statusRaw, summary, tags, blockedReason, transcript };
  }
}
