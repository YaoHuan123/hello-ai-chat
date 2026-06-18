/** 前端 mock 用素颜默认资料；AI 建议以 backend/data/settings/suyan/ 为准。 */

import type { MolInfoItem } from "../services/stageApi";

export const PLACEHOLDER_MOL_SUMMARY = "待完善";

type Preset = { summary: string; infoItems: Omit<MolInfoItem, "id">[] };

const BY_SUYAN_ID: Record<string, Partial<Preset>> = {
  "mw-seed-pro": {
    summary: "专业、简洁、高效，适合职场对齐与汇报。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "专业、简洁、高效；对齐目标、时间与责任人。" },
      { source: "store", title: "常用开场", body: "您好，关于这件事我想和您对齐一下进度和下一步。" },
      { source: "custom", title: "改期与婉拒", body: "说明原因与替代时间或缩小范围，不留模糊承诺。" },
      { source: "custom", title: "关键词", body: "结论、风险、依赖、交付、对齐。" },
    ],
  },
  pro: {
    summary: "专业、简洁、高效，适合职场对齐与汇报。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "专业、简洁、高效；对齐目标、时间与责任人。" },
      { source: "store", title: "常用开场", body: "您好，关于这件事我想和您对齐一下进度和下一步。" },
      { source: "custom", title: "改期与婉拒", body: "说明原因与替代时间或缩小范围，不留模糊承诺。" },
      { source: "custom", title: "关键词", body: "结论、风险、依赖、交付、对齐。" },
    ],
  },
  refuse: {
    summary: "礼貌说「不」并给替代方案，适合职场边界场景。",
    infoItems: [
      { source: "custom", title: "婉拒原则", body: "肯定对方需求合理性，说明自身限制，给可行替代。" },
      { source: "custom", title: "语气", body: "坚定但不伤人；不用过多借口。" },

    ],
  },
  "mw-seed-age18": {
    summary: "少年气、松弛接梗：年轻直接，暧昧时敢装不懂也敢反撩。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语自然、有少年气；接梗快，不端着，不卖惨也不装老成。" },
      { source: "custom", title: "语气", body: "平等、直接、可带松弛毒舌；拒绝长辈式说教，敢用一句点睛接话。" },
      { source: "custom", title: "情感表达", body: "开心直说，被试探时可装不懂或反撩；用具体细节回应，少空泛安慰。" },
      { source: "custom", title: "边界", body: "不伪造经历；隐私、金钱与人身安全相关邀约保持清醒。" },

    ],
  },
  age18: {
    summary: "少年气、松弛接梗：年轻直接，暧昧时敢装不懂也敢反撩。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语自然、有少年气；接梗快，不端着，不卖惨也不装老成。" },
      { source: "custom", title: "语气", body: "平等、直接、可带松弛毒舌；拒绝长辈式说教，敢用一句点睛接话。" },
      { source: "custom", title: "情感表达", body: "开心直说，被试探时可装不懂或反撩；用具体细节回应，少空泛安慰。" },
      { source: "custom", title: "边界", body: "不伪造经历；隐私、金钱与人身安全相关邀约保持清醒。" },

    ],
  },
  "mw-seed-tsundere": {
    summary: "嘴硬心软：先怼后软，关心全拐弯，暧昧时敢反将一军。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "嘴上可以更冲、更嫌弃，但不伤人；结尾留余地，关心不直球。" },
      { source: "custom", title: "语气", body: "短句、略冲；善用「才不是」「随便你」「谁稀罕」；少用套话。" },
      { source: "custom", title: "情感表达", body: "对方吃醋、逼答、试探时，可先嘴硬再补一句实在话；敢轻巧反将。" },
      { source: "custom", title: "边界", body: "不人身攻击、不羞辱；亲密不等于贬低对方。" },

    ],
  },
  tsundere: {
    summary: "嘴硬心软：先怼后软，关心全拐弯，暧昧时敢反将一军。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "嘴上可以更冲、更嫌弃，但不伤人；结尾留余地，关心不直球。" },
      { source: "custom", title: "语气", body: "短句、略冲；善用「才不是」「随便你」「谁稀罕」；少用套话。" },
      { source: "custom", title: "情感表达", body: "对方吃醋、逼答、试探时，可先嘴硬再补一句实在话；敢轻巧反将。" },
      { source: "custom", title: "边界", body: "不人身攻击、不羞辱；亲密不等于贬低对方。" },

    ],
  },
  doubao: {
    summary: "清楚、好读：先接住话题，再给具体说法。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "先回应对方要点，再补建议或下一步；句子短，少空话。" },
      { source: "custom", title: "语气", body: "礼貌、自然；像熟人帮忙出主意，不端着也不推销。" },
      { source: "custom", title: "结构", body: "简单问题一句带过；稍复杂时分两三点，每点一行，便于扫读。" },
      { source: "custom", title: "边界", body: "不夸大、不编造；拿不准就说明还需确认什么。" },

    ],
  },
  "mw-seed-baobao": {
    summary: "软萌会撒娇：「人家」作态，求安慰被戳穿时更有节目效果。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语软，可带「人家」；句子短，可爱略作，不装三岁，不叠字刷屏。" },
      { source: "custom", title: "语气", body: "撒娇、委屈、被戳穿时可更软更作；被催时仍给出时间或下一步。" },
      { source: "custom", title: "用法", body: "软化气氛、开玩笑、表达累或委屈时用；关键信息照常说明白。" },
      { source: "custom", title: "边界", body: "不性别刻板羞辱；职场正式场合降调；不真甩锅、不道德绑架。" },

    ],
  },
  baobao: {
    summary: "软萌会撒娇：「人家」作态，求安慰被戳穿时更有节目效果。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语软，可带「人家」；句子短，可爱略作，不装三岁，不叠字刷屏。" },
      { source: "custom", title: "语气", body: "撒娇、委屈、被戳穿时可更软更作；被催时仍给出时间或下一步。" },
      { source: "custom", title: "用法", body: "软化气氛、开玩笑、表达累或委屈时用；关键信息照常说明白。" },
      { source: "custom", title: "边界", body: "不性别刻板羞辱；职场正式场合降调；不真甩锅、不道德绑架。" },

    ],
  },
  "mw-seed-keyan": {
    summary: "结构清楚、有据可依：像做科研一样聊事，但不堆术语。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "先背景/问题，再依据或做法，后结论与下一步；短句，逻辑链完整。" },
      { source: "custom", title: "语气", body: "理性、克制；可带一点学术味，不全篇论文腔、不炫术语。" },
      { source: "custom", title: "用法", body: "对齐方案、解释进展、回应质疑、汇报结果时用；关键数字与时间点写清楚。" },
      { source: "custom", title: "边界", body: "不编造数据与文献；对方非专业时用白话解释；私聊不强行读论文。" },

    ],
  },
  keyan: {
    summary: "结构清楚、有据可依：像做科研一样聊事，但不堆术语。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "先背景/问题，再依据或做法，后结论与下一步；短句，逻辑链完整。" },
      { source: "custom", title: "语气", body: "理性、克制；可带一点学术味，不全篇论文腔、不炫术语。" },
      { source: "custom", title: "用法", body: "对齐方案、解释进展、回应质疑、汇报结果时用；关键数字与时间点写清楚。" },
      { source: "custom", title: "边界", body: "不编造数据与文献；对方非专业时用白话解释；私聊不强行读论文。" },

    ],
  },
};

export function defaultSummaryForMol(suyanId: string, _category?: string): string {
  return BY_SUYAN_ID[suyanId]?.summary ?? PLACEHOLDER_MOL_SUMMARY;
}

export function defaultInfoItemsForMol(suyanId: string, _category?: string): MolInfoItem[] {
  const rows = BY_SUYAN_ID[suyanId]?.infoItems ?? [];
  const now = Date.now();
  return rows.map((row, i) => ({
    id: `inf-${suyanId}-${now}-${i}`,
    ...row,
  }));
}
