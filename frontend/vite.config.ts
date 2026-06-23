import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "package.json"), "utf-8"),
) as { version: string };

const basePath = (process.env.VITE_BASE_PATH ?? "/").replace(/\/?$/, "/");

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  css: {
    transformer: "lightningcss",
  },
  server: {
    port: 4173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/health": { target: "http://localhost:4000", changeOrigin: true },
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
