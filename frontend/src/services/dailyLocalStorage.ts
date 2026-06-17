import type { DailyEntry, DailyEntryKind } from "../types/daily";

/** 私人日常记录，仅存于本机 localStorage，不同步、不对任何人展示。 */
const KEY_ITEMS = "aichat.daily.items";

function parseItems(raw: string | null): DailyEntry[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const kinds: DailyEntryKind[] = ["photo", "video", "text", "voice"];
    return v.filter(
      (x): x is DailyEntry =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as DailyEntry).id === "string" &&
        kinds.includes((x as DailyEntry).kind) &&
        typeof (x as DailyEntry).text === "string" &&
        typeof (x as DailyEntry).ts === "number",
    );
  } catch {
    return [];
  }
}

export function getDailyEntries(): DailyEntry[] {
  try {
    return parseItems(localStorage.getItem(KEY_ITEMS));
  } catch {
    return [];
  }
}

function setDailyEntries(items: DailyEntry[]): void {
  localStorage.setItem(KEY_ITEMS, JSON.stringify(items));
}

export function addDailyEntry(entry: DailyEntry): void {
  setDailyEntries([entry, ...getDailyEntries()]);
}

export function removeDailyEntry(id: string): void {
  setDailyEntries(getDailyEntries().filter((x) => x.id !== id));
}

export function updateDailyEntry(id: string, patch: Partial<Pick<DailyEntry, "text">>): void {
  const prev = getDailyEntries();
  setDailyEntries(prev.map((x) => (x.id === id ? { ...x, ...patch, id: x.id } : x)));
}

export function nextDailyEntryId(): string {
  return `daily-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
