# 0x.bitnats
<img src="images/icon.svg" width="120" />

A protocol for extracting Bitcoin block hash entropy into ordinal artifacts and provenance-bound units.

---

A **Bitnats Block** is an ordinal artifact representing a Bitcoin block whose
hash contains **N leading hexadecimal zeros**.

These leading zeros represent measurable **hash entropy** produced by
Bitcoin mining. The Bitnats protocol captures this entropy and converts it
into on-chain artifacts and derived units.

Each Bitnat Block is therefore a deterministic representation of a
specific moment in Bitcoin’s proof-of-work history.

The artifact’s rarity is derived directly from the number of leading
hexadecimal zeros in the block hash and can be reproduced entirely from
public Bitcoin blockchain data.

---

From each Forged Bitnats Block, the protocol allows the extraction of
**Bitnat Bitcoins** — individual units derived from the block's entropy.

Each leading hexadecimal zero may be minted as one Bitnat Bitcoin.

These units are **not fungible tokens**.

Every Bitnat Bitcoin retains the **block provenance** of the Forged Bitnats Block
from which it was derived, making each unit uniquely tied to a specific
Bitcoin block and its entropy signature.

---

Bitnats artifacts are defined exclusively by the canonical dataset and
protocol rules contained in this repository.

## Table of Contents

- [Protocol Overview](#protocol-overview)
- [Protocol Primitives](#protocol-primitives)
- [Artifact Model](#artifact-model)
- [Eligibility Rules](#eligibility-rules)
- [Canonical Artifact Rules](#canonical-artifact-rules)
- [Rarity](#rarity)
  - [Trait Distribution](#trait-distribution)
  - [Distribution Notes](#distribution-notes)
  - [Theoretical Maximum (Classical & Quantum Era)](#theoretical-maximum-classical--quantum-era)
  - [Expected Hash Probability](#expected-hash-probability)
- [Bitnat Bitcoin Supply](#bitnat-bitcoin-supply)
- [Collection Size](#collection-size)
- [Deterministic Reproduction](#deterministic-reproduction)
- [Data Sources](#data-sources)
- [Forging](#forging)
- [Specification](#specification)
- [Repository Structure](#repository-structure)
- [License](#license)
- [Trademark](#trademark)
- [Support the Bitnats Project](#support-the-bitnats-project)


## Protocol Overview

The **0x.bitnats protocol** deterministically maps Bitcoin block hash
entropy into ordinal artifacts and derived non-fungible units.

Bitcoin mining produces measurable entropy in the form of block hashes.
The Bitnats protocol captures this entropy and binds it to ordinal
artifacts representing specific Bitcoin blocks.

These artifacts may then be extended through derived inscriptions and
used to mint provenance-bound units tied to the entropy of the original
block.

All artifact validity can be reproduced deterministically using only
public Bitcoin blockchain data:

- Bitcoin block headers
- block hashes
- ordinal inscription ordering
- canonical dataset rules

## Protocol Primitives

The **0x.bitnats protocol** defines three core primitives that convert
Bitcoin proof-of-work entropy into artifacts and derived units.

| Primitive | Description |
|---|---|
| **Base Bitnats Block** | Canonical ordinal artifact representing a Bitcoin block whose hash contains N leading hexadecimal zeros |
| **Forged Bitnats Block** | Derived artifact reinscribed on the same satoshi as the base artifact |
| **Bitnat Bitcoin** | Non-fungible unit minted from the entropy of a forged bitnats block |

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

entity: base_bitnats_block  
entity: forged_bitnats_block  
entity: bitnat_bitcoin  

## Artifact Model

Each bitnats block artifact consists of inscriptions placed on the **same satoshi**.

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

Bitnat Bitcoins are non-fungible units derived from the **leading-zero entropy of forged bitnats blocks**.

Each leading hexadecimal zero may be **minted as one Bitnat Bitcoin**.

Minting converts block entropy into transferable units while preserving provenance to the canonical artifact.

Example:

Block hash: 000000000000000abc123...

Trait:

⦻15

Mintable supply from a forged bitnats block:

15 Bitnat Bitcoins

Minting is only possible from **forged bitnat blocks**.

Base bitnats block artifacts alone cannot produce Bitnat Bitcoins.

## Eligibility Rules

A Bitcoin block qualifies as a **bitnats block** if:

1. The block hash begins with **one or more leading hexadecimal zeros**
2. The referenced Bitcoin block must already exist on-chain at the time the base Bitnat Block artifact is inscribed.
3. The base Bitnat Block artifact must be the **first inscription (i0)** on the designated Base Bitnat Block sat
4. Only **one valid Base Bitnat Block artifact may exist per Bitcoin block**

These rules ensure deterministic artifact identity.

The Bitnats Block sat refers to the canonical satoshi used to
inscribe the base bitnats block artifact for each valid Bitnat Block within the
deterministic Bitnats dataset.

## Canonical Artifact Rules

The Bitnats protocol defines a **single canonical set of Base Bitnats Block artifacts**.

An artifact may only be considered a **valid Base Bitnats Block** if it satisfies **all**
of the following conditions.

### 1. Canonical Base Set

The canonical Bitnats base set consists of **224,175 valid Base Bitnats Blocks**.

These blocks are defined deterministically by:

- Bitcoin block hashes containing **N leading hexadecimal zeros**
- Inclusion in the canonical Base Bitnats Block dataset
- Placement within the published Base Bitnats Block volumes

The dataset contained in this repository defines the **complete base bitnats block set**.

Inscriptions not contained within this dataset are **not Base Bitnats Blocks**.

---

### 2. Base Bitnats Block Artifact Rules

A valid **Base Bitnat Block artifact** must satisfy the following:

1. The referenced Bitcoin block must already be **mined and confirmed**.
2. The block must exist within the **canonical Bitnats base dataset**.
3. The inscription must be placed on the **first satoshi of the canonical
Base Bitnat Block sat** defined by the dataset.
4. The base artifact must be the **first inscription (`i0`) on that sat**.

If any of these conditions are not met, the artifact is **not recognized as a
Base Bitnats Block**.

---

### 3. Forged Bitnats Blocks

Forged Bitnat artifacts represent **visual or derived artifacts created from a
valid Base Bitnats Block**.

A Forged Bitnats Block is valid only if:

- it references a valid Base Bitnats Block
- the base artifact exists and satisfies the Base Bitnats Block Artifact Rules
- the forged bitnats block artifact is produced through the official Bitnats forging
infrastructure

The official forging infrastructure is operated at:

forge.bitnats.io

Artifacts claiming to be forged Bitnats that are produced outside of this
system are **not canonical Bitnats**.

---

### 4. Canonical Supply

The Bitnats protocol enforces a deterministic supply model:

| Category | Supply Source |
|--------|--------|
| Base Bitnat Blocks | 225,000 canonical blocks |
| Forged Bitnats | derived from base blocks |
| New Bitnat Blocks | issued only via Bitnats protocol infrastructure |

The protocol recognizes **only one canonical lineage of artifacts**.

Forks, replicas, or derivative collections that attempt to mimic Bitnats are
not recognized by the protocol.

---

### 5. Deterministic Verification

A Bitnat artifact can be verified deterministically using:

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
determining whether an artifact is a valid Bitnat.

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

Bitnats block rarity is determined by the number of leading hexadecimal
zeros in the Bitcoin block hash.

Trait definition:

0xN

Where:

N = number of leading hexadecimal zeros in the block hash

Example:

00000000000abc123...
→ trait = 0x11

Trait display format:

⦻NN

Where:

NN = number of leading hexadecimal zeros in the block hash

Example:

000000000000000abc123...
→ ⦻15

Higher values indicate greater hash entropy and therefore greater rarity.

### Trait Distribution

The following distribution reflects the observed bitnat block supply through **Bitcoin block 939,413**.

| trait | leading_zeros | supply | share | approx probability | category |
|------|------|------|------|------|------|
| ⦻08 | 8 | 47,419 | 5.05% | 1 in 20 | Select |
| ⦻09 | 9 | 20,178 | 2.15% | 1 in 47 | Select |
| ⦻10 | 10 | 17,377 | 1.85% | 1 in 54 | Select |
| ⦻11 | 11 | 20,715 | 2.21% | 1 in 45 | Select |
| ⦻12 | 12 | 21,694 | 2.31% | 1 in 43 | Select |
| ⦻13 | 13 | 93,292 | 9.93% | 1 in 10 | Common |
| ⦻14 | 14 | 36,098 | 3.84% | 1 in 26 | Select |
| ⦻15 | 15 | 23,966 | 2.55% | 1 in 39 | Select |
| ⦻16 | 16 | 53,307 | 5.67% | 1 in 18 | Common |
| ⦻17 | 17 | 115,939 | 12.34% | 1 in 8 | Common |
| ⦻18 | 18 | 119,830 | 12.76% | 1 in 8 | Common |
| ⦻19 | 19 | 298,931 | 31.82% | 1 in 3 | Abundant |
| ⦻20 | 20 | 66,310 | 7.06% | 1 in 14 | Common |
| ⦻21 | 21 | 4,101 | 0.44% | 1 in 229 | Rare |
| ⦻22 | 22 | 246 | 0.03% | 1 in 3,800 | Rare |
| ⦻23 | 23 | 10 | 0.001% | 1 in 93,941 | Rare |
| ⦻24 | 24 | 2 | ~0.0002% | 1 in 469,706 | Rare |
| ⦻25 | 25 | 0 | 0% | — | Mythic |

### Distribution Notes

- Bitnat traits begin at **⦻08** because the base bitnats block dataset is derived from blocks meeting the minimum entropy threshold defined by the collection.
- The distribution evolves as new Bitcoin blocks are mined.
- Rarity categories are descriptive labels and do **not** affect artifact validity.

### Theoretical Maximum (Classical & Quantum Era)

The theoretical maximum rarity for a Bitcoin block hash under classical mining is:

⦻24 – corresponding to a block hash beginning with 24 leading hexadecimal zeros.

In a quantum computing scenario, the theoretical maximum could extend up to:

⦻32 – corresponding to a block hash beginning with 32 leading hexadecimal zeros, representing the ultimate upper bound.

### Expected Hash Probability

Expected probability for a Bitcoin block hash to contain N leading hexadecimal zeros:

| leading_zeros | trait | expected probability | approx 1 in N                                       |
| ------------- | ----- | -------------------- | --------------------------------------------------- |
| 8             | ⦻08   | 1 / 16⁸              | 4,294,967,296                                       |
| 9             | ⦻09   | 1 / 16⁹              | 68,719,476,736                                      |
| 10            | ⦻10   | 1 / 16¹⁰             | 1,099,511,627,776                                   |
| 11            | ⦻11   | 1 / 16¹¹             | 17,592,186,044,416                                  |
| 12            | ⦻12   | 1 / 16¹²             | 281,474,976,710,656                                 |
| 13            | ⦻13   | 1 / 16¹³             | 4,503,599,627,370,496                               |
| 14            | ⦻14   | 1 / 16¹⁴             | 72,057,594,037,927,936                              |
| 15            | ⦻15   | 1 / 16¹⁵             | 1,152,921,504,606,846,976                           |
| 16            | ⦻16   | 1 / 16¹⁶             | 18,446,744,073,709,551,616                          |
| 17            | ⦻17   | 1 / 16¹⁷             | 295,147,905,179,352,825,856                         |
| 18            | ⦻18   | 1 / 16¹⁸             | 4,722,366,482,869,645,213,696                       |
| 19            | ⦻19   | 1 / 16¹⁹             | 75,557,863,725,914,323,419,136                      |
| 20            | ⦻20   | 1 / 16²⁰             | 1,208,925,819,614,629,174,706,176                   |
| 21            | ⦻21   | 1 / 16²¹             | 19,342,813,113,834,066,795,298,816                  |
| 22            | ⦻22   | 1 / 16²²             | 309,485,009,821,345,068,724,781,056                 |
| 23            | ⦻23   | 1 / 16²³             | 4,951,760,157,141,521,099,596,496,896               |
| 24            | ⦻24   | 1 / 16²⁴             | 79,228,162,514,264,337,593,543,950,336              |
| 25            | ⦻25   | 1 / 16²⁵             | 1,267,650,600,228,229,401,496,703,205,376           |
| 26            | ⦻26   | 1 / 16²⁶             | 20,282,409,603,596,470,423,204,851,261,696          |
| 27            | ⦻27   | 1 / 16²⁷             | 324,518,553,658,426,726,783,156,020,576,256         |
| 28            | ⦻28   | 1 / 16²⁸             | 5,192,296,858,534,827,628,530,496,329,244,096       |
| 29            | ⦻29   | 1 / 16²⁹             | 83,076,749,736,557,242,056,088,740,707,905,536      |
| 30            | ⦻30   | 1 / 16³⁰             | 1,329,227,995,784,915,872,897,419,851,326,488,576   |
| 31            | ⦻31   | 1 / 16³¹             | 21,267,647,932,558,653,965,558,717,221,223,817,216  |
| 32            | ⦻32   | 1 / 16³²             | 340,282,366,920,938,463,463,374,607,431,768,211,456 |

Each additional leading hexadecimal zero represents a **16× increase in
hash rarity**.

# Bitnat Bitcoin Supply

Bitnat Bitcoins represent the total mintable entropy extracted from forged bitnat blocks.

Supply as of **Bitcoin block 939,413**:

| base_bitnats_blocks | bitnat_bitcoins |
|---|---|
| 939,413 | 15,379,051 |

Total supply grows deterministically as new blocks with leading zeros are discovered.

## Collection Size

Approximately **225,000 Base Bitcoin Blocks** satisfy the eligibility rules.

For indexing efficiency and marketplace compatibility the collection
is partitioned into **nine volumes**.

Each volume represents a deterministic subset of the dataset.

## Deterministic Reproduction

The bitnats dataset can be independently reproduced.

Procedure:

1. Enumerate all Bitcoin blocks
2. Extract each block hash
3. Count leading hexadecimal zeros
4. Filter blocks with ≥ 1 leading zero
5. Apply inscription eligibility rules

Because the rules depend only on Bitcoin block data, the collection
remains fully verifiable.

## Data Sources

All artifact data derives from publicly verifiable Bitcoin sources:

- Bitcoin block headers
- block hashes
- block heights
- ordinal inscription ordering

No external metadata is required to determine artifact validity.

## Forging

Base bitnat blocks may be **reinscribed** with derived visual artifacts
generated from block hash entropy.

Forged artifacts:

- reference the base bitnat block
- preserve the canonical artifact identity
- do not alter the base inscription

Forging allows visual representations of the underlying entropy.

## Specification

Formal protocol rules are defined in:

docs/specification.md

The specification defines:

- deterministic artifact rules
- eligibility verification
- rarity calculation
- minting rules for Bitnat Bitcoins
- inscription ordering requirements

## Repository Structure

```
0x.bitnats/
│
├── README.md
│
├── docs/
│   └── specification.md
│
├── images/
│   └── icon.svg
│
├── volumes/
│   ├── volume1.json
│   ├── volume2.json
│   ├── volume3.json
│   ├── volume4.json
│   ├── volume5.json
│   ├── volume6.json
│   ├── volume7.json
│   ├── volume8.json
│   └── volume9.json
│
└── scripts/
    └── generate_dataset.js
```
## License

The protocol specification, dataset definitions, and documentation contained in
this repository are released under the **MIT License**.

This allows anyone to study, fork, and build software compatible with the
Bitnats protocol.

However, **generation of official Bitnat artifacts is restricted**.

---

### Protocol

The Bitnats protocol specification is open and may be used to build tools,
explorers, indexers, or other software that interacts with Bitnat artifacts.

Permitted uses include:

- Building explorers, galleries, or indexers
- Creating software that reads Bitnats datasets
- Integrating Bitnats data into applications or games
- Developing compatible tooling or infrastructure

The protocol documentation is provided to ensure transparency and
interoperability.

---

### Artifact Generation

**Bitnat artifacts cannot be freely generated.**

The canonical Bitnats collection is defined by the **Base Bitnat Block dataset**
(225,000 valid blocks) contained in this repository.

Outside of this base set:

- **New Bitnat artifacts may only be created through the official Bitnats
forging infrastructure operated at `prospect.bitnats.io`.**

Independent generation of artifacts that claim to be official Bitnats is not
recognized by the protocol.

This rule preserves:

- canonical supply
- deterministic rarity
- dataset integrity

---

### Artwork and Visual Rendering

Reference artwork and SVG templates contained in this repository are provided
for demonstration and reference purposes.

The official rendering system used for forging Bitnat artifacts may be operated
separately by the Bitnats infrastructure.

---

### Trademark and Brand

The names **Bitnats**, **0x.bitnats**, **Bitnat Forge**, and related marks may be
protected trademarks.

Use of these names to represent official Bitnats artifacts, services, or
infrastructure may require permission.

Independent projects should avoid implying official affiliation.

---

### On-Chain Artifacts

Bitnat artifacts exist as ordinal inscriptions on the Bitcoin blockchain.

Ownership and transfer are determined solely by the Bitcoin UTXO model and the
Ordinals protocol.

This repository does not control artifacts once they are inscribed on-chain.

---

### Warranty

This project is provided **as-is**, without warranty of any kind.

The maintainers assume no responsibility for software bugs, financial loss,
or misuse of the protocol.

## Trademark

"Bitnats" and the ⦻ Bitnats mark are trademarks of BitGnat.

This repository contains open protocol specifications and datasets under
the MIT License. Use of the Bitnats name, brand, or visual identity in
commercial products or services may require permission.

---

## Support the Bitnats Project 

The Bitnats protocol is maintained by BitGnat.

If you find the Bitnats protocol useful, you can support its continued
development with a Bitcoin donation.

Bitcoin Address

```
bc1qq92uur8dp65n87x40m2ta3qve2l2znuqwyg0s8
```

<img src="images/donate-qr.svg" width="256" />

Donations are voluntary and provide no special privileges,
governance rights, or ownership in the Bitnats protocol.
