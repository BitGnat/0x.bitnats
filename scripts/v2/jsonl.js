"use strict";

const { decodeFamilyStream } = require("./binary");
const { assertFamilyId, assertInvariant } = require("./constants");

function formatRecordAsJsonlLine(record) {
  assertInvariant(record && typeof record === "object", "Invalid logical record for JSONL reconstruction.");
  assertInvariant(typeof record.txidHex === "string", "Invalid logical record: missing txid hex.");
  assertInvariant(Number.isInteger(record.inscriptionIndex), "Invalid logical record: missing inscription index.");

  return `{"id":"${record.txidHex}i${record.inscriptionIndex}"}`;
}

function reconstructJsonlBufferFromRecords(records, familyId) {
  if (familyId !== undefined) {
    assertFamilyId(familyId);
  }

  assertInvariant(Array.isArray(records), "Invalid logical record set for JSONL reconstruction.");

  if (records.length === 0) {
    return Buffer.alloc(0);
  }

  const lineJoined = records.map((record) => formatRecordAsJsonlLine(record)).join("\n");

  // Base preserves historical V1 byte compatibility by omitting terminal LF.
  if (familyId === "base") {
    return Buffer.from(lineJoined, "utf8");
  }

  return Buffer.from(`${lineJoined}\n`, "utf8");
}

function reconstructJsonlBufferFromStream(streamBytes, familyId) {
  assertFamilyId(familyId);
  return reconstructJsonlBufferFromRecords(decodeFamilyStream(streamBytes, familyId), familyId);
}

module.exports = {
  formatRecordAsJsonlLine,
  reconstructJsonlBufferFromRecords,
  reconstructJsonlBufferFromStream,
};
