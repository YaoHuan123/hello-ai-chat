/**
 * Mol 世界：一级按场景、二级按任务；辅助为语气/关系/能力。
 * 与产品方案一致，供商城 UI 与 mock 数据共用。
 */

export const PRIMARY_SCENES = [
  "全部",
  "职场沟通",
  "朋友社交",
  "亲密关系",
  "家庭亲友",
  "陌生人破冰",
  "单向智能体",
  "内容表达",
] as const;
export type PrimaryScene = (typeof PRIMARY_SCENES)[number];

export const TASK_PURPOSES = [
  "破冰",
  "延续聊天",
  "婉拒",
  "邀约",
  "推进关系",
  "安慰",
  "表达感谢",
  "催进度",
  "谈合作",
  "维护边界",
] as const;

export const POPULAR_TASK_SHORTCUTS: { label: string; taskTag: string }[] = [
  { label: "婉拒", taskTag: "婉拒" },
  { label: "推进关系", taskTag: "推进关系" },
  { label: "谈合作", taskTag: "谈合作" },
  { label: "职场邀约", taskTag: "邀约" },
  { label: "破冰", taskTag: "破冰" },
];

export const SEARCH_SUGGESTION_CHIPS: string[] = [
  "职场邀约",
  "委婉拒绝",
  "朋友破冰",
  "合作沟通",
  "催进度",
  "客户",
  "领导",
];
