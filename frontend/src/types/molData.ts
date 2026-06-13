/** 我的素颜：单条约束数据 */
export type AssistMolDataKind = "rule";

export type AssistMolDataItem = {
  id: string;
  type: AssistMolDataKind;
  title: string;
  body: string;
  ts: number;
};
