import fs from "fs";
import path from "path";
import { DATA_ROOT } from "../config";

export const SETTINGS_DIR = path.join(DATA_ROOT, "settings");
export const RELATION_SETTINGS_DIR = path.join(SETTINGS_DIR, "relations");
export const SUYAN_SETTINGS_DIR = path.join(SETTINGS_DIR, "suyan");
export const SUYAN_SHARED_SETTINGS_FILE = path.join(SETTINGS_DIR, "suyan-shared.json");

export type SuyanInfoItemSeed = {
  title: string;
  body: string;
  source?: "custom" | "store";
};

export type SuyanSettingFile = {
  suyanId: string;
  summary: string;
  infoItems: SuyanInfoItemSeed[];
  suggestBlock: string;
  entertainment?: { enabled?: boolean };
};

export type RelationSettingFile = {
  type: string;
  label: string;
  suyanScene?: string;
  guidance: string;
  entertainmentGuidance?: string;
};

export type SuyanSharedSettingsFile = {
  entertainment: {
    relations: string[];
    temperature: number;
    suggestBlockIntro: string;
    relationHints: Record<string, string>;
  };
};

export function normalizeSuyanSettingsId(suyanId: string): string {
  return suyanId.replace(/^mw-seed-/, "");
}

export function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function loadJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return readJsonFile<T>(filePath);
  } catch {
    return null;
  }
}

/** @deprecated 兼容旧 settings/mols/{id}.json */
function loadLegacyMolSettingFile(base: string): SuyanSettingFile | null {
  const legacyPath = path.join(SETTINGS_DIR, "mols", `${base}.json`);
  const legacy = loadJsonFile<{
    molId?: string;
    suyanId?: string;
    summary?: string;
    infoItems?: SuyanInfoItemSeed[];
    suggestBlock?: string;
    entertainment?: { enabled?: boolean };
  }>(legacyPath);
  if (!legacy?.infoItems?.length) return null;
  return {
    suyanId: legacy.suyanId ?? legacy.molId ?? base,
    summary: legacy.summary?.trim() ?? "",
    infoItems: legacy.infoItems,
    suggestBlock: legacy.suggestBlock?.trim() ?? "",
    entertainment: legacy.entertainment,
  };
}

export function readSuyanSettingFile(suyanId: string): SuyanSettingFile | null {
  const base = normalizeSuyanSettingsId(suyanId);
  const filePath = path.join(SUYAN_SETTINGS_DIR, `${base}.json`);
  const fromFile = loadJsonFile<SuyanSettingFile>(filePath);
  if (fromFile?.infoItems?.length) {
    return {
      suyanId: fromFile.suyanId ?? base,
      summary: fromFile.summary?.trim() ?? "",
      infoItems: fromFile.infoItems,
      suggestBlock: fromFile.suggestBlock?.trim() ?? "",
      entertainment: fromFile.entertainment,
    };
  }
  return loadLegacyMolSettingFile(base);
}

export function reloadSettingsOnEachRead(): boolean {
  return process.env.SETTINGS_RELOAD_EACH_READ?.trim().toLowerCase() === "true";
}

/** @deprecated 使用 normalizeSuyanSettingsId */
export const normalizeMolSettingsId = normalizeSuyanSettingsId;
