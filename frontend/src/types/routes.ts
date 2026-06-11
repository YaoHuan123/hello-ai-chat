/**
 * 全应用路由名：与 App 内 `useState<RouteName>` 一一对应（无 react-router）。
 * 阶段 0 只实现 home + 各页占位，后续按阶段补全。
 */
export type RouteName =
  | "main"
  | "chat-room"
  | "home"
  | "delete-account"
  | "contacts"
  | "chat-assist"
  | "assist-mol-list"
  | "assist-mol-data"
  | "moments-my"
  | "moments-hot"
  | "moments-friend"
  | "mol-world"
  | "mol-mine"
  | "mol-detail"
  | "friend-requests"
  | "guardian-hall"
  | "guardian-role-detail"
  | "guardian-create-feature"
  | "guardian-create-group"
  | "guardian-group-chat";

export const ROUTE_LABEL: Record<RouteName, { title: string; phase: string }> = {
  main: { title: "主页", phase: "主导航" },
  "chat-room": { title: "会话", phase: "消息" },
  home: { title: "主导航", phase: "阶段 1" },
  "delete-account": { title: "注销账号", phase: "账号" },
  contacts: { title: "联系人", phase: "通讯" },
  "chat-assist": { title: "辅助聊天 + 素颜", phase: "阶段 2" },
  "assist-mol-list": { title: "我的素颜", phase: "AI" },
  "assist-mol-data": { title: "素颜资料", phase: "AI" },
  "moments-my": { title: "我的动态", phase: "朋友圈" },
  "moments-hot": { title: "热点", phase: "朋友圈" },
  "moments-friend": { title: "朋友圈探索", phase: "朋友圈" },
  "mol-world": { title: "素颜世界", phase: "阶段 5" },
  "mol-mine": { title: "我的素颜", phase: "阶段 5" },
  "mol-detail": { title: "素颜信息管理", phase: "阶段 5" },
  "friend-requests": { title: "好友请求", phase: "通讯" },
  "guardian-hall": { title: "搭子", phase: "群聊" },
  "guardian-role-detail": { title: "搭子详情", phase: "群聊" },
  "guardian-create-feature": { title: "选择用途", phase: "群聊" },
  "guardian-create-group": { title: "发起群聊", phase: "群聊" },
  "guardian-group-chat": { title: "群聊", phase: "群聊" },
};

/** 主导航可点的全部功能入口（已实现的会走真实页，未实现的走 Placeholder） */
export const HOME_ENTRY_ROUTES: RouteName[] = [
  "chat-assist",
  "contacts",
  "mol-world",
  "mol-mine",
  "delete-account",
];

/** 仍为占位、尚未做真实页面的路由 */
export const PLACEHOLDER_ROUTES: RouteName[] = [];
