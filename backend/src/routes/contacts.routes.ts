import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import { RELATION_TYPES } from "../constants/relationTypes";
import type { ContactsService } from "../services/contacts.service";

const patchBodySchema = z
  .object({
    remark: z.union([z.string().max(64), z.null()]).optional(),
    relationType: z.union([z.enum(RELATION_TYPES), z.null()]).optional(),
    defaultMolId: z.union([z.string().min(1).max(64), z.null()]).optional(),
  })
  .refine((v) => v.remark !== undefined || v.relationType !== undefined || v.defaultMolId !== undefined, {
    message: "至少提供一项更新字段",
  });

function mapContactsError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  logWarn("contacts.error", {
    name: error.name,
    message: error.message,
    stack: error.stack?.split("\n").slice(0, 6).join("\n"),
  });

  const code = error.message;
  if (code === "INVALID_PHONE") {
    res.status(400).json({ code, message: "请输入有效的中国大陆手机号" });
    return true;
  }
  if (code === "CONTACT_SELF") {
    res.status(400).json({ code, message: "不能将自己加为联系人" });
    return true;
  }
  if (code === "CONTACT_USER_NOT_FOUND") {
    res.status(404).json({ code, message: "该手机号未注册" });
    return true;
  }
  if (code === "CONTACT_ALREADY_ADDED") {
    res.status(409).json({ code, message: "已在联系人列表" });
    return true;
  }
  if (code === "CONTACT_NOT_FOUND") {
    res.status(404).json({ code, message: "未找到该联系人" });
    return true;
  }
  if (code === "CONTACT_CREATE_FAILED") {
    res.status(500).json({ code, message: "添加联系人失败" });
    return true;
  }
  if (code === "INVALID_RELATION") {
    res.status(400).json({ code, message: "关系类型无效" });
    return true;
  }
  return false;
}

export const createContactsRouter = (contactsService: ContactsService): Router => {
  const router = Router();

  router.get("/", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      const items = contactsService.list(user.userId);
      res.status(200).json({ items });
    } catch (error) {
      if (mapContactsError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取联系人失败" });
    }
  });

  router.delete("/:contactUserId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const contactUserId = String(req.params.contactUserId ?? "").trim();
    if (!contactUserId || contactUserId.length > 32) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "联系人无效" });
      return;
    }
    try {
      contactsService.remove(user.userId, contactUserId);
      res.status(200).json({ ok: true as const });
    } catch (error) {
      if (mapContactsError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "删除联系人失败" });
    }
  });

  router.patch("/:contactUserId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const contactUserId = String(req.params.contactUserId ?? "").trim();
    if (!contactUserId || contactUserId.length > 32) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "联系人无效" });
      return;
    }
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      const contact = contactsService.patch(user.userId, contactUserId, parsed.data);
      res.status(200).json({ contact });
    } catch (error) {
      if (mapContactsError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "更新联系人失败" });
    }
  });

  return router;
};
