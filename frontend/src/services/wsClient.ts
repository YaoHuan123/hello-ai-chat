import { API_BASE } from "./api";
import { getAuthToken } from "./storage";

export type WsServerMessage =
  | { type: "hello"; payload: { userId: string } }
  | { type: "message"; payload: { id: number; fromUserId: string; toUserId: string; text: string; ts: number } }
  | {
      type: "friend_request_received";
      payload: { id: number; fromUserId: string; fromPhone: string; message: string | null; createdAt: number };
    }
  | { type: "friend_request_accepted"; payload: { requestId: number; contactUserId: string; contactPhone: string } }
  | {
      type: "guardian_group_message";
      payload: { groupId: string; message: { id: number; groupId: string; senderKind: string; text: string; ts: number } };
    }
  | {
      type: "guardian_owner_hint";
      payload: {
        groupId: string;
        hint: { peerMessageId: number; level: string; label: string; hint: string; ts: number };
      };
    };

type Handler = (msg: WsServerMessage) => void;

let socket: WebSocket | null = null;
let handlers: Handler[] = [];
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wantOpen = false;
let activeToken = "";

function wsUrl(token: string): string {
  const base = API_BASE.replace(/\/$/, "");
  const u = base.startsWith("https") ? base.replace(/^https/, "wss") : base.replace(/^http/, "ws");
  return `${u}/ws?token=${encodeURIComponent(token)}`;
}

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(): void {
  if (!wantOpen) return;
  const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const t = activeToken.trim() || getAuthToken().trim();
    if (!t || !wantOpen) return;
    openSocket(t);
  }, delay);
}

function openSocket(token: string): void {
  clearReconnectTimer();
  activeToken = token;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  try {
    socket = new WebSocket(wsUrl(token));
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    reconnectAttempt = 0;
  });

  socket.addEventListener("message", (ev) => {
    try {
      const raw = String(ev.data ?? "");
      const msg = JSON.parse(raw) as WsServerMessage;
      if (!msg || typeof msg !== "object" || typeof (msg as WsServerMessage).type !== "string") return;
      for (const h of handlers) {
        h(msg as WsServerMessage);
      }
    } catch {
      /* ignore */
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    if (wantOpen) scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export const wsClient = {
  connect(token?: string): void {
    const t = (token ?? getAuthToken()).trim();
    if (!t) return;
    wantOpen = true;
    activeToken = t;
    reconnectAttempt = 0;
    openSocket(t);
  },

  disconnect(): void {
    wantOpen = false;
    clearReconnectTimer();
    reconnectAttempt = 0;
    if (socket) {
      socket.close();
      socket = null;
    }
  },

  subscribe(handler: Handler): () => void {
    handlers.push(handler);
    return () => {
      handlers = handlers.filter((h) => h !== handler);
    };
  },

  /** 切换 token 后重连 */
  reconnectWithToken(token: string): void {
    if (!token.trim()) return;
    activeToken = token.trim();
    if (socket) {
      socket.close();
      socket = null;
    }
    if (wantOpen) {
      reconnectAttempt = 0;
      openSocket(activeToken);
    }
  },
};
