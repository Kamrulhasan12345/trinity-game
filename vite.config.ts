import { defineConfig } from "vite";

export default defineConfig({
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
