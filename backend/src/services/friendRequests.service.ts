import type { DatabaseSync } from "node:sqlite";
import { normalizePhoneDigits } from "../utils/phone";
import type { ContactsService } from "./contacts.service";

export type FriendRequestListItem = {
  id: number;
  fromUserId: string;
  toUserId: string;
  fromPhone: string;
  toPhone: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "canceled";
  createdAt: number;
  decidedAt: number | null;
};

function isSqliteUniqueConstraint(err: unknown): boolean {
  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string; cause?: unknown };
    if (o.code === "SQLITE_CONSTRAINT_UNIQUE" || o.code === "SQLITE_CONSTRAINT") return true;
    const msg = typeof o.message === "string" ? o.message : "";
    if (/SQLITE_CONSTRAINT|UNIQUE constraint failed/i.test(msg)) return true;
    if (o.cause) return isSqliteUniqueConstraint(o.cause);
  }
  return false;
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

export class FriendRequestsService {
  constructor(
    private readonly db: DatabaseSync,
    private readonly contacts: ContactsService,
  ) {}

  create(fromUserId: string, fromPhone: string, phoneRaw: string, messageRaw?: string): FriendRequestListItem {
    const phone = normalizePhoneDigits(String(phoneRaw));
    if (!phone) throw new Error("INVALID_PHONE");
    if (phone === fromPhone) throw new Error("SELF");

    const target = this.db.prepare("SELECT id, phone FROM users WHERE phone = ?").get(phone) as
      | { id: string; phone: string }
      | undefined;
    if (!target) throw new Error("NOT_FOUND");
    if (target.id === fromUserId) throw new Error("SELF");

    if (this.contacts.areMutualContacts(fromUserId, target.id)) {
      throw new Error("ALREADY_FRIENDS");
    }

    const msg = normalizeMessage(messageRaw);
    const now = Date.now();

    try {
      this.db
        .prepare(
          "INSERT INTO friend_requests (from_user_id, to_user_id, message, status, created_at, decided_at) VALUES (?, ?, ?, 'pending', ?, NULL)",
        )
        .run(fromUserId, target.id, msg, now);
    } catch (err) {
      if (isSqliteUniqueConstraint(err)) {
        throw new Error("DUPLICATE_PENDING");
      }
      throw err;
    }

    const idRow = this.db
      .prepare(
        "SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
      )
      .get(fromUserId, target.id) as { id: number } | undefined;
    if (!idRow) throw new Error("INTERNAL_ERROR");
    const row = this.getById(idRow.id);
    if (!row) throw new Error("INTERNAL_ERROR");
    return row;
  }

  listInbox(userId: string): FriendRequestListItem[] {
    return this.db
      .prepare(
        `SELECT fr.id AS id, fr.from_user_id AS fromUserId, fr.to_user_id AS toUserId,
                uf.phone AS fromPhone, ut.phone AS toPhone, fr.message AS message,
                fr.status AS status, fr.created_at AS createdAt, fr.decided_at AS decidedAt
         FROM friend_requests fr
         INNER JOIN users uf ON uf.id = fr.from_user_id
         INNER JOIN users ut ON ut.id = fr.to_user_id
         WHERE fr.to_user_id = ? AND fr.status = 'pending'
         ORDER BY fr.created_at DESC`,
      )
      .all(userId) as FriendRequestListItem[];
  }

  listOutbox(userId: string): FriendRequestListItem[] {
    return this.db
      .prepare(
        `SELECT fr.id AS id, fr.from_user_id AS fromUserId, fr.to_user_id AS toUserId,
                uf.phone AS fromPhone, ut.phone AS toPhone, fr.message AS message,
                fr.status AS status, fr.created_at AS createdAt, fr.decided_at AS decidedAt
         FROM friend_requests fr
         INNER JOIN users uf ON uf.id = fr.from_user_id
         INNER JOIN users ut ON ut.id = fr.to_user_id
         WHERE fr.from_user_id = ? AND fr.status = 'pending'
         ORDER BY fr.created_at DESC`,
      )
      .all(userId) as FriendRequestListItem[];
  }

  /** 收件箱待处理数量（红点） */
  countPendingInbox(userId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(1) AS c FROM friend_requests WHERE to_user_id = ? AND status = 'pending'")
      .get(userId) as { c: number } | undefined;
    return Number(row?.c ?? 0);
  }

  accept(requestId: number, accepterUserId: string): { request: FriendRequestListItem; contactForRequester: { contactUserId: string; phone: string } } {
    const row = this.db
      .prepare(
        `SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId, status FROM friend_requests WHERE id = ?`,
      )
      .get(requestId) as { id: number; fromUserId: string; toUserId: string; status: string } | undefined;
    if (!row) throw new Error("NOT_FOUND");
    if (row.status !== "pending") throw new Error("INVALID_STATE");
    if (row.toUserId !== accepterUserId) throw new Error("FORBIDDEN");

    const now = Date.now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const upd = this.db
        .prepare(
          "UPDATE friend_requests SET status = 'accepted', decided_at = ? WHERE id = ? AND to_user_id = ? AND status = 'pending'",
        )
        .run(now, requestId, accepterUserId);
      if (upd.changes !== 1) {
        throw new Error("INVALID_STATE");
      }
      this.db
        .prepare("INSERT OR IGNORE INTO contacts (owner_user_id, contact_user_id, remark, created_at) VALUES (?, ?, NULL, ?)")
        .run(row.fromUserId, row.toUserId, now);
      this.db
        .prepare("INSERT OR IGNORE INTO contacts (owner_user_id, contact_user_id, remark, created_at) VALUES (?, ?, NULL, ?)")
        .run(row.toUserId, row.fromUserId, now);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }

    const accepterPhoneRow = this.db.prepare("SELECT phone FROM users WHERE id = ?").get(accepterUserId) as
      | { phone: string }
      | undefined;
    const request = this.getById(requestId);
    if (!request) throw new Error("INTERNAL_ERROR");
    return {
      request,
      contactForRequester: {
        contactUserId: accepterUserId,
        phone: maskPhone(accepterPhoneRow?.phone ?? ""),
      },
    };
  }

  reject(requestId: number, rejecterUserId: string): FriendRequestListItem {
    const row = this.db
      .prepare(`SELECT id, to_user_id AS toUserId, status FROM friend_requests WHERE id = ?`)
      .get(requestId) as { id: number; toUserId: string; status: string } | undefined;
    if (!row) throw new Error("NOT_FOUND");
    if (row.status !== "pending") throw new Error("INVALID_STATE");
    if (row.toUserId !== rejecterUserId) throw new Error("FORBIDDEN");

    const now = Date.now();
    const info = this.db
      .prepare(
        "UPDATE friend_requests SET status = 'rejected', decided_at = ? WHERE id = ? AND to_user_id = ? AND status = 'pending'",
      )
      .run(now, requestId, rejecterUserId);
    if (info.changes !== 1) throw new Error("INVALID_STATE");

    const out = this.getById(requestId);
    if (!out) throw new Error("INTERNAL_ERROR");
    return out;
  }

  /** 发起方取消待处理申请 */
  cancel(requestId: number, senderUserId: string): void {
    const row = this.db
      .prepare(`SELECT id, from_user_id AS fromUserId, status FROM friend_requests WHERE id = ?`)
      .get(requestId) as { id: number; fromUserId: string; status: string } | undefined;
    if (!row) throw new Error("NOT_FOUND");
    if (row.status !== "pending") throw new Error("INVALID_STATE");
    if (row.fromUserId !== senderUserId) throw new Error("FORBIDDEN");

    const info = this.db.prepare("DELETE FROM friend_requests WHERE id = ? AND from_user_id = ? AND status = 'pending'").run(
      requestId,
      senderUserId,
    );
    if (info.changes !== 1) throw new Error("INVALID_STATE");
  }

  getById(id: number): FriendRequestListItem | undefined {
    return this.db
      .prepare(
        `SELECT fr.id AS id, fr.from_user_id AS fromUserId, fr.to_user_id AS toUserId,
                uf.phone AS fromPhone, ut.phone AS toPhone, fr.message AS message,
                fr.status AS status, fr.created_at AS createdAt, fr.decided_at AS decidedAt
         FROM friend_requests fr
         INNER JOIN users uf ON uf.id = fr.from_user_id
         INNER JOIN users ut ON ut.id = fr.to_user_id
         WHERE fr.id = ?`,
      )
      .get(id) as FriendRequestListItem | undefined;
  }
}

function normalizeMessage(input: string | undefined): string | null {
  if (input === undefined) return null;
  const t = input.trim();
  if (t.length === 0) return null;
  return t.slice(0, 200);
}
