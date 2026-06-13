import { getJson, postJson, deleteJson } from "./api";
import { getAuthToken } from "./storage";
import type { FriendRequestItem } from "../types/friendRequest";

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

export async function getFriendRequestPendingCountApi(token?: string): Promise<number> {
  const data = await getJson<{ count: number }>("/api/friend-requests/pending-count", token ?? authT());
  return Number(data.count ?? 0);
}

export async function listFriendRequestsApi(
  box: "inbox" | "outbox",
  token?: string,
): Promise<{ items: FriendRequestItem[]; pendingCount: number }> {
  return getJson<{ items: FriendRequestItem[]; pendingCount: number }>(
    `/api/friend-requests?box=${encodeURIComponent(box)}`,
    token ?? authT(),
  );
}

export async function createFriendRequestApi(
  phone: string,
  message: string | undefined,
  token?: string,
): Promise<{ request: FriendRequestItem }> {
  const body: { phone: string; message?: string } = { phone };
  if (message !== undefined && message.trim() !== "") body.message = message.trim();
  return postJson<{ request: FriendRequestItem }>("/api/friend-requests", body, token ?? authT());
}

export async function acceptFriendRequestApi(
  requestId: number,
  relationType: import("../constants/relationTypes").RelationType,
  token?: string,
): Promise<{ request: FriendRequestItem }> {
  return postJson<{ request: FriendRequestItem }>(
    `/api/friend-requests/${encodeURIComponent(String(requestId))}/accept`,
    { relationType },
    token ?? authT(),
  );
}

export async function rejectFriendRequestApi(requestId: number, token?: string): Promise<{ request: FriendRequestItem }> {
  return postJson<{ request: FriendRequestItem }>(
    `/api/friend-requests/${encodeURIComponent(String(requestId))}/reject`,
    {},
    token ?? authT(),
  );
}

export async function cancelFriendRequestApi(requestId: number, token?: string): Promise<{ ok: true }> {
  return deleteJson<{ ok: true }>(`/api/friend-requests/${encodeURIComponent(String(requestId))}`, token ?? authT());
}
