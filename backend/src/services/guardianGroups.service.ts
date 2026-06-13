import { customAlphabet } from "nanoid";
import type { DatabaseSync } from "node:sqlite";
import type { GuardianScene } from "../constants/guardianCatalog";
import { getGuardianRole, listGuardianRoles } from "../constants/guardianCatalog";
import type { ContactsService } from "./contacts.service";
import type { GuardianAiService, GuardianChatLine } from "./guardianAi.service";
import { assessPeerMessageRisk, type GuardianOwnerHint } from "./guardianRisk.service";

export type { GuardianOwnerHint };

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export type GuardianGroupMember = {
  userId: string;
  phone: string;
};

export type GuardianGroupRow = {
  id: string;
  name: string | null;
  creatorUserId: string;
  protectedUserId: string;
  /** @deprecated 兼容旧客户端，等同 protectedUserId */
  ownerUserId: string;
  /** @deprecated 兼容旧客户端，为首位受邀成员 */
  peerUserId: string;
  scene: GuardianScene;
  guardianRoleIds: string[];
  createdAt: number;
  members: GuardianGroupMember[];
};

export type GuardianGroupMessageRow = {
  id: number;
  groupId: string;
  senderKind: "owner" | "peer" | "guardian";
  fromUserId: string | null;
  guardianRoleId: string | null;
  text: string;
  ts: number;
};

export type GuardianGroupListItem = GuardianGroupRow & {
  memberCount: number;
  memberPreview: string;
  /** @deprecated 列表副标题用 memberPreview */
  peerPhone: string;
  lastText: string;
  lastTs: number;
};

const MAX_GUARDIANS = 3;
const MAX_HUMANS = 20;
const MAX_TEXT = 4000;
const MAX_NAME_LEN = 32;

type GroupDbRow = {
  id: string;
  name: string | null;
  creatorUserId: string;
  protectedUserId: string;
  ownerUserId: string;
  peerUserId: string;
  scene: GuardianScene;
  guardianRoleIdsJson: string;
  createdAt: number;
};

export class GuardianGroupsService {
  constructor(
    private readonly db: DatabaseSync,
    private readonly contacts: ContactsService,
    private readonly guardianAi: GuardianAiService,
  ) {}

  listRoles(scene?: GuardianScene) {
    return listGuardianRoles(scene);
  }

  create(
    creatorUserId: string,
    args: {
      name?: string;
      memberUserIds: string[];
      scene: GuardianScene;
      guardianRoleIds: string[];
    },
  ): GuardianGroupRow {
    const invited = [...new Set(args.memberUserIds.map((x) => x.trim()).filter(Boolean))];
    if (invited.length < 1) throw new Error("INVALID_PARAMS");
    if (invited.some((id) => id === creatorUserId)) throw new Error("INVALID_PARAMS");

    for (const id of invited) {
      if (!this.contacts.areMutualContacts(creatorUserId, id)) {
        throw new Error("NOT_FRIENDS");
      }
    }

    const humanIds = [creatorUserId, ...invited];
    if (humanIds.length > MAX_HUMANS) throw new Error("TOO_MANY_MEMBERS");

    const guardianIds = [...new Set(args.guardianRoleIds.map((x) => x.trim()).filter(Boolean))];
    if (guardianIds.length < 1 || guardianIds.length > MAX_GUARDIANS) throw new Error("INVALID_GUARDIANS");
    for (const id of guardianIds) {
      const role = getGuardianRole(id);
      if (!role || role.scene !== args.scene) throw new Error("INVALID_GUARDIANS");
    }

    const rawName = String(args.name ?? "").trim();
    const name = rawName ? rawName.slice(0, MAX_NAME_LEN) : null;
    const id = nanoid();
    const createdAt = Date.now();
    const legacyPeer = invited[0]!;

    this.db
      .prepare(
        `INSERT INTO guardian_groups (
           id, owner_user_id, peer_user_id, scene, guardian_role_ids, created_at,
           name, protected_user_id, creator_user_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        creatorUserId,
        legacyPeer,
        args.scene,
        JSON.stringify(guardianIds),
        createdAt,
        name,
        creatorUserId,
        creatorUserId,
      );

    const insertMember = this.db.prepare(
      `INSERT INTO guardian_group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)`,
    );
    for (const uid of humanIds) {
      insertMember.run(id, uid, createdAt);
    }

    return this.getById(id, creatorUserId)!;
  }

  private parseGuardianRoleIds(json: string): string[] {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      /* ignore */
    }
    return [];
  }

  private fetchGroupRow(groupId: string): GroupDbRow | undefined {
    return this.db
      .prepare(
        `SELECT id,
                COALESCE(name, '') AS name,
                COALESCE(creator_user_id, owner_user_id) AS creatorUserId,
                COALESCE(protected_user_id, owner_user_id) AS protectedUserId,
                owner_user_id AS ownerUserId,
                peer_user_id AS peerUserId,
                scene,
                guardian_role_ids AS guardianRoleIdsJson,
                created_at AS createdAt
         FROM guardian_groups WHERE id = ?`,
      )
      .get(groupId) as GroupDbRow | undefined;
  }

  private isMember(groupId: string, userId: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 AS ok FROM guardian_group_members WHERE group_id = ? AND user_id = ? LIMIT 1`)
      .get(groupId, userId) as { ok: number } | undefined;
    if (row) return true;
    const g = this.fetchGroupRow(groupId);
    if (!g) return false;
    return g.ownerUserId === userId || g.peerUserId === userId;
  }

  private loadMembers(groupId: string): GuardianGroupMember[] {
    const rows = this.db
      .prepare(
        `SELECT m.user_id AS userId, COALESCE(u.phone, '') AS phone
         FROM guardian_group_members m
         LEFT JOIN users u ON u.id = m.user_id
         WHERE m.group_id = ?
         ORDER BY m.joined_at ASC`,
      )
      .all(groupId) as GuardianGroupMember[];
    if (rows.length > 0) return rows;

    const g = this.fetchGroupRow(groupId);
    if (!g) return [];
    const out: GuardianGroupMember[] = [];
    for (const uid of [g.ownerUserId, g.peerUserId]) {
      if (!uid || out.some((x) => x.userId === uid)) continue;
      const u = this.db.prepare("SELECT phone FROM users WHERE id = ?").get(uid) as { phone: string } | undefined;
      out.push({ userId: uid, phone: u?.phone ?? "" });
    }
    return out;
  }

  private rowToGroup(row: GroupDbRow, members: GuardianGroupMember[]): GuardianGroupRow {
    const name = row.name?.trim() ? row.name.trim() : null;
    return {
      id: row.id,
      name,
      creatorUserId: row.creatorUserId,
      protectedUserId: row.protectedUserId,
      ownerUserId: row.protectedUserId,
      peerUserId: row.peerUserId,
      scene: row.scene,
      guardianRoleIds: this.parseGuardianRoleIds(row.guardianRoleIdsJson),
      createdAt: row.createdAt,
      members,
    };
  }

  getById(groupId: string, userId: string): GuardianGroupRow | undefined {
    if (!this.isMember(groupId, userId)) return undefined;
    const row = this.fetchGroupRow(groupId);
    if (!row) return undefined;
    return this.rowToGroup(row, this.loadMembers(groupId));
  }

  listForUser(userId: string): GuardianGroupListItem[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT g.id,
                COALESCE(g.name, '') AS name,
                COALESCE(g.creator_user_id, g.owner_user_id) AS creatorUserId,
                COALESCE(g.protected_user_id, g.owner_user_id) AS protectedUserId,
                g.owner_user_id AS ownerUserId,
                g.peer_user_id AS peerUserId,
                g.scene,
                g.guardian_role_ids AS guardianRoleIdsJson,
                g.created_at AS createdAt
         FROM guardian_groups g
         INNER JOIN guardian_group_members m ON m.group_id = g.id
         WHERE m.user_id = ?
         ORDER BY g.created_at DESC`,
      )
      .all(userId) as GroupDbRow[];

    const out: GuardianGroupListItem[] = [];
    for (const row of rows) {
      const members = this.loadMembers(row.id);
      const group = this.rowToGroup(row, members);
      const others = members.filter((m) => m.userId !== userId);
      const memberPreview = others
        .map((m) => maskPhone(m.phone))
        .filter(Boolean)
        .slice(0, 3)
        .join("、");
      out.push({
        ...group,
        memberCount: members.length,
        memberPreview,
        peerPhone: others[0]?.phone ?? "",
        lastText: "",
        lastTs: row.createdAt,
      });
    }
    return out;
  }

  sendHuman(groupId: string, userId: string, textRaw: string): GuardianGroupMessageRow {
    const g = this.getById(groupId, userId);
    if (!g) throw new Error("NOT_FOUND");
    const text = String(textRaw ?? "").trim();
    if (!text || text.length > MAX_TEXT) throw new Error("INVALID_PARAMS");

    const senderKind: "owner" | "peer" = userId === g.protectedUserId ? "owner" : "peer";
    const ts = Date.now();
    const id = ts * 1000 + Math.floor(Math.random() * 1000);
    return {
      id,
      groupId,
      senderKind,
      fromUserId: userId,
      guardianRoleId: null,
      text,
      ts,
    };
  }

  /** 群聊内容仅存客户端本地，服务端不返回历史。 */
  listMessages(groupId: string, userId: string): GuardianGroupMessageRow[] {
    const g = this.getById(groupId, userId);
    if (!g) throw new Error("NOT_FOUND");
    return [];
  }

  private assertOwner(groupId: string, userId: string): GuardianGroupRow {
    const g = this.getById(groupId, userId);
    if (!g) throw new Error("NOT_FOUND");
    if (g.protectedUserId !== userId) throw new Error("FORBIDDEN");
    return g;
  }

  addMembers(groupId: string, operatorUserId: string, memberUserIds: string[]): GuardianGroupRow {
    const g = this.assertOwner(groupId, operatorUserId);
    const existing = new Set(g.members.map((m) => m.userId));
    const toAdd = [...new Set(memberUserIds.map((x) => x.trim()).filter(Boolean))];
    if (toAdd.length === 0) throw new Error("INVALID_PARAMS");

    for (const id of toAdd) {
      if (existing.has(id)) throw new Error("ALREADY_MEMBER");
      if (id === g.protectedUserId) throw new Error("INVALID_PARAMS");
      if (!this.contacts.areMutualContacts(operatorUserId, id)) throw new Error("NOT_FRIENDS");
    }

    if (g.members.length + toAdd.length > MAX_HUMANS) throw new Error("TOO_MANY_MEMBERS");

    const insertMember = this.db.prepare(
      `INSERT INTO guardian_group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)`,
    );
    const now = Date.now();
    for (const id of toAdd) {
      insertMember.run(groupId, id, now);
    }

    return this.getById(groupId, operatorUserId)!;
  }

  updateName(groupId: string, operatorUserId: string, nameRaw: string): GuardianGroupRow {
    this.assertOwner(groupId, operatorUserId);
    const raw = String(nameRaw ?? "").trim();
    const name = raw ? raw.slice(0, MAX_NAME_LEN) : null;
    this.db.prepare(`UPDATE guardian_groups SET name = ? WHERE id = ?`).run(name, groupId);
    return this.getById(groupId, operatorUserId)!;
  }

  removeMember(groupId: string, operatorUserId: string, targetUserId: string): GuardianGroupRow {
    const g = this.assertOwner(groupId, operatorUserId);
    const target = targetUserId.trim();
    if (!target) throw new Error("INVALID_PARAMS");
    if (target === g.protectedUserId) throw new Error("CANNOT_REMOVE_OWNER");

    const peers = g.members.filter((m) => m.userId !== g.protectedUserId);
    if (!peers.some((m) => m.userId === target)) throw new Error("NOT_IN_GROUP");
    if (peers.length <= 1) throw new Error("MIN_MEMBERS");

    this.db.prepare(`DELETE FROM guardian_group_members WHERE group_id = ? AND user_id = ?`).run(groupId, target);

    if (target === g.peerUserId) {
      const remaining = this.loadMembers(groupId);
      const nextPeer = remaining.find((m) => m.userId !== g.protectedUserId)?.userId ?? g.protectedUserId;
      this.db.prepare(`UPDATE guardian_groups SET peer_user_id = ? WHERE id = ?`).run(nextPeer, groupId);
    }

    return this.getById(groupId, operatorUserId)!;
  }

  listOwnerHints(groupId: string, userId: string, limit = 20): GuardianOwnerHint[] {
    const g = this.getById(groupId, userId);
    if (!g) throw new Error("NOT_FOUND");
    if (g.protectedUserId !== userId) throw new Error("FORBIDDEN");

    const lim = Math.min(Math.max(1, limit), 50);
    return this.db
      .prepare(
        `SELECT peer_message_id AS peerMessageId, level, label, hint, ts
         FROM guardian_owner_hints
         WHERE group_id = ?
         ORDER BY ts DESC
         LIMIT ?`,
      )
      .all(groupId, lim) as GuardianOwnerHint[];
  }

  saveOwnerHint(groupId: string, hint: GuardianOwnerHint): void {
    this.db
      .prepare(
        `INSERT INTO guardian_owner_hints (group_id, peer_message_id, level, label, hint, ts)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(group_id, peer_message_id) DO UPDATE SET
           level = excluded.level, label = excluded.label, hint = excluded.hint, ts = excluded.ts`,
      )
      .run(groupId, hint.peerMessageId, hint.level, hint.label, hint.hint, hint.ts);
  }

  async maybeGuardianReplies(
    groupId: string,
    triggerMessage: GuardianGroupMessageRow,
    clientHistory: GuardianGroupMessageRow[] = [],
  ): Promise<{ guardianMessages: GuardianGroupMessageRow[]; ownerHint: GuardianOwnerHint | null }> {
    if (triggerMessage.senderKind !== "peer") {
      return { guardianMessages: [], ownerHint: null };
    }
    const row = this.fetchGroupRow(groupId);
    if (!row) return { guardianMessages: [], ownerHint: null };

    const members = this.loadMembers(groupId);
    const nameForUser = (uid: string) => {
      const m = members.find((x) => x.userId === uid);
      return m?.phone ? maskPhone(m.phone) : "群友";
    };

    const ownerHint = assessPeerMessageRisk(row.scene, triggerMessage.text, triggerMessage.id);
    if (ownerHint) {
      this.saveOwnerHint(groupId, ownerHint);
    }

    const guardianRoleIds = this.parseGuardianRoleIds(row.guardianRoleIdsJson);
    if (guardianRoleIds.length === 0) return { guardianMessages: [], ownerHint };
    if (!this.guardianAi.isConfigured()) return { guardianMessages: [], ownerHint };

    const history = [...clientHistory, triggerMessage].slice(-80);
    const chatLines: GuardianChatLine[] = history.map((m) =>
      this.toChatLine(m, row.protectedUserId, nameForUser),
    );

    const ownerRow = this.db.prepare("SELECT phone FROM users WHERE id = ?").get(row.protectedUserId) as
      | { phone: string }
      | undefined;
    const protectedName = ownerRow?.phone ? maskPhone(ownerRow.phone) : "群主";

    const guardianCount = history.filter((m) => m.senderKind === "guardian").length;
    const startIdx = guardianCount % guardianRoleIds.length;
    const rotated = [...guardianRoleIds.slice(startIdx), ...guardianRoleIds.slice(0, startIdx)];

    for (const roleId of rotated) {
      const role = getGuardianRole(roleId);
      if (!role) continue;

      let line: string | null = null;
      try {
        line = await this.guardianAi.maybeProactiveSpeak({
          role,
          protectedName,
          lastMessages: chatLines,
          latestPeerText: triggerMessage.text,
        });
      } catch {
        continue;
      }
      if (!line) continue;

      const ts = Date.now();
      const gid = ts * 1000 + Math.floor(Math.random() * 1000);
      return {
        guardianMessages: [
          {
            id: gid,
            groupId,
            senderKind: "guardian",
            fromUserId: null,
            guardianRoleId: roleId,
            text: line,
            ts,
          },
        ],
        ownerHint,
      };
    }

    return { guardianMessages: [], ownerHint };
  }

  getOwnerUserId(groupId: string): string | null {
    const row = this.fetchGroupRow(groupId);
    return row?.protectedUserId ?? null;
  }

  toChatLine(
    m: GuardianGroupMessageRow,
    protectedId: string,
    nameForUser: (uid: string) => string,
  ): GuardianChatLine {
    if (m.senderKind === "guardian") {
      const role = m.guardianRoleId ? getGuardianRole(m.guardianRoleId) : undefined;
      return { from: "guardian", speaker: role?.name ?? "搭子", text: m.text, ts: m.ts };
    }
    if (m.fromUserId === protectedId) {
      return { from: "owner", speaker: "群主", text: m.text, ts: m.ts };
    }
    return { from: "peer", speaker: nameForUser(m.fromUserId ?? ""), text: m.text, ts: m.ts };
  }

  memberUserIds(groupId: string): string[] {
    const rows = this.db
      .prepare(`SELECT user_id AS userId FROM guardian_group_members WHERE group_id = ?`)
      .all(groupId) as { userId: string }[];
    if (rows.length > 0) return rows.map((r) => r.userId);
    const g = this.fetchGroupRow(groupId);
    if (!g) return [];
    return [g.ownerUserId, g.peerUserId].filter((id, i, arr) => id && arr.indexOf(id) === i);
  }
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}
