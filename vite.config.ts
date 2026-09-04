import { defineConfig } from "vitest/config";
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
  server: { port: 5173, strictPort: true },
  test: { include: ["tests/**/*.test.ts"] },
});
