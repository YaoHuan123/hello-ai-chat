/** 辅助聊天 MOL：单条数据（对话样例或约束） */
export type AssistMolDataKind = "dialogue" | "rule";

export type AssistMolDataItem = {
  id: string;
  type: AssistMolDataKind;
  title: string;
  body: string;
  ts: number;
};
