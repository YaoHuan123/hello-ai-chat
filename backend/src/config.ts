import fs from "fs";
import path from "path";
import { config as loadDotenv } from "dotenv";

// 必须在读取 process.env 之前完成 .env 注入：本文件被任何 import 触发求值时立即生效，
// 避免 `import { PORT } from "./config"` 早于 index.ts 里的 loadEnvFiles() 导致环境变量丢失。
const backendEnv = path.resolve(process.cwd(), ".env");
if (fs.existsSync(backendEnv)) {
  loadDotenv({ path: backendEnv });
}

const resolveFromRoot = (...parts: string[]): string => path.resolve(process.cwd(), ...parts);

export const PORT = Number(process.env.PORT ?? 3000);
export const JWT_SECRET = process.env.JWT_SECRET ?? "replace-this-in-production";
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d").trim();

export const DATA_ROOT = resolveFromRoot(process.env.DATA_ROOT?.trim() || "data");
export const DATA_DB_FILE = path.join(DATA_ROOT, "users.db");
