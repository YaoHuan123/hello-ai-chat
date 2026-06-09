import type { DatabaseSync } from "node:sqlite";
import { normalizePhoneDigits } from "../utils/phone";

export type ContactRow = {
  contactUserId: string;
  phone: string;
  remark: string | null;
  createdAt: number;
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

export class ContactsService {
  constructor(private readonly db: DatabaseSync) {}

  list(ownerUserId: string): ContactRow[] {
    const rows = this.db
      .prepare(
        `SELECT c.contact_user_id AS contactUserId, u.phone AS phone, c.remark AS remark, c.created_at AS createdAt
         FROM contacts c
         INNER JOIN users u ON u.id = c.contact_user_id
         WHERE c.owner_user_id = ?
         ORDER BY c.created_at DESC`,
      )
      .all(ownerUserId) as ContactRow[];
    return rows;
  }

  add(ownerUserId: string, ownerPhone: string, phoneRaw: string, remarkRaw?: string): ContactRow {
    const phone = normalizePhoneDigits(String(phoneRaw));
    if (!phone) {
      throw new Error("INVALID_PHONE");
    }
    if (phone === ownerPhone) {
      throw new Error("CONTACT_SELF");
    }

    const target = this.db.prepare("SELECT id FROM users WHERE phone = ?").get(phone) as { id: string } | undefined;
    if (!target) {
      throw new Error("CONTACT_USER_NOT_FOUND");
    }
    if (target.id === ownerUserId) {
      throw new Error("CONTACT_SELF");
    }

    const remark = normalizeRemark(remarkRaw);
    const now = Date.now();

    try {
      this.db
        .prepare(
          "INSERT INTO contacts (owner_user_id, contact_user_id, remark, created_at) VALUES (?, ?, ?, ?)",
        )
        .run(ownerUserId, target.id, remark, now);
    } catch (err) {
      if (isSqliteUniqueConstraint(err)) {
        throw new Error("CONTACT_ALREADY_ADDED");
      }
      throw err;
    }

    const row = this.getOne(ownerUserId, target.id);
    if (!row) {
      throw new Error("CONTACT_CREATE_FAILED");
    }
    return row;
  }

  areMutualContacts(userIdA: string, userIdB: string): boolean {
    const a = this.db
      .prepare("SELECT 1 AS x FROM contacts WHERE owner_user_id = ? AND contact_user_id = ? LIMIT 1")
      .get(userIdA, userIdB) as { x?: number } | undefined;
    const b = this.db
      .prepare("SELECT 1 AS x FROM contacts WHERE owner_user_id = ? AND contact_user_id = ? LIMIT 1")
      .get(userIdB, userIdA) as { x?: number } | undefined;
    return Boolean(a && b);
  }

  hasContact(ownerUserId: string, contactUserId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 AS x FROM contacts WHERE owner_user_id = ? AND contact_user_id = ? LIMIT 1")
      .get(ownerUserId, contactUserId) as { x?: number } | undefined;
    return Boolean(row);
  }

  remove(ownerUserId: string, contactUserId: string): void {
    const info = this.db
      .prepare("DELETE FROM contacts WHERE owner_user_id = ? AND contact_user_id = ?")
      .run(ownerUserId, contactUserId);
    if (info.changes === 0) {
      throw new Error("CONTACT_NOT_FOUND");
    }
  }

  updateRemark(ownerUserId: string, contactUserId: string, remarkRaw: string | null): ContactRow {
    const remark = remarkRaw === null ? null : normalizeRemark(remarkRaw);
    const info = this.db
      .prepare("UPDATE contacts SET remark = ? WHERE owner_user_id = ? AND contact_user_id = ?")
      .run(remark, ownerUserId, contactUserId);
    if (info.changes === 0) {
      throw new Error("CONTACT_NOT_FOUND");
    }
    const row = this.getOne(ownerUserId, contactUserId);
    if (!row) {
      throw new Error("CONTACT_NOT_FOUND");
    }
    return row;
  }

  private getOne(ownerUserId: string, contactUserId: string): ContactRow | undefined {
    return this.db
      .prepare(
        `SELECT c.contact_user_id AS contactUserId, u.phone AS phone, c.remark AS remark, c.created_at AS createdAt
         FROM contacts c
         INNER JOIN users u ON u.id = c.contact_user_id
         WHERE c.owner_user_id = ? AND c.contact_user_id = ?`,
      )
      .get(ownerUserId, contactUserId) as ContactRow | undefined;
  }
}

function normalizeRemark(input: string | undefined): string | null {
  if (input === undefined) return null;
  const t = input.trim();
  return t.length === 0 ? null : t.slice(0, 64);
}
