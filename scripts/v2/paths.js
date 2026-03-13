"use strict";

const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const DATASET_DIR = path.join(ROOT, "dataset");
const DATASET_V1_FILE = path.join(DATASET_DIR, "inscriptions.jsonl");

const DATASET_V2_DIR = path.join(ROOT, "dataset_v2");
const DATASET_V2_MANIFEST_FILE = path.join(DATASET_V2_DIR, "manifest.v2.json");
const DATASET_V2_SHARDS_DIR = path.join(DATASET_V2_DIR, "shards");

function toRepoPath(absolutePath) {
  return path.relative(ROOT, absolutePath).split(path.sep).join("/");
}

module.exports = {
  DATASET_DIR,
  DATASET_V1_FILE,
  DATASET_V2_DIR,
  DATASET_V2_MANIFEST_FILE,
  DATASET_V2_SHARDS_DIR,
  ROOT,
  toRepoPath,
};