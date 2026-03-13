"use strict";

const {
  RECORD_SIZE_BYTES,
  TXID_BYTE_LENGTH,
  assertFamilyId,
  assertInvariant,
  failClosed,
} = require("./constants");
const { validateRecordFamilyPair } = require("./classify");
const { createLogicalRecord } = require("./record");

function encodeLogicalRecord(record, familyId) {
  assertInvariant(record && typeof record === "object", "Invalid logical record for encoding.");
  assertInvariant(Buffer.isBuffer(record.txidBytes), "Invalid logical record: missing txid bytes.");
  assertInvariant(
    record.txidBytes.length === TXID_BYTE_LENGTH,
    `Invalid logical record: expected ${TXID_BYTE_LENGTH} txid bytes.`
  );
  assertInvariant(Number.isInteger(record.inscriptionIndex), "Invalid logical record: missing inscription index.");

  if (familyId !== undefined) {
    assertFamilyId(familyId);
    validateRecordFamilyPair(record, familyId);
  }

  const encoded = Buffer.alloc(RECORD_SIZE_BYTES);
  record.txidBytes.copy(encoded, 0);
  encoded.writeUInt8(record.inscriptionIndex, TXID_BYTE_LENGTH);

  return encoded;
}

function decodeBinaryRecord(recordBytes, familyId) {
  assertInvariant(Buffer.isBuffer(recordBytes), "Invalid binary record: expected Buffer.");

  if (recordBytes.length !== RECORD_SIZE_BYTES) {
    failClosed("Invalid binary record length.", {
      expected: RECORD_SIZE_BYTES,
      actual: recordBytes.length,
    });
  }

  const txidHex = recordBytes.subarray(0, TXID_BYTE_LENGTH).toString("hex");
  const inscriptionIndex = recordBytes.readUInt8(TXID_BYTE_LENGTH);
  const logicalRecord = createLogicalRecord(txidHex, inscriptionIndex);

  if (familyId !== undefined) {
    assertFamilyId(familyId);
    validateRecordFamilyPair(logicalRecord, familyId);
  }

  return logicalRecord;
}

function encodeFamilyStream(records, familyId) {
  assertFamilyId(familyId);
  assertInvariant(Array.isArray(records), `Invalid ${familyId} records: expected array.`);

  if (records.length === 0) {
    return Buffer.alloc(0);
  }

  const encodedRecords = records.map((record) => encodeLogicalRecord(record, familyId));
  return Buffer.concat(encodedRecords, encodedRecords.length * RECORD_SIZE_BYTES);
}

function decodeFamilyStream(streamBytes, familyId) {
  assertFamilyId(familyId);
  assertInvariant(Buffer.isBuffer(streamBytes), `Invalid ${familyId} stream: expected Buffer.`);

  if (streamBytes.length % RECORD_SIZE_BYTES !== 0) {
    failClosed("Invalid binary stream length: not divisible by record size.", {
      family_id: familyId,
      stream_length: streamBytes.length,
      record_size_bytes: RECORD_SIZE_BYTES,
    });
  }

  const decoded = [];

  for (let offset = 0; offset < streamBytes.length; offset += RECORD_SIZE_BYTES) {
    decoded.push(decodeBinaryRecord(streamBytes.subarray(offset, offset + RECORD_SIZE_BYTES), familyId));
  }

  return decoded;
}

module.exports = {
  decodeBinaryRecord,
  decodeFamilyStream,
  encodeFamilyStream,
  encodeLogicalRecord,
};