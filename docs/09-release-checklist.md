# Bitnats Release Checklist (Protocol-Complete)

This checklist captures deterministic release evidence for V1 historical compatibility and V2 canonical reconstruction.

Normative references:

- docs/03-dataset.md
- docs/04-verification.md
- docs/06-manifest-v2-spec.md
- docs/07-encoding-algorithm.md
- docs/08-release-operator-runbook.md

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
- Frozen-hash compatibility evidence: `dataset/evidence/base-2026-03-15.hash-freeze-evidence.json`
- Result: PASS (`match=true`, validated on 2026-03-15; frozen hash preserved for release base-2026-03-15)

## 2. Manifest V2 Validation Pass

- [x] Validate Manifest V2 schema and semantic constraints.

Command:

```bash
node scripts/build-manifest-v2.js --validate artifacts/releases/base-2026-03-15/temp/pre-inscription/manifest.local.v2.json
```

Evidence:

- Manifest path: `artifacts/releases/base-2026-03-15/temp/pre-inscription/manifest.local.v2.json`
- Validation output summary: `Validated Manifest V2 ... Base shards: 22, Prospect shards: 0, Forged shards: 0`
- Result: PASS (`exit=0`, validated on 2026-03-15)

## 3. Verification Pass Logs

- [x] Run V2 dual verification (`binary stream` + `reconstructed JSONL`).
- [x] Run unified V1+V2 verification entrypoint.

Commands:

```bash
node scripts/verify-v2.js verify --manifest artifacts/releases/base-2026-03-15/temp/pre-inscription/manifest.local.v2.json --output-dir artifacts/releases/base-2026-03-15/payload --base-hash-file dataset/inscriptions.jsonl.sha256
node scripts/verify_volumes.js --mode both --manifest artifacts/releases/base-2026-03-15/temp/pre-inscription/manifest.local.v2.json --output-dir artifacts/releases/base-2026-03-15/payload --base-hash-file dataset/inscriptions.jsonl.sha256
```

Evidence:

- `verify-v2.js` output excerpt: `Verified V2 manifest and family streams ... base: 22 shard(s) ... base_v1_jsonl_sha256 matches canonical dataset hash`
- `verify_volumes.js --mode both` output excerpt: `V1 verification passed ... V2 verification passed ... base: 22 shard(s) with matching commitments`
- Result: PASS (`verify-v2 exit=0`, `verify_volumes --mode both exit=0`, validated on 2026-03-15)

## 4. Test Suite Pass

- [x] Run deterministic regression/conformance test suite.

Command:

```bash
node scripts/run-tests.js
```

Evidence:

- Test command output summary: `tests=50, pass=50, fail=0, duration_ms=2387.742231`
- Result: PASS (`node scripts/run-tests.js`, validated on 2026-03-15)

## 5. Reproducibility Note

- [x] Re-run full V2 generation and verification flow at least twice.
- [x] Confirm byte-identical outputs for streams, shards, manifest JSON, and reconstructed JSONL.

Required note:

- Re-run timestamp(s): 2026-03-14 (test suite run)
- Output directories compared: two independently generated fixture runs (`run-a`, `run-b`) in idempotence test
- Comparison method: automated deep equality of manifest text, per-family stream SHA-256, per-family reconstructed JSONL SHA-256, and shard file hashes/lengths
- Result: REPRODUCIBLE (`test/v2-idempotence.test.js` passed)

## 6. Phase 3 Dry-Run Acceptance Gate

- [x] Execute one full local dry-run pipeline twice from identical input.
- [x] Confirm parity for checksums, canonical manifest, final inscription map, and shard commitments.
- [x] Confirm machine-readable verification evidence files exist for each run.
- [x] Confirm verification exit codes are zero for `verify-v2` and unified `verify_volumes --mode both`.

Evidence artifact:

- `dataset/evidence/phase3-dry-run-2026-03-14.acceptance.json`

Acceptance evidence summary:

- Dry-run input fixture: `5000` lines
- Dry-run input fixture hash: `85eaf798421e1c3a291951584ac136038a8768533f3d1c567c6e3a2d0b3b007d`
- Run A canonical manifest SHA-256: `9d5fd6e2efe5f9a795ab292482b33f43273d2488aeaa2417f3d2581185da364c`
- Run B canonical manifest SHA-256: `9d5fd6e2efe5f9a795ab292482b33f43273d2488aeaa2417f3d2581185da364c`
- Run A shard checksums file SHA-256: `752f1e18be598331e91f4896b1c36da48fa2871f09e358feecbcd7af5f2aa224`
- Run B shard checksums file SHA-256: `752f1e18be598331e91f4896b1c36da48fa2871f09e358feecbcd7af5f2aa224`
- Parity checks: all `true` (`checksums_sha256_match`, `manifest_sha256_match`, `final_inscription_map_sha256_match`, `shard_commitments_match`, `verify_commitments_match`, `verify_exit_codes_match`)
- Verify-release evidence paths generated under:
  - `scratch/phase3-dry-run-2026-03-14/run-a/releases/base-phase3-dry-run/temp/verification/`
  - `scratch/phase3-dry-run-2026-03-14/run-b/releases/base-phase3-dry-run/temp/verification/`
- Result: PASS (validated on 2026-03-15)

## Release Sign-Off

- Release date (UTC): 2026-03-15
- Operator: local protocol tooling run
- Commit SHA: `c195167`
- Notes: Evidence includes canonical dataset commitment checks, dry-run acceptance parity evidence, machine-readable release verification artifacts, and full deterministic test suite pass. Pre-inscription gates are complete; post-inscription finalize/verify/sign-off remains pending external publish/inscribe execution.
