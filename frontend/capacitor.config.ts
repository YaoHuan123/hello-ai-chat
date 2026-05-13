import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aichat.app",
  appName: "hello chat",
  webDir: "dist",
  server: {
    // Android 模拟器联调：与 API 同为 http，避免 Mixed Content。
    androidScheme: "http",
  },
  backgroundColor: "#f7f7f8",
};

export default config;
