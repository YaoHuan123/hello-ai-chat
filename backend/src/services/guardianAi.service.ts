import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "../config";
import { logWarn } from "../logger";
import type { GuardianRoleDef } from "../constants/guardianCatalog";
import { GUARDIAN_STANCE_LABEL } from "../constants/guardianCatalog";
import { loadGuardianProactiveSystemTemplate, loadGuardianProactiveUserTemplate } from "./guardianPromptFiles";
import { disableDoubaoThinking } from "./openaiCompat";
import { newAiReplyTraceId, writeAiReplyTrace } from "./aiReplyTrace";

export type GuardianChatLine = {
  from: "owner" | "peer" | "guardian";
  speaker: string;
  text: string;
  ts: number;
};

const MAX_ROLE_CHARS = 2000;
const MAX_HISTORY_CHARS = 2400;
const MAX_LINE_LEN = 160;
const GUARDIAN_TEMPERATURE = 0.75;

export class GuardianAiService {
  isConfigured(): boolean {
    return OPENAI_API_KEY.length > 0;
  }

  buildRoleBlock(role: GuardianRoleDef): string {
    const lines = [
      `名称：${role.name}（${role.title}）`,
      `群聊立场：${GUARDIAN_STANCE_LABEL[role.stance]} — ${role.stanceNote}`,
      `人设：${role.tagline}`,
      `对用户：${role.userMessage}`,
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
    groupId?: string;
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

    const traceId = newAiReplyTraceId();
    const traceBase = {
      id: traceId,
      ts: new Date().toISOString(),
      kind: "guardian_proactive" as const,
      groupId: args.groupId?.trim() || undefined,
      guardianRoleId: args.role.id,
      guardianRoleName: args.role.name,
      latestPeerText: args.latestPeerText.trim() || undefined,
      model: OPENAI_MODEL,
      temperature: GUARDIAN_TEMPERATURE,
      input: { system, user },
    };

    const url = `${OPENAI_BASE_URL}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const body: Record<string, unknown> = {
      model: OPENAI_MODEL,
      temperature: GUARDIAN_TEMPERATURE,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    disableDoubaoThinking(body);

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
      logWarn("guardian_ai.fetch_failed", { message });
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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content.trim()) as Record<string, unknown>;
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

    const speak = parsed.speak;
    const lineRaw = parsed.line;
    if (speak !== true) {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        output: { raw: content.trim(), parsed },
      });
      return null;
    }
    if (typeof lineRaw !== "string") {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        output: { raw: content.trim(), parsed },
        error: "AI_PARSE_ERROR: missing line",
      });
      throw new Error("AI_PARSE_ERROR");
    }
    const t = lineRaw.replace(/\r\n/g, "\n").trim();
    if (!t) {
      writeAiReplyTrace({
        ...traceBase,
        durationMs: Date.now() - t0,
        output: { raw: content.trim(), parsed, line: "" },
      });
      return null;
    }
    const stripped = stripGuardianSelfIntro(t, args.role.name);
    const line = stripped.length > MAX_LINE_LEN ? stripped.slice(0, MAX_LINE_LEN) : stripped;
    writeAiReplyTrace({
      ...traceBase,
      durationMs: Date.now() - t0,
      output: { raw: content.trim(), parsed, line },
    });
    return line;
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

/** 去掉「林小姐插一句，」类自称前缀（界面已展示发言人）。 */
function stripGuardianSelfIntro(line: string, roleName: string): string {
  const name = roleName.trim();
  if (!name) return line.trim();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return line
    .replace(new RegExp(`^${escaped}(插一句|说一句|提醒一下|申请插播)[，,：:\\s]*`), "")
    .trim();
}
