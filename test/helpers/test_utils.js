"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { SUPPORTED_FAMILIES } = require("../../scripts/v2/constants");
const { getFamilyShardsDir, getFamilyStreamPath } = require("../../scripts/v2/paths");
const { reconstructJsonlBufferFromStream } = require("../../scripts/v2/jsonl");
const { sha256Hex } = require("../../scripts/v2/hash");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const DEFAULT_SYNTHETIC_IDS = Object.freeze([
  `${"f".repeat(64)}i0`,
  `${"1".repeat(64)}i0`,
  `${"a".repeat(64)}i0`,
  `${"9".repeat(64)}i1`,
  `${"2".repeat(64)}i2`,
  `${"8".repeat(64)}i3`,
]);

function makeTempDir(prefix = "bitnats-phase4-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNodeScript(scriptRelativePath, args = [], options = {}) {
  const scriptPath = path.join(REPO_ROOT, scriptRelativePath);

  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    ...options,
  });
}

function writeJsonlIds(filePath, ids) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const body = ids.map((id) => JSON.stringify({ id })).join("\n") + "\n";
  fs.writeFileSync(filePath, body, "utf8");
}

function getSortedShardFiles(outputDir, familyId) {
  const shardsDir = getFamilyShardsDir(outputDir, familyId);

  if (!fs.existsSync(shardsDir)) {
    return [];
  }

  return fs
    .readdirSync(shardsDir)
    .filter((name) => /^shard-\d+\.bin$/.test(name))
    .sort()
    .map((name) => path.join(shardsDir, name));
}

function stableInscriptionId(familyId, index) {
  const txid = crypto.createHash("sha256").update(`${familyId}:${index}`).digest("hex");
  return `${txid}i${index}`;
}

function buildShardMapFromOutput(outputDir) {
  const shardMap = {};

  for (const familyId of SUPPORTED_FAMILIES) {
    const shardFiles = getSortedShardFiles(outputDir, familyId);
    shardMap[familyId] = shardFiles.map((unused, index) => stableInscriptionId(familyId, index));
  }

  return shardMap;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeSha256File(filePath, sha256HexValue) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${sha256HexValue}\n`, "utf8");
}

function prepareSmallV2Fixture(rootDir, options = {}) {
  const ids = Array.isArray(options.ids) ? options.ids : DEFAULT_SYNTHETIC_IDS;
  const shardTargetBytes = Number.isInteger(options.shardTargetBytes) ? options.shardTargetBytes : 66;

  const inputPath = path.join(rootDir, "input.jsonl");
  const outputDir = path.join(rootDir, "out");
  const shardMapPath = path.join(rootDir, "shard-map.json");
  const manifestPath = path.join(outputDir, "manifest.v2.json");
  const baseHashPath = path.join(rootDir, "base.sha256");

  writeJsonlIds(inputPath, ids);

  const encodeResult = runNodeScript("scripts/encode-v2.js", [
    "--input",
    inputPath,
    "--output-dir",
    outputDir,
    "--default-family",
    "none",
    "--infer-family-from-index",
    "--shard-target-bytes",
    String(shardTargetBytes),
  ]);

  if (encodeResult.status !== 0) {
    throw new Error(
      `Fixture setup failed in encode-v2.js.\nSTDOUT:\n${encodeResult.stdout}\nSTDERR:\n${encodeResult.stderr}`
    );
  }

  const shardMap = buildShardMapFromOutput(outputDir);
  writeJsonFile(shardMapPath, shardMap);

  const manifestResult = runNodeScript("scripts/build-manifest-v2.js", [
    "--input-dir",
    outputDir,
    "--shard-map",
    shardMapPath,
    "--output",
    manifestPath,
  ]);

  if (manifestResult.status !== 0) {
    throw new Error(
      `Fixture setup failed in build-manifest-v2.js.\nSTDOUT:\n${manifestResult.stdout}\nSTDERR:\n${manifestResult.stderr}`
    );
  }

  const baseStreamPath = getFamilyStreamPath(outputDir, "base");
  const baseStreamBytes = fs.existsSync(baseStreamPath) ? fs.readFileSync(baseStreamPath) : Buffer.alloc(0);
  const baseJsonlBytes = reconstructJsonlBufferFromStream(baseStreamBytes, "base");
  const baseJsonlHash = sha256Hex(baseJsonlBytes);
  writeSha256File(baseHashPath, baseJsonlHash);

  return {
    ids,
    shardTargetBytes,
    inputPath,
    outputDir,
    shardMapPath,
    manifestPath,
    baseHashPath,
    shardMap,
  };
}

function createTinyV1VolumesFixture(rootDir) {
  const volumesDir = path.join(rootDir, "volumes");
  const volumeFile = path.join(volumesDir, "volume1.jsonl");
  const hashFile = path.join(rootDir, "inscriptions.jsonl.sha256");

  fs.mkdirSync(volumesDir, { recursive: true });

  const volumeText = `${JSON.stringify({ id: `${"0".repeat(64)}i0` })}\n`;
  fs.writeFileSync(volumeFile, volumeText, "utf8");

  const hash = crypto.createHash("sha256").update(volumeText, "utf8").digest("hex");
  writeSha256File(hashFile, hash);

  return {
    volumesDir,
    volumeCount: 1,
    hashFile,
    expectedHash: hash,
  };
}

module.exports = {
  DEFAULT_SYNTHETIC_IDS,
  REPO_ROOT,
  buildShardMapFromOutput,
  createTinyV1VolumesFixture,
  getSortedShardFiles,
  makeTempDir,
  prepareSmallV2Fixture,
  readJsonFile,
  runNodeScript,
  stableInscriptionId,
  writeJsonFile,
  writeJsonlIds,
  writeSha256File,
};
