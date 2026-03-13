"use strict";

const RECORD_SIZE_BYTES = 33;
const TXID_BYTE_LENGTH = 32;
const TXID_HEX_LENGTH = TXID_BYTE_LENGTH * 2;
const U8_MAX = 255;
const SHARD_TARGET_BYTES = 350000;

const SUPPORTED_FAMILIES = Object.freeze(["base", "prospect", "forged"]);
const SUPPORTED_FAMILY_SET = new Set(SUPPORTED_FAMILIES);

const MANIFEST_VERSION_V2 = 2;
const FORMAT_ID_V2 = "bitnats-manifest-v2";
const JSONL_SCHEMA_ID = "bitnats-jsonl-id-v1";

class ProtocolValidationError extends Error {
  constructor(message, code = "ERR_PROTOCOL_VALIDATION", details = undefined) {
    super(message);
    this.name = "ProtocolValidationError";
    this.code = code;

    if (details !== undefined) {
      this.details = details;
    }
  }
}

function failClosed(message, details) {
  throw new ProtocolValidationError(message, "ERR_PROTOCOL_VALIDATION", details);
}

function assertInvariant(condition, message, details) {
  if (!condition) {
    failClosed(message, details);
  }
}

function assertFamilyId(familyId) {
  assertInvariant(
    typeof familyId === "string" && SUPPORTED_FAMILY_SET.has(familyId),
    `Unsupported family id: ${String(familyId)}`,
    {
      family_id: familyId,
      supported_families: SUPPORTED_FAMILIES,
    }
  );
}

module.exports = {
  FORMAT_ID_V2,
  JSONL_SCHEMA_ID,
  MANIFEST_VERSION_V2,
  ProtocolValidationError,
  RECORD_SIZE_BYTES,
  SHARD_TARGET_BYTES,
  SUPPORTED_FAMILIES,
  TXID_BYTE_LENGTH,
  TXID_HEX_LENGTH,
  U8_MAX,
  assertFamilyId,
  assertInvariant,
  failClosed,
};