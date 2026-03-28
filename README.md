# bitnats

<img src="images/icon.svg" width="120" alt="Bitnats-Icon"/>

A protocol for extracting Bitcoin block hash entropy into ordinal artifacts and
provenance-bound units.

---

A **Bitnats Block** is an ordinal artifact representing a Bitcoin block whose
hash contains **N leading hexadecimal zeros**.

These leading zeros represent measurable **hash entropy** produced by Bitcoin
mining. The Bitnats protocol captures this entropy and converts it into
on-chain artifacts and derived units.

Each Bitnats Block is therefore a deterministic representation of a specific
moment in Bitcoin's proof-of-work history.

The artifact's rarity is derived directly from the number of leading
hexadecimal zeros in the block hash and can be reproduced entirely from public
Bitcoin blockchain data.

---

From each Forged Bitnats Block, the protocol allows the extraction of
**Bitnat Bitcoins** - individual units derived from the block's entropy.

Each leading hexadecimal zero may be extracted as one Bitnat Bitcoin.

These units are **not fungible tokens** and they are **not arbitrary tokens**.

Every Bitnat Bitcoin retains the **block provenance** of the Forged Bitnats
Block from which it was derived, making each unit uniquely tied to a specific
Bitcoin block and its entropy signature.

---

Bitnats artifacts are defined exclusively by the canonical dataset and protocol
rules contained in this repository.

## Table of Contents

- [bitnats](#bitnats)
  - [Table of Contents](#table-of-contents)
  - [Core Terminology](#core-terminology)
  - [Protocol Overview](#protocol-overview)
  - [Protocol Primitives](#protocol-primitives)
  - [Artifact Model](#artifact-model)
    - [Base Bitnats Block (i0)](#base-bitnats-block-i0)
    - [Forged Bitnats Block (i1+)](#forged-bitnats-block-i1)
    - [Bitnat Bitcoins](#bitnat-bitcoins)
  - [Eligibility Rules](#eligibility-rules)
  - [Canonical Artifact Rules](#canonical-artifact-rules)
    - [1. Canonical Base Set](#1-canonical-base-set)
    - [2. Base Bitnats Block Artifact Rules](#2-base-bitnats-block-artifact-rules)
    - [3. Forged Bitnats Blocks](#3-forged-bitnats-blocks)
    - [4. Canonical Supply](#4-canonical-supply)
    - [5. Deterministic Verification](#5-deterministic-verification)
    - [6. Canonical Registry](#6-canonical-registry)
    - [7. Non-Canonical Artifacts](#7-non-canonical-artifacts)
  - [Rarity](#rarity)
    - [Trait Distribution](#trait-distribution)
    - [Distribution Notes](#distribution-notes)
    - [Theoretical Maximum (Classical \& Quantum Era)](#theoretical-maximum-classical--quantum-era)
    - [Expected Hash Probability](#expected-hash-probability)
  - [Bitnat Bitcoin Supply](#bitnat-bitcoin-supply)
  - [Collection Size](#collection-size)
  - [Deterministic Reproduction](#deterministic-reproduction)
  - [Data Sources](#data-sources)
  - [Forging](#forging)
  - [Specification](#specification)
  - [Repository Structure](#repository-structure)
  - [Canonical Dataset](#canonical-dataset)
    - [V1 - Historical JSONL](#v1---historical-jsonl)
    - [V2 - Canonical Binary](#v2---canonical-binary)
    - [Dataset Verification](#dataset-verification)
      - [V1 Volume Verification](#v1-volume-verification)
      - [V2 Binary Stream Verification](#v2-binary-stream-verification)
  - [License](#license)
    - [Protocol Usage](#protocol-usage)
    - [Official Artifact Generation Restriction](#official-artifact-generation-restriction)
    - [No Trademark License](#no-trademark-license)
    - [Artwork and Rendering Notice](#artwork-and-rendering-notice)
    - [On-Chain Artifact Notice](#on-chain-artifact-notice)
    - [Additional Warranty Notice](#additional-warranty-notice)
  - [Trademark](#trademark)

## Core Terminology

The Bitnats protocol defines three canonical terms. These definitions are
authoritative and must be applied uniformly across all documentation, APIs,
and implementations. The full canonical reference is in
[docs/08-terminology.md](docs/08-terminology.md).

| Term | Type | Definition |
| --- | --- | --- |
| **bitnat** | atomic unit | A single extracted entropy unit derived from one leading hexadecimal zero in a Bitcoin block hash. Indivisible at the protocol layer. Equivalent to a **Bitnat Bitcoin** at the user-facing layer. |
| **bitnats** | quantity | A count or set of bitnat units. Never a container — always a quantity. |
| **bitnats block** | container | A Bitcoin block interpreted under the Bitnats protocol as containing N bitnats, where N equals the number of leading hexadecimal zeros in the block hash. Corresponds 1:1 with a Bitcoin block. |

> Critical: A block must **never** be referred to as a "bitnat block".
> A block is a container of bitnats, not a single bitnat unit.

## Protocol Overview

The **bitnats protocol** deterministically maps Bitcoin block hash entropy into
ordinal artifacts and derived non-fungible units.

Bitcoin mining produces measurable entropy in the form of block hashes. The
Bitnats protocol captures this entropy and binds it to ordinal artifacts
representing specific Bitcoin blocks.

These artifacts may then be extended through derived inscriptions and used to
extract provenance-bound units tied to the entropy of the original block.

All artifact validity can be reproduced deterministically using only public
Bitcoin blockchain data:

- Bitcoin block headers
- block hashes
- ordinal inscription ordering
- canonical dataset rules

## Protocol Primitives

The **bitnats protocol** defines three core primitives that convert Bitcoin
proof-of-work entropy into artifacts and derived units.

| Primitive | Description |
| --- | --- |
| **Base Bitnats Block** | Canonical ordinal artifact representing a Bitcoin block whose hash contains N leading hexadecimal zeros |
| **Forged Bitnats Block** | Derived artifact reinscribed on the same satoshi as the base artifact |
| **Bitnat Bitcoin** | Non-fungible unit extracted from the entropy of a forged bitnats block |

These primitives transform **Bitcoin block hash entropy** into both
collectible artifacts and provenance-bound units.

Protocol flow:

Bitcoin Block  
      ↓  
Base Bitnats Block (artifact)  
      ↓  
Forged Bitnats Block (derived artifact)  
      ↓  
Bitnat Bitcoin (non-fungible unit)  

Entity identifiers used throughout the specification:

- `entity: base_bitnats_block`
- `entity: forged_bitnats_block`
- `entity: bitnat_bitcoin`

## Artifact Model

Each bitnats block artifact consists of inscriptions placed on the same
satoshi.

### Base Bitnats Block (i0)

The canonical artifact.

Properties:

- plain text block reference
- identifies the Bitcoin block
- first inscription on the sat
- defines the artifact identity

The base artifact establishes the canonical representation of the block.

### Forged Bitnats Block (i1+)

Optional derived artifact.

Properties:

- visual or symbolic representation
- inscribed after the base artifact
- does not alter the canonical base artifact

Forged artifacts may include SVG and other deterministic representations.

### Bitnat Bitcoins

Bitnat Bitcoins are non-fungible and non-arbitrary units derived from the
**leading-zero entropy of forged bitnats blocks**.

Each leading hexadecimal zero may be **extracted as one Bitnat Bitcoin**.

Extraction converts block entropy into transferable units while preserving
provenance to the canonical artifact.

Example:

Block hash: `000000000000000abc123...`

Trait: `0x15`

Extractable supply from a forged bitnats block: `15 Bitnat Bitcoins`

Extraction is only possible from **forged bitnats blocks**.

Base bitnats block artifacts alone cannot produce Bitnat Bitcoins.

## Eligibility Rules

A Bitcoin block qualifies as a **bitnats block** if:

1. The block hash begins with **one or more leading hexadecimal zeros**.
2. The referenced Bitcoin block must already exist on-chain at the time the
   base Bitnats Block artifact is inscribed.
3. Only **one valid Base Bitnats Block artifact may exist per Bitcoin block**.

These rules ensure deterministic artifact identity.

The Bitnats Block sat refers to the canonical satoshi used to inscribe the
base bitnats block artifact for each valid Bitnats Block within the
deterministic Bitnats dataset.

## Canonical Artifact Rules

The Bitnats protocol defines a **single canonical set of Base Bitnats Block
artifacts**.

An artifact may only be considered a **valid Base Bitnats Block** if it
satisfies **all** of the following conditions.

### 1. Canonical Base Set

The canonical Bitnats base set consists of **224,174 valid Base Bitnats
Blocks**.

These blocks are defined deterministically by:

- Bitcoin block hashes containing **N leading hexadecimal zeros**
- inclusion in the canonical Base Bitnats Block dataset
- placement within the published Base Bitnats Block volumes

The dataset contained in this repository defines the **complete base bitnats
block set**.

Inscription IDs not contained within this dataset are **not Base Bitnats
Blocks**.

---

### 2. Base Bitnats Block Artifact Rules

A valid **Base Bitnats Block artifact** must satisfy the following:

1. The referenced Bitcoin block **must have already been mined and confirmed**.
2. The block must exist within the **canonical Bitnats base dataset**.
3. The inscription must be placed on the **first satoshi of the canonical Base
   Bitnats Block sat** defined by the dataset.
4. The base artifact must be the **first inscription (`i0`) on that satoshi
   and the first such inscription to be mined on-chain**.

The Bitnats protocol follows a **first-is-first rule**:

- The earliest mined inscription claiming the canonical Base Bitnats Block sat
  is considered the **valid Base Bitnats Block artifact**.
- Any later inscriptions on the same sat, or competing claims mined later, are
  **not recognized by the protocol**, even if they attempt to replicate the
  artifact.

If any of these conditions are not met, the artifact is **not recognized as a
Base Bitnats Block**.

---

### 3. Forged Bitnats Blocks

Forged Bitnats Block artifacts represent **visual or derived artifacts created from a
valid Base Bitnats Block**.

A Forged Bitnats Block is valid only if:

- it references a valid Base Bitnats Block
- the base artifact exists and satisfies the Base Bitnats Block Artifact Rules
- the forged bitnats block artifact is produced through the official Bitnats
  forging infrastructure

The official forging infrastructure is operated at:

forge.bitnats.io

Artifacts claiming to be forged Bitnats Blocks that are produced outside of this
system are **not canonical Bitnats**.

---

### 4. Canonical Supply

The Bitnats protocol enforces a deterministic supply model:

| Category | Supply Source |
| -------- | -------- |
| Base Bitnats Blocks | 224,174 canonical blocks |
| Forged Bitnats Blocks | derived from base blocks |
| Prospect Bitnats Blocks | issued only via Bitnats protocol infrastructure |

The protocol recognizes **only one canonical lineage of artifacts**.

Forks, replicas, or derivative collections that attempt to mimic Bitnats are
not recognized by the protocol.

---

### 5. Deterministic Verification

A Bitnats Block artifact can be verified deterministically using:

- Bitcoin block hash
- canonical dataset inclusion
- ordinal inscription placement
- inscription index on the sat
- artifact lineage

This allows independent verification without relying on a centralized service.

---

### 6. Canonical Registry

The canonical Bitnats dataset and artifact definitions are published in this
repository and serve as the **reference implementation** for the protocol.

Explorers, marketplaces, and indexers should reference this dataset when
determining whether an artifact is a valid Bitnats Block.

---

### 7. Non-Canonical Artifacts

Artifacts that fail any of the canonical rules above are considered
**non-canonical**.

Examples include:

- inscriptions placed on incorrect sats
- artifacts referencing non-eligible blocks
- artifacts produced outside the official forging infrastructure
- collections attempting to replicate Bitnats without following protocol rules

Such artifacts may exist on-chain but **are not Bitnats**.

## Rarity

Bitnats block rarity is determined by the number of leading hexadecimal zeros
in the Bitcoin block hash.

Trait definition: `0xN`

Where `N` is the number of leading hexadecimal zeros in the block hash.

Example:

`00000000000abc123...`

`-> trait = 0x11`

Trait display format: `⦻NN`

Where `NN` is the number of leading hexadecimal zeros in the block hash.

Example:

`000000000000000abc123...`

`-> ⦻15`

Higher values indicate greater hash entropy and therefore greater rarity.

### Trait Distribution

The following distribution reflects the observed total Bitnats Block supply
through **Bitcoin block 939,413**.

|trait_display|leading_zeros|supply|share|approx probability|category|
|---|---|---|---|---|---|
|⦻08|8|47,419|5.05%|1 in 20|Select|
|⦻09|9|20,178|2.15%|1 in 47|Select|
|⦻10|10|17,377|1.85%|1 in 54|Select|
|⦻11|11|20,715|2.21%|1 in 45|Select|
|⦻12|12|21,694|2.31%|1 in 43|Select|
|⦻13|13|93,292|9.93%|1 in 10|Common|
|⦻14|14|36,098|3.84%|1 in 26|Select|
|⦻15|15|23,966|2.55%|1 in 39|Select|
|⦻16|16|53,307|5.67%|1 in 18|Common|
|⦻17|17|115,939|12.34%|1 in 8|Common|
|⦻18|18|119,830|12.76%|1 in 8|Common|
|⦻19|19|298,931|31.82%|1 in 3|Abundant|
|⦻20|20|66,310|7.06%|1 in 14|Common|
|⦻21|21|4,101|0.44%|1 in 229|Rare|
|⦻22|22|246|0.03%|1 in 3,800|Rare|
|⦻23|23|10|0.001%|1 in 93,941|Rare|
|⦻24|24|2|~0.0002%|1 in 469,706|Rare|
|⦻25|25|0|0%|-|Mythic|

### Distribution Notes

- Bitnats Block traits begin at **⦻08** because the base Bitnats Block dataset is
  derived from blocks meeting the minimum entropy threshold defined by the
  collection.
- The distribution evolves as new Bitcoin blocks are mined.
- Rarity categories are descriptive labels and do **not** affect artifact
  validity.

### Theoretical Maximum (Classical & Quantum Era)

The theoretical maximum rarity for a Bitnats Block hash under classical mining
is `⦻24`, corresponding to a Bitcoin block hash beginning with 24 leading hexadecimal
zeros.

In a quantum computing scenario, the theoretical maximum could extend up to
`⦻32`, corresponding to a block hash beginning with 32 leading hexadecimal
zeros and representing the ultimate upper bound.

### Expected Hash Probability

Expected probability for a Bitcoin block hash to contain N leading hexadecimal zeros:

|leading_zeros|trait_display|expected probability|approx 1 in N|
|-------------|-----|--------------------|---------------------------------------------------|
|8|⦻08|1 / 16⁸|4,294,967,296|
|9|⦻09|1 / 16⁹|68,719,476,736|
|10|⦻10|1 / 16¹⁰|1,099,511,627,776|
|11|⦻11|1 / 16¹¹|17,592,186,044,416|
|12|⦻12|1 / 16¹²|281,474,976,710,656|
|13|⦻13|1 / 16¹³|4,503,599,627,370,496|
|14|⦻14|1 / 16¹⁴|72,057,594,037,927,936|
|15|⦻15|1 / 16¹⁵|1,152,921,504,606,846,976|
|16|⦻16|1 / 16¹⁶|18,446,744,073,709,551,616|
|17|⦻17|1 / 16¹⁷|295,147,905,179,352,825,856|
|18|⦻18|1 / 16¹⁸|4,722,366,482,869,645,213,696|
|19|⦻19|1 / 16¹⁹|75,557,863,725,914,323,419,136|
|20|⦻20|1 / 16²⁰|1,208,925,819,614,629,174,706,176|
|21|⦻21|1 / 16²¹|19,342,813,113,834,066,795,298,816|
|22|⦻22|1 / 16²²|309,485,009,821,345,068,724,781,056|
|23|⦻23|1 / 16²³|4,951,760,157,141,521,099,596,496,896|
|24|⦻24|1 / 16²⁴|79,228,162,514,264,337,593,543,950,336|
|25|⦻25|1 / 16²⁵|1,267,650,600,228,229,401,496,703,205,376|
|26|⦻26|1 / 16²⁶|20,282,409,603,596,470,423,204,851,261,696|
|27|⦻27|1 / 16²⁷|324,518,553,658,426,726,783,156,020,576,256|
|28|⦻28|1 / 16²⁸|5,192,296,858,534,827,628,530,496,329,244,096|
|29|⦻29|1 / 16²⁹|83,076,749,736,557,242,056,088,740,707,905,536|
|30|⦻30|1 / 16³⁰|1,329,227,995,784,915,872,897,419,851,326,488,576|
|31|⦻31|1 / 16³¹|21,267,647,932,558,653,965,558,717,221,223,817,216|
|32|⦻32|1 / 16³²|340,282,366,920,938,463,463,374,607,431,768,211,456|

Each additional leading hexadecimal zero represents a **16x increase in hash
rarity**.

## Bitnat Bitcoin Supply

Bitnat Bitcoins represent the total extractable entropy extracted from forged
bitnats blocks.

Supply as of **Bitcoin block 939,413**:

|base_bitnats_blocks|bitnat_bitcoins|
|---|---|
|939,413|15,379,051|

Total supply grows deterministically as new blocks with leading zeros are
discovered.

## Collection Size

The **Base Bitnats Blocks Dataset (V1)** consists of **224,174 Bitcoin blocks** that satisfy the
protocol eligibility rules defined in this repository.

For deterministic indexing, archival distribution, and marketplace compatibility,
the V1 dataset is partitioned into **nine fixed volumes**.

These volumes are **not separate collections**.  
They are deterministic partitions of the same canonical dataset, created solely
to make the collection easier to index, mirror, and distribute.

Each volume represents a stable subset of eligible blocks derived from the same
protocol rules and block height range.

Together, the nine volumes reconstruct the complete **V1 Base Bitnats Blocks Dataset
of 224,174 blocks**.

Each volume represents a deterministic subset of the dataset.

## Deterministic Reproduction

The bitnats dataset can be independently reproduced.

Procedure:

1. Enumerate all Bitcoin blocks.
2. Extract each block hash.
3. Count leading hexadecimal zeros.
4. Filter blocks with >= 1 leading zero.
5. Apply inscription eligibility rules.

Because the rules depend only on Bitcoin block data, the collection remains
fully verifiable.

## Data Sources

All artifact data derives from publicly verifiable Bitcoin sources:

- Bitcoin block headers
- block hashes
- block heights
- ordinal inscription ordering

No external metadata is required to determine artifact validity.

## Forging

Base Bitnats Blocks may be **reinscribed** with derived visual artifacts
generated from block hash entropy.

Forged artifacts:

- reference the base Bitnats Block
- preserve the canonical artifact identity
- do not alter the base inscription

Forging allows visual representations of the underlying entropy.

## Specification

Formal protocol rules are defined in the `docs/` directory.

- `docs/00-overview.md`: Protocol overview, scope, and reading order.
- `docs/01-core-protocol.md`: Core protocol primitives and invariants.
- `docs/02-artifact-rules.md`: Artifact validity and eligibility rules.
- `docs/03-dataset.md`: Dataset specification covering V1 historical and V2
  canonical binary formats.
- `docs/04-verification.md`: Deterministic verification procedures and test
  vectors.
- `docs/05-specification.md`: Complete normative protocol specification.
- `docs/06-manifest-v2-spec.md`: Manifest V2 formal specification.
- `docs/07-encoding-algorithm.md`: V2 canonical encoding and decoding
  algorithm.
- `docs/08-terminology.md`: Canonical protocol terminology.

`docs/05-specification.md` is normative. All other documents define terms,
rules, and procedures referenced by the normative specification.

## Repository Structure

```text
bitnats/
│
├── README.md
│
├── docs/
│   ├── 00-overview.md
│   ├── 01-core-protocol.md
│   ├── 02-artifact-rules.md
│   ├── 03-dataset.md
│   ├── 04-verification.md
│   ├── 05-specification.md
│   ├── 06-manifest-v2-spec.md
│   ├── 07-encoding-algorithm.md
│   └── 08-terminology.md
│
├── images/
│   └── icon.svg
│   └── donate-qr.svg
│
├── dataset/
│   ├── inscriptions.jsonl
│   ├── inscriptions.jsonl.sha256
│   └── manifest.json
│
├── artifacts/
│   └── releases/
│       └── ...
│
├── volumes/
│   ├── volume1.jsonl
│   ├── volume1.jsonl.sha256
│   ├── volume2.jsonl
│   ├── volume2.jsonl.sha256
│   ├── volume3.jsonl
│   ├── volume3.jsonl.sha256
│   ├── volume4.jsonl
│   ├── volume4.jsonl.sha256
│   ├── volume5.jsonl
│   ├── volume5.jsonl.sha256
│   ├── volume6.jsonl
│   ├── volume6.jsonl.sha256
│   ├── volume7.jsonl
│   ├── volume7.jsonl.sha256
│   ├── volume8.jsonl
│   ├── volume8.jsonl.sha256
│   ├── volume9.jsonl
│   └── volume9.jsonl.sha256
│
└── scripts/
    ├── build-manifest-v2.js
    ├── encode-v2.js
    ├── generate_manifest.js
    ├── parse-v1.js
    ├── run-tests.js
    ├── verify-v2.js
    ├── verify_dataset.js
    └── verify_volumes.js
```

## Canonical Dataset

The Bitnats dataset exists in two formats.

### V1 - Historical JSONL

The original human-readable dataset is defined by:

```text
dataset/inscriptions.jsonl
```

The SHA-256 checksum of the dataset is provided in
`dataset/inscriptions.jsonl.sha256`.

The nine volumes in `volumes/` are deterministic shards derived from this
dataset. Concatenating them in order reproduces the canonical V1 dataset.

### V2 - Canonical Binary

V2 is the forward canonical archive format. It encodes each record as a fixed
33-byte binary entry and partitions records into deterministic shards for
on-chain inscription. Reconstruction and verification are governed by Manifest
V2.

V2 is the normative dataset representation. V1 is preserved for historical
compatibility and independent audit.

### Dataset Verification

#### V1 Volume Verification

Verify the nine volumes against the canonical V1 dataset:

```bash
node scripts/verify_volumes.js
```

This script concatenates the nine volumes in order, computes the SHA-256 hash
of the combined output, and compares it against the committed hash in

`dataset/inscriptions.jsonl.sha256`.

#### V2 Binary Stream Verification

V2 verification requires dual verification as defined in

`docs/04-verification.md`:

1. Reconstruct the native binary stream from V2 shards in manifest-defined
   order.
2. Verify the SHA-256 hash of the reconstructed binary stream against the
   `stream_hash_sha256` commitment in Manifest V2.
3. Decode the binary stream into deterministic JSONL and verify its SHA-256
   hash against the `reconstructed_jsonl_hash_sha256` commitment in Manifest
   V2.

Both checks must pass. See `docs/04-verification.md` for the full verification
algorithm and `docs/07-encoding-algorithm.md` for the canonical encoding and
reconstruction procedure.

## License

The protocol specification, dataset definitions, and documentation contained in
this repository are released under the **MIT License**.

This allows anyone to study, fork, and build software compatible with the
Bitnats protocol.

However, **generation of official Bitnat artifacts is restricted**.

---

### Protocol Usage

The Bitnats protocol specification is open and may be used to build tools,
explorers, indexers, and other compatible software.

Permitted uses include:

- building explorers, galleries, or indexers
- creating software that reads Bitnats datasets
- integrating Bitnats data into applications or games
- developing compatible tooling or infrastructure

---

### Official Artifact Generation Restriction

Bitnat artifacts cannot be freely generated as official Bitnats artifacts. The
canonical Bitnats collection is defined by the Base Bitnats Blocks dataset
contained in this repository (224,174 valid Base Bitnats Blocks).

In protocol terms, canonical claims for a Bitnat artifact require assignment to
the protocol-defined Bitnat sats and compliance with canonical dataset and
inscription-order rules.

Outside of this base set, new official Bitnat artifacts may only be created
through the official Bitnats forging infrastructure operated at
prospect.bitnats.io.

Independent generation of artifacts that claim to be official Bitnats is not
authorized and is not recognized by the protocol.

---

### No Trademark License

No rights are granted to use the names Bitnats, 0x.bitnats, Bitnat Forge, or
any related marks, logos, or branding to imply official affiliation,
endorsement, or canonical status.

Any commercial or official brand usage may require separate permission from
BitGnat.

---

### Artwork and Rendering Notice

Reference artwork and SVG templates in this repository are provided for
demonstration and reference purposes. Official rendering infrastructure may be
operated separately by Bitnats infrastructure.

---

### On-Chain Artifact Notice

Bitnats Block artifacts exist as ordinal inscriptions on the Bitcoin blockchain.
Under protocol terminology, the corresponding canonical inscription placements
are bitnat sats.

Ownership and transfer are determined by the Bitcoin UTXO model and Ordinals
protocol rules. This repository does not control artifacts once inscribed.

---

### Additional Warranty Notice

This project is provided **as-is**, without warranty of any kind. Maintainers
assume no responsibility for software bugs, financial loss, or misuse of the
protocol.

## Trademark

"Bitnats" and the ⦻ Bitnats mark are trademarks of BitGnat.

This repository contains open protocol specifications and datasets under the
MIT License. Use of the Bitnats name, brand, or visual identity in commercial
products or services may require permission.

