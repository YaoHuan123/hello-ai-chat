import { Capacitor } from "@capacitor/core";

type CapacitorWindow = Window & {
  Capacitor?: {
    platform?: string;
    isNativePlatform?: () => boolean;
  };
};

function readCapacitorBridge(): CapacitorWindow["Capacitor"] | undefined {
  return (window as CapacitorWindow).Capacitor;
}

/** Capacitor WebView URL（bridge 未就绪时的兜底） */
function isCapacitorUrl(): boolean {
  const protocol = window.location.protocol;
  return protocol === "capacitor:" || protocol === "ionic:";
}

function resolvePlatform(): string {
  const fromCore = Capacitor.getPlatform();
  if (fromCore !== "web") return fromCore;

  const bridge = readCapacitorBridge();
  if (bridge?.platform && bridge.platform !== "web") return bridge.platform;

  if (isCapacitorUrl()) return "ios";
  if (window.location.protocol === "http:" && window.location.hostname === "localhost") {
    return "android";
  }
  return fromCore;
}

/** Capacitor 原生 WebView（Android / iOS） */
export function isNativeAppShell(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  const bridge = readCapacitorBridge();
  if (bridge?.isNativePlatform?.()) return true;
  if (bridge?.platform === "ios" || bridge?.platform === "android") return true;
  return isCapacitorUrl();
}

export function isAndroidShell(): boolean {
  return resolvePlatform() === "android";
}

export function isIOSShell(): boolean {
  return resolvePlatform() === "ios";
}

function syncNativeViewportHeight(): void {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--aichat-app-height", `${Math.round(height)}px`);
}

function applyNativeShellClasses(): void {
  const html = document.documentElement;
  html.classList.add("aichat-native-app");
  html.style.setProperty("--aichat-screen-max", "100%");
  if (isAndroidShell()) {
    html.classList.add("aichat-android-app");
  }
  if (isIOSShell()) {
    html.classList.add("aichat-ios-app");
  }
}

/**
 * 在 `main.tsx` 尽早调用：为 `<html>` 打上原生壳标记，供 CSS 禁用 Web 桌面布局。
 */
export function initNativeAppShell(): void {
  if (!isNativeAppShell()) return;
  applyNativeShellClasses();

  syncNativeViewportHeight();
  window.addEventListener("resize", syncNativeViewportHeight);
  window.visualViewport?.addEventListener("resize", syncNativeViewportHeight);
  window.visualViewport?.addEventListener("scroll", syncNativeViewportHeight);
}
