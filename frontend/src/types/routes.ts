/**
 * 全应用路由名：与 App 内 `useState<RouteName>` 一一对应（无 react-router）。
 * 阶段 0 只实现 home + 各页占位，后续按阶段补全。
 */
export type RouteName =
  | "home"
  | "delete-account"
  | "chat-assist"
  | "oneway-visitor"
  | "feed-oneway-agent"
  | "oneway-data-board"
  | "mol-world"
  | "mol-mine"
  | "mol-detail";

export const ROUTE_LABEL: Record<RouteName, { title: string; phase: string }> = {
  home: { title: "主导航", phase: "阶段 1" },
  "delete-account": { title: "注销账号", phase: "账号" },
  "chat-assist": { title: "辅助聊天 + Mol", phase: "阶段 2" },
  "oneway-visitor": { title: "单向 · 他人与我的智能体", phase: "阶段 3" },
  "feed-oneway-agent": { title: "喂养 · 单向智能体", phase: "阶段 4" },
  "oneway-data-board": { title: "单向体 · 内部数据", phase: "阶段 4" },
  "mol-world": { title: "Mol 世界", phase: "阶段 5" },
  "mol-mine": { title: "我的 Mol", phase: "阶段 5" },
  "mol-detail": { title: "Mol 信息管理", phase: "阶段 5" },
};

/** 主导航可点的全部功能入口（已实现的会走真实页，未实现的走 Placeholder） */
export const HOME_ENTRY_ROUTES: RouteName[] = [
  "chat-assist",
  "oneway-visitor",
  "feed-oneway-agent",
  "oneway-data-board",
  "mol-world",
  "mol-mine",
  "delete-account",
];

/** 仍为占位、尚未做真实页面的路由 */
export const PLACEHOLDER_ROUTES: RouteName[] = [];
