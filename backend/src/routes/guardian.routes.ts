import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { GuardianScene } from "../constants/guardianCatalog";
import { GUARDIAN_SCENES } from "../constants/guardianCatalog";
import type { GuardianGroupsService } from "../services/guardianGroups.service";
import { pushToUser } from "../ws/wsServer";

const createBodySchema = z.object({
  name: z.string().max(32).optional(),
  memberUserIds: z.array(z.string().min(1).max(64)).min(1).max(19),
  scene: z.enum(GUARDIAN_SCENES as [GuardianScene, ...GuardianScene[]]),
  guardianRoleIds: z.array(z.string().min(1)).min(1).max(3),
});

const historyItemSchema = z.object({
  id: z.number(),
  senderKind: z.enum(["owner", "peer", "guardian"]),
  fromUserId: z.string().nullable().optional(),
  guardianRoleId: z.string().nullable().optional(),
  text: z.string().min(1).max(4000),
  ts: z.number(),
});

const addMembersBodySchema = z.object({
  memberUserIds: z.array(z.string().min(1).max(64)).min(1).max(19),
});

const patchGroupBodySchema = z.object({
  name: z.string().max(32),
});

const sendBodySchema = z.object({
  text: z.string().min(1).max(4000),
  /** 客户端本地群聊摘录，供搭子判断；服务端不存聊天内容。 */
  lastMessages: z.array(historyItemSchema).max(80).optional(),
});

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("guardian.error", { code });
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "请求参数无效" });
    return true;
  }
  if (code === "INVALID_GUARDIANS") {
    res.status(400).json({ code, message: "搭子无效或与场景不匹配" });
    return true;
  }
  if (code === "NOT_FRIENDS") {
    res.status(403).json({ code, message: "所选成员须为互为联系人" });
    return true;
  }
  if (code === "TOO_MANY_MEMBERS") {
    res.status(400).json({ code, message: "群成员最多 20 人（含自己）" });
    return true;
  }
  if (code === "ALREADY_MEMBER") {
    res.status(400).json({ code, message: "成员已在群中" });
    return true;
  }
  if (code === "CANNOT_REMOVE_OWNER") {
    res.status(400).json({ code, message: "不能移除群主" });
    return true;
  }
  if (code === "NOT_IN_GROUP") {
    res.status(400).json({ code, message: "该用户不在群内" });
    return true;
  }
  if (code === "MIN_MEMBERS") {
    res.status(400).json({ code, message: "群聊至少保留 1 位其他成员" });
    return true;
  }
  if (code === "NOT_FOUND") {
    res.status(404).json({ code, message: "群不存在或无权访问" });
    return true;
  }
  if (code === "FORBIDDEN") {
    res.status(403).json({ code, message: "无权操作" });
    return true;
  }
  return false;
}

function pushGroupMessage(groupId: string, message: unknown, userIds: string[]): void {
  const payload = { type: "guardian_group_message", payload: { groupId, message } };
  for (const uid of userIds) {
    pushToUser(uid, payload);
  }
}

const GUARDIAN_SPEAKING_MS = 450;

function pushGroupSpeaking(groupId: string, roleId: string, userIds: string[]): void {
  const payload = { type: "guardian_speaking", payload: { groupId, roleId } };
  for (const uid of userIds) {
    pushToUser(uid, payload);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pushGroupUpdated(groupId: string, group: unknown, userIds: string[]): void {
  const payload = { type: "guardian_group_updated", payload: { groupId, group } };
  for (const uid of userIds) {
    pushToUser(uid, payload);
  }
}

export const createGuardianRouter = (svc: GuardianGroupsService): Router => {
  const router = Router();

  router.get("/roles", authMiddleware, (req, res) => {
    const sceneRaw = String(req.query.scene ?? "").trim();
    const scene = GUARDIAN_SCENES.includes(sceneRaw as GuardianScene) ? (sceneRaw as GuardianScene) : undefined;
    res.status(200).json({ items: svc.listRoles(scene) });
  });

  router.get("/groups", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      res.status(200).json({ items: svc.listForUser(user.userId) });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.post("/groups", authMiddleware, (req, res) => {
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
      const group = svc.create(user.userId, {
        name: parsed.data.name,
        memberUserIds: parsed.data.memberUserIds,
        scene: parsed.data.scene,
        guardianRoleIds: parsed.data.guardianRoleIds,
      });
      res.status(200).json({ group });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "创建失败" });
    }
  });

  router.get("/groups/:groupId/messages", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    try {
      const items = svc.listMessages(groupId, user.userId);
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.post("/groups/:groupId/messages", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    const parsed = sendBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const message = svc.sendHuman(groupId, user.userId, parsed.data.text);
      const members = svc.memberUserIds(groupId);
      pushGroupMessage(groupId, message, members);

      void (async () => {
        try {
          const hist = (parsed.data.lastMessages ?? []).map((m) => ({
            id: m.id,
            groupId,
            senderKind: m.senderKind,
            fromUserId: m.fromUserId ?? null,
            guardianRoleId: m.guardianRoleId ?? null,
            text: m.text,
            ts: m.ts,
          }));
          const { guardianMessages, ownerHint } = await svc.maybeGuardianReplies(groupId, message, hist);
          if (ownerHint) {
            const ownerId = svc.getOwnerUserId(groupId);
            if (ownerId) {
              pushToUser(ownerId, {
                type: "guardian_owner_hint",
                payload: { groupId, hint: ownerHint },
              });
            }
          }
          for (const gm of guardianMessages) {
            const roleId = gm.guardianRoleId?.trim();
            if (roleId) {
              pushGroupSpeaking(groupId, roleId, members);
              await sleep(GUARDIAN_SPEAKING_MS);
            }
            pushGroupMessage(groupId, gm, members);
          }
        } catch {
          /* ignore proactive errors */
        }
      })();

      res.status(200).json({ message });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "发送失败" });
    }
  });

  router.get("/groups/:groupId/owner-hints", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    try {
      const items = svc.listOwnerHints(groupId, user.userId);
      res.status(200).json({ items });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取失败" });
    }
  });

  router.get("/groups/:groupId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    const group = svc.getById(groupId, user.userId);
    if (!group) {
      res.status(404).json({ code: "NOT_FOUND", message: "群不存在" });
      return;
    }
    res.status(200).json({ group });
  });

  router.patch("/groups/:groupId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    const parsed = patchGroupBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const group = svc.updateName(groupId, user.userId, parsed.data.name);
      const members = svc.memberUserIds(groupId);
      pushGroupUpdated(groupId, group, members);
      res.status(200).json({ group });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "更新失败" });
    }
  });

  router.post("/groups/:groupId/members", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    const parsed = addMembersBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const group = svc.addMembers(groupId, user.userId, parsed.data.memberUserIds);
      const members = svc.memberUserIds(groupId);
      pushGroupUpdated(groupId, group, members);
      res.status(200).json({ group });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "添加失败" });
    }
  });

  router.delete("/groups/:groupId/members/:userId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const groupId = String(req.params.groupId ?? "").trim();
    const targetUserId = String(req.params.userId ?? "").trim();
    try {
      const group = svc.removeMember(groupId, user.userId, targetUserId);
      const members = svc.memberUserIds(groupId);
      pushGroupUpdated(groupId, group, members);
      res.status(200).json({ group });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "移除失败" });
    }
  });

  return router;
};
