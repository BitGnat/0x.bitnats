#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATASET_DIR = path.join(ROOT, "dataset");
const VOLUMES_DIR = path.join(ROOT, "volumes");

const DATASET_FILE = path.join(DATASET_DIR, "inscriptions.jsonl");
const DATASET_HASH_FILE = path.join(DATASET_DIR, "inscriptions.jsonl.sha256");
const MANIFEST_FILE = path.join(DATASET_DIR, "manifest.json");

const VOLUME_COUNT = 9;

function assertExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${path.relative(ROOT, filePath)}`);
    process.exit(1);
  }
}

function readSha256(filePath) {
  assertExists(filePath);

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    console.error(`❌ Empty hash file: ${path.relative(ROOT, filePath)}`);
    process.exit(1);
  }

  const hash = raw.split(/\s+/)[0].toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(hash)) {
    console.error(`❌ Invalid SHA256 in: ${path.relative(ROOT, filePath)}`);
    process.exit(1);
  }

  return hash;
}

function getByteSize(filePath) {
  assertExists(filePath);
  return fs.statSync(filePath).size;
}

function toRepoPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function buildManifest() {
  assertExists(DATASET_FILE);
  assertExists(DATASET_HASH_FILE);

  const datasetSha256 = readSha256(DATASET_HASH_FILE);
  const datasetBytes = getByteSize(DATASET_FILE);

  const volumes = [];

  for (let i = 1; i <= VOLUME_COUNT; i++) {
    const volumeFile = path.join(VOLUMES_DIR, `volume${i}.jsonl`);
    const volumeHashFile = path.join(VOLUMES_DIR, `volume${i}.jsonl.sha256`);

    assertExists(volumeFile);
    assertExists(volumeHashFile);

    volumes.push({
      file: toRepoPath(volumeFile),
      bytes: getByteSize(volumeFile),
      sha256: readSha256(volumeHashFile),
    });
  }

  return {
    name: "0x.bitnats canonical dataset",
    version: 1,
    dataset_file: toRepoPath(DATASET_FILE),
    dataset_bytes: datasetBytes,
    dataset_sha256: datasetSha256,
    volume_count: VOLUME_COUNT,
    volumes,
  };
}

function main() {
  const manifest = buildManifest();

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`✅ Wrote manifest: ${toRepoPath(MANIFEST_FILE)}`);
  console.log(`Dataset SHA256: ${manifest.dataset_sha256}`);
  console.log(`Volumes: ${manifest.volume_count}`);
}

main();