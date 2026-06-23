/** 阶段 2 mock：接后端时由 `POST /suggestions?context=...` 等返回同类结构。 */

export type InferredContext = {
  /** 对当前上下文的**一句**建议接话方向（主标题，忌长说明；完整推理放服务端日志）。 */
  label: string;
  /** 该默认意向下可直接点选填入的成稿，不润色、非用户自输入 */
  defaultReplies: string[];
  /** 同一意向下，点击「加载更多」再并入列表 */
  moreReplies: string[];
};

export type MolProfile = {
  id: string;
  name: string;
  avatar: string;
  /** 可切换的接话方向；每项为一条短签 + 成稿。 */
  inferredIntents: InferredContext[];
};

export const MOL_LIST: MolProfile[] = [
  {
    id: "lianaijunshi",
    name: "恋爱军师",
    avatar: "https://ui-avatars.com/api/?name=LS&background=ec4899&color=fff&size=128&rounded=true",
    inferredIntents: [
      {
        label: "稳妥接话、留台阶",
        defaultReplies: [
          "哈哈你先忙，晚点有空再聊～",
          "收到，那咱们改天再约，你看周末方便吗？",
          "好呀，我这边也刚忙完，有空再细聊。",
        ],
        moreReplies: ["不急，你忙完回我就行。"],
      },
      {
        label: "略主动、推进关系",
        defaultReplies: [
          "那你这周末有空吗？想请你喝杯咖啡。",
          "最近发现一家不错的店，要不要一起去试试？",
          "你刚说的那部电影我也想看，要不一起？",
        ],
        moreReplies: [],
      },
    ],
  },
];

export function getMolById(id: string): MolProfile {
  return MOL_LIST.find((m) => m.id === id) ?? MOL_LIST[0]!;
}
