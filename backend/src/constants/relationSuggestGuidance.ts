import type { RelationType } from "./relationTypes";
import { loadRelationGuidance } from "../services/settingsRuntime.service";

/** 各关系类型的语气、边界与亲密度要点；运行时从 data/settings/relations/*.json 加载 */
export function relationSuggestGuidance(type: RelationType): string {
  return loadRelationGuidance(type);
}
