import type { AssistMolDataItem } from "../types/molData";
import { defaultAssistDataForMol } from "../data/molAssistDataDefaults";

function keyFor(molId: string): string {
  return `aichat.mol.${encodeURIComponent(molId)}.items`;
}

function withoutSamples(items: AssistMolDataItem[]): AssistMolDataItem[] {
  return items.filter((x) => x.type === "rule" && x.title.trim() !== "示例");
}

function parse(raw: string | null): AssistMolDataItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return withoutSamples(
      v.filter(
        (x): x is AssistMolDataItem =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as AssistMolDataItem).id === "string" &&
          (x as AssistMolDataItem).type === "rule" &&
          typeof (x as AssistMolDataItem).title === "string" &&
          typeof (x as AssistMolDataItem).body === "string" &&
          typeof (x as AssistMolDataItem).ts === "number",
      ),
    );
  } catch {
    return [];
  }
}

export function getAssistMolItems(molId: string): AssistMolDataItem[] {
  try {
    return parse(localStorage.getItem(keyFor(molId)));
  } catch {
    return [];
  }
}

/** 若本地尚无数据，按场景写入默认约束。返回是否写入或迁移。 */
export function ensureAssistMolDefaults(molId: string, category: string): boolean {
  try {
    const raw = localStorage.getItem(keyFor(molId));
    if (raw) {
      const cleaned = parse(raw);
      let prevLen = 0;
      try {
        const v = JSON.parse(raw) as unknown;
        if (Array.isArray(v)) prevLen = v.length;
      } catch {
        /* ignore */
      }
      if (prevLen !== cleaned.length) {
        setAssistMolItems(molId, cleaned);
        return true;
      }
      if (cleaned.length > 0) return false;
    }
  } catch {
    /* ignore */
  }
  setAssistMolItems(molId, defaultAssistDataForMol(molId, category));
  return true;
}

export function clearAssistMolItems(molId: string): void {
  try {
    localStorage.removeItem(keyFor(molId));
  } catch {
    /* ignore */
  }
}

export function setAssistMolItems(molId: string, items: AssistMolDataItem[]): void {
  try {
    localStorage.setItem(keyFor(molId), JSON.stringify(withoutSamples(items)));
  } catch {
    /* ignore */
  }
}
