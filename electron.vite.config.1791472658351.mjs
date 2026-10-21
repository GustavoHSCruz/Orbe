// electron.vite.config.ts
import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    // Sandboxed preloads cannot require npm dependencies at runtime.
    build: { externalizeDeps: false, rollupOptions: { external: ["electron"] } }
  },
  renderer: {
    resolve: { alias: { "@": resolve("src/renderer") } },
    plugins: [react(), tailwindcss()]
  }
});
export {
  electron_vite_config_default as default
};
