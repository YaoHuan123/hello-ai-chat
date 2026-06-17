import type { DailyEntry } from "../../types/daily";

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) return "今天";
  if (isSameDay(d, yesterday)) return "昨天";
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatRowTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export type DailyDayGroup = {
  dayKey: string;
  dayLabel: string;
  dayIso: string;
  items: DailyEntry[];
};

export function groupDailyEntriesByDay(items: DailyEntry[]): DailyDayGroup[] {
  const sorted = [...items].sort((a, b) => b.ts - a.ts);
  const groups: DailyDayGroup[] = [];
  for (const item of sorted) {
    const key = dayKey(item.ts);
    const last = groups[groups.length - 1];
    const d = new Date(item.ts);
    const dayIso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    if (last?.dayKey === key) {
      last.items.push(item);
    } else {
      groups.push({ dayKey: key, dayLabel: formatDayLabel(item.ts), dayIso, items: [item] });
    }
  }
  return groups;
}
