/** 阶段 2 mock：接后端时由 `POST /suggestions?context=...` 等返回同类结构。 */



export type InferredContext = {

  /**

   * 对当前上下文的**一句**建议接话方向（主标题，忌长说明；完整推理放服务端日志）。

   */

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

  /**

   * 可切换的接话方向；每项为一条短签 + 成稿。

   * 面板顶部以标签按钮展示，供用户换一套说法。

   */

  inferredIntents: InferredContext[];

};



export const MOL_LIST: MolProfile[] = [

  {

    id: "refuse",

    name: "婉拒边界",

    avatar: "https://ui-avatars.com/api/?name=Ref&background=5856d6&color=fff&size=128&rounded=true",

    inferredIntents: [

      {

        label: "礼貌说明、给替代",

        defaultReplies: [

          "这周二下午我这边确实排满了，要不周三上午给你 15 分钟，先对齐下范围？",

          "现在手头有个窗口在赶，我周四下午再细聊，方便先发一版要点我扫一眼吗？",

          "抱歉，下午已有安排，我们约明天上午，线上方便吗？",

        ],

        moreReplies: ["若紧急，我可以先约 15 分钟语音，只同步核心信息。"],

      },

      {

        label: "坚定婉拒、留余地",

        defaultReplies: [

          "这次确实插不进，我周四上午可以参与 20 分钟评审，或帮你推荐同事对接。",

          "范围超出我这边能承接的，建议先缩小一版需求，我再评估能否接。",

        ],

        moreReplies: [],

      },

    ],

  },

];



export function getMolById(id: string): MolProfile {

  return MOL_LIST.find((m) => m.id === id) ?? MOL_LIST[0]!;

}

