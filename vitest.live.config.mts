import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    test: {
      include: ["tests/live/**/*.live.spec.ts"],
      fileParallelism: false,
      maxWorkers: 1,
      maxConcurrency: 1,
      retry: 0,
      testTimeout: 30_000,
      hookTimeout: 30_000,
      env: {
        ORS_API_KEY: env.ORS_API_KEY ?? "",
        GRAPHHOPPER_API_KEY: env.GRAPHHOPPER_API_KEY ?? "",
        WAYBOUND_LIVE_PROVIDERS: env.WAYBOUND_LIVE_PROVIDERS ?? "ors,graphhopper",
        WAYBOUND_LIVE_DELAY_MS: env.WAYBOUND_LIVE_DELAY_MS ?? "",
        WAYBOUND_LIVE_ORS_DELAY_MS: env.WAYBOUND_LIVE_ORS_DELAY_MS ?? "",
        WAYBOUND_LIVE_GRAPHHOPPER_DELAY_MS: env.WAYBOUND_LIVE_GRAPHHOPPER_DELAY_MS ?? "",
        WAYBOUND_LIVE_MAX_RETRY_AFTER_MS: env.WAYBOUND_LIVE_MAX_RETRY_AFTER_MS ?? "",
        WAYBOUND_LIVE_TIMEOUT_MS: env.WAYBOUND_LIVE_TIMEOUT_MS ?? "10000",
      },
    },
  };
});
