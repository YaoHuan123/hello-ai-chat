/** 豆包 / Seed 等 hybrid 模型：统一关闭深度思考，避免 reasoning_tokens 拖慢响应。 */

export function isDoubaoCompatibleModel(model: string): boolean {
  return /doubao|seed/i.test(model);
}

export function disableDoubaoThinking(body: Record<string, unknown>): void {
  const model = typeof body.model === "string" ? body.model : "";
  if (!isDoubaoCompatibleModel(model)) return;
  body.thinking = { type: "disabled" };
}
