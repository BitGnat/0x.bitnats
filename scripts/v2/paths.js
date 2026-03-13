"use strict";

const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const DATASET_DIR = path.join(ROOT, "dataset");
const DATASET_V1_FILE = path.join(DATASET_DIR, "inscriptions.jsonl");

const DATASET_V2_DIR = path.join(ROOT, "dataset_v2");
const DATASET_V2_MANIFEST_FILE = path.join(DATASET_V2_DIR, "manifest.v2.json");
const DATASET_V2_SHARDS_DIR = path.join(DATASET_V2_DIR, "shards");

const FAMILY_STREAM_FILENAME = "stream.bin";
const FAMILY_SHARDS_DIRNAME = "shards";

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

function toRepoPath(absolutePath) {
  return path.relative(ROOT, absolutePath).split(path.sep).join("/");
}

module.exports = {
  DATASET_DIR,
  DATASET_V1_FILE,
  DATASET_V2_DIR,
  DATASET_V2_MANIFEST_FILE,
  DATASET_V2_SHARDS_DIR,
  FAMILY_SHARDS_DIRNAME,
  FAMILY_STREAM_FILENAME,
  getFamilyOutputDir,
  getFamilyShardsDir,
  getFamilyStreamPath,
  getShardFileName,
  getShardFilePath,
  ROOT,
  toRepoPath,
};