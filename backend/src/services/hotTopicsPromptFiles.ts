import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import { logInfo } from "../logger";
import { DEFAULT_HOT_TOPICS_SYSTEM, DEFAULT_HOT_TOPICS_USER } from "../promptDefaults/hotTopics";

const DIR_NAME = "prompts";
const FILE_SYSTEM = "hot-topics-system.txt";
const FILE_USER = "hot-topics-user.txt";

function promptsDir(): string {
  return path.join(DATA_ROOT, DIR_NAME);
}

function ensurePromptFile(fileName: string, defaultBody: string): void {
  const dir = promptsDir();
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, fileName);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("hot_topics_prompts.seeded", { path: full });
  }
}

export function loadHotTopicsSystemTemplate(): string {
  ensurePromptFile(FILE_SYSTEM, DEFAULT_HOT_TOPICS_SYSTEM);
  const raw = fs.readFileSync(path.join(promptsDir(), FILE_SYSTEM), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}

export function loadHotTopicsUserTemplate(): string {
  ensurePromptFile(FILE_USER, DEFAULT_HOT_TOPICS_USER);
  const raw = fs.readFileSync(path.join(promptsDir(), FILE_USER), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}
