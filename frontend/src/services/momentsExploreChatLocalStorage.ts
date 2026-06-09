import type { ChatLocalMessage } from "../types/chat";
import { isMeaningfulExploreReply, type MomentsExploreRecord } from "../types/momentsExplore";

function chatLogKey(peerUserId: string): string {
  const id = peerUserId.trim() || "unknown";
  return `aichat.moments.explore.${id}`;
}

function parseMessages(raw: string | null): ChatLocalMessage[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is ChatLocalMessage =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as ChatLocalMessage).id === "string" &&
        ((x as ChatLocalMessage).from === "me" || (x as ChatLocalMessage).from === "other") &&
        typeof (x as ChatLocalMessage).text === "string" &&
        typeof (x as ChatLocalMessage).ts === "number",
    );
  } catch {
    return [];
  }
}

export function getMomentsExploreMessages(peerUserId: string): ChatLocalMessage[] {
  try {
    return parseMessages(localStorage.getItem(chatLogKey(peerUserId)));
  } catch {
    return [];
  }
}

export function setMomentsExploreMessages(peerUserId: string, messages: ChatLocalMessage[]): void {
  try {
    localStorage.setItem(chatLogKey(peerUserId), JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

export function appendMomentsExploreMessages(peerUserId: string, ...items: ChatLocalMessage[]): void {
  const prev = getMomentsExploreMessages(peerUserId);
  setMomentsExploreMessages(peerUserId, [...prev, ...items]);
}

export function getMomentsExploreLastPreview(peerUserId: string): string {
  const list = getMomentsExploreMessages(peerUserId);
  const last = list[list.length - 1];
  if (!last) return "";
  const t = last.text.trim();
  if (last.from === "me") return t ? `我：${t}` : "我：";
  return t;
}

function extractExploreRecords(peerUserId: string): MomentsExploreRecord[] {
  const messages = getMomentsExploreMessages(peerUserId);
  const records: MomentsExploreRecord[] = [];
  for (let i = 0; i < messages.length; i++) {
    const mine = messages[i];
    if (mine.from !== "me") continue;
    const question = mine.text.trim();
    if (!question) continue;
    const clone = messages[i + 1];
    if (!clone || clone.from !== "other") continue;
    const reply = clone.text.trim();
    if (!isMeaningfulExploreReply(reply)) continue;
    records.push({
      id: `mer-${mine.id}-${clone.id}`,
      peerUserId,
      question,
      reply,
      ts: clone.ts,
    });
  }
  return records;
}

/** 从本地探索对话汇总有效探索记录，按时间倒序 */
export function listMomentsExploreRecords(peerUserIds: string[]): MomentsExploreRecord[] {
  const seen = new Set<string>();
  const all: MomentsExploreRecord[] = [];
  for (const peerUserId of peerUserIds) {
    for (const r of extractExploreRecords(peerUserId)) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      all.push(r);
    }
  }
  all.sort((a, b) => b.ts - a.ts);
  return all;
}
