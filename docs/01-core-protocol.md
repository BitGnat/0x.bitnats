# Bitnats Core Protocol

## Protocol Properties

- Bitnat artifacts derive entirely from Bitcoin block hash entropy and SHALL be defined only from publicly verifiable blockchain data.
- Any verifier SHALL be able to reproduce Bitnat eligibility directly from the public Bitcoin blockchain without a trusted intermediary.
- Extracted Bitnat units represent measurable proof-of-work entropy and MUST NOT exceed the entropy depth present in the originating block.

## Overview

Bitnats defines a deterministic interpretation layer over Bitcoin block history.

The protocol identifies eligible blocks from Bitcoin block hashes and maps that eligibility into protocol artifacts using ordinal inscription constraints.

Bitnats does not modify Bitcoin consensus rules. It specifies deterministic definitions, eligibility rules, and artifact validity conditions derived from public chain data.

## Protocol Primitives

### Bitnats Block

A Bitnats Block is a Bitcoin block whose block hash begins with $N$ leading hexadecimal zeros, where $N \ge 1$.

For Bitnats classification, each additional leading hexadecimal zero represents a 16x increase in hash rarity relative to the previous depth.

Bitnats Block eligibility SHALL be computed from Bitcoin block hash data only.

### Entropy Depth (⦻N)

Entropy depth is denoted as ⦻N, where $N$ equals the number of leading hexadecimal zeros in a Bitcoin block hash.

⦻N SHALL define the entropy tier for that block.

### Base Bitnats Block Artifact

A Base Bitnats Block Artifact is the canonical ordinal artifact representation of an eligible Bitnats Block.

A Base Bitnats Block Artifact is valid only if all of the following conditions are satisfied:

- The referenced Bitcoin block MUST already be mined and confirmed.
- The referenced block MUST exist within the canonical Bitnats base dataset.
- The inscription MUST be placed on the canonical Bitnats sat defined by the dataset.
- The artifact MUST be the first inscription (i0) on that sat.

If any condition is violated, the artifact MUST NOT be recognized as a valid Base Bitnats Block Artifact.

### Forged Bitnats Block

A Forged Bitnats Block is the second inscription (i1) on the same canonical Bitnats Block sat as a valid Base Bitnats Block Artifact.

This artifact defines the derived artifact layer, including visual or interactive representations bound to the same sat lineage.

For validity, a Forged Bitnats Block MUST reference a valid Base Bitnats Block Artifact and MUST be inscribed as i1 on that sat.

### Bitnats Bitcoin

Each leading hexadecimal zero in the originating block hash represents one extractable entropy unit.

These units are called Bitnat Bitcoins and represent discrete units of proof-of-work entropy derived from the originating block.

For a block with entropy depth ⦻N, the total number of Bitnat Bitcoins derived from that block MUST NOT exceed $N$.

## Deterministic Reproducibility

Bitnat eligibility derives from Bitcoin block hashes.

Entropy depth is computed as the count of leading hexadecimal zeros in each block hash.

Any independent verifier can compute eligibility and entropy depth directly from public Bitcoin blockchain data.

No trusted party is required to determine whether a block is a Bitnat Block or whether an artifact claim is protocol-valid.

## Protocol Scope

Defined by this protocol:

- Bitnat Block eligibility
- Entropy depth measurement
- Artifact validity rules

Not defined by this protocol:

- Wallet behavior
- Marketplace presentation
- Off-chain metadata services
- User interfaces