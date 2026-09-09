import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const runner = resolve("scripts/run-test-report.mjs");
function withRunner(fakeVitest: string, check: (root: string, result: ReturnType<typeof spawnSync>) => void) {
  const root = mkdtempSync(join(tmpdir(), "waybound-report-"));
  try {
    mkdirSync(join(root, "node_modules/vitest"), { recursive: true });
    mkdirSync(join(root, "test-output/live"), { recursive: true });
    writeFileSync(join(root, "test-output/live/latest.json"), '{"stale":true}');
    writeFileSync(join(root, "test-output/live/live-metadata.jsonl"), '{"stale":true}\n');
    writeFileSync(join(root, "node_modules/vitest/vitest.mjs"), fakeVitest);
    check(root, spawnSync(process.execPath, [runner, "live"], { cwd: root, encoding: "utf8" }));
  } finally { rmSync(root, { recursive: true, force: true }); }
}

describe("report runner", () => {
  it("preserves failure exit status, adds live metadata and archives the enriched JSON", () => {
    withRunner(`
      import { writeFileSync } from 'node:fs';
      const output = process.argv.find(arg => arg.startsWith('--outputFile.json=')).split('=').slice(1).join('=');
      writeFileSync(output, JSON.stringify({ numFailedTests: 1, testResults: [{ name: 'example', assertionResults: [{ status: 'failed' }] }] }));
      writeFileSync(process.env.WAYBOUND_LIVE_METADATA_FILE, JSON.stringify({ id: 'GraphHopper / matrix / hike', status: 'failed', http: [{status:429}], wayboundErrorCode:'RATE_LIMITED', failureKind:'rate-limit', durationMs:12 }) + '\\n');
      console.log('\\u001b[31mfailed\\u001b[0m');
      process.exit(1);
    `, (root, result) => {
      expect(result.status).toBe(1);
      const directory = join(root, "test-output/live");
      const report = JSON.parse(readFileSync(join(directory, "latest.json"), "utf8"));
      expect(report.numFailedTests).toBe(1);
      expect(report.testResults[0].assertionResults[0].status).toBe("failed");
      expect(report.waybound).toMatchObject({ schemaVersion: 1, failed: 1, recordedCases: 1 });
      expect(report).not.toHaveProperty("stale");
      const log = readFileSync(join(directory, "latest.log"), "utf8");
      expect(log).toContain("RATE_LIMITED");
      expect(log).not.toContain("\u001b[");
      const history = readdirSync(join(directory, "history"));
      expect(history).toHaveLength(1);
      expect(JSON.parse(readFileSync(join(directory, "history", history[0]), "utf8"))).toEqual(report);
    });
  });

  it("cannot reuse an old successful report when collection crashes", () => {
    withRunner("process.exit(2)", (root, result) => {
      expect(result.status).toBe(2);
      expect(existsSync(join(root, "test-output/live/latest.json"))).toBe(false);
      expect(readdirSync(join(root, "test-output/live/history"))).toHaveLength(0);
      expect(String(result.stderr)).toContain("Expected Vitest JSON report was not created");
    });
  });
});
