#!/usr/bin/env node
"use strict";

const fs = require("fs");

const {
	assertFamilyId,
	failClosed,
} = require("./v2/constants");
const {
	ensureParentDir,
	printFatalAndExit,
	readOptionValue,
	resolveCliPath,
} = require("./v2/cli_utils");
const { classifyRecords } = require("./v2/classify");
const { DATASET_V1_FILE, toRepoPath } = require("./v2/paths");
const { parseV1JsonlFile, recordsToSerializable } = require("./v2/parse_v1_jsonl");
const { sortClassifiedFamiliesCanonical } = require("./v2/sort");

function printUsage() {
	console.log("Usage: node scripts/encode-v2.js [options]");
	console.log("");
	console.log("Current implemented stage: parse -> classify -> sort");
	console.log("");
	console.log("Options:");
	console.log("  --input, -i <path>            Input JSONL file (default: dataset/inscriptions.jsonl)");
	console.log("  --default-family, -f <family> Semantic family for records without an explicit family (default: base)");
	console.log("  --infer-family-from-index     Infer family by inscription index when default family is not provided");
	console.log("  --output, -o <path>           Optional output JSON path");
	console.log("  --json                        Print output JSON to stdout");
	console.log("  --include-records             Include per-family sorted records in JSON output");
	console.log("  --help, -h                    Show this message");
}

function parseArgs(argv) {
	const options = {
		input: DATASET_V1_FILE,
		output: null,
		printJson: false,
		includeRecords: false,
		defaultFamily: "base",
		inferFamilyFromIndex: false,
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

			case "--default-family":
			case "-f":
				options.defaultFamily = readOptionValue(argv, i, arg);
				i += 1;
				break;

			case "--infer-family-from-index":
				options.inferFamilyFromIndex = true;
				break;

			case "--json":
				options.printJson = true;
				break;

			case "--include-records":
				options.includeRecords = true;
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

	if (options.defaultFamily === "none") {
		options.defaultFamily = null;
	}

	if (options.defaultFamily !== null) {
		assertFamilyId(options.defaultFamily);
	}

	if (!options.inferFamilyFromIndex && options.defaultFamily === null) {
		failClosed("No family assignment mode provided. Use --default-family or --infer-family-from-index.");
	}

	return options;
}

function buildOutputPayload(options, sortedFamilies, totalRecords) {
	const payload = {
		stage: "parse-classify-sort",
		source: toRepoPath(options.input),
		total_records: totalRecords,
		default_family: options.defaultFamily,
		infer_family_from_index: options.inferFamilyFromIndex,
		family_counts: {
			base: sortedFamilies.base.length,
			prospect: sortedFamilies.prospect.length,
			forged: sortedFamilies.forged.length,
		},
	};

	if (options.includeRecords) {
		payload.families = {
			base: recordsToSerializable(sortedFamilies.base),
			prospect: recordsToSerializable(sortedFamilies.prospect),
			forged: recordsToSerializable(sortedFamilies.forged),
		};
	}

	return payload;
}

function printHumanSummary(payload) {
	console.log("Completed V2 encode pipeline stage: parse -> classify -> sort");
	console.log(`Input: ${payload.source}`);
	console.log(`Total records: ${payload.total_records}`);
	console.log(`Base: ${payload.family_counts.base}`);
	console.log(`Prospect: ${payload.family_counts.prospect}`);
	console.log(`Forged: ${payload.family_counts.forged}`);
}

function main() {
	try {
		const options = parseArgs(process.argv.slice(2));
		const records = parseV1JsonlFile(options.input);

		const classifiedFamilies = classifyRecords(records, {
			defaultFamily: options.defaultFamily,
			allowIndexInference: options.inferFamilyFromIndex,
		});

		const sortedFamilies = sortClassifiedFamiliesCanonical(classifiedFamilies);
		const payload = buildOutputPayload(options, sortedFamilies, records.length);

		if (options.output) {
			ensureParentDir(options.output);
			fs.writeFileSync(options.output, JSON.stringify(payload, null, 2) + "\n");
			console.log(`Wrote classify/sort output: ${options.output}`);
		}

		if (options.printJson) {
			process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
			return;
		}

		printHumanSummary(payload);
	} catch (error) {
		printFatalAndExit(error);
	}
}

main();