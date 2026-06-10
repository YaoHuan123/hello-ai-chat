import { Router, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { MolWorldService } from "../services/molWorld.service";
import { isPrivateMolId } from "../services/molWorld.service";
import type { UserMolsService } from "../services/userMols.service";

function mapMolWorldError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("mol_world.error", { code });
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "请求参数无效" });
    return true;
  }
  if (code === "INVALID_CATEGORY") {
    res.status(400).json({ code, message: "场景类型无效" });
    return true;
  }
  if (code === "NOT_FOUND") {
    res.status(404).json({ code, message: "未找到该 Mol" });
    return true;
  }
  if (code === "FORBIDDEN") {
    res.status(403).json({ code, message: "无权操作" });
    return true;
  }
  if (code === "MOL_UPLOAD_LIMIT_EXCEEDED") {
    res.status(429).json({ code, message: "上传数量已达上限" });
    return true;
  }
  return false;
}

function toCatalogItem(
  rec: import("../services/molWorld.service").MolWorldFile,
  userId: string,
  ownedIds: Set<string>,
): Record<string, unknown> {
  const uploaderIsMe = rec.uploader.userId === userId;
  return {
    id: rec.id,
    name: rec.name,
    summary: rec.summary,
    price: rec.price,
    owned: ownedIds.has(rec.id),
    primaryCategory: rec.primaryCategory,
    taskTags: rec.taskTags,
    toneTags: rec.toneTags,
    relationshipTags: rec.relationshipTags,
    abilityTags: rec.abilityTags,
    recommended: rec.recommended,
    popularityScore: rec.popularityScore,
    uploaderIsMe,
    uploaderUserId: rec.uploader.userId,
  };
}

export const createMolWorldRouter = (molWorld: MolWorldService, userMols: UserMolsService): Router => {
  const router = Router();

  router.get("/", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      const owned = new Set(userMols.listOwnedIds(user.userId).map((x) => x.molWorldId));
      const catalog = molWorld.listAllRaw().map((rec) => toCatalogItem(rec, user.userId, owned));
      res.status(200).json(catalog);
    } catch (error) {
      if (mapMolWorldError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取目录失败" });
    }
  });

  router.get("/:molWorldId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const id = String(req.params.molWorldId ?? "").trim();
    if (!id) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "参数无效" });
      return;
    }
    try {
      const rec = molWorld.getById(id);
      if (!rec || isPrivateMolId(id)) {
        res.status(404).json({ code: "NOT_FOUND", message: "未找到该 Mol" });
        return;
      }
      const owned = new Set(userMols.listOwnedIds(user.userId).map((x) => x.molWorldId));
      res.status(200).json(toCatalogItem(rec, user.userId, owned));
    } catch (error) {
      if (mapMolWorldError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "查询失败" });
    }
  });

  router.patch("/:molWorldId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const id = String(req.params.molWorldId ?? "").trim();
    if (!id) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "参数无效" });
      return;
    }
    try {
      const updated = molWorld.updateById(id, user.userId, req.body);
      res.status(200).json(updated);
    } catch (error) {
      if (mapMolWorldError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "更新失败" });
    }
  });

  router.delete("/:molWorldId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const id = String(req.params.molWorldId ?? "").trim();
    if (!id) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "参数无效" });
      return;
    }
    try {
      molWorld.deleteById(id, user.userId);
      res.status(200).json({ ok: true as const });
    } catch (error) {
      if (mapMolWorldError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "删除失败" });
    }
  });

  return router;
};
