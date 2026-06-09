import type { PassiveCloneItem } from "../types/passiveClone";
import { syncMomentsItemsApi } from "./momentsApi";

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: PassiveCloneItem[] | null = null;

/** 将本地「我的日常」同步到服务端，供好友探索时 LLM 引用。 */
export function scheduleMomentsSync(items: PassiveCloneItem[]): void {
  pending = items;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const batch = pending;
    pending = null;
    if (!batch) return;
    void syncMomentsItemsApi(batch).catch(() => {
      /* 静默失败，本地仍为权威源 */
    });
  }, 600);
}

export function flushMomentsSync(items: PassiveCloneItem[]): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pending = null;
  void syncMomentsItemsApi(items).catch(() => {
    /* ignore */
  });
}
