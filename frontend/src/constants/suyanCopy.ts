/** 素颜：卸下伪装、放肆表达自我的表达人格 */
export const SUYAN = {
  name: "素颜",
  my: "我的素颜",
  world: "素颜世界",
  data: "素颜资料",
  infoManage: "素颜信息管理",
  overview: "素颜概览",
  select: "选择素颜",
  addFromWorld: "从素颜世界添加",
  openWorld: "打开素颜世界",
  joinMine: "加入我的素颜",
  suggest: "素颜建议",
  defaultBadge: "素",
  autoPrefix: "素颜",
  tagline: "卸下伪装，放肆表达自我",
  styleHint: "查看素颜的风格与约束",
  composeHint: "还没有素颜",
  myListHint: "请先在「我的素颜」里添加至少一个。",
  switchHint: "请补充该素颜的资料条目后再试。",
  fromWorldReadonly: "来自素颜世界 · 只读",
  fromWorldEditable: "来自素颜世界 · 可编辑本页内容",
  fromWorldBadge: "来自素颜世界",
  namePlaceholder: "名称或形象描述",
  deleteFromWorldConfirm: "该条目为你发布。是否从素颜世界同时删除（他人将无法再加入）？",
  assistChatSub: "与真人聊天 · 素颜辅助成稿",
  polishFor: "让素颜润色这段话",
  openSuggest: "打开素颜推荐",
  emptyAddHint: "前往素颜世界浏览并加入，加入后可在此维护资料与内容。",
  mineHint: "从素颜世界加入；详情在「素颜信息管理」中维护。",
  mineEmpty: "这里还没有素颜",
  mineEmptyDetail: "前往素颜世界浏览并加入。",
} as const;

const LEGACY_MOL_NAME_RE = /^MOL-(\d+)$/i;

/** 将旧版 MOL-N 自动名称显示为 素颜-N */
export function formatSuyanDisplayName(name: string): string {
  const trimmed = name.trim();
  const m = trimmed.match(LEGACY_MOL_NAME_RE);
  if (m) return `${SUYAN.autoPrefix}-${m[1]}`;
  return name;
}

/** 保存前规范化：若仍为旧版 MOL-N，写入 素颜-N */
export function normalizeLegacySuyanName(name: string): string {
  return formatSuyanDisplayName(name);
}

/** 后端/API 内部错误码 → 用户可见文案 */
export const SUYAN_API_ERROR_LABEL: Record<string, string> = {
  MOL_NOT_FOUND: "未找到该素颜",
  MOL_PERSONA_EMPTY: "该素颜资料为空，无法生成建议",
  NO_USER_MOLS: "尚未添加素颜，无法生成建议",
  MOL_PRIVATE_LIMIT_EXCEEDED: "自建素颜数量已达上限",
  MOL_UPLOAD_LIMIT_EXCEEDED: "上传数量已达上限",
};

export function suyanApiErrorLabel(code: string): string | undefined {
  return SUYAN_API_ERROR_LABEL[code.trim()];
}
