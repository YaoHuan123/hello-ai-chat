/** 联系人与对方之间的社交关系（单向：我对 TA 的关系） */

export const RELATION_TYPES = [
  "lover",
  "ambiguous",
  "parent",
  "child",
  "sibling",
  "best_friend",
  "friend",
  "classmate",
  "colleague",
  "superior",
  "client",
  "acquaintance",
  "other",
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export const RELATION_LABELS: Record<RelationType, string> = {
  lover: "恋人",
  ambiguous: "暧昧中",
  parent: "父母",
  child: "子女",
  sibling: "兄弟",
  best_friend: "闺蜜",
  friend: "普通朋友",
  classmate: "同学",
  colleague: "同事",
  superior: "上级",
  client: "客户",
  acquaintance: "初识",
  other: "其它",
};

export function isValidRelationType(v: string): v is RelationType {
  return (RELATION_TYPES as readonly string[]).includes(v);
}

export function relationLabel(type: RelationType | null | undefined): string | null {
  if (!type) return null;
  return RELATION_LABELS[type] ?? null;
}

/** 关系 → 素颜场景分类，用于推荐默认素颜 */
export const RELATION_MOL_CATEGORY: Partial<Record<RelationType, string>> = {
  lover: "亲密关系",
  ambiguous: "亲密关系",
  parent: "家庭亲友",
  child: "家庭亲友",
  sibling: "家庭亲友",
  best_friend: "朋友社交",
  friend: "朋友社交",
  classmate: "朋友社交",
  colleague: "职场沟通",
  superior: "职场沟通",
  client: "职场沟通",
  acquaintance: "陌生人破冰",
};
