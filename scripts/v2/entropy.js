"use strict";

/**
 * Normative references:
 * - docs/01-core-protocol.md (Entropy Depth ⦻N definition and derivation rules)
 * - docs/05-specification.md (Section on Entropy Notation and ⦻N operator)
 */

const { assertInvariant } = require("./constants");

// Bitcoin block hashes are SHA-256d outputs: 32 bytes = 64 lowercase hex characters.
const BLOCK_HASH_HEX_LENGTH = 64;

/**
 * Assert that a block hash string is a valid 64-character lowercase hexadecimal value.
 *
 * @param {string} blockHashHex
 */
function validateBlockHashHex(blockHashHex) {
  assertInvariant(
    typeof blockHashHex === "string",
    "Invalid block hash: expected string.",
    { value: blockHashHex }
  );

  assertInvariant(
    blockHashHex.length === BLOCK_HASH_HEX_LENGTH,
    `Invalid block hash: expected ${BLOCK_HASH_HEX_LENGTH} hex characters.`,
    { length: blockHashHex.length }
  );

  assertInvariant(
    /^[0-9a-f]+$/.test(blockHashHex),
    "Invalid block hash: expected lowercase hexadecimal.",
    { value: blockHashHex }
  );
}

/**
 * Count leading hexadecimal zeros in a Bitcoin block hash.
 *
 * This is the canonical ⦻N entropy depth measurement for a Bitnats Block.
 * Each leading hex zero represents one unit of entropy depth. A block qualifies
 * as a Bitnats Block only if N >= 1.
 *
 * Per docs/05-specification.md: "Each additional leading hexadecimal zero represents
 * a 16× increase in rarity within the SHA-256 search space."
 *
 * @param {string} blockHashHex - 64-character lowercase hexadecimal Bitcoin block hash
 * @returns {number} N — the number of leading hexadecimal zero characters
 */
function leadingHexZeroCount(blockHashHex) {
  validateBlockHashHex(blockHashHex);

  let count = 0;
  for (const char of blockHashHex) {
    if (char === "0") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

module.exports = {
  BLOCK_HASH_HEX_LENGTH,
  leadingHexZeroCount,
  validateBlockHashHex,
};
