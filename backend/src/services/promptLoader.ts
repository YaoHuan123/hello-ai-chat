import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";

const PROMPTS_DIR = path.join(DATA_ROOT, "prompts");

export function promptsDir(): string {
  return PROMPTS_DIR;
}

export function loadPromptFile(fileName: string): string {
  const full = path.join(PROMPTS_DIR, fileName);
  if (!fs.existsSync(full)) {
    throw new Error(`AI_PROMPT_MISSING:${fileName}`);
  }
  const raw = fs.readFileSync(full, "utf8");
  if (!raw.trim()) {
    throw new Error(`AI_PROMPT_EMPTY:${fileName}`);
  }
  return raw;
}
