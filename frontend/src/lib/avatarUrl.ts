import { API_BASE } from "../services/api";

export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  avatarUpdatedAt?: number | null,
): string | null {
  const path = avatarUrl?.trim();
  if (!path) return null;
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (avatarUpdatedAt) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${avatarUpdatedAt}`;
  }
  return url;
}

/** 将 File 读为 data URL，供上传接口使用 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("读取图片失败"));
    };
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

const AVATAR_ACCEPT = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 1024 * 1024;

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ACCEPT.has(file.type)) {
    return "请选择 JPG、PNG 或 WebP 格式的图片";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "图片不能超过 1MB";
  }
  return null;
}
