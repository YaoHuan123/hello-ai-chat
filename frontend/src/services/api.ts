import type { AuthResult } from "../types/auth";
import { getAuthToken } from "./storage";
import { isApiMock } from "./mock";

/** 生产环境可在 `.env` 中改 `VITE_API_BASE` */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:3000").replace(/\/$/, "");

export type AuthSmsScene = "login" | "delete_account";

type ApiErrorShape = { message?: string; code?: string };

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
    const msg = typeof data.message === "string" && data.message.trim() ? data.message.trim() : "";
    const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : "";
    throw new Error(msg || (code ? `${code}（HTTP ${res.status}）` : `请求失败（HTTP ${res.status}）`));
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
    const msg = typeof data.message === "string" && data.message.trim() ? data.message.trim() : "";
    const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : "";
    throw new Error(msg || (code ? `${code}（HTTP ${res.status}）` : `请求失败（HTTP ${res.status}）`));
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
    const msg = typeof data.message === "string" && data.message.trim() ? data.message.trim() : "";
    const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : "";
    throw new Error(msg || (code ? `${code}（HTTP ${res.status}）` : `请求失败（HTTP ${res.status}）`));
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
    const msg = typeof data.message === "string" && data.message.trim() ? data.message.trim() : "";
    const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : "";
    throw new Error(msg || (code ? `${code}（HTTP ${res.status}）` : `请求失败（HTTP ${res.status}）`));
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

export type MeResponse = { userId: string; phone: string; createdAt: string };

export async function getMeApi(token?: string): Promise<MeResponse> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return getJson<MeResponse>("/api/auth/me", t);
}

export async function deleteAccountApi(code: string, token?: string): Promise<{ ok: true }> {
  const t = token ?? getAuthToken().trim();
  if (!t) {
    throw new Error("未登录");
  }
  return deleteJson<{ ok: true }>("/api/auth/me", t, { code });
}
