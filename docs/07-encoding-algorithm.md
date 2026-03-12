# Bitnats Archive V2 Encoding Algorithm

Status: Canonical encoding algorithm for Bitnats Archive V2

---

## Abstract

This document defines the canonical encoding and decoding algorithm for the Bitnats Archive V2 binary format.

It specifies:

1. Canonical record formation from logical dataset fields.
2. Canonical binary stream construction from ordered records.
3. Deterministic family partitioning into `base`, `prospect`, and `forged` streams.
4. Deterministic shard formation from each canonical family stream.
5. Manifest-linked reconstruction from inscribed shards to native binary stream.
6. Dual verification of the native binary stream hash and the deterministically reconstructed JSONL hash.

This document operates in conjunction with `docs/06-manifest-v2-spec.md`. The manifest specification defines what Manifest V2 is and what fields it contains. This document defines how canonical V2 archive data is produced, partitioned, reconstructed, and verified. Both documents are required to implement a conformant Bitnats V2 archival system.

---

## Motivation

Protocol credibility depends not only on declaring a schema but on specifying the exact byte-level procedure by which all implementations derive identical artifacts.

Ambiguity in record ordering, field serialization, line endings, integer representation, shard boundary placement, or reconstruction rules is unacceptable. Any such ambiguity causes independent implementations to produce divergent byte streams, divergent shard hashes, and divergent verification outcomes. Such divergence undermines the reconstruction contract embodied by Manifest V2 and invalidates the dual verification model.

This document eliminates that ambiguity by defining every encoding and decoding step as a normative deterministic procedure.

---

## Design Goals

The design of the Bitnats Archive V2 encoding algorithm satisfies the following goals:

1. **Deterministic output across implementations.** Two conforming encoders operating on identical input MUST produce byte-identical output at every stage: records, streams, shards, and manifests.
2. **Canonical byte-for-byte reproducibility.** Independent verifiers MUST reconstruct the same binary stream and the same JSONL output from the same manifest and shards.
3. **Forward archival stability.** The V2 binary format is the normative archival representation. Its structure and semantics MUST NOT change without a new explicit manifest version.
4. **Independent verification without trusted intermediaries.** All verification targets are computable from Bitcoin blockchain data, deterministic protocol rules, and SHA-256 hashing alone.
5. **Manifest-bound reconstruction.** Reconstruction MUST be governed by manifest-defined family descriptors and shard ordering. Filesystem enumeration, local naming conventions, and external metadata MUST NOT determine reconstruction order.
6. **Clean separation between historical V1 JSONL and forward canonical V2 binary encoding.** V1 is a historical artifact. V2 is the normative encoding format. Implementations MUST NOT conflate them.

---

## Normative Language

The key words MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, and MAY in this document are to be interpreted as described in RFC 2119.

---

## Conformance

An implementation is conformant with this specification if and only if it satisfies all MUST and MUST NOT requirements defined in the normative sections of this document, correctly handles all defined error conditions, and produces byte-identical output to all other conformant implementations for identical inputs.

An implementation failing any MUST or MUST NOT requirement is non-conformant regardless of correctness in other areas.

---

## 1. Scope

This document specifies:

- Canonical input assumptions for V2 encoding.
- Canonical 33-byte record encoding.
- Canonical stream record ordering.
- Deterministic family partitioning.
- Deterministic shard formation.
- Manifest-linked reconstruction from shards to native binary stream.
- Deterministic decoding of native binary stream back into canonical JSONL.
- Dual verification requirements.

This document does not redefine the Manifest V2 schema or field semantics. Those are defined exclusively in `docs/06-manifest-v2-spec.md`. This document operates as the encoding companion to that specification.

This document does not define:

- Bitcoin consensus rules or block hash derivation.
- Bitnats artifact eligibility criteria.
- Inscription publication workflow.
- Marketplace or UI representation.

---

## 2. Relationship to Other Repository Documents

| Document | Relationship |
|---|---|
| `docs/01-core-protocol.md` | Defines protocol primitives, artifact families, and eligibility rules that determine which records enter the canonical dataset. |
| `docs/03-dataset.md` | Defines the V1 and V2 dataset formats, 33-byte record model, sharding, and dual verification at the dataset level. |
| `docs/05-specification.md` | The normative overarching protocol specification. This document provides byte-level encoding detail consistent with that specification. |
| `docs/06-manifest-v2-spec.md` | Defines Manifest V2 structure, field semantics, shard ordering rules, and reconstruction semantics. This document is the procedural complement to that specification. |
| `docs/04-verification.md` | Defines independent verification procedures, the verification algorithm, test vectors, and failure conditions. |

These documents form an interlocking normative system. No document is authoritative in isolation. Encoding, reconstruction, verification, and manifest semantics are co-defined across this set.

---

## 3. Canonical Data Model

### 3.1 Logical Record Fields

The V2 encoding algorithm operates on a canonical logical dataset. A logical record has exactly two fields:

| Field | Type | Description |
|---|---|---|
| `txid` | 32-byte sequence | The Bitcoin transaction identifier containing the Bitnats artifact inscription, in raw binary byte order. |
| `inscription_index` | unsigned 8-bit integer | The ordinal inscription index on the given transaction. `0` corresponds to `i0`; `1` corresponds to `i1`. |

The encoding algorithm does not consume raw JSON text or JSONL input. It operates on the canonical logical dataset after all field values have been determined by protocol rules.

### 3.2 Representations

Three representations exist for V2 archive data:

| Representation | Description |
|---|---|
| Logical record | Abstract field-value pair used for encoding input and decoding output. |
| Native binary record | The exact 33-byte binary encoding of one logical record. |
| Reconstructed JSONL line | The deterministic text serialization of one logical record, as defined in Section 10. |

Encoding produces native binary records from logical records. Decoding produces logical records from native binary records. JSONL reconstruction produces canonical JSONL text from decoded logical records.

### 3.3 Input Assumptions

The encoder MUST operate on a finalized, deduplicated, ordered canonical logical dataset. The following preconditions apply:

- All `txid` values correspond to mined Bitcoin transactions.
- No duplicate `txid` + `inscription_index` pairs exist in the dataset.
- All records have been assigned to exactly one family by the classification rules in Section 6.
- Records have been sorted according to the canonical ordering rules in Section 5.

The encoder MUST NOT proceed if any precondition is violated.

---

## 4. Record Encoding

### 4.1 Binary Record Layout

Each V2 binary record is exactly 33 bytes, encoded in the following field order:

| Offset | Length | Field | Encoding |
|---|---|---|---|
| 0 | 32 bytes | `txid` | Raw bytes in canonical Bitcoin byte order (as stored in Bitcoin transactions). |
| 32 | 1 byte | `inscription_index` | Unsigned 8-bit integer, big-endian (single byte; endianness is trivial). |

Total: 33 bytes.

### 4.2 Field Encoding Rules

1. The `txid` field MUST be encoded as exactly 32 raw bytes. No hex encoding, no length prefix, no null terminator.
2. The `inscription_index` field MUST be encoded as a single unsigned 8-bit integer. Allowed values are `0x00` through `0xFF`. Values not supported by the target family MUST cause an error at classification time, not at encoding time.
3. No padding bytes exist before, between, or after fields.
4. No record separator, header, trailer, or framing byte exists in the binary stream.

### 4.3 Prohibited Variations

Conforming encoders MUST NOT:

- Vary field order.
- Use a different integer width for `inscription_index`.
- Include text representations of any field.
- Include per-record length prefixes or checksums.
- Emit records shorter or longer than 33 bytes.

### 4.4 Byte Layout Table (Compact Reference)

```
Bytes 00–1F (32 bytes): txid            — raw binary, 32 bytes
Byte  20    ( 1 byte ): inscription_index — unsigned 8-bit integer
                                           Total: 33 bytes
```

---

## 5. Canonical Record Ordering

### 5.1 Primary Sort Key

Records within a family stream MUST be ordered by `txid` interpreted as an unsigned 256-bit big-endian integer, in ascending order.

The `txid` bytes at offset 0 through 31 in the binary record are used directly for comparison. No byte reversal is applied.

### 5.2 Tie-Breaking

If two records share the same `txid`, they MUST be ordered by `inscription_index` in ascending numeric order.

Two records sharing the same `txid` and `inscription_index` constitute a duplicate and MUST NOT exist in any conformant dataset. The encoder MUST reject duplicate logical records as invalid input.

### 5.3 Scope

Ordering is applied independently within each family. The `base`, `prospect`, and `forged` families are sorted separately. There is no global cross-family sort.

### 5.4 Source File Order

Source file order, filesystem enumeration order, inscription discovery order, and any other external ordering artifact are not authoritative. The canonical sort is defined solely by the rules in Sections 5.1 and 5.2.

### 5.5 Invalid Ordering

An encoder that emits records in any order other than the order defined above is non-conformant. A decoder or verifier encountering an input whose records are not in canonical order MAY reject the input as invalid.

---

## 6. Family Partitioning

### 6.1 Family Identifiers

Bitnats Archive V2 defines exactly three canonical family identifiers:

| Identifier | Description |
|---|---|
| `base` | Base Bitnats Block artifacts. |
| `prospect` | Prospect artifacts. |
| `forged` | Forged Bitnats artifacts derived from base blocks. |

Family identifiers are fixed, lowercase, and case-sensitive. No other family identifiers are valid in V2.

### 6.2 Classification Rules

Family assignment MUST be determined by protocol-level artifact semantics, not by field values in the binary encoding alone.

| Family | Classification rule |
|---|---|
| `base` | The record represents a Base Bitnats Block inscription. The `inscription_index` value is `0x00` (`i0`). |
| `prospect` | The record represents a Prospect artifact. |
| `forged` | The record represents a Forged artifact derived from a base block. The `inscription_index` value is `0x01` (`i1`). |

The `inscription_index` byte in the binary record reflects the inscription ordinal position but does not solely determine family assignment. Family assignment is a semantic determination made at dataset construction time, not inferred from binary field values at encoding time.

### 6.3 Exclusivity

Each record MUST belong to exactly one family. A record MUST NOT appear in more than one family stream.

### 6.4 Unclassifiable Records

A record that cannot be assigned to a canonical family is invalid. The encoder MUST NOT emit unclassifiable records into any stream.

### 6.5 Independent Streams

Each family forms an independent canonical binary stream. Family streams MUST be encoded, sharded, reconstructed, and verified independently. Cross-family mixing during reconstruction is invalid.

---

## 7. Canonical Stream Construction

### 7.1 Stream Formation

For each family, the canonical binary stream is constructed by:

1. Selecting all records assigned to that family.
2. Sorting those records in canonical order per Section 5.
3. Encoding each record to 33 bytes per Section 4.
4. Concatenating the encoded records in sort order with no separators.

The result is a byte sequence of length `N × 33`, where `N` is the number of records in the family.

### 7.2 Stream Invariants

1. The stream length MUST be divisible by 33.
2. No bytes exist in the stream other than the packed sequence of encoded records.
3. No whitespace, delimiters, headers, trailers, compression wrappers, or framing bytes are part of the canonical native V2 stream.
4. The stream hash is computed over the exact raw bytes of the family stream.

### 7.3 Logical Stream Primacy

The full canonical family stream exists conceptually before sharding. Sharding is a deterministic partition of a fully formed stream; it does not alter stream content or record order. Implementations that shard incrementally during encoding MUST produce results byte-identical to those that shard after completing the full stream.

---

## 8. Shard Formation

### 8.1 Shard Target Size

The canonical shard target size is **350,000 bytes** (`350 kB`). This target is declared in the manifest as `shard_target_bytes: 350000`.

### 8.2 Shard Boundary Rule

Shard boundaries MUST align to record boundaries. Records MUST NOT be split across shards.

The algorithm for forming shards from a family stream is:

1. Initialize an empty current shard.
2. For each record in canonical stream order:
   a. If adding the next 33-byte record to the current shard would not exceed the target size, append the record to the current shard.
   b. If the current shard is empty (the record alone does not exceed the target), append regardless.
   c. Otherwise, close the current shard and open a new shard containing the current record.
3. After all records are processed, close the final shard.

A shard that would be empty MUST NOT be emitted.

### 8.3 Shard Numbering

Shards are numbered using 0-based contiguous integers. The first shard has index `0`, the second has index `1`, and so on. Shard index values MUST be unique, contiguous, and monotonically increasing from 0.

### 8.4 Final Shard

The final shard contains all remaining records and MAY be smaller than the target size. Its actual byte length is authoritative. The manifest MUST commit to the exact byte length of every shard including the final one.

### 8.5 Determinism

Shard boundaries are fully determined by the canonical stream and the shard target size. Implementations MUST NOT use filesystem sizing, inscription metadata, or heuristics to determine boundaries.

### 8.6 Manifest Commitments for Shards

For each shard, the manifest MUST record:

- `index`: 0-based shard position in canonical stream order.
- `inscription_id`: Retrieval identifier.
- `byte_length`: Exact byte count of the shard.
- `sha256`: SHA-256 hash of the exact shard bytes.

---

## 9. Hashing and Commitments

### 9.1 Hash Function

All cryptographic commitments MUST use SHA-256.

All hash values MUST be encoded as 64-character lowercase hexadecimal strings with no prefix and no whitespace.

### 9.2 Hash Domains

| Commitment | Byte domain |
|---|---|
| Shard hash | Exact raw bytes of the shard, as retrieved, before concatenation. |
| Family stream hash | Exact raw bytes of the fully concatenated native binary stream for the family. |
| Reconstructed JSONL hash | Exact raw bytes of the deterministically reconstructed JSONL output for the family. |

### 9.3 Prohibited Normalizations

1. The hash of a shard MUST NOT be computed over any other byte sequence than the exact shard bytes.
2. The stream hash MUST NOT be computed over a partially concatenated or reordered stream.
3. The JSONL hash MUST NOT be computed over normalized, trimmed, or reformatted text. It is computed over the exact byte output of the reconstruction procedure defined in Section 10.
4. Line-ending normalization is not permitted.
5. Whitespace normalization is not permitted.

### 9.4 Manifest Root Commitment

Manifest V2 commits to stream hashes and reconstructed JSONL hashes per family via the `stream_hash_sha256` and `reconstructed_jsonl_hash_sha256` fields. These are consensus-relevant commitments. See `docs/06-manifest-v2-spec.md` Section 7 for field semantics.

---

## 10. Deterministic JSONL Reconstruction

### 10.1 Reconstruction Input

JSONL reconstruction takes as input a validated native binary stream for a given family. The stream MUST have already passed the shard hash verification and stream length check defined in Section 11.

### 10.2 Reconstruction Procedure

For each 33-byte record in stream order:

1. Extract `txid`: bytes at offset 0 through 31.
2. Extract `inscription_index`: byte at offset 32, interpreted as an unsigned 8-bit integer.
3. Render `txid` as 64-character lowercase hexadecimal string.
4. Render `inscription_index` as unsigned decimal string with no leading zeros, except that `0` is rendered as `"0"`.
5. Emit exactly the following byte sequence:

   ```
   {"id":"<txid_hex>i<index_dec>"}\n
   ```

   where `\n` is a single LF byte (`0x0a`).

6. No other bytes are emitted for this record.

After all records are processed, the reconstruction is complete. No trailing bytes are added beyond the LF following the final record line.

### 10.3 Reconstruction Rules

1. Output encoding MUST be UTF-8.
2. The JSON object MUST contain exactly one field: `id`.
3. Field order MUST be exactly: `id` first and only.
4. The `txid` hex string MUST be exactly 64 lowercase hexadecimal characters.
5. The `inscription_index` decimal string MUST have no leading zeros, except for the value `0` itself.
6. Each line MUST terminate with exactly one LF byte (`0x0a`). CR (`0x0d`) MUST NOT be emitted.
7. No additional whitespace, pretty-printing, or field separators MUST appear in the output.
8. Two conformant implementations MUST produce byte-identical JSONL output for the same validated input.

### 10.4 V1 Compatibility for the Base Family

For the `base` family, the reconstructed JSONL output MUST be byte-identical to the canonical V1 dataset file at `dataset/inscriptions.jsonl`. This is verified by comparing the reconstructed JSONL SHA-256 against the V1 dataset hash.

For `prospect` and `forged` families, the reconstructed JSONL SHA-256 MUST match the corresponding `reconstructed_jsonl_hash_sha256` committed in Manifest V2.

### 10.5 Distinction Between Verification Paths

| Path | Input | Output | Hash target |
|---|---|---|---|
| Native V2 binary verification | Raw shard bytes | Native binary stream | `stream_hash_sha256` |
| JSONL reconstruction verification | Decoded logical records | Canonical JSONL bytes | `reconstructed_jsonl_hash_sha256` |

Both paths MUST succeed for reconstruction to be accepted as valid. Neither path overrides the other.

---

## 11. Decoder Requirements

A conforming decoder MUST validate all of the following conditions before accepting reconstructed data:

1. **Manifest version compatibility.** The manifest `manifest_version` field MUST equal `2`.
2. **Format identifier.** The manifest `format_id` field MUST equal `"bitnats-manifest-v2"`.
3. **Record size declaration.** The manifest `record_size_bytes` field MUST equal `33`.
4. **Family completeness.** The manifest MUST declare exactly the families `base`, `prospect`, and `forged`.
5. **Target family existence.** The selected family descriptor MUST be present in the manifest.
6. **Shard completeness.** Shard index values MUST be unique, contiguous, and monotonically increasing from 0 with no gaps.
7. **Shard byte-length consistency.** Each retrieved shard MUST have a byte length equal to the `byte_length` declared in the manifest.
8. **Shard hash verification.** SHA-256 of each retrieved shard MUST equal the `sha256` declared in the manifest descriptor for that shard.
9. **Stream length divisibility.** The concatenated binary stream length MUST be divisible by 33. A remainder indicates a truncated record and is a fatal error.
10. **Stream hash verification.** SHA-256 of the concatenated binary stream MUST equal `stream_hash_sha256` in the family descriptor.
11. **Record field range validation.** Each decoded `inscription_index` value MUST be a valid value for the target family.
12. **Reconstruction hash verification.** SHA-256 of the reconstructed JSONL output MUST equal `reconstructed_jsonl_hash_sha256` in the family descriptor.

All listed checks are fatal. A decoder MUST NOT accept reconstruction output if any check fails.

---

## 12. Encoder Requirements

A conforming encoder MUST:

1. **Normalize canonical input.** Operate on a finalized logical dataset with all records classified by family, deduplicated, and validated against protocol eligibility rules.
2. **Apply stable family classification.** Assign each record to exactly one family using semantic protocol rules, not binary field inference.
3. **Apply canonical ordering.** Sort records within each family per Section 5 before encoding. The sort MUST be stable and deterministic.
4. **Produce exact 33-byte records.** Encode each logical record as exactly 33 bytes per Section 4 with no deviation.
5. **Apply deterministic shard partitioning.** Partition each family stream into shards per Section 8 using the canonical target size.
6. **Compute exact hash commitments.** Compute shard hashes, stream hashes, and reconstructed JSONL hashes over exactly the byte domains defined in Section 9.
7. **Populate manifest descriptors.** Produce manifest output consistent with `docs/06-manifest-v2-spec.md` field definitions and requirements.

A conforming encoder MUST NOT emit any alternative representation that is semantically equivalent but not byte-identical. Equivalent-but-different output is non-conformant.

---

## 13. Error Conditions

The following conditions are invalid. A conforming implementation MUST treat each as a fatal error.

| Condition | Required behavior |
|---|---|
| Duplicate logical records | Reject as invalid input; do not encode. |
| Record assigned to more than one family | Reject as invalid. |
| Unclassifiable record | Reject as invalid. |
| Record not exactly 33 bytes in binary stream | Reject as malformed stream. |
| Stream length not divisible by 33 | Reject as malformed stream; do not attempt record decoding. |
| Shard byte length not matching manifest declaration | Reject with hash mismatch or length mismatch error. |
| Shard SHA-256 not matching manifest declaration | Reject; do not proceed to stream reconstruction. |
| Family stream SHA-256 not matching manifest `stream_hash_sha256` | Reject; reconstruction output is invalid. |
| Reconstructed JSONL SHA-256 not matching manifest `reconstructed_jsonl_hash_sha256` | Reject; reconstruction output is invalid. |
| Non-contiguous or non-monotonic shard index sequence | Reject as invalid manifest; do not reconstruct. |
| Missing shard in manifest sequence | Reject as incomplete archive. |
| Manifest version not equal to `2` | Reject as unsupported version. |
| Unknown required manifest field | Reject as malformed manifest. |
| Invalid family identifier | Reject as invalid manifest. |
| Records not in canonical order | Invalid encoder output; verifier MAY reject. |
| Manifest contradictions between `byte_length` and actual shard size | Reject. |
| Cross-family stream mixing during reconstruction | Reject as invalid reconstruction. |

Implementations MUST NOT silently repair any of these conditions. Fail-closed behavior is required for all consensus-relevant errors.

---

## 14. Implementation Notes (Non-Normative)

This section is non-normative. It explains design decisions and offers guidance to implementers.

**Why fixed-width records.** Fixed-width 33-byte records eliminate boundary detection at deserialize time. Any byte offset divisible by 33 is a valid record start. This allows O(1) random access to any record by index and simplifies shard slicing.

**Why the full family stream is conceptually formed before sharding.** The shard boundary algorithm is defined over a complete ordered stream. This definition ensures that implementations producing shards incrementally versus in one pass produce identical shard boundaries, provided both respect the same target size and record ordering.

**Why reconstruction is manifest-defined rather than inferred.** Inferred reconstruction ordering introduces implementation-specific assumptions about file naming, filesystem sort order, or inscription discovery order. Manifest-defined ordering eliminates these sources of divergence.

**Why V1 remains historical.** V1 JSONL was the original archival representation and remains useful for audit, tooling compatibility, and historical inspection. The V2 binary format supersedes it as the authoritative protocol archive form. The dual verification model bridges these two representations without conflating them.

**Why dual verification.** The binary stream hash verifies the canonical compact native representation. The JSONL reconstruction hash verifies semantic equivalence with the human-readable representation. Together they ensure that compressed binary archives are byte-stable and that their decoded output is deterministically equivalent to the historical dataset.

**Shard size margin.** The 350,000-byte target is set below practical ordinal inscription size limits to allow a safety margin. Implementers should not interpret this as the maximum inscription size.

---

## 15. Test Vectors and Reference Cases

Implementations SHOULD validate against test vectors that exercise at minimum the following cases:

| Case | Description |
|---|---|
| Single-record family stream | One record per family; verify stream length is 33 bytes and JSONL output is one line. |
| Multi-record ordered stream | Multiple records in verified canonical sort order; verify stream hash and JSONL hash. |
| Shard boundary exactly at target | Stream whose last record in a shard fits exactly at 350,000 bytes; verify boundary is placed correctly. |
| Shard boundary just below target | Record sequence whose cumulative size reaches 349,995 bytes for a shard, with next record pushing over target; verify next record opens a new shard. |
| Shard boundary just above target | A single record that would overshoot when added; verify it begins the next shard. |
| Malformed record size | Binary stream whose length is not divisible by 33; verifier MUST reject with length error. |
| Shard hash mismatch | Correct shard bytes but wrong declared hash in manifest; verifier MUST reject. |
| Stream hash mismatch | Correct shards but wrong `stream_hash_sha256` declaration; verifier MUST reject. |
| Reconstruction hash mismatch | Correct stream but wrong `reconstructed_jsonl_hash_sha256` declaration; verifier MUST reject. |

The synthetic two-record test vector defined in `docs/04-verification.md` Section 11 provides reference hash values applicable to the binary stream and JSONL reconstruction verification paths.

---

## 16. Security and Verification Considerations

**Deterministic reconstruction matters.** An archive system whose reconstruction procedure is underspecified may produce correct results on the reference implementation but fail on independent reimplementations. Protocol credibility requires that reconstruction be reproducible by any conformant verifier.

**Byte-domain ambiguity is a protocol risk.** If the hash domain of any commitment is ambiguous — for example, whether the hash covers raw shard bytes or decoded fields, or whether the JSONL hash covers a normalized or unnormalized text form — independent verifiers will compute different values and reach different conclusions about the same archive. This breaks the dual verification model.

**Manifest-defined reconstruction reduces verifier divergence.** The manifest acts as the reconstruction contract. By defining shard order, shard hashes, stream hashes, and JSONL hashes in one place, it provides a single canonical reference that all verifiers can check independently.

**Dual verification is stronger than raw shard hashing alone.** The binary stream hash verifies that shard concatenation produces the expected compact representation. The JSONL reconstruction hash independently verifies that the decoded semantic output matches the canonical dataset. Together they detect both storage corruption and semantic divergence.

**Fail-closed behavior.** Any implementation that continues after a hash mismatch or structural error, rather than failing immediately, risks accepting a corrupted or adversarially modified archive. All consensus-relevant error conditions MUST cause immediate verification failure.

---

## 17. Backward Compatibility

V1 JSONL is a historical archival format. It MUST remain readable and referenceable but is not the canonical protocol dataset form.

V2 is the forward canonical archival format. It is the normative encoding for all new archive production and protocol verification.

Verifiers MAY support both V1 and V2. They MUST NOT treat V1 as having canonical status equivalent to V2, and MUST NOT use V1 reconstruction paths for V2 verification or vice versa.

Manifest version determines reconstruction semantics. A Manifest V2 verifier MUST NOT apply V2 reconstruction semantics to a manifest with a different version number. Future manifest versions MUST use a new explicit `manifest_version` value and define their own reconstruction procedure independently.

Backward-compatible extensions to Manifest V2 MUST NOT alter consensus-relevant reconstruction or verification behavior for existing archives.

---

## 18. Summary

Three properties are implementation-critical for Bitnats Archive V2:

1. **One canonical record encoding.** Every logical record has exactly one valid 33-byte binary representation. Field order, byte widths, and integer encoding are fixed and non-negotiable.

2. **One canonical sharding procedure.** Every canonical family stream has exactly one valid partitioning into shards, determined by the target size and record alignment rule. Shard boundaries are not an implementation choice.

3. **One canonical reconstruction path.** JSONL reconstruction from a validated binary stream has exactly one valid output, determined by the field-rendering rules in Section 10. Byte identity — not semantic equivalence — is the conformance standard.

These three properties, taken together, ensure that any conformant encoder, decoder, or verifier operating on the same input will produce the same binary artifacts, the same shard hashes, the same stream hashes, and the same reconstructed JSONL hash. This is the foundation of the Bitnats verification model.