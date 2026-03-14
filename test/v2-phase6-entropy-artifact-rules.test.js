"use strict";

/**
 * Tests for scripts/v2/entropy.js and scripts/v2/artifact_rules.js.
 *
 * Normative references:
 * - docs/01-core-protocol.md (Entropy Depth ⦻N, artifact eligibility rules)
 * - docs/05-specification.md (Section 6: Artifact Eligibility Rules)
 */

const assert = require("node:assert/strict");
const test = require("node:test");

const { leadingHexZeroCount, validateBlockHashHex } = require("../scripts/v2/entropy");
const {
  DEPENDENCY,
  ExternalDependencyError,
  validateBaseBitnatArtifact,
  validateForgedBitnatArtifact,
} = require("../scripts/v2/artifact_rules");

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Real Bitcoin genesis block hash (10 leading hex zeros)
const GENESIS_BLOCK_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";

function makeHash(leadingZeros, fillChar = "a") {
  assert.ok(leadingZeros >= 0 && leadingZeros <= 64, "leadingZeros out of range");
  const tail = leadingZeros < 64 ? fillChar.repeat(64 - leadingZeros) : "";
  return "0".repeat(leadingZeros) + tail;
}

// ---------------------------------------------------------------------------
// entropy.js — leadingHexZeroCount
// ---------------------------------------------------------------------------

test("leadingHexZeroCount: zero leading zeros", () => {
  const hash = makeHash(0);
  assert.equal(leadingHexZeroCount(hash), 0);
});

test("leadingHexZeroCount: one leading zero", () => {
  assert.equal(leadingHexZeroCount(makeHash(1)), 1);
});

test("leadingHexZeroCount: ten leading zeros (genesis-like)", () => {
  assert.equal(leadingHexZeroCount(GENESIS_BLOCK_HASH), 10);
});

test("leadingHexZeroCount: all zeros", () => {
  assert.equal(leadingHexZeroCount("0".repeat(64)), 64);
});

test("leadingHexZeroCount: two leading zeros then non-zero", () => {
  const hash = makeHash(2, "f");
  assert.equal(leadingHexZeroCount(hash), 2);
});

// ---------------------------------------------------------------------------
// entropy.js — validateBlockHashHex
// ---------------------------------------------------------------------------

test("validateBlockHashHex: rejects non-string", () => {
  assert.throws(() => validateBlockHashHex(null), /expected string/i);
  assert.throws(() => validateBlockHashHex(12345), /expected string/i);
});

test("validateBlockHashHex: rejects wrong length", () => {
  assert.throws(() => validateBlockHashHex("000000"), /expected 64 hex/i);
});

test("validateBlockHashHex: rejects uppercase hex", () => {
  const upper = "0".repeat(32) + "A".repeat(32);
  assert.throws(() => validateBlockHashHex(upper), /lowercase hexadecimal/i);
});

test("validateBlockHashHex: accepts valid 64-char lowercase hex", () => {
  assert.doesNotThrow(() => validateBlockHashHex(GENESIS_BLOCK_HASH));
});

// ---------------------------------------------------------------------------
// artifact_rules.js — validateBaseBitnatArtifact (local checks)
// ---------------------------------------------------------------------------

test("validateBaseBitnatArtifact: rejects inscriptionIndex != 0", () => {
  assert.throws(
    () => validateBaseBitnatArtifact({ blockHashHex: GENESIS_BLOCK_HASH, inscriptionIndex: 1 }),
    (err) => err.name === "ProtocolValidationError" && /inscription index must be 0/i.test(err.message)
  );
});

test("validateBaseBitnatArtifact: rejects block hash with zero entropy depth", () => {
  const nonBitnatHash = makeHash(0, "a"); // no leading zeros
  assert.throws(
    () => validateBaseBitnatArtifact({ blockHashHex: nonBitnatHash, inscriptionIndex: 0 }),
    (err) => err.name === "ProtocolValidationError" && /no leading hexadecimal zeros/i.test(err.message)
  );
});

test("validateBaseBitnatArtifact: throws ExternalDependencyError when blockConfirmed not provided", () => {
  assert.throws(
    () =>
      validateBaseBitnatArtifact({
        blockHashHex: GENESIS_BLOCK_HASH,
        inscriptionIndex: 0,
        // blockConfirmed not supplied
      }),
    (err) =>
      err instanceof ExternalDependencyError &&
      err.code === "ERR_BITCOIN_RPC_REQUIRED" &&
      err.requiredDependency === DEPENDENCY.BITCOIN_RPC
  );
});

test("validateBaseBitnatArtifact: throws ExternalDependencyError when sat data not provided", () => {
  assert.throws(
    () =>
      validateBaseBitnatArtifact({
        blockHashHex: GENESIS_BLOCK_HASH,
        inscriptionIndex: 0,
        blockConfirmed: true,
        // canonicalSat / inscriptionSat not supplied
      }),
    (err) =>
      err instanceof ExternalDependencyError &&
      err.code === "ERR_SAT_ASSIGNMENT_REQUIRED" &&
      err.requiredDependency === DEPENDENCY.ORD_SAT_ASSIGNMENT
  );
});

test("validateBaseBitnatArtifact: rejects sat mismatch", () => {
  assert.throws(
    () =>
      validateBaseBitnatArtifact({
        blockHashHex: GENESIS_BLOCK_HASH,
        inscriptionIndex: 0,
        blockConfirmed: true,
        canonicalSat: "100000000",
        inscriptionSat: "999999999",
      }),
    (err) => err.name === "ProtocolValidationError" && /canonical bitnats block sat/i.test(err.message)
  );
});

test("validateBaseBitnatArtifact: succeeds with all valid data and returns entropyDepth", () => {
  const result = validateBaseBitnatArtifact({
    blockHashHex: GENESIS_BLOCK_HASH,
    inscriptionIndex: 0,
    blockConfirmed: true,
    canonicalSat: "50000000000",
    inscriptionSat: "50000000000",
  });

  assert.equal(result.entropyDepth, 10);
});

// ---------------------------------------------------------------------------
// artifact_rules.js — validateForgedBitnatArtifact (local checks)
// ---------------------------------------------------------------------------

test("validateForgedBitnatArtifact: rejects inscriptionIndex != 1", () => {
  assert.throws(
    () => validateForgedBitnatArtifact({ inscriptionIndex: 0 }),
    (err) => err.name === "ProtocolValidationError" && /inscription index must be 1/i.test(err.message)
  );
});

test("validateForgedBitnatArtifact: throws ExternalDependencyError when baseSatConfirmed not provided", () => {
  assert.throws(
    () => validateForgedBitnatArtifact({ inscriptionIndex: 1 }),
    (err) =>
      err instanceof ExternalDependencyError &&
      err.code === "ERR_ORD_INDEXER_REQUIRED" &&
      err.requiredDependency === DEPENDENCY.ORD_INDEXER
  );
});

test("validateForgedBitnatArtifact: throws ExternalDependencyError when sat data not provided", () => {
  assert.throws(
    () =>
      validateForgedBitnatArtifact({
        inscriptionIndex: 1,
        baseSatConfirmed: true,
        // baseSat / inscriptionSat not supplied
      }),
    (err) =>
      err instanceof ExternalDependencyError &&
      err.code === "ERR_SAT_ASSIGNMENT_REQUIRED" &&
      err.requiredDependency === DEPENDENCY.ORD_SAT_ASSIGNMENT
  );
});

test("validateForgedBitnatArtifact: rejects sat mismatch", () => {
  assert.throws(
    () =>
      validateForgedBitnatArtifact({
        inscriptionIndex: 1,
        baseSatConfirmed: true,
        baseSat: "100000000",
        inscriptionSat: "999999999",
      }),
    (err) => err.name === "ProtocolValidationError" && /same sat as the base/i.test(err.message)
  );
});

test("validateForgedBitnatArtifact: succeeds with all valid data", () => {
  const result = validateForgedBitnatArtifact({
    inscriptionIndex: 1,
    baseSatConfirmed: true,
    baseSat: "50000000000",
    inscriptionSat: "50000000000",
  });

  assert.deepEqual(result, { ok: true });
});
