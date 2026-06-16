import type { RelationType } from "./relationTypes";

/** 各关系类型的语气、边界与亲密度要点；不写易触发场景联想的具体设定 */
export const RELATION_SUGGEST_GUIDANCE: Record<RelationType, string> = {
  lover: "语气亲密自然，可表达关心与情绪；避免过于正式、疏离或像对陌生人说话。",
  ambiguous: "语气轻松含蓄，可略带试探与趣味；保持分寸，避免过分直白的承诺或越界玩笑。",
  parent: "语气尊敬体贴，回应关心与需求；避免网络梗、过于随意或像对同龄人开玩笑。",
  child: "语气温和关切，可表达理解与支持；避免居高临下说教或过于生硬的命令式表达。",
  sibling: "语气亲近随意，可打趣但不过线；避免过于客套或像对上级汇报。",
  best_friend: "语气亲密直率，可表达感受；避免过度客套或像初次见面般拘谨。",
  friend: "语气友好自然，保持轻松但不越界；避免过于亲密或像对恋人撒娇。",
  classmate: "语气同龄、轻松；勿默认仍在读书或校园场景。",
  colleague: "语气专业得体，简洁清晰；避免过度私密话题或过于随意的网络用语。",
  superior: "语气尊重、简明，先回应要点再补充；避免命令式、抱怨或过度随意。",
  client: "语气礼貌专业，重视对方诉求与边界；避免过于熟络、私人话题或情绪化表达。",
  acquaintance: "语气友好但留有余地；避免过度热情或假设很熟。",
  other: "语气中性礼貌，根据上下文自然接话；避免预设亲密度或使用过于私密的称呼。",
};

export function relationSuggestGuidance(type: RelationType): string {
  return RELATION_SUGGEST_GUIDANCE[type];
}
