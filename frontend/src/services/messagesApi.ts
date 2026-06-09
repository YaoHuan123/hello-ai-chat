import { getJson, postJson } from "./api";
import { getAuthToken } from "./storage";
import type { ConversationItem, RemoteMessage } from "../types/messages";

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

export async function listConversationsApi(token?: string): Promise<{ items: ConversationItem[] }> {
  return getJson<{ items: ConversationItem[] }>("/api/messages/conversations", token ?? authT());
}

export async function listMessagesWithPeerApi(
  peerUserId: string,
  opts?: { beforeId?: number; limit?: number },
  token?: string,
): Promise<{ items: RemoteMessage[] }> {
  const q = new URLSearchParams();
  q.set("peerUserId", peerUserId);
  if (opts?.beforeId !== undefined) q.set("beforeId", String(opts.beforeId));
  if (opts?.limit !== undefined) q.set("limit", String(opts.limit));
  return getJson<{ items: RemoteMessage[] }>(`/api/messages?${q.toString()}`, token ?? authT());
}

export async function sendMessageApi(
  toUserId: string,
  text: string,
  token?: string,
): Promise<{ message: RemoteMessage }> {
  return postJson<{ message: RemoteMessage }>(
    "/api/messages",
    { toUserId, text },
    token ?? authT(),
  );
}
