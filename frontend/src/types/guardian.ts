export type GuardianScene =
  | "恋爱暧昧"
  | "校园师生"
  | "家庭亲子"
  | "亲子沟通"
  | "科学育儿"
  | "居家装修"
  | "大件采购"
  | "店铺经营";

export type GuardianStance = "neutral" | "facilitator" | "sided";

export const GUARDIAN_STANCE_LABEL: Record<GuardianStance, string> = {
  neutral: "中立",
  facilitator: "协调",
  sided: "有倾向",
};

export type GuardianRole = {
  id: string;
  scene: GuardianScene;
  name: string;
  title: string;
  tagline: string;
  userMessage: string;
  stance: GuardianStance;
  stanceNote: string;
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
