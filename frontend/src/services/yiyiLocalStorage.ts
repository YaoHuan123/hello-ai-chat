import { YIYI } from "../constants/productCopy";
import type {
  YiyiBridgeMessage,
  YiyiChatMessage,
  YiyiPermissions,
  YiyiProfile,
  YiyiTrashItem,
} from "../types/yiyi";

const KEY_TRASH = "aichat.yiyi.trash";
const KEY_CHAT = "aichat.yiyi.chat";
const KEY_PROFILE = "aichat.yiyi.profile";
const KEY_PERMISSIONS = "aichat.yiyi.permissions";
const KEY_BRIDGE = "aichat.yiyi.bridge";
const KEY_TOPICS = "aichat.yiyi.topics";
const KEY_INIT = "aichat.yiyi.initialized";

const DEFAULT_TRASH: YiyiTrashItem[] = [
  { id: "porn", label: "色情", hint: "含露骨暗示、索要私密内容", enabled: true, isCustom: false },
  { id: "harass", label: "骚扰", hint: "反复纠缠、不受欢迎的私信", enabled: true, isCustom: false },
  { id: "boundary", label: "没有边界", hint: "过度打探隐私、强行越界", enabled: true, isCustom: false },
  { id: "rude", label: "没有礼貌", hint: "辱骂、歧视、阴阳怪气", enabled: true, isCustom: false },
  { id: "spam", label: "推销与广告", hint: "硬广、引流、理财课程", enabled: false, isCustom: false },
  { id: "manipulate", label: "情感操控", hint: "PUA 话术、 guilt tripping", enabled: false, isCustom: false },
];

const TOPIC_POOL = [
  "最近在忙什么？",
  "你平时自习更偏早起还是夜猫子？",
  "你更喜欢独处，还是偶尔有人聊聊？",
  "你对线下见面是什么态度？",
  "周末一般喜欢做什么？",
  "你更习惯慢慢熟悉，还是直接一点？",
  "最近常听什么类型的音乐？",
  "有哪些沟通方式是你特别不能接受的？",
  "线上聊天和见面，你更自在的是哪种？",
];

const DEFAULT_PROFILE: YiyiProfile = {
  socialDirection: "待了解",
  personality: "待了解",
  other: "待了解",
  tags: { social: [], personality: [], other: [] },
};

const DEFAULT_PERMISSIONS: YiyiPermissions = {
  allowAddFriend: true,
  yiyiActive: true,
};

const SEED_BRIDGE: YiyiBridgeMessage[] = [
  {
    id: "bridge-1",
    peerLabel: "小林的 YiYi",
    peerAccent: "#fb7185",
    status: "effective",
    preview: "都喜欢慢热了解，周末偏好 city walk；聊天节奏合拍，未触发黑名单规则。",
    tags: ["慢热", "同城", "同频"],
    ts: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "bridge-2",
    peerLabel: "阿哲的 YiYi",
    peerAccent: "#10b981",
    status: "effective",
    preview: "都喜欢独立音乐与散步，聊天节奏偏慢热。对方未越界，双方愿意继续了解。",
    tags: ["同频", "慢热"],
    ts: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: "bridge-3",
    peerLabel: "匿名 YiYi",
    peerAccent: "#9ca3af",
    status: "blocked",
    preview: `触发「没有边界」规则，${YIYI.name}已终止对话，未向对方透露你的信息。`,
    tags: [],
    ts: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function shuffleTopics(count: number, exclude: string[] = []): string[] {
  const pool = TOPIC_POOL.filter((t) => !exclude.includes(t));
  const src = pool.length >= count ? pool : TOPIC_POOL;
  const copy = [...src];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function ensureYiyiInitialized(): void {
  if (localStorage.getItem(KEY_INIT) === "1") return;
  writeJson(KEY_TRASH, DEFAULT_TRASH);
  writeJson(KEY_PROFILE, DEFAULT_PROFILE);
  writeJson(KEY_PERMISSIONS, DEFAULT_PERMISSIONS);
  writeJson(KEY_BRIDGE, SEED_BRIDGE);
  writeJson(KEY_TOPICS, shuffleTopics(4));
  const welcome: YiyiChatMessage[] = [
    {
      id: nextId("yiyi"),
      from: "yiyi",
      text: `你好，我是${YIYI.name}。我会先了解你的想法和边界，再代表你参与对外沟通。`,
      ts: Date.now() - 60_000,
    },
    {
      id: nextId("yiyi"),
      from: "yiyi",
      text: "可以先从下面选一个话题，也可以用自己的话说。",
      ts: Date.now() - 30_000,
      topics: shuffleTopics(4),
    },
  ];
  writeJson(KEY_CHAT, welcome);
  localStorage.setItem(KEY_INIT, "1");
}

export function getTrashItems(): YiyiTrashItem[] {
  ensureYiyiInitialized();
  return readJson<YiyiTrashItem[]>(KEY_TRASH, DEFAULT_TRASH);
}

export function setTrashItems(items: YiyiTrashItem[]): void {
  writeJson(KEY_TRASH, items);
}

export function toggleTrashItem(id: string, enabled: boolean): void {
  setTrashItems(getTrashItems().map((x) => (x.id === id ? { ...x, enabled } : x)));
}

export function addCustomTrashItem(label: string): void {
  const trimmed = label.trim();
  if (!trimmed) return;
  const items = getTrashItems();
  if (items.some((x) => x.label === trimmed)) return;
  if (items.filter((x) => x.isCustom).length >= 20) return;
  setTrashItems([...items, { id: nextId("trash"), label: trimmed, enabled: true, isCustom: true }]);
}

export function countEnabledTrash(): number {
  return getTrashItems().filter((x) => x.enabled).length;
}

export function getChatMessages(): YiyiChatMessage[] {
  ensureYiyiInitialized();
  return readJson<YiyiChatMessage[]>(KEY_CHAT, []);
}

export function appendChatMessages(...msgs: YiyiChatMessage[]): void {
  writeJson(KEY_CHAT, [...getChatMessages(), ...msgs]);
}

export function getLastChatPreview(): string {
  const msgs = getChatMessages();
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    if (msgs[i].from === "yiyi") return msgs[i].text;
  }
  return `和${YIYI.name}聊聊偏好与边界`;
}

export function getCurrentTopics(): string[] {
  ensureYiyiInitialized();
  const stored = readJson<string[]>(KEY_TOPICS, []);
  return stored.length > 0 ? stored : shuffleTopics(4);
}

export function refreshTopicBatch(): string[] {
  const next = shuffleTopics(4, getCurrentTopics());
  writeJson(KEY_TOPICS, next);
  return next;
}

export function getProfile(): YiyiProfile {
  ensureYiyiInitialized();
  return readJson<YiyiProfile>(KEY_PROFILE, DEFAULT_PROFILE);
}

export function setProfile(profile: YiyiProfile): void {
  writeJson(KEY_PROFILE, profile);
}

export function getPermissions(): YiyiPermissions {
  ensureYiyiInitialized();
  return readJson<YiyiPermissions>(KEY_PERMISSIONS, DEFAULT_PERMISSIONS);
}

export function setPermissions(patch: Partial<YiyiPermissions>): void {
  setPermissionsFull({ ...getPermissions(), ...patch });
}

function setPermissionsFull(perms: YiyiPermissions): void {
  writeJson(KEY_PERMISSIONS, perms);
}

export function getBridgeMessages(): YiyiBridgeMessage[] {
  ensureYiyiInitialized();
  return readJson<YiyiBridgeMessage[]>(KEY_BRIDGE, SEED_BRIDGE).sort((a, b) => b.ts - a.ts);
}

export function countEffectiveBridge(): number {
  return getBridgeMessages().filter((x) => x.status === "effective").length;
}

function mergeTags(existing: string[], incoming: string[]): string[] {
  const out = [...existing];
  for (const t of incoming) {
    if (!out.includes(t)) out.push(t);
  }
  return out.slice(0, 8);
}

function updateProfileFromText(text: string): void {
  const profile = getProfile();
  let { socialDirection, personality, other } = profile;
  const tags = { ...profile.tags };

  if (/约会|见面|同城|线下/.test(text)) {
    socialDirection = "约会意向";
    tags.social = mergeTags(tags.social, ["约会"]);
  } else if (/男朋友|女朋友|恋爱|对象|脱单|暧昧/.test(text)) {
    socialDirection = "恋爱意向";
    tags.social = mergeTags(tags.social, ["恋爱"]);
  } else if (/感悟|同频|聊聊|扩列|独处/.test(text)) {
    socialDirection = "同频聊天";
    tags.social = mergeTags(tags.social, ["同频"]);
  } else if (/运动|city walk|散步|电影/.test(text)) {
    other = "兴趣与生活方式";
    if (/运动/.test(text)) tags.other = mergeTags(tags.other, ["运动"]);
    if (/city walk|散步/.test(text)) tags.other = mergeTags(tags.other, ["city walk"]);
    if (/电影/.test(text)) tags.other = mergeTags(tags.other, ["电影"]);
  }

  if (/i人|内向|慢热|社恐/.test(text)) {
    personality = "偏 i 人 · 慢热";
    tags.personality = mergeTags(tags.personality, ["慢热"]);
  } else if (/e人|外向|开朗/.test(text)) {
    personality = "偏 e 人 · 开朗";
    tags.personality = mergeTags(tags.personality, ["开朗"]);
  }

  if (/夜猫|熬夜|早起/.test(text)) {
    tags.personality = mergeTags(tags.personality, /夜猫|熬夜/.test(text) ? ["夜猫子"] : ["早起"]);
  }

  setProfile({ socialDirection, personality, other, tags });
}

function pickYiyiReply(userText: string, turnIndex: number): { text: string; topics?: string[] } {
  updateProfileFromText(userText);

  if (/约会|见面|同城/.test(userText)) {
    return {
      text: "收到。你更希望先线上慢慢了解，还是接受同城线下见面？",
    };
  }
  if (/男朋友|恋爱|对象|暧昧/.test(userText)) {
    return {
      text: "明白了。你更希望先线上慢慢了解，还是接受同城线下见面？",
    };
  }
  if (/夜猫|熬夜/.test(userText)) {
    return {
      text: `好的，我会记住这个节奏偏好。还有什么是你特别不能接受的沟通方式吗？可以在「${YIYI.trash}」里设置。`,
      topics: refreshTopicBatch(),
    };
  }
  if (/早起/.test(userText)) {
    return {
      text: "了解。我会记住你的作息偏好。还想补充哪类兴趣或边界吗？",
      topics: refreshTopicBatch(),
    };
  }
  if (turnIndex > 0 && turnIndex % 3 === 0) {
    return {
      text: "我在更新你的画像。你也可以换个角度聊聊，或从下面选一个问题。",
      topics: refreshTopicBatch(),
    };
  }

  const generic = [
    "好的，我记下了。你还想补充什么吗？",
    "收到。我会据此更新你的画像。",
    "明白了。继续聊几句，我就能更准确地代表你对外沟通。",
  ];
  return { text: generic[turnIndex % generic.length] };
}

export function sendUserToYiyi(text: string): YiyiChatMessage[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const history = getChatMessages();
  const userMsg: YiyiChatMessage = { id: nextId("me"), from: "me", text: trimmed, ts: Date.now() };
  const turnIndex = history.filter((m) => m.from === "me").length;
  const reply = pickYiyiReply(trimmed, turnIndex);
  const yiyiMsg: YiyiChatMessage = {
    id: nextId("yiyi"),
    from: "yiyi",
    text: reply.text,
    ts: Date.now() + 1,
    topics: reply.topics,
  };
  appendChatMessages(userMsg, yiyiMsg);
  return [userMsg, yiyiMsg];
}

export function sendTopicRefreshToChat(): YiyiChatMessage {
  const topics = refreshTopicBatch();
  const msg: YiyiChatMessage = {
    id: nextId("yiyi"),
    from: "yiyi",
    text: "换一批问题，选感兴趣的或直接输入：",
    ts: Date.now(),
    topics,
  };
  appendChatMessages(msg);
  return msg;
}

export function pickTopicFromChip(topic: string, sourceMessageId?: string): YiyiChatMessage {
  const trimmed = topic.trim();
  if (!trimmed) throw new Error("INVALID_PARAMS");

  const history = getChatMessages().map((m) =>
    sourceMessageId && m.id === sourceMessageId && m.from === "yiyi" ? { ...m, topics: undefined } : m,
  );
  const yiyiMsg: YiyiChatMessage = {
    id: nextId("yiyi"),
    from: "yiyi",
    text: trimmed,
    ts: Date.now(),
  };
  writeJson(KEY_CHAT, [...history, yiyiMsg]);
  return yiyiMsg;
}

export function permissionsSummary(): string {
  const p = getPermissions();
  const parts = [p.allowAddFriend ? "允许加好友" : "不允许加好友"];
  return parts.join(" · ");
}
