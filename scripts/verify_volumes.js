#!/usr/bin/env node
"use strict";

/**
 * Normative references:
 * - docs/03-dataset.md (Sections 3, 6, and 8: V1 historical compatibility, dual verification, and deterministic reconstruction)
 * - docs/04-verification.md (Sections 7-10 and 12: dual verification model, script behavior, and failure conditions)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { runVerifyCommand, CliUsageError } = require("./verify-v2");
const { assertFamilyId, assertInvariant } = require("./v2/constants");
const { printFatalAndExit, readOptionValue, resolveCliPath } = require("./v2/cli_utils");
const { DATASET_DIR, DATASET_V2_MANIFEST_FILE } = require("./v2/paths");

const ROOT = path.resolve(__dirname, "..");
const DATASET_HASH_FILE = path.join(DATASET_DIR, "inscriptions.jsonl.sha256");
const VOLUMES_DIR = path.join(ROOT, "volumes");
const VOLUME_COUNT = 9;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const EXIT_USAGE_ERROR = 2;

function parseExpectedSha256(filePath, contextLabel) {
  assertInvariant(typeof filePath === "string" && filePath.length > 0, `Missing ${contextLabel} hash path.`);
  assertInvariant(fs.existsSync(filePath), `Missing ${contextLabel} hash file: ${filePath}`);

  const token = fs.readFileSync(filePath, "utf8").trim().split(/\s+/)[0];

  assertInvariant(
    typeof token === "string" && SHA256_HEX_PATTERN.test(token),
    `Invalid ${contextLabel} hash file: expected lowercase SHA-256 hex.`,
    {
      path: filePath,
      value: token,
    }
  );

  return token;
}

function verifyV1Volumes(options) {
  const expectedHash = parseExpectedSha256(options.datasetHashFile, "V1 dataset");
  const hash = crypto.createHash("sha256");

  for (let index = 1; index <= options.volumeCount; index++) {
    const filePath = path.join(options.volumesDir, `volume${index}.jsonl`);

    assertInvariant(fs.existsSync(filePath), `Missing volume file: volume${index}.jsonl`, {
      volume_path: filePath,
      volume_index: index,
    });

    hash.update(fs.readFileSync(filePath));
  }

  const combinedHash = hash.digest("hex");

  assertInvariant(
    combinedHash === expectedHash,
    "V1 volume reconstruction hash mismatch.",
    {
      expected_sha256: expectedHash,
      actual_sha256: combinedHash,
    }
  );

  return {
    mode: "v1",
    dataset_hash_sha256: combinedHash,
    expected_dataset_hash_sha256: expectedHash,
    volume_count: options.volumeCount,
    volumes_dir: options.volumesDir,
  };
}

function printUsage() {
  console.log("Usage: node scripts/verify_volumes.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --mode <v1|v2|both>       Verification mode (default: v1)");
  console.log("  --dataset-hash-file <p>   V1 hash commitment file (default: dataset/inscriptions.jsonl.sha256)");
  console.log("  --volumes-dir <path>      V1 volumes directory (default: volumes)");
  console.log(`  --volume-count <n>        Number of V1 volumes (default: ${VOLUME_COUNT})`);
  console.log("  --manifest <path>         Manifest V2 path (default: dataset_v2/manifest.v2.json)");
  console.log("  --output-dir <path>       V2 artifact directory (default: directory of --manifest)");
  console.log("  --family <id|all>         V2 family selector: base|prospect|forged|all (default: all)");
  console.log("  --base-hash-file <path>   Canonical base JSONL hash file for V2 base verification");
  console.log("  --json                    Print output as JSON");
  console.log("  --help, -h                Show this message");
}

function parsePositiveInt(value, optionName) {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new CliUsageError(`Invalid value for ${optionName}: expected positive integer.`);
  }

  return parsed;
}

function parseArgs(argv) {
  const options = {
    mode: "v1",
    datasetHashFile: DATASET_HASH_FILE,
    volumesDir: VOLUMES_DIR,
    volumeCount: VOLUME_COUNT,
    manifestPath: DATASET_V2_MANIFEST_FILE,
    outputDir: null,
    family: "all",
    baseHashFile: DATASET_HASH_FILE,
    printJson: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    switch (arg) {
      case "--mode":
        options.mode = readOptionValue(argv, index, arg);
        index += 1;
        break;

      case "--dataset-hash-file":
        options.datasetHashFile = resolveCliPath(readOptionValue(argv, index, arg));
        index += 1;
        break;

      case "--volumes-dir":
        options.volumesDir = resolveCliPath(readOptionValue(argv, index, arg));
        index += 1;
        break;

      case "--volume-count":
        options.volumeCount = parsePositiveInt(readOptionValue(argv, index, arg), arg);
        index += 1;
        break;

      case "--manifest":
        options.manifestPath = resolveCliPath(readOptionValue(argv, index, arg));
        index += 1;
        break;

      case "--output-dir":
        options.outputDir = resolveCliPath(readOptionValue(argv, index, arg));
        index += 1;
        break;

      case "--family":
        options.family = readOptionValue(argv, index, arg);
        index += 1;
        break;

      case "--base-hash-file":
        options.baseHashFile = resolveCliPath(readOptionValue(argv, index, arg));
        index += 1;
        break;

      case "--json":
        options.printJson = true;
        break;

      case "--help":
      case "-h":
        options.help = true;
        break;

      default:
        throw new CliUsageError(`Unknown argument: ${arg}`);
    }
  }

  if (!["v1", "v2", "both"].includes(options.mode)) {
    throw new CliUsageError("Invalid --mode value. Expected one of: v1, v2, both.");
  }

  if (options.family !== "all") {
    assertFamilyId(options.family);
  }

  if (options.outputDir === null) {
    options.outputDir = path.dirname(options.manifestPath);
  }

  return options;
}

function runUnifiedVerification(options) {
  const result = {
    mode: options.mode,
    v1: null,
    v2: null,
  };

  if (options.mode === "v1" || options.mode === "both") {
    result.v1 = verifyV1Volumes(options);
  }

  if (options.mode === "v2" || options.mode === "both") {
    result.v2 = runVerifyCommand({
      command: "verify",
      manifestPath: options.manifestPath,
      outputDir: options.outputDir,
      family: options.family,
      baseHashPath: options.baseHashFile,
      printJson: false,
    });
  }

  return result;
}

function printHumanSummary(result) {
  if (result.v1) {
    console.log("V1 verification passed.");
    console.log(`Dataset SHA256: ${result.v1.dataset_hash_sha256}`);
    console.log(`Volumes: ${result.v1.volume_count}`);
  }

  if (result.v2) {
    console.log("V2 verification passed.");
    console.log(`Manifest: ${result.v2.manifest_path}`);

    for (const familyId of result.v2.verified_families) {
      const family = result.v2.families[familyId];
      console.log(`${familyId}: ${family.shard_count} shard(s), stream sha256=${family.stream_hash_sha256}`);
      console.log(`${familyId}: reconstructed_jsonl_sha256=${family.reconstructed_jsonl_hash_sha256}`);
    }
  }
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printUsage();
      process.exit(0);
    }

    const result = runUnifiedVerification(options);

    if (options.printJson) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }

    printHumanSummary(result);
  } catch (error) {
    if (error instanceof CliUsageError) {
      console.error(`ERROR: ${error.message}`);
      printUsage();
      process.exit(EXIT_USAGE_ERROR);
    }

    printFatalAndExit(error);
  }
}

main();