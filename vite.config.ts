import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths so the build runs from any subfolder — required for
  // itch.io HTML5 embeds (served from html.itch.zone/html/<id>/, not the root).
  base: "./",
  build: {
    target: "es2020",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
