# 0. Overview

Bitnats is a deterministic interpretation layer over Bitcoin block history.

The protocol extracts hash entropy from Bitcoin block hashes and indexes blocks whose hashes contain $N$ leading hexadecimal zeros. Each indexed block can be represented as a Base Bitnats Block artifact through ordinal inscription rules.

Bitnats does not modify Bitcoin consensus. It defines reproducible artifact rules derived from publicly verifiable blockchain data.

This interpretation layer converts Bitcoin proof-of-work entropy into two protocol artifact classes:

- Base Bitnats Block artifacts
- Derived artifacts produced through additional inscriptions

Artifact rarity is derived directly from Bitcoin proof-of-work statistics through leading-zero frequency in block hashes.

# 1. Protocol Scope

The Bitnats protocol specifies:

- eligibility rules for base artifacts
- deterministic dataset construction
- artifact inscription rules
- derived artifact rules
- dataset verification procedures

The protocol does not specify wallets, marketplaces, UI layers, or off-chain service products.

# 2. Protocol Components

The protocol documentation is organized into the following components:

- Core Protocol: definitions and primitive rules for Bitnats artifacts. See [01-core-protocol.md](01-core-protocol.md).
- Artifact Rules: validity rules for Base Bitnats Blocks and derived artifacts. See [02-artifact-rules.md](02-artifact-rules.md).
- Dataset: construction rules for the canonical set of valid Bitnat blocks. See [03-dataset.md](03-dataset.md).
- Verification: deterministic verification procedures for dataset and artifact integrity. See [04-verification.md](04-verification.md).
- Specification: complete normative protocol definition. See [05-specification.md](05-specification.md).

# 3. Protocol Model

Bitcoin mining produces block hashes with measurable entropy. Leading hexadecimal zeros are low-probability outcomes in that search space.

Bitnats defines deterministic rules to index those outcomes from public chain data. The same rules produce the same eligible set for any independent implementation.

Ordinal inscriptions bind protocol artifacts to Bitcoin transaction history. Under these rules, each valid Bitnats artifact is provably derived from Bitcoin block data and inscription ordering.

# 4. Protocol-Grade Verification Signals

- Deterministic Dataset: All valid Bitnat Blocks are derived from Bitcoin block hashes using deterministic rules.
- Public Source Data: All required data is available from the public Bitcoin blockchain.
- Reproducible Computation: Any independent implementation can reproduce the dataset from blockchain data.
- Cryptographic Integrity: Published datasets include hashes that allow independent verification of integrity.

# 5. Reading Order

Recommended reading order:

1. [00-overview.md](00-overview.md)
2. [01-core-protocol.md](01-core-protocol.md)
3. [02-artifact-rules.md](02-artifact-rules.md)
4. [03-dataset.md](03-dataset.md)
5. [04-verification.md](04-verification.md)
6. [05-specification.md](05-specification.md)

[05-specification.md](05-specification.md) is normative. The other documents define terms, rules, and procedures used by the normative specification.