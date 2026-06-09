import type { AssistMolDataItem } from "../types/molData";

function keyFor(molId: string): string {
  return `aichat.mol.${encodeURIComponent(molId)}.items`;
}

function parse(raw: string | null): AssistMolDataItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is AssistMolDataItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as AssistMolDataItem).id === "string" &&
        ((x as AssistMolDataItem).type === "dialogue" || (x as AssistMolDataItem).type === "rule") &&
        typeof (x as AssistMolDataItem).title === "string" &&
        typeof (x as AssistMolDataItem).body === "string" &&
        typeof (x as AssistMolDataItem).ts === "number",
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

export function setAssistMolItems(molId: string, items: AssistMolDataItem[]): void {
  try {
    localStorage.setItem(keyFor(molId), JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function addAssistMolItem(molId: string, item: AssistMolDataItem): void {
  const prev = getAssistMolItems(molId);
  setAssistMolItems(molId, [...prev, item]);
}

export function updateAssistMolItem(molId: string, id: string, patch: Partial<AssistMolDataItem>): void {
  const prev = getAssistMolItems(molId);
  setAssistMolItems(
    molId,
    prev.map((x) => (x.id === id ? { ...x, ...patch, id: x.id } : x)),
  );
}

export function removeAssistMolItem(molId: string, id: string): void {
  setAssistMolItems(
    molId,
    getAssistMolItems(molId).filter((x) => x.id !== id),
  );
}
