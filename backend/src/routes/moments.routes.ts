import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { MomentsService } from "../services/moments.service";

const itemSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["qa", "free"]),
  title: z.string().max(200),
  body: z.string().min(1).max(4000),
  ts: z.number(),
  sourceTopicId: z.string().max(64).optional(),
});

const putItemsSchema = z.object({
  items: z.array(itemSchema).max(80),
});

const historyItemSchema = z.object({
  from: z.enum(["explorer", "clone"]),
  text: z.string().min(1).max(2000),
  ts: z.number(),
});

const exploreReplySchema = z.object({
  peerUserId: z.string().min(1).max(64),
  text: z.string().min(1).max(2000),
  lastMessages: z.array(historyItemSchema).max(20).optional(),
});

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("moments.error", { code });
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "请求参数无效" });
    return true;
  }
  if (code === "NOT_FRIENDS") {
    res.status(403).json({ code, message: "双方尚未互为联系人" });
    return true;
  }
  if (code === "SELF") {
    res.status(400).json({ code, message: "不能探索自己" });
    return true;
  }
  if (code === "AI_NOT_CONFIGURED") {
    res.status(503).json({ code, message: "AI 服务未配置" });
    return true;
  }
  if (code === "AI_TIMEOUT") {
    res.status(504).json({ code, message: "AI 响应超时" });
    return true;
  }
  if (code === "AI_PROVIDER_ERROR" || code === "AI_PARSE_ERROR" || code === "AI_PROMPT_EMPTY") {
    res.status(502).json({ code, message: "AI 生成失败" });
    return true;
  }
  return false;
}

export const createMomentsRouter = (svc: MomentsService): Router => {
  const router = Router();

  router.get("/items", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      const items = svc.listMine(user.userId);
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.put("/items", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const parsed = putItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const items = svc.replaceMine(user.userId, parsed.data.items);
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "保存失败" });
    }
  });

  router.get("/users/:userId/items", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const ownerId = String(req.params.userId ?? "").trim();
    try {
      const items = svc.listForFriend(user.userId, ownerId);
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.post("/explore/reply", authMiddleware, async (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const parsed = exploreReplySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const result = await svc.exploreReply(
        user.userId,
        parsed.data.peerUserId.trim(),
        parsed.data.text,
        parsed.data.lastMessages,
      );
      res.status(200).json(result);
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "生成失败" });
    }
  });

  return router;
};
