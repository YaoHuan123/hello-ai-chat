import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { MolWorldFile } from "../services/molWorld.service";
import type { MolWorldService } from "../services/molWorld.service";
import type { UserMolsService } from "../services/userMols.service";

const importBodySchema = z.object({
  molWorldId: z.string().min(1).max(128),
});

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("mol_mine.error", { code, message: error.message });
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "请求参数无效" });
    return true;
  }
  if (code === "NOT_FOUND") {
    res.status(404).json({ code, message: "未找到该 Mol" });
    return true;
  }
  if (code === "ALREADY_OWNED") {
    res.status(409).json({ code, message: "已在你的列表中" });
    return true;
  }
  if (code === "NOT_OWNED") {
    res.status(404).json({ code, message: "未在列表中找到该 Mol" });
    return true;
  }
  return false;
}

function toCatalogItem(rec: MolWorldFile, userId: string, ownedIds: Set<string>): Record<string, unknown> {
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

function toMineItem(rec: MolWorldFile, source: string, userId: string): Record<string, unknown> {
  const uploaderIsMe = rec.uploader.userId === userId;
  return {
    id: rec.id,
    name: rec.name,
    summary: rec.summary,
    price: rec.price,
    owned: true,
    primaryCategory: rec.primaryCategory,
    taskTags: rec.taskTags,
    toneTags: rec.toneTags,
    relationshipTags: rec.relationshipTags,
    abilityTags: rec.abilityTags,
    recommended: rec.recommended,
    popularityScore: rec.popularityScore,
    source: source === "created" ? "created" : "store",
    uploaderIsMe,
    uploaderUserId: rec.uploader.userId,
  };
}

function normalizeInfoItems(items: MolWorldFile["infoItems"]): Array<Record<string, unknown>> {
  return items.map((it) => ({
    id: it.id,
    title: it.title,
    body: it.body,
    source: it.source ?? "custom",
    softRemoved: it.softRemoved,
  }));
}

export const createMyMolsRouter = (molWorld: MolWorldService, userMols: UserMolsService): Router => {
  const router = Router();

  router.get("/", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    try {
      const rows = userMols.listByOwnerWithMeta(user.userId);
      const list = rows.map(({ record, source }) => toMineItem(record, source, user.userId));
      res.status(200).json(list);
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取列表失败" });
    }
  });

  router.post("/import", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const parsed = importBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    try {
      userMols.importToMine(user.userId, parsed.data.molWorldId.trim());
      const owned = new Set(userMols.listOwnedIds(user.userId).map((x) => x.molWorldId));
      const catalog = molWorld.listAllRaw().map((rec) => toCatalogItem(rec, user.userId, owned));
      res.status(200).json(catalog);
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "操作失败" });
    }
  });

  router.get("/:molWorldId/detail", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const molWorldId = String(req.params.molWorldId ?? "").trim();
    if (!molWorldId) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "参数无效" });
      return;
    }
    try {
      const detail = userMols.getDetailForOwner(user.userId, molWorldId);
      if (!detail) {
        res.status(404).json({ code: "NOT_FOUND", message: "未找到该 Mol" });
        return;
      }
      const { record, source } = detail;
      const item = toMineItem(record, source, user.userId);
      res.status(200).json({ item, info: normalizeInfoItems(record.infoItems) });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "获取详情失败" });
    }
  });

  router.delete("/:molWorldId", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const molWorldId = String(req.params.molWorldId ?? "").trim();
    if (!molWorldId) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "参数无效" });
      return;
    }
    try {
      userMols.removeFromMine(user.userId, molWorldId);
      res.status(200).json({ ok: true as const });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "移除失败" });
    }
  });

  return router;
};
