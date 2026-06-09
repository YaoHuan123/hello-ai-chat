import type { ChatLocalMessage } from "../types/chat";

function chatLogKey(peerUserId: string): string {
  const id = peerUserId.trim() || "unknown";
  return `aichat.chat.normal.${id}`;
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

export function getNormalChatMessages(peerUserId: string): ChatLocalMessage[] {
  try {
    return parseMessages(localStorage.getItem(chatLogKey(peerUserId)));
  } catch {
    return [];
  }
}

export function setNormalChatMessages(peerUserId: string, messages: ChatLocalMessage[]): void {
  try {
    localStorage.setItem(chatLogKey(peerUserId), JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

export function appendNormalChatMessages(peerUserId: string, ...items: ChatLocalMessage[]): void {
  const prev = getNormalChatMessages(peerUserId);
  setNormalChatMessages(peerUserId, [...prev, ...items]);
}

export type RemoteChatPayload = {
  id: number;
  fromUserId: string;
  toUserId: string;
  text: string;
  ts: number;
};

/** 将 WebSocket 推送的入站消息写入本地（去重）；返回是否新写入。 */
export function ingestIncomingRemoteMessage(myUserId: string, remote: RemoteChatPayload): boolean {
  if (!myUserId || remote.toUserId !== myUserId) return false;
  const peerUserId = remote.fromUserId.trim();
  if (!peerUserId) return false;
  const localId = `srv-${remote.id}`;
  const prev = getNormalChatMessages(peerUserId);
  if (prev.some((m) => m.id === localId)) return false;
  appendNormalChatMessages(peerUserId, {
    id: localId,
    from: "other",
    text: remote.text,
    ts: remote.ts,
  });
  return true;
}

export function getNormalChatLastPreview(peerUserId: string): { text: string; ts: number; fromMe: boolean } | null {
  const list = getNormalChatMessages(peerUserId);
  const last = list[list.length - 1];
  if (!last) return null;
  const t = last.text.trim();
  const text = last.from === "me" ? (t ? `我：${t}` : "我：") : t;
  return { text: text.length > 40 ? `${text.slice(0, 38)}…` : text, ts: last.ts, fromMe: last.from === "me" };
}

export type NormalConversationPreview = {
  peerUserId: string;
  lastText: string;
  lastTs: number;
};

/** 从本地所有 normal 会话键汇总会话列表（需传入已知 peerId 列表）。 */
export function listNormalConversationPreviews(peerUserIds: string[]): NormalConversationPreview[] {
  const out: NormalConversationPreview[] = [];
  for (const peerUserId of peerUserIds) {
    const p = getNormalChatLastPreview(peerUserId);
    if (!p) continue;
    out.push({ peerUserId, lastText: p.text, lastTs: p.ts });
  }
  out.sort((a, b) => b.lastTs - a.lastTs);
  return out;
}
