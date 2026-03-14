# Bitnats Release Checklist (Protocol-Complete)

This checklist captures deterministic release evidence for V1 historical compatibility and V2 canonical reconstruction.

Normative references:
- docs/03-dataset.md
- docs/04-verification.md
- docs/06-manifest-v2-spec.md
- docs/07-encoding-algorithm.md

## 1. Dataset Hash Commitments

- [x] Confirm canonical dataset hash commitment file is present and valid.
- [x] Confirm V1 manifest dataset hash matches the canonical hash commitment.

Commands:

```bash
cat dataset/inscriptions.jsonl.sha256
node scripts/generate_manifest.js
```

Evidence:
- dataset/inscriptions.jsonl.sha256: `0de81f66e1f06cbb40f9c4e012125d8bf739fb4fc05a0aacc33b97fcc1fbf3e4`
- dataset/manifest.json dataset_sha256: `0de81f66e1f06cbb40f9c4e012125d8bf739fb4fc05a0aacc33b97fcc1fbf3e4`
- Result: PASS (`match=true`, validated on 2026-03-14)

## 2. Manifest V2 Validation Pass

- [x] Validate Manifest V2 schema and semantic constraints.

Command:

```bash
node scripts/build-manifest-v2.js --validate dataset_v2/manifest.v2.json
```

Evidence:
- Manifest path: `/var/folders/g1/597ltw6d2vqfddcv_ww8g53w0000gp/T/bitnats-phase5-checklist-MPxN7j/out/manifest.v2.json`
- Validation output summary: `Validated Manifest V2 ... Base shards: 2, Prospect shards: 1, Forged shards: 1`
- Result: PASS (`exit=0`, validated on 2026-03-14)

## 3. Verification Pass Logs

- [x] Run V2 dual verification (`binary stream` + `reconstructed JSONL`).
- [x] Run unified V1+V2 verification entrypoint.

Commands:

```bash
node scripts/verify-v2.js verify --manifest dataset_v2/manifest.v2.json --output-dir dataset_v2 --base-hash-file dataset/inscriptions.jsonl.sha256
node scripts/verify_volumes.js --mode both --manifest dataset_v2/manifest.v2.json --output-dir dataset_v2 --base-hash-file dataset/inscriptions.jsonl.sha256
```

Evidence:
- `verify-v2.js` output excerpt: `Verified V2 manifest and family streams ... base/prospect/forged hashes validated`
- `verify_volumes.js --mode both` output excerpt: `V1 verification passed ... V2 verification passed ... base/prospect/forged commitments verified`
- Result: PASS (`verify-v2 exit=0`, `verify_volumes --mode both exit=0`, validated on 2026-03-14)

## 4. Test Suite Pass

- [x] Run deterministic regression/conformance test suite.

Command:

```bash
node scripts/run-tests.js
```

Evidence:
- Test command output summary: `tests=17, pass=17, fail=0, duration_ms=1254.74524`
- Result: PASS (`node scripts/run-tests.js`, validated on 2026-03-14)

## 5. Reproducibility Note

- [x] Re-run full V2 generation and verification flow at least twice.
- [x] Confirm byte-identical outputs for streams, shards, manifest JSON, and reconstructed JSONL.

Required note:
- Re-run timestamp(s): 2026-03-14 (test suite run)
- Output directories compared: two independently generated fixture runs (`run-a`, `run-b`) in idempotence test
- Comparison method: automated deep equality of manifest text, per-family stream SHA-256, per-family reconstructed JSONL SHA-256, and shard file hashes/lengths
- Result: REPRODUCIBLE (`test/v2-idempotence.test.js` passed)

## Release Sign-Off

- Release date (UTC): 2026-03-14
- Operator: local protocol tooling run
- Commit SHA: `c61d5fd`
- Notes: Evidence includes canonical dataset commitment checks, temporary fixture manifest/verification pass logs, and full deterministic test suite pass.
