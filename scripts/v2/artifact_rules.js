"use strict";

/**
 * Normative references:
 * - docs/01-core-protocol.md (Base Bitnats Block Artifact and Forged Bitnats Block validity rules)
 * - docs/05-specification.md (Section 6: Artifact Eligibility Rules)
 *
 * Phase 6 note: this module implements the locally-computable artifact rule checks
 * and defines explicit stub boundaries for the two external dependencies that cannot
 * be resolved without production infra:
 *
 *   - Bitcoin RPC: required to confirm a block is mined and canonical
 *   - Ord indexer / sat assignment: required to verify inscription sat placement
 *
 * Conditions that CAN be validated locally are validated unconditionally.
 * Conditions that require external infra throw ExternalDependencyError with a clear
 * dependency code. Callers integrate the required data source, then pass the resolved
 * values back as explicit parameters to satisfy those checks.
 */

const {
  BASE_REQUIRED_INDEX,
  FORGED_REQUIRED_INDEX,
  assertInvariant,
} = require("./constants");

const { leadingHexZeroCount, validateBlockHashHex } = require("./entropy");

// ---------------------------------------------------------------------------
// ExternalDependencyError
// ---------------------------------------------------------------------------

/**
 * Thrown when an artifact rule validation step requires an external dependency
 * (Bitcoin RPC or Ord indexer) that has not been supplied by the caller.
 *
 * `code` is one of the ERR_* constants below.
 * `requiredDependency` names the integration boundary: see DEPENDENCY.
 */
class ExternalDependencyError extends Error {
  constructor(message, code, requiredDependency) {
    super(message);
    this.name = "ExternalDependencyError";
    this.code = code;
    this.requiredDependency = requiredDependency;
  }
}

/**
 * Canonical dependency identifiers.
 *
 * BITCOIN_RPC        — requires a live Bitcoin node (getblockheader, getblock)
 * ORD_SAT_ASSIGNMENT — requires Ord indexer sat→inscription mapping
 * ORD_INDEXER        — requires Ord indexer for inscription sat lookup
 */
const DEPENDENCY = Object.freeze({
  BITCOIN_RPC: "bitcoin-rpc",
  ORD_SAT_ASSIGNMENT: "ord-sat-assignment",
  ORD_INDEXER: "ord-indexer",
});

// ---------------------------------------------------------------------------
// validateBaseBitnatArtifact
// ---------------------------------------------------------------------------

/**
 * Validate a candidate Base Bitnats Block Artifact against the protocol eligibility
 * rules defined in docs/05-specification.md Section 6.
 *
 * Locally validated conditions (no external infra required):
 *   1. inscriptionIndex MUST be 0 (i0)
 *   2. blockHashHex MUST be a valid 64-character lowercase hex string
 *   3. blockHashHex MUST have >= 1 leading hexadecimal zero (Bitnats Block eligibility)
 *
 * Externally gated conditions (throw ExternalDependencyError until resolved):
 *   4. Block MUST be mined and confirmed — requires Bitcoin RPC
 *      Pass { blockConfirmed: true } once RPC confirmation is available.
 *   5. Inscription MUST be placed on the canonical Bitnats Block sat — requires Ord indexer
 *      Pass { canonicalSat, inscriptionSat } once sat assignment data is available.
 *
 * @param {Object} params
 * @param {string} params.blockHashHex     - 64-char lowercase hex Bitcoin block hash
 * @param {number} params.inscriptionIndex - inscription index (MUST equal 0)
 * @param {boolean} [params.blockConfirmed]  - external: true when Bitcoin RPC confirms block
 * @param {string|number|null} [params.canonicalSat]   - external: canonical Bitnats sat from Ord indexer
 * @param {string|number|null} [params.inscriptionSat] - external: actual sat of inscription from Ord indexer
 *
 * @returns {{ entropyDepth: number }} validated local fields on success
 * @throws {ProtocolValidationError} on local rule violations
 * @throws {ExternalDependencyError} when required external data has not been supplied
 */
function validateBaseBitnatArtifact(params) {
  const { blockHashHex, inscriptionIndex, blockConfirmed, canonicalSat, inscriptionSat } = params;

  // Condition 1 (local): inscription index MUST be 0.
  assertInvariant(
    inscriptionIndex === BASE_REQUIRED_INDEX,
    `Invalid Base Bitnats Block Artifact: inscription index must be ${BASE_REQUIRED_INDEX} (i0).`,
    { inscription_index: inscriptionIndex }
  );

  // Conditions 2–3 (local): block hash validity and Bitnats Block eligibility.
  validateBlockHashHex(blockHashHex);
  const entropyDepth = leadingHexZeroCount(blockHashHex);

  assertInvariant(
    entropyDepth >= 1,
    "Invalid Base Bitnats Block Artifact: block hash has no leading hexadecimal zeros; block is not a Bitnats Block.",
    { block_hash: blockHashHex, entropy_depth: entropyDepth }
  );

  // Condition 4 (external stub): block MUST be mined and confirmed.
  // TODO: Integrate Bitcoin RPC (getblockheader) to confirm block is in the canonical chain.
  if (blockConfirmed !== true) {
    throw new ExternalDependencyError(
      "Cannot complete Base Bitnats Block Artifact validation: block confirmation requires Bitcoin RPC integration.",
      "ERR_BITCOIN_RPC_REQUIRED",
      DEPENDENCY.BITCOIN_RPC
    );
  }

  // Condition 5 (external stub): inscription MUST be on the canonical Bitnats Block sat.
  // TODO: Integrate Ord indexer to resolve the canonical sat for this block and verify placement.
  if (canonicalSat == null || inscriptionSat == null) {
    throw new ExternalDependencyError(
      "Cannot complete Base Bitnats Block Artifact validation: canonical sat assignment requires Ord indexer integration.",
      "ERR_SAT_ASSIGNMENT_REQUIRED",
      DEPENDENCY.ORD_SAT_ASSIGNMENT
    );
  }

  assertInvariant(
    String(canonicalSat) === String(inscriptionSat),
    "Invalid Base Bitnats Block Artifact: inscription is not placed on the canonical Bitnats Block sat.",
    { canonical_sat: canonicalSat, inscription_sat: inscriptionSat }
  );

  return { entropyDepth };
}

// ---------------------------------------------------------------------------
// validateForgedBitnatArtifact
// ---------------------------------------------------------------------------

/**
 * Validate a candidate Forged Bitnats Block Artifact against the protocol eligibility
 * rules defined in docs/05-specification.md Section 6.
 *
 * Locally validated conditions (no external infra required):
 *   1. inscriptionIndex MUST be 1 (i1)
 *
 * Externally gated conditions (throw ExternalDependencyError until resolved):
 *   2. Inscription MUST be on the same sat as a valid Base Bitnats Block Artifact
 *      Pass { baseSatConfirmed: true } once Ord indexer confirms base artifact on the sat.
 *   3. Inscription sat MUST match the base artifact sat
 *      Pass { baseSat, inscriptionSat } once Ord indexer data is available.
 *
 * @param {Object} params
 * @param {number} params.inscriptionIndex  - inscription index (MUST equal 1)
 * @param {boolean} [params.baseSatConfirmed]  - external: true when Ord indexer confirms valid base artifact
 * @param {string|number|null} [params.baseSat]         - external: sat of the valid Base artifact
 * @param {string|number|null} [params.inscriptionSat]  - external: actual sat of this inscription from Ord indexer
 *
 * @returns {{ ok: true }} on success
 * @throws {ProtocolValidationError} on local rule violations
 * @throws {ExternalDependencyError} when required external data has not been supplied
 */
function validateForgedBitnatArtifact(params) {
  const { inscriptionIndex, baseSatConfirmed, baseSat, inscriptionSat } = params;

  // Condition 1 (local): inscription index MUST be 1.
  assertInvariant(
    inscriptionIndex === FORGED_REQUIRED_INDEX,
    `Invalid Forged Bitnats Block Artifact: inscription index must be ${FORGED_REQUIRED_INDEX} (i1).`,
    { inscription_index: inscriptionIndex }
  );

  // Condition 2 (external stub): base artifact on same sat MUST be valid.
  // TODO: Integrate Ord indexer to confirm a valid Base Bitnats Block Artifact exists on baseSat.
  if (baseSatConfirmed !== true) {
    throw new ExternalDependencyError(
      "Cannot complete Forged Bitnats Block Artifact validation: base artifact sat confirmation requires Ord indexer integration.",
      "ERR_ORD_INDEXER_REQUIRED",
      DEPENDENCY.ORD_INDEXER
    );
  }

  // Condition 3 (external stub): inscription MUST be on the same sat as the base artifact.
  // TODO: Integrate Ord indexer to resolve sat for this inscription.
  if (baseSat == null || inscriptionSat == null) {
    throw new ExternalDependencyError(
      "Cannot complete Forged Bitnats Block Artifact validation: sat comparison requires Ord indexer integration.",
      "ERR_SAT_ASSIGNMENT_REQUIRED",
      DEPENDENCY.ORD_SAT_ASSIGNMENT
    );
  }

  assertInvariant(
    String(baseSat) === String(inscriptionSat),
    "Invalid Forged Bitnats Block Artifact: inscription is not on the same sat as the Base Bitnats Block Artifact.",
    { base_sat: baseSat, inscription_sat: inscriptionSat }
  );

  return { ok: true };
}

module.exports = {
  DEPENDENCY,
  ExternalDependencyError,
  validateBaseBitnatArtifact,
  validateForgedBitnatArtifact,
};
