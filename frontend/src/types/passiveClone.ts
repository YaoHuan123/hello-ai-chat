/** 朋友圈「我的动态」条目：自由文本或问答收录 */
export type PassiveCloneItemKind = "qa" | "free";

export type PassiveCloneItem = {
  id: string;
  type: PassiveCloneItemKind;
  title: string;
  body: string;
  ts: number;
  /** 来自热门/专属话题收录时的问题 id */
  sourceTopicId?: string;
};

export type PassiveTopic = {
  id: string;
  question: string;
  hint?: string;
  sourcePlatform?: "weibo" | "zhihu" | "douyin";
  sourceTitle?: string;
};
