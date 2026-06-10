import { deleteJson, getJson, patchJson, postJson } from "./api";
import { isApiMock } from "./mock";
import { getAuthToken } from "./storage";

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

export type CreateMyMolInput = {
  name: string;
  summary: string;
  /** 与 molWorldTaxonomy 一级场景一致，不含「全部」 */
  primaryCategory: string;
  /** 创建时同时写入的详情信息项（id 在服务端/mock 中生成，可不传 id） */
  initialInfo?: Array<Omit<MolInfoItem, "id"> & { id?: string }>;
};

const DEFAULT_MOL_CATEGORY = "职场沟通";
const DEFAULT_MOL_SUMMARY = "待完善";

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

function fileRecordToCatalogItem(rec: Record<string, unknown>, owned = true): MolCatalogItem {
  return {
    id: String(rec.id),
    name: String(rec.name),
    summary: String(rec.summary),
    price: Number(rec.price ?? 0),
    owned,
    primaryCategory: String(rec.primaryCategory),
    taskTags: (rec.taskTags as string[]) ?? [],
    toneTags: (rec.toneTags as string[]) ?? [],
    relationshipTags: (rec.relationshipTags as string[]) ?? [],
    abilityTags: (rec.abilityTags as string[]) ?? [],
    recommended: Boolean(rec.recommended),
    popularityScore: Number(rec.popularityScore ?? 0),
    uploaderIsMe: rec.uploaderIsMe as boolean | undefined,
    uploaderUserId: rec.uploaderUserId as string | undefined,
  };
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
    id: "pro",
    name: "职场沟通专家",
    summary: "偏正式、强调结构与边界。",
    price: 0,
    owned: true,
    primaryCategory: "职场沟通",
    taskTags: ["谈合作", "催进度", "维护边界", "表达感谢"],
    toneTags: ["专业", "有边界感"],
    relationshipTags: ["同事", "客户", "领导"],
    abilityTags: ["会润色", "会多步引导"],
    recommended: true,
    popularityScore: 920,
  },
  {
    id: "social",
    name: "朋友社交达人",
    summary: "偏亲和、延续日常话题。",
    price: 29,
    owned: false,
    primaryCategory: "朋友社交",
    taskTags: ["破冰", "延续聊天", "推进关系", "表达感谢"],
    toneTags: ["温和", "活泼"],
    relationshipTags: ["朋友"],
    abilityTags: ["会接话", "会润色"],
    recommended: true,
    popularityScore: 780,
  },
  {
    id: "warm",
    name: "亲友表达助手",
    summary: "自然口语，适合家庭与密友。",
    price: 19,
    owned: true,
    primaryCategory: "家庭亲友",
    taskTags: ["安慰", "表达感谢", "邀约", "延续聊天"],
    toneTags: ["温和", "有边界感"],
    relationshipTags: ["家人", "朋友"],
    abilityTags: ["擅长安慰", "会接话"],
    recommended: true,
    popularityScore: 750,
  },
  {
    id: "ice",
    name: "陌生人破冰",
    summary: "首句不尬、接得住对方话题。",
    price: 15,
    owned: false,
    primaryCategory: "陌生人破冰",
    taskTags: ["破冰", "推进关系", "延续聊天", "表达感谢"],
    toneTags: ["温和", "活泼", "有边界感"],
    relationshipTags: ["朋友", "客户"],
    abilityTags: ["会接话", "会多步引导"],
    recommended: false,
    popularityScore: 680,
  },
  {
    id: "love",
    name: "亲密关系表达",
    summary: "适合暧昧、约会与关系推进。",
    price: 25,
    owned: false,
    primaryCategory: "亲密关系",
    taskTags: ["推进关系", "邀约", "延续聊天", "表达感谢", "维护边界"],
    toneTags: ["温和", "暧昧", "有边界感"],
    relationshipTags: ["暧昧对象"],
    abilityTags: ["会接话", "会润色"],
    recommended: false,
    popularityScore: 700,
  },
  {
    id: "oneway",
    name: "单向体助理",
    summary: "面向访客的稳态风格与多轮接话。",
    price: 0,
    owned: false,
    primaryCategory: "单向智能体",
    taskTags: ["延续聊天", "谈合作", "催进度", "表达感谢", "维护边界"],
    toneTags: ["专业", "温和", "有边界感"],
    relationshipTags: ["客户", "朋友"],
    abilityTags: ["会多步引导", "会接话", "会润色"],
    recommended: true,
    popularityScore: 800,
  },
  {
    id: "write",
    name: "长文与表达",
    summary: "朋友圈、签名与长消息的结构化表达。",
    price: 9,
    owned: false,
    primaryCategory: "内容表达",
    taskTags: ["表达感谢", "推进关系", "维护边界", "延续聊天"],
    toneTags: ["专业", "温和", "直接"],
    relationshipTags: ["朋友", "客户", "同事"],
    abilityTags: ["会润色"],
    recommended: false,
    popularityScore: 550,
  },
  {
    id: "refuse",
    name: "婉拒与边界",
    summary: "礼貌说「不」并给替代方案。",
    price: 12,
    owned: false,
    primaryCategory: "职场沟通",
    taskTags: ["婉拒", "维护边界", "催进度"],
    toneTags: ["有边界感", "专业", "温和"],
    relationshipTags: ["领导", "同事", "客户"],
    abilityTags: ["擅长拒绝", "会多步引导"],
    recommended: false,
    popularityScore: 850,
  },
];

let userMolsList: MolCatalogItem[] = [];

let molInfoById: Record<string, MolInfoItem[]> = {};

function nextMolInfoId(): string {
  return `inf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultProInfoList(): MolInfoItem[] {
  return [
    { id: "inf-d1", source: "custom", title: "沟通风格", body: "专业、简洁、高效，避免口语化表达" },
    { id: "inf-d2", source: "store", title: "常用开场白", body: "您好，关于XX事项，我想和您沟通一下…" },
    { id: "inf-d3", source: "store", title: "商务礼仪规范", body: "与客户沟通时需注意的礼仪和话术规范", softRemoved: true },
    { id: "inf-d4", source: "custom", title: "核心关键词", body: "专业、靠谱、高效、解决方案、落地" },
    { id: "inf-d5", source: "store", title: "拒绝话术模板", body: "委婉拒绝不合理需求的标准话术" },
  ];
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

function normalizeInfoDrafts(rows: CreateMyMolInput["initialInfo"]): MolInfoItem[] {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    id: nextMolInfoId(),
    source: row.source,
    title: row.title.trim(),
    body: row.body.trim(),
    softRemoved: row.softRemoved,
  }));
}

export async function getMolInfoItems(molId: string): Promise<MolInfoItem[]> {
  if (isApiMock()) {
    await wait(100);
    if (molId in molInfoById) {
      return (molInfoById[molId] ?? []).map((x) => ({ ...x }));
    }
    if (molId === "pro") {
      const seed = defaultProInfoList();
      molInfoById = { ...molInfoById, [molId]: seed };
      return seed.map((x) => ({ ...x }));
    }
    return [];
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
  throw new Error("请使用保存：信息项已合并到 MOL 世界文件更新接口。");
}

export async function getMyMolDetailForEdit(molId: string): Promise<{ item: MolInMyCollection; info: MolInfoItem[] }> {
  if (isApiMock()) {
    await wait(150);
    const list = mergeMyMolsListMock();
    const item = list.find((m) => m.id === molId);
    if (!item) {
      throw new Error("未找到该 Mol，可能已移除。请从「我的 Mol」重试。");
    }
    const info = await getMolInfoItems(molId);
    return { item, info };
  }
  return getJson<{ item: MolInMyCollection; info: MolInfoItem[] }>(`/api/mol-mine/${encodeURIComponent(molId)}/detail`, authT());
}

/** 自建 Mol（私有）：仅出现在「我的 Mol」，不上架 Mol 世界。 */
export async function createMyMolPrivate(input: CreateMyMolInput): Promise<MolCatalogItem> {
  const name = input.name.trim();
  const summary = input.summary.trim();
  const primaryCategory = input.primaryCategory.trim();
  if (!name || !summary || !primaryCategory) {
    throw new Error("请填写名称、简介与场景。");
  }
  if (isApiMock()) {
    await wait(200);
    const newItem: MolCatalogItem = {
      id: `mp-${Date.now()}`,
      name,
      summary,
      price: 0,
      owned: true,
      primaryCategory,
      taskTags: [],
      toneTags: [],
      relationshipTags: [],
      abilityTags: [],
      recommended: false,
      popularityScore: 0,
      uploaderIsMe: true,
    };
    userMolsList = [...userMolsList, newItem];
    const initial = normalizeInfoDrafts(input.initialInfo);
    molInfoById = { ...molInfoById, [newItem.id]: initial };
    return { ...newItem };
  }
  const t = authT();
  const initialInfo = input.initialInfo?.map((row) => ({
    id: row.id,
    title: row.title.trim(),
    body: row.body.trim(),
    source: row.source ?? "custom",
    softRemoved: row.softRemoved,
  }));
  const created = await postJson<Record<string, unknown>>(
    "/api/mol-mine",
    { name, summary, primaryCategory, initialInfo },
    t,
  );
  return fileRecordToCatalogItem(created, true);
}

/** 仅名称快速创建，简介与场景使用默认值，详情在 Mol 数据页维护。 */
export async function createMyMolQuick(name: string): Promise<MolCatalogItem> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("请输入 Mol 名称。");
  }
  return createMyMolPrivate({
    name: trimmed,
    summary: DEFAULT_MOL_SUMMARY,
    primaryCategory: DEFAULT_MOL_CATEGORY,
  });
}

const MOL_AUTO_NAME_RE = /^MOL-(\d+)$/i;

/** 根据已有 Mol 名称生成下一个 MOL-N 序号名。 */
export function nextAutoMolName(existingNames: string[]): string {
  let max = 0;
  for (const raw of existingNames) {
    const m = raw.trim().match(MOL_AUTO_NAME_RE);
    if (m) max = Math.max(max, Number.parseInt(m[1]!, 10));
  }
  return `MOL-${max + 1}`;
}

/** 自动命名为 MOL-1、MOL-2… 并创建。 */
export async function createMyMolAuto(existingNames?: string[]): Promise<MolCatalogItem> {
  const names = existingNames ?? (await getMyMols()).map((m) => m.name);
  return createMyMolQuick(nextAutoMolName(names));
}

export async function updateMyMol(molId: string, patch: UpdateMyMolInput): Promise<void> {
  const p = { ...patch };
  if (p.name !== undefined) p.name = p.name.trim();
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
    throw new Error("该 Mol 不存在或不可编辑。");
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
      return;
    }
    if (molCatalogMock.some((m) => m.id === molId && m.owned)) {
      molCatalogMock = molCatalogMock.map((m) => (m.id === molId ? { ...m, owned: false } : m));
      if (molId in molInfoById) {
        const next = { ...molInfoById };
        delete next[molId];
        molInfoById = next;
      }
      return;
    }
    throw new Error("该 Mol 不存在或已移除。");
  }
  if (options?.deleteFromWorld) {
    await deleteJson<unknown>(`/api/mol-world/${encodeURIComponent(molId)}`, authT());
  } else {
    await deleteJson<unknown>(`/api/mol-mine/${encodeURIComponent(molId)}`, authT());
  }
}
