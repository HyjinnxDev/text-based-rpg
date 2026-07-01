import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      "@tbrpg/db": path.resolve(__dirname, "packages/db/src"),
      "@tbrpg/shared": path.resolve(__dirname, "packages/shared/src"),
      "@tbrpg/domain": path.resolve(__dirname, "packages/domain/src"),
      "@tbrpg/ai": path.resolve(__dirname, "packages/ai/src"),
    },
  },
});
