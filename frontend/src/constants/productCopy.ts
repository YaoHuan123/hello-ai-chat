/** 产品级对外文案 */
export const PRODUCT = {
  name: "AIChat",
} as const;

/** 对外沟通中间人（内部路由仍为 yiyi-*） */
export const YIYI = {
  name: "YiYi",
  heroTitle: "你的中间人 YiYi",
  heroDesc: "先和你聊清楚偏好与边界，再代表你参与对外沟通。",
  trash: "网络垃圾桶",
  trashDesc: "勾选你排斥的沟通方式。YiYi 在对外交流时会主动避开这些表达。",
  messages: "YiYi 的消息",
  messagesTabDesc: "查看 YiYi 之间的沟通结果",
  messagesDesc: "展示双方 YiYi 的沟通结果摘要。",
  profileEntry: "YiYi",
  profile: "我的画像",
  profileHero: "YiYi 对你的理解",
  settings: "权限与可见范围",
  settingsIntro: "以下设置作用于你的 YiYi 与对方的 YiYi 沟通阶段，可随时修改。",
  chatBanner: "YiYi 是你的中间人。多聊几句，我会更了解如何代表你。",
  chatPlaceholder: "回答 YiYi 的问题，或直接说说你的想法。",
  activeToggle: "YiYi 对外活跃",
  activeToggleDesc: "关闭后 YiYi 暂停与其他 YiYi 建立新沟通，已有会话不受影响。",
  emptyProfile: "暂未形成画像，多和 YiYi 聊聊",
  emptyMessages: "暂无 YiYi 沟通记录。",
  bridgeTitle: (peer: string) => `你的 YiYi ↔ ${peer}`,
  continueChat: "继续和 YiYi 聊",
} as const;

/** 群聊 AI 搭子（内部路由仍为 guardian-*） */
export const GUARDIAN = {
  name: "搭子",
  hall: "搭子大厅",
  hallKicker: "群聊搭子",
  hallTitle: "挑几位，进群帮你盯场面",
  hallSub: "每人性格与立场不同：有的中立疏导，有的协调事务，有的会按人设护场",
  groupPrefix: "搭子群",
  roleTag: "搭子",
  typing: "正在输入",
  createSelect: "选择搭子",
  createEmpty: "暂无搭子角色",
  notFound: "未找到该角色。",
  featureLead: "选择群聊主要用途，便于推荐搭子。可不选，直接继续。",
  sectionHint: "群聊场景角色",
} as const;
