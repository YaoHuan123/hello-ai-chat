/**
 * 风格广场：场景与任务分类（与 backend MOL_PRIMARY_CATEGORIES 对齐）
 */

export const PRIMARY_SCENES = [
  "全部",
  "朋友社交",
  "亲密关系",
  "陌生人破冰",
] as const;
export type PrimaryScene = (typeof PRIMARY_SCENES)[number];

export const TASK_PURPOSES = [
  "破冰",
  "延续聊天",
  "邀约",
  "推进关系",
  "安慰",
  "表达感谢",
  "维护边界",
] as const;

export const POPULAR_TASK_SHORTCUTS: { label: string; taskTag: string }[] = [
  { label: "暧昧接话", taskTag: "延续聊天" },
  { label: "推进关系", taskTag: "推进关系" },
  { label: "约会邀约", taskTag: "邀约" },
  { label: "破冰", taskTag: "破冰" },
];

export const SEARCH_SUGGESTION_CHIPS: string[] = [
  "暧昧接话",
  "约会邀约",
  "朋友破冰",
  "推进关系",
  "安慰",
  "维护边界",
];
