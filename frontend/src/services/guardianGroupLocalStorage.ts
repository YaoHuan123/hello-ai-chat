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

function formatGuardianPreviewLine(last: GuardianGroupMessage): string {
  const prefix = last.senderKind === "guardian" ? "AI：" : last.senderKind === "owner" ? "我：" : "";
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
