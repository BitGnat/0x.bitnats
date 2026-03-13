#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const {
	ensureParentDir,
	printFatalAndExit,
	readOptionValue,
	resolveCliPath,
} = require("./v2/cli_utils");
const {
	buildManifestV2FromOutput,
	readManifestV2File,
	readShardInscriptionMap,
	summarizeManifestV2,
} = require("./v2/manifest");
const { DATASET_V2_DIR, DATASET_V2_MANIFEST_FILE, ROOT, toRepoPath } = require("./v2/paths");

function printUsage() {
	console.log("Usage: node scripts/build-manifest-v2.js [options]");
	console.log("");
	console.log("Modes:");
	console.log("  Build mode (default): read V2 family streams/shards and write Manifest V2.");
	console.log("  Validate mode: use --validate <path> to validate an existing Manifest V2 file.");
	console.log("");
	console.log("Options:");
	console.log("  --input-dir <path>    V2 artifact directory (default: dataset_v2)");
	console.log("  --output, -o <path>   Manifest output path (default: <input-dir>/manifest.v2.json)");
	console.log("  --shard-map <path>    JSON file mapping family ids to ordered shard inscription ids");
	console.log("  --validate <path>     Validate an existing manifest instead of building one");
	console.log("  --json                Print manifest JSON (build) or validation summary JSON (validate)");
	console.log("  --help, -h            Show this message");
	console.log("");
	console.log("Shard map shape:");
	console.log("  {");
	console.log('    "base": ["<txid>i<index>", ...],');
	console.log('    "prospect": ["<txid>i<index>", ...],');
	console.log('    "forged": ["<txid>i<index>", ...]');
	console.log("  }");
}

function isInsideRepo(filePath) {
	const relative = path.relative(ROOT, filePath);
	return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function formatDisplayPath(filePath) {
	return isInsideRepo(filePath) ? toRepoPath(filePath) : filePath;
}

function parseArgs(argv) {
	const options = {
		inputDir: DATASET_V2_DIR,
		output: null,
		shardMap: null,
		validate: null,
		printJson: false,
	};

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];

		switch (arg) {
			case "--input-dir":
				options.inputDir = resolveCliPath(readOptionValue(argv, index, arg));
				index += 1;
				break;

			case "--output":
			case "-o":
				options.output = resolveCliPath(readOptionValue(argv, index, arg));
				index += 1;
				break;

			case "--shard-map":
				options.shardMap = resolveCliPath(readOptionValue(argv, index, arg));
				index += 1;
				break;

			case "--validate":
				options.validate = resolveCliPath(readOptionValue(argv, index, arg));
				index += 1;
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

	if (options.validate === null) {
		if (options.shardMap === null) {
			throw new Error("Missing --shard-map for build mode.");
		}

		if (options.output === null) {
			options.output = path.join(options.inputDir, path.basename(DATASET_V2_MANIFEST_FILE));
		}
	}

	return options;
}

function printBuildSummary(manifestPath, manifest) {
	console.log(`Wrote Manifest V2: ${formatDisplayPath(manifestPath)}`);
	console.log(`Base shards: ${manifest.families.base.shards.length}`);
	console.log(`Prospect shards: ${manifest.families.prospect.shards.length}`);
	console.log(`Forged shards: ${manifest.families.forged.shards.length}`);
}

function printValidateSummary(manifestPath, summary) {
	console.log(`Validated Manifest V2: ${formatDisplayPath(manifestPath)}`);
	console.log(`Base shards: ${summary.families.base.shard_count}`);
	console.log(`Prospect shards: ${summary.families.prospect.shard_count}`);
	console.log(`Forged shards: ${summary.families.forged.shard_count}`);
}

function runBuild(options) {
	const shardMap = readShardInscriptionMap(options.shardMap);
	const manifest = buildManifestV2FromOutput(options.inputDir, shardMap);

	ensureParentDir(options.output);
	fs.writeFileSync(options.output, JSON.stringify(manifest, null, 2) + "\n");

	if (options.printJson) {
		process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
		return;
	}

	printBuildSummary(options.output, manifest);
}

function runValidate(options) {
	const manifest = readManifestV2File(options.validate);
	const summary = summarizeManifestV2(manifest);

	if (options.printJson) {
		process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
		return;
	}

	printValidateSummary(options.validate, summary);
}

function main() {
	try {
		const options = parseArgs(process.argv.slice(2));

		if (options.validate !== null) {
			runValidate(options);
			return;
		}

		runBuild(options);
	} catch (error) {
		printFatalAndExit(error);
	}
}

main();
