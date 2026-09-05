import { defineConfig } from "vitest/config";
import { documentationPlugin } from "./site/plugin.ts";
export default defineConfig({
  plugins: [documentationPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/references/local/**",
      ],
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
