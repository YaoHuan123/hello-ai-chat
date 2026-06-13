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

/** 关系编辑 Sheet 网格顺序（与原型一致） */
export const RELATION_PICKER_TYPES: RelationType[] = [
  "lover",
  "ambiguous",
  "parent",
  "child",
  "sibling",
  "best_friend",
  "classmate",
  "colleague",
  "superior",
  "client",
  "acquaintance",
  "other",
];

/** 接受好友请求时的快捷选项 */
export const RELATION_ACCEPT_QUICK_TYPES: RelationType[] = [
  "classmate",
  "friend",
  "colleague",
  "acquaintance",
  "client",
  "other",
];

export type RelationFilterId = "all" | "family" | "love" | "work" | "school" | "unset" | "guardian";

const FAMILY_TYPES = new Set<RelationType>(["parent", "child", "sibling"]);
const LOVE_TYPES = new Set<RelationType>(["lover", "ambiguous"]);
const WORK_TYPES = new Set<RelationType>(["colleague", "superior", "client"]);
const SCHOOL_TYPES = new Set<RelationType>(["classmate"]);

export function relationLabel(type: RelationType | null | undefined): string | null {
  if (!type) return null;
  return RELATION_LABELS[type] ?? null;
}

export function relationTagClass(type: RelationType | null | undefined): string {
  if (!type) return "rel-tag rel-tag--none";
  if (LOVE_TYPES.has(type)) return "rel-tag rel-tag--love";
  if (FAMILY_TYPES.has(type)) return "rel-tag rel-tag--family";
  if (WORK_TYPES.has(type)) return "rel-tag rel-tag--work";
  if (type === "best_friend" || type === "friend") return "rel-tag rel-tag--friend";
  if (SCHOOL_TYPES.has(type)) return "rel-tag rel-tag--school";
  return "rel-tag rel-tag--none";
}

export function relationGroupLabel(type: RelationType | null | undefined): string {
  if (!type) return "未设置关系";
  if (LOVE_TYPES.has(type)) return "恋人";
  if (FAMILY_TYPES.has(type)) return "家人";
  if (WORK_TYPES.has(type)) return "同事";
  if (SCHOOL_TYPES.has(type)) return "同学";
  if (type === "best_friend" || type === "friend") return "好友";
  return "其它";
}

const GROUP_ORDER = ["恋人", "家人", "同事", "同学", "好友", "其它", "未设置关系"];

export function groupOrderIndex(label: string): number {
  const i = GROUP_ORDER.indexOf(label);
  return i === -1 ? GROUP_ORDER.length : i;
}

export function contactMatchesFilter(
  relationType: RelationType | null | undefined,
  filter: RelationFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "guardian") return false;
  if (filter === "unset") return !relationType;
  if (!relationType) return false;
  if (filter === "family") return FAMILY_TYPES.has(relationType);
  if (filter === "love") return LOVE_TYPES.has(relationType);
  if (filter === "work") return WORK_TYPES.has(relationType);
  if (filter === "school") return SCHOOL_TYPES.has(relationType);
  return true;
}

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
