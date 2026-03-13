#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const {
	RECORD_SIZE_BYTES,
	SHARD_TARGET_BYTES,
	SUPPORTED_FAMILIES,
	assertFamilyId,
	failClosed,
	assertInvariant,
} = require("./v2/constants");
const {
	ensureParentDir,
	printFatalAndExit,
	readOptionValue,
	resolveCliPath,
} = require("./v2/cli_utils");
const { decodeFamilyStream, encodeFamilyStream } = require("./v2/binary");
const { classifyRecords } = require("./v2/classify");
const { sha256Hex } = require("./v2/hash");
const {
	DATASET_V1_FILE,
	DATASET_V2_DIR,
	ROOT,
	getFamilyOutputDir,
	getFamilyShardsDir,
	getFamilyStreamPath,
	getShardFilePath,
	toRepoPath,
} = require("./v2/paths");
const { parseV1JsonlFile, recordsToSerializable } = require("./v2/parse_v1_jsonl");
const { shardFamilyStream } = require("./v2/shard");
const { sortClassifiedFamiliesCanonical } = require("./v2/sort");

function printUsage() {
	console.log("Usage: node scripts/encode-v2.js [options]");
	console.log("");
	console.log("Current implemented stage: parse -> classify -> sort -> encode -> shard");
	console.log("");
	console.log("Options:");
	console.log("  --input, -i <path>            Input JSONL file (default: dataset/inscriptions.jsonl)");
	console.log("  --default-family, -f <family> Semantic family for records without an explicit family (default: base)");
	console.log("  --infer-family-from-index     Infer family by inscription index when default family is not provided");
	console.log("  --output, -o <path>           Optional output JSON path");
	console.log("  --output-dir <path>           Directory for generated V2 artifacts (default: dataset_v2)");
	console.log("  --dry-run                     Compute outputs without writing stream or shard files");
	console.log("  --json                        Print output JSON to stdout");
	console.log("  --include-records             Include per-family sorted records in JSON output");
	console.log("  --include-shards              Include per-family shard metadata in JSON output");
	console.log(`  --shard-target-bytes <n>      Shard target size in bytes (default: ${SHARD_TARGET_BYTES})`);
	console.log("  --help, -h                    Show this message");
}

function isInsideRepo(filePath) {
	const relative = path.relative(ROOT, filePath);
	return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function formatDisplayPath(filePath) {
	return isInsideRepo(filePath) ? toRepoPath(filePath) : filePath;
}

function parsePositiveInteger(value, optionName) {
	const parsed = Number(value);

	if (!Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new Error(`Invalid value for ${optionName}: expected positive integer.`);
	}

	return parsed;
}

function parseArgs(argv) {
	const options = {
		input: DATASET_V1_FILE,
		output: null,
		outputDir: DATASET_V2_DIR,
		printJson: false,
		includeRecords: false,
		includeShards: false,
		defaultFamily: "base",
		inferFamilyFromIndex: false,
		dryRun: false,
		shardTargetBytes: SHARD_TARGET_BYTES,
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

			case "--output-dir":
				options.outputDir = resolveCliPath(readOptionValue(argv, i, arg));
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

			case "--dry-run":
				options.dryRun = true;
				break;

			case "--json":
				options.printJson = true;
				break;

			case "--include-records":
				options.includeRecords = true;
				break;

			case "--include-shards":
				options.includeShards = true;
				break;

			case "--shard-target-bytes":
				options.shardTargetBytes = parsePositiveInteger(readOptionValue(argv, i, arg), arg);
				i += 1;
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

function assertDecodeRoundTrip(originalRecords, decodedRecords, familyId) {
	assertInvariant(
		originalRecords.length === decodedRecords.length,
		"Binary decode roundtrip changed record count.",
		{
			family_id: familyId,
			original_count: originalRecords.length,
			decoded_count: decodedRecords.length,
		}
	);

	for (let index = 0; index < originalRecords.length; index++) {
		if (originalRecords[index].id !== decodedRecords[index].id) {
			failClosed("Binary decode roundtrip changed record identity.", {
				family_id: familyId,
				record_index: index,
				expected_id: originalRecords[index].id,
				actual_id: decodedRecords[index].id,
			});
		}
	}
}

function cleanGeneratedShardFiles(shardsDir) {
	if (!fs.existsSync(shardsDir)) {
		return;
	}

	for (const childName of fs.readdirSync(shardsDir)) {
		if (/^shard-\d+\.bin$/.test(childName)) {
			fs.rmSync(path.join(shardsDir, childName));
		}
	}
}

function writeFamilyArtifacts(outputDir, familyId, streamBytes, shards) {
	assertFamilyId(familyId);

	const familyDir = getFamilyOutputDir(outputDir, familyId);
	const streamPath = getFamilyStreamPath(outputDir, familyId);
	const shardsDir = getFamilyShardsDir(outputDir, familyId);

	fs.mkdirSync(familyDir, { recursive: true });
	fs.mkdirSync(shardsDir, { recursive: true });
	cleanGeneratedShardFiles(shardsDir);

	fs.writeFileSync(streamPath, streamBytes);

	const shardFiles = [];

	for (const shard of shards) {
		const shardPath = getShardFilePath(outputDir, familyId, shard.index);
		fs.writeFileSync(shardPath, shard.bytes);
		shardFiles.push(formatDisplayPath(shardPath));
	}

	return {
		family_dir: formatDisplayPath(familyDir),
		stream_file: formatDisplayPath(streamPath),
		shards_dir: formatDisplayPath(shardsDir),
		shard_files: shardFiles,
	};
}

function buildFamilyArtifact(records, familyId, options) {
	const streamBytes = encodeFamilyStream(records, familyId);
	const decodedRecords = decodeFamilyStream(streamBytes, familyId);
	const shards = shardFamilyStream(streamBytes, familyId, options.shardTargetBytes);
	const streamSha256 = sha256Hex(streamBytes);

	assertInvariant(
		streamBytes.length === records.length * RECORD_SIZE_BYTES,
		"Encoded stream length does not match fixed-width record count.",
		{
			family_id: familyId,
			stream_length: streamBytes.length,
			record_count: records.length,
			record_size_bytes: RECORD_SIZE_BYTES,
		}
	);

	assertDecodeRoundTrip(records, decodedRecords, familyId);

	const shardBytesTotal = shards.reduce((sum, shard) => sum + shard.byteLength, 0);
	assertInvariant(shardBytesTotal === streamBytes.length, "Shard bytes do not reconstruct the full stream.", {
		family_id: familyId,
		shard_bytes_total: shardBytesTotal,
		stream_length: streamBytes.length,
	});

	const familySummary = {
		family_id: familyId,
		record_count: records.length,
		stream_bytes: streamBytes.length,
		stream_hash_sha256: streamSha256,
		shard_count: shards.length,
	};

	if (options.includeRecords) {
		familySummary.records = recordsToSerializable(records);
	}

	if (options.includeShards) {
		familySummary.shards = shards.map((shard) => ({
			index: shard.index,
			byte_length: shard.byteLength,
			sha256: shard.sha256,
		}));
	}

	if (!options.dryRun) {
		const outputFiles = writeFamilyArtifacts(options.outputDir, familyId, streamBytes, shards);
		familySummary.output_files = outputFiles;
	}

	return familySummary;
}

function buildOutputPayload(options, sortedFamilies, totalRecords) {
	const familyArtifacts = {};

	for (const familyId of SUPPORTED_FAMILIES) {
		familyArtifacts[familyId] = buildFamilyArtifact(sortedFamilies[familyId], familyId, options);
	}

	const payload = {
		stage: "parse-classify-sort-encode-shard",
		source: toRepoPath(options.input),
		total_records: totalRecords,
		default_family: options.defaultFamily,
		infer_family_from_index: options.inferFamilyFromIndex,
		dry_run: options.dryRun,
		shard_target_bytes: options.shardTargetBytes,
		output_dir: formatDisplayPath(options.outputDir),
		family_counts: {
			base: familyArtifacts.base.record_count,
			prospect: familyArtifacts.prospect.record_count,
			forged: familyArtifacts.forged.record_count,
		},
		families: familyArtifacts,
	};

	return payload;
}

function printHumanSummary(payload) {
	console.log("Completed V2 encode pipeline stage: parse -> classify -> sort -> encode -> shard");
	console.log(`Input: ${payload.source}`);
	console.log(`Output dir: ${payload.output_dir}${payload.dry_run ? " (dry run)" : ""}`);
	console.log(`Total records: ${payload.total_records}`);
	console.log(`Base: ${payload.families.base.record_count} records, ${payload.families.base.stream_bytes} bytes, ${payload.families.base.shard_count} shards`);
	console.log(`Prospect: ${payload.families.prospect.record_count} records, ${payload.families.prospect.stream_bytes} bytes, ${payload.families.prospect.shard_count} shards`);
	console.log(`Forged: ${payload.families.forged.record_count} records, ${payload.families.forged.stream_bytes} bytes, ${payload.families.forged.shard_count} shards`);
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