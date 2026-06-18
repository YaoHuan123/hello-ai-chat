/** 清空本机所有聊天 localStorage（普通私聊、护场群、朋友圈探索、YiYi 对话/桥接）。 */

const CHAT_KEY_PREFIXES = ["aichat.chat.normal.", "aichat.guardian.group.", "aichat.moments.explore."] as const;

const CHAT_EXACT_KEYS = ["aichat.yiyi.chat", "aichat.yiyi.bridge"] as const;

export function clearAllLocalChatRecords(): number {
  let removed = 0;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  for (const key of keys) {
    const match =
      CHAT_KEY_PREFIXES.some((p) => key.startsWith(p)) || (CHAT_EXACT_KEYS as readonly string[]).includes(key);
    if (!match) continue;
    localStorage.removeItem(key);
    removed += 1;
  }
  return removed;
}
