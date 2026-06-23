import type { AuthResult } from "../types/auth";
import type { ContactItem } from "../types/contact";
import type { UserGender } from "../constants/userGender";
import { getAuthToken } from "./storage";
import { isApiMock } from "./mock";
import { suyanApiErrorLabel } from "../constants/suyanCopy";

/** 生产环境可在 `.env` 中改 `VITE_API_BASE` */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").replace(/\/$/, "");

export type AuthSmsScene = "login" | "delete_account";

type ApiErrorShape = {
  message?: string;
  code?: string;
  detail?: string | Array<{ msg?: string }>;
};

function readApiErrorMessage(data: ApiErrorShape, status: number): string {
  const msg = typeof data.message === "string" ? data.message.trim() : "";
  if (msg) return msg;

  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) {
    if (status === 404) {
      return "接口不存在，请确认 backend 已启动（npm run dev）且包含动态模块";
    }
    return detail.trim();
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]?.msg?.trim();
    if (first) return first;
  }

  const code = typeof data.code === "string" ? data.code.trim() : "";
  if (code === "NOT_FOUND" || status === 404) {
    return "接口不存在，请确认 backend 已启动（npm run dev）且包含动态模块";
  }
  const suyanLabel = code ? suyanApiErrorLabel(code) : undefined;
  if (suyanLabel) return suyanLabel;
  if (code) return `${code}（HTTP ${status}）`;
  return `请求失败（HTTP ${status}）`;
}

function rethrowFetchError(e: unknown, context: string): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "Failed to fetch" || /Load failed|NetworkError|network/i.test(msg)) {
    throw new Error(
      `${context}：无法连接后端（请确认已启动服务并监听 ${API_BASE}）。原始错误：${msg}`,
    );
  }
  throw e;
}

export async function getJson<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: "GET", headers });
  } catch (e) {
    rethrowFetchError(e, "请求失败");
  }
  const data = (await res.json().catch(() => ({}))) as ApiErrorShape & T;
  if (!res.ok) {
    throw new Error(readApiErrorMessage(data, res.status));
  }
  return data;
}

export async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    rethrowFetchError(e, "请求失败");
  }
  const data = (await res.json().catch(() => ({}))) as ApiErrorShape & T;
  if (!res.ok) {
    throw new Error(readApiErrorMessage(data, res.status));
  }
  return data;
}

export async function putJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    rethrowFetchError(e, "请求失败");
  }
  const data = (await res.json().catch(() => ({}))) as ApiErrorShape & T;
  if (!res.ok) {
    throw new Error(readApiErrorMessage(data, res.status));
  }
  return data;
}

export async function patchJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: "PATCH", headers, body: JSON.stringify(body) });
  } catch (e) {
    rethrowFetchError(e, "请求失败");
  }
  const data = (await res.json().catch(() => ({}))) as ApiErrorShape & T;
  if (!res.ok) {
    throw new Error(readApiErrorMessage(data, res.status));
  }
  return data;
}

export async function deleteJson<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    rethrowFetchError(e, "请求失败");
  }
  const data = (await res.json().catch(() => ({}))) as ApiErrorShape & T;
  if (!res.ok) {
    throw new Error(readApiErrorMessage(data, res.status));
  }
  return data;
}

/** 探活。`VITE_USE_MOCK=1` 时不请求网络。 */
export type HealthResult = { ok: boolean; service?: string; mock: boolean };

export async function getApiHealth(): Promise<HealthResult> {
  if (isApiMock()) {
    return { ok: true, service: "mock", mock: true };
  }
  return { ...(await getJson<{ ok: boolean; service?: string }>("/health")), mock: false };
}

export async function sendSmsCodeApi(phone: string, scene: AuthSmsScene): Promise<{ ok: true; requestId?: string; bizId?: string }> {
  return postJson("/api/auth/sms/send", { phone, scene });
}

export async function smsLoginApi(phone: string, code: string): Promise<AuthResult> {
  return postJson<AuthResult>("/api/auth/sms/login", { phone, code });
}

export type MeResponse = {
  userId: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: number | null;
  gender: UserGender | null;
  createdAt: string;
};

export async function getMeApi(token?: string): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return getJson<MeResponse>("/api/auth/me", t);
}

export async function updateMeNicknameApi(nickname: string | null, token?: string): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return patchJson<MeResponse>("/api/auth/me", { nickname }, t);
}

export async function updateMeProfileApi(
  patch: { nickname?: string | null; gender?: UserGender | null },
  token?: string,
): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return patchJson<MeResponse>("/api/auth/me", patch, t);
}

export async function uploadMeAvatarApi(image: string, token?: string): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return putJson<MeResponse>("/api/auth/me/avatar", { image }, t);
}

export async function generateMeAvatarApi(phrase: string, token?: string): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return postJson<MeResponse>("/api/auth/me/avatar/generate", { phrase: phrase.trim() }, t);
}

export async function deleteMeAvatarApi(token?: string): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return deleteJson<MeResponse>("/api/auth/me/avatar", t);
}

export async function deleteAccountApi(code: string, token?: string): Promise<{ ok: true }> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return deleteJson<{ ok: true }>("/api/auth/me", t, { code });
}

export async function listContactsApi(token?: string): Promise<{ items: ContactItem[] }> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return getJson<{ items: ContactItem[] }>("/api/contacts", t);
}

export async function removeContactApi(contactUserId: string, token?: string): Promise<{ ok: true }> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  const id = encodeURIComponent(contactUserId);
  return deleteJson<{ ok: true }>(`/api/contacts/${id}`, t);
}

export async function patchContactApi(
  contactUserId: string,
  patch: import("../types/contact").ContactPatch,
  token?: string,
): Promise<{ contact: ContactItem }> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  const id = encodeURIComponent(contactUserId);
  return patchJson<{ contact: ContactItem }>(`/api/contacts/${id}`, patch, t);
}
