#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DATASET_HASH_FILE = path.join(ROOT, "dataset/inscriptions.jsonl.sha256");
const VOLUMES_DIR = path.join(ROOT, "volumes");
const VOLUME_COUNT = 9;

// Read canonical dataset hash
const expectedHash = fs.readFileSync(DATASET_HASH_FILE, "utf8")
  .trim()
  .split(/\s+/)[0]
  .toLowerCase();

const hash = crypto.createHash("sha256");

for (let i = 1; i <= VOLUME_COUNT; i++) {
  const file = path.join(VOLUMES_DIR, `volume${i}.jsonl`);

  if (!fs.existsSync(file)) {
    console.error(`❌ Missing volume file: volume${i}.jsonl`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(file);
  hash.update(buffer);
}

const combinedHash = hash.digest("hex");

if (combinedHash === expectedHash) {
  console.log("✅ Reconstruction verified. Hash matches canonical dataset.");
  console.log("Dataset SHA256:", combinedHash);
} else {
  console.error("❌ Reconstruction failed!");
  console.error("Expected:", expectedHash);
  console.error("Actual:  ", combinedHash);
  process.exit(1);
}