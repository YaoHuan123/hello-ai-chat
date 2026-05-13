import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthService } from "../services/auth.service";
import { authMiddleware } from "../middleware/auth";
import { logWarn } from "../logger";
import { AliyunSmsError } from "../services/aliyunSms.service";
import type { SmsScene } from "../services/smsRateLimit.service";

const smsSceneSchema = z.enum(["login", "delete_account"]);

const sendSmsSchema = z.object({
  phone: z.string().min(1).max(32),
  scene: smsSceneSchema,
});

const smsLoginSchema = z.object({
  phone: z.string().min(1).max(32),
  code: z.string().min(4).max(8),
});

const deleteAccountSchema = z.object({
  code: z.string().min(4).max(8),
});

function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || "unknown";
}

function clientUa(req: { headers: Record<string, unknown> }): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" && ua.trim() ? ua.trim() : undefined;
}

function mapAuthError(res: Response, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeAliyunForLog = error as Error & { code?: string; requestId?: string };
  logWarn("auth.error", {
    name: error.name,
    message: error.message,
    code: maybeAliyunForLog.code,
    requestId: maybeAliyunForLog.requestId,
    stack: error.stack?.split("\n").slice(0, 6).join("\n"),
  });

  if (error instanceof AliyunSmsError) {
    if (error.code === "SMS_VERIFY_FAILED") {
      res.status(400).json({ code: "SMS_VERIFY_FAILED", message: "验证码错误或已过期，请重新获取" });
      return true;
    }
    if (error.code) {
      res.status(502).json({ code: "AUTH_PROVIDER_ERROR", message: "短信服务暂不可用，请稍后再试" });
      return true;
    }
  }

  const code = error.message;
  if (code === "INVALID_PHONE") {
    res.status(400).json({ code, message: "请输入有效的中国大陆手机号" });
    return true;
  }
  if (code === "SMS_RATE_LIMITED") {
    res.status(429).json({ code, message: "验证码发送过于频繁，请稍后再试" });
    return true;
  }
  if (code === "USER_NOT_FOUND") {
    res.status(401).json({ code: "UNAUTHORIZED", message: "登录状态已失效，请重新登录" });
    return true;
  }
  if (code.startsWith("MISSING_ENV:")) {
    res.status(500).json({ code: "AUTH_PROVIDER_NOT_CONFIGURED", message: "登录服务未配置，请联系管理员" });
    return true;
  }
  return false;
}

export const createAuthRouter = (authService: AuthService): Router => {
  const router = Router();

  router.post("/sms/send", async (req, res) => {
    const parsed = sendSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }

    try {
      const ip = clientIp(req);
      const result = await authService.sendSmsCode(parsed.data.phone, ip, parsed.data.scene as SmsScene, {
        ip,
        userAgent: clientUa(req),
      });
      res.status(200).json({ ok: true as const, ...result });
    } catch (error) {
      if (mapAuthError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "发送验证码失败" });
    }
  });

  router.post("/sms/login", async (req, res) => {
    const parsed = smsLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求参数无效" });
      return;
    }

    try {
      const result = await authService.loginWithSmsCode(parsed.data.phone, parsed.data.code, {
        ip: clientIp(req),
        userAgent: clientUa(req),
      });
      res.status(200).json(result);
    } catch (error) {
      if (mapAuthError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "登录失败" });
    }
  });

  router.get("/me", authMiddleware, (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }

    const detail = authService.getById(user.userId);
    if (!detail) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "登录状态已失效，请重新登录" });
      return;
    }

    res.status(200).json({
      userId: detail.id,
      phone: detail.phone,
      createdAt: detail.created_at,
    });
  });

  router.delete("/me", authMiddleware, async (req, res) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "未登录" });
      return;
    }
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "INVALID_PARAMS", message: parsed.error.issues[0]?.message ?? "请求体无效" });
      return;
    }
    try {
      await authService.deleteAccount(user.userId, parsed.data.code, {
        ip: clientIp(req),
        userAgent: clientUa(req),
      });
      res.status(200).json({ ok: true as const });
    } catch (error) {
      if (mapAuthError(res, error)) return;
      res.status(500).json({ code: "INTERNAL_ERROR", message: "注销账号失败" });
    }
  });

  return router;
};
