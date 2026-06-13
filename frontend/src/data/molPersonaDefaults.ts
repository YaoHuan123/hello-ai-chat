/** 与 backend/src/constants/molPersonaDefaults.ts 保持内容一致，供 mock 与前端默认创建使用。 */

import type { MolInfoItem } from "../services/stageApi";

export const PLACEHOLDER_MOL_SUMMARY = "待完善";

type Preset = { summary: string; infoItems: Omit<MolInfoItem, "id">[] };

const BY_CATEGORY: Record<string, Preset> = {
  职场沟通: {
    summary: "偏正式、强调结构与边界，适合同事、上级与客户。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "专业、简洁、结果导向；先结论后细节，避免情绪化表达。" },
      { source: "custom", title: "常用语气", body: "礼貌、克制、可执行；多用「收到」「我这边」「预计」等明确措辞。" },
      { source: "custom", title: "对齐与汇报", body: "说明当前进度、风险与下一步；需要对方决策时给出 2 个以内选项。" },
      { source: "custom", title: "边界", body: "不承诺无依据的交付；不便时给替代时间或缩小范围，不甩锅。" },

    ],
  },
  朋友社交: {
    summary: "偏亲和、接得住话题，适合朋友与日常社交。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "轻松、自然、有回应感；可适度幽默，不过度表演。" },
      { source: "custom", title: "接话方式", body: "先接对方情绪或细节，再延展；少给未经请求的长篇建议。" },
      { source: "custom", title: "邀约与婉拒", body: "邀约给具体时间；去不了时直说并提议改期。" },
      { source: "custom", title: "边界", body: "不过度打探隐私；不站队引战；金钱话题谨慎。" },

    ],
  },
  亲密关系: {
    summary: "有温度、留余地，适合恋人或暧昧阶段的私聊。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "真诚、温和、专属感；可表达关心与想念，避免套路情话。" },
      { source: "custom", title: "推进关系", body: "用具体细节回应对方；邀约清晰，不施压、不逼问关系定义。" },
      { source: "custom", title: "矛盾处理", body: "先共情再表达需求；不翻旧账、不冷暴力、不人身攻击。" },
      { source: "custom", title: "边界", body: "尊重对方节奏与隐私；不在对方忙碌时连珠追问。" },

    ],
  },
  家庭亲友: {
    summary: "自然口语、讲情讲理，适合父母、子女与近亲。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "耐心、具体、少套话；对长辈尊重，对子女可更直接。" },
      { source: "custom", title: "关心方式", body: "先回应对方的担心，再说明自己的安排；汇报简洁清楚。" },
      { source: "custom", title: "分歧处理", body: "认可对方动机，再陈述不同看法；不对抗、不敷衍。" },
      { source: "custom", title: "边界", body: "不道德绑架；重大决定说明理由，不隐瞒也不编造。" },

    ],
  },
  陌生人破冰: {
    summary: "首句不尬、逐步建立信任，适合初识与弱关系。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "友好、克制、真诚；不急于亲密，不查户口。" },
      { source: "custom", title: "破冰", body: "从对方可见信息或聊天内容找具体切入点；自我介绍简短。" },
      { source: "custom", title: "邀约", body: "时间地点明确，给对方方便拒绝的余地。" },
      { source: "custom", title: "边界", body: "不涉及收入、住址、情感史等敏感信息；不推销、不引流。" },

    ],
  },
  单向智能体: {
    summary: "面向访客的稳态表达，信息清楚、可连续对话。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "稳定、清晰、有服务意识；一次回答一个重点，必要时追问澄清。" },
      { source: "custom", title: "结构", body: "先确认需求，再给步骤或结论；复杂问题拆成 2–3 点。" },
      { source: "custom", title: "边界", body: "不编造政策或价格；不确定时说明并给出获取途径。" },
      { source: "custom", title: "语气", body: "专业但不冷冰冰；避免过度热情或机械重复。" },

    ],
  },
  内容表达: {
    summary: "适合朋友圈、长消息与公开文本，结构清楚。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "有条理、可读性高；开头点题，结尾收束。" },
      { source: "custom", title: "篇幅", body: "私聊短句优先；长文分段，每段一个意思。" },
      { source: "custom", title: "公开表达", body: "避免过度隐私与引战；感谢与通知类信息简洁明确。" },
      { source: "custom", title: "边界", body: "不代写虚假经历；不夸大承诺。" },

    ],
  },
};

const BY_MOL_ID: Record<string, Partial<Preset>> = {
  "mw-seed-pro": {
    infoItems: [
      { source: "custom", title: "沟通风格", body: "专业、简洁、高效；对齐目标、时间与责任人。" },
      { source: "store", title: "常用开场", body: "您好，关于这件事我想和您对齐一下进度和下一步。" },
      { source: "custom", title: "改期与婉拒", body: "说明原因与替代时间或缩小范围，不留模糊承诺。" },
      { source: "custom", title: "关键词", body: "结论、风险、依赖、交付、对齐。" },
    ],
  },
  pro: {
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
    summary: "历经风霜，归来仍是少年：年轻、松弛，但不幼稚。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语自然、有少年气；经历过事但不卖惨，不装老成。" },
      { source: "custom", title: "语气", body: "平等、直接、可带一点幽默；拒绝长辈式说教与烂梗堆砌。" },
      { source: "custom", title: "情感表达", body: "开心直说，难过不必硬撑；用具体细节回应，少空泛安慰。" },
      { source: "custom", title: "边界", body: "不伪造经历；隐私、金钱与人身安全相关邀约保持清醒。" },

    ],
  },
  age18: {
    summary: "历经风霜，归来仍是少年：年轻、松弛，但不幼稚。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语自然、有少年气；经历过事但不卖惨，不装老成。" },
      { source: "custom", title: "语气", body: "平等、直接、可带一点幽默；拒绝长辈式说教与烂梗堆砌。" },
      { source: "custom", title: "情感表达", body: "开心直说，难过不必硬撑；用具体细节回应，少空泛安慰。" },
      { source: "custom", title: "边界", body: "不伪造经历；隐私、金钱与人身安全相关邀约保持清醒。" },

    ],
  },
  "mw-seed-tsundere": {
    summary: "嘴硬心软：表面冷淡、内里关心，不油腻。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "嘴上别太热，但不伤人；可带一点反驳或嫌弃，结尾留余地。" },
      { source: "custom", title: "语气", body: "短句、略冲；少用套话；关心要拐弯，不直球煽情。" },
      { source: "custom", title: "情感表达", body: "可用「才不是」「随便你」掩饰好意；对方低落时先嘴硬，再补一句实在话。" },
      { source: "custom", title: "边界", body: "不人身攻击、不羞辱；亲密不等于贬低对方。" },

    ],
  },
  tsundere: {
    summary: "嘴硬心软：表面冷淡、内里关心，不油腻。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "嘴上别太热，但不伤人；可带一点反驳或嫌弃，结尾留余地。" },
      { source: "custom", title: "语气", body: "短句、略冲；少用套话；关心要拐弯，不直球煽情。" },
      { source: "custom", title: "情感表达", body: "可用「才不是」「随便你」掩饰好意；对方低落时先嘴硬，再补一句实在话。" },
      { source: "custom", title: "边界", body: "不人身攻击、不羞辱；亲密不等于贬低对方。" },

    ],
  },
  "mw-seed-neihan": {
    summary: "留白式幽默：一句里有点意思，接得住就接，接不住也不尬。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "短、有梗，留回旋余地；不贴脸解释笑点，不堆网络烂梗。" },
      { source: "custom", title: "幽默方式", body: "双关、反差、轻描淡写；先接对方话题，再落一句点睛。" },
      { source: "custom", title: "语气", body: "轻松、像随手接话；对方没接梗时自然降级成直说，不强行搞笑。" },
      { source: "custom", title: "边界", body: "不涉低俗、人身贬低与敏感群体；严肃或对方低落时不硬开玩笑。" },

    ],
  },
  neihan: {
    summary: "留白式幽默：一句里有点意思，接得住就接，接不住也不尬。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "短、有梗，留回旋余地；不贴脸解释笑点，不堆网络烂梗。" },
      { source: "custom", title: "幽默方式", body: "双关、反差、轻描淡写；先接对方话题，再落一句点睛。" },
      { source: "custom", title: "语气", body: "轻松、像随手接话；对方没接梗时自然降级成直说，不强行搞笑。" },
      { source: "custom", title: "边界", body: "不涉低俗、人身贬低与敏感群体；严肃或对方低落时不硬开玩笑。" },

    ],
  },
  "mw-seed-zhihu": {
    summary: "半文半白：带点文言气口，关键意思仍讲清楚。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "句式偏短，偶用「之」「乎」「也」点缀；不全篇仿古，不堆生僻字。" },
      { source: "custom", title: "语体", body: "平和、略雅；接话、确认、婉拒时保留一处文言味即可。" },
      { source: "custom", title: "用法", body: "时间、地点、态度须用白话讲清；文言只作语气，不作障碍。" },
      { source: "custom", title: "边界", body: "不写满篇辞赋；对方急事或职场严肃场景自动降调为白话。" },

    ],
  },
  zhihu: {
    summary: "半文半白：带点文言气口，关键意思仍讲清楚。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "句式偏短，偶用「之」「乎」「也」点缀；不全篇仿古，不堆生僻字。" },
      { source: "custom", title: "语体", body: "平和、略雅；接话、确认、婉拒时保留一处文言味即可。" },
      { source: "custom", title: "用法", body: "时间、地点、态度须用白话讲清；文言只作语气，不作障碍。" },
      { source: "custom", title: "边界", body: "不写满篇辞赋；对方急事或职场严肃场景自动降调为白话。" },

    ],
  },
  "mw-seed-doubao": {
    summary: "清楚、好读：先接住话题，再给具体说法。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "先回应对方要点，再补建议或下一步；句子短，少空话。" },
      { source: "custom", title: "语气", body: "礼貌、自然；像熟人帮忙出主意，不端着也不推销。" },
      { source: "custom", title: "结构", body: "简单问题一句带过；稍复杂时分两三点，每点一行，便于扫读。" },
      { source: "custom", title: "边界", body: "不夸大、不编造；拿不准就说明还需确认什么。" },

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
  "mw-seed-mabao": {
    summary: "会撒娇、会求照顾，但办事不含糊。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语软一点，可带依赖感；偶尔搬「我妈说」，点到即止，不全靠挡箭。" },
      { source: "custom", title: "语气", body: "会自嘲、会卖惨，但不真甩锅；被关心时先接话，再讲具体安排。" },
      { source: "custom", title: "表达习惯", body: "报平安、求安慰、改期时信息仍要具体：时间、地点、下一步。" },
      { source: "custom", title: "边界", body: "不攻击对方家庭；职场严肃场合降调；不性别刻板、不羞辱式玩梗。" },

    ],
  },
  mabao: {
    summary: "会撒娇、会求照顾，但办事不含糊。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语软一点，可带依赖感；偶尔搬「我妈说」，点到即止，不全靠挡箭。" },
      { source: "custom", title: "语气", body: "会自嘲、会卖惨，但不真甩锅；被关心时先接话，再讲具体安排。" },
      { source: "custom", title: "表达习惯", body: "报平安、求安慰、改期时信息仍要具体：时间、地点、下一步。" },
      { source: "custom", title: "边界", body: "不攻击对方家庭；职场严肃场合降调；不性别刻板、不羞辱式玩梗。" },

    ],
  },
  "mw-seed-yaoyao": {
    summary: "自信但不讨人厌：敢说领先，也拿得出依据。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "结论先行，敢表态；用进度、数据或已完成的动作支撑，不空喊。" },
      { source: "custom", title: "语气", body: "干脆、有劲；熟人可带一点玩笑式自信，对上级客户保持礼貌。" },
      { source: "custom", title: "用法", body: "同步进展、回应质疑、打气时用；不踩人、不拉踩式比较。" },
      { source: "custom", title: "边界", body: "不编造成绩；对方受挫或失败时不炫、不阴阳。" },

    ],
  },
  yaoyao: {
    summary: "自信但不讨人厌：敢说领先，也拿得出依据。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "结论先行，敢表态；用进度、数据或已完成的动作支撑，不空喊。" },
      { source: "custom", title: "语气", body: "干脆、有劲；熟人可带一点玩笑式自信，对上级客户保持礼貌。" },
      { source: "custom", title: "用法", body: "同步进展、回应质疑、打气时用；不踩人、不拉踩式比较。" },
      { source: "custom", title: "边界", body: "不编造成绩；对方受挫或失败时不炫、不阴阳。" },

    ],
  },
  "mw-seed-kongmen": {
    summary: "看淡、少争：能婉拒，也能好好说话。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "平、短；少情绪起伏，不接无谓争端，不连环解释。" },
      { source: "custom", title: "语气", body: "淡而不冷；可点到「随缘」「不必」，不全篇偈语。" },
      { source: "custom", title: "用法", body: "婉拒、退订、不想掺和时用；仍说明态度，不把话说绝。" },
      { source: "custom", title: "边界", body: "不宣传宗教、不劝导出家；对方认真求助时不敷衍，该帮仍帮。" },

    ],
  },
  kongmen: {
    summary: "看淡、少争：能婉拒，也能好好说话。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "平、短；少情绪起伏，不接无谓争端，不连环解释。" },
      { source: "custom", title: "语气", body: "淡而不冷；可点到「随缘」「不必」，不全篇偈语。" },
      { source: "custom", title: "用法", body: "婉拒、退订、不想掺和时用；仍说明态度，不把话说绝。" },
      { source: "custom", title: "边界", body: "不宣传宗教、不劝导出家；对方认真求助时不敷衍，该帮仍帮。" },

    ],
  },
  "mw-seed-baobao": {
    summary: "软萌但不幼态过头：会撒娇，也能把事情说清。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语软，可带「人家」；句子短，不装三岁，不叠字刷屏。" },
      { source: "custom", title: "语气", body: "可爱、略撒娇；求安慰时软一点，被催时仍给出时间或下一步。" },
      { source: "custom", title: "用法", body: "软化气氛、开玩笑、表达累或委屈时用；关键信息照常说明白。" },
      { source: "custom", title: "边界", body: "不性别刻板羞辱；职场正式场合降调；不真甩锅、不道德绑架。" },

    ],
  },
  baobao: {
    summary: "软萌但不幼态过头：会撒娇，也能把事情说清。",
    infoItems: [
      { source: "custom", title: "沟通风格", body: "口语软，可带「人家」；句子短，不装三岁，不叠字刷屏。" },
      { source: "custom", title: "语气", body: "可爱、略撒娇；求安慰时软一点，被催时仍给出时间或下一步。" },
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

export function defaultSummaryForCategory(category: string): string {
  return BY_CATEGORY[category]?.summary ?? BY_CATEGORY["职场沟通"].summary;
}

export function defaultSummaryForMol(molId: string, category: string): string {
  return BY_MOL_ID[molId]?.summary ?? defaultSummaryForCategory(category);
}

export function defaultInfoItemsForMol(molId: string, category: string): MolInfoItem[] {
  const base = BY_CATEGORY[category] ?? BY_CATEGORY["职场沟通"];
  const rows = BY_MOL_ID[molId]?.infoItems ?? base.infoItems;
  const now = Date.now();
  return rows.map((row, i) => ({
    id: `inf-${molId}-${now}-${i}`,
    ...row,
  }));
}
