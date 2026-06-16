import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { RELATION_LABELS, type RelationType } from "../constants/relationTypes";
import { relationSuggestGuidance } from "../constants/relationSuggestGuidance";
import { REPLY_SUGGEST_GROUNDING_RULES } from "../constants/replySuggestGrounding";
import { logWarn } from "../logger";
import { loadMolSuggestSystemTemplate, loadMolSuggestUserTemplate } from "./molSuggestPromptFiles";
import { loadRelationSuggestSystemTemplate, loadRelationSuggestUserTemplate } from "./relationSuggestPromptFiles";
import { disableDoubaoThinking } from "./openaiCompat";

export type SuggestLastMessage = { from: "me" | "peer"; text: string; ts: number };

const MAX_PERSONA_CHARS = 3000;
const MAX_HISTORY_CHARS = 2000;
const MAX_SUGGESTION_LEN = 200;
const MAX_SUGGESTIONS = 3;
const MAX_USER_DRAFT_CHARS = 500;

const USER_DRAFT_SECTION = `【我正在输入的回复（尚未发送，须优先承接）】
{{USER_DRAFT}}

须基于上述草稿生成建议：可补语气或少量衔接，但不得改动或无视草稿中的时间、地点与态度。草稿里的时间、地点即为准，勿把更早聊天里的餐厅、品牌、门店或碰面点混入建议；若草稿已足够完整，可直接润色后输出。

`;

type JsonLlmOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export class AiReplyService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  async suggestReplies(args: {
    personaBlock: string;
    lastMessages: SuggestLastMessage[];
    relationType?: RelationType | null;
    userDraft?: string;
  }): Promise<string[]> {
    const persona = truncate(args.personaBlock.trim(), MAX_PERSONA_CHARS);
    const history = formatChatHistory(args.lastMessages);

    const systemTpl = loadMolSuggestSystemTemplate();
    const userTpl = loadMolSuggestUserTemplate();
    const relationLine =
      args.relationType && RELATION_LABELS[args.relationType]
        ? `【与对方的关系】${RELATION_LABELS[args.relationType]}（请按此关系的语气、边界与亲密度生成回复）\n\n`
        : "";
    const system = (relationLine + systemTpl.replaceAll("{{PERSONA_BLOCK}}", persona || "（无额外资料）"))
      .replaceAll("{{GROUNDING_RULES}}", REPLY_SUGGEST_GROUNDING_RULES)
      .trimEnd();
    const user = userTpl
      .replaceAll("{{USER_DRAFT_SECTION}}", formatUserDraftSection(args.userDraft))
      .replaceAll("{{CHAT_HISTORY}}", history)
      .trimEnd();
    return this.callSuggestLlm(system, user);
  }

  async suggestRepliesByRelation(args: {
    relationType: RelationType;
    lastMessages: SuggestLastMessage[];
    userDraft?: string;
  }): Promise<string[]> {
    const history = formatChatHistory(args.lastMessages);
    const label = RELATION_LABELS[args.relationType];
    const guidance = relationSuggestGuidance(args.relationType);

    const systemTpl = loadRelationSuggestSystemTemplate();
    const userTpl = loadRelationSuggestUserTemplate();
    const system = systemTpl
      .replaceAll("{{RELATION_LABEL}}", label)
      .replaceAll("{{RELATION_GUIDANCE}}", guidance)
      .replaceAll("{{GROUNDING_RULES}}", REPLY_SUGGEST_GROUNDING_RULES)
      .trimEnd();
    const user = userTpl
      .replaceAll("{{USER_DRAFT_SECTION}}", formatUserDraftSection(args.userDraft))
      .replaceAll("{{CHAT_HISTORY}}", history)
      .trimEnd();
    return this.callSuggestLlm(system, user);
  }

  private async callSuggestLlm(system: string, user: string): Promise<string[]> {
    const parsed = await this.callJsonLlm(system, user);
    if (!("suggestions" in parsed)) {
      throw new Error("AI_PARSE_ERROR");
    }
    const arr = parsed.suggestions;
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

  private async callJsonLlm(system: string, user: string, options: JsonLlmOptions = {}): Promise<Record<string, unknown>> {
    if (!system.trim() || !user.trim()) {
      throw new Error("AI_PROMPT_EMPTY");
    }

    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const model = options.model ?? OPENAI_MODEL;
    const body: Record<string, unknown> = {
      model,
      temperature: options.temperature ?? 0.8,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
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
    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI_PARSE_ERROR");
    }
    return parsed as Record<string, unknown>;
  }
}

function formatChatHistory(lastMessages: SuggestLastMessage[]): string {
  const historyLines = lastMessages.slice(-12).map((m) => {
    const role = m.from === "me" ? "我" : "对方";
    return `[${role}] ${m.text.replace(/\s+/g, " ").trim()}`;
  });
  let history = historyLines.join("\n");
  if (history.length > MAX_HISTORY_CHARS) {
    history = history.slice(history.length - MAX_HISTORY_CHARS);
  }
  return history || "（尚无消息）";
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function formatUserDraftSection(userDraft: string | undefined): string {
  const draft = truncate((userDraft ?? "").trim(), MAX_USER_DRAFT_CHARS);
  if (!draft) return "";
  return USER_DRAFT_SECTION.replaceAll("{{USER_DRAFT}}", draft);
}
