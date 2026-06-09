export type GuardianScene = "恋爱暧昧" | "校园师生" | "家庭亲子";

export type GuardianRole = {
  id: string;
  scene: GuardianScene;
  name: string;
  title: string;
  tagline: string;
  speechStyle: string;
  triggers: string[];
  guardActions: string[];
  forbidden: string[];
  sampleProactiveLines: string[];
  avatarColor: string;
};

export type GuardianGroupMember = {
  userId: string;
  phone: string;
};

export type GuardianGroup = {
  id: string;
  name: string | null;
  creatorUserId: string;
  protectedUserId: string;
  /** @deprecated 等同 protectedUserId */
  ownerUserId: string;
  /** @deprecated 首位受邀成员 */
  peerUserId: string;
  scene: GuardianScene;
  guardianRoleIds: string[];
  createdAt: number;
  members: GuardianGroupMember[];
};

export type GuardianGroupListItem = GuardianGroup & {
  memberCount: number;
  memberPreview: string;
  /** @deprecated 用 memberPreview */
  peerPhone: string;
  lastText: string;
  lastTs: number;
};

export type GuardianGroupMessage = {
  id: number;
  groupId: string;
  senderKind: "owner" | "peer" | "guardian";
  fromUserId: string | null;
  guardianRoleId: string | null;
  text: string;
  ts: number;
};

export type GuardianRiskLevel = "low" | "medium" | "high";

export type GuardianOwnerHint = {
  peerMessageId: number;
  level: GuardianRiskLevel;
  label: string;
  hint: string;
  ts: number;
};

export const GUARDIAN_RISK_LABEL: Record<GuardianRiskLevel, string> = {
  low: "留意",
  medium: "注意",
  high: "预警",
};

export const GUARDIAN_SCENE_HINT: Record<GuardianScene, string> = {
  恋爱暧昧: "暧昧期识套路、活跃气氛",
  校园师生: "学业压力下讲分寸、接话解围",
  家庭亲子: "家庭话题里给台阶、缓和气氛",
};
