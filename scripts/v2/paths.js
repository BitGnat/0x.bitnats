"use strict";

const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const DATASET_DIR = path.join(ROOT, "dataset");
const DATASET_V1_FILE = path.join(DATASET_DIR, "inscriptions.jsonl");

const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const ARTIFACTS_RELEASES_DIR = path.join(ARTIFACTS_DIR, "releases");

const DATASET_V2_DIR = path.join(ROOT, "dataset_v2");
const DATASET_V2_MANIFEST_FILE = path.join(DATASET_V2_DIR, "manifest.v2.json");
const DATASET_V2_SHARDS_DIR = path.join(DATASET_V2_DIR, "shards");

const FAMILY_STREAM_FILENAME = "stream.bin";
const FAMILY_SHARDS_DIRNAME = "shards";

const RELEASE_PAYLOAD_DIRNAME = "payload";
const RELEASE_CHECKSUMS_DIRNAME = "checksums";
const RELEASE_PLANNING_DIRNAME = "planning";
const RELEASE_RECONCILIATION_DIRNAME = "reconciliation";
const RELEASE_TEMP_DIRNAME = "temp";
const RELEASE_CANONICAL_DIRNAME = "canonical";
const RELEASE_METADATA_DIRNAME = "metadata";

const RELEASE_PRE_INSCRIPTION_TEMP_DIRNAME = "pre-inscription";
const RELEASE_VERIFICATION_TEMP_DIRNAME = "verification";

const RELEASE_SHARD_CHECKSUMS_FILE = "shard-checksums.sha256";
const RELEASE_PUBLISH_PLAN_FILE = "publish-order.json";
const RELEASE_INSCRIPTION_MAP_TEMPLATE_FILE = "inscription-map.template.json";
const RELEASE_FINAL_INSCRIPTION_MAP_FILE = "inscription-map.final.json";
const RELEASE_RECONCILIATION_FILE = "shard-reconciliation.json";
const RELEASE_LOCAL_MANIFEST_FILE = "manifest.local.v2.json";
const RELEASE_CANONICAL_MANIFEST_FILE = "manifest.v2.json";
const RELEASE_METADATA_FILE = "release-metadata.json";

function normalizePathSlashes(value) {
  return value.split(path.sep).join("/");
}

function getFamilyOutputDir(outputDir, familyId) {
  return path.join(outputDir, familyId);
}

function getFamilyStreamPath(outputDir, familyId) {
  return path.join(getFamilyOutputDir(outputDir, familyId), FAMILY_STREAM_FILENAME);
}

function getFamilyShardsDir(outputDir, familyId) {
  return path.join(getFamilyOutputDir(outputDir, familyId), FAMILY_SHARDS_DIRNAME);
}

function getShardFileName(shardIndex) {
  return `shard-${String(shardIndex).padStart(6, "0")}.bin`;
}

function getShardFilePath(outputDir, familyId, shardIndex) {
  return path.join(getFamilyShardsDir(outputDir, familyId), getShardFileName(shardIndex));
}

function getReleaseDir(releaseRootDir, releaseId) {
  return path.join(releaseRootDir, releaseId);
}

function getReleasePayloadDir(releaseDir) {
  return path.join(releaseDir, RELEASE_PAYLOAD_DIRNAME);
}

function getReleasePayloadFamilyDir(releaseDir, familyId) {
  return path.join(getReleasePayloadDir(releaseDir), familyId);
}

function getReleasePayloadFamilyShardsDir(releaseDir, familyId) {
  return path.join(getReleasePayloadFamilyDir(releaseDir, familyId), FAMILY_SHARDS_DIRNAME);
}

function getReleaseChecksumsDir(releaseDir) {
  return path.join(releaseDir, RELEASE_CHECKSUMS_DIRNAME);
}

function getReleasePlanningDir(releaseDir) {
  return path.join(releaseDir, RELEASE_PLANNING_DIRNAME);
}

function getReleaseReconciliationDir(releaseDir) {
  return path.join(releaseDir, RELEASE_RECONCILIATION_DIRNAME);
}

function getReleaseTempDir(releaseDir) {
  return path.join(releaseDir, RELEASE_TEMP_DIRNAME);
}

function getReleasePreInscriptionTempDir(releaseDir) {
  return path.join(getReleaseTempDir(releaseDir), RELEASE_PRE_INSCRIPTION_TEMP_DIRNAME);
}

function getReleaseVerificationTempDir(releaseDir) {
  return path.join(getReleaseTempDir(releaseDir), RELEASE_VERIFICATION_TEMP_DIRNAME);
}

function getReleaseCanonicalDir(releaseDir) {
  return path.join(releaseDir, RELEASE_CANONICAL_DIRNAME);
}

function getReleaseMetadataDir(releaseDir) {
  return path.join(releaseDir, RELEASE_METADATA_DIRNAME);
}

function getReleaseShardChecksumsPath(releaseDir) {
  return path.join(getReleaseChecksumsDir(releaseDir), RELEASE_SHARD_CHECKSUMS_FILE);
}

function getReleasePublishPlanPath(releaseDir) {
  return path.join(getReleasePlanningDir(releaseDir), RELEASE_PUBLISH_PLAN_FILE);
}

function getReleaseInscriptionMapTemplatePath(releaseDir) {
  return path.join(getReleasePlanningDir(releaseDir), RELEASE_INSCRIPTION_MAP_TEMPLATE_FILE);
}

function getReleaseFinalInscriptionMapPath(releaseDir) {
  return path.join(getReleaseReconciliationDir(releaseDir), RELEASE_FINAL_INSCRIPTION_MAP_FILE);
}

function getReleaseReconciliationPath(releaseDir) {
  return path.join(getReleaseReconciliationDir(releaseDir), RELEASE_RECONCILIATION_FILE);
}

function getReleaseLocalManifestPath(releaseDir) {
  return path.join(getReleasePreInscriptionTempDir(releaseDir), RELEASE_LOCAL_MANIFEST_FILE);
}

function getReleaseCanonicalManifestPath(releaseDir) {
  return path.join(getReleaseCanonicalDir(releaseDir), RELEASE_CANONICAL_MANIFEST_FILE);
}

function getReleaseMetadataPath(releaseDir) {
  return path.join(getReleaseMetadataDir(releaseDir), RELEASE_METADATA_FILE);
}

function getReleaseContractPaths(releaseDir) {
  return {
    release_dir: releaseDir,
    payload_dir: getReleasePayloadDir(releaseDir),
    checksums_dir: getReleaseChecksumsDir(releaseDir),
    planning_dir: getReleasePlanningDir(releaseDir),
    reconciliation_dir: getReleaseReconciliationDir(releaseDir),
    temp_dir: getReleaseTempDir(releaseDir),
    pre_inscription_temp_dir: getReleasePreInscriptionTempDir(releaseDir),
    verification_temp_dir: getReleaseVerificationTempDir(releaseDir),
    canonical_dir: getReleaseCanonicalDir(releaseDir),
    metadata_dir: getReleaseMetadataDir(releaseDir),
    shard_checksums_path: getReleaseShardChecksumsPath(releaseDir),
    publish_plan_path: getReleasePublishPlanPath(releaseDir),
    inscription_map_template_path: getReleaseInscriptionMapTemplatePath(releaseDir),
    final_inscription_map_path: getReleaseFinalInscriptionMapPath(releaseDir),
    reconciliation_path: getReleaseReconciliationPath(releaseDir),
    local_manifest_path: getReleaseLocalManifestPath(releaseDir),
    canonical_manifest_path: getReleaseCanonicalManifestPath(releaseDir),
    metadata_path: getReleaseMetadataPath(releaseDir),
  };
}

function toRepoPath(absolutePath) {
  return normalizePathSlashes(path.relative(ROOT, absolutePath));
}

module.exports = {
  ARTIFACTS_DIR,
  ARTIFACTS_RELEASES_DIR,
  DATASET_DIR,
  DATASET_V1_FILE,
  DATASET_V2_DIR,
  DATASET_V2_MANIFEST_FILE,
  DATASET_V2_SHARDS_DIR,
  FAMILY_SHARDS_DIRNAME,
  FAMILY_STREAM_FILENAME,
  RELEASE_CANONICAL_MANIFEST_FILE,
  RELEASE_INSCRIPTION_MAP_TEMPLATE_FILE,
  RELEASE_METADATA_FILE,
  RELEASE_PUBLISH_PLAN_FILE,
  RELEASE_SHARD_CHECKSUMS_FILE,
  getReleaseCanonicalDir,
  getReleaseCanonicalManifestPath,
  getReleaseChecksumsDir,
  getReleaseContractPaths,
  getReleaseDir,
  getReleaseFinalInscriptionMapPath,
  getReleaseInscriptionMapTemplatePath,
  getReleaseLocalManifestPath,
  getReleaseMetadataDir,
  getReleaseMetadataPath,
  getReleasePayloadDir,
  getReleasePayloadFamilyDir,
  getReleasePayloadFamilyShardsDir,
  getReleasePlanningDir,
  getReleasePreInscriptionTempDir,
  getReleasePublishPlanPath,
  getReleaseReconciliationDir,
  getReleaseReconciliationPath,
  getReleaseShardChecksumsPath,
  getReleaseTempDir,
  getReleaseVerificationTempDir,
  getFamilyOutputDir,
  getFamilyShardsDir,
  getFamilyStreamPath,
  getShardFileName,
  getShardFilePath,
  ROOT,
  toRepoPath,
};