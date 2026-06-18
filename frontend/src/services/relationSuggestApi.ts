import { postJson } from "./api";
import { getAuthToken } from "./storage";
import type { RelationType } from "../constants/relationTypes";
import type { MolSuggestLastMessage } from "./molSuggestApi";

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

export async function suggestRepliesByRelationApi(
  peerUserId: string,
  lastMessages: MolSuggestLastMessage[],
  userDraft?: string,
  token?: string,
): Promise<{ suggestions: string[]; relationType: RelationType }> {
  return postJson<{ suggestions: string[]; relationType: RelationType }>(
    "/api/relation/suggest",
    {
      peerUserId,
      lastMessages,
      ...(userDraft?.trim() ? { userDraft: userDraft.trim() } : {}),
    },
    token ?? authT(),
  );
}
