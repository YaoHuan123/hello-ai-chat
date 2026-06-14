import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aichat.app",
  appName: "AIChat",
  webDir: "dist",
  server: {
    // 真机联调：Debug 包允许局域网 HTTP；生产请用 HTTPS。
    androidScheme: "http",
  },
  backgroundColor: "#f7f7f8",
};

export default config;
