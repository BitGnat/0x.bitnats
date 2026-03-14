#!/usr/bin/env node
"use strict";

/**
 * Normative references:
 * - docs/03-dataset.md (Sections 6-8: family-separated shards and deterministic verification)
 * - docs/06-manifest-v2-spec.md (Sections 6-7 and 16-17: manifest commitments and fail-closed validation)
 */

const fs = require("fs");
const path = require("path");

const {
	RECORD_SIZE_BYTES,
	RELEASE_LAYOUT_VERSION,
	RELEASE_SHARD_TARGET_BYTES,
	SUPPORTED_FAMILIES,
	assertFamilyId,
	assertInvariant,
	assertReleaseShardTargetBytes,
} = require("./v2/constants");
const {
	SHARD_INSCRIPTION_MAPPING_VERSION,
	buildManifestV2FromOutput,
	buildShardInscriptionTemplateFromOutput,
	collectShardInventoryFromOutput,
	readManifestV2File,
	readShardInscriptionMap,
	summarizeManifestV2,
} = require("./v2/manifest");
const {
	ensureParentDir,
	printFatalAndExit,
	readOptionValue,
	resolveCliPath,
} = require("./v2/cli_utils");
const {
	ARTIFACTS_RELEASES_DIR,
	DATASET_DIR,
	DATASET_V2_DIR,
	ROOT,
	getReleaseCanonicalManifestPath,
	getReleaseContractPaths,
	getReleaseDir,
	getReleasePayloadDir,
	getReleasePayloadFamilyShardsDir,
	toRepoPath,
} = require("./v2/paths");
const { runVerifyCommand } = require("./verify-v2");

const EXIT_USAGE_ERROR = 2;
const COMMAND_PREPARE = "prepare";
const COMMAND_FINALIZE_MANIFEST = "finalize-manifest";
const COMMAND_VERIFY_RELEASE = "verify-release";
const COMMAND_SUMMARIZE = "summarize";
const SUPPORTED_COMMANDS = [
	COMMAND_PREPARE,
	COMMAND_FINALIZE_MANIFEST,
	COMMAND_VERIFY_RELEASE,
	COMMAND_SUMMARIZE,
];

class CliUsageError extends Error {
	constructor(message) {
		super(message);
		this.name = "CliUsageError";
	}
}

function isInsideRepo(filePath) {
	const relative = path.relative(ROOT, filePath);
	return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function withPathPrefix(prefix, relativePath) {
	if (typeof prefix !== "string" || prefix.length === 0) {
		return relativePath;
	}

	const normalizedPrefix = prefix.replace(/\\/g, "/").replace(/\/+$/, "");
	return `${normalizedPrefix}/${relativePath}`;
}

function formatDisplayPath(filePath) {
	return isInsideRepo(filePath) ? toRepoPath(filePath) : filePath;
}

function sanitizeReleaseId(releaseId) {
	assertInvariant(
		typeof releaseId === "string" && /^[a-z0-9][a-z0-9._-]{1,63}$/.test(releaseId),
		"Invalid release id. Use lowercase letters, digits, dots, underscores, and dashes.",
		{ release_id: releaseId }
	);

	return releaseId;
}

function printUsage() {
	console.log("Usage: node scripts/release-v2.js <command> [options]");
	console.log("");
	console.log("Commands:");
	console.log("  prepare            Initialize canonical release layout and copy shard payload files");
	console.log("  finalize-manifest  Validate inscription mapping and emit canonical manifest.v2.json");
	console.log("  verify-release     Run V2 dual verification against release payload + manifest");
	console.log("  summarize          Print release state, policy, and artifact summary");
	console.log("");
	console.log("Shared options:");
	console.log("  --release-id <id>      Release identifier under artifacts/releases/<id>");
	console.log("  --release-root <path>  Release root directory (default: artifacts/releases)");
	console.log("  --release-dir <path>   Explicit release directory (overrides --release-id)");
	console.log("  --json                 Print machine-readable JSON result");
	console.log("  --help, -h             Show this message");
	console.log("");
	console.log("prepare options:");
	console.log("  --source-output-dir <path>  Source V2 output directory to copy shards from (default: dataset_v2)");
	console.log("  --force                     Remove existing release dir before prepare");
	console.log("");
	console.log("finalize-manifest options:");
	console.log("  --inscription-map <path>    Required shard inscription mapping file");
	console.log("  --output <path>             Canonical manifest output path (default: <release>/canonical/manifest.v2.json)");
	console.log("  --payload-dir <path>        Payload directory (default: <release>/payload)");
	console.log("");
	console.log("verify-release options:");
	console.log("  --manifest <path>           Manifest path (default: <release>/canonical/manifest.v2.json)");
	console.log("  --payload-dir <path>        Payload directory (default: <release>/payload)");
	console.log("  --family <id|all>           Family selector: base|prospect|forged|all (default: all)");
	console.log("  --base-hash-file <path>     Canonical base hash file (default: dataset/inscriptions.jsonl.sha256)");
}

function parseArgs(argv) {
	const options = {
		command: null,
		releaseId: null,
		releaseRootDir: ARTIFACTS_RELEASES_DIR,
		releaseDir: null,
		help: false,
		printJson: false,
		force: false,
		sourceOutputDir: DATASET_V2_DIR,
		inscriptionMapPath: null,
		manifestPath: null,
		payloadDir: null,
		baseHashPath: path.join(DATASET_DIR, "inscriptions.jsonl.sha256"),
		family: "all",
	};

	const args = argv.slice();
	if (args.length === 0) {
		throw new CliUsageError("Missing command.");
	}

	if (args[0] === "--help" || args[0] === "-h") {
		options.help = true;
		return options;
	}

	if (!args[0].startsWith("-")) {
		options.command = args.shift();
	}

	if (!SUPPORTED_COMMANDS.includes(options.command)) {
		throw new CliUsageError(`Unknown command: ${String(options.command)}`);
	}

	for (let index = 0; index < args.length; index++) {
		const arg = args[index];

		switch (arg) {
			case "--release-id":
				options.releaseId = readOptionValue(args, index, arg);
				index += 1;
				break;

			case "--release-root":
				options.releaseRootDir = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--release-dir":
				options.releaseDir = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--source-output-dir":
				options.sourceOutputDir = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--inscription-map":
				options.inscriptionMapPath = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--output":
				options.manifestPath = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--manifest":
				options.manifestPath = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--payload-dir":
				options.payloadDir = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--base-hash-file":
				options.baseHashPath = resolveCliPath(readOptionValue(args, index, arg));
				index += 1;
				break;

			case "--family":
				options.family = readOptionValue(args, index, arg);
				index += 1;
				break;

			case "--json":
				options.printJson = true;
				break;

			case "--force":
				options.force = true;
				break;

			case "--help":
			case "-h":
				options.help = true;
				break;

			default:
				throw new CliUsageError(`Unknown argument: ${arg}`);
		}
	}

	if (options.family !== "all") {
		assertFamilyId(options.family);
	}

	if (options.command === COMMAND_FINALIZE_MANIFEST && options.inscriptionMapPath === null) {
		throw new CliUsageError("finalize-manifest requires --inscription-map <path>.");
	}

	return options;
}

function resolveReleaseContext(options) {
	let releaseDir = options.releaseDir;
	let releaseId = options.releaseId;

	if (releaseDir === null) {
		if (releaseId === null) {
			throw new CliUsageError("Provide --release-id or --release-dir.");
		}

		releaseId = sanitizeReleaseId(releaseId);
		releaseDir = getReleaseDir(options.releaseRootDir, releaseId);
	} else if (releaseId === null) {
		releaseId = path.basename(releaseDir);
	}

	return {
		release_id: releaseId,
		release_dir: releaseDir,
		contract: getReleaseContractPaths(releaseDir),
	};
}

function ensureReleaseContractDirs(releaseDir) {
	const contract = getReleaseContractPaths(releaseDir);

	const dirs = [
		contract.release_dir,
		contract.payload_dir,
		contract.checksums_dir,
		contract.planning_dir,
		contract.reconciliation_dir,
		contract.temp_dir,
		contract.pre_inscription_temp_dir,
		contract.verification_temp_dir,
		contract.canonical_dir,
		contract.metadata_dir,
	];

	for (const familyId of SUPPORTED_FAMILIES) {
		dirs.push(getReleasePayloadFamilyShardsDir(releaseDir, familyId));
	}

	for (const dirPath of dirs) {
		fs.mkdirSync(dirPath, { recursive: true });
	}

	return contract;
}

function writeJsonFile(filePath, value) {
	ensureParentDir(filePath);
	fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readJsonFile(filePath, contextLabel) {
	assertInvariant(fs.existsSync(filePath), `Missing ${contextLabel}: ${filePath}`);

	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch (error) {
		assertInvariant(false, `Malformed ${contextLabel}.`, {
			path: filePath,
			reason: error.message,
		});
	}
}

function buildExpectedShardCounts(inventory) {
	const counts = {};

	for (const familyId of SUPPORTED_FAMILIES) {
		counts[familyId] = inventory[familyId].length;
	}

	return counts;
}

function buildExpectedShardFilesByFamily(inventory, pathPrefix) {
	const filesByFamily = {};

	for (const familyId of SUPPORTED_FAMILIES) {
		filesByFamily[familyId] = inventory[familyId].map((shard) => withPathPrefix(pathPrefix, shard.relativePath));
	}

	return filesByFamily;
}

function buildFamilyStats(inventory) {
	const stats = {};

	for (const familyId of SUPPORTED_FAMILIES) {
		const familyShards = inventory[familyId];
		stats[familyId] = {
			shard_count: familyShards.length,
			total_bytes: familyShards.reduce((sum, shard) => sum + shard.byteLength, 0),
		};
	}

	return stats;
}

function copyShardPayloadFromSource(sourceOutputDir, payloadDir) {
	const sourceInventory = collectShardInventoryFromOutput(sourceOutputDir, {
		allowMissingShardsDir: true,
	});

	const copiedInventory = {
		base: [],
		prospect: [],
		forged: [],
	};

	for (const familyId of SUPPORTED_FAMILIES) {
		for (const shard of sourceInventory[familyId]) {
			const destinationPath = path.join(payloadDir, shard.relativePath);
			ensureParentDir(destinationPath);
			fs.copyFileSync(shard.filePath, destinationPath);

			copiedInventory[familyId].push({
				index: shard.index,
				fileName: shard.fileName,
				relativePath: shard.relativePath,
				filePath: destinationPath,
				byteLength: shard.byteLength,
				sha256: shard.sha256,
			});
		}
	}

	return copiedInventory;
}

function writeShardChecksumsFile(filePath, inventory, pathPrefix) {
	const lines = [];

	for (const familyId of SUPPORTED_FAMILIES) {
		for (const shard of inventory[familyId]) {
			const displayShardPath = withPathPrefix(pathPrefix, shard.relativePath);
			lines.push(`${shard.sha256}  ${displayShardPath}`);
		}
	}

	ensureParentDir(filePath);
	fs.writeFileSync(filePath, lines.join("\n") + (lines.length > 0 ? "\n" : ""), "utf8");
}

function buildPublishOrder(inventory) {
	const publishOrder = [];
	let ordinal = 0;

	for (const familyId of SUPPORTED_FAMILIES) {
		for (const shard of inventory[familyId]) {
			publishOrder.push({
				publish_ordinal: ordinal,
				family_id: familyId,
				index: shard.index,
				shard_file: withPathPrefix("payload", shard.relativePath),
				byte_length: shard.byteLength,
				sha256: shard.sha256,
				inscription_id: null,
			});
			ordinal += 1;
		}
	}

	return publishOrder;
}

function assertReleaseShardPolicy(inventory) {
	for (const familyId of SUPPORTED_FAMILIES) {
		const shards = inventory[familyId];

		for (let index = 0; index < shards.length; index++) {
			const shard = shards[index];
			const isLastShard = index === shards.length - 1;

			assertInvariant(
				shard.byteLength % RECORD_SIZE_BYTES === 0,
				"Release shard byte length must align to fixed record size.",
				{
					family_id: familyId,
					shard_index: shard.index,
					byte_length: shard.byteLength,
					record_size_bytes: RECORD_SIZE_BYTES,
				}
			);

			if (!isLastShard) {
				assertInvariant(
					shard.byteLength === RELEASE_SHARD_TARGET_BYTES,
					"Release shard target policy violation for non-final shard.",
					{
						family_id: familyId,
						shard_index: shard.index,
						expected_byte_length: RELEASE_SHARD_TARGET_BYTES,
						actual_byte_length: shard.byteLength,
					}
				);
				continue;
			}

			assertInvariant(
				shard.byteLength > 0 && shard.byteLength <= RELEASE_SHARD_TARGET_BYTES,
				"Release shard target policy violation for final shard.",
				{
					family_id: familyId,
					shard_index: shard.index,
					max_byte_length: RELEASE_SHARD_TARGET_BYTES,
					actual_byte_length: shard.byteLength,
				}
			);
		}
	}
}

function buildReconciliationData(inventory, normalizedShardMap) {
	const families = {};
	const entries = [];

	for (const familyId of SUPPORTED_FAMILIES) {
		families[familyId] = inventory[familyId].map((shard, index) => ({
			index: shard.index,
			shard_file: withPathPrefix("payload", shard.relativePath),
			byte_length: shard.byteLength,
			sha256: shard.sha256,
			inscription_id: normalizedShardMap[familyId][index],
		}));

		for (const entry of families[familyId]) {
			entries.push({
				family_id: familyId,
				...entry,
			});
		}
	}

	return {
		mapping_version: SHARD_INSCRIPTION_MAPPING_VERSION,
		families,
		entries,
	};
}

function loadExistingMetadata(metadataPath) {
	if (!fs.existsSync(metadataPath)) {
		return null;
	}

	return readJsonFile(metadataPath, "release metadata");
}

function runPrepareCommand(options, context) {
	if (fs.existsSync(context.release_dir)) {
		if (!options.force) {
			throw new CliUsageError(`Release directory already exists: ${formatDisplayPath(context.release_dir)}. Use --force to replace.`);
		}

		fs.rmSync(context.release_dir, { recursive: true, force: true });
	}

	const contract = ensureReleaseContractDirs(context.release_dir);
	const copiedInventory = copyShardPayloadFromSource(options.sourceOutputDir, contract.payload_dir);

	writeShardChecksumsFile(contract.shard_checksums_path, copiedInventory, "payload");

	const shardMapTemplate = buildShardInscriptionTemplateFromOutput(contract.payload_dir, {
		allowMissingShardsDir: true,
		pathPrefix: "payload",
	});
	writeJsonFile(contract.inscription_map_template_path, shardMapTemplate);

	const publishPlan = {
		release_layout_version: RELEASE_LAYOUT_VERSION,
		release_id: context.release_id,
		created_at: new Date().toISOString(),
		shard_target_policy_bytes: RELEASE_SHARD_TARGET_BYTES,
		families: buildFamilyStats(copiedInventory),
		publish_order: buildPublishOrder(copiedInventory),
	};
	writeJsonFile(contract.publish_plan_path, publishPlan);

	const metadata = {
		release_layout_version: RELEASE_LAYOUT_VERSION,
		release_id: context.release_id,
		state: "prepared",
		prepared_at: new Date().toISOString(),
		shard_target_policy_bytes: RELEASE_SHARD_TARGET_BYTES,
		record_size_bytes: RECORD_SIZE_BYTES,
		source_output_dir: formatDisplayPath(options.sourceOutputDir),
		paths: {
			release_dir: formatDisplayPath(contract.release_dir),
			payload_dir: formatDisplayPath(contract.payload_dir),
			checksums_file: formatDisplayPath(contract.shard_checksums_path),
			publish_plan_file: formatDisplayPath(contract.publish_plan_path),
			inscription_map_template_file: formatDisplayPath(contract.inscription_map_template_path),
			canonical_manifest_path: formatDisplayPath(contract.canonical_manifest_path),
		},
		families: publishPlan.families,
	};
	writeJsonFile(contract.metadata_path, metadata);

	return {
		command: COMMAND_PREPARE,
		release_id: context.release_id,
		release_dir: formatDisplayPath(contract.release_dir),
		payload_dir: formatDisplayPath(contract.payload_dir),
		shard_target_policy_bytes: RELEASE_SHARD_TARGET_BYTES,
		families: publishPlan.families,
		paths: {
			shard_checksums: formatDisplayPath(contract.shard_checksums_path),
			publish_plan: formatDisplayPath(contract.publish_plan_path),
			inscription_map_template: formatDisplayPath(contract.inscription_map_template_path),
			metadata: formatDisplayPath(contract.metadata_path),
		},
	};
}

function runFinalizeManifestCommand(options, context) {
	const contract = getReleaseContractPaths(context.release_dir);
	const payloadDir = options.payloadDir || getReleasePayloadDir(context.release_dir);
	const manifestPath = options.manifestPath || getReleaseCanonicalManifestPath(context.release_dir);

	assertInvariant(fs.existsSync(payloadDir), `Missing release payload directory: ${payloadDir}`);

	const payloadInventory = collectShardInventoryFromOutput(payloadDir, {
		allowMissingShardsDir: true,
	});
	assertReleaseShardPolicy(payloadInventory);

	const expectedShardCounts = buildExpectedShardCounts(payloadInventory);
	const expectedShardFilesByFamily = buildExpectedShardFilesByFamily(payloadInventory, "payload");

	const normalizedShardMap = readShardInscriptionMap(options.inscriptionMapPath, {
		requireAssignedIds: true,
		expectedShardCounts,
		expectedShardFilesByFamily,
	});

	const manifest = buildManifestV2FromOutput(payloadDir, normalizedShardMap, {
		allowMissingStream: true,
		allowMissingShardsDir: true,
	});
	assertReleaseShardTargetBytes(manifest.shard_target_bytes, "Manifest V2 shard_target_bytes");

	ensureParentDir(manifestPath);
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

	const reconciliationData = buildReconciliationData(payloadInventory, normalizedShardMap);
	writeJsonFile(contract.final_inscription_map_path, {
		mapping_version: SHARD_INSCRIPTION_MAPPING_VERSION,
		families: reconciliationData.families,
	});
	writeJsonFile(contract.reconciliation_path, {
		release_id: context.release_id,
		finalized_at: new Date().toISOString(),
		mapping_version: SHARD_INSCRIPTION_MAPPING_VERSION,
		entries: reconciliationData.entries,
	});

	const existingMetadata = loadExistingMetadata(contract.metadata_path) || {};
	const metadata = {
		...existingMetadata,
		release_layout_version: RELEASE_LAYOUT_VERSION,
		release_id: context.release_id,
		state: "manifest-finalized",
		finalized_at: new Date().toISOString(),
		shard_target_policy_bytes: RELEASE_SHARD_TARGET_BYTES,
		record_size_bytes: RECORD_SIZE_BYTES,
		paths: {
			...(existingMetadata.paths || {}),
			release_dir: formatDisplayPath(contract.release_dir),
			payload_dir: formatDisplayPath(payloadDir),
			canonical_manifest_path: formatDisplayPath(manifestPath),
			final_inscription_map_path: formatDisplayPath(contract.final_inscription_map_path),
			reconciliation_path: formatDisplayPath(contract.reconciliation_path),
		},
		families: buildFamilyStats(payloadInventory),
		manifest_summary: summarizeManifestV2(manifest),
	};
	writeJsonFile(contract.metadata_path, metadata);

	return {
		command: COMMAND_FINALIZE_MANIFEST,
		release_id: context.release_id,
		manifest_path: formatDisplayPath(manifestPath),
		payload_dir: formatDisplayPath(payloadDir),
		shard_target_policy_bytes: RELEASE_SHARD_TARGET_BYTES,
		families: metadata.families,
		paths: {
			final_inscription_map: formatDisplayPath(contract.final_inscription_map_path),
			reconciliation: formatDisplayPath(contract.reconciliation_path),
			metadata: formatDisplayPath(contract.metadata_path),
		},
	};
}

function runVerifyReleaseCommand(options, context) {
	const contract = getReleaseContractPaths(context.release_dir);
	const manifestPath = options.manifestPath || contract.canonical_manifest_path;
	const payloadDir = options.payloadDir || contract.payload_dir;

	const verifyResult = runVerifyCommand({
		command: "verify",
		manifestPath,
		outputDir: payloadDir,
		family: options.family,
		baseHashPath: options.baseHashPath,
		printJson: false,
	});

	const verificationEvidencePath = path.join(contract.verification_temp_dir, "verify-v2.json");
	writeJsonFile(verificationEvidencePath, verifyResult);

	return {
		command: COMMAND_VERIFY_RELEASE,
		release_id: context.release_id,
		manifest_path: formatDisplayPath(manifestPath),
		payload_dir: formatDisplayPath(payloadDir),
		verified_families: verifyResult.verified_families,
		verification_evidence_path: formatDisplayPath(verificationEvidencePath),
	};
}

function runSummarizeCommand(options, context) {
	const contract = getReleaseContractPaths(context.release_dir);
	const payloadDir = options.payloadDir || contract.payload_dir;
	const manifestPath = options.manifestPath || contract.canonical_manifest_path;

	const inventory = collectShardInventoryFromOutput(payloadDir, {
		allowMissingShardsDir: true,
	});

	const metadata = fs.existsSync(contract.metadata_path)
		? readJsonFile(contract.metadata_path, "release metadata")
		: null;
	const manifest = fs.existsSync(manifestPath)
		? readManifestV2File(manifestPath)
		: null;

	return {
		command: COMMAND_SUMMARIZE,
		release_id: context.release_id,
		release_dir: formatDisplayPath(contract.release_dir),
		paths: {
			payload_dir: formatDisplayPath(payloadDir),
			metadata_path: formatDisplayPath(contract.metadata_path),
			canonical_manifest_path: formatDisplayPath(manifestPath),
			inscription_map_template_path: formatDisplayPath(contract.inscription_map_template_path),
		},
		families: buildFamilyStats(inventory),
		metadata_state: metadata ? metadata.state : null,
		manifest_summary: manifest ? summarizeManifestV2(manifest) : null,
	};
}

function printPrepareSummary(result) {
	console.log(`Prepared release layout: ${result.release_dir}`);
	console.log(`Payload shards: ${result.payload_dir}`);
	console.log(`Shard target policy: ${result.shard_target_policy_bytes}`);

	for (const familyId of SUPPORTED_FAMILIES) {
		const family = result.families[familyId];
		console.log(`${familyId}: ${family.shard_count} shard(s), ${family.total_bytes} bytes`);
	}
}

function printFinalizeSummary(result) {
	console.log(`Finalized canonical manifest: ${result.manifest_path}`);
	console.log(`Payload shards: ${result.payload_dir}`);
	console.log(`Shard target policy: ${result.shard_target_policy_bytes}`);
}

function printVerifySummary(result) {
	console.log(`Verified release manifest: ${result.manifest_path}`);
	console.log(`Payload shards: ${result.payload_dir}`);
	console.log(`Evidence: ${result.verification_evidence_path}`);
}

function printSummarizeSummary(result) {
	console.log(`Release: ${result.release_id}`);
	console.log(`Directory: ${result.release_dir}`);
	console.log(`Metadata state: ${result.metadata_state || "none"}`);

	for (const familyId of SUPPORTED_FAMILIES) {
		const family = result.families[familyId];
		console.log(`${familyId}: ${family.shard_count} shard(s), ${family.total_bytes} bytes`);
	}

	if (result.manifest_summary) {
		console.log(`Manifest version: ${result.manifest_summary.manifest_version}`);
		console.log(`Manifest shard target bytes: ${result.manifest_summary.shard_target_bytes}`);
	}
}

function runFromCli(argv) {
	const options = parseArgs(argv);

	if (options.help) {
		printUsage();
		return null;
	}

	const context = resolveReleaseContext(options);

	if (options.command === COMMAND_PREPARE) {
		const result = runPrepareCommand(options, context);
		if (options.printJson) {
			process.stdout.write(JSON.stringify(result, null, 2) + "\n");
			return result;
		}
		printPrepareSummary(result);
		return result;
	}

	if (options.command === COMMAND_FINALIZE_MANIFEST) {
		const result = runFinalizeManifestCommand(options, context);
		if (options.printJson) {
			process.stdout.write(JSON.stringify(result, null, 2) + "\n");
			return result;
		}
		printFinalizeSummary(result);
		return result;
	}

	if (options.command === COMMAND_VERIFY_RELEASE) {
		const result = runVerifyReleaseCommand(options, context);
		if (options.printJson) {
			process.stdout.write(JSON.stringify(result, null, 2) + "\n");
			return result;
		}
		printVerifySummary(result);
		return result;
	}

	const result = runSummarizeCommand(options, context);
	if (options.printJson) {
		process.stdout.write(JSON.stringify(result, null, 2) + "\n");
		return result;
	}
	printSummarizeSummary(result);
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
	runFromCli,
	runPrepareCommand,
	runFinalizeManifestCommand,
	runSummarizeCommand,
	runVerifyReleaseCommand,
};
