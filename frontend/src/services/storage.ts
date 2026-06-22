import type { AuthResult } from "../types/auth";
import type { UserGender } from "../constants/userGender";
import { isUserGender } from "../constants/userGender";

const KEY_TOKEN = "authToken";
const KEY_USER = "userId";
const KEY_PHONE = "phone";
const KEY_NICKNAME = "nickname";
const KEY_GENDER = "gender";
const KEY_AVATAR_URL = "avatarUrl";
const KEY_AVATAR_UPDATED = "avatarUpdatedAt";
const KEY_LAST_PHONE = "lastPhone";
const KEY_LOGIN_PHONE_HISTORY = "loginPhoneHistory";

const LOGIN_PHONE_HISTORY_MAX = 10;

export const ME_PROFILE_UPDATED_EVENT = "aichat-me-profile-updated";

function notifyMeProfileUpdated(): void {
  window.dispatchEvent(new Event(ME_PROFILE_UPDATED_EVENT));
}

function isValidCnMobileDigits(phone: string): boolean {
  return /^1\d{10}$/.test(phone.replace(/\D/g, ""));
}

function normalizeCnMobileDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("86")) return digits.slice(2);
  return digits;
}

/** 成功登录后写入 MRU 列表（仅合法 11 位大陆号） */
export function rememberLoginPhone(phone: string): void {
  const digits = normalizeCnMobileDigits(phone);
  if (!isValidCnMobileDigits(digits)) return;
  let prev: string[] = [];
  try {
    const raw = localStorage.getItem(KEY_LOGIN_PHONE_HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) prev = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    prev = [];
  }
  const filtered = prev.filter((p) => isValidCnMobileDigits(normalizeCnMobileDigits(p)));
  const next = [digits, ...filtered.filter((p) => normalizeCnMobileDigits(p) !== digits)].slice(0, LOGIN_PHONE_HISTORY_MAX);
  localStorage.setItem(KEY_LOGIN_PHONE_HISTORY, JSON.stringify(next));
}

/** 最近登录过的手机号（新在前），供登录页联想与快捷填入 */
export function getLoginPhoneHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEY_LOGIN_PHONE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((p) => normalizeCnMobileDigits(p))
      .filter((p) => isValidCnMobileDigits(p))
      .filter((p, i, arr) => arr.indexOf(p) === i);
  } catch {
    return [];
  }
}

export function saveAuth(data: AuthResult): void {
  localStorage.setItem(KEY_TOKEN, data.token);
  localStorage.setItem(KEY_USER, data.userId);
  localStorage.setItem(KEY_PHONE, data.phone);
  localStorage.setItem(KEY_LAST_PHONE, data.phone);
  localStorage.removeItem(KEY_NICKNAME);
  localStorage.removeItem(KEY_GENDER);
  localStorage.removeItem(KEY_AVATAR_URL);
  localStorage.removeItem(KEY_AVATAR_UPDATED);
  rememberLoginPhone(data.phone);
}

export function clearAuth(): void {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_PHONE);
  localStorage.removeItem(KEY_NICKNAME);
  localStorage.removeItem(KEY_GENDER);
  localStorage.removeItem(KEY_AVATAR_URL);
  localStorage.removeItem(KEY_AVATAR_UPDATED);
}

export function setNicknameCache(nickname: string | null | undefined): void {
  const t = nickname?.trim();
  if (t) localStorage.setItem(KEY_NICKNAME, t);
  else localStorage.removeItem(KEY_NICKNAME);
  notifyMeProfileUpdated();
}

export function getNickname(): string {
  return localStorage.getItem(KEY_NICKNAME) ?? "";
}

/** 我的展示名：昵称优先，否则脱敏手机号 */
export function getMyDisplayName(): string {
  const n = getNickname().trim();
  if (n) return n;
  return getMaskedPhone();
}

export function setGenderCache(gender: UserGender | null | undefined): void {
  if (gender && isUserGender(gender)) {
    localStorage.setItem(KEY_GENDER, gender);
  } else {
    localStorage.removeItem(KEY_GENDER);
  }
  notifyMeProfileUpdated();
}

export function getGender(): UserGender | null {
  const raw = localStorage.getItem(KEY_GENDER)?.trim();
  if (!raw || !isUserGender(raw)) return null;
  return raw;
}

export function setAvatarCache(avatarUrl: string | null | undefined, avatarUpdatedAt: number | null | undefined): void {
  const url = avatarUrl?.trim();
  if (url) {
    localStorage.setItem(KEY_AVATAR_URL, url);
    if (avatarUpdatedAt != null) {
      localStorage.setItem(KEY_AVATAR_UPDATED, String(avatarUpdatedAt));
    } else {
      localStorage.removeItem(KEY_AVATAR_UPDATED);
    }
  } else {
    localStorage.removeItem(KEY_AVATAR_URL);
    localStorage.removeItem(KEY_AVATAR_UPDATED);
  }
  notifyMeProfileUpdated();
}

export function getAvatarUrl(): string | null {
  const url = localStorage.getItem(KEY_AVATAR_URL)?.trim();
  return url || null;
}

export function getAvatarUpdatedAt(): number | null {
  const raw = localStorage.getItem(KEY_AVATAR_UPDATED);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getMyAvatarContact(): {
  phone: string;
  remark: null;
  nickname: string;
  avatarUrl: string | null;
  avatarUpdatedAt: number | null;
} {
  return {
    phone: getPhone(),
    remark: null,
    nickname: getNickname() || getMyDisplayName(),
    avatarUrl: getAvatarUrl(),
    avatarUpdatedAt: getAvatarUpdatedAt(),
  };
}

export function getAuthToken(): string {
  return localStorage.getItem(KEY_TOKEN) ?? "";
}

export function getUserId(): string {
  return localStorage.getItem(KEY_USER) ?? "";
}

export function getPhone(): string {
  return localStorage.getItem(KEY_PHONE) ?? "";
}

/** 展示用：138****8000 */
export function getMaskedPhone(): string {
  const p = getPhone().replace(/\D/g, "");
  if (p.length < 7) return "已登录";
  return `${p.slice(0, 3)}****${p.slice(-4)}`;
}

export function getLastPhoneForForm(): string {
  return localStorage.getItem(KEY_LAST_PHONE) ?? "";
}
