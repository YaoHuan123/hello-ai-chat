import { RELATION_LABELS, type RelationType } from "./relationTypes";
import { loadPromptFile } from "../services/promptLoader";
import {
  isEntertainmentRelationFromSettings,
  isEntertainmentSuyanFromSettings,
  loadEntertainmentRelationGuidance,
  loadSuyanSharedSettings,
} from "../services/settingsRuntime.service";
import { normalizeSuyanSettingsId } from "../services/settingsFiles.service";

export function normalizeSuyanSuffix(suyanId: string): string {
  return normalizeSuyanSettingsId(suyanId);
}

export function isEntertainmentSuyanId(suyanId?: string | null): boolean {
  return isEntertainmentSuyanFromSettings(suyanId);
}

/** @deprecated 使用 isEntertainmentSuyanId */
export const isEntertainmentMolId = isEntertainmentSuyanId;

export function shouldBoostEntertainment(suyanId?: string | null, relationType?: RelationType | null): boolean {
  if (!relationType || !isEntertainmentSuyanId(suyanId)) return false;
  return isEntertainmentRelationFromSettings(relationType);
}

export function entertainmentRelationGuidance(relationType: RelationType): string {
  return loadEntertainmentRelationGuidance(relationType);
}

export function buildEntertainmentRelationBlock(relationType: RelationType): string {
  const label = RELATION_LABELS[relationType];
  const guidance = entertainmentRelationGuidance(relationType);
  if (!guidance) return "";
  return loadPromptFile("suggest-entertainment-relation-block.txt")
    .replaceAll("{{RELATION_LABEL}}", label)
    .replaceAll("{{RELATION_GUIDANCE}}", guidance);
}

export function buildEntertainmentSuggestBlock(relationType: RelationType): string {
  const cfg = loadSuyanSharedSettings().entertainment;
  const hint = cfg.relationHints[relationType];
  if (!hint?.trim()) {
    throw new Error(`SETTINGS_MISSING_ENTERTAINMENT_HINT:${relationType}`);
  }
  return cfg.suggestBlockIntro.replace("{{RELATION_HINT}}", hint);
}

export function entertainmentSuggestTemperature(): number {
  return loadSuyanSharedSettings().entertainment.temperature;
}

export function buildSuggestRelationLine(relationType: RelationType): string {
  return loadPromptFile("suggest-relation-line.txt").replaceAll("{{RELATION_LABEL}}", RELATION_LABELS[relationType]);
}
