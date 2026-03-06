#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DATASET_HASH_FILE = path.join(ROOT, "dataset/inscriptions.jsonl.sha256");
const VOLUMES_DIR = path.join(ROOT, "volumes");
const VOLUME_COUNT = 9;

// Read expected hash
const expectedHash = fs.readFileSync(DATASET_HASH_FILE, "utf8").trim().split(/\s+/)[0].toLowerCase();

// Concatenate volumes and compute SHA256
const hash = crypto.createHash("sha256");
for (let i = 1; i <= VOLUME_COUNT; i++) {
  const file = path.join(VOLUMES_DIR, `volume${i}.jsonl`);
  const buffer = fs.readFileSync(file);
  hash.update(buffer);
}

const combinedHash = hash.digest("hex");

if (combinedHash === expectedHash) {
  console.log("✅ Reconstruction verified. Hash matches canonical dataset.");
} else {
  console.error("❌ Reconstruction failed!");
  console.error("Expected:", expectedHash);
  console.error("Actual:  ", combinedHash);
  process.exit(1);
}