import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { MessagesService } from "../services/messages.service";
import { pushToUser } from "../ws/wsServer";

const postBodySchema = z.object({
  toUserId: z.string().min(1).max(64),
  text: z.string().min(1).max(4000),
});

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("messages.error", { code });
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "消息内容无效" });
    return true;
  }
  if (code === "SELF") {
    res.status(400).json({ code, message: "不能给自己发消息" });
    return true;
  }
  if (code === "NOT_FRIENDS") {
    res.status(403).json({ code, message: "双方尚未互为联系人" });
    return true;
  }
  if (code === "INTERNAL_ERROR") {
    res.status(500).json({ code, message: "发送失败" });
    return true;
  }
  return false;
}

export const createMessagesRouter = (svc: MessagesService): Router => {
  const router = Router();

  router.get("/conversations", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      const items = svc.listConversations(user.userId);
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.get("/", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const peerUserId = String(req.query.peerUserId ?? "").trim();
    if (!peerUserId) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "缺少 peerUserId" });
      return;
    }
    const beforeRaw = req.query.beforeId;
    const beforeId =
      beforeRaw === undefined || beforeRaw === "" ? undefined : Number.parseInt(String(beforeRaw), 10);
    const limitRaw = req.query.limit;
    const limit = limitRaw === undefined ? undefined : Number.parseInt(String(limitRaw), 10);
    try {
      const items = svc.listWithPeer(
        user.userId,
        peerUserId,
        beforeId !== undefined && Number.isFinite(beforeId) ? beforeId : undefined,
        limit,
      );
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.post("/", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const parsed = postBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    const toId = parsed.data.toUserId.trim();
    try {
      const msg = svc.relay(user.userId, toId, parsed.data.text);
      svc.pushToPeer(msg);
      res.status(200).json({ message: msg });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "发送失败" });
    }
  });

  return router;
};
