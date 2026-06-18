import path from "path";
import fs from "fs";
import { isValidRelationType, type RelationType } from "../constants/relationTypes";
import {
  normalizeSuyanSettingsId,
  readJsonFile,
  readSuyanSettingFile,
  RELATION_SETTINGS_DIR,
  reloadSettingsOnEachRead,
  SUYAN_SETTINGS_DIR,
  SUYAN_SHARED_SETTINGS_FILE,
  type RelationSettingFile,
  type SuyanInfoItemSeed,
  type SuyanSharedSettingsFile,
} from "./settingsFiles.service";

type SuyanPreset = {
  summary: string;
  infoItems: SuyanInfoItemSeed[];
  suggestBlock: string;
  entertainmentEnabled: boolean;
};

const relationCache = new Map<string, RelationSettingFile>();
const suyanCache = new Map<string, SuyanPreset>();
let sharedCache: SuyanSharedSettingsFile | null = null;

function invalidateCaches(): void {
  relationCache.clear();
  suyanCache.clear();
  sharedCache = null;
}

function ensureSettingsLayout(): void {
  if (!fs.existsSync(SUYAN_SETTINGS_DIR)) {
    throw new Error(`SETTINGS_MISSING_DIR:${SUYAN_SETTINGS_DIR}`);
  }
  if (!fs.existsSync(RELATION_SETTINGS_DIR)) {
    throw new Error(`SETTINGS_MISSING_DIR:${RELATION_SETTINGS_DIR}`);
  }
  if (!fs.existsSync(SUYAN_SHARED_SETTINGS_FILE)) {
    throw new Error(`SETTINGS_MISSING_FILE:${SUYAN_SHARED_SETTINGS_FILE}`);
  }
  const suyanFiles = fs.readdirSync(SUYAN_SETTINGS_DIR).filter((f) => f.endsWith(".json"));
  if (suyanFiles.length === 0) {
    throw new Error(`SETTINGS_MISSING_SUYAN_FILES:${SUYAN_SETTINGS_DIR}`);
  }
}

function shouldReload(): boolean {
  ensureSettingsLayout();
  if (reloadSettingsOnEachRead()) {
    invalidateCaches();
    return true;
  }
  return false;
}

function loadRelationFile(type: RelationType): RelationSettingFile {
  if (!shouldReload() && relationCache.has(type)) {
    return relationCache.get(type)!;
  }
  const filePath = path.join(RELATION_SETTINGS_DIR, `${type}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`SETTINGS_MISSING_RELATION:${type}`);
  }
  const data = readJsonFile<RelationSettingFile>(filePath);
  relationCache.set(type, data);
  return data;
}

function loadSharedFile(): SuyanSharedSettingsFile {
  if (!shouldReload() && sharedCache) return sharedCache;
  sharedCache = readJsonFile<SuyanSharedSettingsFile>(SUYAN_SHARED_SETTINGS_FILE);
  return sharedCache;
}

export function loadRelationSetting(type: RelationType): RelationSettingFile {
  return loadRelationFile(type);
}

export function loadRelationGuidance(type: RelationType): string {
  return loadRelationFile(type).guidance.trim();
}

export function loadEntertainmentRelationGuidance(type: RelationType): string {
  return loadRelationFile(type).entertainmentGuidance?.trim() ?? "";
}

export function loadSuyanSharedSettings(): SuyanSharedSettingsFile {
  return loadSharedFile();
}

/** @deprecated 使用 loadSuyanSharedSettings().entertainment */
export function loadEntertainmentSettings(): SuyanSharedSettingsFile["entertainment"] {
  return loadSharedFile().entertainment;
}

export function loadSuyanPreset(suyanId: string): SuyanPreset {
  const base = normalizeSuyanSettingsId(suyanId);
  if (!shouldReload() && suyanCache.has(base)) {
    return suyanCache.get(base)!;
  }
  const file = readSuyanSettingFile(base);
  if (!file?.infoItems?.length) {
    throw new Error(`SETTINGS_MISSING_SUYAN:${base}`);
  }
  const preset: SuyanPreset = {
    summary: file.summary.trim(),
    infoItems: file.infoItems,
    suggestBlock: file.suggestBlock.trim(),
    entertainmentEnabled: file.entertainment?.enabled === true,
  };
  suyanCache.set(base, preset);
  return preset;
}

export function loadSuyanSuggestBlock(suyanId: string): string {
  return loadSuyanPreset(suyanId).suggestBlock;
}

export function isEntertainmentSuyanFromSettings(suyanId?: string | null): boolean {
  if (!suyanId?.trim()) return false;
  const base = normalizeSuyanSettingsId(suyanId);
  const file = readSuyanSettingFile(base);
  if (!file) return false;
  return file.entertainment?.enabled === true;
}

export function isEntertainmentRelationFromSettings(relationType?: RelationType | null): boolean {
  if (!relationType || !isValidRelationType(relationType)) return false;
  return loadSharedFile().entertainment.relations.includes(relationType);
}

export function ensureSettingsFilesSeeded(): void {
  ensureSettingsLayout();
}

/** @deprecated 使用 loadSuyanPreset */
export function loadMolPersonaPreset(molId: string, _category?: string): SuyanPreset {
  return loadSuyanPreset(molId);
}
