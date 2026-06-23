import type { PassiveTopic } from "../types/passiveClone";

export const PASSIVE_HOT_TOPICS: PassiveTopic[] = [
  { id: "hot-1", question: "你更倾向先轻松聊还是先约见面？", hint: "用于推断交往节奏。" },
  { id: "hot-2", question: "遇到分歧时，你通常希望对方先做什么？", hint: "如先安抚情绪、先给台阶等。" },
  { id: "hot-3", question: "哪些话题你会希望朋友圈里更谨慎展示？", hint: "如感情状态、住址、收入等。" },
];

export const PASSIVE_EXCLUSIVE_TOPICS: PassiveTopic[] = [
  { id: "ex-1", question: "你理想的约会方式是什么？", hint: "来自访客了解记录（演示数据）。" },
  { id: "ex-2", question: "你更希望被怎样称呼？", hint: "来自访客了解记录（演示数据）。" },
];
