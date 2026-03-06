# 0x.bitnats
<img src="images/icon.svg" width="120" />

A protocol for extracting Bitcoin block hash entropy into ordinal artifacts and provenance-bound units.

---

A **Bitnat Block** is an ordinal artifact representing a Bitcoin block whose
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

From each Bitnats Block, the protocol allows the extraction of
**Bitnat Bitcoins** — individual units derived from the block's entropy.

Each leading hexadecimal zero may be minted as one Bitnat Bitcoin.

These units are **not fungible tokens**.

Every Bitnat Bitcoin retains the **block provenance** of the Bitnats Block
from which it was derived, making each unit uniquely tied to a specific
Bitcoin block and its entropy signature.

## Protocol Primitives

The 0x.bitnats protocol defines three primitives:

| Primitive | Description |
|---|---|
| **Bitnats Block** | Canonical ordinal artifact representing a Bitcoin block with N leading hexadecimal zeros |
| **Forged Bitnats Block** | Derived artifact reinscribed on the same satoshi as the base block |
| **Bitnat Bitcoin** | non-fungible unit minted from the entropy of a forged bitnat block |

These primitives transform **Bitcoin block hash entropy** into both collectible artifacts and non-fungible units.

Bitcoin Block  
      ↓  
Bitnats Block (artifact)  
      ↓  
Forged Bitnats Block (derived artifact)  
      ↓  
Bitnat Bitcoin (non-fungible unit)  

entity: bitnats_block  
entity: forged_bitnats_block  
entity: bitnat_bitcoin  

## Artifact Model

Each bitnats block artifact consists of inscriptions placed on the **same satoshi**.

### Bitnats Block (i0)

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

Base artifacts alone cannot produce Bitnat Bitcoins.

## Eligibility Rules

A Bitcoin block qualifies as a **bitnats block** if:

1. The block hash begins with **one or more leading hexadecimal zeros**
2. The referenced Bitcoin block must already exist on-chain at the time the base Bitnat Block artifact is inscribed.
3. The base Bitnat Block artifact must be the **first inscription (i0)** on the designated Base Bitnat Block sat
4. Only **one valid Base Bitnat Block artifact may exist per Bitcoin block**

These rules ensure deterministic artifact identity.

The Base Bitnat Block sat refers to the canonical satoshi used to
inscribe the base artifact for each valid Bitnat Block within the
deterministic Bitnats dataset.

## Rarity

Bitnat Block rarity is determined by the number of leading hexadecimal
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

- Bitnat traits begin at **⦻08** because the forging dataset is derived from blocks meeting the minimum entropy threshold defined by the collection.
- The distribution evolves as new Bitcoin blocks are mined.
- Rarity categories are descriptive labels and do **not** affect artifact validity.

### Theoretical Maximum

The theoretical maximum rarity for a Bitcoin block hash is:

⦻24

This corresponds to a block hash beginning with **24 leading hexadecimal zeros**.

### Expected Hash Probability

Expected probability for a Bitcoin block hash to contain **N leading
hexadecimal zeros**.

| leading_zeros | trait | expected probability | approx 1 in N |
|---|---|---|---|
| 8 | ⦻08 | 1 / 16⁸ | 1 in 4,294,967,296 |
| 9 | ⦻09 | 1 / 16⁹ | 1 in 68,719,476,736 |
| 10 | ⦻10 | 1 / 16¹⁰ | 1 in 1,099,511,627,776 |
| 11 | ⦻11 | 1 / 16¹¹ | 1 in 17,592,186,044,416 |
| 12 | ⦻12 | 1 / 16¹² | 1 in 281,474,976,710,656 |
| 13 | ⦻13 | 1 / 16¹³ | 1 in 4,503,599,627,370,496 |
| 14 | ⦻14 | 1 / 16¹⁴ | 1 in 72,057,594,037,927,936 |
| 15 | ⦻15 | 1 / 16¹⁵ | 1 in 1,152,921,504,606,846,976 |
| 16 | ⦻16 | 1 / 16¹⁶ | 1 in 18,446,744,073,709,551,616 |
| 17 | ⦻17 | 1 / 16¹⁷ | 1 in 295,147,905,179,352,825,856 |
| 18 | ⦻18 | 1 / 16¹⁸ | 1 in 4,722,366,482,869,645,213,696 |
| 19 | ⦻19 | 1 / 16¹⁹ | 1 in 75,557,863,725,914,323,419,136 |
| 20 | ⦻20 | 1 / 16²⁰ | 1 in 1,208,925,819,614,629,174,706,176 |
| 21 | ⦻21 | 1 / 16²¹ | 1 in 19,342,813,113,834,066,795,298,816 |
| 22 | ⦻22 | 1 / 16²² | 1 in 309,485,009,821,345,068,724,781,056 |
| 23 | ⦻23 | 1 / 16²³ | 1 in 4,951,760,157,141,521,099,596,496,896 |
| 24 | ⦻24 | 1 / 16²⁴ | 1 in 79,228,162,514,264,337,593,543,950,336 |
| 25 | ⦻25 | 1 / 16²⁵ | 1 in 1,267,650,600,228,229,401,496,703,205,376 |

### Rarity Curve

Observed distribution of bitnat traits (blocks through height 939,413)

⦻08  ███████████████████
⦻09  ████████
⦻10  ███████
⦻11  ████████
⦻12  ████████
⦻13  ████████████████████████████
⦻14  ███████████
⦻15  ███████
⦻16  █████████████
⦻17  ██████████████████████████████████
⦻18  ███████████████████████████████████
⦻19  █████████████████████████████████████████████████████████████████
⦻20  ███████████████
⦻21  █
⦻22  ▏
⦻23  ·
⦻24  ·

Each additional leading hexadecimal zero represents a **16× increase in
hash rarity**.

# Bitnat Bitcoin Supply

Bitnat Bitcoins represent the total mintable entropy extracted from forged bitnat blocks.

Supply as of **Bitcoin block 939,413**:

| base_blocks | bitnat_bitcoins |
|---|---|
| 939,413 | 15,379,051 |

Total supply grows deterministically as new blocks with leading zeros are discovered.

## Collection Size

Approximately **225,000 Bitcoin Blocks** satisfy the eligibility rules.

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

0x.bitnats/
│
├─ README.md
│
├─ docs/
│  └─ specification.md
│
├─ images/
│  └─ icon.svg
│
├─ volumes/
│  ├─ volume1.json
│  ├─ volume2.json
│  ├─ volume3.json
│  ├─ volume4.json
│  ├─ volume5.json
│  ├─ volume6.json
│  ├─ volume7.json
│  ├─ volume8.json
│  └─ volume9.json
│
└─ scripts/
   └─ generate_dataset.js

## License

CC0
