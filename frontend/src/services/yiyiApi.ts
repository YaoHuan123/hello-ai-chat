import type {
  YiyiBridgeMessage,
  YiyiChatMessage,
  YiyiPermissions,
  YiyiProfile,
  YiyiTrashItem,
} from "../types/yiyi";
import { getJson, postJson, putJson } from "./api";
import { getAuthToken } from "./storage";

export type YiyiUserState = {
  trash: YiyiTrashItem[];
  permissions: YiyiPermissions;
  profile: YiyiProfile;
  ownerChat: YiyiChatMessage[];
};

function token() {
  return getAuthToken().trim();
}

export async function fetchYiyiStateApi(): Promise<YiyiUserState> {
  return getJson<YiyiUserState>("/api/yiyi/state", token());
}

export async function updateYiyiTrashApi(items: YiyiTrashItem[]): Promise<YiyiTrashItem[]> {
  const data = await putJson<{ trash: YiyiTrashItem[] }>("/api/yiyi/trash", { items }, token());
  return data.trash;
}

export async function updateYiyiPermissionsApi(patch: Partial<YiyiPermissions>): Promise<YiyiPermissions> {
  const data = await putJson<{ permissions: YiyiPermissions }>("/api/yiyi/permissions", patch, token());
  return data.permissions;
}

export async function sendYiyiChatApi(text: string): Promise<{
  state: YiyiUserState;
  newMessages: YiyiChatMessage[];
}> {
  return postJson("/api/yiyi/chat", { text }, token());
}

export async function refreshYiyiTopicsApi(): Promise<{
  topics: string[];
  yiyiMessage: YiyiChatMessage;
  state: YiyiUserState;
}> {
  return postJson("/api/yiyi/chat/topics", {}, token());
}

export async function pickYiyiTopicApi(
  topic: string,
  sourceMessageId?: string,
): Promise<{ yiyiMessage: YiyiChatMessage; state: YiyiUserState }> {
  return postJson("/api/yiyi/chat/pick-topic", { topic, sourceMessageId }, token());
}

export async function fetchYiyiBridgesApi(): Promise<YiyiBridgeMessage[]> {
  const data = await getJson<{ bridges: YiyiBridgeMessage[] }>("/api/yiyi/bridges", token());
  return data.bridges;
}

export async function runYiyiMatchApi(): Promise<YiyiBridgeMessage> {
  const data = await postJson<{ bridge: YiyiBridgeMessage }>("/api/yiyi/match", {}, token());
  return data.bridge;
}
