"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { SUPPORTED_FAMILIES } = require("../scripts/v2/constants");
const { reconstructJsonlBufferFromStream } = require("../scripts/v2/jsonl");
const { getFamilyStreamPath } = require("../scripts/v2/paths");
const { sha256Hex } = require("../scripts/v2/hash");

const { getSortedShardFiles, makeTempDir, prepareSmallV2Fixture, runNodeScript } = require("./helpers/test_utils");

function summarizeOutput(fixture) {
  const manifestText = fs.readFileSync(fixture.manifestPath, "utf8");
  const families = {};

  for (const familyId of SUPPORTED_FAMILIES) {
    const streamPath = getFamilyStreamPath(fixture.outputDir, familyId);
    const streamBytes = fs.readFileSync(streamPath);
    const reconstructedJsonl = reconstructJsonlBufferFromStream(streamBytes, familyId);

    const shards = getSortedShardFiles(fixture.outputDir, familyId).map((shardPath) => {
      const bytes = fs.readFileSync(shardPath);
      return {
        file_name: path.basename(shardPath),
        byte_length: bytes.length,
        sha256: sha256Hex(bytes),
      };
    });

    families[familyId] = {
      stream_byte_length: streamBytes.length,
      stream_sha256: sha256Hex(streamBytes),
      reconstructed_jsonl_hash_sha256: sha256Hex(reconstructedJsonl),
      shards,
    };
  }

  return {
    manifest_text: manifestText,
    families,
  };
}

test("encoding and manifest outputs are byte-identical across repeated runs", () => {
  const rootDir = makeTempDir();
  const runA = prepareSmallV2Fixture(path.join(rootDir, "run-a"), { shardTargetBytes: 66 });
  const runB = prepareSmallV2Fixture(path.join(rootDir, "run-b"), { shardTargetBytes: 66 });

  const verifyA = runNodeScript("scripts/verify-v2.js", [
    "verify",
    "--manifest",
    runA.manifestPath,
    "--output-dir",
    runA.outputDir,
    "--base-hash-file",
    runA.baseHashPath,
  ]);
  const verifyB = runNodeScript("scripts/verify-v2.js", [
    "verify",
    "--manifest",
    runB.manifestPath,
    "--output-dir",
    runB.outputDir,
    "--base-hash-file",
    runB.baseHashPath,
  ]);

  assert.equal(verifyA.status, 0, `first verification failed:\n${verifyA.stderr}`);
  assert.equal(verifyB.status, 0, `second verification failed:\n${verifyB.stderr}`);

  const summaryA = summarizeOutput(runA);
  const summaryB = summarizeOutput(runB);

  assert.deepEqual(summaryA, summaryB);
});
