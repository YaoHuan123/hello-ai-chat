export const PLACEHOLDER_SUYAN_SUMMARY = "待完善";

/** @deprecated 使用 PLACEHOLDER_SUYAN_SUMMARY */
export const PLACEHOLDER_MOL_SUMMARY = PLACEHOLDER_SUYAN_SUMMARY;

export type MolPersonaInfoItem = {
  id: string;
  title: string;
  body: string;
  source?: "custom" | "store";
  softRemoved?: boolean;
};

export function defaultInfoItemsForMol(suyanId: string, _category?: string, now = Date.now()): MolPersonaInfoItem[] {
  const { loadSuyanPreset } = require("../services/settingsRuntime.service") as typeof import("../services/settingsRuntime.service");
  const rows = loadSuyanPreset(suyanId).infoItems;
  return rows.map((row, i) => ({
    id: `inf-${suyanId}-${now}-${i}`,
    ...row,
  }));
}

export function defaultSummaryForMol(suyanId: string, _category?: string): string {
  const { loadSuyanPreset } = require("../services/settingsRuntime.service") as typeof import("../services/settingsRuntime.service");
  return loadSuyanPreset(suyanId).summary;
}

export function needsPersonaBackfill(summary: string, infoItems: MolPersonaInfoItem[]): boolean {
  if (!infoItems.length) return true;
  const t = summary.trim();
  return !t || t === PLACEHOLDER_SUYAN_SUMMARY;
}

export function applyPersonaDefaults<
  T extends { id: string; summary: string; primaryCategory: string; infoItems: MolPersonaInfoItem[] },
>(record: T, now = Date.now()): T {
  const next = { ...record };
  if (!needsPersonaBackfill(record.summary, record.infoItems)) return next;
  if (!record.infoItems.length) {
    next.infoItems = defaultInfoItemsForMol(record.id, record.primaryCategory, now);
  }
  const t = record.summary.trim();
  if (!t || t === PLACEHOLDER_SUYAN_SUMMARY) {
    next.summary = defaultSummaryForMol(record.id, record.primaryCategory);
  }
  return next;
}
