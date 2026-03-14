# Bitnats Verification Specification

## 1. Verification Guarantees

The Bitnats dataset is deterministic and reproducible from Bitcoin consensus data.

Any verifier implementing the procedures defined in this document MUST produce the canonical dataset hash committed by the repository or by Manifest V2, as applicable.

Deviation from the defined reconstruction rules MUST result in verification failure.

Verification MUST depend only on Bitcoin blockchain data, deterministic dataset construction rules, and SHA-256 hashing. No trusted intermediary is required.

## 2. Dataset Architecture

Bitnats defines two dataset versions.

### Dataset V1 - Historical JSONL Dataset

Defined by:

```text
dataset/inscriptions.jsonl
```

Characteristics:

- JSONL records
- Canonical ordering
- Historical dataset representation
- Used by early infrastructure

This dataset is preserved for backwards compatibility.

### Dataset V2 - Canonical Binary Dataset

Dataset V2 is the forward canonical dataset representation.

Properties:

- Deterministic binary encoding
- Fixed-size records
- Optimized for on-chain storage
- Shardable into small inscriptions

Each record is 33 bytes:

```text
32 bytes  txid
1 byte    inscription index
```

The inscription index byte SHALL be interpreted as an unsigned 8-bit integer. `0x00` corresponds to `i0`. `0x01` corresponds to `i1`.

Example identifier representation:

```text
<txid>i0
```

This binary dataset is the canonical protocol dataset moving forward.

## 3. Dataset Streams

Dataset V2 supports family-separated streams with fixed, case-sensitive identifiers:

- `base`
- `prospect`
- `forged`

Each family defines an independent ordered stream and MUST be reconstructed independently.

### Base Stream

The Base Stream represents Base Bitnats Block artifacts.

Identifier form:

```text
<txid>i0
```

### Prospect Stream

The Prospect Stream represents Prospect artifacts.

Identifier form:

```text
<txid>i<decimal-index>
```

### Forged Stream

The Forged Stream represents Forged Bitnats artifacts derived from base blocks.

Identifier form:

```text
<txid>i1
```

These streams MUST be stored and verified independently under the same reconstruction and verification rules. Implementations MUST NOT mix families during reconstruction.

## 4. Manifest V2

Dataset reconstruction is defined by Manifest V2.

Manifest V2 MUST define:

- Dataset version
- Family declarations (`base`, `prospect`, `forged`)
- Shard ordering
- Per-shard SHA-256 hashes
- Reconstruction rules
- Per-family canonical binary stream hashes
- Per-family reconstructed JSONL hashes

The manifest MUST NOT only store hashes.

It MUST define the deterministic procedure for reconstructing the canonical dataset.

Manifest V2 therefore acts as the protocol reconstruction contract.

## 5. Deterministic Dataset Reconstruction

A verifier MUST be able to reconstruct each family stream deterministically from the following inputs:

- Bitcoin blockchain data
- Bitnats protocol rules
- Dataset shards
- Manifest V2
- Selected family identifier (`base`, `prospect`, or `forged`)

Reconstruction procedure:

1. Load Manifest V2.
2. Select the target family descriptor from the manifest.
3. Retrieve all shards referenced by that family descriptor.
4. Verify each shard SHA-256 hash against the family descriptor.
5. Concatenate shards in manifest-defined family order.
6. Verify that the reconstructed binary stream length is divisible by 33.
7. Decode the stream as a sequence of 33-byte records.
8. Reconstruct the deterministic JSONL representation.
9. Compare the binary stream hash and reconstructed JSONL hash against the family commitments in the manifest.

No trusted indexers are required.

## 6. Dataset Shard Rules

Dataset V2 shards MUST follow these constraints:

- Target shard size: approximately 350 kB
- Deterministic record ordering
- Complete records only; partial records MUST NOT appear in any shard

Shard ordering MUST follow the manifest specification.

Each shard MAY be smaller than the target size. No shard MAY alter record order during reconstruction.

## 7. Dual Verification Model

Dataset V2 verification requires two independent cryptographic checks.

### Binary Stream Verification

The verifier MUST compute SHA-256 over the full reconstructed binary stream.

This check verifies binary integrity.

### Deterministic JSONL Reconstruction Verification

The binary dataset MUST be convertible into a deterministic JSONL representation.

For each 33-byte record, the verifier MUST emit exactly one JSON object in the following form, followed by a single LF byte (`0x0a`):

```text
{"id":"<lowercase-hex-txid>i<decimal-index>"}
```

The reconstructed JSONL dataset MUST produce the expected canonical SHA-256 hash for the selected family.

For `base`, the reconstructed JSONL hash MUST match the canonical V1 dataset hash. For `prospect` and `forged`, the reconstructed JSONL hash MUST match the corresponding per-family commitment in Manifest V2.

This dual verification ensures:

- Binary integrity
- Semantic equivalence with the historical dataset

## 8. Verification Algorithm

```text
Algorithm VerifyDatasetV2

Input:
  manifest
	family
	shards

Procedure:
	family_desc <- manifest.families[family]
	if family_desc is MISSING
			return FAILURE

	ordered_shards <- order_by_manifest_family(family_desc, shards)

  for each shard in ordered_shards:
			if SHA256(shard.bytes) != family_desc.shards[shard.index].sha256
					return FAILURE

			if length(shard.bytes) mod 33 != 0
					return FAILURE

  binary_stream <- concatenate(ordered_shards)
  binary_hash <- SHA256(binary_stream)

  if binary_hash != family_desc.stream_hash_sha256
			return FAILURE

  records <- decode_33_byte_records(binary_stream)
  jsonl_dataset <- ""

  for each record in records:
			txid_hex <- lowercase_hex(record.txid)
			index_dec <- decimal(record.inscription_index)
			jsonl_dataset <- jsonl_dataset || '{"id":"' || txid_hex || 'i' || index_dec || '"}' || LF

  jsonl_hash <- SHA256(jsonl_dataset)

  if jsonl_hash != family_desc.reconstructed_jsonl_hash_sha256
			return FAILURE

  return SUCCESS
```

## 9. Reference Verification Procedure

### V1 Reference Procedure

Reconstruct the historical JSONL dataset in canonical order:

```sh
cat volumes/volume1.jsonl \
	volumes/volume2.jsonl \
	volumes/volume3.jsonl \
	volumes/volume4.jsonl \
	volumes/volume5.jsonl \
	volumes/volume6.jsonl \
	volumes/volume7.jsonl \
	volumes/volume8.jsonl \
	volumes/volume9.jsonl > reconstructed-inscriptions.jsonl
sha256sum reconstructed-inscriptions.jsonl
```

The resulting hash MUST match the value committed by `dataset/inscriptions.jsonl.sha256` and `dataset/manifest.json`.

### V2 Reference Procedure

For a selected family (`base`, `prospect`, or `forged`), reconstruct the canonical binary stream in manifest-defined shard order:

```sh
cat shards/*.bin > dataset.bin
sha256sum dataset.bin
```

Then reconstruct the deterministic JSONL representation and verify that its SHA-256 hash matches the canonical V1 dataset hash.

For `base`, the reconstructed JSONL hash MUST match the canonical V1 dataset hash. For `prospect` and `forged`, the reconstructed JSONL hash MUST match the corresponding per-family commitment in Manifest V2.

## 10. Verification Scripts

Verification tooling SHOULD expose deterministic entry points equivalent to the following:

- `scripts/verify-v2.js verify` for Manifest V2 binary and reconstructed JSONL verification
- `scripts/verify_volumes.js` for unified V1-only, V2-only, or V1+V2 verification
- `scripts/release-v2.js verify-release` for release-payload verification against finalized canonical manifest artifacts

Legacy compatibility note:

- `scripts/verify_dataset.js` is maintained as a compatibility wrapper and delegates to `scripts/verify_volumes.js --mode both` unless an explicit mode is provided.

All verification scripts MUST produce deterministic success or failure results for identical inputs.

## 11. Test Vector

The following synthetic test vector defines two 33-byte records split into two shards.

### Example Shard Set

```text
shard1.bin = 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f00
shard2.bin = 202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f01
```

Reconstructed binary stream:

```text
000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f00202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f01
```

Expected binary dataset SHA-256:

```text
2141c595bbf10b6716733e64d1f049661412c4c5ca3579502cb098bee98aa073
```

Expected reconstructed JSONL dataset:

```text
{"id":"000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1fi0"}
{"id":"202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3fi1"}
```

The JSONL test vector includes a trailing LF after each line, including the final line.

Expected reconstructed JSONL SHA-256:

```text
803b00fcabb122c5afafb2ad3fff4991f7d8e733c7d2ef3299e94ccbfbb4805b
```

## 12. Failure Conditions

Verification MUST fail if any of the following conditions occur:

- Shard ordering mismatch
- Invalid or missing family descriptor
- Shard hash mismatch
- Binary stream hash mismatch
- Reconstructed JSONL hash mismatch
- Family stream mixing during reconstruction
- Dataset reconstruction differs from canonical ordering
- A decoded block violates Bitnats eligibility rules
- A referenced block was not yet mined
- A base artifact is not the first inscription (`i0`) on the defined sat
- A record length or shard length is not divisible by 33
- A record contains an unsupported inscription index

Any of these conditions indicates dataset corruption or rule violation.

## 13. Trust Model

Bitnats verification relies only on:

- Bitcoin consensus rules
- Deterministic dataset generation
- SHA-256 cryptographic hashing

No trusted intermediaries are required.

## 14. Security Model

Integrity is secured by:

- Bitcoin proof-of-work history
- Deterministic dataset construction
- Cryptographic dataset hashing

Any modification to shard contents, shard ordering, record encoding, or reconstructed JSONL output produces a different hash and MUST be detectable by compliant implementations.