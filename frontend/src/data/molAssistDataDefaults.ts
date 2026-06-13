import { defaultInfoItemsForMol } from "./molPersonaDefaults";
import type { AssistMolDataItem } from "../types/molData";

/** 由场景预设 infoItems 派生约束，供「素颜数据」页展示。 */
export function defaultAssistDataForMol(molId: string, category: string): AssistMolDataItem[] {
  const now = Date.now();
  const rows = defaultInfoItemsForMol(molId, category).filter((row) => row.title.trim() !== "示例");
  return rows.map((row, i) => ({
    id: `amd-def-${molId}-${i}`,
    type: "rule" as const,
    title: row.title,
    body: row.body,
    ts: now + i,
  }));
}
