# Bitnats Protocol Terminology

## Purpose

This document defines the canonical terminology for the Bitnats protocol.

These definitions are **authoritative** and must be followed across:
- protocol specifications
- APIs and schemas
- indexers
- UI/UX copy
- documentation
- contributor code

If any conflict arises, this document is the source of truth.

---

## Core Ontology

The Bitnats protocol distinguishes strictly between:

- **atomic units (bitnat)**
- **quantities (bitnats)**
- **containers (bitnats block)**

This separation is fundamental and must not be collapsed.

---

## Definitions

### 1. bitnat (singular)

A **bitnat** is a single extracted entropy unit derived from the number of leading zeros in a Bitcoin block hash.

- atomic
- indivisible at the protocol layer
- represents a **Bitnat Bitcoin** — the canonical user-facing name for a bitnat unit
- "Bitnat Bitcoin" is the semantic layer that maps one bitnat onto one on-chain unit

Example:
> This block yields 12 bitnats → 12 individual bitnat units → 12 Bitnat Bitcoins

---

### 2. bitnats (plural)

**bitnats** refers to a quantity of bitnat units.

- never a container
- always a count or set

Example:
> The system has produced 15,410,128 bitnats

---

### 3. bitnats block (singular container)

A **bitnats block** is a Bitcoin block indexed and interpreted under the Bitnats protocol as a container holding a quantity of bitnats.

- container of entropy units
- corresponds 1:1 with a Bitcoin block
- contains **N bitnats**, where N = leading zero count
- N bitnats = N Bitnat Bitcoins mintable from the block's entropy

Critical rule:
> A block MUST NOT be referred to as a "bitnat block"

Rationale:
A block does not represent a single unit—it represents a **set of bitnats**.

Correct:
> “This bitnats block contains 12 bitnats”

Incorrect:
> “This bitnat block contains 12 bitnats”

---

### 4. bitnats blocks (plural containers)

Plural form of bitnats block.

Example:
> The dataset spans 941,002 bitnats blocks

---

## Formal Notation (Recommended)

To support mathematical clarity and future system design:

- **bn** → bitnat (unit)
- **BN(b)** → number of bitnats in block *b*

Example:
> BN(840000) = 12

---

## Schema Conventions

### Required Naming

Use:
- `bitnat_count`
- `bitnats_block_height`
- `bitnats_block_id`

Avoid:
- `bitnat_block`
- `bitnat_blocks`

Example:

```json
{
  "bitnats_block_height": 840000,
  "bitnat_count": 12
}
