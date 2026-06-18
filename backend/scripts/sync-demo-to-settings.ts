/**
 * 将 data/demo/all-suyan 人格与成稿要点同步到 data/settings/suyan/{id}.json（合并格式）
 * 用法: npx ts-node scripts/sync-demo-to-settings.ts
 */

import fs from "fs";
import path from "path";
import { initDb } from "../src/db/init";
import type { SuyanSettingFile } from "../src/services/settingsFiles.service";
import { SUYAN_SETTINGS_DIR } from "../src/services/settingsFiles.service";
import { ensureSettingsFilesSeeded } from "../src/services/settingsRuntime.service";
import { MolWorldService } from "../src/services/molWorld.service";

const DEMO_DIR = path.join(process.cwd(), "data", "demo", "all-suyan");
const PERSONAS_DIR = path.join(DEMO_DIR, "personas");
const SUGGEST_BLOCKS_DIR = path.join(DEMO_DIR, "suggest-blocks");
const MOL_WORLD_DIR = path.join(process.cwd(), "data", "mol-world");

function parsePersonaTxt(raw: string, suyanId: string): Pick<SuyanSettingFile, "suyanId" | "summary" | "infoItems"> {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let summary = "";
  const infoItems: { title: string; body: string; source: "custom" }[] = [];

  for (const line of lines) {
    const m = line.match(/^\[[^\]]+\]\s*([^:：]+)\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const title = m[1].trim();
    const body = m[2].trim();
    if (title === "简介") {
      summary = body;
    } else {
      infoItems.push({ title, body, source: "custom" });
    }
  }

  if (!summary && infoItems.length === 0) {
    throw new Error(`empty persona: ${suyanId}`);
  }
  return { suyanId, summary: summary || infoItems[0]?.body || "", infoItems };
}

function readExistingEnabled(suyanId: string): boolean | undefined {
  const filePath = path.join(SUYAN_SETTINGS_DIR, `${suyanId}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as SuyanSettingFile;
  return data.entertainment?.enabled;
}

function main(): void {
  fs.mkdirSync(SUYAN_SETTINGS_DIR, { recursive: true });

  const personaFiles = fs.readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".txt"));
  let nPersona = 0;
  for (const file of personaFiles) {
    const suyanId = file.replace(/\.txt$/, "");
    const raw = fs.readFileSync(path.join(PERSONAS_DIR, file), "utf8");
    const persona = parsePersonaTxt(raw, suyanId);
    const blockPath = path.join(SUGGEST_BLOCKS_DIR, `${suyanId}.txt`);
    const suggestBlock = fs.existsSync(blockPath) ? fs.readFileSync(blockPath, "utf8").trimEnd() : "";
    const enabled = readExistingEnabled(suyanId) ?? false;
    const data: SuyanSettingFile = {
      ...persona,
      suggestBlock,
      entertainment: { enabled },
    };
    fs.writeFileSync(path.join(SUYAN_SETTINGS_DIR, `${suyanId}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
    nPersona += 1;
  }

  console.log(`synced ${nPersona} merged suyan settings → ${SUYAN_SETTINGS_DIR}`);

  ensureSettingsFilesSeeded();
  initDb();
  const molWorld = new MolWorldService();
  molWorld.syncSeedPersonasFromSettings();
  let nMolWorld = 0;
  for (const cat of fs.readdirSync(MOL_WORLD_DIR)) {
    const dir = path.join(MOL_WORLD_DIR, cat);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.startsWith("mw-seed-") && f.endsWith(".json"))) {
      nMolWorld += 1;
    }
  }
  console.log(`refreshed mol-world seed personas (${nMolWorld} seed files under ${MOL_WORLD_DIR})`);
}

main();
