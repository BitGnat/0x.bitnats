#!/usr/bin/env node
"use strict";

/**
 * Normative references:
 * - docs/04-verification.md (Sections 5-8 and 12: deterministic reconstruction algorithm and MUST-fail conditions)
 * - docs/06-manifest-v2-spec.md (Sections 11-17: shard ordering, dual commitments, and fail-closed semantics)
 * - docs/07-encoding-algorithm.md (Sections 9-10: stream/hash commitments and deterministic JSONL reconstruction)
 */

const fs = require("fs");
const path = require("path");

const {
	DATASET_V2_MANIFEST_FILE,
	DATASET_V2_DIR,
	DATASET_DIR,
	getShardFilePath,
	toRepoPath,
} = require("./v2/paths");
const { readManifestV2File } = require("./v2/manifest");
const { reconstructJsonlBufferFromStream } = require("./v2/jsonl");
const { sha256Hex } = require("./v2/hash");
const {
	SUPPORTED_FAMILIES,
	ProtocolValidationError,
	RECORD_SIZE_BYTES,
	assertFamilyId,
	assertInvariant,
	failClosed,
} = require("./v2/constants");
const {
	ensureParentDir,
	printFatalAndExit,
	readOptionValue,
	resolveCliPath,
} = require("./v2/cli_utils");

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const COMMAND_VERIFY = "verify";
const COMMAND_RECONSTRUCT_JSONL = "reconstruct-jsonl";
const EXIT_USAGE_ERROR = 2;

class CliUsageError extends Error {
	constructor(message) {
		super(message);
		this.name = "CliUsageError";
	}
}

function isInsideRepo(filePath) {
	const repoPath = toRepoPath(filePath);
	return repoPath !== "" && !repoPath.startsWith("../");
}

function formatDisplayPath(filePath) {
	return isInsideRepo(filePath) ? toRepoPath(filePath) : filePath;
}

function parseExpectedSha256File(filePath, contextLabel) {
	assertInvariant(typeof filePath === "string" && filePath.length > 0, `Missing ${contextLabel} file path.`);
	assertInvariant(fs.existsSync(filePath), `Missing ${contextLabel} file: ${filePath}`);

	const token = fs.readFileSync(filePath, "utf8").trim().split(/\s+/)[0];

	assertInvariant(
		typeof token === "string" && SHA256_HEX_PATTERN.test(token),
		`Invalid ${contextLabel}: expected lowercase SHA-256 text.`,
		{
			source_path: filePath,
			value: token,
		}
	);

	return token;
}

function resolveFamilySelection(family) {
	if (family === "all") {
		return SUPPORTED_FAMILIES.slice();
	}

	assertFamilyId(family);
	return [family];
}

function loadShardsInManifestOrder(outputDir, familyId, familyDescriptor) {
	const shards = [];

	for (const shard of familyDescriptor.shards) {
		const shardPath = getShardFilePath(outputDir, familyId, shard.index);
		assertInvariant(fs.existsSync(shardPath), "Missing shard file referenced by manifest.", {
			family_id: familyId,
			shard_index: shard.index,
			shard_path: shardPath,
		});

		const bytes = fs.readFileSync(shardPath);
		const actualHash = sha256Hex(bytes);

		assertInvariant(bytes.length === shard.byte_length, "Shard byte length does not match manifest descriptor.", {
			family_id: familyId,
			shard_index: shard.index,
			expected_byte_length: shard.byte_length,
			actual_byte_length: bytes.length,
		});

		assertInvariant(actualHash === shard.sha256, "Shard hash does not match manifest descriptor.", {
			family_id: familyId,
			shard_index: shard.index,
			expected_sha256: shard.sha256,
			actual_sha256: actualHash,
		});

		shards.push({
			index: shard.index,
			path: shardPath,
			bytes,
			byteLength: bytes.length,
			sha256: actualHash,
		});
	}

	return shards;
}

function verifyFamilyBinaryStream(manifest, outputDir, familyId) {
	assertFamilyId(familyId);

	const familyDescriptor = manifest.families[familyId];
	assertInvariant(Boolean(familyDescriptor), "Missing family descriptor in manifest.", {
		family_id: familyId,
	});

	const orderedShards = loadShardsInManifestOrder(outputDir, familyId, familyDescriptor);
	const streamBytes = orderedShards.length === 0
		? Buffer.alloc(0)
		: Buffer.concat(orderedShards.map((shard) => shard.bytes), orderedShards.reduce((sum, shard) => sum + shard.byteLength, 0));

	if (streamBytes.length % RECORD_SIZE_BYTES !== 0) {
		failClosed("Invalid binary stream length: not divisible by record size.", {
			family_id: familyId,
			stream_length: streamBytes.length,
			record_size_bytes: RECORD_SIZE_BYTES,
		});
	}

	const streamHash = sha256Hex(streamBytes);
	assertInvariant(streamHash === familyDescriptor.stream_hash_sha256, "Binary stream hash does not match manifest commitment.", {
		family_id: familyId,
		expected_stream_hash_sha256: familyDescriptor.stream_hash_sha256,
		actual_stream_hash_sha256: streamHash,
	});

	return {
		family_id: familyId,
		stream_bytes: streamBytes,
		stream_hash_sha256: streamHash,
		shard_count: orderedShards.length,
		stream_byte_length: streamBytes.length,
		shards: orderedShards.map((shard) => ({
			index: shard.index,
			path: formatDisplayPath(shard.path),
			byte_length: shard.byteLength,
			sha256: shard.sha256,
		})),
	};
}

function verifyFamilyReconstructedJsonl(manifest, familyId, streamBytes, baseJsonlHash) {
	assertFamilyId(familyId);

	const familyDescriptor = manifest.families[familyId];
	const reconstructedJsonl = reconstructJsonlBufferFromStream(streamBytes, familyId);
	const reconstructedHash = sha256Hex(reconstructedJsonl);

	assertInvariant(
		reconstructedHash === familyDescriptor.reconstructed_jsonl_hash_sha256,
		"Reconstructed JSONL hash does not match manifest commitment.",
		{
			family_id: familyId,
			expected_reconstructed_jsonl_hash_sha256: familyDescriptor.reconstructed_jsonl_hash_sha256,
			actual_reconstructed_jsonl_hash_sha256: reconstructedHash,
		}
	);

	if (familyId === "base") {
		assertInvariant(typeof baseJsonlHash === "string", "Missing base canonical JSONL hash for compatibility check.");
		assertInvariant(
			reconstructedHash === baseJsonlHash,
			"Base reconstructed JSONL hash does not match canonical V1 dataset hash.",
			{
				expected_base_v1_jsonl_hash_sha256: baseJsonlHash,
				actual_reconstructed_jsonl_hash_sha256: reconstructedHash,
			}
		);
	}

	return {
		family_id: familyId,
		reconstructed_jsonl_hash_sha256: reconstructedHash,
		reconstructed_jsonl_byte_length: reconstructedJsonl.length,
		base_v1_jsonl_hash_sha256: familyId === "base" ? baseJsonlHash : null,
		reconstructed_jsonl_bytes: reconstructedJsonl,
	};
}

function verifyFamilyDual(manifest, outputDir, familyId, baseJsonlHash) {
	const binary = verifyFamilyBinaryStream(manifest, outputDir, familyId);
	const jsonl = verifyFamilyReconstructedJsonl(manifest, familyId, binary.stream_bytes, baseJsonlHash);

	return {
		family_id: familyId,
		shard_count: binary.shard_count,
		stream_byte_length: binary.stream_byte_length,
		stream_hash_sha256: binary.stream_hash_sha256,
		reconstructed_jsonl_byte_length: jsonl.reconstructed_jsonl_byte_length,
		reconstructed_jsonl_hash_sha256: jsonl.reconstructed_jsonl_hash_sha256,
		base_v1_jsonl_hash_sha256: jsonl.base_v1_jsonl_hash_sha256,
		shards: binary.shards,
	};
}

function runVerifyCommand(options) {
	const manifest = readManifestV2File(options.manifestPath);
	const selectedFamilies = resolveFamilySelection(options.family);
	const needsBaseCompatibility = selectedFamilies.includes("base");
	const baseJsonlHash = needsBaseCompatibility ? parseExpectedSha256File(options.baseHashPath, "base compatibility") : null;

	const result = {
		command: COMMAND_VERIFY,
		manifest_path: formatDisplayPath(options.manifestPath),
		output_dir: formatDisplayPath(options.outputDir),
		verified_families: selectedFamilies,
		families: {},
	};

	for (const familyId of selectedFamilies) {
		result.families[familyId] = verifyFamilyDual(manifest, options.outputDir, familyId, baseJsonlHash);
	}

	return result;
}

function runReconstructJsonlCommand(options) {
	assertInvariant(options.family !== "all", "reconstruct-jsonl requires an explicit family id (base|prospect|forged).");

	const manifest = readManifestV2File(options.manifestPath);
	const selectedFamily = resolveFamilySelection(options.family)[0];
	const needsBaseCompatibility = selectedFamily === "base";
	const baseJsonlHash = needsBaseCompatibility ? parseExpectedSha256File(options.baseHashPath, "base compatibility") : null;

	const binary = verifyFamilyBinaryStream(manifest, options.outputDir, selectedFamily);
	const jsonl = verifyFamilyReconstructedJsonl(manifest, selectedFamily, binary.stream_bytes, baseJsonlHash);

	if (options.outputPath) {
		ensureParentDir(options.outputPath);
		fs.writeFileSync(options.outputPath, jsonl.reconstructed_jsonl_bytes);
	}

	if (options.printJson) {
		const payload = {
			command: COMMAND_RECONSTRUCT_JSONL,
			family_id: selectedFamily,
			manifest_path: formatDisplayPath(options.manifestPath),
			output_dir: formatDisplayPath(options.outputDir),
			output_path: options.outputPath ? formatDisplayPath(options.outputPath) : null,
			reconstructed_jsonl_byte_length: jsonl.reconstructed_jsonl_byte_length,
			reconstructed_jsonl_hash_sha256: jsonl.reconstructed_jsonl_hash_sha256,
			base_v1_jsonl_hash_sha256: jsonl.base_v1_jsonl_hash_sha256,
		};

		process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
		return payload;
	}

	if (options.outputPath) {
		console.log(`Wrote reconstructed JSONL: ${formatDisplayPath(options.outputPath)}`);
		console.log(`Family: ${selectedFamily}`);
		console.log(`SHA-256: ${jsonl.reconstructed_jsonl_hash_sha256}`);
		return {
			output_path: options.outputPath,
			hash: jsonl.reconstructed_jsonl_hash_sha256,
			family_id: selectedFamily,
		};
	}

	// Emit exact reconstructed JSONL bytes when no output file is requested.
	process.stdout.write(jsonl.reconstructed_jsonl_bytes);

	return {
		output_path: null,
		hash: jsonl.reconstructed_jsonl_hash_sha256,
		family_id: selectedFamily,
	};
}

function printVerifySummary(result) {
	console.log("Verified V2 manifest and family streams.");
	console.log(`Manifest: ${result.manifest_path}`);
	console.log(`Artifact directory: ${result.output_dir}`);

	for (const familyId of result.verified_families) {
		const family = result.families[familyId];
		console.log(`${familyId}: ${family.shard_count} shard(s), ${family.stream_byte_length} stream bytes, stream sha256=${family.stream_hash_sha256}`);
		console.log(`${familyId}: reconstructed_jsonl_sha256=${family.reconstructed_jsonl_hash_sha256}`);
		if (familyId === "base") {
			console.log(`${familyId}: base_v1_jsonl_sha256=${family.base_v1_jsonl_hash_sha256}`);
		}
	}
}

function printUsage() {
	console.log("Usage: node scripts/verify-v2.js [command] [options]");
	console.log("");
	console.log("Commands:");
	console.log("  verify            Default. Run dual verification (binary + reconstructed JSONL).");
	console.log("  reconstruct-jsonl Reconstruct deterministic JSONL for one family.");
	console.log("");
	console.log("Shared options:");
	console.log("  --manifest <path>      Manifest V2 path (default: dataset_v2/manifest.v2.json)");
	console.log("  --output-dir <path>    V2 artifact directory (default: directory of --manifest)");
	console.log("  --family <id|all>      Family selector: base|prospect|forged|all (default: all)");
	console.log("  --base-hash-file <p>   Canonical V1 hash file (default: dataset/inscriptions.jsonl.sha256)");
	console.log("  --json                 Print command result as JSON");
	console.log("  --help, -h             Show this message");
	console.log("");
	console.log("reconstruct-jsonl behavior:");
	console.log("  --output <path>        Write reconstructed JSONL bytes to file");
	console.log("  If --output is omitted, reconstructed JSONL bytes are written to stdout.");
}

function parseCliArgs(argv) {
	const options = {
		command: COMMAND_VERIFY,
		manifestPath: DATASET_V2_MANIFEST_FILE,
		outputDir: null,
		family: "all",
		baseHashPath: path.join(DATASET_DIR, "inscriptions.jsonl.sha256"),
		outputPath: null,
		printJson: false,
	};

	const args = argv.slice();

	if (args.length > 0 && !args[0].startsWith("-")) {
		options.command = args.shift();
	}

	if (options.command !== COMMAND_VERIFY && options.command !== COMMAND_RECONSTRUCT_JSONL) {
		throw new CliUsageError(`Unknown command: ${options.command}`);
	}

	for (let index = 0; index < args.length; index++) {
		const arg = args[index];

		switch (arg) {
			case "--manifest":
				options.manifestPath = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--output-dir":
				options.outputDir = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--family":
				options.family = readOptionValue(args, index, arg);
				index += 1;
				break;

			case "--base-hash-file":
				options.baseHashPath = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--output":
				options.outputPath = resolveCliPath(readOptionValue(args, index, arg));
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

	if (options.outputDir === null) {
		options.outputDir = path.dirname(options.manifestPath);
	}

	if (options.command === COMMAND_RECONSTRUCT_JSONL && options.family === "all") {
		throw new CliUsageError("reconstruct-jsonl requires --family base|prospect|forged.");
	}

	if (options.family !== "all") {
		assertFamilyId(options.family);
	}

	return options;
}

function runFromCli(argv) {
	const options = parseCliArgs(argv);

	if (options.help) {
		printUsage();
		return null;
	}

	if (options.command === COMMAND_RECONSTRUCT_JSONL) {
		return runReconstructJsonlCommand(options);
	}

	const result = runVerifyCommand(options);

	if (options.printJson) {
		process.stdout.write(JSON.stringify(result, null, 2) + "\n");
		return result;
	}

	printVerifySummary(result);
	return result;
}

function main() {
	try {
		runFromCli(process.argv.slice(2));
	} catch (error) {
		if (error instanceof CliUsageError) {
			console.error(`ERROR: ${error.message}`);
			printUsage();
			process.exit(EXIT_USAGE_ERROR);
		}

		printFatalAndExit(error);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	CliUsageError,
	parseExpectedSha256File,
	runReconstructJsonlCommand,
	runVerifyCommand,
	runFromCli,
	verifyFamilyBinaryStream,
	verifyFamilyDual,
	verifyFamilyReconstructedJsonl,
};