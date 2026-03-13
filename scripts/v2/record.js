"use strict";

const {
  TXID_HEX_LENGTH,
  U8_MAX,
  assertInvariant,
  failClosed,
} = require("./constants");

const ID_PATTERN = /^([0-9a-f]{64})i([0-9]+)$/;

/**
 * @typedef {Object} LogicalRecord
 * @property {string} id
 * @property {string} txidHex
 * @property {number} inscriptionIndex
 * @property {Buffer} txidBytes
 */

function validateTxidHex(txidHex, fieldName = "txid") {
  assertInvariant(typeof txidHex === "string", `Invalid ${fieldName}: expected string.`, {
    value: txidHex,
  });

  assertInvariant(
    txidHex.length === TXID_HEX_LENGTH,
    `Invalid ${fieldName}: expected ${TXID_HEX_LENGTH} hex characters.`,
    { value: txidHex }
  );

  assertInvariant(
    /^[0-9a-f]+$/.test(txidHex),
    `Invalid ${fieldName}: expected lowercase hexadecimal.`,
    { value: txidHex }
  );

  return txidHex;
}

function parseUnsignedIndex(indexText, fieldName = "index") {
  assertInvariant(
    typeof indexText === "string" && indexText.length > 0,
    `Invalid ${fieldName}: expected unsigned decimal text.`,
    { value: indexText }
  );

  if (indexText.length > 1 && indexText.startsWith("0")) {
    failClosed(`Invalid ${fieldName}: leading zeros are not allowed.`, {
      value: indexText,
    });
  }

  assertInvariant(
    /^[0-9]+$/.test(indexText),
    `Invalid ${fieldName}: expected unsigned decimal text.`,
    { value: indexText }
  );

  const parsed = Number(indexText);

  assertInvariant(
    Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= U8_MAX,
    `Invalid ${fieldName}: expected integer in [0, ${U8_MAX}].`,
    { value: indexText }
  );

  return parsed;
}

function createLogicalRecord(txidHex, inscriptionIndex) {
  validateTxidHex(txidHex);

  assertInvariant(
    Number.isInteger(inscriptionIndex) && inscriptionIndex >= 0 && inscriptionIndex <= U8_MAX,
    `Invalid inscription index: expected integer in [0, ${U8_MAX}].`,
    { value: inscriptionIndex }
  );

  return {
    id: `${txidHex}i${inscriptionIndex}`,
    txidHex,
    inscriptionIndex,
    txidBytes: Buffer.from(txidHex, "hex"),
  };
}

function parseV1Id(idValue) {
  assertInvariant(typeof idValue === "string" && idValue.length > 0, "Invalid id: expected non-empty string.", {
    value: idValue,
  });

  const match = ID_PATTERN.exec(idValue);
  assertInvariant(
    Boolean(match),
    "Invalid id: expected format <lowercase-hex-txid>i<decimal-index>.",
    { value: idValue }
  );

  const txidHex = validateTxidHex(match[1], "id txid");
  const inscriptionIndex = parseUnsignedIndex(match[2], "id index");

  return createLogicalRecord(txidHex, inscriptionIndex);
}

module.exports = {
  createLogicalRecord,
  parseUnsignedIndex,
  parseV1Id,
  validateTxidHex,
};