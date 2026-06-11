import guardCampusChen from "./guardian-avatars/guard-campus-chen.svg?raw";
import guardCampusHehe from "./guardian-avatars/guard-campus-hehe.svg?raw";
import guardFamilyTiezhu from "./guardian-avatars/guard-family-tiezhu.svg?raw";
import guardFamilyWangyi from "./guardian-avatars/guard-family-wangyi.svg?raw";
import guardLifeDecorFang from "./guardian-avatars/guard-life-decor-fang.svg?raw";
import guardLifeProcureCai from "./guardian-avatars/guard-life-procure-cai.svg?raw";
import guardLifeShopGuizhang from "./guardian-avatars/guard-life-shop-guizhang.svg?raw";
import guardParentScienceAnxin from "./guardian-avatars/guard-parent-science-anxin.svg?raw";
import guardRomanceAtiao from "./guardian-avatars/guard-romance-atiao.svg?raw";
import guardRomanceLinjie from "./guardian-avatars/guard-romance-linjie.svg?raw";
import guardRomanceZhou from "./guardian-avatars/guard-romance-zhou.svg?raw";

function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

const GUARDIAN_AVATAR_URLS: Record<string, string> = {
  "guard-romance-linjie": toSvgDataUrl(guardRomanceLinjie),
  "guard-romance-zhou": toSvgDataUrl(guardRomanceZhou),
  "guard-romance-atiao": toSvgDataUrl(guardRomanceAtiao),
  "guard-campus-chen": toSvgDataUrl(guardCampusChen),
  "guard-campus-hehe": toSvgDataUrl(guardCampusHehe),
  "guard-family-wangyi": toSvgDataUrl(guardFamilyWangyi),
  "guard-family-tiezhu": toSvgDataUrl(guardFamilyTiezhu),
  "guard-life-decor-fang": toSvgDataUrl(guardLifeDecorFang),
  "guard-life-procure-cai": toSvgDataUrl(guardLifeProcureCai),
  "guard-life-shop-guizhang": toSvgDataUrl(guardLifeShopGuizhang),
  "guard-parent-science-anxin": toSvgDataUrl(guardParentScienceAnxin),
};

export function getGuardianAvatarUrl(roleId: string): string | undefined {
  return GUARDIAN_AVATAR_URLS[roleId];
}
