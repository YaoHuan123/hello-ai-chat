import type { AuthResult } from "../types/auth";

const KEY_TOKEN = "authToken";
const KEY_USER = "userId";
const KEY_PHONE = "phone";
const KEY_LAST_PHONE = "lastPhone";

export function saveAuth(data: AuthResult): void {
  localStorage.setItem(KEY_TOKEN, data.token);
  localStorage.setItem(KEY_USER, data.userId);
  localStorage.setItem(KEY_PHONE, data.phone);
  localStorage.setItem(KEY_LAST_PHONE, data.phone);
}

export function clearAuth(): void {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_PHONE);
}

export function getAuthToken(): string {
  return localStorage.getItem(KEY_TOKEN) ?? "";
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
