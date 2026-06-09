import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { logWarn } from "../logger";
import type { GuardianRoleDef } from "../constants/guardianCatalog";
import { loadGuardianProactiveSystemTemplate, loadGuardianProactiveUserTemplate } from "./guardianPromptFiles";

export type GuardianChatLine = {
  from: "owner" | "peer" | "guardian";
  speaker: string;
  text: string;
  ts: number;
};

const MAX_ROLE_CHARS = 2000;
const MAX_HISTORY_CHARS = 2400;
const MAX_LINE_LEN = 160;

export class GuardianAiService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  buildRoleBlock(role: GuardianRoleDef): string {
    const lines = [
      `名称：${role.name}（${role.title}）`,
      `人设：${role.tagline}`,
      `话术风格：${role.speechStyle}`,
      `触发场景：${role.triggers.join("、")}`,
      `接话策略：${role.guardActions.join("、")}`,
      `禁止：${role.forbidden.join("、")}`,
      `示例：${role.sampleProactiveLines.join(" / ")}`,
    ];
    return truncate(lines.join("\n"), MAX_ROLE_CHARS);
  }

  async maybeProactiveSpeak(args: {
    role: GuardianRoleDef;
    protectedName: string;
    lastMessages: GuardianChatLine[];
    latestPeerText: string;
  }): Promise<string | null> {
    if (!this.shouldTryProactive(args.latestPeerText)) {
      return null;
    }

    const historyLines = args.lastMessages.slice(-14).map((m) => {
      const who = m.from === "guardian" ? m.speaker : m.from === "owner" ? "群主" : "群友";
      return `[${who}] ${m.text.replace(/\s+/g, " ").trim()}`;
    });
    let history = historyLines.join("\n");
    if (history.length > MAX_HISTORY_CHARS) {
      history = history.slice(history.length - MAX_HISTORY_CHARS);
    }

    const systemTpl = loadGuardianProactiveSystemTemplate();
    const userTpl = loadGuardianProactiveUserTemplate();
    const system = systemTpl
      .replaceAll("{{ROLE_BLOCK}}", this.buildRoleBlock(args.role))
      .replaceAll("{{PROTECTED_NAME}}", args.protectedName || "群主")
      .trimEnd();
    const user = userTpl.replaceAll("{{CHAT_HISTORY}}", history || "（尚无消息）").trimEnd();
    if (!system.trim() || !user.trim()) {
      throw new Error("AI_PROMPT_EMPTY");
    }

    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.75,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("AI_TIMEOUT");
      }
      logWarn("guardian_ai.fetch_failed", { message: e instanceof Error ? e.message : String(e) });
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
    const speak = (parsed as { speak?: unknown }).speak;
    const line = (parsed as { line?: unknown }).line;
    if (speak !== true) {
      return null;
    }
    if (typeof line !== "string") {
      throw new Error("AI_PARSE_ERROR");
    }
    const t = line.replace(/\r\n/g, "\n").trim();
    if (!t) return null;
    return t.length > MAX_LINE_LEN ? t.slice(0, MAX_LINE_LEN) : t;
  }

  /** 轻量规则：明显寒暄可跳过，节省调用。 */
  private shouldTryProactive(peerText: string): boolean {
    const t = peerText.trim();
    if (!t) return false;
    if (t.length <= 2 && /^[好嗯哦啊哈嘻]+$/.test(t)) return false;
    const pressure =
      /必须|赶紧|马上|证明|不爱我|别人都|随便你|分手|逼|查手机|不听话|为你好|你怎么总是|从来不|最后一次|给我个答复/i;
    if (pressure.test(t)) return true;
    if (t.length >= 18) return true;
    if (t.includes("?") || t.includes("？")) return true;
    return t.length >= 8;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}
