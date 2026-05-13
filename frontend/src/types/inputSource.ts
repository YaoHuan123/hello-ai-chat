/**
 * 输入框内容来源：自输入可润色；`quick` 为 Mol 在上下文中推好的成稿/润色结果（不视为本人键入）。
 * 已移除 `guide`：多步点态度由「根据上下文默认意向 + 成稿」替代。
 */
export type ChatInputSource = "empty" | "user" | "quick";