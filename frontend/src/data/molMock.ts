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
    id: "pro",
    name: "职场沟通专家",
    avatar: "https://ui-avatars.com/api/?name=Pro&background=007aff&color=fff&size=128&rounded=true",
    inferredIntents: [
      {
        label: "先说明不便、再改期",
        defaultReplies: [
          "这周二下午我这边确实排满了，要不等我周三上午给你回个 15 分钟，先对齐下范围？",
          "现在手头有个上线窗口在赶，我周四下午再细聊，方便先发一版需求要点我扫一眼吗？",
          "抱歉，下午已有会议，我们约明天上午9点，线上方便吗？",
          "急的话我这边可以先约 15 分钟语音，只同步核心信息，细节邮件补。",
        ],
        moreReplies: [
          "我刚看了日程，14:00–16:00 有窗口，你更方便哪个整点？",
          "如果项目紧急，要不要先拉个小群，把干系人拉齐再定时间？",
        ],
      },
      {
        label: "直球约时间、要对齐点",
        defaultReplies: [
          "我这边 15:00 或 16:00 有档，你哪个方便？我提前看眼背景材料。",
          "咱们先 20 分钟语音把目标对齐，细节我会后给你一页纪要，可以吗？",
        ],
        moreReplies: ["要我把可约时段和会议链接一并发你吗？"],
      },
      {
        label: "要材料、再回复是否参与",
        defaultReplies: [
          "能先发一版 1 页项目摘要吗？我看完今天下班前给明确答复。",
          "背景材料收到后，我明早 10 点前给能否参与的结论，这样行吗？",
        ],
        moreReplies: [],
      },
    ],
  },
  {
    id: "social",
    name: "高情商社交达人",
    avatar: "https://ui-avatars.com/api/?name=So&background=ff9500&color=fff&size=128&rounded=true",
    inferredIntents: [
      {
        label: "先接情绪、再对时间",
        defaultReplies: [
          "理解你着急的心情～我这边也刚看了下日程，下午3点能腾出一小段，咱们先聊聊？",
          "项目我记挂着呢，下午我抽点空咱们把节奏捋一捋，不耽误你进度。",
          "实在不好意思呀，下午有个临时会，明天上午我主动找你，你看可以不？",
        ],
        moreReplies: ["要不明晚散步时顺便聊 10 分钟，轻松点，你看呢～"],
      },
      {
        label: "轻婉拒、留余地",
        defaultReplies: [
          "这阵子节奏有点满，我尽量挤；若今天对不上，我明早第一时间碰你。",
          "我记在心上了，今天能碰就碰，不能的话咱们语音补一句也行～",
        ],
        moreReplies: [],
      },
    ],
  },
  {
    id: "warm",
    name: "暖心亲友互动",
    avatar: "https://ui-avatars.com/api/?name=Warm&background=34c759&color=fff&size=128&rounded=true",
    inferredIntents: [
      {
        label: "让 Ta 知道你有数",
        defaultReplies: [
          "项目的事我记着呢，下午3点我这边有空，咱不着急，慢慢说～",
          "先别急，我看下时间，肯定不让你这事耽误。",
          "下午我有点事在跑，要不明晚边吃饭边聊，顺便换换脑子？",
        ],
        moreReplies: ["2 点之后我基本都在，你哪会儿顺口哪会儿喊我。"],
      },
      {
        label: "关心一句、再约",
        defaultReplies: [
          "最近是不是挺累的？时间咱们慢慢约，不催你。",
          "你先把眼前的事收一收，我晚上给你打个电话～",
        ],
        moreReplies: [],
      },
    ],
  },
];

export function getMolById(id: string): MolProfile {
  return MOL_LIST.find((m) => m.id === id) ?? MOL_LIST[0];
}
