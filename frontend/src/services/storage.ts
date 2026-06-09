import type { AuthResult } from "../types/auth";

const KEY_TOKEN = "authToken";
const KEY_USER = "userId";
const KEY_PHONE = "phone";
const KEY_LAST_PHONE = "lastPhone";
const KEY_LOGIN_PHONE_HISTORY = "loginPhoneHistory";

const LOGIN_PHONE_HISTORY_MAX = 10;

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
  rememberLoginPhone(data.phone);
}

export function clearAuth(): void {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_PHONE);
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
