import type { DatabaseSync } from "node:sqlite";
import { isValidRelationType, type RelationType } from "../constants/relationTypes";
import { normalizePhoneDigits } from "../utils/phone";

export type ContactRow = {
  contactUserId: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: number | null;
  remark: string | null;
  relationType: RelationType | null;
  defaultMolId: string | null;
  createdAt: number;
};

export type ContactPatchInput = {
  remark?: string | null;
  relationType?: RelationType | null;
  defaultMolId?: string | null;
};

const CONTACT_SELECT = `SELECT c.contact_user_id AS contactUserId, u.phone AS phone, u.nickname AS nickname,
                u.avatar_url AS avatarUrl, u.avatar_updated_at AS avatarUpdatedAt,
                c.remark AS remark, c.relation_type AS relationType, c.default_mol_id AS defaultMolId,
                c.created_at AS createdAt`;

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

function mapContactRow(raw: Record<string, unknown>): ContactRow {
  const rel = raw.relationType;
  return {
    contactUserId: String(raw.contactUserId),
    phone: String(raw.phone),
    nickname: raw.nickname == null ? null : String(raw.nickname),
    avatarUrl: raw.avatarUrl == null ? null : String(raw.avatarUrl),
    avatarUpdatedAt: raw.avatarUpdatedAt == null ? null : Number(raw.avatarUpdatedAt),
    remark: raw.remark == null ? null : String(raw.remark),
    relationType: typeof rel === "string" && isValidRelationType(rel) ? rel : null,
    defaultMolId: raw.defaultMolId == null || raw.defaultMolId === "" ? null : String(raw.defaultMolId),
    createdAt: Number(raw.createdAt),
  };
}

export class ContactsService {
  constructor(private readonly db: DatabaseSync) {}

  list(ownerUserId: string): ContactRow[] {
    const rows = this.db
      .prepare(`${CONTACT_SELECT}
         FROM contacts c
         INNER JOIN users u ON u.id = c.contact_user_id
         WHERE c.owner_user_id = ?
         ORDER BY c.created_at DESC`)
      .all(ownerUserId) as Record<string, unknown>[];
    return rows.map(mapContactRow);
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
          "INSERT INTO contacts (owner_user_id, contact_user_id, remark, relation_type, default_mol_id, created_at) VALUES (?, ?, ?, NULL, NULL, ?)",
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

  getRelation(ownerUserId: string, contactUserId: string): RelationType | null {
    const row = this.getOne(ownerUserId, contactUserId);
    return row?.relationType ?? null;
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
    return this.patch(ownerUserId, contactUserId, { remark: remarkRaw });
  }

  patch(ownerUserId: string, contactUserId: string, input: ContactPatchInput): ContactRow {
    const existing = this.getOne(ownerUserId, contactUserId);
    if (!existing) {
      throw new Error("CONTACT_NOT_FOUND");
    }

    const remark = input.remark !== undefined ? (input.remark === null ? null : normalizeRemark(input.remark)) : existing.remark;

    let relationType = existing.relationType;
    if (input.relationType !== undefined) {
      if (input.relationType !== null && !isValidRelationType(input.relationType)) {
        throw new Error("INVALID_RELATION");
      }
      relationType = input.relationType;
    }

    let defaultMolId = existing.defaultMolId;
    if (input.defaultMolId !== undefined) {
      defaultMolId = input.defaultMolId === null || input.defaultMolId.trim() === "" ? null : input.defaultMolId.trim();
    }

    const info = this.db
      .prepare(
        "UPDATE contacts SET remark = ?, relation_type = ?, default_mol_id = ? WHERE owner_user_id = ? AND contact_user_id = ?",
      )
      .run(remark, relationType, defaultMolId, ownerUserId, contactUserId);
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
    const raw = this.db
      .prepare(`${CONTACT_SELECT}
         FROM contacts c
         INNER JOIN users u ON u.id = c.contact_user_id
         WHERE c.owner_user_id = ? AND c.contact_user_id = ?`)
      .get(ownerUserId, contactUserId) as Record<string, unknown> | undefined;
    return raw ? mapContactRow(raw) : undefined;
  }
}

function normalizeRemark(input: string | undefined): string | null {
  if (input === undefined) return null;
  const t = input.trim();
  return t.length === 0 ? null : t.slice(0, 64);
}
