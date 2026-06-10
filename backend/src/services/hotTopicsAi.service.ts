import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, HOT_TOPICS_AI_TIMEOUT_MS } from "../config";
import { logWarn } from "../logger";
import type { HotTopicPlatform, RawTrendItem } from "./hotTopicsSources.service";
import { formatTrendsBlock } from "./hotTopicsSources.service";
import { loadHotTopicsSystemTemplate, loadHotTopicsUserTemplate } from "./hotTopicsPromptFiles";

export type GeneratedHotTopic = {
  id: string;
  question: string;
  hint?: string;
  sourcePlatform?: HotTopicPlatform;
  sourceTitle?: string;
};

const MAX_QUESTIONS = 12;
const MIN_QUESTIONS = 6;
const MAX_QUESTION_LEN = 80;
const MAX_HINT_LEN = 32;
const MAX_SOURCE_TITLE_LEN = 120;

const PLATFORM_SET = new Set<string>(["weibo", "zhihu", "douyin"]);

export class HotTopicsAiService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  async generateQuestions(trends: RawTrendItem[], batchId: string): Promise<GeneratedHotTopic[]> {
    const systemTpl = loadHotTopicsSystemTemplate();
    const userTpl = loadHotTopicsUserTemplate();
    const system = systemTpl.trimEnd();
    const user = userTpl.replaceAll("{{TRENDS_BLOCK}}", formatTrendsBlock(trends)).trimEnd();
    if (!system.trim() || !user.trim()) {
      throw new Error("AI_PROMPT_EMPTY");
    }

    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HOT_TOPICS_AI_TIMEOUT_MS);

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
          temperature: 0.85,
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
      logWarn("hot_topics_ai.fetch_failed", { message: e instanceof Error ? e.message : String(e) });
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
    if (!parsed || typeof parsed !== "object" || !("topics" in parsed)) {
      throw new Error("AI_PARSE_ERROR");
    }
    const arr = (parsed as { topics: unknown }).topics;
    if (!Array.isArray(arr)) {
      throw new Error("AI_PARSE_ERROR");
    }

    const out: GeneratedHotTopic[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i];
      if (!row || typeof row !== "object") continue;
      const questionRaw = (row as { question?: unknown }).question;
      if (typeof questionRaw !== "string") continue;
      const question = questionRaw.replace(/\r\n/g, "\n").trim();
      if (!question) continue;
      const clippedQ = question.length > MAX_QUESTION_LEN ? question.slice(0, MAX_QUESTION_LEN) : question;
      const key = clippedQ.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let hint: string | undefined;
      const hintRaw = (row as { hint?: unknown }).hint;
      if (typeof hintRaw === "string") {
        const h = hintRaw.trim();
        if (h) hint = h.length > MAX_HINT_LEN ? h.slice(0, MAX_HINT_LEN) : h;
      }

      let sourcePlatform: HotTopicPlatform | undefined;
      const platformRaw = (row as { sourcePlatform?: unknown }).sourcePlatform;
      if (typeof platformRaw === "string" && PLATFORM_SET.has(platformRaw)) {
        sourcePlatform = platformRaw as HotTopicPlatform;
      }

      let sourceTitle: string | undefined;
      const sourceTitleRaw = (row as { sourceTitle?: unknown }).sourceTitle;
      if (typeof sourceTitleRaw === "string") {
        const st = sourceTitleRaw.trim();
        if (st) sourceTitle = st.length > MAX_SOURCE_TITLE_LEN ? st.slice(0, MAX_SOURCE_TITLE_LEN) : st;
      }

      out.push({
        id: `hot-${batchId}-${i + 1}`,
        question: clippedQ,
        hint,
        sourcePlatform,
        sourceTitle,
      });
      if (out.length >= MAX_QUESTIONS) break;
    }

    if (out.length < MIN_QUESTIONS) {
      throw new Error("AI_PARSE_ERROR");
    }
    return out;
  }
}
