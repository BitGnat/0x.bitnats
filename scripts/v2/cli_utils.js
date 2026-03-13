"use strict";

const fs = require("fs");
const path = require("path");

const { ProtocolValidationError } = require("./constants");

function readOptionValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${optionName}.`);
  }
  return value;
}

function resolveCliPath(value) {
  return path.resolve(process.cwd(), value);
}

function ensureParentDir(filePath) {
  const parentDir = path.dirname(filePath);
  fs.mkdirSync(parentDir, { recursive: true });
}

function printFatalAndExit(error) {
  if (error instanceof ProtocolValidationError) {
    console.error(`FAIL-CLOSED: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`ERROR: ${error.message}`);
  } else {
    console.error(`ERROR: ${String(error)}`);
  }

  process.exit(1);
}

function printNotImplemented(cliName, nextStep) {
  console.error(`${cliName} is scaffolded but not implemented yet.`);
  console.error(`Next planned implementation step: ${nextStep}`);
  process.exit(2);
}

module.exports = {
  ensureParentDir,
  printFatalAndExit,
  printNotImplemented,
  readOptionValue,
  resolveCliPath,
};