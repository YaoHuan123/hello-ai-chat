import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import { RELATION_TYPES } from "../constants/relationTypes";
import type { FriendRequestsService } from "../services/friendRequests.service";
import { pushToUser } from "../ws/wsServer";

const createBodySchema = z.object({
  phone: z.string().min(1).max(32),
  message: z.string().max(200).optional(),
});

const acceptBodySchema = z.object({
  relationType: z.enum(RELATION_TYPES),
});

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone;
}

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("friend_requests.error", { code });
  if (code === "INVALID_PHONE") {
    res.status(400).json({ code, message: "请输入有效的中国大陆手机号" });
    return true;
  }
  if (code === "SELF") {
    res.status(400).json({ code, message: "不能向自己发送申请" });
    return true;
  }
  if (code === "NOT_FOUND") {
    res.status(404).json({ code, message: "该手机号未注册" });
    return true;
  }
  if (code === "ALREADY_FRIENDS") {
    res.status(409).json({ code, message: "双方已是联系人" });
    return true;
  }
  if (code === "DUPLICATE_PENDING") {
    res.status(409).json({ code, message: "已存在待处理的申请" });
    return true;
  }
  if (code === "FORBIDDEN") {
    res.status(403).json({ code, message: "无权操作" });
    return true;
  }
  if (code === "INVALID_STATE") {
    res.status(409).json({ code, message: "申请状态已变更" });
    return true;
  }
  if (code === "INTERNAL_ERROR") {
    res.status(500).json({ code, message: "操作失败" });
    return true;
  }
  if (code === "INVALID_RELATION") {
    res.status(400).json({ code, message: "请选择关系类型" });
    return true;
  }
  return false;
}

export const createFriendRequestsRouter = (svc: FriendRequestsService): Router => {
  const router = Router();

  router.get("/pending-count", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      res.status(200).json({ count: svc.countPendingInbox(user.userId) });
    } catch {
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.get("/", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const box = String(req.query.box ?? "inbox").trim();
    try {
      if (box === "inbox") {
        const items = svc.listInbox(user.userId);
        res.status(200).json({ items, pendingCount: svc.countPendingInbox(user.userId) });
        return;
      }
      if (box === "outbox") {
        const items = svc.listOutbox(user.userId);
        res.status(200).json({ items, pendingCount: svc.countPendingInbox(user.userId) });
        return;
      }
      res.status(400).json({ code: "INVALID_PARAMS", message: "box 须为 inbox 或 outbox" });
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
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const item = svc.create(user.userId, user.phone, parsed.data.phone, parsed.data.message);
      pushToUser(item.toUserId, {
        type: "friend_request_received",
        payload: {
          id: item.id,
          fromUserId: item.fromUserId,
          fromPhone: maskPhone(item.fromPhone),
          message: item.message,
          createdAt: item.createdAt,
        },
      });
      res.status(200).json({ request: item });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "发送失败" });
    }
  });

  router.post("/:requestId/accept", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const rid = Number.parseInt(String(req.params.requestId ?? ""), 10);
    if (!Number.isFinite(rid) || rid < 1) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "申请无效" });
      return;
    }
    const parsed = acceptBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "请选择关系类型" });
      return;
    }
    try {
      const { request, contactForRequester } = svc.accept(rid, user.userId, parsed.data.relationType);
      const fromRow = svc.getById(rid);
      const fromUserId = fromRow?.fromUserId;
      if (fromUserId) {
        pushToUser(fromUserId, {
          type: "friend_request_accepted",
          payload: {
            requestId: rid,
            contactUserId: contactForRequester.contactUserId,
            contactPhone: contactForRequester.phone,
          },
        });
      }
      res.status(200).json({ request });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "操作失败" });
    }
  });

  router.post("/:requestId/reject", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const rid = Number.parseInt(String(req.params.requestId ?? ""), 10);
    if (!Number.isFinite(rid) || rid < 1) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "申请无效" });
      return;
    }
    try {
      const request = svc.reject(rid, user.userId);
      res.status(200).json({ request });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "操作失败" });
    }
  });

  router.delete("/:requestId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const rid = Number.parseInt(String(req.params.requestId ?? ""), 10);
    if (!Number.isFinite(rid) || rid < 1) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "申请无效" });
      return;
    }
    try {
      svc.cancel(rid, user.userId);
      res.status(200).json({ ok: true as const });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "操作失败" });
    }
  });

  return router;
};
