import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { logWarn } from "../logger";
import type { MomentItem } from "./moments.service";
import { loadMomentsExploreSystemTemplate, loadMomentsExploreUserTemplate } from "./momentsPromptFiles";
import { disableDoubaoThinking } from "./openaiCompat";

export type ExploreChatLine = { from: "explorer" | "clone"; text: string; ts: number };

const MAX_MOMENTS_CHARS = 4000;
const MAX_HISTORY_CHARS = 2400;
const MAX_REPLY_LEN = 320;

export class MomentsAiService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  buildMomentsBlock(items: MomentItem[]): string {
    if (items.length === 0) return "（TA 尚未发布日常内容）";
    const lines: string[] = [];
    const sorted = [...items].sort((a, b) => b.ts - a.ts).slice(0, 40);
    for (const it of sorted) {
      const body = it.body.trim();
      if (!body) continue;
      if (it.type === "qa" && it.title.trim()) {
        lines.push(`· 问：${it.title.trim()}\n  答：${body}`);
      } else {
        lines.push(`· ${body}`);
      }
    }
    const joined = lines.join("\n");
    return joined.length > MAX_MOMENTS_CHARS ? joined.slice(0, MAX_MOMENTS_CHARS) : joined || "（TA 尚未发布日常内容）";
  }

  async exploreReply(args: {
    ownerName: string;
    moments: MomentItem[];
    lastMessages: ExploreChatLine[];
    latestText: string;
  }): Promise<string> {
    const historyLines = args.lastMessages.slice(-14).map((m) => {
      const who = m.from === "explorer" ? "访客" : "分身";
      return `[${who}] ${m.text.replace(/\s+/g, " ").trim()}`;
    });
    let history = historyLines.join("\n");
    if (history.length > MAX_HISTORY_CHARS) {
      history = history.slice(history.length - MAX_HISTORY_CHARS);
    }

    const systemTpl = loadMomentsExploreSystemTemplate();
    const userTpl = loadMomentsExploreUserTemplate();
    const system = systemTpl.replaceAll("{{OWNER_NAME}}", args.ownerName || "TA").trimEnd();
    const user = userTpl
      .replaceAll("{{MOMENTS_BLOCK}}", this.buildMomentsBlock(args.moments))
      .replaceAll("{{CHAT_HISTORY}}", history || "（尚无对话）")
      .replaceAll("{{LATEST_TEXT}}", args.latestText.trim())
      .trimEnd();
    if (!system.trim() || !user.trim()) {
      throw new Error("AI_PROMPT_EMPTY");
    }

    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const body: Record<string, unknown> = {
      model: OPENAI_MODEL,
      temperature: 0.75,
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
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("AI_TIMEOUT");
      }
      logWarn("moments_ai.fetch_failed", { message: e instanceof Error ? e.message : String(e) });
      throw new Error("AI_PROVIDER_ERROR");
    } finally {
      clearTimeout(timer);
    }

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error("AI_PROVIDER_ERROR");
    }

    const choices = raw.choices as unknown;
    if (!Array.isArray(choices) || choices.length < 1) {
      throw new Error("AI_PARSE_ERROR");
    }
    const content = (choices[0] as { message?: { content?: string } })?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("AI_PARSE_ERROR");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      throw new Error("AI_PARSE_ERROR");
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI_PARSE_ERROR");
    }
    const reply = (parsed as { reply?: unknown }).reply;
    if (typeof reply !== "string") {
      throw new Error("AI_PARSE_ERROR");
    }
    const t = reply.replace(/\r\n/g, "\n").trim();
    if (!t) throw new Error("AI_PARSE_ERROR");
    return t.length > MAX_REPLY_LEN ? t.slice(0, MAX_REPLY_LEN) : t;
  }
}
