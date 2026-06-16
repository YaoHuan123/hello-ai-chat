import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import { logInfo } from "../logger";
import {
  DEFAULT_YIYI_BRIDGE_SYSTEM,
  DEFAULT_YIYI_BRIDGE_USER,
  DEFAULT_YIYI_OWNER_SYSTEM,
  DEFAULT_YIYI_OWNER_USER,
  DEFAULT_YIYI_TOPICS_SYSTEM,
  DEFAULT_YIYI_TOPICS_USER,
} from "../promptDefaults/yiyi";

const DIR_NAME = "prompts";

function ensurePromptFile(fileName: string, defaultBody: string): void {
  const dir = path.join(DATA_ROOT, DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, fileName);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("yiyi_prompts.seeded", { path: full });
  }
}

function loadTemplate(fileName: string, defaultBody: string): string {
  ensurePromptFile(fileName, defaultBody);
  const full = path.join(DATA_ROOT, DIR_NAME, fileName);
  const raw = fs.readFileSync(full, "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}

export function loadYiyiOwnerSystemTemplate(): string {
  return loadTemplate("yiyi-owner-system.txt", DEFAULT_YIYI_OWNER_SYSTEM);
}

export function loadYiyiOwnerUserTemplate(): string {
  return loadTemplate("yiyi-owner-user.txt", DEFAULT_YIYI_OWNER_USER);
}

export function loadYiyiTopicsSystemTemplate(): string {
  return loadTemplate("yiyi-topics-system.txt", DEFAULT_YIYI_TOPICS_SYSTEM);
}

export function loadYiyiTopicsUserTemplate(): string {
  return loadTemplate("yiyi-topics-user.txt", DEFAULT_YIYI_TOPICS_USER);
}

export function loadYiyiBridgeSystemTemplate(): string {
  return loadTemplate("yiyi-bridge-system.txt", DEFAULT_YIYI_BRIDGE_SYSTEM);
}

export function loadYiyiBridgeUserTemplate(): string {
  return loadTemplate("yiyi-bridge-user.txt", DEFAULT_YIYI_BRIDGE_USER);
}
