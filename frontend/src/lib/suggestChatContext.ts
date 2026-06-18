import type { MolSuggestLastMessage } from "../services/molSuggestApi";

const PEER_LIMIT = 3;
const SELF_LIMIT = 3;

/** 建议回复 LLM 上下文：对方最近 3 条 + 本人最近 3 条，按时间升序。 */
export function pickSuggestChatContext(messages: MolSuggestLastMessage[]): MolSuggestLastMessage[] {
  if (messages.length === 0) return [];
  const sorted = [...messages].sort((a, b) => a.ts - b.ts);
  const peer = sorted.filter((m) => m.from === "peer").slice(-PEER_LIMIT);
  const me = sorted.filter((m) => m.from === "me").slice(-SELF_LIMIT);
  return [...peer, ...me].sort((a, b) => a.ts - b.ts);
}
