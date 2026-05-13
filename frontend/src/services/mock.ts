/**
 * 是否对业务 API 使用本地 mock（不连后端）。
 * 由 `.env` / `.env.local` 中 `VITE_USE_MOCK` 控制，未设置时默认为 mock，便于先跑通前端。
 */
export function isApiMock(): boolean {
  const v = (import.meta.env.VITE_USE_MOCK ?? "0").trim();
  return v === "1" || v === "true" || v === "on";
}
