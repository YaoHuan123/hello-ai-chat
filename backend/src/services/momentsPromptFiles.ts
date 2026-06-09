import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import { logInfo } from "../logger";
import { DEFAULT_MOMENTS_EXPLORE_SYSTEM, DEFAULT_MOMENTS_EXPLORE_USER } from "../promptDefaults/momentsExplore";

const DIR_NAME = "prompts";
const FILE_SYSTEM = "moments-explore-system.txt";
const FILE_USER = "moments-explore-user.txt";

function promptsDir(): string {
  return path.join(DATA_ROOT, DIR_NAME);
}

function ensurePromptFile(fileName: string, defaultBody: string): void {
  const dir = promptsDir();
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, fileName);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("moments_prompts.seeded", { path: full });
  }
}

export function loadMomentsExploreSystemTemplate(): string {
  ensurePromptFile(FILE_SYSTEM, DEFAULT_MOMENTS_EXPLORE_SYSTEM);
  const raw = fs.readFileSync(path.join(promptsDir(), FILE_SYSTEM), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}

export function loadMomentsExploreUserTemplate(): string {
  ensurePromptFile(FILE_USER, DEFAULT_MOMENTS_EXPLORE_USER);
  const raw = fs.readFileSync(path.join(promptsDir(), FILE_USER), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}
