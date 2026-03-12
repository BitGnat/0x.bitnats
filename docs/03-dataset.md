# Bitnats Dataset Specification

## 1. Consensus Definition

The Bitnats dataset defines the complete set of Base Bitnats Block artifacts recognized by the protocol.

The dataset exists in two formats:

- **V1** — Historical JSONL archive
- **V2** — Canonical compact binary stream

The V2 compact binary format is the canonical dataset representation used by the protocol.

The V1 JSONL dataset exists only as a historical archive and reference representation.

Any implementation claiming Bitnats compatibility MUST correctly parse and verify the V2 binary dataset format.

## 2. Dataset Scope

The dataset contains entries representing valid Base Bitnats Blocks derived from Bitcoin block hashes. Each entry corresponds to a Bitcoin block whose hash contains $N$ leading hexadecimal zeros.

Each dataset entry maps deterministically to a Base Bitnats Block sat and its associated ordinal artifact.

Normative constraints:

- Entries MUST correspond to previously mined Bitcoin blocks.
- Future blocks MUST NOT be included.
- Duplicate entries MUST NOT exist.

## 3. Dataset Versions

### V1 — Historical JSONL Dataset

File location:

```
dataset/inscriptions.jsonl
```

Characteristics:

- Newline-delimited JSON (JSONL)
- Human-readable archival format
- Deterministic record ordering

This dataset was used during early development and inscription planning.

V1 MUST NOT be considered the canonical protocol dataset format.

### V2 — Canonical Binary Dataset

The canonical dataset format is a compact deterministic binary stream composed of fixed-length 33-byte records.

All Bitnats protocol implementations MUST interpret the dataset as a sequence of 33-byte records.

## 4. Binary Record Format (V2)

Each record in the V2 binary stream is exactly 33 bytes:

```
[32 bytes]  inscription identifier (txid)
[ 1 byte ]  rarity value (leading zero count)
```

- The inscription identifier corresponds to the Base Bitnats Block artifact.
- The rarity value represents the count of leading hexadecimal zeros in the originating Bitcoin block hash.

Normative constraints:

- Records MUST be exactly 33 bytes.
- Records MUST appear in deterministic canonical order.
- No padding or metadata is permitted between or after records.

## 5. Dataset Sharding

The canonical V2 binary dataset is split into deterministic shards.

Shard size target: ≤ 350 kB

This limit ensures compatibility with ordinal inscription size constraints.

Shards are stored as separate binary files:

```
dataset_v2/
	shard1.bin
	shard2.bin
	shard3.bin
	...
```

Normative constraints:

- Shards MUST preserve canonical record ordering.
- Shards MUST concatenate without modification.
- Shards MUST reconstruct the full binary dataset exactly.

Reconstruction rule:

```
shard1 || shard2 || ... || shardN = canonical binary dataset
```

## 6. Dual Verification Model

The Bitnats dataset supports two independent verification paths. Both paths MUST succeed for the dataset to be considered valid.

### Binary Stream Verification

The canonical V2 dataset commitment is computed as SHA-256 over the full reconstructed binary stream:

```
SHA-256(shard1 || shard2 || ... || shardN)
```

This hash represents the canonical protocol dataset commitment.

### Deterministic JSON Reconstruction

The V2 binary dataset MUST deterministically reconstruct the historical JSONL dataset at:

```
dataset/inscriptions.jsonl
```

The reconstructed JSONL MUST match the archived V1 dataset hash.

This verification path ensures historical transparency, reproducibility, and independent auditability.

## 7. Manifest Definition (V2)

The Bitnats manifest defines:

- Dataset version
- Per-shard SHA-256 hashes
- Reconstruction rules
- Canonical binary dataset hash

The manifest MUST define the deterministic reconstruction procedure for the V2 dataset.

The manifest is inscribed on Bitcoin and serves as the protocol's on-chain commitment to the canonical dataset state.

## 8. Deterministic Reconstruction

The following procedure MUST be used to reconstruct and verify the canonical dataset.

**Step 1.** Retrieve all dataset shards.

**Step 2.** Concatenate shards in ascending numeric order:

```sh
cat shard*.bin > dataset.bin
```

**Step 3.** Compute the SHA-256 hash of the reconstructed binary stream:

```sh
sha256sum dataset.bin
```

**Step 4.** Compare the computed hash against the canonical dataset hash published in the manifest.

If the hash matches, the dataset MUST be considered valid.

**Step 5 (optional).** Reconstruct the JSONL dataset from the binary stream and compare its SHA-256 hash against the published V1 archive hash to confirm dual-verification.

## 9. On-Chain Dataset Archival

Dataset shards are inscribed on Bitcoin as children of the Bitnats parent inscription.

This provides:

- Permanent archival of the canonical dataset
- Censorship resistance
- Independent dataset recovery without reliance on hosted infrastructure

The repository and the Bitcoin blockchain together form two independently verifiable mirrors of the canonical dataset.