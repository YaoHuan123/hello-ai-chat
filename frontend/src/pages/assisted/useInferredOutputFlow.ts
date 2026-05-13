import { useState } from "react";

export type InferredStep = "intent" | "reply";

/**
 * 2b 多步输出流程层：
 * step1 选策略(intent) -> step2 选话术(reply)。
 * 将状态迁移集中管理，页面只消费当前 step 与动作。
 */
export function useInferredOutputFlow(initialIndex = 0) {
  const [selectedIntentIndex, setSelectedIntentIndex] = useState(initialIndex);
  const [step, setStep] = useState<InferredStep>("intent");

  function openPanel() {
    setStep("intent");
  }

  function closePanel() {
    setStep("intent");
  }

  function selectIntent(index: number) {
    setSelectedIntentIndex(index);
    setStep("reply");
  }

  function backToIntent() {
    setStep("intent");
  }

  function resetForMol() {
    setSelectedIntentIndex(0);
    setStep("intent");
  }

  function onReplySelected() {
    setStep("intent");
  }

  return {
    selectedIntentIndex,
    step,
    openPanel,
    closePanel,
    selectIntent,
    backToIntent,
    resetForMol,
    onReplySelected,
  };
}
