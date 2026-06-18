/**
 * 一次性迁移：合并 suyan json + suggest blocks + entertainment.enabled，生成 suyan-shared.json
 * 用法: npx ts-node scripts/migrate-suyan-settings-merge.ts
 */

import fs from "fs";
import path from "path";
import type { SuyanSettingFile } from "../src/services/settingsFiles.service";

const SETTINGS_DIR = path.join(process.cwd(), "data", "settings");
const SUYAN_DIR = path.join(SETTINGS_DIR, "suyan");
const BLOCKS_DIR = path.join(SETTINGS_DIR, "suyan-suggest-blocks");
const ENTERTAINMENT_FILE = path.join(SETTINGS_DIR, "entertainment.json");
const SHARED_FILE = path.join(SETTINGS_DIR, "suyan-shared.json");

type LegacyEntertainment = {
  suyanSuffixes?: string[];
  relations?: string[];
  temperature?: number;
  suggestBlockIntro?: string;
  relationHints?: Record<string, string>;
  relationGuidance?: Record<string, string>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function main(): void {
  if (!fs.existsSync(SUYAN_DIR)) {
    throw new Error(`SETTINGS_MISSING:${SUYAN_DIR}`);
  }

  const entertainment: LegacyEntertainment = fs.existsSync(ENTERTAINMENT_FILE)
    ? readJson(ENTERTAINMENT_FILE)
    : {};
  const entertainmentIds = new Set(entertainment.suyanSuffixes ?? []);

  let merged = 0;
  for (const file of fs.readdirSync(SUYAN_DIR).filter((f) => f.endsWith(".json"))) {
    const suyanId = file.replace(/\.json$/, "");
    const filePath = path.join(SUYAN_DIR, file);
    const data = readJson<SuyanSettingFile & { suggestBlock?: string; entertainment?: { enabled?: boolean } }>(
      filePath,
    );

    const blockPath = path.join(BLOCKS_DIR, `${suyanId}.txt`);
    const suggestBlock =
      typeof data.suggestBlock === "string"
        ? data.suggestBlock.trimEnd()
        : fs.existsSync(blockPath)
          ? fs.readFileSync(blockPath, "utf8").trimEnd()
          : "";

    const enabled =
      typeof data.entertainment?.enabled === "boolean" ? data.entertainment.enabled : entertainmentIds.has(suyanId);

    const mergedData: SuyanSettingFile = {
      suyanId: data.suyanId ?? suyanId,
      summary: data.summary?.trim() ?? "",
      infoItems: data.infoItems ?? [],
      suggestBlock,
      entertainment: { enabled },
    };

    fs.writeFileSync(filePath, `${JSON.stringify(mergedData, null, 2)}\n`, "utf8");
    merged += 1;
  }

  const shared = {
    entertainment: {
      relations: entertainment.relations ?? ["ambiguous", "friend", "best_friend"],
      temperature: entertainment.temperature ?? 0.92,
      suggestBlockIntro: entertainment.suggestBlockIntro ?? "",
      relationHints: entertainment.relationHints ?? {},
    },
  };
  if (!shared.entertainment.suggestBlockIntro.trim()) {
    throw new Error("SETTINGS_MIGRATE: entertainment.suggestBlockIntro missing");
  }
  fs.writeFileSync(SHARED_FILE, `${JSON.stringify(shared, null, 2)}\n`, "utf8");

  if (fs.existsSync(BLOCKS_DIR)) {
    fs.rmSync(BLOCKS_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(ENTERTAINMENT_FILE)) {
    fs.unlinkSync(ENTERTAINMENT_FILE);
  }

  console.log(JSON.stringify({ merged, sharedFile: SHARED_FILE, removed: ["suyan-suggest-blocks", "entertainment.json"] }, null, 2));
}

main();
