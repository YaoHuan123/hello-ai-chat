import { useEffect, type RefObject } from "react";

/** 软键盘弹出/收起时保持消息列表贴底 */
export function useChatViewportScroll(scRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const scrollBottom = () => {
      requestAnimationFrame(() => {
        const el = scRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };

    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener("resize", scrollBottom);
    vv.addEventListener("scroll", scrollBottom);
    return () => {
      vv.removeEventListener("resize", scrollBottom);
      vv.removeEventListener("scroll", scrollBottom);
    };
  }, [scRef]);
}
