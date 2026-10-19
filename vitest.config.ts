import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://sustainability:sustainability@localhost:5432/sustainability?schema=public",
    },
  },
});
