import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/** 浅色顶栏，与 capacitor.config backgroundColor 一致 */
const STATUS_BAR_BG = "#f7f7f8";

let backListenerRegistered = false;

const backStore: { handler: (() => boolean) | null } = { handler: null };

/**
 * 在 `main.tsx` 尽早调用：仅 Android 生效，设置状态栏样式。
 */
export function initAndroidAppearance(): void {
  if (Capacitor.getPlatform() !== "android") return;
  void StatusBar.setOverlaysWebView({ overlay: false });
  void StatusBar.setStyle({ style: Style.Light });
  void StatusBar.setBackgroundColor({ color: STATUS_BAR_BG });
}

export type AndroidBackHandler = () => boolean;

/**
 * 由 `App.tsx` 注册：返回 `true` 表示已消费返回键；返回 `false` 则退出应用。
 */
export function setAndroidBackHandler(handler: AndroidBackHandler | null): void {
  if (Capacitor.getPlatform() !== "android") return;
  backStore.handler = handler;
  if (!backListenerRegistered) {
    backListenerRegistered = true;
    void App.addListener("backButton", () => {
      if (backStore.handler?.()) return;
      void App.exitApp();
    });
  }
}
