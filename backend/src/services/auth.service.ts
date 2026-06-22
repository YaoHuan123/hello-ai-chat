import jwt, { type SignOptions } from "jsonwebtoken";
import { customAlphabet } from "nanoid";
import type { DatabaseSync } from "node:sqlite";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config";
import type { AuthSuccessResponse, JwtPayload, UserRecord } from "../types";
import { normalizeUserGender, type UserGender } from "../constants/userGender";
import { normalizePhoneDigits } from "../utils/phone";
import type { AliyunSmsService } from "./aliyunSms.service";
import type { AuthAuditLogService } from "./authAuditLog.service";
import type { SmsRateLimitService, SmsScene } from "./smsRateLimit.service";
import { deleteUserAvatarFiles, detectAvatarExt, saveUserAvatar } from "./avatarStorage";

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
      .prepare(
        "SELECT id, phone, nickname, avatar_url, avatar_updated_at, gender, created_at, token_version FROM users WHERE id = ?",
      )
      .get(userId) as UserRecord | undefined;
  };

  updateProfile = (
    userId: string,
    input: { nickname?: string | null; gender?: UserGender | null },
  ): UserRecord => {
    const row = this.getById(userId);
    if (!row) {
      throw new Error("USER_NOT_FOUND");
    }

    const nickname = input.nickname !== undefined ? normalizeNickname(input.nickname) : row.nickname;
    let gender: string | null = row.gender;
    if (input.gender !== undefined) {
      if (input.gender === null) {
        gender = null;
      } else {
        const normalized = normalizeUserGender(input.gender);
        if (!normalized) {
          throw new Error("INVALID_GENDER");
        }
        gender = normalized;
      }
    }

    const info = this.db.prepare("UPDATE users SET nickname = ?, gender = ? WHERE id = ?").run(nickname, gender, userId);
    if (info.changes === 0) {
      throw new Error("USER_NOT_FOUND");
    }
    const next = this.getById(userId);
    if (!next) {
      throw new Error("USER_NOT_FOUND");
    }
    return next;
  };

  updateNickname = (userId: string, nicknameRaw: string | null): UserRecord => {
    return this.updateProfile(userId, { nickname: nicknameRaw });
  };

  updateAvatar = (userId: string, imageBase64: string): UserRecord => {
    const buffer = decodeAvatarBase64(imageBase64);
    if (!buffer) {
      throw new Error("INVALID_AVATAR");
    }
    return this.updateAvatarFromBuffer(userId, buffer);
  };

  updateAvatarFromBuffer = (userId: string, buffer: Buffer): UserRecord => {
    if (buffer.length > 1024 * 1024) {
      throw new Error("AVATAR_TOO_LARGE");
    }
    const ext = detectAvatarExt(buffer);
    if (!ext) {
      throw new Error("INVALID_AVATAR");
    }
    const avatarUrl = saveUserAvatar(userId, buffer, ext);
    const updatedAt = Date.now();
    const info = this.db
      .prepare("UPDATE users SET avatar_url = ?, avatar_updated_at = ? WHERE id = ?")
      .run(avatarUrl, updatedAt, userId);
    if (info.changes === 0) {
      throw new Error("USER_NOT_FOUND");
    }
    const row = this.getById(userId);
    if (!row) {
      throw new Error("USER_NOT_FOUND");
    }
    return row;
  };

  clearAvatar = (userId: string): UserRecord => {
    deleteUserAvatarFiles(userId);
    const info = this.db
      .prepare("UPDATE users SET avatar_url = NULL, avatar_updated_at = NULL WHERE id = ?")
      .run(userId);
    if (info.changes === 0) {
      throw new Error("USER_NOT_FOUND");
    }
    const row = this.getById(userId);
    if (!row) {
      throw new Error("USER_NOT_FOUND");
    }
    return row;
  };

  deleteAccount = async (userId: string, code: string, ctx: AuthRequestContext = {}): Promise<void> => {
    const row = this.getById(userId);
    if (!row) {
      throw new Error("USER_NOT_FOUND");
    }
    await this.sms.checkSmsCode(row.phone, "delete_account", code.trim());

    deleteUserAvatarFiles(userId);
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
      .prepare(
        "SELECT id, phone, nickname, avatar_url, avatar_updated_at, gender, created_at, token_version FROM users WHERE phone = ?",
      )
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

function normalizeNickname(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const t = input.trim();
  if (!t) return null;
  return t.slice(0, 32);
}

function decodeAvatarBase64(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const base64 = trimmed.includes(",") ? (trimmed.split(",").pop() ?? "") : trimmed;
  if (!base64 || !/^[A-Za-z0-9+/=\s]+$/.test(base64)) return null;
  try {
    const buf = Buffer.from(base64.replace(/\s/g, ""), "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}
