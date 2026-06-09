import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import { logInfo } from "../logger";
import { DEFAULT_MOL_SUGGEST_SYSTEM, DEFAULT_MOL_SUGGEST_USER } from "../promptDefaults/molSuggest";

const DIR_NAME = "prompts";
const FILE_SYSTEM = "mol-suggest-system.txt";
const FILE_USER = "mol-suggest-user.txt";

export function molSuggestPromptsDir(): string {
  return path.join(DATA_ROOT, DIR_NAME);
}

function ensurePromptFile(fileName: string, defaultBody: string): void {
  const dir = molSuggestPromptsDir();
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, fileName);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("mol_suggest_prompts.seeded", { path: full });
  }
}

export function loadMolSuggestSystemTemplate(): string {
  ensurePromptFile(FILE_SYSTEM, DEFAULT_MOL_SUGGEST_SYSTEM);
  const raw = fs.readFileSync(path.join(molSuggestPromptsDir(), FILE_SYSTEM), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}

export function loadMolSuggestUserTemplate(): string {
  ensurePromptFile(FILE_USER, DEFAULT_MOL_SUGGEST_USER);
  const raw = fs.readFileSync(path.join(molSuggestPromptsDir(), FILE_USER), "utf8");
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}
