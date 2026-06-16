import { Router, type Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import type { AiReplyService, SuggestLastMessage } from "../services/aiReply.service";
import type { ContactsService } from "../services/contacts.service";

const bodySchema = z.object({
  peerUserId: z.string().min(1),
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

function mapError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = error.message;
  logWarn("relation_suggest.error", { code });
  if (code === "NOT_FRIENDS") {
    res.status(403).json({ code, message: "双方不是联系人，无法生成建议" });
    return true;
  }
  if (code === "NO_RELATION") {
    res.status(409).json({ code, message: "尚未设置关系，无法生成建议" });
    return true;
  }
  if (code === "AI_NOT_CONFIGURED") {
    res.status(503).json({ code, message: "AI 服务未配置" });
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

export const createRelationSuggestRouter = (aiReply: AiReplyService, contacts: ContactsService): Router => {
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
    const { peerUserId, lastMessages, userDraft } = parsed.data;

    if (!contacts.areMutualContacts(user.userId, peerUserId)) {
      res.status(403).json({ code: "NOT_FRIENDS", message: "双方不是联系人，无法生成建议" });
      return;
    }
    const relationType = contacts.getRelation(user.userId, peerUserId);
    if (!relationType) {
      res.status(409).json({ code: "NO_RELATION", message: "尚未设置关系，无法生成建议" });
      return;
    }
    if (!aiReply.isConfigured()) {
      res.status(503).json({ code: "AI_NOT_CONFIGURED", message: "AI 服务未配置" });
      return;
    }

    const lm: SuggestLastMessage[] = (lastMessages ?? []).slice(-12);

    try {
      const suggestions = await aiReply.suggestRepliesByRelation({
        relationType,
        lastMessages: lm,
        userDraft,
      });
      res.status(200).json({ suggestions, relationType });
    } catch (error) {
      if (mapError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "生成失败" });
    }
  });

  return router;
};
