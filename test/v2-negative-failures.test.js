"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const {
  getSortedShardFiles,
  makeTempDir,
  prepareSmallV2Fixture,
  readJsonFile,
  runNodeScript,
  writeJsonFile,
  writeJsonlIds,
} = require("./helpers/test_utils");

function runVerifyBase(fixture) {
  return runNodeScript("scripts/verify-v2.js", [
    "verify",
    "--manifest",
    fixture.manifestPath,
    "--output-dir",
    fixture.outputDir,
    "--family",
    "base",
    "--base-hash-file",
    fixture.baseHashPath,
  ]);
}

function assertFailed(result, pattern, label) {
  assert.notEqual(result.status, 0, `${label} expected non-zero status.`);
  const output = `${result.stderr}\n${result.stdout}`;
  assert.match(output, pattern, `${label} did not emit expected error output.`);
}

test("fails when shard bytes are reordered", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const baseShards = getSortedShardFiles(fixture.outputDir, "base");

  assert.ok(baseShards.length >= 2, "Expected at least two base shards.");

  const firstBytes = fs.readFileSync(baseShards[0]);
  const secondBytes = fs.readFileSync(baseShards[1]);

  fs.writeFileSync(baseShards[0], secondBytes);
  fs.writeFileSync(baseShards[1], firstBytes);

  const result = runVerifyBase(fixture);
  assertFailed(
    result,
    /Shard (byte length does not match manifest descriptor\.|hash does not match manifest descriptor\.)/,
    "shard reorder"
  );
});

test("fails on shard hash mismatch", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const baseShards = getSortedShardFiles(fixture.outputDir, "base");

  assert.ok(baseShards.length >= 1, "Expected at least one base shard.");

  const bytes = fs.readFileSync(baseShards[0]);
  bytes[0] = bytes[0] ^ 0xff;
  fs.writeFileSync(baseShards[0], bytes);

  const result = runVerifyBase(fixture);
  assertFailed(result, /Shard hash does not match manifest descriptor\./, "shard hash mismatch");
});

test("fails on stream hash mismatch", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const manifest = readJsonFile(fixture.manifestPath);

  manifest.families.base.stream_hash_sha256 = "0".repeat(64);
  writeJsonFile(fixture.manifestPath, manifest);

  const result = runVerifyBase(fixture);
  assertFailed(result, /Binary stream hash does not match manifest commitment\./, "stream hash mismatch");
});

test("fails on reconstructed JSONL hash mismatch", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const manifest = readJsonFile(fixture.manifestPath);

  manifest.families.base.reconstructed_jsonl_hash_sha256 = "0".repeat(64);
  writeJsonFile(fixture.manifestPath, manifest);

  const result = runVerifyBase(fixture);
  assertFailed(
    result,
    /Reconstructed JSONL hash does not match manifest commitment\./,
    "jsonl hash mismatch"
  );
});

test("fails on duplicate shard index in manifest", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const manifest = readJsonFile(fixture.manifestPath);

  assert.ok(manifest.families.base.shards.length >= 2, "Expected at least two base shards.");
  manifest.families.base.shards[1].index = 0;
  writeJsonFile(fixture.manifestPath, manifest);

  const result = runVerifyBase(fixture);
  assertFailed(result, /Shard indexes must be contiguous and 0-based\./, "duplicate shard index");
});

test("fails when a referenced shard file is missing", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const baseShards = getSortedShardFiles(fixture.outputDir, "base");

  assert.ok(baseShards.length >= 2, "Expected at least two base shards.");
  fs.rmSync(baseShards[1]);

  const result = runVerifyBase(fixture);
  assertFailed(result, /Missing shard file referenced by manifest\./, "missing shard file");
});

test("fails on unsupported inscription index", () => {
  const rootDir = makeTempDir();
  const inputPath = path.join(rootDir, "unsupported-index.jsonl");
  const outputDir = path.join(rootDir, "out");

  writeJsonlIds(inputPath, [`${"b".repeat(64)}i256`]);

  const result = runNodeScript("scripts/encode-v2.js", [
    "--input",
    inputPath,
    "--output-dir",
    outputDir,
    "--default-family",
    "none",
    "--infer-family-from-index",
  ]);

  assertFailed(result, /Invalid id index: expected integer in \[0, 255\]\./, "unsupported index");
});

test("fails on malformed shard byte length commitment", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const manifest = readJsonFile(fixture.manifestPath);

  manifest.families.base.shards[0].byte_length = 34;
  writeJsonFile(fixture.manifestPath, manifest);

  const result = runVerifyBase(fixture);
  assertFailed(
    result,
    /Shard byte length must be divisible by the fixed record size\./,
    "malformed record length"
  );
});
