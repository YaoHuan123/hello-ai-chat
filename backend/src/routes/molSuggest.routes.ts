import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import { pickSuggestChatContext } from "../constants/suggestChatContext";
import type { AiReplyService, SuggestLastMessage } from "../services/aiReply.service";
import type { ContactsService } from "../services/contacts.service";
import type { UserMolsService } from "../services/userMols.service";

const bodySchema = z.object({
  peerUserId: z.string().min(1),
  molId: z.string().min(1).optional(),
  userDraft: z.string().max(500).optional(),
  lastMessages: z
    .array(
      z.object({
        from: z.enum(["me", "peer"]),
        text: z.string().min(1).max(2000),
        ts: z.number(),
      }),
    )
    .max(20)
    .optional(),
});

function appendMolPersonaLines(lines: string[], record: { name: string; summary: string; infoItems: { title: string; body: string; softRemoved?: boolean }[] }): void {
  const items = record.infoItems.filter((it) => !it.softRemoved);
  let addedItem = false;
  for (const it of items) {
    const title = it.title.trim();
    const body = it.body.trim();
    if (!title || !body || title === "示例") continue;
    lines.push(`[${record.name}] ${title}: ${body}`);
    addedItem = true;
  }
  if (addedItem) return;
  const summary = record.summary.trim();
  if (summary) {
    lines.push(`[${record.name}] 简介: ${summary}`);
    return;
  }
  const name = record.name.trim();
  if (name) lines.push(`[${name}]`);
}

function buildPersonaBlock(userMols: UserMolsService, ownerUserId: string, molId?: string): string {
  const owned = molId
    ? (() => {
        const detail = userMols.getDetailForOwner(ownerUserId, molId);
        return detail ? [{ record: detail.record, source: detail.source }] : [];
      })()
    : userMols.listByOwnerWithMeta(ownerUserId);
  const lines: string[] = [];
  for (const { record } of owned) {
    appendMolPersonaLines(lines, record);
  }
  return lines.join("\n");
}

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("mol_suggest.error", { code });
  if (code === "NOT_FRIENDS") {
    res.status(403).json({ code, message: "双方不是联系人，无法生成建议" });
    return true;
  }
  if (code === "AI_NOT_CONFIGURED") {
    res.status(503).json({ code, message: "AI 服务未配置" });
    return true;
  }
  if (code === "NO_USER_MOLS") {
    res.status(409).json({ code, message: "尚未添加素颜，无法生成建议" });
    return true;
  }
  if (code === "INVALID_PARAMS") {
    res.status(400).json({ code, message: "请求参数无效" });
    return true;
  }
  if (code === "AI_PROVIDER_ERROR") {
    res.status(502).json({ code, message: "AI 服务暂不可用" });
    return true;
  }
  if (code === "AI_PARSE_ERROR") {
    res.status(502).json({ code, message: "生成结果格式异常" });
    return true;
  }
  if (code === "AI_PROMPT_EMPTY") {
    res.status(500).json({ code, message: "提示词文件为空或无效，请检查数据目录下 prompts 内模板" });
    return true;
  }
  if (code === "AI_TIMEOUT") {
    res.status(504).json({ code, message: "AI 请求超时" });
    return true;
  }
  return false;
}

export const createMolSuggestRouter = (
  aiReply: AiReplyService,
  contacts: ContactsService,
  userMols: UserMolsService,
): Router => {
  const router = Router();

  router.post("/suggest", authMiddleware, async (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }
    const { peerUserId, molId, lastMessages, userDraft } = parsed.data;

    if (!contacts.areMutualContacts(user.userId, peerUserId)) {
      res.status(403).json({ code: "NOT_FRIENDS", message: "双方不是联系人，无法生成建议" });
      return;
    }
    const relationType = contacts.getRelation(user.userId, peerUserId);
    if (!aiReply.isConfigured()) {
      res.status(503).json({ code: "AI_NOT_CONFIGURED", message: "AI 服务未配置" });
      return;
    }

    if (molId && !userMols.owns(user.userId, molId)) {
      res.status(404).json({ code: "MOL_NOT_FOUND", message: "未找到该素颜" });
      return;
    }

    const personaBlock = buildPersonaBlock(userMols, user.userId, molId);
    if (!personaBlock.trim()) {
      if (molId) {
        res.status(409).json({ code: "MOL_PERSONA_EMPTY", message: "该素颜资料为空，无法生成建议" });
      } else {
        res.status(409).json({ code: "NO_USER_MOLS", message: "尚未添加素颜，无法生成建议" });
      }
      return;
    }

    const lm: SuggestLastMessage[] = pickSuggestChatContext(lastMessages ?? []);

    try {
      const suggestions = await aiReply.suggestReplies({
        personaBlock,
        lastMessages: lm,
        relationType,
        userDraft,
        molId,
      });
      res.status(200).json({ suggestions, relationType });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "生成失败" });
    }
  });

  return router;
};
