import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import wasm from "vite-plugin-wasm";
export default defineConfig({
  server: {
    headers: {
      "Content-Security-Policy": "script-src ' 'wasm-unsafe-eval';",
      "Content-Type":" application/wasm",
      "Access-Control-Allow-Origin":" *"
    },
  },
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    plugins: [vue(), wasm()],
  },
});
