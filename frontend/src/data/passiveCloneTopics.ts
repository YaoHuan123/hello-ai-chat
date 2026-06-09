import type { PassiveTopic } from "../types/passiveClone";

export const PASSIVE_HOT_TOPICS: PassiveTopic[] = [
  { id: "hot-1", question: "你更倾向先听结论还是先听过程？", hint: "用于推断表达偏好。" },
  { id: "hot-2", question: "遇到分歧时，你通常希望对方先做什么？", hint: "如先复述你的立场、先给选项等。" },
  { id: "hot-3", question: "哪些话题你会希望朋友圈更谨慎展示？", hint: "如薪酬、健康、家庭等。" },
];

export const PASSIVE_EXCLUSIVE_TOPICS: PassiveTopic[] = [
  { id: "ex-1", question: "你默认的工作节奏是怎样的？", hint: "来自访客探索记录（演示数据）。" },
  { id: "ex-2", question: "你更希望被怎样称呼？", hint: "来自访客探索记录（演示数据）。" },
];
