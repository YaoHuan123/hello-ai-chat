import jwt, { type SignOptions } from "jsonwebtoken";
import { customAlphabet } from "nanoid";
import type { DatabaseSync } from "node:sqlite";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config";
import type { AuthSuccessResponse, JwtPayload, UserRecord } from "../types";
import { normalizePhoneDigits } from "../utils/phone";
import type { AliyunSmsService } from "./aliyunSms.service";
import type { AuthAuditLogService } from "./authAuditLog.service";
import type { SmsRateLimitService, SmsScene } from "./smsRateLimit.service";

export interface AuthRequestContext {
  ip?: string;
  userAgent?: string;
}

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export class AuthService {
  private readonly db: DatabaseSync;
  private readonly sms: AliyunSmsService;
  private readonly smsRateLimit: SmsRateLimitService;
  private readonly audit: AuthAuditLogService;

  constructor(
    db: DatabaseSync,
    sms: AliyunSmsService,
    smsRateLimit: SmsRateLimitService,
    audit: AuthAuditLogService,
  ) {
    this.db = db;
    this.sms = sms;
    this.smsRateLimit = smsRateLimit;
    this.audit = audit;
  }

  sendSmsCode = async (
    phoneRaw: string,
    ip: string,
    scene: SmsScene,
    ctx: AuthRequestContext = {},
  ): Promise<{ requestId?: string; bizId?: string }> => {
    const phone = this.normalizePhoneOrThrow(phoneRaw);
    this.smsRateLimit.assertCanSend(phone, ip, scene);
    const result = await this.sms.sendSmsCode(phone, scene);
    this.audit.record({ event: "sms_send", phone, ip, userAgent: ctx.userAgent, reason: scene });
    return result;
  };

  loginWithSmsCode = async (
    phoneRaw: string,
    code: string,
    ctx: AuthRequestContext = {},
  ): Promise<AuthSuccessResponse> => {
    const phone = this.normalizePhoneOrThrow(phoneRaw);
    try {
      await this.sms.checkSmsCode(phone, "login", code.trim());
    } catch (error) {
      this.audit.record({
        event: "sms_login_failed",
        phone,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        reason: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
    const result = this.ensureUserByPhone(phone);
    this.audit.record({
      event: "sms_login_success",
      userId: result.userId,
      phone,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return result;
  };

  getById = (userId: string): UserRecord | undefined => {
    return this.db
      .prepare("SELECT id, phone, created_at, token_version FROM users WHERE id = ?")
      .get(userId) as UserRecord | undefined;
  };

  deleteAccount = async (userId: string, code: string, ctx: AuthRequestContext = {}): Promise<void> => {
    const row = this.getById(userId);
    if (!row) {
      throw new Error("USER_NOT_FOUND");
    }
    await this.sms.checkSmsCode(row.phone, "delete_account", code.trim());

    this.db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    this.audit.record({
      event: "delete_account",
      userId,
      phone: row.phone,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  };

  private ensureUserByPhone(phone: string): AuthSuccessResponse {
    const existing = this.findByPhone(phone);
    const row = existing ?? this.createUserForPhone(phone);
    const token = this.signToken({ userId: row.id, phone: row.phone, tv: row.token_version });
    return { token, userId: row.id, phone: row.phone };
  }

  private findByPhone(phone: string): UserRecord | undefined {
    return this.db
      .prepare("SELECT id, phone, created_at, token_version FROM users WHERE phone = ?")
      .get(phone) as UserRecord | undefined;
  }

  private createUserForPhone(phone: string): UserRecord {
    const userId = nanoid();
    this.db.prepare("INSERT INTO users (id, phone) VALUES (?, ?)").run(userId, phone);
    const row = this.getById(userId);
    if (!row) {
      throw new Error("USER_CREATE_FAILED");
    }
    return row;
  }

  private normalizePhoneOrThrow(phoneRaw: string): string {
    const phone = normalizePhoneDigits(String(phoneRaw));
    if (!phone) {
      throw new Error("INVALID_PHONE");
    }
    return phone;
  }

  private signToken = (payload: JwtPayload): string => {
    const options = { expiresIn: JWT_EXPIRES_IN } as SignOptions;
    return jwt.sign(payload, JWT_SECRET, options);
  };
}
