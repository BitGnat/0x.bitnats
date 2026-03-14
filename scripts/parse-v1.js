#!/usr/bin/env node
"use strict";

/**
 * Normative references:
 * - docs/03-dataset.md (Sections 1-3: V1 historical dataset and V2 boundary)
 * - docs/07-encoding-algorithm.md (Section 3: canonical logical record model)
 */

const fs = require("fs");

const {
  ensureParentDir,
  printFatalAndExit,
  readOptionValue,
  resolveCliPath,
} = require("./v2/cli_utils");
const { DATASET_V1_FILE, toRepoPath } = require("./v2/paths");
const { parseV1JsonlFile, recordsToSerializable } = require("./v2/parse_v1_jsonl");

function printUsage() {
  console.log("Usage: node scripts/parse-v1.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --input, -i <path>    V1 JSONL input path (default: dataset/inscriptions.jsonl)");
  console.log("  --output, -o <path>   Optional output path for canonical logical records JSON");
  console.log("  --json                Print canonical logical records JSON to stdout");
  console.log("  --help, -h            Show this message");
}

function parseArgs(argv) {
  const options = {
    input: DATASET_V1_FILE,
    output: null,
    printJson: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "--input":
      case "-i":
        options.input = resolveCliPath(readOptionValue(argv, i, arg));
        i += 1;
        break;

      case "--output":
      case "-o":
        options.output = resolveCliPath(readOptionValue(argv, i, arg));
        i += 1;
        break;

      case "--json":
        options.printJson = true;
        break;

      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;

      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function buildOutputPayload(records, inputPath) {
  return {
    source: toRepoPath(inputPath),
    record_count: records.length,
    records: recordsToSerializable(records),
  };
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const records = parseV1JsonlFile(options.input);
    const payload = buildOutputPayload(records, options.input);

    if (options.output) {
      ensureParentDir(options.output);
      fs.writeFileSync(options.output, JSON.stringify(payload, null, 2) + "\n");
      console.log(`Wrote logical records: ${options.output}`);
    }

    if (options.printJson) {
      process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
      console.error(`Loaded ${records.length} logical records from ${toRepoPath(options.input)}.`);
      return;
    }

    console.log(`Loaded ${records.length} logical records from ${toRepoPath(options.input)}.`);
  } catch (error) {
    printFatalAndExit(error);
  }
}

main();