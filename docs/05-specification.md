# Bitnats Protocol Specification

Bitnats deterministically maps Bitcoin block hash entropy into ordinal artifacts whose rarity is verifiable from public blockchain data alone.

---

## Status of This Document

This document defines the canonical specification of the Bitnats protocol.

The Bitnats protocol extracts measurable entropy from Bitcoin block hashes and converts that entropy into ordinal artifacts and derived units using deterministic rules.

This specification is:

- Normative for all Bitnats protocol implementations
- Deterministic from public Bitcoin blockchain data
- Reproducible without trusted intermediaries

The canonical dataset and verification procedures are defined in the bitnats repository.

Specification version: 1.0  
Protocol status: Draft

---

## Conventions Used in This Document

The key words MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, MAY, and OPTIONAL are to be interpreted as described in RFC 2119.

All verification procedures defined in this document MUST be reproducible from public blockchain data.

---

## Terminology

| Term | Definition |
|---|---|
| Bitcoin Block | A confirmed block in the Bitcoin blockchain |
| Block Hash | The double SHA-256 hash identifying a Bitcoin block |
| Leading Zero Depth | Number of leading hexadecimal zeros in the block hash |
| Bitnats Block | An ordinal artifact representing a qualifying Bitcoin block |
| Base Bitnats Block | The first inscription (i0) on the canonical Bitnats Block sat |
| Forged Bitnats Block | A derived artifact produced as the second inscription (i1) on the same sat |
| Bitnat Bitcoin | A discrete unit derived from the entropy depth of a Forged Bitnats Block |
| Canonical Dataset | Deterministic dataset of all valid Bitnats Blocks |

---

## Entropy Notation

Bitnats uses the following entropy operator:

```
⦻N
```

Where $N$ is the number of leading hexadecimal zeros in a Bitcoin block hash.

Example: a block hash with 18 leading hexadecimal zeros has entropy depth ⦻18.

Each additional leading hexadecimal zero represents a 16× increase in rarity within the SHA-256 search space.

---

## 1. Overview

Bitnats identifies Bitcoin blocks that contain leading hexadecimal zeros in their block hash. These events are rare outcomes in Bitcoin's proof-of-work search space.

The protocol:

- indexes eligible blocks using deterministic rules
- converts those events into ordinal artifacts bound to Bitcoin transaction history
- preserves entropy provenance on-chain through inscription ordering rules
- does not modify Bitcoin consensus

Artifacts represent deterministic moments in Bitcoin proof-of-work history. Their rarity is not assigned; it is derived from public chain data.

---

## 2. Protocol Scope

The Bitnats protocol defines:

- eligibility rules for Bitnats Blocks
- deterministic rarity derived from hash entropy
- canonical dataset construction
- artifact validation rules
- deterministic dataset verification

The Bitnats protocol does not define:

- marketplaces
- wallets
- user interfaces
- pricing mechanisms
- indexing strategies

Implementations MAY build systems around Bitnats artifacts, but those systems are outside the scope of this specification.

---

## 3. Protocol Primitives

The protocol is built from the following minimal primitives:

- Bitcoin block hash
- Leading hexadecimal zero count
- Ordinal inscription index
- Canonical dataset
- Deterministic dataset shards

---

## 4. Bitnats Block Definition

A Bitcoin block qualifies as a Bitnats Block if all of the following conditions are satisfied:

1. The block is confirmed in the canonical Bitcoin blockchain.
2. The block hash contains $N \ge 1$ leading hexadecimal zeros.
3. The block exists within the canonical Bitnats dataset.

---

## 5. Base Bitnats Dataset

The canonical dataset is defined at:

```
dataset/inscriptions.jsonl
```

The dataset contains all valid Bitnat Blocks.

Properties:

- Deterministic record ordering
- Reproducible from public Bitcoin blockchain data
- Canonical reference for artifact eligibility

---

## 6. Artifact Eligibility Rules

### Base Bitnats Block Artifact

A valid Base Bitnats Block artifact MUST satisfy all of the following conditions:

1. The referenced Bitcoin block MUST already be mined and confirmed.
2. The block MUST exist within the canonical Bitnats dataset.
3. The inscription MUST be placed on the canonical Bitnat Block sat defined by the dataset.
4. The artifact MUST be the first inscription (i0) on that sat.

The first-is-first rule applies: the earliest mined inscription satisfying all four conditions is the valid Base Bitnats Block artifact for that block. Any later inscription claiming the same sat MUST NOT be recognized.

If any condition is violated, the artifact MUST be considered invalid.

### Forged Bitnats Block Artifact

A valid Forged Bitnat Block artifact MUST satisfy all of the following conditions:

1. The inscription MUST be placed on the same sat as a valid Base Bitnat Block artifact.
2. The inscription MUST be the second inscription (i1) on that sat.
3. The referenced Base Bitnats Block MUST be valid.

---

## 7. Canonical Dataset Encoding

### Dataset Versioning

Bitnats defines two dataset formats.

**Version 1 — Historical JSONL**

```
dataset/inscriptions.jsonl
```

Human-readable canonical dataset. Used for archival reference, deterministic reconstruction, and compatibility with early tooling.

V1 MUST NOT be considered the canonical protocol dataset format.

**Version 2 — Compact Binary Canonical Stream**

Version 2 is the canonical forward dataset format.

Properties:

- Fixed-width records
- Minimal encoding overhead
- Deterministic reconstruction of JSONL
- Optimized for on-chain inscription

### Binary Record Format

Each record MUST be exactly 33 bytes:

```
[32 bytes]  inscription transaction identifier (txid)
[ 1 byte ]  inscription index
```

The inscription index byte SHALL be interpreted as an unsigned 8-bit integer:

- `0x00` corresponds to `i0` (Base Bitnats Block artifacts)
- `0x01` corresponds to `i1` (Forged Bitnats Block artifacts)

Rarity SHALL be derived from the originating Bitcoin block hash. It MUST NOT be encoded in the V2 record body.

Unsupported inscription index values MUST cause verification failure.

### Dataset Streams

Version 2 defines the following family-separated canonical binary streams:

| Stream | Artifact Family | Index Byte |
|---|---|---|
| Base stream | Base Bitnats Block artifacts | `0x00` |
| Forged stream | Forged Bitnat Block artifacts | `0x01` |

Streams MUST be stored and verified independently.

### Dataset Sharding

Binary streams MUST be split into shards suitable for on-chain inscription.

Shard constraints:

- Target size: approximately 350 kB
- MUST remain below 400 kB

This constraint ensures compatibility with ordinal inscription tooling.

### Dataset Manifest

The dataset is anchored by Manifest V2.

Manifest V2 defines:

- Dataset version
- Stream identifier
- Shard ordering
- Per-shard SHA-256 hashes
- Deterministic reconstruction rules
- Canonical binary dataset hash

Manifest V2 defines reconstruction logic. It MUST NOT only store file hashes.

### Dual Verification

Version 2 datasets require two independent verification checks. Both MUST succeed.

1. SHA-256 of the reconstructed binary stream MUST match the manifest binary hash.
2. SHA-256 of the deterministically reconstructed JSONL dataset MUST match the V1 canonical dataset hash.

JSONL reconstruction MUST produce one record per V2 binary record, in the following form, followed by a single LF byte (`0x0a`):

```text
{"id":"<lowercase-hex-txid>i<decimal-index>"}
```

---

## 8. Entropy Extraction

Each leading hexadecimal zero in the originating block hash represents one unit of extractable entropy.

For a block with entropy depth ⦻N, the maximum number of derivable Bitnat Bitcoins is $N$.

---

## 9. Bitnat Bitcoin Units

Bitnat Bitcoins:

- are derived from the entropy depth of a valid Forged Bitnat Block
- are provenance-bound to the originating Bitcoin block
- MUST NOT be derived from a Base Bitnat Block artifact alone
- MUST NOT exceed $N$ units for a block with entropy depth ⦻N

---

## 10. Deterministic Verification

### Verification Inputs

- Bitcoin block hash for the claimed block
- Canonical dataset (`dataset/inscriptions.jsonl`)
- Ordinal inscription ordering on the canonical sat

### Canonical Verification Algorithm

```text
procedure VERIFY_BITNAT_BLOCK(block_height, block_hash, inscription):

    assert block_height is confirmed in the canonical Bitcoin blockchain

    zeros <- count_leading_hex_zeros(block_hash)

    if zeros < 1:
        return INVALID

    dataset_entry <- lookup(block_height, canonical_dataset)

    if dataset_entry is NOT FOUND:
        return INVALID

    if dataset_entry.hash != block_hash:
        return INVALID

    if inscription.sat != dataset_entry.canonical_sat:
        return INVALID

    if inscription.index != 0:
        return INVALID

    return VALID
```

### Dataset V2 Verification Algorithm

```text
procedure VERIFY_DATASET_V2(manifest, shards, canonical_jsonl_hash):

    ordered_shards <- order_by_manifest(manifest, shards)

    for each shard in ordered_shards:
        if SHA256(shard.bytes) != manifest.shard_hash[shard.index]:
            return FAILURE
        if length(shard.bytes) mod 33 != 0:
            return FAILURE

    binary_stream <- concatenate(ordered_shards)
    binary_hash <- SHA256(binary_stream)

    if binary_hash != manifest.binary_hash:
        return FAILURE

    records <- decode_33_byte_records(binary_stream)
    jsonl_dataset <- ""

    for each record in records:
        txid_hex <- lowercase_hex(record.txid)
        index_dec <- decimal(record.inscription_index)
        jsonl_dataset += '{"id":"' + txid_hex + 'i' + index_dec + '"}' + LF

    jsonl_hash <- SHA256(jsonl_dataset)

    if jsonl_hash != canonical_jsonl_hash:
        return FAILURE

    return SUCCESS
```

---

## 11. Security Considerations

**Dataset determinism.** The canonical dataset is constructed from public Bitcoin block hashes using deterministic rules. Any independent implementation replicating these rules produces the same dataset.

**Artifact forgery resistance.** The first-is-first inscription rule and the canonical sat constraint together prevent any party from registering a competing Base Bitnats Block artifact after a valid one has been mined.

**Reliance on canonical blockchain history.** Artifact validity depends on confirmed Bitcoin blockchain data. Any claim referencing an unconfirmed or non-existent block MUST be rejected.

**Proof-of-work entropy immutability.** Block hash entropy is produced by Bitcoin mining and is fixed at the time a block is mined. It cannot be synthesized or altered without invalidating the block.

**Dataset integrity.** The V2 dataset is anchored to Manifest V2 via SHA-256. Any modification to shard contents, shard ordering, or record encoding changes the hash and MUST be detectable by compliant implementations.

---

## 11. Implementation Notes

Reference files:

| Path | Purpose |
|---|---|
| `dataset/inscriptions.jsonl` | V1 canonical JSONL dataset |
| `dataset/inscriptions.jsonl.sha256` | V1 dataset SHA-256 commitment |
| `dataset/manifest.json` | Manifest (current V1 format) |
| `volumes/volume1.jsonl` – `volumes/volume9.jsonl` | V1 reconstruction shards |
| `scripts/verify_volumes.js` | V1 reconstruction verification |
| `scripts/generate_manifest.js` | Manifest generation tooling |

Implementations verifying V1 MUST reconstruct `dataset/inscriptions.jsonl` by concatenating `volumes/volume1.jsonl` through `volumes/volume9.jsonl` in ascending numeric order and comparing the SHA-256 of the result against `dataset/inscriptions.jsonl.sha256`.

The canonical V1 dataset SHA-256:

```
0de81f66e1f06cbb40f9c4e012125d8bf739fb4fc05a0aacc33b97fcc1fbf3e4
```