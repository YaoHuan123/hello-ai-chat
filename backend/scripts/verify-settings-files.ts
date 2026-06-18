/**
 * 校验 settings 与 prompts 文件完整性
 * 用法: npx ts-node scripts/verify-settings-files.ts
 */

import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../src/config";
import type { SuyanSettingFile } from "../src/services/settingsFiles.service";
import {
  RELATION_SETTINGS_DIR,
  SETTINGS_DIR,
  SUYAN_SETTINGS_DIR,
  SUYAN_SHARED_SETTINGS_FILE,
} from "../src/services/settingsFiles.service";
import { loadPromptFile } from "../src/services/promptLoader";

const REQUIRED_PROMPTS = [
  "mol-suggest-system.txt",
  "mol-suggest-user.txt",
  "relation-suggest-system.txt",
  "relation-suggest-user.txt",
  "suyan-suggest-grounding-base.txt",
  "suyan-suggest-draft-section.txt",
  "relation-suggest-grounding-rules.txt",
  "suggest-relation-line.txt",
  "suggest-entertainment-relation-block.txt",
  "hot-topics-system.txt",
  "hot-topics-user.txt",
  "moments-explore-system.txt",
  "moments-explore-user.txt",
  "guardian-proactive-system.txt",
  "guardian-proactive-user.txt",
  "yiyi-owner-system.txt",
  "yiyi-owner-user.txt",
  "yiyi-topics-system.txt",
  "yiyi-topics-user.txt",
  "yiyi-bridge-system.txt",
  "yiyi-bridge-user.txt",
];

function main(): void {
  const errors: string[] = [];

  if (!fs.existsSync(SUYAN_SHARED_SETTINGS_FILE)) {
    errors.push(`missing ${SUYAN_SHARED_SETTINGS_FILE}`);
  }
  if (!fs.existsSync(RELATION_SETTINGS_DIR)) {
    errors.push(`missing ${RELATION_SETTINGS_DIR}`);
  }

  for (const file of REQUIRED_PROMPTS) {
    try {
      loadPromptFile(file);
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const suyanFiles = fs.readdirSync(SUYAN_SETTINGS_DIR).filter((f) => f.endsWith(".json"));
  if (suyanFiles.length === 0) {
    errors.push(`no suyan json under ${SUYAN_SETTINGS_DIR}`);
  }
  for (const file of suyanFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(SUYAN_SETTINGS_DIR, file), "utf8")) as SuyanSettingFile;
    if (!data.suyanId?.trim()) errors.push(`${file}: missing suyanId`);
    if (!data.summary?.trim()) errors.push(`${file}: missing summary`);
    if (!Array.isArray(data.infoItems) || data.infoItems.length === 0) errors.push(`${file}: missing infoItems`);
    if (typeof data.suggestBlock !== "string") errors.push(`${file}: missing suggestBlock`);
    if (typeof data.entertainment?.enabled !== "boolean") errors.push(`${file}: missing entertainment.enabled`);
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors, settingsDir: SETTINGS_DIR, dataRoot: DATA_ROOT }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, suyanCount: suyanFiles.length, prompts: REQUIRED_PROMPTS.length }, null, 2));
}

main();
