import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { DATA_DB_FILE, DATA_ROOT, MOL_WORLD_DIR } from "../config";
import { MOL_PRIMARY_CATEGORIES } from "../constants/molWorld";

const ensureDir = (dirPath: string): void => {
  fs.mkdirSync(dirPath, { recursive: true });
};

/** AI群聊：多成员表 + 群名称（兼容旧 1v1 群数据）。 */
function migrateGuardianGroupsMultiMember(db: DatabaseSync): void {
  const addColumn = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      /* column may already exist */
    }
  };
  addColumn("ALTER TABLE guardian_groups ADD COLUMN name TEXT");
  addColumn("ALTER TABLE guardian_groups ADD COLUMN protected_user_id TEXT");
  addColumn("ALTER TABLE guardian_groups ADD COLUMN creator_user_id TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS guardian_group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES guardian_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_guardian_group_members_user ON guardian_group_members (user_id, joined_at DESC);",
  );

  db.exec(
    "UPDATE guardian_groups SET protected_user_id = owner_user_id WHERE protected_user_id IS NULL OR protected_user_id = '';",
  );
  db.exec(
    "UPDATE guardian_groups SET creator_user_id = owner_user_id WHERE creator_user_id IS NULL OR creator_user_id = '';",
  );

  db.exec(`
    INSERT OR IGNORE INTO guardian_group_members (group_id, user_id, joined_at)
    SELECT id, owner_user_id, created_at FROM guardian_groups;
  `);
  db.exec(`
    INSERT OR IGNORE INTO guardian_group_members (group_id, user_id, joined_at)
    SELECT id, peer_user_id, created_at FROM guardian_groups
    WHERE peer_user_id IS NOT NULL AND peer_user_id != '';
  `);

  try {
    db.exec("DROP INDEX IF EXISTS idx_guardian_groups_owner_peer_scene;");
  } catch {
    /* ignore */
  }
}

export const initDb = (): DatabaseSync => {
  ensureDir(DATA_ROOT);
  ensureDir(path.dirname(DATA_DB_FILE));

  const db = new DatabaseSync(DATA_DB_FILE);
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      token_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_send_log (
      phone TEXT NOT NULL,
      ip TEXT NOT NULL,
      scene TEXT NOT NULL,
      ts INTEGER NOT NULL,
      PRIMARY KEY (phone, ts)
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_sms_send_log_ip_ts ON sms_send_log (ip, ts);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_otp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      scene TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_sms_otp_phone_scene ON sms_otp (phone, scene, expires_at);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_auth_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      user_id TEXT,
      phone_mask TEXT,
      ip TEXT,
      ua TEXT,
      reason TEXT,
      ts INTEGER NOT NULL
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_audit_auth_log_ts ON audit_auth_log (ts);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_audit_auth_log_user ON audit_auth_log (user_id, ts);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      owner_user_id TEXT NOT NULL,
      contact_user_id TEXT NOT NULL,
      remark TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (owner_user_id, contact_user_id),
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_contacts_owner_ts ON contacts (owner_user_id, created_at DESC);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
      created_at INTEGER NOT NULL,
      decided_at INTEGER,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pending_pair ON friend_requests(from_user_id, to_user_id) WHERE status = 'pending';",
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_friend_requests_to_pending ON friend_requests (to_user_id, status, created_at DESC);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_friend_requests_from_pending ON friend_requests (from_user_id, status, created_at DESC);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      ts INTEGER NOT NULL,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_messages_pair_id ON messages (from_user_id, to_user_id, id DESC);",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_messages_pair_id_rev ON messages (to_user_id, from_user_id, id DESC);",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_mols (
      owner_user_id TEXT NOT NULL,
      mol_world_id TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'store',
      created_at INTEGER NOT NULL,
      PRIMARY KEY (owner_user_id, mol_world_id),
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_user_mols_owner_ts ON user_mols (owner_user_id, created_at DESC);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS guardian_groups (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      peer_user_id TEXT NOT NULL,
      scene TEXT NOT NULL,
      guardian_role_ids TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (peer_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_guardian_groups_owner_peer_scene ON guardian_groups (owner_user_id, peer_user_id, scene);",
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_guardian_groups_peer ON guardian_groups (peer_user_id, created_at DESC);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS guardian_group_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      sender_kind TEXT NOT NULL CHECK (sender_kind IN ('owner', 'peer', 'guardian')),
      from_user_id TEXT,
      guardian_role_id TEXT,
      text TEXT NOT NULL,
      ts INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES guardian_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_guardian_group_messages_gid_id ON guardian_group_messages (group_id, id ASC);",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS guardian_owner_hints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      peer_message_id INTEGER NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high')),
      label TEXT NOT NULL,
      hint TEXT NOT NULL,
      ts INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES guardian_groups(id) ON DELETE CASCADE,
      UNIQUE (group_id, peer_message_id)
    );
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_guardian_owner_hints_gid_ts ON guardian_owner_hints (group_id, ts DESC);",
  );

  migrateGuardianGroupsMultiMember(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_moment_feeds (
      user_id TEXT PRIMARY KEY,
      items_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  ensureDir(MOL_WORLD_DIR);
  for (const cat of MOL_PRIMARY_CATEGORIES) {
    ensureDir(path.join(MOL_WORLD_DIR, cat));
  }

  return db;
};
