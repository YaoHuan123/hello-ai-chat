import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { YiyiService } from "../services/yiyi.service";
import type { YiyiTrashItem } from "../types/yiyi";

const trashItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  hint: z.string().max(120).optional(),
  enabled: z.boolean(),
  isCustom: z.boolean(),
});

const putTrashSchema = z.object({
  items: z.array(trashItemSchema).max(30),
});

const putPermissionsSchema = z.object({
  allowAddFriend: z.boolean().optional(),
  yiyiActive: z.boolean().optional(),
});

const chatSchema = z.object({
  text: z.string().min(1).max(500),
});

const pickTopicSchema = z.object({
  topic: z.string().min(1).max(120),
  sourceMessageId: z.string().min(1).max(64).optional(),
});

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("yiyi.error", { code });
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "请求参数无效" });
    return true;
  }
  if (code === "NOT_FOUND") {
    res.status(404).json({ code, message: "记录不存在" });
    return true;
  }
  if (code === "FORBIDDEN") {
    res.status(403).json({ code, message: "无权访问" });
    return true;
  }
  if (code === "AI_NOT_CONFIGURED") {
    res.status(503).json({ code, message: "AI 服务未配置" });
    return true;
  }
  if (code === "YIYI_INACTIVE") {
    res.status(409).json({ code, message: "YiYi 对外活跃已关闭" });
    return true;
  }
  if (code === "PROFILE_NOT_READY") {
    res.status(409).json({ code, message: "请先与 YiYi 多聊几句，完善画像后再匹配" });
    return true;
  }
  if (code === "NO_CANDIDATE") {
    res.status(404).json({ code, message: "暂无可匹配的 YiYi" });
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

export const createYiyiRouter = (svc: YiyiService): Router => {
  const router = Router();

  router.get("/state", authMiddleware, (req, res) => {
    const user = req.user!;
    const state = svc.getState(user.userId);
    res.status(200).json(state);
  });

  router.put("/trash", authMiddleware, (req, res) => {
    const parsed = putTrashSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    const state = svc.updateTrash(req.user!.userId, parsed.data.items as YiyiTrashItem[]);
    res.status(200).json({ trash: state.trash });
  });

  router.put("/permissions", authMiddleware, (req, res) => {
    const parsed = putPermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    const state = svc.updatePermissions(req.user!.userId, parsed.data);
    res.status(200).json({ permissions: state.permissions });
  });

  router.post("/chat", authMiddleware, async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const result = await svc.sendOwnerChat(req.user!.userId, parsed.data.text);
      res.status(200).json(result);
    } catch (error) {
      if (mapError(res, error)) return;
      throw error;
    }
  });

  router.post("/chat/topics", authMiddleware, async (req, res) => {
    try {
      const result = await svc.refreshTopics(req.user!.userId);
      res.status(200).json(result);
    } catch (error) {
      if (mapError(res, error)) return;
      throw error;
    }
  });

  router.post("/chat/pick-topic", authMiddleware, (req, res) => {
    const parsed = pickTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const result = svc.pickTopic(req.user!.userId, parsed.data.topic, parsed.data.sourceMessageId);
      res.status(200).json(result);
    } catch (error) {
      if (mapError(res, error)) return;
      throw error;
    }
  });

  router.get("/bridges", authMiddleware, (req, res) => {
    const bridges = svc.listBridges(req.user!.userId);
    res.status(200).json({ bridges });
  });

  router.get("/bridges/:id", authMiddleware, (req, res) => {
    const sessionId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    try {
      const bridge = svc.getBridge(req.user!.userId, sessionId);
      res.status(200).json({ bridge });
    } catch (error) {
      if (mapError(res, error)) return;
      throw error;
    }
  });

  router.post("/match", authMiddleware, async (req, res) => {
    try {
      const bridge = await svc.runMatch(req.user!.userId);
      res.status(200).json({ bridge });
    } catch (error) {
      if (mapError(res, error)) return;
      throw error;
    }
  });

  return router;
};
