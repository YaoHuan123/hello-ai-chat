export type MomentsExploreRecord = {
  id: string;
  peerUserId: string;
  question: string;
  reply: string;
  ts: number;
};

/** 客户端在 AI 不可用或空回复时使用的兜底文案 */
export const MOMENTS_EXPLORE_FALLBACK_REPLY =
  "这块 TA 的日常里还没写过相关内容，你可以换个轻松的话题试试。";

export const MOMENTS_EXPLORE_ERROR_REPLY = "暂时没接上 AI，稍后再试。";

const NO_RESULT_EXACT = new Set([MOMENTS_EXPLORE_FALLBACK_REPLY, MOMENTS_EXPLORE_ERROR_REPLY]);

/** 无有效探索结果的分身回复（不展示在朋友圈时间线） */
export function isMeaningfulExploreReply(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (NO_RESULT_EXACT.has(t)) return false;
  if (t.length <= 52 && /(还没写过|尚未发布|没有相关|不太确定|资料里没|日常里没|暂无相关)/.test(t)) {
    return false;
  }
  return true;
}
