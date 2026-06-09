import type { GuardianScene } from "../constants/guardianCatalog";

export type GuardianRiskLevel = "low" | "medium" | "high";

export type GuardianOwnerHint = {
  peerMessageId: number;
  level: GuardianRiskLevel;
  label: string;
  hint: string;
  ts: number;
};

type Rule = { pattern: RegExp; label: string; hint: string; level: GuardianRiskLevel };

const COMMON_HIGH: Rule[] = [
  { pattern: /查手机|定位|跟踪|监视/i, label: "隐私越界", hint: "对方可能在打探或监控你的隐私，不必立刻配合。", level: "high" },
  { pattern: /必须|赶紧|马上|现在就|最后一次/i, label: "施压催促", hint: "对话节奏被推高，你可以慢下来，不必当场给结论。", level: "high" },
  { pattern: /不爱我|不重视我|别人都|不像话/i, label: "情感绑架", hint: "对方在用情绪施压，这不等于你欠一个表态。", level: "high" },
];

const SCENE_RULES: Record<GuardianScene, Rule[]> = {
  恋爱暧昧: [
    { pattern: /见面|酒店|来我家|单独/i, label: "边界试探", hint: "邀约可能过快，你有权决定时间、地点和节奏。", level: "medium" },
    { pattern: /女朋友|男朋友|在一起|定关系/i, label: "关系逼定", hint: "关系定义不必在压力下当场完成。", level: "medium" },
    { pattern: /发照片|素颜|身材|穿.*拍/i, label: "身体边界", hint: "涉及身体或私密照片的要求，你可以拒绝。", level: "high" },
    ...COMMON_HIGH,
  ],
  校园师生: [
    { pattern: /没用|不行|太差|就你这水平/i, label: "人格贬低", hint: "批评若指向人格而非事情，不必全盘接受。", level: "high" },
    { pattern: /今晚|周末|随时|24小时/i, label: "时间越界", hint: "非工作时间的要求可以商量边界。", level: "medium" },
    { pattern: /退学|开除|后果自负/i, label: "威胁惩罚", hint: "涉及惩罚威胁时，可要求书面说明与正规渠道。", level: "high" },
    ...COMMON_HIGH,
  ],
  家庭亲子: [
    { pattern: /为你好|白养|不孝|断绝/i, label: "愧疚施压", hint: "亲情不等于服从，你的感受也需要被尊重。", level: "high" },
    { pattern: /相亲|结婚|生孩子|工作必须/i, label: "人生干涉", hint: "职业与婚恋节奏可以由你自己决定。", level: "medium" },
    { pattern: /断供|赶出去|没收/i, label: "控制威胁", hint: "以经济或居住威胁施压时，先稳住边界再沟通。", level: "high" },
    ...COMMON_HIGH,
  ],
};

export function assessPeerMessageRisk(scene: GuardianScene, peerText: string, peerMessageId: number): GuardianOwnerHint | null {
  const t = peerText.trim();
  if (!t) return null;

  const rules = SCENE_RULES[scene];
  let best: { rule: Rule; score: number } | null = null;

  for (const rule of rules) {
    if (!rule.pattern.test(t)) continue;
    const score = rule.level === "high" ? 3 : rule.level === "medium" ? 2 : 1;
    if (!best || score > best.score) {
      best = { rule, score };
    }
  }

  if (!best) {
    if (t.length >= 40 && (t.includes("?") || t.includes("？") || /你怎么|为什么不|到底/i.test(t))) {
      return {
        peerMessageId,
        level: "low",
        label: "追问施压",
        hint: "对方在追问或堆叠问题，你可以只回答你愿意回答的部分。",
        ts: Date.now(),
      };
    }
    return null;
  }

  return {
    peerMessageId,
    level: best.rule.level,
    label: best.rule.label,
    hint: best.rule.hint,
    ts: Date.now(),
  };
}
