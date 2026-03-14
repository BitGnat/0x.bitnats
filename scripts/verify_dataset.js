#!/usr/bin/env node
"use strict";

/**
 * Compatibility wrapper for legacy verify_dataset references.
 * Delegates to verify_volumes.js and defaults to unified V1+V2 verification.
 */

const path = require("path");
const { spawnSync } = require("child_process");

function hasModeArg(args) {
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];

		if (arg === "--mode" || arg.startsWith("--mode=")) {
			return true;
		}
	}

	return false;
}

function main() {
	const forwardedArgs = process.argv.slice(2);
	const args = hasModeArg(forwardedArgs)
		? forwardedArgs
		: ["--mode", "both", ...forwardedArgs];

	const verifyVolumesScript = path.join(__dirname, "verify_volumes.js");
	const result = spawnSync(process.execPath, [verifyVolumesScript, ...args], {
		stdio: "inherit",
	});

	process.exit(result.status === null ? 1 : result.status);
}

main();
