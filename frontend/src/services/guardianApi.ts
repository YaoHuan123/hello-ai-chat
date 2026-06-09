import { getJson, postJson } from "./api";
import { getAuthToken } from "./storage";
import type {
  GuardianGroup,
  GuardianGroupListItem,
  GuardianGroupMessage,
  GuardianOwnerHint,
  GuardianRole,
  GuardianScene,
} from "../types/guardian";

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

export async function listGuardianRolesApi(scene?: GuardianScene): Promise<{ items: GuardianRole[] }> {
  const q = scene ? `?scene=${encodeURIComponent(scene)}` : "";
  return getJson<{ items: GuardianRole[] }>(`/api/guardian/roles${q}`, authT());
}

export async function listGuardianGroupsApi(): Promise<{ items: GuardianGroupListItem[] }> {
  return getJson<{ items: GuardianGroupListItem[] }>("/api/guardian/groups", authT());
}

export async function createGuardianGroupApi(args: {
  name?: string;
  memberUserIds: string[];
  scene: GuardianScene;
  guardianRoleIds: string[];
}): Promise<{ group: GuardianGroup }> {
  return postJson<{ group: GuardianGroup }>("/api/guardian/groups", args, authT());
}

export async function getGuardianGroupApi(groupId: string): Promise<{ group: GuardianGroup }> {
  return getJson<{ group: GuardianGroup }>(`/api/guardian/groups/${encodeURIComponent(groupId)}`, authT());
}

export async function listGuardianGroupMessagesApi(groupId: string): Promise<{ items: GuardianGroupMessage[] }> {
  return getJson<{ items: GuardianGroupMessage[] }>(
    `/api/guardian/groups/${encodeURIComponent(groupId)}/messages`,
    authT(),
  );
}

export async function listGuardianOwnerHintsApi(groupId: string): Promise<{ items: GuardianOwnerHint[] }> {
  return getJson<{ items: GuardianOwnerHint[] }>(
    `/api/guardian/groups/${encodeURIComponent(groupId)}/owner-hints`,
    authT(),
  );
}

export async function sendGuardianGroupMessageApi(
  groupId: string,
  text: string,
  lastMessages?: GuardianGroupMessage[],
): Promise<{ message: GuardianGroupMessage }> {
  return postJson<{ message: GuardianGroupMessage }>(
    `/api/guardian/groups/${encodeURIComponent(groupId)}/messages`,
    {
      text,
      lastMessages: lastMessages?.slice(-80).map((m) => ({
        id: m.id,
        senderKind: m.senderKind,
        fromUserId: m.fromUserId,
        guardianRoleId: m.guardianRoleId,
        text: m.text,
        ts: m.ts,
      })),
    },
    authT(),
  );
}
