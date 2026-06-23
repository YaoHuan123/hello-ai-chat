/**
 * 阶段 2 mock：润色草稿。
 * 接后端时由 `POST /polish?draft=...&tone=...&mol=...` 等返回流式增量；
 * 这里用 setTimeout 模拟分段写入。
 */

export type PolishTone = "recommended" | "keep" | "concise" | "polite" | "warm" | "direct";

export const POLISH_TONES: { id: PolishTone; label: string }[] = [
  { id: "recommended", label: "推荐" },
  { id: "concise", label: "更简洁" },
  { id: "polite", label: "更礼貌" },
  { id: "warm", label: "更亲近" },
  { id: "direct", label: "更直接" },
];

const TONE_TAGS: Record<PolishTone, string[]> = {
  recommended: ["推荐", "推荐"],
  keep: ["顺一版", "稳一版"],
  concise: ["精简版", "短一些"],
  polite: ["礼貌版", "正式版"],
  warm: ["亲近版", "暖一些"],
  direct: ["直球版", "去客套"],
};

const KEEP_SUFFIX = ["", "，你看方便吗？", "，我这边都行", "，等你回话", "，怎么方便怎么来"];

function applyTone(
  draft: string,
  tone: PolishTone,
  _molId: string,
  variantIndex: number,
  seed: number,
): string {
  const t = draft.trim();
  if (!t) return "";
  switch (tone) {
    case "recommended": {
      const base = t.replace(/  +/g, " ");
      return variantIndex === 0 ? base : `${base}，你看可以吗？`;
    }
    case "concise": {
      const cut = Math.max(15, Math.min(t.length, 28));
      const base = t.length > cut ? t.slice(0, cut) + "。" : t;
      return variantIndex === 0 ? base : base.replace(/[。.]$/, "") + "，先这样？";
    }
    case "polite": {
      const base = t;
      return variantIndex === 0 ? `${base}，谢谢～` : `${base}，你看方便吗？`;
    }
    case "warm":
      return variantIndex === 0
        ? `${t}，咱们慢慢说～`
        : `${t}，没事，咱不急。`;
    case "direct": {
      const stripped = t
        .replace(/(可能|或许|大概|稍微|似乎)/g, "")
        .replace(/[～~]+/g, "");
      return variantIndex === 0
        ? stripped
        : stripped.replace(/[，。]?$/, "") + "。要么就这样定。";
    }
    case "keep":
    default: {
      const base = t.replace(/  +/g, " ");
      const suffix = KEEP_SUFFIX[(seed + variantIndex) % KEEP_SUFFIX.length];
      return variantIndex === 0 ? base : `${base}${suffix}`;
    }
  }
}

export type PolishVariantSpec = { tag: string; text: string };

export function mockPolishVariants(
  draft: string,
  tone: PolishTone,
  molId: string,
  seed = 0,
): PolishVariantSpec[] {
  return [0, 1].map((i) => ({
    tag: TONE_TAGS[tone][i] ?? "新版",
    text: applyTone(draft, tone, molId, i, seed),
  }));
}

export function mockPolishOneVariant(
  draft: string,
  tone: PolishTone,
  molId: string,
  variantIndex: number,
  seed: number,
): PolishVariantSpec {
  return {
    tag: TONE_TAGS[tone][variantIndex] ?? "新版",
    text: applyTone(draft, tone, molId, variantIndex, seed),
  };
}

/**
 * 简易的可取消流式句柄。所有由本调用启动的分段写入会在 `cancelled` 置位后停止。
 * 上层换 Mol、用户继续打字、关闭面板等都应及时置位。
 */
export type StreamHandle = { cancelled: boolean };

export function streamText(
  fullText: string,
  onChunk: (sofar: string, done: boolean) => void,
  handle: StreamHandle,
): void {
  let i = 0;
  const tick = () => {
    if (handle.cancelled) return;
    const step = 3 + Math.floor(Math.random() * 4);
    i = Math.min(fullText.length, i + step);
    const sofar = fullText.slice(0, i);
    const done = i >= fullText.length;
    onChunk(sofar, done);
    if (!done) {
      window.setTimeout(tick, 45 + Math.floor(Math.random() * 50));
    }
  };
  window.setTimeout(tick, 60);
}
