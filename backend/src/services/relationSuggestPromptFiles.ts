import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import { logInfo } from "../logger";
import { DEFAULT_RELATION_SUGGEST_SYSTEM, DEFAULT_RELATION_SUGGEST_USER } from "../promptDefaults/relationSuggest";

const DIR_NAME = "prompts";
const FILE_SYSTEM = "relation-suggest-system.txt";
const FILE_USER = "relation-suggest-user.txt";

export function relationSuggestPromptsDir(): string {
  return path.join(DATA_ROOT, DIR_NAME);
}

function ensurePromptFile(fileName: string, defaultBody: string): void {
  const dir = relationSuggestPromptsDir();
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, fileName);
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("relation_suggest_prompts.seeded", { path: full });
  }
}

function loadTemplate(fileName: string, defaultBody: string, migrateIfMissing?: string): string {
  ensurePromptFile(fileName, defaultBody);
  const full = path.join(relationSuggestPromptsDir(), fileName);
  let raw = fs.readFileSync(full, "utf8");
  if (migrateIfMissing && !raw.includes(migrateIfMissing)) {
    fs.writeFileSync(full, defaultBody, "utf8");
    logInfo("relation_suggest_prompts.migrated", { path: full });
    raw = defaultBody;
  }
  if (!raw.trim()) throw new Error("AI_PROMPT_EMPTY");
  return raw;
}

export function loadRelationSuggestSystemTemplate(): string {
  return loadTemplate(FILE_SYSTEM, DEFAULT_RELATION_SUGGEST_SYSTEM, "{{GROUNDING_RULES}}");
}

export function loadRelationSuggestUserTemplate(): string {
  return loadTemplate(FILE_USER, DEFAULT_RELATION_SUGGEST_USER, "{{USER_DRAFT_SECTION}}");
}
