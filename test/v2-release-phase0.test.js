"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { SUPPORTED_FAMILIES } = require("../scripts/v2/constants");
const { getFamilyStreamPath, getReleaseContractPaths } = require("../scripts/v2/paths");

const {
	makeTempDir,
	prepareSmallV2Fixture,
	readJsonFile,
	runNodeScript,
	stableInscriptionId,
	writeJsonFile,
} = require("./helpers/test_utils");

function assertFailed(result, pattern, label) {
	assert.notEqual(result.status, 0, `${label} expected non-zero exit code.`);
	assert.match(`${result.stderr}\n${result.stdout}`, pattern, `${label} did not emit expected error output.`);
}

function buildFilledInscriptionMap(template) {
	const output = {
		mapping_version: template.mapping_version,
		families: {},
	};

	for (const familyId of SUPPORTED_FAMILIES) {
		output.families[familyId] = template.families[familyId].map((entry, index) => ({
			index: entry.index,
			shard_file: entry.shard_file,
			inscription_id: stableInscriptionId(`release-${familyId}`, index),
		}));
	}

	return output;
}

test("build-manifest-v2 supports shard-only bundle with --allow-missing-stream", () => {
	const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });

	for (const familyId of SUPPORTED_FAMILIES) {
		const streamPath = getFamilyStreamPath(fixture.outputDir, familyId);
		if (fs.existsSync(streamPath)) {
			fs.rmSync(streamPath);
		}
	}

	const shardOnlyManifestPath = path.join(fixture.outputDir, "manifest.shard-only.v2.json");
	const manifestResult = runNodeScript("scripts/build-manifest-v2.js", [
		"--input-dir",
		fixture.outputDir,
		"--shard-map",
		fixture.shardMapPath,
		"--output",
		shardOnlyManifestPath,
		"--allow-missing-stream",
	]);

	assert.equal(manifestResult.status, 0, `build-manifest-v2 failed:\n${manifestResult.stderr}`);

	const verifyResult = runNodeScript("scripts/verify-v2.js", [
		"verify",
		"--manifest",
		shardOnlyManifestPath,
		"--output-dir",
		fixture.outputDir,
		"--base-hash-file",
		fixture.baseHashPath,
	]);

	assert.equal(verifyResult.status, 0, `verify-v2 failed on shard-only manifest:\n${verifyResult.stderr}`);
});

test("build-manifest-v2 fails on shard-only bundle without --allow-missing-stream", () => {
	const fixture = prepareSmallV2Fixture(makeTempDir(), { shardTargetBytes: 66 });

	for (const familyId of SUPPORTED_FAMILIES) {
		const streamPath = getFamilyStreamPath(fixture.outputDir, familyId);
		if (fs.existsSync(streamPath)) {
			fs.rmSync(streamPath);
		}
	}

	const manifestResult = runNodeScript("scripts/build-manifest-v2.js", [
		"--input-dir",
		fixture.outputDir,
		"--shard-map",
		fixture.shardMapPath,
		"--output",
		path.join(fixture.outputDir, "manifest.should-fail.v2.json"),
	]);

	assertFailed(manifestResult, /Missing base stream file:/, "missing stream failure");
});

test("release-v2 prepare creates canonical release contract, mapping template, and local manifest", () => {
	const rootDir = makeTempDir();
	const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
	const releaseRootDir = path.join(rootDir, "releases");
	const releaseId = "phase0-contract";
	const releaseDir = path.join(releaseRootDir, releaseId);
	const contract = getReleaseContractPaths(releaseDir);

	const prepareResult = runNodeScript("scripts/release-v2.js", [
		"prepare",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--source-output-dir",
		fixture.outputDir,
	]);

	assert.equal(prepareResult.status, 0, `release prepare failed:\n${prepareResult.stderr}`);

	assert.ok(fs.existsSync(contract.payload_dir), "missing release payload directory");
	assert.ok(fs.existsSync(contract.shard_checksums_path), "missing shard checksum inventory");
	assert.ok(fs.existsSync(contract.publish_plan_path), "missing publish plan");
	assert.ok(fs.existsSync(contract.inscription_map_template_path), "missing inscription template");
	assert.ok(fs.existsSync(contract.local_manifest_path), "missing temporary local manifest");
	assert.ok(fs.existsSync(contract.metadata_path), "missing release metadata");
	assert.ok(!fs.existsSync(contract.canonical_manifest_path), "canonical manifest must not exist before finalize");

	const localVerifyResult = runNodeScript("scripts/verify-v2.js", [
		"verify",
		"--manifest",
		contract.local_manifest_path,
		"--output-dir",
		contract.payload_dir,
		"--base-hash-file",
		fixture.baseHashPath,
	]);
	assert.equal(localVerifyResult.status, 0, `pre-inscription local manifest verification failed:\n${localVerifyResult.stderr}`);

	const template = readJsonFile(contract.inscription_map_template_path);
	assert.equal(template.mapping_version, 1);

	for (const familyId of SUPPORTED_FAMILIES) {
		for (let index = 0; index < template.families[familyId].length; index++) {
			const entry = template.families[familyId][index];
			assert.equal(entry.index, index);
			assert.equal(entry.inscription_id, null);
			assert.match(entry.shard_file, /^payload\//);
		}
	}
});

test("release-v2 finalize-manifest fails on missing inscription ids", () => {
	const rootDir = makeTempDir();
	const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
	const releaseRootDir = path.join(rootDir, "releases");
	const releaseId = "phase0-missing-ids";
	const releaseDir = path.join(releaseRootDir, releaseId);
	const contract = getReleaseContractPaths(releaseDir);

	const prepareResult = runNodeScript("scripts/release-v2.js", [
		"prepare",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--source-output-dir",
		fixture.outputDir,
	]);
	assert.equal(prepareResult.status, 0, `release prepare failed:\n${prepareResult.stderr}`);

	const finalizeResult = runNodeScript("scripts/release-v2.js", [
		"finalize-manifest",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--inscription-map",
		contract.inscription_map_template_path,
	]);

	assertFailed(finalizeResult, /Invalid base shard mapping inscription_id:/, "missing inscription ids");
});

test("release-v2 finalize-manifest enforces fixed non-final shard policy", () => {
	const rootDir = makeTempDir();
	const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 66 });
	const releaseRootDir = path.join(rootDir, "releases");
	const releaseId = "phase0-policy-failure";
	const releaseDir = path.join(releaseRootDir, releaseId);
	const contract = getReleaseContractPaths(releaseDir);
	const filledMapPath = path.join(rootDir, "filled-map.json");

	const prepareResult = runNodeScript("scripts/release-v2.js", [
		"prepare",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--source-output-dir",
		fixture.outputDir,
	]);
	assert.equal(prepareResult.status, 0, `release prepare failed:\n${prepareResult.stderr}`);

	const template = readJsonFile(contract.inscription_map_template_path);
	const filledMap = buildFilledInscriptionMap(template);
	writeJsonFile(filledMapPath, filledMap);

	const finalizeResult = runNodeScript("scripts/release-v2.js", [
		"finalize-manifest",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--inscription-map",
		filledMapPath,
	]);

	assertFailed(finalizeResult, /Release shard target policy violation for non-final shard\./, "release shard policy");
});

test("release-v2 finalize-manifest and verify-release succeed on policy-compliant payload", () => {
	const rootDir = makeTempDir();
	const fixture = prepareSmallV2Fixture(path.join(rootDir, "fixture"), { shardTargetBytes: 350000 });
	const releaseRootDir = path.join(rootDir, "releases");
	const releaseId = "phase0-success";
	const releaseDir = path.join(releaseRootDir, releaseId);
	const contract = getReleaseContractPaths(releaseDir);
	const filledMapPath = path.join(rootDir, "filled-map.json");

	const prepareResult = runNodeScript("scripts/release-v2.js", [
		"prepare",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--source-output-dir",
		fixture.outputDir,
	]);
	assert.equal(prepareResult.status, 0, `release prepare failed:\n${prepareResult.stderr}`);

	const template = readJsonFile(contract.inscription_map_template_path);
	const filledMap = buildFilledInscriptionMap(template);
	writeJsonFile(filledMapPath, filledMap);

	const finalizeResult = runNodeScript("scripts/release-v2.js", [
		"finalize-manifest",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--inscription-map",
		filledMapPath,
	]);
	assert.equal(finalizeResult.status, 0, `finalize-manifest failed:\n${finalizeResult.stderr}`);
	assert.ok(fs.existsSync(contract.canonical_manifest_path), "missing canonical manifest");
	assert.ok(fs.existsSync(contract.final_inscription_map_path), "missing finalized inscription map");
	assert.ok(fs.existsSync(contract.reconciliation_path), "missing reconciliation output");

	const reconciliation = readJsonFile(contract.reconciliation_path);
	assert.equal(reconciliation.release_id, releaseId);

	for (const familyId of SUPPORTED_FAMILIES) {
		const expectedEntries = template.families[familyId];
		const familyEntries = reconciliation.entries.filter((entry) => entry.family_id === familyId);
		assert.equal(familyEntries.length, expectedEntries.length, `reconciliation count mismatch for ${familyId}`);

		for (let index = 0; index < expectedEntries.length; index++) {
			assert.equal(familyEntries[index].index, expectedEntries[index].index);
			assert.equal(familyEntries[index].shard_file, expectedEntries[index].shard_file);
			assert.equal(familyEntries[index].inscription_id, filledMap.families[familyId][index].inscription_id);
		}
	}

	const verifyReleaseResult = runNodeScript("scripts/release-v2.js", [
		"verify-release",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
		"--base-hash-file",
		fixture.baseHashPath,
	]);
	assert.equal(verifyReleaseResult.status, 0, `verify-release failed:\n${verifyReleaseResult.stderr}`);

	const summarizeResult = runNodeScript("scripts/release-v2.js", [
		"summarize",
		"--release-id",
		releaseId,
		"--release-root",
		releaseRootDir,
	]);
	assert.equal(summarizeResult.status, 0, `summarize failed:\n${summarizeResult.stderr}`);
});
