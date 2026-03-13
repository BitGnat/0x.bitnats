"use strict";

const fs = require("fs");
const path = require("path");

const { assertInvariant, failClosed } = require("./constants");
const { parseV1Id } = require("./record");

function parseV1JsonLine(line, lineNumber, sourceLabel) {
  let parsed;

  try {
    parsed = JSON.parse(line);
  } catch (error) {
    failClosed(`Malformed JSON at ${sourceLabel}:${lineNumber}.`, {
      line: lineNumber,
      reason: error.message,
    });
  }

  const isObject = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  assertInvariant(isObject, `Invalid JSON record at ${sourceLabel}:${lineNumber}: expected object.`, {
    line: lineNumber,
  });

  const keys = Object.keys(parsed);
  assertInvariant(
    keys.length === 1 && keys[0] === "id",
    `Invalid JSON record at ${sourceLabel}:${lineNumber}: expected exactly one 'id' field.`,
    {
      line: lineNumber,
      keys,
    }
  );

  return parseV1Id(parsed.id);
}

function parseV1JsonlText(text, sourceLabel = "<memory>") {
  assertInvariant(typeof text === "string", `Invalid JSONL source: expected UTF-8 text for ${sourceLabel}.`);

  const records = [];
  const seenIds = new Set();
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    if (line.length === 0) {
      // Canonical JSONL permits one final trailing newline only.
      if (lineNumber === lines.length) {
        continue;
      }

      failClosed(`Unexpected empty line at ${sourceLabel}:${lineNumber}.`, {
        line: lineNumber,
      });
    }

    const record = parseV1JsonLine(line, lineNumber, sourceLabel);

    if (seenIds.has(record.id)) {
      failClosed(`Duplicate id found at ${sourceLabel}:${lineNumber}.`, {
        line: lineNumber,
        id: record.id,
      });
    }

    seenIds.add(record.id);
    records.push(record);
  }

  return records;
}

function parseV1JsonlFile(filePath) {
  assertInvariant(typeof filePath === "string" && filePath.length > 0, "Missing V1 JSONL file path.");
  assertInvariant(fs.existsSync(filePath), `Missing V1 JSONL file: ${filePath}`);

  const resolvedPath = path.resolve(filePath);
  const fileText = fs.readFileSync(resolvedPath, "utf8");

  return parseV1JsonlText(fileText, resolvedPath);
}

function recordsToSerializable(records) {
  return records.map((record) => ({
    id: record.id,
    txid: record.txidHex,
    inscription_index: record.inscriptionIndex,
  }));
}

module.exports = {
  parseV1JsonlFile,
  parseV1JsonlText,
  recordsToSerializable,
};