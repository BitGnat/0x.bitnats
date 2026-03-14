#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TEST_DIR = path.join(ROOT, "test");

function collectTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    return [];
  }

  return fs
    .readdirSync(TEST_DIR)
    .filter((name) => name.endsWith(".test.js"))
    .sort()
    .map((name) => path.join(TEST_DIR, name));
}

function main() {
  const testFiles = collectTestFiles();

  if (testFiles.length === 0) {
    console.error("No test files found under test/*.test.js");
    process.exit(1);
  }

  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: ROOT,
    stdio: "inherit",
  });

  process.exit(result.status === null ? 1 : result.status);
}

main();
