# Manifest V2 Specification

## 1. Overview

Manifest V2 is the canonical reconstruction descriptor for Bitnats V2 archives.

Manifest V2 commits to family declarations, canonical shard ordering, record model constraints, native binary stream commitments, and deterministic JSONL reconstruction commitments.

Manifest V2 does not define marketplace behavior, UI metadata, inscription publication workflow, collection curation policy, or transport-specific behavior outside canonical reconstruction.

## Conventions

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document are to be interpreted as described in RFC 2119.

Unless explicitly stated otherwise:

- All hashes are SHA-256 encoded as 64-character lowercase hexadecimal strings.
- All strings are UTF-8.
- All byte lengths are non-negative integers.
- All deterministic procedures are consensus-relevant.

## 2. Design Goals

Manifest V2 is designed to provide:

1. Deterministic reconstruction from inscribed shards.
2. Shard-friendly archive layout for on-chain inscription.
3. Byte-stable verification across independent implementations.
4. Explicit separation of historical representation (V1) from forward canonical representation (V2).
5. Support for independent verifiers, indexers, and archival tooling.

## 3. Scope

Manifest V2 defines:

- Canonical manifest structure.
- Dataset family declarations.
- Shard enumeration and ordering rules.
- Reconstruction semantics.
- Verification commitments.
- Compatibility expectations for V2 archives.

Manifest V2 does not define:

- Marketplace display conventions.
- UI metadata.
- Inscription publication workflow.
- Collection curation policy.
- Transport-specific behavior outside canonical reconstruction.

## 4. Terminology

| Term | Definition |
|---|---|
| manifest | A structured protocol object that defines deterministic reconstruction and verification targets for one or more archive streams. |
| family | A fixed stream namespace within Manifest V2. |
| shard | A byte segment of one family stream, committed by hash and position. |
| stream | An ordered byte sequence reconstructed from family shards. |
| native binary stream | The canonical reconstructed V2 byte stream interpreted as 33-byte records. |
| reconstructed JSONL | Deterministic JSONL bytes derived from a validated native binary stream. |
| canonical order | The exact sequence defined by the manifest; no heuristic sorting is permitted. |
| shard index | A non-negative integer position of a shard in canonical stream order. |
| record | A fixed 33-byte V2 dataset element. |
| archive | The complete set of family streams and commitments governed by one manifest. |
| verification target | Any consensus-relevant byte sequence whose hash is committed by the manifest. |
| reconstruction hash | SHA-256 commitment for reconstructed output (binary stream or reconstructed JSONL). |
| stream hash | SHA-256 commitment of a reconstructed native binary stream. |
| forward canonical | The V2 representation used for normative reconstruction and verification. |
| historical format | Legacy V1 JSONL representation retained for historical compatibility. |

## 5. Manifest V2 Role in the Bitnats Archive Model

V1 is historical and remains available for compatibility and archival inspection.

V2 is the forward canonical archive model. V2 streams are reconstructed from shards under manifest-defined semantics.

Manifest V2 defines three family-separated streams: `base`, `prospect`, and `forged`.

Each family stream is interpreted as an ordered sequence of 33-byte records. Manifest V2 commits to both:

- the native binary stream hash
- the deterministically reconstructed JSONL hash

Manifest V2 is therefore a reconstruction contract, not a checksum inventory.

## 6. Canonical Manifest Structure

Manifest V2 MUST be represented as a JSON object with the following top-level structure:

1. Manifest metadata:
	 `manifest_version`, `format_id`, `record_size_bytes`, `shard_target_bytes`.
2. Family descriptors:
	 `families` containing exactly `base`, `prospect`, and `forged`.
3. Optional compatibility metadata:
	 `compatibility`.

Required top-level fields:

- `manifest_version` (fixed value)
- `format_id` (fixed value)
- `record_size_bytes` (fixed value)
- `shard_target_bytes` (policy declaration)
- `families` (family descriptor set)

Per-family required concepts:

- family identifier
- ordered shard list
- stream-level commitments
- reconstruction commitments

Informational-only fields MAY appear only under `compatibility`.

All fields outside `compatibility` are consensus-relevant unless this document explicitly states otherwise.

## 7. Canonical Field Semantics

### 7.1 Top-Level Fields

| Name | Type | Allowed Domain | Required | Consensus-Relevant | Interpretation |
|---|---|---|---|---|---|
| `manifest_version` | integer | `2` | YES | YES | Declares Manifest V2. |
| `format_id` | string | `"bitnats-manifest-v2"` | YES | YES | Identifies canonical format family. |
| `record_size_bytes` | integer | `33` | YES | YES | Declares fixed native record size. |
| `shard_target_bytes` | integer | `350000` | YES | NO | Declares shard sizing policy target. |
| `families` | object | keys `base`, `prospect`, `forged` only | YES | YES | Contains family reconstruction descriptors. |
| `compatibility` | object | implementation metadata | NO | NO | Informational only. MUST NOT affect reconstruction or verification. |

### 7.2 Per-Family Descriptor Fields

Each family descriptor MUST be a JSON object with fields:

| Name | Type | Allowed Domain | Required | Consensus-Relevant | Interpretation |
|---|---|---|---|---|---|
| `family_id` | string | exact family key value | YES | YES | Redundant identity check for descriptor integrity. |
| `stream_hash_sha256` | string | lowercase hex length 64 | YES | YES | Commitment to reconstructed native binary stream bytes. |
| `reconstructed_jsonl_hash_sha256` | string | lowercase hex length 64 | YES | YES | Commitment to deterministic JSONL reconstruction bytes. |
| `jsonl_schema` | string | `"bitnats-jsonl-id-v1"` | YES | YES | Declares reconstruction text model. |
| `shards` | array | ordered list of shard descriptors | YES | YES | Canonical shard sequence for stream reconstruction. |

### 7.3 Per-Shard Descriptor Fields

Each shard descriptor MUST be a JSON object with fields:

| Name | Type | Allowed Domain | Required | Consensus-Relevant | Interpretation |
|---|---|---|---|---|---|
| `index` | integer | `0..n-1` contiguous | YES | YES | Canonical shard position in stream order. |
| `inscription_id` | string | `<txid>i<index>` form | YES | YES | Retrieval identifier for shard content. |
| `byte_length` | integer | `> 0` and divisible by 33 | YES | YES | Exact shard byte length after retrieval. |
| `sha256` | string | lowercase hex length 64 | YES | YES | Commitment to exact shard bytes. |

## 8. Family Definitions

Manifest V2 defines exactly three family identifiers:

- `base`
- `prospect`
- `forged`

Rules:

1. Family identifiers are fixed and case-sensitive.
2. Each family defines an independent ordered archive stream.
3. Reconstruction and verification MUST be performed independently per family.
4. Family mixing is invalid unless explicitly defined by a future protocol version.
5. Additional family identifiers in Manifest V2 are invalid.

## 9. Record Model

All V2 native binary streams MUST be interpreted as ordered sequences of 33-byte records.

Each record format is:

```text
[32 bytes] inscription transaction identifier (txid)
[ 1 byte ] inscription index
```

Rules:

1. `record_size_bytes` MUST equal `33`.
2. A stream length not divisible by 33 is invalid.
3. Truncated records are invalid.
4. Extra trailing bytes that do not form complete records are invalid.
5. Record size mismatch is invalid.

## 10. Shard Model

Shards are ordered segments of a family stream.

Rules:

1. Shard order is canonical and MUST be taken from the manifest.
2. The manifest MUST define sufficient information to reconstruct exact stream order.
3. Shard target sizing is approximately 350 kB.
4. Actual shard byte lengths MAY vary.
5. Shard byte size does not override canonical ordering.
6. Shard content boundaries are deterministic once stream and partitioning are defined.

## 11. Shard Ordering Rules

Shard ordering is consensus-critical.

Rules:

1. Shard sequence MUST be interpreted in manifest order.
2. Shard `index` values MUST be unique.
3. Shard `index` values MUST be monotonic and contiguous from 0.
4. Duplicate shard identifiers are invalid.
5. Missing shard positions are invalid.
6. Reordering shards changes reconstructed bytes and MUST fail verification.
7. Implementations MUST NOT sort shards by inscription ID, filename, lexicographic key, or external metadata unless the manifest explicitly defines that exact order.

## 12. Reconstruction Semantics

Manifest V2 defines reconstruction semantics, not only commitments.

For a selected family, reconstruction MUST use the following deterministic procedure:

1. Parse and validate manifest structure per Sections 6, 7, and 16.
2. Select family descriptor by exact family identifier.
3. Validate shard sequence constraints per Sections 10 and 11.
4. Retrieve each shard by `inscription_id` in canonical manifest order.
5. Verify each shard `byte_length` and `sha256` against descriptor values.
6. Concatenate shard bytes in canonical order to form the native binary stream.
7. Verify native stream length is divisible by 33.
8. Verify native stream SHA-256 equals `stream_hash_sha256`.
9. Decode native stream into ordered 33-byte records.
10. Reconstruct deterministic JSONL bytes from decoded records per Section 15.
11. Verify reconstructed JSONL SHA-256 equals `reconstructed_jsonl_hash_sha256`.
12. Accept reconstruction only if all checks succeed.

## 13. Verification Model

Manifest V2 uses dual verification. For each family, the manifest commits to:

1. Hash of the reconstructed native binary stream.
2. Hash of the deterministically reconstructed JSONL output.

Rules:

1. Both commitments are consensus-relevant.
2. A verifier MUST independently reconstruct and hash both targets.
3. Failure of either target invalidates the reconstruction result.
4. Implementations MUST NOT treat one commitment as advisory when the other matches.

## 14. Hash Commitments

Hash commitments apply to exact bytes at defined stages.

Rules:

1. Shard hash applies to the exact retrieved shard bytes.
2. Stream hash applies to the exact concatenated native binary stream bytes.
3. Reconstructed JSONL hash applies to exact reconstructed JSONL bytes.
4. Hashing MUST NOT be applied to semantic representations.
5. Line-ending normalization is not permitted.
6. Whitespace normalization is not permitted.
7. JSON pretty-printing is not permitted.
8. Field reordering is not permitted.
9. Parser reserialization is not permitted unless explicitly required by the reconstruction procedure.

## 15. Deterministic JSONL Reconstruction Requirements

For each decoded record, reconstructed JSONL output MUST emit exactly one line with this byte-level shape:

```text
{"id":"<lowercase-hex-txid>i<decimal-index>"}\n
```

Rules:

1. Output encoding MUST be UTF-8.
2. Field set MUST contain exactly one field: `id`.
3. Field order MUST be exactly `id`.
4. Record order MUST equal decoded stream record order.
5. `txid` text MUST be lowercase hexadecimal with length 64.
6. `index` text MUST be unsigned decimal with no leading zeros, except `0`.
7. Each line MUST terminate with LF (`0x0a`).
8. Semantic equivalence is insufficient; byte identity is required.
9. Two compliant implementations MUST produce byte-identical output for the same validated input.

## 16. Validation Requirements

A Manifest V2 validator MUST reject any manifest or reconstruction state with one or more of the following conditions:

1. Unsupported manifest version.
2. Unknown required field.
3. Missing required field.
4. Invalid family identifier.
5. Non-canonical shard order.
6. Record size mismatch.
7. Incomplete record boundary.
8. Duplicate shard reference.
9. Missing shard.
10. Shard hash mismatch.
11. Stream hash mismatch.
12. Reconstructed JSONL hash mismatch.
13. Ambiguous reconstruction path.

## 17. Failure Semantics

Verifier behavior on invalid input is fail-closed.

Rules:

1. Implementations MUST fail closed on any consensus-relevant error.
2. Implementations MUST NOT silently repair malformed manifests.
3. Implementations MUST NOT infer missing shard order.
4. Implementations MUST NOT continue after hash mismatch as though reconstruction were valid.
5. Soft warnings MUST NOT replace failure for consensus-relevant errors.

## 18. Compatibility and Evolution

Rules:

1. V1 remains historical.
2. V2 is the forward canonical format.
3. Future manifest revisions MUST use a new explicit manifest version.
4. V2 validators MUST NOT reinterpret unknown future versions as V2-compatible.
5. Backward-compatible extensions MUST NOT alter canonical reconstruction semantics.
6. Informational metadata MAY evolve under `compatibility` provided it remains non-consensus.

## 19. Security Considerations

Implementations SHOULD account for at least the following risks:

1. Shard reordering attacks.
2. Partial archive substitution.
3. Misleading external metadata.
4. Parser normalization hazards.
5. Semantic-but-not-byte-identical JSON reconstruction defects.
6. Implementation divergence caused by underspecified canonical encoding.

## 20. Reference Validation Flow

A verifier reference flow is:

1. Parse manifest.
2. Validate manifest structure.
3. Select family.
4. Validate shard sequence.
5. Reconstruct native stream.
6. Verify native stream hash.
7. Reconstruct canonical JSONL.
8. Verify reconstructed JSONL hash.
9. Accept only if all checks succeed.

## 21. Rationale

Manifest V2 defines reconstruction semantics rather than only hashes because:

1. Hashes alone do not eliminate reconstruction ambiguity.
2. Explicit reconstruction semantics improve implementation convergence.
3. Family separation improves shard portability and verification clarity.
4. Dual verification preserves compact binary efficiency and deterministic tooling reconstruction.

## 22. Appendix: Example Manifest Shape

The following example is informative only and is not normative.

```json
{
	"manifest_version": 2,
	"format_id": "bitnats-manifest-v2",
	"record_size_bytes": 33,
	"shard_target_bytes": 350000,
	"families": {
		"base": {
			"family_id": "base",
			"stream_hash_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			"reconstructed_jsonl_hash_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
			"jsonl_schema": "bitnats-jsonl-id-v1",
			"shards": [
				{
					"index": 0,
					"inscription_id": "<txid>i0",
					"byte_length": 349998,
					"sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
				}
			]
		},
		"prospect": {
			"family_id": "prospect",
			"stream_hash_sha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
			"reconstructed_jsonl_hash_sha256": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
			"jsonl_schema": "bitnats-jsonl-id-v1",
			"shards": []
		},
		"forged": {
			"family_id": "forged",
			"stream_hash_sha256": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
			"reconstructed_jsonl_hash_sha256": "1111111111111111111111111111111111111111111111111111111111111111",
			"jsonl_schema": "bitnats-jsonl-id-v1",
			"shards": []
		}
	},
	"compatibility": {
		"note": "informational-only"
	}
}
```