# Bitnats Artifact Rules

## Protocol Summary

The Bitnats artifact system enforces the following invariants:

- Only previously mined Bitcoin blocks MAY produce artifacts.
- Eligible blocks MUST exist in the canonical Bitnats dataset.
- The Base Bitnats Block artifact MUST be the first inscription (i0) on the canonical dataset sat.
- A Forged Bitnats artifact MUST be the second inscription (i1) on the same sat.
- Artifact rarity MUST equal the number of leading hexadecimal zeros in the block hash.
- Derived Bitnat units MUST equal the number of leading hexadecimal zeros in the block hash.

## Overview

This document defines the canonical artifact validity rules for the Bitnats protocol.

All artifact claims MUST be evaluated against the canonical dataset and the rules defined in this document. Implementations that accept artifacts violating these rules are not compliant with the Bitnats protocol.

## Canonical Dataset

Artifact eligibility is determined by the canonical dataset:

```
dataset/inscriptions.jsonl
```

This dataset is deterministically reconstructed from the nine volume shards:

```
volumes/volume1.jsonl
volumes/volume2.jsonl
volumes/volume3.jsonl
volumes/volume4.jsonl
volumes/volume5.jsonl
volumes/volume6.jsonl
volumes/volume7.jsonl
volumes/volume8.jsonl
volumes/volume9.jsonl
```

Implementations MUST treat `dataset/inscriptions.jsonl` as the authoritative eligibility set.

Only blocks contained in this dataset MAY produce Bitnats artifacts.

## Artifact Types

### Base Bitnats Block Artifact

A Base Bitnats Block Artifact is the canonical entropy capture of an eligible Bitcoin block.

A valid Base Bitnats Block Artifact MUST satisfy all of the following conditions:

1. The referenced Bitcoin block MUST already be mined and confirmed on-chain.
2. The referenced block MUST exist in the canonical Bitnats dataset.
3. The inscription MUST be placed on the canonical dataset satoshi defined for that block.
4. The artifact MUST be the first inscription (i0) on that satoshi.

This enforces the first-is-first invariant: the earliest mined inscription satisfying conditions 1–4 is the valid Base Bitnats Block Artifact for that block. Any later inscription on the same satoshi, or any competing claim mined after the valid artifact, MUST NOT be recognized as a Base Bitnats Block Artifact.

If any condition is not satisfied, the artifact MUST be considered invalid.

### Forged Bitnats Artifact

A Forged Bitnats Artifact is a second-stage artifact derived from a valid Base Bitnats Block Artifact.

A valid Forged Bitnats Artifact MUST satisfy all of the following conditions:

1. The inscription MUST occur on the same satoshi as the referenced Base Bitnats Block Artifact.
2. The inscription MUST be the second inscription (i1) on that satoshi.
3. The referenced Base Bitnats Block Artifact MUST be valid under the rules defined above.

This ensures deterministic lineage between the base and forged artifact layers.

If any condition is not satisfied, the artifact MUST be considered invalid.

### Derived Bitnat Units

From a valid Forged Bitnats Artifact, the protocol allows extraction of Bitnat Bitcoins.

The number of derived units MUST equal the number of leading hexadecimal zeros in the originating block hash:

```
units = leading_zero_count
```

Derived units represent quantized proof-of-work entropy bound to the originating block. A Bitnat Bitcoin derived from a block with entropy depth ⦻N MUST NOT exceed $N$ units.

Bitnat Bitcoins MAY only be derived from a valid Forged Bitnats Artifact. Base Bitnats Block Artifacts alone SHALL NOT produce derived units.

## Artifact Validation Procedure

The following procedure MUST be applied to determine whether an artifact is valid.

### Base Bitnats Block Artifact

1. Locate the referenced Bitcoin block by block hash.
2. Verify the block is mined and confirmed on-chain.
3. Verify the block exists in the canonical dataset (`dataset/inscriptions.jsonl`).
4. Determine the canonical dataset satoshi for that block from the dataset record.
5. Verify the inscription is placed on that satoshi.
6. Verify the inscription index is i0 on that satoshi.
7. Compute the number of leading hexadecimal zeros in the block hash.
8. Assign entropy depth ⦻N where N equals the leading zero count.

If any step fails, the artifact MUST be rejected.

### Forged Bitnats Artifact

1. Verify the referenced Base Bitnats Block Artifact is valid using the procedure above.
2. Verify the forged inscription is placed on the same satoshi as the Base artifact.
3. Verify the inscription index is i1 on that satoshi.

If any step fails, the artifact MUST be rejected.

## Invalid Artifacts

Artifacts MUST be rejected if any of the following conditions apply:

- The referenced block does not exist in the canonical dataset.
- The referenced block has not yet been mined and confirmed.
- The inscription is not placed on the canonical dataset satoshi.
- The inscription index is not i0 for a claimed Base Bitnats Block Artifact.
- A claimed Forged Bitnats Artifact does not follow i1 lineage rules.
- A claimed Forged Bitnats Artifact references an invalid Base artifact.
- The number of claimed derived units exceeds the leading zero count of the originating block hash.

Rejected artifacts MUST NOT be indexed, displayed, or treated as valid by compliant implementations.

## Security Considerations

### Duplicate Block Claims

The canonical dataset contains exactly one sat assignment per eligible block. The i0 first-is-first rule ensures only one valid Base artifact can exist per block. Later inscriptions on the same sat MUST NOT be recognized.

### Future Block Claims

Condition 1 of the Base artifact rules requires the referenced block to be mined and confirmed before the inscription. Inscriptions referencing unconfirmed or non-existent blocks MUST NOT be recognized.

### Satoshi Reuse Attacks

The canonical dataset sat for each block is defined deterministically. Inscriptions placed on any other satoshi, even if otherwise valid, MUST be rejected. This prevents conflation of artifact identity through satoshi substitution.

### Dataset Manipulation

The canonical dataset is reconstructed from volume shards with published sha256 checksums. Implementations MUST verify dataset integrity against published checksums before evaluating artifact eligibility. A dataset that fails checksum verification MUST NOT be used as an eligibility reference.