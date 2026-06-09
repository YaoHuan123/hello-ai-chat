import { getJson, postJson, putJson } from "./api";
import { getAuthToken } from "./storage";
import type { PassiveCloneItem } from "../types/passiveClone";

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

export type ExploreChatLine = {
  from: "explorer" | "clone";
  text: string;
  ts: number;
};

export async function syncMomentsItemsApi(items: PassiveCloneItem[]): Promise<{ items: PassiveCloneItem[] }> {
  return putJson<{ items: PassiveCloneItem[] }>("/api/moments/items", { items }, authT());
}

export async function listFriendMomentsApi(peerUserId: string): Promise<{ items: PassiveCloneItem[] }> {
  return getJson<{ items: PassiveCloneItem[] }>(
    `/api/moments/users/${encodeURIComponent(peerUserId)}/items`,
    authT(),
  );
}

export async function momentsExploreReplyApi(
  peerUserId: string,
  text: string,
  lastMessages?: ExploreChatLine[],
): Promise<{ reply: string }> {
  return postJson<{ reply: string }>(
    "/api/moments/explore/reply",
    {
      peerUserId,
      text,
      lastMessages: lastMessages?.slice(-20),
    },
    authT(),
  );
}
