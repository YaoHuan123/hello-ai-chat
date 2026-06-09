import type { PassiveCloneItem } from "../types/passiveClone";
import { scheduleMomentsSync } from "./momentsSync";

const KEY_ITEMS = "aichat.passiveClone.items";
const KEY_COLLECTED = "aichat.passiveClone.collectedTopicIds";

function parseItems(raw: string | null): PassiveCloneItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is PassiveCloneItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as PassiveCloneItem).id === "string" &&
        ((x as PassiveCloneItem).type === "qa" || (x as PassiveCloneItem).type === "free") &&
        typeof (x as PassiveCloneItem).title === "string" &&
        typeof (x as PassiveCloneItem).body === "string" &&
        typeof (x as PassiveCloneItem).ts === "number",
    );
  } catch {
    return [];
  }
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export function getPassiveCloneItems(): PassiveCloneItem[] {
  try {
    return parseItems(localStorage.getItem(KEY_ITEMS));
  } catch {
    return [];
  }
}

export function setPassiveCloneItems(items: PassiveCloneItem[]): void {
  try {
    localStorage.setItem(KEY_ITEMS, JSON.stringify(items));
    scheduleMomentsSync(items);
  } catch {
    /* ignore */
  }
}

export function addPassiveCloneItem(item: PassiveCloneItem): void {
  setPassiveCloneItems([...getPassiveCloneItems(), item]);
}

export function updatePassiveCloneItem(id: string, patch: Partial<PassiveCloneItem>): void {
  const prev = getPassiveCloneItems();
  setPassiveCloneItems(prev.map((x) => (x.id === id ? { ...x, ...patch, id: x.id } : x)));
}

export function removePassiveCloneItem(id: string): void {
  setPassiveCloneItems(getPassiveCloneItems().filter((x) => x.id !== id));
}

export function getCollectedTopicIds(): string[] {
  try {
    return parseIds(localStorage.getItem(KEY_COLLECTED));
  } catch {
    return [];
  }
}

export function markTopicCollected(topicId: string): void {
  const prev = getCollectedTopicIds();
  if (prev.includes(topicId)) return;
  try {
    localStorage.setItem(KEY_COLLECTED, JSON.stringify([...prev, topicId]));
  } catch {
    /* ignore */
  }
}

export function isTopicCollected(topicId: string): boolean {
  return getCollectedTopicIds().includes(topicId);
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 从话题作答收录为「使用中」的问答条目 */
export function addQaFromTopic(topicId: string, questionTitle: string, answerBody: string): void {
  const item: PassiveCloneItem = {
    id: nextId("pc"),
    type: "qa",
    title: questionTitle,
    body: answerBody.trim(),
    ts: Date.now(),
    sourceTopicId: topicId,
  };
  addPassiveCloneItem(item);
  markTopicCollected(topicId);
}
