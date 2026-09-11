import { mkdir, copyFile, writeFile, access, readFile, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const mode = process.argv[2];
if (mode !== "unit" && mode !== "live") {
  console.error("Usage: node scripts/run-test-report.mjs <unit|live>");
  process.exit(2);
}

const root = process.cwd();
const outputDir = resolve(root, "test-output", mode);
const jsonPath = resolve(outputDir, "latest.json");
const metadataPath = resolve(outputDir, "live-metadata.jsonl");
const logPath = resolve(outputDir, "latest.log");
const vitestBin = resolve(root, "node_modules", "vitest", "vitest.mjs");

await mkdir(outputDir, { recursive: true });
if (mode === "live") {
  await mkdir(resolve(outputDir, "history"), { recursive: true });
}

// A crashed run must never reuse the previous successful report.
await Promise.all([jsonPath, logPath, metadataPath].map((path) => rm(path, { force: true })));

const args = [
  vitestBin,
  "run",
  "--config",
  mode === "live" ? "vitest.live.config.mts" : "vitest.config.mts",
  "--reporter=default",
  "--reporter=json",
  `--outputFile.json=${jsonPath}`,
  ...process.argv.slice(3),
];

const child = spawn(process.execPath, args, {
  cwd: root,
  env: { ...process.env, ...(mode === "live" ? { WAYBOUND_LIVE_METADATA_FILE: metadataPath } : {}) },
  stdio: ["inherit", "pipe", "pipe"],
});

let log = "";
const append = (chunk, stream) => {
  const text = chunk.toString();
  stream.write(text);
  log += stripAnsi(text);
};

child.stdout.on("data", (chunk) => append(chunk, process.stdout));
child.stderr.on("data", (chunk) => append(chunk, process.stderr));

const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("close", (code) => resolveExit(code ?? 1));
});

await writeFile(logPath, log, "utf8");

try {
  await access(jsonPath, fsConstants.F_OK);
} catch {
  console.error(`\nExpected Vitest JSON report was not created at ${jsonPath}`);
  process.exit(exitCode || 1);
}

if (mode === "live") {
  let metadata = "";
  try {
    metadata = await readFile(metadataPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const cases = metadata.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const report = JSON.parse(await readFile(jsonPath, "utf8"));
  report.waybound = {
    schemaVersion: 2,
    recordedCases: cases.length,
    passed: cases.filter((test) => test.status === "passed").length,
    failed: cases.filter((test) => test.status === "failed").length,
    skipped: cases.filter((test) => test.status === "skipped").length,
    inconclusive: cases.filter((test) => test.status === "inconclusive").length,
    outcome: exitCode !== 0 ? "failed" : cases.some((test) => test.status === "inconclusive") ? "inconclusive" : "passed",
    cases,
  };
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  const summary = [
    "\nWaybound live execution details:",
    ...cases.map((test) => `${test.status.toUpperCase()} ${test.id} | HTTP ${test.http.map((request) => request.status ?? request.transportError).join(", ") || "none"} | ${test.wayboundErrorCode ?? test.failureKind ?? "OK"} | ${test.durationMs.toFixed(1)} ms`),
    `${cases.length} cases recorded; ${cases.filter((test) => test.status === "inconclusive").length} inconclusive. Consult the Vitest summary for skipped tests and collection failures.`,
    "",
  ].join("\n");
  process.stdout.write(summary);
  await writeFile(logPath, log + summary, "utf8");
  await rm(metadataPath, { force: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await copyFile(jsonPath, resolve(outputDir, "history", `${timestamp}.json`));
}

console.log(`\nReports written to test-output/${mode}/latest.log and latest.json`);
if (mode === "live") console.log("A timestamped JSON copy was also added to test-output/live/history/.");

process.exit(exitCode);

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}
