import type { GuardianScene } from "../types/guardian";

export type GuardianCreateFeature =
  | "专修逃坑"
  | "大件采购"
  | "店铺管理"
  | "科学育儿"
  | "亲子沟通"
  | "恋爱暧昧";

export type GuardianCreateFeatureOption = {
  id: GuardianCreateFeature;
  scene: GuardianScene;
  hint: string;
};

export const GUARDIAN_CREATE_FEATURES: GuardianCreateFeatureOption[] = [
  { id: "专修逃坑", scene: "居家装修", hint: "合同报价、材料验收与增项风险" },
  { id: "大件采购", scene: "大件采购", hint: "型号对比、保修售后与凭证留存" },
  { id: "店铺管理", scene: "店铺经营", hint: "客诉、库存、促销与店务协调" },
  { id: "科学育儿", scene: "科学育儿", hint: "分阶段方法、习惯与边界建议" },
  { id: "亲子沟通", scene: "亲子沟通", hint: "家庭分歧调解与亲子边界" },
  { id: "恋爱暧昧", scene: "恋爱暧昧", hint: "关系边界、气氛与套路识别" },
];

export function guardianSceneForFeature(feature: GuardianCreateFeature): GuardianScene {
  return GUARDIAN_CREATE_FEATURES.find((f) => f.id === feature)!.scene;
}
