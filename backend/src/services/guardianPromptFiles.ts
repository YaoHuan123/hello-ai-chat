import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import { logInfo } from "../logger";
import { DEFAULT_GUARDIAN_PROACTIVE_SYSTEM, DEFAULT_GUARDIAN_PROACTIVE_USER } from "../promptDefaults/guardianProactive";

const DIR_NAME = "prompts";
const FILE_SYSTEM = "guardian-proactive-system.txt";
const FILE_USER = "guardian-proactive-user.txt";

export function guardianPromptsDir(): string {
  return path.join(DATA_ROOT, DIR_NAME);
}

function ensurePromptFile(fileName: string, defaultBody: string): void {
  const dir = guardianPromptsDir();
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, fileName);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("guardian_prompts.seeded", { path: full });
  }
}

export function loadGuardianProactiveSystemTemplate(): string {
  ensurePromptFile(FILE_SYSTEM, DEFAULT_GUARDIAN_PROACTIVE_SYSTEM);
  const raw = fs.readFileSync(path.join(guardianPromptsDir(), FILE_SYSTEM), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}

export function loadGuardianProactiveUserTemplate(): string {
  ensurePromptFile(FILE_USER, DEFAULT_GUARDIAN_PROACTIVE_USER);
  const raw = fs.readFileSync(path.join(guardianPromptsDir(), FILE_USER), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}
