/**
 * 清空服务端所有聊天相关持久化数据（不含账号、联系人、Mol 等）。
 * 普通私聊 / 护场群气泡本身不落库，主要在客户端 localStorage。
 *
 * 用法:
 *   cd backend
 *   npx ts-node scripts/clear-all-chat-records.ts
 */

import { DatabaseSync } from "node:sqlite";
import { DATA_DB_FILE } from "../src/config";

function main(): void {
  const db = new DatabaseSync(DATA_DB_FILE);
  const now = Date.now();

  const before = {
    messages: (db.prepare("SELECT COUNT(*) AS c FROM messages").get() as { c: number }).c,
    guardian_group_messages: (db.prepare("SELECT COUNT(*) AS c FROM guardian_group_messages").get() as { c: number }).c,
    yiyi_owner_chat: (db.prepare("SELECT COUNT(*) AS c FROM yiyi_user_state WHERE owner_chat_json != '[]'").get() as { c: number }).c,
    yiyi_bridge_sessions: (db.prepare("SELECT COUNT(*) AS c FROM yiyi_bridge_sessions").get() as { c: number }).c,
    guardian_owner_hints: (db.prepare("SELECT COUNT(*) AS c FROM guardian_owner_hints").get() as { c: number }).c,
  };

  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM messages");
    db.exec("DELETE FROM guardian_group_messages");
    db.exec("DELETE FROM guardian_owner_hints");
    db.exec("DELETE FROM yiyi_bridge_sessions");
    db.prepare("UPDATE yiyi_user_state SET owner_chat_json = '[]', updated_at = ?").run(now);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        db: DATA_DB_FILE,
        clearedBefore: before,
      },
      null,
      2,
    ),
  );
}

main();
