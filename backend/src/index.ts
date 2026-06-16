import http from "node:http";
import express from "express";
import cors from "cors";
// 注意：./config 内部已在模块加载时完成 .env 注入，因此必须先 import 它，再读取 process.env。
import { PORT, UPLOADS_ROOT } from "./config";
import { initDb } from "./db/init";
import { initAuthMiddleware } from "./middleware/auth";
import { AuthService } from "./services/auth.service";
import { AvatarText2ImgService } from "./services/avatarText2Img.service";
import { AliyunSmsService } from "./services/aliyunSms.service";
import { AuthAuditLogService } from "./services/authAuditLog.service";
import { SmsRateLimitService } from "./services/smsRateLimit.service";
import { createAuthRouter } from "./routes/auth.routes";
import { createContactsRouter } from "./routes/contacts.routes";
import { createFriendRequestsRouter } from "./routes/friendRequests.routes";
import { createMessagesRouter } from "./routes/messages.routes";
import { createMolWorldRouter } from "./routes/molWorld.routes";
import { createMyMolsRouter } from "./routes/myMols.routes";
import { createMolSuggestRouter } from "./routes/molSuggest.routes";
import { createRelationSuggestRouter } from "./routes/relationSuggest.routes";
import { createGuardianRouter } from "./routes/guardian.routes";
import { createMomentsRouter } from "./routes/moments.routes";
import { GuardianAiService } from "./services/guardianAi.service";
import { GuardianGroupsService } from "./services/guardianGroups.service";
import { HotTopicsAiService } from "./services/hotTopicsAi.service";
import { HotTopicsService } from "./services/hotTopics.service";
import { MomentsAiService } from "./services/momentsAi.service";
import { MomentsService } from "./services/moments.service";
import { ContactsService } from "./services/contacts.service";
import { FriendRequestsService } from "./services/friendRequests.service";
import { MessagesService } from "./services/messages.service";
import { MolWorldService } from "./services/molWorld.service";
import { UserMolsService } from "./services/userMols.service";
import { AiReplyService } from "./services/aiReply.service";
import { errorToMeta, logError, logInfo, logWarn } from "./logger";
import { attachWs } from "./ws/wsServer";

if ((process.env.JWT_SECRET ?? "").trim() === "" || process.env.JWT_SECRET === "replace-this-in-production") {
  logWarn("config.jwt_secret", {
    message: "JWT_SECRET 未设置或为占位值，生产环境必须配置强随机密钥。",
  });
}

const app = express();
const db = initDb();
initAuthMiddleware(db);

const molWorldService = new MolWorldService();
const userMolsService = new UserMolsService(db, molWorldService);
molWorldService.attachPurgeHandler((id) => userMolsService.purgeReferences(id));
molWorldService.seedIfEmpty();
molWorldService.seedMissingMols();
molWorldService.purgeOrphanSeedFiles();
molWorldService.syncSeedCatalogFromDefs();
molWorldService.backfillEmptyPersonas();
molWorldService.stripExampleInfoItems();

const aliyunSmsService = new AliyunSmsService();
const smsRateLimitService = new SmsRateLimitService(db);
const authAuditLogService = new AuthAuditLogService(db);
const authService = new AuthService(db, aliyunSmsService, smsRateLimitService, authAuditLogService);
const avatarText2ImgService = new AvatarText2ImgService();
const contactsService = new ContactsService(db);
const friendRequestsService = new FriendRequestsService(db, contactsService);
const messagesService = new MessagesService(contactsService);
const aiReplyService = new AiReplyService();
const guardianAiService = new GuardianAiService();
const guardianGroupsService = new GuardianGroupsService(db, contactsService, guardianAiService);
const momentsAiService = new MomentsAiService();
const momentsService = new MomentsService(db, contactsService, momentsAiService);
const hotTopicsAiService = new HotTopicsAiService();
const hotTopicsService = new HotTopicsService(hotTopicsAiService);
hotTopicsService.startScheduler();

app.use(cors());
app.use("/api/auth/me/avatar", express.json({ limit: "768kb" }));
app.use(express.json({ limit: "256kb" }));
app.use("/uploads", express.static(UPLOADS_ROOT));

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

app.use("/api/auth", createAuthRouter(authService, avatarText2ImgService));
app.use("/api/contacts", createContactsRouter(contactsService));
app.use("/api/friend-requests", createFriendRequestsRouter(friendRequestsService));
app.use("/api/messages", createMessagesRouter(messagesService));
app.use("/api/mol-world", createMolWorldRouter(molWorldService, userMolsService));
app.use("/api/mol-mine", createMyMolsRouter(molWorldService, userMolsService));
app.use("/api/mol", createMolSuggestRouter(aiReplyService, contactsService, userMolsService));
app.use("/api/relation", createRelationSuggestRouter(aiReplyService, contactsService));
app.use("/api/guardian", createGuardianRouter(guardianGroupsService));
app.use("/api/moments", createMomentsRouter(momentsService, hotTopicsService));

app.use((_req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "未找到接口" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError("http.unhandled_error", errorToMeta(err));
  if (res.headersSent) return;
  res.status(500).json({ code: "INTERNAL_ERROR", message: "服务器内部错误" });
});

const server = http.createServer(app);
attachWs(server, db);

server.listen(PORT, () => {
  logInfo("http.server.listening", { port: PORT, url: `http://localhost:${PORT}` });
});
