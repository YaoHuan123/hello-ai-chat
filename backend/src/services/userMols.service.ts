import type { DatabaseSync, StatementSync } from "node:sqlite";
import type { MolWorldFile } from "./molWorld.service";
import { MolWorldService } from "./molWorld.service";

export type UserMolRow = {
  owner_user_id: string;
  mol_world_id: string;
  source: string;
  created_at: number;
};

export class UserMolsService {
  private insertStmt: StatementSync | null = null;
  private deleteStmt: StatementSync | null = null;
  private purgeStmt: StatementSync | null = null;
  private listStmt: StatementSync | null = null;
  private existsStmt: StatementSync | null = null;

  constructor(
    private readonly db: DatabaseSync,
    private readonly molWorld: MolWorldService,
  ) {
    this.insertStmt = db.prepare(
      "INSERT INTO user_mols (owner_user_id, mol_world_id, source, created_at) VALUES (?, ?, ?, ?)",
    );
    this.deleteStmt = db.prepare("DELETE FROM user_mols WHERE owner_user_id = ? AND mol_world_id = ?");
    this.purgeStmt = db.prepare("DELETE FROM user_mols WHERE mol_world_id = ?");
    this.listStmt = db.prepare(
      "SELECT mol_world_id, source, created_at FROM user_mols WHERE owner_user_id = ? ORDER BY created_at DESC",
    );
    this.existsStmt = db.prepare(
      "SELECT 1 FROM user_mols WHERE owner_user_id = ? AND mol_world_id = ? LIMIT 1",
    );
  }

  purgeReferences(molWorldId: string): void {
    this.purgeStmt!.run(molWorldId);
  }

  owns(ownerUserId: string, molWorldId: string): boolean {
    const row = this.existsStmt!.get(ownerUserId, molWorldId) as { 1?: number } | undefined;
    return Boolean(row);
  }

  importToMine(ownerUserId: string, molWorldId: string): void {
    if (molWorldId.startsWith("mp-")) throw new Error("NOT_FOUND");
    const rec = this.molWorld.getById(molWorldId);
    if (!rec) throw new Error("NOT_FOUND");
    const exists = this.existsStmt!.get(ownerUserId, molWorldId) as { 1?: number } | undefined;
    if (exists) throw new Error("ALREADY_OWNED");
    const source = rec.uploader.userId === ownerUserId ? "created" : "store";
    this.insertStmt!.run(ownerUserId, molWorldId, source, Date.now());
  }

  createPrivateMol(ownerUserId: string, ownerPhone: string, body: unknown): MolWorldFile {
    const rec = this.molWorld.createPrivate(ownerUserId, ownerPhone, body);
    this.insertStmt!.run(ownerUserId, rec.id, "created", Date.now());
    return rec;
  }

  removeFromMine(ownerUserId: string, molWorldId: string): void {
    const info = this.deleteStmt!.run(ownerUserId, molWorldId);
    if (info.changes === 0) throw new Error("NOT_OWNED");
  }

  listOwnedIds(ownerUserId: string): { molWorldId: string; source: string }[] {
    const rows = this.listStmt!.all(ownerUserId) as { mol_world_id: string; source: string }[];
    return rows.map((r) => ({ molWorldId: r.mol_world_id, source: r.source }));
  }

  /** 返回用户拥有的 MOL 及来源标记 */
  listByOwnerWithMeta(ownerUserId: string): { record: MolWorldFile; source: string }[] {
    const ids = this.listOwnedIds(ownerUserId);
    const out: { record: MolWorldFile; source: string }[] = [];
    for (const { molWorldId, source } of ids) {
      const rec = this.molWorld.getById(molWorldId);
      if (!rec) {
        this.deleteStmt!.run(ownerUserId, molWorldId);
        continue;
      }
      out.push({ record: rec, source });
    }
    return out;
  }

  getDetailForOwner(ownerUserId: string, molWorldId: string): { record: MolWorldFile; source: string } | null {
    if (!this.owns(ownerUserId, molWorldId)) return null;
    const rec = this.molWorld.getById(molWorldId);
    if (!rec) {
      this.deleteStmt!.run(ownerUserId, molWorldId);
      return null;
    }
    const row = this.db.prepare("SELECT source FROM user_mols WHERE owner_user_id = ? AND mol_world_id = ?").get(ownerUserId, molWorldId) as
      | { source: string }
      | undefined;
    return { record: rec, source: row?.source ?? "store" };
  }
}
