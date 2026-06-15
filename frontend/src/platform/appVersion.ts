import { App } from "@capacitor/app";
import { isNativeAppShell } from "./appShell";

export type AppVersionInfo = {
  version: string;
  build: string;
};

const webVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

let cached: AppVersionInfo | null = null;

export async function getAppVersion(): Promise<AppVersionInfo> {
  if (cached) return cached;

  if (isNativeAppShell()) {
    const info = await App.getInfo();
    cached = { version: info.version, build: info.build };
    return cached;
  }

  cached = { version: webVersion, build: "" };
  return cached;
}

export function formatAppVersion(info: AppVersionInfo): string {
  if (info.build) return `${info.version} (${info.build})`;
  return info.version;
}
