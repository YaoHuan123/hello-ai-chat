import express from "express";
import cors from "cors";
// 注意：./config 内部已在模块加载时完成 .env 注入，因此必须先 import 它，再读取 process.env。
import { PORT } from "./config";
import { initDb } from "./db/init";
import { initAuthMiddleware } from "./middleware/auth";
import { AuthService } from "./services/auth.service";
import { AliyunSmsService } from "./services/aliyunSms.service";
import { AuthAuditLogService } from "./services/authAuditLog.service";
import { SmsRateLimitService } from "./services/smsRateLimit.service";
import { createAuthRouter } from "./routes/auth.routes";
import { errorToMeta, logError, logInfo, logWarn } from "./logger";

if ((process.env.JWT_SECRET ?? "").trim() === "" || process.env.JWT_SECRET === "replace-this-in-production") {
  logWarn("config.jwt_secret", {
    message: "JWT_SECRET 未设置或为占位值，生产环境必须配置强随机密钥。",
  });
}

const app = express();
const db = initDb();
initAuthMiddleware(db);

const aliyunSmsService = new AliyunSmsService();
const smsRateLimitService = new SmsRateLimitService(db);
const authAuditLogService = new AuthAuditLogService(db);
const authService = new AuthService(db, aliyunSmsService, smsRateLimitService, authAuditLogService);

app.use(cors());
app.use(express.json({ limit: "256kb" }));

let reqSeq = 0;
app.use((req, res, next) => {
  reqSeq += 1;
  const reqId = `req-${Date.now()}-${reqSeq}`;
  const start = Date.now();
  (res.locals as { reqId?: string }).reqId = reqId;
  logInfo("http.request.start", {
    reqId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
  });
  res.on("finish", () => {
    logInfo("http.request.end", {
      reqId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      elapsedMs: Date.now() - start,
    });
  });
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "aichat-backend" });
});

app.use("/api/auth", createAuthRouter(authService));

app.use((_req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "未找到接口" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError("http.unhandled_error", errorToMeta(err));
  if (res.headersSent) return;
  res.status(500).json({ code: "INTERNAL_ERROR", message: "服务器内部错误" });
});

app.listen(PORT, () => {
  logInfo("http.server.listening", { port: PORT, url: `http://localhost:${PORT}` });
});
