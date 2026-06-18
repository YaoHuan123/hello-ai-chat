import type {
  YiyiBridgeMessage,
  YiyiChatMessage,
  YiyiPermissions,
  YiyiProfile,
  YiyiTrashItem,
} from "../types/yiyi";
import {
  fetchYiyiBridgesApi,
  fetchYiyiStateApi,
  pickYiyiTopicApi,
  refreshYiyiTopicsApi,
  runYiyiMatchApi,
  sendYiyiChatApi,
  updateYiyiPermissionsApi,
  updateYiyiTrashApi,
  type YiyiUserState,
} from "./yiyiApi";
import { isApiMock } from "./mock";
import * as local from "./yiyiLocalStorage";

export type { YiyiUserState };

export async function loadYiyiState(): Promise<YiyiUserState> {
  if (isApiMock()) {
    local.ensureYiyiInitialized();
    return {
      trash: local.getTrashItems(),
      permissions: local.getPermissions(),
      profile: local.getProfile(),
      ownerChat: local.getChatMessages(),
    };
  }
  return fetchYiyiStateApi();
}

export async function saveYiyiTrash(items: YiyiTrashItem[]): Promise<YiyiTrashItem[]> {
  if (isApiMock()) {
    local.setTrashItems(items);
    return items;
  }
  return updateYiyiTrashApi(items);
}

export async function saveYiyiPermissions(patch: Partial<YiyiPermissions>): Promise<YiyiPermissions> {
  if (isApiMock()) {
    local.setPermissions(patch);
    return local.getPermissions();
  }
  return updateYiyiPermissionsApi(patch);
}

export async function sendYiyiChat(text: string): Promise<{
  state: YiyiUserState;
  newMessages: YiyiChatMessage[];
}> {
  if (isApiMock()) {
    const newMessages = local.sendUserToYiyi(text);
    return {
      state: {
        trash: local.getTrashItems(),
        permissions: local.getPermissions(),
        profile: local.getProfile(),
        ownerChat: local.getChatMessages(),
      },
      newMessages,
    };
  }
  return sendYiyiChatApi(text);
}

export async function refreshYiyiTopics(): Promise<{
  topics: string[];
  yiyiMessage: YiyiChatMessage;
  state: YiyiUserState;
}> {
  if (isApiMock()) {
    const yiyiMessage = local.sendTopicRefreshToChat();
    return {
      topics: yiyiMessage.topics ?? [],
      yiyiMessage,
      state: {
        trash: local.getTrashItems(),
        permissions: local.getPermissions(),
        profile: local.getProfile(),
        ownerChat: local.getChatMessages(),
      },
    };
  }
  return refreshYiyiTopicsApi();
}

export async function pickYiyiTopic(
  topic: string,
  sourceMessageId?: string,
): Promise<{ yiyiMessage: YiyiChatMessage; state: YiyiUserState }> {
  if (isApiMock()) {
    const yiyiMessage = local.pickTopicFromChip(topic, sourceMessageId);
    return {
      yiyiMessage,
      state: {
        trash: local.getTrashItems(),
        permissions: local.getPermissions(),
        profile: local.getProfile(),
        ownerChat: local.getChatMessages(),
      },
    };
  }
  return pickYiyiTopicApi(topic, sourceMessageId);
}

export async function loadYiyiBridges(): Promise<YiyiBridgeMessage[]> {
  if (isApiMock()) return local.getBridgeMessages();
  return fetchYiyiBridgesApi();
}

export async function runYiyiMatch(): Promise<YiyiBridgeMessage> {
  if (isApiMock()) throw new Error("匹配需连接后端");
  return runYiyiMatchApi();
}

export function getLastChatPreviewFromState(chat: YiyiChatMessage[]): string {
  for (let i = chat.length - 1; i >= 0; i -= 1) {
    if (chat[i].from === "yiyi") return chat[i].text;
  }
  return "和 YiYi 聊聊偏好与边界";
}

export function permissionsSummaryFrom(perms: YiyiPermissions): string {
  const parts = [
    perms.allowViewProcess ? "沟通过程可见" : "沟通过程不可见",
    perms.allowAddFriend ? "允许加好友" : "不允许加好友",
  ];
  return parts.join(" · ");
}

export function profileSummaryFrom(profile: YiyiProfile): string {
  const parts: string[] = [];
  if (profile.socialDirection !== "待了解") parts.push(profile.socialDirection);
  if (profile.personality !== "待了解") parts.push(profile.personality);
  const tagCount = profile.tags.social.length + profile.tags.personality.length + profile.tags.other.length;
  if (tagCount > 0) parts.push(`${tagCount} 个标签`);
  if (parts.length === 0) return "暂未形成画像，多和 YiYi 聊聊";
  return parts.slice(0, 3).join(" · ");
}

const PROFILE_EMPTY = "待了解";

function isProfileDimFilled(value: string, tags: string[]): boolean {
  return value !== PROFILE_EMPTY || tags.length > 0;
}

export function profileDimStatus(value: string, tags: string[]): { text: string; filled: boolean } {
  if (!isProfileDimFilled(value, tags)) {
    return { text: "暂无", filled: false };
  }
  if (value !== PROFILE_EMPTY) {
    return { text: value, filled: true };
  }
  return { text: tags.slice(0, 2).join("、"), filled: true };
}

export function profileCompletenessFrom(profile: YiyiProfile): number {
  let filled = 0;
  if (isProfileDimFilled(profile.socialDirection, profile.tags.social)) filled += 1;
  if (isProfileDimFilled(profile.personality, profile.tags.personality)) filled += 1;
  if (isProfileDimFilled(profile.other, profile.tags.other)) filled += 1;
  return Math.round((filled / 3) * 100);
}
