import { deleteJson, getJson, patchJson, postJson } from "./api";
import { SUYAN, normalizeLegacySuyanName } from "../constants/suyanCopy";
import { defaultInfoItemsForMol } from "../data/molPersonaDefaults";
import { isApiMock } from "./mock";
import { clearAssistMolItems } from "./molDataLocalStorage";
import { getAuthToken } from "./storage";

const DEFAULT_MOL_CATEGORY = "职场沟通";

export type ChatRole = "visitor" | "agent";
export type OneWayMessage = {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
};

export type FeedQuestion = {
  id: string;
  title: string;
  hint: string;
  answered: boolean;
  answer?: string;
};

export type DataBoardSnapshot = {
  totalConversations: number;
  totalFeedingItems: number;
  confidence: string;
  recentSignals: Array<{ id: string; title: string; value: string }>;
};

export type MolCatalogItem = {
  id: string;
  name: string;
  summary: string;
  price: number;
  owned: boolean;
  /** 一级场景，与 [molWorldTaxonomy] PRIMARY 除「全部」外一致 */
  primaryCategory: string;
  taskTags: string[];
  toneTags: string[];
  relationshipTags: string[];
  abilityTags: string[];
  /** 推荐位/为你推荐 */
  recommended: boolean;
  /** 热度，供排序与热门 */
  popularityScore: number;
  /** 当前用户是否为该 MOL 在 MOL 世界的上传者 */
  uploaderIsMe?: boolean;
  uploaderUserId?: string;
};

/** 在「我的 Mol」中：来自商城已应用，或用户自建。 */
export type MolCollectionSource = "store" | "created";

export type MolInMyCollection = MolCatalogItem & { source: MolCollectionSource };

/** Mol 详情中的「信息集合」单项（与参考 2-mol 详情 一致：自定义 / 商城模板、模板可软删恢复） */
export type MolInfoItem = {
  id: string;
  source: "custom" | "store";
  title: string;
  body: string;
  /** 仅 source=store 时：软删除后灰色展示，可点恢复 */
  softRemoved?: boolean;
};


export type UpdateMyMolInput = {
  name?: string;
  summary?: string;
  primaryCategory?: string;
  infoItems?: MolInfoItem[];
};

function authT(): string {
  const t = getAuthToken().trim();
  if (!t) throw new Error("未登录");
  return t;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const nowTime = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

let oneWayMockMessages: OneWayMessage[] = [
  { id: "m1", role: "visitor", text: "你好，我想咨询一下你们的合作方式。", time: "10:12" },
  { id: "m2", role: "agent", text: "欢迎，你可以先告诉我你的目标和时间安排。", time: "10:13" },
];

let feedMockQuestions: FeedQuestion[] = [
  { id: "q1", title: "当对方催进度时，你希望智能体优先表达什么？", hint: "如先确认、再给时间点。", answered: false },
  { id: "q2", title: "对于临时邀约，默认语气是偏礼貌还是偏直接？", hint: "可写可切换的规则。", answered: false },
  { id: "q3", title: "涉及价格/预算时，哪些信息必须先确认？", hint: "如范围、周期、交付标准。", answered: true, answer: "先确认范围与交付，再给预算区间。" },
];

const dataBoardMock: DataBoardSnapshot = {
  totalConversations: 42,
  totalFeedingItems: 19,
  confidence: "中高",
  recentSignals: [
    { id: "s1", title: "偏好沟通节奏", value: "先确认需求，再给排期" },
    { id: "s2", title: "拒绝策略", value: "保持礼貌，给出替代时间" },
    { id: "s3", title: "高频关键词", value: "范围、优先级、交付" },
  ],
};

let molCatalogMock: MolCatalogItem[] = [
  {
    id: "refuse",
    name: "婉拒边界",
    summary: "礼貌说「不」并给替代方案。",
    price: 0,
    owned: false,
    primaryCategory: "职场沟通",
    taskTags: ["婉拒", "维护边界", "催进度"],
    toneTags: ["有边界感", "专业", "温和"],
    relationshipTags: ["领导", "同事", "客户"],
    abilityTags: ["擅长拒绝", "会多步引导"],
    recommended: false,
    popularityScore: 850,
  },
  {
    id: "age18",
    name: "我在18岁",
    summary: "历经风霜，归来仍是少年：年轻、松弛，但不幼稚。",
    price: 0,
    owned: false,
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "安慰", "破冰", "表达感谢"],
    toneTags: ["活泼", "温和"],
    relationshipTags: ["朋友", "同学"],
    abilityTags: ["会接话", "擅长安慰"],
    recommended: true,
    popularityScore: 810,
  },
  {
    id: "tsundere",
    name: "傲娇柔病",
    summary: "嘴硬心软：表面冷淡、内里关心，不油腻。",
    price: 0,
    owned: false,
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "安慰", "推进关系", "表达感谢"],
    toneTags: ["嘴硬", "温和"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "会润色"],
    recommended: true,
    popularityScore: 795,
  },
  {
    id: "doubao",
    name: "豆包体",
    summary: "清楚、好读：先接住话题，再给具体说法。",
    price: 0,
    owned: false,
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "表达感谢", "谈合作", "催进度"],
    toneTags: ["清楚", "温和"],
    relationshipTags: ["朋友", "同事"],
    abilityTags: ["会接话", "会润色", "会多步引导"],
    recommended: true,
    popularityScore: 785,
  },
  {
    id: "baobao",
    name: "人家还是宝宝",
    summary: "软萌但不幼态过头：会撒娇，也能把事情说清。",
    price: 0,
    owned: false,
    primaryCategory: "朋友社交",
    taskTags: ["安慰", "延续聊天", "邀约", "表达感谢"],
    toneTags: ["软", "活泼"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "擅长安慰"],
    recommended: true,
    popularityScore: 738,
  },
  {
    id: "keyan",
    name: "科研圣体",
    summary: "结构清楚、有据可依：像做科研一样聊事，但不堆术语。",
    price: 0,
    owned: false,
    primaryCategory: "职场沟通",
    taskTags: ["谈合作", "催进度", "维护边界", "表达感谢"],
    toneTags: ["专业", "严谨"],
    relationshipTags: ["同事", "同学", "客户"],
    abilityTags: ["会润色", "会多步引导"],
    recommended: true,
    popularityScore: 732,
  },
];

let userMolsList: MolCatalogItem[] = [];

let molInfoById: Record<string, MolInfoItem[]> = {};

function resolveMockInfo(molId: string, category: string): MolInfoItem[] {
  return defaultInfoItemsForMol(molId, category) as MolInfoItem[];
}

function mergeMyMolsListMock(): MolInMyCollection[] {
  const fromUser: MolInMyCollection[] = userMolsList.map((m) => ({
    ...m,
    owned: true,
    source: "created" as const,
    uploaderIsMe: m.uploaderIsMe ?? true,
  }));
  const fromStore: MolInMyCollection[] = molCatalogMock
    .filter((m) => m.owned)
    .map((m) => ({
      ...m,
      source: "store" as const,
      uploaderIsMe: m.uploaderIsMe ?? false,
    }));
  const byId = new Map<string, MolInMyCollection>();
  for (const u of fromUser) {
    byId.set(u.id, u);
  }
  for (const s of fromStore) {
    if (!byId.has(s.id)) {
      byId.set(s.id, s);
    }
  }
  return [...byId.values()].sort(
    (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0) || a.name.localeCompare(b.name, "zh-Hans"),
  );
}

export async function getOneWaySession(): Promise<{ sessionId: string; messages: OneWayMessage[] }> {
  if (isApiMock()) {
    await wait(180);
    return { sessionId: "mock-session-1", messages: oneWayMockMessages };
  }
  return getJson<{ sessionId: string; messages: OneWayMessage[] }>("/api/oneway/session");
}

export async function sendOneWayMessage(sessionId: string, text: string): Promise<OneWayMessage> {
  if (isApiMock()) {
    await wait(260);
    const reply: OneWayMessage = {
      id: `m-${Date.now()}`,
      role: "agent",
      text: `已收到。基于你刚才的内容，我建议先明确目标与时间，再推进下一步。`,
      time: nowTime(),
    };
    oneWayMockMessages = [
      ...oneWayMockMessages,
      { id: `m-${Date.now()}-v`, role: "visitor", text, time: nowTime() },
      reply,
    ];
    return reply;
  }
  return postJson<OneWayMessage>("/api/oneway/message", { sessionId, text });
}

export async function getFeedQuestions(): Promise<FeedQuestion[]> {
  if (isApiMock()) {
    await wait(160);
    return feedMockQuestions;
  }
  return getJson<FeedQuestion[]>("/api/oneway/feed/questions");
}

export async function submitFeedAnswer(questionId: string, answer: string): Promise<FeedQuestion> {
  if (isApiMock()) {
    await wait(200);
    feedMockQuestions = feedMockQuestions.map((q) =>
      q.id === questionId ? { ...q, answered: true, answer } : q,
    );
    const next = feedMockQuestions.find((q) => q.id === questionId);
    if (!next) {
      throw new Error("提交失败：问题不存在");
    }
    return next;
  }
  return postJson<FeedQuestion>("/api/oneway/feed/answer", { questionId, answer });
}

export async function getOneWayDataBoard(): Promise<DataBoardSnapshot> {
  if (isApiMock()) {
    await wait(150);
    return dataBoardMock;
  }
  return getJson<DataBoardSnapshot>("/api/oneway/data-board");
}

export async function getMolCatalog(): Promise<MolCatalogItem[]> {
  if (isApiMock()) {
    await wait(160);
    return molCatalogMock;
  }
  return getJson<MolCatalogItem[]>("/api/mol-world", authT());
}

export async function purchaseMol(molId: string): Promise<MolCatalogItem[]> {
  if (isApiMock()) {
    await wait(220);
    molCatalogMock = molCatalogMock.map((m) => (m.id === molId ? { ...m, owned: true } : m));
    return molCatalogMock;
  }
  return postJson<MolCatalogItem[]>("/api/mol-mine/import", { molWorldId: molId }, authT());
}

export async function getMyMols(): Promise<MolInMyCollection[]> {
  if (isApiMock()) {
    await wait(140);
    return mergeMyMolsListMock();
  }
  return getJson<MolInMyCollection[]>("/api/mol-mine", authT());
}


export async function getMolInfoItems(molId: string): Promise<MolInfoItem[]> {
  if (isApiMock()) {
    await wait(100);
    if (molId in molInfoById) {
      return (molInfoById[molId] ?? []).map((x) => ({ ...x }));
    }
    const fromList = [...molCatalogMock, ...userMolsList].find((m) => m.id === molId);
    const cat = fromList?.primaryCategory ?? DEFAULT_MOL_CATEGORY;
    const seed = resolveMockInfo(molId, cat);
    molInfoById = { ...molInfoById, [molId]: seed };
    return seed.map((x) => ({ ...x }));
  }
  const { info } = await getMyMolDetailForEdit(molId);
  return info;
}

export async function putMolInfoItems(_molId: string, _items: MolInfoItem[]): Promise<void> {
  if (isApiMock()) {
    await wait(150);
    molInfoById[_molId] = _items.map((x) => ({ ...x }));
    return;
  }
  throw new Error("请使用保存：信息项已合并到素颜世界文件更新接口。");
}

export async function getMyMolDetailForEdit(molId: string): Promise<{ item: MolInMyCollection; info: MolInfoItem[] }> {
  if (isApiMock()) {
    await wait(150);
    const list = mergeMyMolsListMock();
    const item = list.find((m) => m.id === molId);
    if (!item) {
      throw new Error(`未找到该${SUYAN.name}，可能已移除。请从「${SUYAN.my}」重试。`);
    }
    const info = await getMolInfoItems(molId);
    return { item, info };
  }
  return getJson<{ item: MolInMyCollection; info: MolInfoItem[] }>(`/api/mol-mine/${encodeURIComponent(molId)}/detail`, authT());
}

export async function updateMyMol(molId: string, patch: UpdateMyMolInput): Promise<void> {
  const p = { ...patch };
  if (p.name !== undefined) p.name = normalizeLegacySuyanName(p.name.trim());
  if (p.summary !== undefined) p.summary = p.summary.trim();
  if (p.primaryCategory !== undefined) p.primaryCategory = p.primaryCategory.trim();
  if (isApiMock()) {
    await wait(180);
    const u = userMolsList.find((m) => m.id === molId);
    if (u) {
      userMolsList = userMolsList.map((m) =>
        m.id === molId
          ? {
              ...m,
              name: p.name !== undefined && p.name !== "" ? p.name : m.name,
              summary: p.summary !== undefined && p.summary !== "" ? p.summary : m.summary,
              primaryCategory: p.primaryCategory !== undefined && p.primaryCategory !== "" ? p.primaryCategory : m.primaryCategory,
            }
          : m,
      );
      if (p.infoItems) {
        molInfoById[molId] = p.infoItems.map((x) => ({ ...x }));
      }
      return;
    }
    const c = molCatalogMock.find((m) => m.id === molId && m.owned);
    if (c) {
      molCatalogMock = molCatalogMock.map((m) => {
        if (m.id !== molId) return m;
        return {
          ...m,
          name: p.name !== undefined && p.name !== "" ? p.name! : m.name,
          summary: p.summary !== undefined && p.summary !== "" ? p.summary! : m.summary,
          primaryCategory: p.primaryCategory !== undefined && p.primaryCategory !== "" ? p.primaryCategory! : m.primaryCategory,
        };
      });
      if (p.infoItems) {
        molInfoById[molId] = p.infoItems.map((x) => ({ ...x }));
      }
      return;
    }
    throw new Error(`该${SUYAN.name}不存在或不可编辑。`);
  }
  await patchJson<unknown>(`/api/mol-world/${encodeURIComponent(molId)}`, p, authT());
}

export async function removeMyMol(molId: string, options?: { deleteFromWorld?: boolean }): Promise<void> {
  if (isApiMock()) {
    await wait(200);
    if (userMolsList.some((m) => m.id === molId)) {
      userMolsList = userMolsList.filter((m) => m.id !== molId);
      if (options?.deleteFromWorld) {
        molCatalogMock = molCatalogMock.filter((m) => m.id !== molId);
      }
      if (molId in molInfoById) {
        const next = { ...molInfoById };
        delete next[molId];
        molInfoById = next;
      }
      clearAssistMolItems(molId);
      return;
    }
    if (molCatalogMock.some((m) => m.id === molId && m.owned)) {
      molCatalogMock = molCatalogMock.map((m) => (m.id === molId ? { ...m, owned: false } : m));
      if (molId in molInfoById) {
        const next = { ...molInfoById };
        delete next[molId];
        molInfoById = next;
      }
      clearAssistMolItems(molId);
      return;
    }
    throw new Error(`该${SUYAN.name}不存在或已移除。`);
  }
  if (options?.deleteFromWorld) {
    await deleteJson<unknown>(`/api/mol-world/${encodeURIComponent(molId)}`, authT());
  } else {
    await deleteJson<unknown>(`/api/mol-mine/${encodeURIComponent(molId)}`, authT());
  }
  clearAssistMolItems(molId);
}
