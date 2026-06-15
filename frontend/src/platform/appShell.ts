import { Capacitor } from "@capacitor/core";

/** Capacitor 原生 WebView（Android / iOS） */
export function isNativeAppShell(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroidShell(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function isIOSShell(): boolean {
  return Capacitor.getPlatform() === "ios";
}

function syncNativeViewportHeight(): void {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--aichat-app-height", `${Math.round(height)}px`);
}

/**
 * 在 `main.tsx` 尽早调用：为 `<html>` 打上原生壳标记，供 CSS 禁用 Web 桌面布局。
 */
export function initNativeAppShell(): void {
  if (!isNativeAppShell()) return;
  document.documentElement.classList.add("aichat-native-app");
  if (isAndroidShell()) {
    document.documentElement.classList.add("aichat-android-app");
  }
  if (isIOSShell()) {
    document.documentElement.classList.add("aichat-ios-app");
  }

  syncNativeViewportHeight();
  window.addEventListener("resize", syncNativeViewportHeight);
  window.visualViewport?.addEventListener("resize", syncNativeViewportHeight);
  window.visualViewport?.addEventListener("scroll", syncNativeViewportHeight);
}
