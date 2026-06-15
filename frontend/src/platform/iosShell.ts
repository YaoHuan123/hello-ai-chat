import { StatusBar, Style } from "@capacitor/status-bar";
import { isIOSShell } from "./appShell";

/**
 * 在 `main.tsx` 尽早调用：仅 iOS 生效，设置状态栏样式。
 */
export function initIOSAppearance(): void {
  if (!isIOSShell()) return;
  void StatusBar.setStyle({ style: Style.Light });
}
