import { customAlphabet } from "nanoid";
import type { DatabaseSync } from "node:sqlite";
import type {
  YiyiBridgeSession,
  YiyiBridgeStatus,
  YiyiBridgeTranscriptLine,
  YiyiOwnerChatMessage,
  YiyiPermissions,
  YiyiProfile,
  YiyiTrashItem,
  YiyiUserState,
} from "../types/yiyi";
import type { YiyiAiService } from "./yiyiAi.service";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

const DEFAULT_TRASH: YiyiTrashItem[] = [
  { id: "porn", label: "色情", hint: "含露骨暗示、索要私密内容", enabled: true, isCustom: false },
  { id: "harass", label: "骚扰", hint: "反复纠缠、不受欢迎的私信", enabled: true, isCustom: false },
  { id: "boundary", label: "没有边界", hint: "过度打探隐私、强行越界", enabled: true, isCustom: false },
  { id: "rude", label: "没有礼貌", hint: "辱骂、歧视、阴阳怪气", enabled: true, isCustom: false },
  { id: "spam", label: "推销与广告", hint: "硬广、引流、理财课程", enabled: false, isCustom: false },
  { id: "manipulate", label: "情感操控", hint: "PUA 话术、 guilt tripping", enabled: false, isCustom: false },
];

const DEFAULT_PROFILE: YiyiProfile = {
  socialDirection: "待了解",
  personality: "待了解",
  other: "待了解",
  tags: { social: [], personality: [], other: [] },
};

const DEFAULT_PERMISSIONS: YiyiPermissions = {
  allowViewProcess: false,
  allowAddFriend: true,
  yiyiActive: true,
};

const WELCOME_MESSAGES = (): YiyiOwnerChatMessage[] => [
  {
    id: `yiyi-${Date.now()}-w1`,
    from: "yiyi",
    text: "你好，我是 YiYi。我会先了解你的想法和边界，再代表你参与对外沟通。",
    ts: Date.now() - 60_000,
  },
  {
    id: `yiyi-${Date.now()}-w2`,
    from: "yiyi",
    text: "可以先从下面选一个话题，也可以用自己的话说。",
    ts: Date.now() - 30_000,
  },
];

type StateRow = {
  trash_json: string;
  permissions_json: string;
  profile_json: string;
  owner_chat_json: string;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function peerAccent(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  const hues = ["#6366f1", "#8b5cf6", "#10b981", "#f472b6", "#0ea5e9", "#f59e0b"];
  return hues[hash % hues.length];
}

export class YiyiService {
  private readonly db: DatabaseSync;
  private readonly ai: YiyiAiService;

  constructor(db: DatabaseSync, ai: YiyiAiService) {
    this.db = db;
    this.ai = ai;
  }

  isAiConfigured(): boolean {
    return this.ai.isConfigured();
  }

  private getUserDisplayName(userId: string): string {
    const row = this.db.prepare("SELECT nickname FROM users WHERE id = ?").get(userId) as { nickname?: string | null } | undefined;
    const nick = row?.nickname?.trim();
    if (nick) return nick;
    return `用户${userId.slice(0, 4)}`;
  }

  private loadRow(userId: string): StateRow | null {
    return this.db.prepare("SELECT trash_json, permissions_json, profile_json, owner_chat_json FROM yiyi_user_state WHERE user_id = ?").get(userId) as StateRow | undefined ?? null;
  }

  ensureUserState(userId: string): YiyiUserState {
    const existing = this.loadRow(userId);
    if (existing) {
      return {
        trash: parseJson(existing.trash_json, DEFAULT_TRASH),
        permissions: parseJson(existing.permissions_json, DEFAULT_PERMISSIONS),
        profile: parseJson(existing.profile_json, DEFAULT_PROFILE),
        ownerChat: parseJson(existing.owner_chat_json, []),
      };
    }

    const welcome = WELCOME_MESSAGES();
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO yiyi_user_state (user_id, trash_json, permissions_json, profile_json, owner_chat_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        JSON.stringify(DEFAULT_TRASH),
        JSON.stringify(DEFAULT_PERMISSIONS),
        JSON.stringify(DEFAULT_PROFILE),
        JSON.stringify(welcome),
        now,
      );
    return {
      trash: DEFAULT_TRASH,
      permissions: DEFAULT_PERMISSIONS,
      profile: DEFAULT_PROFILE,
      ownerChat: welcome,
    };
  }

  private saveState(userId: string, state: YiyiUserState): void {
    this.db
      .prepare(
        `UPDATE yiyi_user_state SET trash_json = ?, permissions_json = ?, profile_json = ?, owner_chat_json = ?, updated_at = ?
         WHERE user_id = ?`,
      )
      .run(
        JSON.stringify(state.trash),
        JSON.stringify(state.permissions),
        JSON.stringify(state.profile),
        JSON.stringify(state.ownerChat),
        Date.now(),
        userId,
      );
  }

  getState(userId: string): YiyiUserState {
    return this.ensureUserState(userId);
  }

  updateTrash(userId: string, trash: YiyiTrashItem[]): YiyiUserState {
    const state = this.ensureUserState(userId);
    state.trash = trash;
    this.saveState(userId, state);
    return state;
  }

  updatePermissions(userId: string, patch: Partial<YiyiPermissions>): YiyiUserState {
    const state = this.ensureUserState(userId);
    state.permissions = { ...state.permissions, ...patch };
    this.saveState(userId, state);
    return state;
  }

  async sendOwnerChat(userId: string, text: string): Promise<{ state: YiyiUserState; newMessages: YiyiOwnerChatMessage[] }> {
    if (!this.ai.isConfigured()) throw new Error("AI_NOT_CONFIGURED");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("INVALID_PARAMS");

    const state = this.ensureUserState(userId);
    const userMsg: YiyiOwnerChatMessage = {
      id: `me-${nanoid()}`,
      from: "me",
      text: trimmed,
      ts: Date.now(),
    };

    const aiResult = await this.ai.ownerReply({
      trash: state.trash,
      profile: state.profile,
      history: state.ownerChat,
      userText: trimmed,
    });

    const yiyiMsg: YiyiOwnerChatMessage = {
      id: `yiyi-${nanoid()}`,
      from: "yiyi",
      text: aiResult.reply,
      ts: Date.now() + 1,
      topics: aiResult.topics.length > 0 ? aiResult.topics : undefined,
    };

    state.profile = aiResult.profile;
    state.ownerChat = [...state.ownerChat, userMsg, yiyiMsg];
    this.saveState(userId, state);
    return { state, newMessages: [userMsg, yiyiMsg] };
  }

  async refreshTopics(userId: string): Promise<{ topics: string[]; yiyiMessage: YiyiOwnerChatMessage; state: YiyiUserState }> {
    if (!this.ai.isConfigured()) throw new Error("AI_NOT_CONFIGURED");
    const state = this.ensureUserState(userId);
    const topics = await this.ai.suggestTopics(state.profile);
    const yiyiMsg: YiyiOwnerChatMessage = {
      id: `yiyi-${nanoid()}`,
      from: "yiyi",
      text: "换一批问题，选感兴趣的或直接输入：",
      ts: Date.now(),
      topics,
    };
    state.ownerChat = [...state.ownerChat, yiyiMsg];
    this.saveState(userId, state);
    return { topics, yiyiMessage: yiyiMsg, state };
  }

  pickTopic(userId: string, topic: string, sourceMessageId?: string): { yiyiMessage: YiyiOwnerChatMessage; state: YiyiUserState } {
    const trimmed = topic.trim();
    if (!trimmed) throw new Error("INVALID_PARAMS");

    const state = this.ensureUserState(userId);
    if (sourceMessageId) {
      state.ownerChat = state.ownerChat.map((m) =>
        m.id === sourceMessageId && m.from === "yiyi" ? { ...m, topics: undefined } : m,
      );
    }

    const yiyiMsg: YiyiOwnerChatMessage = {
      id: `yiyi-${nanoid()}`,
      from: "yiyi",
      text: trimmed,
      ts: Date.now(),
    };
    state.ownerChat = [...state.ownerChat, yiyiMsg];
    this.saveState(userId, state);
    return { yiyiMessage: yiyiMsg, state };
  }

  listBridges(userId: string): YiyiBridgeSession[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_a_id, user_b_id, status, summary, tags_json, blocked_reason, transcript_json, updated_at
         FROM yiyi_bridge_sessions
         WHERE user_a_id = ? OR user_b_id = ?
         ORDER BY updated_at DESC
         LIMIT 50`,
      )
      .all(userId, userId) as Array<{
      id: string;
      user_a_id: string;
      user_b_id: string;
      status: YiyiBridgeStatus;
      summary: string;
      tags_json: string;
      blocked_reason: string | null;
      transcript_json: string;
      updated_at: number;
    }>;

    return rows.map((row) => this.rowToBridgeSession(userId, row));
  }

  getBridge(userId: string, sessionId: string): YiyiBridgeSession {
    const row = this.db
      .prepare(
        `SELECT id, user_a_id, user_b_id, status, summary, tags_json, blocked_reason, transcript_json, updated_at
         FROM yiyi_bridge_sessions WHERE id = ?`,
      )
      .get(sessionId) as {
      id: string;
      user_a_id: string;
      user_b_id: string;
      status: YiyiBridgeStatus;
      summary: string;
      tags_json: string;
      blocked_reason: string | null;
      transcript_json: string;
      updated_at: number;
    } | undefined;

    if (!row) throw new Error("NOT_FOUND");
    if (row.user_a_id !== userId && row.user_b_id !== userId) throw new Error("FORBIDDEN");
    return this.rowToBridgeSession(userId, row);
  }

  private rowToBridgeSession(
    viewerUserId: string,
    row: {
      id: string;
      user_a_id: string;
      user_b_id: string;
      status: YiyiBridgeStatus;
      summary: string;
      tags_json: string;
      blocked_reason: string | null;
      transcript_json: string;
      updated_at: number;
    },
  ): YiyiBridgeSession {
    const peerUserId = row.user_a_id === viewerUserId ? row.user_b_id : row.user_a_id;
    const peerLabel = `${this.getUserDisplayName(peerUserId)}的 YiYi`;
    const tags = parseJson<string[]>(row.tags_json, []);
    const transcript = parseJson<YiyiBridgeTranscriptLine[]>(row.transcript_json, []);
    const state = this.ensureUserState(viewerUserId);
    const showTranscript = state.permissions.allowViewProcess;

    return {
      id: row.id,
      peerUserId,
      peerLabel,
      peerAccent: peerAccent(peerUserId),
      status: row.status,
      preview: row.status === "blocked" && row.blocked_reason ? row.blocked_reason : row.summary,
      tags,
      blockedReason: row.blocked_reason ?? undefined,
      transcript: showTranscript ? transcript : [],
      ts: row.updated_at,
    };
  }

  private profileScore(a: YiyiProfile, b: YiyiProfile): number {
    const allA = [...a.tags.social, ...a.tags.personality, ...a.tags.other];
    const allB = [...b.tags.social, ...b.tags.personality, ...b.tags.other];
    let score = 0;
    for (const t of allA) {
      if (allB.includes(t)) score += 2;
    }
    if (a.socialDirection !== "待了解" && b.socialDirection !== "待了解" && a.socialDirection === b.socialDirection) {
      score += 3;
    }
    if (a.personality !== "待了解" && b.personality !== "待了解") {
      if (a.personality === b.personality) score += 2;
    }
    return score;
  }

  private findMatchCandidate(userId: string, profile: YiyiProfile): string | null {
    const rows = this.db
      .prepare(
        `SELECT user_id, profile_json, permissions_json FROM yiyi_user_state WHERE user_id != ?`,
      )
      .all(userId) as Array<{ user_id: string; profile_json: string; permissions_json: string }>;

    let bestId: string | null = null;
    let bestScore = -1;

    for (const row of rows) {
      const perms = parseJson<YiyiPermissions>(row.permissions_json, DEFAULT_PERMISSIONS);
      if (!perms.yiyiActive) continue;

      const peerProfile = parseJson<YiyiProfile>(row.profile_json, DEFAULT_PROFILE);
      if (peerProfile.socialDirection === "待了解" && peerProfile.personality === "待了解") continue;

      const [a, b] = canonicalPair(userId, row.user_id);
      const existing = this.db
        .prepare("SELECT id FROM yiyi_bridge_sessions WHERE user_a_id = ? AND user_b_id = ?")
        .get(a, b) as { id: string } | undefined;
      if (existing) continue;

      const score = this.profileScore(profile, peerProfile);
      if (score > bestScore) {
        bestScore = score;
        bestId = row.user_id;
      }
    }

    if (bestId) return bestId;

    for (const row of rows) {
      const perms = parseJson<YiyiPermissions>(row.permissions_json, DEFAULT_PERMISSIONS);
      if (!perms.yiyiActive) continue;
      const [a, b] = canonicalPair(userId, row.user_id);
      const existing = this.db
        .prepare("SELECT id FROM yiyi_bridge_sessions WHERE user_a_id = ? AND user_b_id = ?")
        .get(a, b) as { id: string } | undefined;
      if (existing) continue;
      return row.user_id;
    }

    return null;
  }

  private profileReady(profile: YiyiProfile, ownerChat: YiyiOwnerChatMessage[]): boolean {
    const userTurns = ownerChat.filter((m) => m.from === "me").length;
    if (userTurns >= 2) return true;
    return profile.socialDirection !== "待了解" || profile.personality !== "待了解" || profile.other !== "待了解";
  }

  async runMatch(userId: string): Promise<YiyiBridgeSession> {
    if (!this.ai.isConfigured()) throw new Error("AI_NOT_CONFIGURED");

    const state = this.ensureUserState(userId);
    if (!state.permissions.yiyiActive) throw new Error("YIYI_INACTIVE");
    if (!this.profileReady(state.profile, state.ownerChat)) throw new Error("PROFILE_NOT_READY");

    const peerUserId = this.findMatchCandidate(userId, state.profile);
    if (!peerUserId) throw new Error("NO_CANDIDATE");

    const peerState = this.ensureUserState(peerUserId);
    const [userAId, userBId] = canonicalPair(userId, peerUserId);
    const isRequesterA = userAId === userId;

    const sim = await this.ai.simulateBridge({
      ownerAName: this.getUserDisplayName(userAId),
      profileA: isRequesterA ? state.profile : peerState.profile,
      trashA: isRequesterA ? state.trash : peerState.trash,
      ownerBName: this.getUserDisplayName(userBId),
      profileB: isRequesterA ? peerState.profile : state.profile,
      trashB: isRequesterA ? peerState.trash : state.trash,
    });

    const now = Date.now();
    const transcript: YiyiBridgeTranscriptLine[] = sim.transcript.map((line, i) => ({
      from: line.from,
      text: line.text,
      ts: now + i * 1000,
    }));

    const sessionId = `ybr-${nanoid()}`;
    this.db
      .prepare(
        `INSERT INTO yiyi_bridge_sessions
         (id, user_a_id, user_b_id, status, summary, tags_json, blocked_reason, transcript_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        sessionId,
        userAId,
        userBId,
        sim.status,
        sim.summary,
        JSON.stringify(sim.tags),
        sim.blockedReason ?? null,
        JSON.stringify(transcript),
        now,
        now,
      );

    return this.getBridge(userId, sessionId);
  }
}
