import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { RELATION_LABELS, type RelationType } from "../constants/relationTypes";
import { relationSuggestGuidance } from "../constants/relationSuggestGuidance";
import {
  buildEntertainmentRelationBlock,
  buildEntertainmentSuggestBlock,
  buildSuggestRelationLine,
  shouldBoostEntertainment,
  entertainmentSuggestTemperature,
} from "../constants/molEntertainmentSuggest";
import { pickSuggestChatContext } from "../constants/suggestChatContext";
import { logWarn } from "../logger";
import { loadMolSuggestSystemTemplate, loadMolSuggestUserTemplate } from "./molSuggestPromptFiles";
import { loadRelationSuggestSystemTemplate, loadRelationSuggestUserTemplate } from "./relationSuggestPromptFiles";
import { disableDoubaoThinking } from "./openaiCompat";
import { loadPromptFile } from "./promptLoader";
import { loadSuyanSuggestBlock } from "./settingsRuntime.service";
import { normalizeSuyanSettingsId } from "./settingsFiles.service";
import { newAiReplyTraceId, writeAiReplyTrace, type AiReplyTraceContext } from "./aiReplyTrace";

export type SuggestLastMessage = { from: "me" | "peer"; text: string; ts: number };

const MAX_PERSONA_CHARS = 3000;
const MAX_HISTORY_CHARS = 2000;
const MAX_SUGGESTION_LEN = 30;
const MAX_SUGGESTIONS = 3;
const MAX_USER_DRAFT_CHARS = 500;

function buildSuyanGroundingRules(molId: string | undefined, entertainmentBlock: string): string {
  const base = normalizeSuyanSettingsId(molId ?? "");
  const groundingBase = loadPromptFile("suyan-suggest-grounding-base.txt");
  const specific = base ? loadSuyanSuggestBlock(base) : "";
  return `${entertainmentBlock}${groundingBase}${specific ? `\n${specific}` : ""}`.trimEnd();
}

type JsonLlmOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  trace?: AiReplyTraceContext;
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
    molId?: string;
  }): Promise<string[]> {
    const persona = truncate(args.personaBlock.trim(), MAX_PERSONA_CHARS);
    const history = formatChatHistory(args.lastMessages);
    const entertainmentBoost = shouldBoostEntertainment(args.molId, args.relationType);

    const systemTpl = loadMolSuggestSystemTemplate();
    const userTpl = loadMolSuggestUserTemplate();
    const relationLine =
      args.relationType && RELATION_LABELS[args.relationType]
        ? entertainmentBoost
          ? buildEntertainmentRelationBlock(args.relationType)
          : buildSuggestRelationLine(args.relationType)
        : "";
    const entertainmentBlock =
      entertainmentBoost && args.relationType ? `${buildEntertainmentSuggestBlock(args.relationType)}\n` : "";
    const system = (relationLine + systemTpl.replaceAll("{{PERSONA_BLOCK}}", persona || "（无额外资料）"))
      .replaceAll("{{GROUNDING_RULES}}", buildSuyanGroundingRules(args.molId, entertainmentBlock))
      .trimEnd();
    const user = userTpl
      .replaceAll("{{USER_DRAFT_SECTION}}", formatUserDraftSection(args.userDraft))
      .replaceAll("{{CHAT_HISTORY}}", history)
      .trimEnd();
    return this.callSuggestLlm(system, user, {
      temperature: entertainmentBoost ? entertainmentSuggestTemperature() : undefined,
      trace: {
        kind: "suyan_suggest",
        suyanId: args.molId,
        relationType: args.relationType,
        entertainmentBoost,
      },
    });
  }

  async suggestRepliesByRelation(args: {
    relationType: RelationType;
    lastMessages: SuggestLastMessage[];
    userDraft?: string;
  }): Promise<string[]> {
    const history = formatChatHistory(args.lastMessages);
    const label = RELATION_LABELS[args.relationType];
    const guidance = relationSuggestGuidance(args.relationType);
    const groundingRules = loadPromptFile("relation-suggest-grounding-rules.txt");

    const systemTpl = loadRelationSuggestSystemTemplate();
    const userTpl = loadRelationSuggestUserTemplate();
    const system = systemTpl
      .replaceAll("{{RELATION_LABEL}}", label)
      .replaceAll("{{RELATION_GUIDANCE}}", guidance)
      .replaceAll("{{GROUNDING_RULES}}", groundingRules)
      .trimEnd();
    const user = userTpl
      .replaceAll("{{USER_DRAFT_SECTION}}", formatUserDraftSection(args.userDraft))
      .replaceAll("{{CHAT_HISTORY}}", history)
      .trimEnd();
    return this.callSuggestLlm(system, user, {
      trace: {
        kind: "relation_suggest",
        relationType: args.relationType,
      },
    });
  }

  private async callSuggestLlm(system: string, user: string, options: JsonLlmOptions = {}): Promise<string[]> {
    const parsed = await this.callJsonLlm(system, user, options);
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
    const temperature = options.temperature ?? 0.8;
    const body: Record<string, unknown> = {
      model,
      temperature,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    disableDoubaoThinking(body);

    const traceId = newAiReplyTraceId();
    const traceBase = {
      id: traceId,
      ts: new Date().toISOString(),
      kind: options.trace?.kind ?? "suyan_suggest",
      suyanId: options.trace?.suyanId?.trim() || undefined,
      relationType: options.trace?.relationType ?? undefined,
      entertainmentBoost: options.trace?.entertainmentBoost,
      model,
      temperature,
      input: { system, user },
    };

    const t0 = Date.now();
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
        writeAiReplyTrace({
          ...traceBase,
          durationMs: Date.now() - t0,
          error: "AI_TIMEOUT",
        });
        throw new Error("AI_TIMEOUT");
      }
      const message = e instanceof Error ? e.message : String(e);
      logWarn("ai_reply.fetch_failed", { message });
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        error: `AI_PROVIDER_ERROR: ${message}`,
      });
      throw new Error("AI_PROVIDER_ERROR");
    } finally {
      clearTimeout(timer);
    }

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg = typeof raw.error === "object" && raw.error !== null ? String((raw.error as { message?: string }).message ?? "") : "";
      logWarn("ai_reply.openai_error", { status: res.status, msg });
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        error: `AI_PROVIDER_ERROR: HTTP ${res.status} ${msg}`.trim(),
      });
      throw new Error("AI_PROVIDER_ERROR");
    }

    const choices = raw.choices as unknown;
    if (!Array.isArray(choices) || choices.length < 1) {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        error: "AI_PARSE_ERROR: missing choices",
      });
      throw new Error("AI_PARSE_ERROR");
    }
    const content = (choices[0] as { message?: { content?: string } })?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        error: "AI_PARSE_ERROR: empty content",
      });
      throw new Error("AI_PARSE_ERROR");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        output: { raw: content.trim(), parsed: null },
        error: "AI_PARSE_ERROR: invalid JSON",
      });
      throw new Error("AI_PARSE_ERROR");
    }
    if (!parsed || typeof parsed !== "object") {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        output: { raw: content.trim(), parsed },
        error: "AI_PARSE_ERROR: not an object",
      });
      throw new Error("AI_PARSE_ERROR");
    }

    const suggestions =
      "suggestions" in (parsed as Record<string, unknown>) &&
      Array.isArray((parsed as Record<string, unknown>).suggestions)
        ? ((parsed as Record<string, unknown>).suggestions as unknown[])
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;

    writeAiReplyTrace({
      ...traceBase,
      durationMs: Date.now() - t0,
      output: {
        raw: content.trim(),
        parsed,
        suggestions,
      },
    });

    return parsed as Record<string, unknown>;
  }
}

function formatChatHistory(lastMessages: SuggestLastMessage[]): string {
  const historyLines = pickSuggestChatContext(lastMessages).map((m) => {
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
  return loadPromptFile("suyan-suggest-draft-section.txt").replaceAll("{{USER_DRAFT}}", draft);
}
