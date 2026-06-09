import type { IncomingMessage, Server } from "node:http";
import type { Socket } from "node:net";
import type { DatabaseSync } from "node:sqlite";
import jwt from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";
import { JWT_SECRET } from "../config";
import { logWarn } from "../logger";
import type { JwtPayload } from "../types";

const userSockets = new Map<string, Set<WebSocket>>();

export function pushToUser(userId: string, payload: unknown): void {
  const set = userSockets.get(userId);
  if (!set || set.size === 0) return;
  const raw = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

export function attachWs(server: Server, db: DatabaseSync): void {
  const tokenVersionLookup = db.prepare("SELECT token_version FROM users WHERE id = ?");
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      const host = req.headers.host ?? "localhost";
      const url = new URL(req.url ?? "/", `http://${host}`);
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      const token = url.searchParams.get("token")?.trim() ?? "";
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }

      const row = tokenVersionLookup.get(payload.userId) as { token_version?: number } | undefined;
      if (!row || typeof payload.tv !== "number" || payload.tv !== row.token_version) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        const userId = payload.userId;
        let set = userSockets.get(userId);
        if (!set) {
          set = new Set();
          userSockets.set(userId, set);
        }
        set.add(ws);

        ws.send(JSON.stringify({ type: "hello", payload: { userId } }));

        const pingIv = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        }, 30_000);

        ws.on("close", () => {
          clearInterval(pingIv);
          set!.delete(ws);
          if (set!.size === 0) {
            userSockets.delete(userId);
          }
        });

        ws.on("error", (err) => {
          logWarn("ws.socket_error", { userId, message: err.message });
        });

        ws.on("message", (data) => {
          try {
            const o = JSON.parse(data.toString()) as { type?: string };
            if (o.type === "pong") {
              /* no-op */
            }
          } catch {
            /* ignore non-JSON */
          }
        });
      });
    } catch (e) {
      logWarn("ws.upgrade_error", { message: e instanceof Error ? e.message : String(e) });
      socket.destroy();
    }
  });
}
