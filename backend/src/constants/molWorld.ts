/** 与前端 PRIMARY_SCENES 一致（不含「全部」），用于目录名与校验 */
export const MOL_PRIMARY_CATEGORIES = [
  "职场沟通",
  "朋友社交",
  "亲密关系",
  "家庭亲友",
  "陌生人破冰",
  "单向智能体",
  "内容表达",
] as const;

export type MolPrimaryCategory = (typeof MOL_PRIMARY_CATEGORIES)[number];

export function isValidPrimaryCategory(v: string): v is MolPrimaryCategory {
  return (MOL_PRIMARY_CATEGORIES as readonly string[]).includes(v);
}
