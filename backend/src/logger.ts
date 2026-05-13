import fs from "fs";
import path from "path";

type LogLevel = "INFO" | "WARN" | "ERROR";

function ts(): string {
  return new Date().toISOString();
}

function stringifyMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " {\"meta\":\"[unserializable]\"}";
  }
}

function fileLoggingDisabled(): boolean {
  const v = process.env.LOG_DISABLE_FILE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function resolveLogDir(): string {
  const d = process.env.LOG_DIR?.trim();
  if (d) return path.resolve(d);
  return path.join(process.cwd(), "logs");
}

function logFilePathForToday(): string {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(resolveLogDir(), `app-${day}.log`);
}

function appendToLogFile(line: string): void {
  if (fileLoggingDisabled()) return;
  try {
    fs.mkdirSync(resolveLogDir(), { recursive: true });
    fs.appendFileSync(logFilePathForToday(), `${line}\n`, "utf-8");
  } catch (e) {
    console.error("[logger] 写入日志文件失败:", e);
  }
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  write("INFO", message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  write("WARN", message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  write("ERROR", message, meta);
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const line = `[${ts()}] [${level}] ${message}${stringifyMeta(meta)}`;
  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
  }
  appendToLogFile(line);
}

export function errorToMeta(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 8).join("\n"),
    };
  }
  return { error: String(err) };
}
