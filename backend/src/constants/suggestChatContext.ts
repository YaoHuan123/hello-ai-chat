export type SuggestChatLine = { from: "me" | "peer"; text: string; ts: number };

/** 建议回复 LLM 上下文：对方最近条数 */
export const SUGGEST_CONTEXT_PEER_LIMIT = 3;
/** 建议回复 LLM 上下文：本人最近条数 */
export const SUGGEST_CONTEXT_SELF_LIMIT = 3;

/** 从完整聊天记录中选取 LLM 上下文：对方最近 3 条 + 本人最近 3 条，按时间升序。 */
export function pickSuggestChatContext(messages: SuggestChatLine[]): SuggestChatLine[] {
  if (messages.length === 0) return [];
  const sorted = [...messages].sort((a, b) => a.ts - b.ts);
  const peer = sorted.filter((m) => m.from === "peer").slice(-SUGGEST_CONTEXT_PEER_LIMIT);
  const me = sorted.filter((m) => m.from === "me").slice(-SUGGEST_CONTEXT_SELF_LIMIT);
  return [...peer, ...me].sort((a, b) => a.ts - b.ts);
}
