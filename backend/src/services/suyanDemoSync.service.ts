import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";
import {
  normalizeSuyanSettingsId,
  SUYAN_SETTINGS_DIR,
  type SuyanSettingFile,
} from "./settingsFiles.service";

const DEMO_DIR = path.join(DATA_ROOT, "demo", "all-suyan");
const PERSONAS_DIR = path.join(DEMO_DIR, "personas");
const SUGGEST_BLOCKS_DIR = path.join(DEMO_DIR, "suggest-blocks");
const BUNDLED_SEED_DIR = path.resolve(__dirname, "../../settings-seed/suyan");

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
    throw new Error(`SUYAN_DEMO_EMPTY:${suyanId}`);
  }
  return { suyanId, summary: summary || infoItems[0]?.body || "", infoItems };
}

function readExistingEnabled(suyanId: string): boolean | undefined {
  const filePath = path.join(SUYAN_SETTINGS_DIR, `${suyanId}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as SuyanSettingFile;
  return data.entertainment?.enabled;
}

function writeSuyanSetting(
  suyanId: string,
  persona: Pick<SuyanSettingFile, "suyanId" | "summary" | "infoItems">,
  suggestBlock: string,
  entertainmentEnabled: boolean | undefined,
): void {
  const enabled = readExistingEnabled(suyanId) ?? entertainmentEnabled ?? false;
  const data: SuyanSettingFile = {
    ...persona,
    suggestBlock,
    entertainment: { enabled },
  };
  fs.mkdirSync(SUYAN_SETTINGS_DIR, { recursive: true });
  fs.writeFileSync(path.join(SUYAN_SETTINGS_DIR, `${suyanId}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** 为系统 seed 素颜补写缺失的 settings 文件（从 demo/all-suyan 读取）。 */
export function ensureSeedSuyanSettingsFromDemo(
  seedMolIds: readonly string[],
  entertainmentDefaults: Readonly<Record<string, boolean>> = {},
): void {
  for (const molId of seedMolIds) {
    const suyanId = normalizeSuyanSettingsId(molId);
    const filePath = path.join(SUYAN_SETTINGS_DIR, `${suyanId}.json`);
    if (fs.existsSync(filePath)) continue;

    const bundledPath = path.join(BUNDLED_SEED_DIR, `${suyanId}.json`);
    if (fs.existsSync(bundledPath)) {
      fs.mkdirSync(SUYAN_SETTINGS_DIR, { recursive: true });
      fs.copyFileSync(bundledPath, filePath);
      continue;
    }

    const personaPath = path.join(PERSONAS_DIR, `${suyanId}.txt`);
    if (!fs.existsSync(personaPath)) {
      throw new Error(`SETTINGS_MISSING_SUYAN:${suyanId} (no bundled seed or demo persona)`);
    }

    const raw = fs.readFileSync(personaPath, "utf8");
    const persona = parsePersonaTxt(raw, suyanId);
    const blockPath = path.join(SUGGEST_BLOCKS_DIR, `${suyanId}.txt`);
    const suggestBlock = fs.existsSync(blockPath) ? fs.readFileSync(blockPath, "utf8").trimEnd() : "";
    writeSuyanSetting(suyanId, persona, suggestBlock, entertainmentDefaults[suyanId]);
  }
}
