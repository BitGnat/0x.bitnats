"use strict";

const assert = require("node:assert/strict");
const path = require("path");
const test = require("node:test");

const {
  createTinyV1VolumesFixture,
  makeTempDir,
  prepareSmallV2Fixture,
  runNodeScript,
  writeJsonFile,
  writeJsonlIds,
} = require("./helpers/test_utils");

function assertExitCode(result, expectedCode, label) {
  assert.equal(
    result.status,
    expectedCode,
    `${label} expected exit code ${expectedCode}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
  );
}

test("parse-v1 CLI returns deterministic success/failure exit codes", () => {
  const rootDir = makeTempDir();
  const validInputPath = path.join(rootDir, "valid.jsonl");

  writeJsonlIds(validInputPath, [`${"c".repeat(64)}i0`]);

  const success = runNodeScript("scripts/parse-v1.js", ["--input", validInputPath]);
  const failure = runNodeScript("scripts/parse-v1.js", ["--unknown-flag"]);

  assertExitCode(success, 0, "parse-v1 success path");
  assertExitCode(failure, 1, "parse-v1 failure path");
});

test("encode-v2 CLI returns deterministic success/failure exit codes", () => {
  const rootDir = makeTempDir();
  const validInputPath = path.join(rootDir, "valid.jsonl");
  const badInputPath = path.join(rootDir, "bad.jsonl");

  writeJsonlIds(validInputPath, [`${"a".repeat(64)}i0`, `${"9".repeat(64)}i1`, `${"8".repeat(64)}i2`]);
  writeJsonlIds(badInputPath, [`${"b".repeat(64)}i256`]);

  const success = runNodeScript("scripts/encode-v2.js", [
    "--input",
    validInputPath,
    "--output-dir",
    path.join(rootDir, "valid-out"),
    "--default-family",
    "none",
    "--infer-family-from-index",
  ]);

  const failure = runNodeScript("scripts/encode-v2.js", [
    "--input",
    badInputPath,
    "--output-dir",
    path.join(rootDir, "bad-out"),
    "--default-family",
    "none",
    "--infer-family-from-index",
  ]);

  assertExitCode(success, 0, "encode-v2 success path");
  assertExitCode(failure, 1, "encode-v2 failure path");
});

test("build-manifest-v2 CLI returns deterministic success/failure exit codes", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });
  const badShardMapPath = path.join(path.dirname(fixture.shardMapPath), "bad-shard-map.json");

  writeJsonFile(badShardMapPath, {
    base: ["not-a-valid-inscription-id"],
    prospect: [],
    forged: [],
  });

  const success = runNodeScript("scripts/build-manifest-v2.js", [
    "--input-dir",
    fixture.outputDir,
    "--shard-map",
    fixture.shardMapPath,
    "--output",
    path.join(path.dirname(fixture.manifestPath), "manifest-copy.v2.json"),
  ]);

  const failure = runNodeScript("scripts/build-manifest-v2.js", [
    "--input-dir",
    fixture.outputDir,
    "--shard-map",
    badShardMapPath,
    "--output",
    path.join(path.dirname(fixture.manifestPath), "manifest-invalid.v2.json"),
  ]);

  assertExitCode(success, 0, "build-manifest-v2 success path");
  assertExitCode(failure, 1, "build-manifest-v2 failure path");
});

test("verify-v2 CLI returns deterministic success/failure exit codes", () => {
  const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });

  const success = runNodeScript("scripts/verify-v2.js", [
    "verify",
    "--manifest",
    fixture.manifestPath,
    "--output-dir",
    fixture.outputDir,
    "--base-hash-file",
    fixture.baseHashPath,
  ]);

  const usageFailure = runNodeScript("scripts/verify-v2.js", ["bogus-command"]);

  assertExitCode(success, 0, "verify-v2 success path");
  assertExitCode(usageFailure, 2, "verify-v2 usage failure path");
});

test("verify_volumes CLI returns deterministic success/failure exit codes", () => {
  const rootDir = makeTempDir();
  const v1Fixture = createTinyV1VolumesFixture(path.join(rootDir, "v1"));
  const v2Fixture = prepareSmallV2Fixture(path.join(rootDir, "v2"), { shardTargetBytes: 66 });

  const v1Success = runNodeScript("scripts/verify_volumes.js", [
    "--mode",
    "v1",
    "--volumes-dir",
    v1Fixture.volumesDir,
    "--volume-count",
    String(v1Fixture.volumeCount),
    "--dataset-hash-file",
    v1Fixture.hashFile,
  ]);

  const v2Success = runNodeScript("scripts/verify_volumes.js", [
    "--mode",
    "v2",
    "--manifest",
    v2Fixture.manifestPath,
    "--output-dir",
    v2Fixture.outputDir,
    "--base-hash-file",
    v2Fixture.baseHashPath,
  ]);

  const usageFailure = runNodeScript("scripts/verify_volumes.js", ["--mode", "invalid-mode"]);

  assertExitCode(v1Success, 0, "verify_volumes v1 success path");
  assertExitCode(v2Success, 0, "verify_volumes v2 success path");
  assertExitCode(usageFailure, 2, "verify_volumes usage failure path");
});

test("release-v2 CLI returns deterministic success/failure exit codes", () => {
  const rootDir = makeTempDir();
  const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
  const releaseRootDir = path.join(rootDir, "releases");

  const success = runNodeScript("scripts/release-v2.js", [
    "prepare",
    "--release-id",
    "cli-release",
    "--release-root",
    releaseRootDir,
    "--source-output-dir",
    fixture.outputDir,
  ]);

  const usageFailure = runNodeScript("scripts/release-v2.js", ["unknown-command"]);

  assertExitCode(success, 0, "release-v2 success path");
  assertExitCode(usageFailure, 2, "release-v2 usage failure path");
});
