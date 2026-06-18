import { postJson } from "./api";
import { getAuthToken } from "./storage";

export type MolSuggestLastMessage = { from: "me" | "peer"; text: string; ts: number };

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

export async function suggestRepliesApi(
  peerUserId: string,
  lastMessages: MolSuggestLastMessage[],
  molId?: string,
  userDraft?: string,
  token?: string,
): Promise<{ suggestions: string[]; relationType?: import("../constants/relationTypes").RelationType | null }> {
  return postJson<{ suggestions: string[]; relationType?: import("../constants/relationTypes").RelationType | null }>(
    "/api/mol/suggest",
    {
      peerUserId,
      lastMessages,
      ...(molId ? { molId } : {}),
      ...(userDraft?.trim() ? { userDraft: userDraft.trim() } : {}),
    },
    token ?? authT(),
  );
}
