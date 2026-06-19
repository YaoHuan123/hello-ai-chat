import type { GuardianGroupMessage } from "../types/guardian";

function logKey(groupId: string): string {
  return `aichat.guardian.group.${groupId.trim() || "unknown"}`;
}

function parseMessages(raw: string | null): GuardianGroupMessage[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is GuardianGroupMessage =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as GuardianGroupMessage).groupId === "string" &&
        ((x as GuardianGroupMessage).senderKind === "owner" ||
          (x as GuardianGroupMessage).senderKind === "peer" ||
          (x as GuardianGroupMessage).senderKind === "guardian") &&
        typeof (x as GuardianGroupMessage).text === "string" &&
        typeof (x as GuardianGroupMessage).ts === "number",
    );
  } catch {
    return [];
  }
}

export function getGuardianGroupMessages(groupId: string): GuardianGroupMessage[] {
  try {
    return parseMessages(localStorage.getItem(logKey(groupId)));
  } catch {
    return [];
  }
}

export function setGuardianGroupMessages(groupId: string, messages: GuardianGroupMessage[]): void {
  try {
    localStorage.setItem(logKey(groupId), JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

export function appendGuardianGroupMessages(groupId: string, ...items: GuardianGroupMessage[]): void {
  const prev = getGuardianGroupMessages(groupId);
  setGuardianGroupMessages(groupId, [...prev, ...items]);
}

function isGuardianGroupMessage(value: unknown): value is GuardianGroupMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as GuardianGroupMessage;
  return (
    typeof m.id === "number" &&
    (m.senderKind === "owner" || m.senderKind === "peer" || m.senderKind === "guardian") &&
    typeof m.text === "string" &&
    typeof m.ts === "number"
  );
}

/** 将 WebSocket 推送的群消息写入本地（去重）；返回是否新写入。 */
export function ingestIncomingGuardianGroupMessage(payload: {
  groupId: string;
  message: unknown;
}): boolean {
  const groupId = payload.groupId.trim();
  if (!groupId || !isGuardianGroupMessage(payload.message)) return false;
  const message = payload.message;
  const prev = getGuardianGroupMessages(groupId);
  if (prev.some((x) => x.id === message.id)) return false;
  appendGuardianGroupMessages(groupId, {
    ...message,
    groupId,
    fromUserId: message.fromUserId ?? null,
    guardianRoleId: message.guardianRoleId ?? null,
  });
  return true;
}

function formatGuardianPreviewLine(last: GuardianGroupMessage): string {
  const prefix = last.senderKind === "guardian" ? "搭子：" : last.senderKind === "owner" ? "我：" : "";
  const t = last.text.trim();
  const line = `${prefix}${t}`;
  return line.length > 36 ? `${line.slice(0, 34)}…` : line;
}

export function getGuardianGroupLastPreview(groupId: string): string {
  const list = getGuardianGroupMessages(groupId);
  const last = list[list.length - 1];
  if (!last) return "";
  return formatGuardianPreviewLine(last);
}

export function getGuardianGroupLastPreviewInfo(groupId: string): { text: string; ts: number } | null {
  const list = getGuardianGroupMessages(groupId);
  const last = list[list.length - 1];
  if (!last) return null;
  return { text: formatGuardianPreviewLine(last), ts: last.ts };
}
