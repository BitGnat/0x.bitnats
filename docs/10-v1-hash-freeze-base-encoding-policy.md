# V1 Hash Freeze and Base Encoding-Path Reconciliation Policy

This policy records the release fork decision for V2 blocker resolution.

## 1. Decision

The canonical V1 commitment remains frozen:

- `dataset/inscriptions.jsonl.sha256` is immutable for this fork.

The resolution path is:

- adjust the V2 base encoding/reconstruction path so base reconstructed JSONL bytes hash to the frozen V1 commitment.
- preserve historical base EOF semantics (no terminal LF) for byte-compatibility with the frozen V1 dataset file.

Target acceptance equation:

- `SHA256(base_reconstructed_jsonl_bytes) == SHA256(dataset/inscriptions.jsonl)`
- and therefore equals `dataset/inscriptions.jsonl.sha256`.

## 2. Policy Fork Boundary

Rejected branch:

- recompute and rewrite `dataset/inscriptions.jsonl.sha256` to fit current V2 output.

Adopted branch:

- keep the V1 hash file unchanged and reconcile base encoding behavior.

## 3. Non-Negotiable Invariants

1. V1 hash file immutability:
   - `dataset/inscriptions.jsonl.sha256` is read-only for this fork.
2. Fail-closed verification behavior remains in effect.
3. Manifest and shard commitments remain deterministic.
4. Prospect/forged family commitments are unchanged by this policy.

## 4. Control Points (Code)

Frozen-hash enforcement and propagation:

- Verify hash file parse and validation:
  - [scripts/verify-v2.js#L60](../scripts/verify-v2.js#L60)
- Default base hash commitment path:
  - [scripts/verify-v2.js#L339](../scripts/verify-v2.js#L339)
- Base-family compatibility gate:
  - [scripts/verify-v2.js#L170](../scripts/verify-v2.js#L170)
  - [scripts/verify-v2.js#L187](../scripts/verify-v2.js#L187)
- Fail-closed mismatch message:
  - [scripts/verify-v2.js#L191](../scripts/verify-v2.js#L191)
- Release verification wiring into verify-v2:
  - [scripts/release-v2.js#L796](../scripts/release-v2.js#L796)
  - [scripts/release-v2.js#L801](../scripts/release-v2.js#L801)
- Release evidence commitments include base and dataset V1 hashes:
  - [scripts/release-v2.js#L865](../scripts/release-v2.js#L865)
  - [scripts/release-v2.js#L866](../scripts/release-v2.js#L866)
- Unified verifier delegates to verify-v2 with base hash file:
  - [scripts/verify_volumes.js#L204](../scripts/verify_volumes.js#L204)

Base encoding-path reconciliation surface:

- V1 input parse:
  - [scripts/encode-v2.js#L341](../scripts/encode-v2.js#L341)
- Family classification entrypoint:
  - [scripts/encode-v2.js#L343](../scripts/encode-v2.js#L343)
  - [scripts/v2/classify.js#L43](../scripts/v2/classify.js#L43)
- Ordering/sort control point:
  - [scripts/encode-v2.js#L348](../scripts/encode-v2.js#L348)
  - [scripts/v2/sort.js#L5](../scripts/v2/sort.js#L5)
- Binary stream encode:
  - [scripts/v2/binary.js#L56](../scripts/v2/binary.js#L56)
- Deterministic JSONL reconstruction line format:
  - [scripts/v2/jsonl.js#L6](../scripts/v2/jsonl.js#L6)
  - [scripts/v2/jsonl.js#L35](../scripts/v2/jsonl.js#L35)
- Manifest reconstructed JSONL commitment:
  - [scripts/v2/manifest.js#L461](../scripts/v2/manifest.js#L461)

## 5. Operational Gate Criteria

Pre-inscription Go is allowed only when:

1. `scripts/verify-v2.js verify` exits `0` against pre-inscription manifest and payload.
2. Base reconstructed JSONL hash equals frozen `dataset/inscriptions.jsonl.sha256`.
3. Required release evidence artifacts are present.

## 6. References

- [docs/08-release-operator-runbook.md](08-release-operator-runbook.md)
- [docs/09-release-checklist.md](09-release-checklist.md)
- [dataset/evidence/base-2026-03-15.hash-freeze-evidence.json](../dataset/evidence/base-2026-03-15.hash-freeze-evidence.json)
