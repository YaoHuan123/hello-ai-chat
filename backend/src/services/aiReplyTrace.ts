import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { AI_REPLY_TRACE_DIR, AI_REPLY_TRACE_ENABLED } from "../config";

export type AiReplyTraceKind = "suyan_suggest" | "relation_suggest" | "guardian_proactive";

/** @deprecated 使用 suyan_suggest */
export type LegacyAiReplyTraceKind = "mol_suggest" | AiReplyTraceKind;

export type AiReplyTraceContext = {
  kind: AiReplyTraceKind;
  suyanId?: string | null;
  relationType?: string | null;
  entertainmentBoost?: boolean;
  groupId?: string | null;
  guardianRoleId?: string | null;
  guardianRoleName?: string | null;
  latestPeerText?: string | null;
};

export type AiReplyTraceRecord = {
  id: string;
  ts: string;
  kind: AiReplyTraceKind;
  suyanId?: string;
  relationType?: string;
  entertainmentBoost?: boolean;
  groupId?: string;
  guardianRoleId?: string;
  guardianRoleName?: string;
  latestPeerText?: string;
  model: string;
  temperature: number;
  durationMs: number;
  input: {
    system: string;
    user: string;
  };
  output?: {
    raw: string;
    parsed: unknown;
    suggestions?: string[];
    line?: string;
  };
  error?: string;
};

function traceDirForKind(kind: AiReplyTraceKind): string {
  return path.join(AI_REPLY_TRACE_DIR, kind);
}

function traceFilePath(kind: AiReplyTraceKind): string {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(traceDirForKind(kind), `${day}.jsonl`);
}

function traceReadablePath(kind: AiReplyTraceKind, id: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(traceDirForKind(kind), `${day}`, `${id}.txt`);
}

function formatReadableTrace(record: AiReplyTraceRecord): string {
  const lines = [
    `=== AI Trace [${record.kind}] ${record.id} ===`,
    `time: ${record.ts}`,
    `kind: ${record.kind}`,
    ...(record.suyanId ? [`suyanId: ${record.suyanId}`] : []),
    ...(record.relationType ? [`relationType: ${record.relationType}`] : []),
    ...(record.entertainmentBoost != null ? [`entertainmentBoost: ${record.entertainmentBoost}`] : []),
    ...(record.groupId ? [`groupId: ${record.groupId}`] : []),
    ...(record.guardianRoleId ? [`guardianRoleId: ${record.guardianRoleId}`] : []),
    ...(record.guardianRoleName ? [`guardianRoleName: ${record.guardianRoleName}`] : []),
    ...(record.latestPeerText ? [`latestPeerText: ${record.latestPeerText}`] : []),
    `model: ${record.model}`,
    `temperature: ${record.temperature}`,
    `durationMs: ${record.durationMs}`,
    "",
    "--- SYSTEM ---",
    record.input.system,
    "",
    "--- USER ---",
    record.input.user,
    "",
  ];
  if (record.error) {
    lines.push("--- ERROR ---", record.error, "");
  } else if (record.output) {
    lines.push("--- AI RAW ---", record.output.raw, "", "--- AI PARSED ---", JSON.stringify(record.output.parsed, null, 2));
    if (record.output.line) {
      lines.push("", "--- GUARDIAN LINE ---", record.output.line);
    }
    if (record.output.suggestions?.length) {
      lines.push("", "--- SUGGESTIONS ---", ...record.output.suggestions.map((s, i) => `${i + 1}. ${s}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function writeAiReplyTrace(record: AiReplyTraceRecord): void {
  if (!AI_REPLY_TRACE_ENABLED) return;
  try {
    const jsonlPath = traceFilePath(record.kind);
    fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
    fs.appendFileSync(jsonlPath, `${JSON.stringify(record)}\n`, "utf-8");

    const readablePath = traceReadablePath(record.kind, record.id);
    fs.mkdirSync(path.dirname(readablePath), { recursive: true });
    fs.writeFileSync(readablePath, formatReadableTrace(record), "utf-8");
  } catch (e) {
    console.error("[ai_reply_trace] 写入失败:", e);
  }
}

export function newAiReplyTraceId(): string {
  return randomUUID();
}
