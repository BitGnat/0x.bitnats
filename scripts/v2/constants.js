"use strict";

const RECORD_SIZE_BYTES = 33;
const TXID_BYTE_LENGTH = 32;
const TXID_HEX_LENGTH = TXID_BYTE_LENGTH * 2;
const U8_MAX = 255;
const SHARD_TARGET_BYTES = 350000;
const RELEASE_LAYOUT_VERSION = 1;
const RELEASE_SHARD_TARGET_BYTES = 350000;

const BASE_REQUIRED_INDEX = 0;
const FORGED_REQUIRED_INDEX = 1;
const PROSPECT_MIN_INDEX = 2;

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

function assertReleaseShardTargetBytes(value, contextLabel = "shard_target_bytes") {
  assertInvariant(
    value === RELEASE_SHARD_TARGET_BYTES,
    `Invalid ${contextLabel}: expected fixed release policy value.`,
    {
      expected_release_shard_target_bytes: RELEASE_SHARD_TARGET_BYTES,
      actual_shard_target_bytes: value,
    }
  );
}

function getAlignedShardPayloadByteLength(targetBytes, recordSizeBytes = RECORD_SIZE_BYTES) {
  assertInvariant(
    Number.isInteger(targetBytes) && targetBytes > 0,
    "Invalid shard target size: expected positive integer.",
    {
      target_bytes: targetBytes,
      record_size_bytes: recordSizeBytes,
    }
  );
  assertInvariant(
    Number.isInteger(recordSizeBytes) && recordSizeBytes > 0,
    "Invalid record size: expected positive integer.",
    {
      target_bytes: targetBytes,
      record_size_bytes: recordSizeBytes,
    }
  );

  const alignedBytes = targetBytes - (targetBytes % recordSizeBytes);
  return alignedBytes > 0 ? alignedBytes : recordSizeBytes;
}

module.exports = {
  BASE_REQUIRED_INDEX,
  FORMAT_ID_V2,
  FORGED_REQUIRED_INDEX,
  JSONL_SCHEMA_ID,
  MANIFEST_VERSION_V2,
  PROSPECT_MIN_INDEX,
  ProtocolValidationError,
  RECORD_SIZE_BYTES,
  RELEASE_LAYOUT_VERSION,
  RELEASE_SHARD_TARGET_BYTES,
  SHARD_TARGET_BYTES,
  SUPPORTED_FAMILIES,
  TXID_BYTE_LENGTH,
  TXID_HEX_LENGTH,
  U8_MAX,
  assertFamilyId,
  assertInvariant,
  assertReleaseShardTargetBytes,
  failClosed,
  getAlignedShardPayloadByteLength,
};
