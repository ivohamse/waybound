import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    test: {
      include: ["tests/live/**/*.live.spec.ts"],
      testTimeout: 30_000,
      hookTimeout: 30_000,
      env: {
        ORS_API_KEY: env.ORS_API_KEY ?? "",
        GRAPHHOPPER_API_KEY: env.GRAPHHOPPER_API_KEY ?? "",
      },
    },
  };
});
