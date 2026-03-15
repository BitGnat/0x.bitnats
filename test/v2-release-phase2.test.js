"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { SUPPORTED_FAMILIES } = require("../scripts/v2/constants");
const { getReleaseContractPaths } = require("../scripts/v2/paths");

const {
  createTinyV1VolumesFixture,
  getSortedShardFiles,
  makeTempDir,
  prepareSmallV2Fixture,
  readJsonFile,
  runNodeScript,
  stableInscriptionId,
  writeJsonFile,
} = require("./helpers/test_utils");

function assertFailed(result, pattern, label) {
  assert.notEqual(result.status, 0, `${label} expected non-zero exit code.`);
  assert.match(`${result.stderr}\n${result.stdout}`, pattern, `${label} did not emit expected error output.`);
}

function buildFilledInscriptionMap(template) {
  const output = {
    mapping_version: template.mapping_version,
    families: {},
  };

  for (const familyId of SUPPORTED_FAMILIES) {
    output.families[familyId] = template.families[familyId].map((entry, index) => ({
      index: entry.index,
      shard_file: entry.shard_file,
      inscription_id: stableInscriptionId(`release-${familyId}`, index),
    }));
  }

  return output;
}

function buildFinalizedReleaseFixture(rootDir) {
  const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
  const releaseRootDir = path.join(rootDir, "releases");
  const releaseId = "phase2-release";
  const releaseDir = path.join(releaseRootDir, releaseId);
  const contract = getReleaseContractPaths(releaseDir);
  const filledMapPath = path.join(rootDir, "filled-map.json");

  const prepareResult = runNodeScript("scripts/release-v2.js", [
    "prepare",
    "--release-id",
    releaseId,
    "--release-root",
    releaseRootDir,
    "--source-output-dir",
    fixture.outputDir,
  ]);
  assert.equal(prepareResult.status, 0, `release prepare failed:\n${prepareResult.stderr}`);

  const template = readJsonFile(contract.inscription_map_template_path);
  const filledMap = buildFilledInscriptionMap(template);
  writeJsonFile(filledMapPath, filledMap);

  const finalizeResult = runNodeScript("scripts/release-v2.js", [
    "finalize-manifest",
    "--release-id",
    releaseId,
    "--release-root",
    releaseRootDir,
    "--inscription-map",
    filledMapPath,
  ]);
  assert.equal(finalizeResult.status, 0, `finalize-manifest failed:\n${finalizeResult.stderr}`);

  return {
    fixture,
    releaseRootDir,
    releaseId,
    releaseDir,
    contract,
    template,
  };
}

test("release-v2 prepare is deterministic across reruns from identical input", () => {
  const rootDir = makeTempDir();
  const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
  const releaseRootDir = path.join(rootDir, "releases");

  const runPrepare = (releaseId) => {
    const result = runNodeScript("scripts/release-v2.js", [
      "prepare",
      "--release-id",
      releaseId,
      "--release-root",
      releaseRootDir,
      "--source-output-dir",
      fixture.outputDir,
    ]);
    assert.equal(result.status, 0, `prepare failed for ${releaseId}:\n${result.stderr}`);
    return getReleaseContractPaths(path.join(releaseRootDir, releaseId));
  };

  const contractA = runPrepare("deterministic-a");
  const contractB = runPrepare("deterministic-b");

  const checksumsA = fs.readFileSync(contractA.shard_checksums_path);
  const checksumsB = fs.readFileSync(contractB.shard_checksums_path);
  assert.deepEqual(checksumsA, checksumsB, "checksum inventories diverged across reruns");

  const publishPlanA = readJsonFile(contractA.publish_plan_path);
  const publishPlanB = readJsonFile(contractB.publish_plan_path);
  assert.deepEqual(publishPlanA.families, publishPlanB.families, "family stats changed across reruns");
  assert.deepEqual(publishPlanA.publish_order, publishPlanB.publish_order, "publish order changed across reruns");

  for (const familyId of SUPPORTED_FAMILIES) {
    const shardFilesA = getSortedShardFiles(contractA.payload_dir, familyId);
    const shardFilesB = getSortedShardFiles(contractB.payload_dir, familyId);

    assert.equal(shardFilesA.length, shardFilesB.length, `shard count mismatch for ${familyId}`);

    for (let index = 0; index < shardFilesA.length; index++) {
      const bytesA = fs.readFileSync(shardFilesA[index]);
      const bytesB = fs.readFileSync(shardFilesB[index]);
      assert.deepEqual(bytesA, bytesB, `shard bytes diverged for ${familyId}[${index}]`);
    }
  }
});

test("release-v2 verify-release writes machine-readable evidence with commitments", () => {
  const rootDir = makeTempDir();
  const finalized = buildFinalizedReleaseFixture(rootDir);
  const v1Fixture = createTinyV1VolumesFixture(path.join(rootDir, "v1"));

  const verifyResult = runNodeScript("scripts/release-v2.js", [
    "verify-release",
    "--release-id",
    finalized.releaseId,
    "--release-root",
    finalized.releaseRootDir,
    "--base-hash-file",
    finalized.fixture.baseHashPath,
    "--dataset-hash-file",
    v1Fixture.hashFile,
    "--volumes-dir",
    v1Fixture.volumesDir,
    "--volume-count",
    String(v1Fixture.volumeCount),
    "--json",
  ]);

  assert.equal(verifyResult.status, 0, `verify-release failed:\n${verifyResult.stderr}`);

  const payload = JSON.parse(verifyResult.stdout);
  assert.equal(payload.exit_codes.verify_v2, 0);
  assert.equal(payload.exit_codes.verify_volumes_both, 0);

  const verifyV2Evidence = readJsonFile(payload.evidence_paths.verify_v2);
  const verifyVolumesEvidence = readJsonFile(payload.evidence_paths.verify_volumes_both);
  const summaryEvidence = readJsonFile(payload.evidence_paths.verification_summary);
  const metadata = readJsonFile(payload.evidence_paths.metadata);

  assert.equal(verifyV2Evidence.command, "verify");
  assert.equal(verifyVolumesEvidence.mode, "both");

  assert.equal(summaryEvidence.schema_version, 1);
  assert.equal(summaryEvidence.command, "verify-release");
  assert.match(summaryEvidence.verification_started_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(summaryEvidence.verification_completed_at, /^\d{4}-\d{2}-\d{2}T/);

  assert.equal(summaryEvidence.steps.verify_v2.exit_code, 0);
  assert.equal(summaryEvidence.steps.verify_volumes_both.exit_code, 0);
  assert.match(summaryEvidence.commitments.manifest_sha256, /^[0-9a-f]{64}$/);
  assert.match(summaryEvidence.commitments.base_v1_jsonl_hash_sha256, /^[0-9a-f]{64}$/);
  assert.match(summaryEvidence.commitments.dataset_v1_hash_sha256, /^[0-9a-f]{64}$/);

  assert.equal(metadata.state, "verified");
  assert.equal(metadata.verification.v2_exit_code, 0);
  assert.equal(metadata.verification.unified_exit_code, 0);
  assert.match(metadata.verification.manifest_sha256, /^[0-9a-f]{64}$/);

  assert.ok(summaryEvidence.commit_binding && typeof summaryEvidence.commit_binding === "object");
  assert.ok(["ok", "unavailable"].includes(summaryEvidence.commit_binding.status));
  if (summaryEvidence.commit_binding.status === "ok") {
    assert.match(summaryEvidence.commit_binding.git_commit_sha, /^[0-9a-f]{40}$/);
  }
});

test("release-v2 finalize-manifest fails on duplicate inscription ids", () => {
  const rootDir = makeTempDir();
  const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
  const releaseRootDir = path.join(rootDir, "releases");
  const releaseId = "phase2-duplicate-map";
  const releaseDir = path.join(releaseRootDir, releaseId);
  const contract = getReleaseContractPaths(releaseDir);
  const duplicateMapPath = path.join(rootDir, "duplicate-map.json");

  const prepareResult = runNodeScript("scripts/release-v2.js", [
    "prepare",
    "--release-id",
    releaseId,
    "--release-root",
    releaseRootDir,
    "--source-output-dir",
    fixture.outputDir,
  ]);
  assert.equal(prepareResult.status, 0, `release prepare failed:\n${prepareResult.stderr}`);

  const template = readJsonFile(contract.inscription_map_template_path);
  const duplicateMap = buildFilledInscriptionMap(template);

  if (duplicateMap.families.base.length > 0 && duplicateMap.families.prospect.length > 0) {
    duplicateMap.families.prospect[0].inscription_id = duplicateMap.families.base[0].inscription_id;
  }

  writeJsonFile(duplicateMapPath, duplicateMap);

  const finalizeResult = runNodeScript("scripts/release-v2.js", [
    "finalize-manifest",
    "--release-id",
    releaseId,
    "--release-root",
    releaseRootDir,
    "--inscription-map",
    duplicateMapPath,
  ]);

  assertFailed(finalizeResult, /Duplicate inscription id in shard inscription mapping\./, "duplicate inscription ids");
});

test("release-v2 verify-release fails when finalized shard payload is tampered", () => {
  const rootDir = makeTempDir();
  const finalized = buildFinalizedReleaseFixture(rootDir);
  const v1Fixture = createTinyV1VolumesFixture(path.join(rootDir, "v1"));

  const baseShards = getSortedShardFiles(finalized.contract.payload_dir, "base");
  assert.ok(baseShards.length > 0, "expected at least one base shard in release fixture");

  const firstShardPath = baseShards[0];
  const originalBytes = fs.readFileSync(firstShardPath);
  const tampered = Buffer.from(originalBytes);
  tampered[0] = tampered[0] ^ 0x01;
  fs.writeFileSync(firstShardPath, tampered);

  const verifyResult = runNodeScript("scripts/release-v2.js", [
    "verify-release",
    "--release-id",
    finalized.releaseId,
    "--release-root",
    finalized.releaseRootDir,
    "--base-hash-file",
    finalized.fixture.baseHashPath,
    "--dataset-hash-file",
    v1Fixture.hashFile,
    "--volumes-dir",
    v1Fixture.volumesDir,
    "--volume-count",
    String(v1Fixture.volumeCount),
  ]);

  assertFailed(verifyResult, /Shard hash does not match manifest descriptor\./, "tampered shard verify-release");
});
