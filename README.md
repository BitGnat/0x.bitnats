# 0x.bitnats

Bitcoin block artifacts derived from leading-zero block hash entropy.

---

## Definition

0x.bitnats are ordinal inscriptions representing Bitcoin blocks whose
hashes begin with one or more leading hexadecimal zeros.

Each artifact corresponds to a specific block height and derives its
rarity from the number of leading zeros in the block hash.

---

## Artifact Structure

Each bitnat consists of two inscriptions on the same sat:

1. **Base Bitnat Block (i0)**
   - plain text block reference
   - canonical artifact identifier

2. **Forged Bitnat (i1+)**
   - optional visual or symbolic representation
   - derived from the base block entropy

---

## Eligibility Rules

A block qualifies as a bitnat if:

1. The block hash begins with at least one leading hexadecimal zero.
2. The inscription is placed on the **first sat of the block reward**.
3. The base artifact must be the **first inscription (i0)** on the sat.
4. Only one valid base artifact may exist per block.

---

## Rarity

Rarity is determined by the number of leading hexadecimal zeros in the
block hash.

Example:

| Trait | Meaning |
|------|--------|
| 0x1 | minimal rarity |
| 0x2 | uncommon |
| 0x3 | rare |
| ... | ... |
| 0x24 | theoretical maximum |

---

## Collection Size

Approximately **225,000 blocks** satisfy the eligibility rules.

The collection is partitioned into **nine volumes** for indexing and
marketplace pagination.

---


---

## Data Sources

All artifacts derive from publicly verifiable Bitcoin data:

- Bitcoin block headers
- block hashes
- block heights
- ordinal inscription ordering

---

## Verification

The dataset can be independently reproduced by:

1. Enumerating Bitcoin blocks
2. Counting leading hexadecimal zeros in each block hash
3. Applying the eligibility rules
4. verifying inscription ordering

---

## Specification

The full deterministic rules are defined in:

docs/specification.md

---

## License

CC0
