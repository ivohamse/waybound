import { mkdir, copyFile, writeFile, access } from "node:fs/promises";
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
const logPath = resolve(outputDir, "latest.log");
const vitestBin = resolve(root, "node_modules", "vitest", "vitest.mjs");

await mkdir(outputDir, { recursive: true });
if (mode === "live") {
  await mkdir(resolve(outputDir, "history"), { recursive: true });
}

const args = [
  vitestBin,
  "run",
  "--config",
  mode === "live" ? "vitest.live.config.mts" : "vitest.config.mts",
  "--reporter=default",
  "--reporter=json",
  `--outputFile.json=${jsonPath}`,
];

const child = spawn(process.execPath, args, {
  cwd: root,
  env: process.env,
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
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await copyFile(jsonPath, resolve(outputDir, "history", `${timestamp}.json`));
}

console.log(`\nReports written to test-output/${mode}/latest.log and latest.json`);
if (mode === "live") console.log("A timestamped JSON copy was also added to test-output/live/history/.");

process.exit(exitCode);

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}
