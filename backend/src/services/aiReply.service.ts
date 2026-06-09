import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { logWarn } from "../logger";
import { loadMolSuggestSystemTemplate, loadMolSuggestUserTemplate } from "./molSuggestPromptFiles";

export type SuggestLastMessage = { from: "me" | "peer"; text: string; ts: number };

const MAX_PERSONA_CHARS = 3000;
const MAX_HISTORY_CHARS = 2000;
const MAX_SUGGESTION_LEN = 200;
const MAX_SUGGESTIONS = 3;

export class AiReplyService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  async suggestReplies(args: { personaBlock: string; lastMessages: SuggestLastMessage[] }): Promise<string[]> {
    const persona = truncate(args.personaBlock.trim(), MAX_PERSONA_CHARS);
    const historyLines = args.lastMessages.slice(-12).map((m) => {
      const role = m.from === "me" ? "我" : "对方";
      return `[${role}] ${m.text.replace(/\s+/g, " ").trim()}`;
    });
    let history = historyLines.join("\n");
    if (history.length > MAX_HISTORY_CHARS) {
      history = history.slice(history.length - MAX_HISTORY_CHARS);
    }

    const systemTpl = loadMolSuggestSystemTemplate();
    const userTpl = loadMolSuggestUserTemplate();
    const system = systemTpl.replaceAll("{{PERSONA_BLOCK}}", persona || "（无额外资料）").trimEnd();
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
          temperature: 0.8,
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
      logWarn("ai_reply.fetch_failed", { message: e instanceof Error ? e.message : String(e) });
      throw new Error("AI_PROVIDER_ERROR");
    } finally {
      clearTimeout(timer);
    }

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg = typeof raw.error === "object" && raw.error !== null ? String((raw.error as { message?: string }).message ?? "") : "";
      logWarn("ai_reply.openai_error", { status: res.status, msg });
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
    if (!parsed || typeof parsed !== "object" || !("suggestions" in parsed)) {
      throw new Error("AI_PARSE_ERROR");
    }
    const arr = (parsed as { suggestions: unknown }).suggestions;
    if (!Array.isArray(arr)) {
      throw new Error("AI_PARSE_ERROR");
    }

    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      if (typeof item !== "string") continue;
      const t = item.replace(/\r\n/g, "\n").trim();
      if (!t) continue;
      const clipped = t.length > MAX_SUGGESTION_LEN ? t.slice(0, MAX_SUGGESTION_LEN) : t;
      const key = clipped.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(clipped);
      if (out.length >= MAX_SUGGESTIONS) break;
    }
    if (out.length === 0) {
      throw new Error("AI_PARSE_ERROR");
    }
    return out;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}
