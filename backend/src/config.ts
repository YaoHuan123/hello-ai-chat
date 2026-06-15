import fs from "fs";
import path from "path";
import { config as loadDotenv } from "dotenv";

// 必须在读取 process.env 之前完成 .env 注入：本文件被 any import 触发求值时立即生效。
// 先加载共享 .env（默认 E:\hello story2\backend\.env），再用本仓库 backend/.env 覆盖。
const DEFAULT_SHARED_ENV = "E:\\hello story2\\backend\\.env";

function loadEnvIfExists(filePath: string, override = false): void {
  if (fs.existsSync(filePath)) {
    loadDotenv({ path: filePath, override });
  }
}

const sharedEnv = (process.env.BACKEND_SHARED_ENV?.trim() || DEFAULT_SHARED_ENV).trim();
loadEnvIfExists(sharedEnv);
loadEnvIfExists(path.resolve(process.cwd(), ".env"), true);

// hello story2 与 hello chat 环境变量名差异：共享 .env 加载后做别名映射。
function applySharedEnvAliases(): void {
  if (!process.env.ALIYUN_SMS_DEV_MOCK?.trim() && process.env.ALIYUN_DYPNSAPI_DEV_MOCK?.trim()) {
    process.env.ALIYUN_SMS_DEV_MOCK = process.env.ALIYUN_DYPNSAPI_DEV_MOCK;
  }
}
applySharedEnvAliases();

const resolveFromRoot = (...parts: string[]): string => path.resolve(process.cwd(), ...parts);

export const PORT = Number(process.env.PORT ?? 4000);
export const JWT_SECRET = process.env.JWT_SECRET ?? "replace-this-in-production";
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d").trim();

export const DATA_ROOT = resolveFromRoot(process.env.DATA_ROOT?.trim() || "data");
export const DATA_DB_FILE = path.join(DATA_ROOT, "users.db");
/** MOL 世界：按场景子目录存放每个 MOL 的 JSON 文件（公开上架） */
export const MOL_WORLD_DIR = path.join(DATA_ROOT, "mol-world");
/** 用户自建 MOL：仅归属创建者，不出现在 Mol 世界 */
export const MOL_PRIVATE_DIR = path.join(DATA_ROOT, "mol-private");
export const UPLOADS_ROOT = path.join(DATA_ROOT, "uploads");
export const AVATARS_DIR = path.join(UPLOADS_ROOT, "avatars");

/** Mol 建议回复：OpenAI 兼容 Chat Completions；仅读取 OPENAI_*。未配置 OPENAI_API_KEY 时接口返回 AI_NOT_CONFIGURED */
export const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? "";
export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
export const OPENAI_TIMEOUT_MS = Math.min(
  120_000,
  Math.max(1000, Number.parseInt(process.env.OPENAI_TIMEOUT_MS?.trim() || "15000", 10) || 15_000),
);

/** 朋友圈热点：抓取微博/知乎/抖音热搜并经 LLM 生成问题；缓存目录与刷新间隔 */
export const HOT_TOPICS_DIR = path.join(DATA_ROOT, "hot-topics");
export const HOT_TOPICS_REFRESH_MS = Math.min(
  24 * 3_600_000,
  Math.max(60_000, Number.parseInt(process.env.HOT_TOPICS_REFRESH_MS?.trim() || "3600000", 10) || 3_600_000),
);
export const HOT_TOPICS_FETCH_TIMEOUT_MS = Math.min(
  30_000,
  Math.max(3000, Number.parseInt(process.env.HOT_TOPICS_FETCH_TIMEOUT_MS?.trim() || "12000", 10) || 12_000),
);
export const HOT_TOPICS_AI_TIMEOUT_MS = Math.min(
  180_000,
  Math.max(OPENAI_TIMEOUT_MS, Number.parseInt(process.env.HOT_TOPICS_AI_TIMEOUT_MS?.trim() || "60000", 10) || 60_000),
);

/** 头像文生图：OpenAI 兼容 POST /images/generations（如火山方舟 Seedream） */
export const TEXT2IMG_BASE_URL = (process.env.TEXT2IMG_BASE_URL?.trim() || OPENAI_BASE_URL).replace(/\/$/, "");
export const TEXT2IMG_API_KEY = process.env.TEXT2IMG_API_KEY?.trim() ?? "";
export const TEXT2IMG_MODEL = process.env.TEXT2IMG_MODEL?.trim() ?? "";
/** Seedream 5 需 2k/3k 或 ≥1920² 像素；默认 2k */
export const TEXT2IMG_SIZE = process.env.TEXT2IMG_SIZE?.trim() || "2k";
export const TEXT2IMG_TIMEOUT_MS = Math.min(
  180_000,
  Math.max(5000, Number.parseInt(process.env.TEXT2IMG_TIMEOUT_MS?.trim() || "90000", 10) || 90_000),
);
