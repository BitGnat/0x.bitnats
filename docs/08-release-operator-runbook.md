# Bitnats V2 Release Operator Runbook (GitHub -> On-Chain)

This runbook codifies the release sequence for V2 shard publication and
post-inscription canonical manifest finalization.

Normative references:
- docs/03-dataset.md
- docs/04-verification.md
- docs/06-manifest-v2-spec.md
- docs/07-encoding-algorithm.md
- docs/09-release-checklist.md

## Scope

Use this runbook for the first base-focused release cycle and any later cycle
that uses the same release contract:

- pre-inscription shard payload publication to GitHub
- on-chain inscription of published shards
- post-inscription canonical manifest finalization
- dual verification and release sign-off evidence

The command flow is strict and ordered:

`prepare -> pre-verify -> publish shards -> inscribe -> reconcile ids -> finalize manifest -> post-verify -> release sign-off`

## Repository Path Contract

For release workflow consistency, keep this repository path contract stable:

- `artifacts/releases/<release-id>/` contains release-unit payloads, planning files, reconciliation files, metadata, and temporary verification outputs produced by release tooling.
- `docs/08-release-operator-runbook.md` and `docs/09-release-checklist.md` are operator guidance documents and are not release payload artifacts.
- `dataset/evidence/` contains machine-readable acceptance evidence for dataset and reproducibility gates.
- `scratch/` is local working state for dry-runs and experiments and is not canonical release output.

## Preconditions

- Work from a clean commit and record the commit SHA used for release evidence.
- Confirm canonical V1 commitment exists at `dataset/inscriptions.jsonl.sha256`.
- Confirm V1 volume files exist under `volumes/`.
- Choose a release id, for example `base-YYYY-MM-DD`.
- Ensure shard target policy is the canonical fixed value (`350000` bytes).

## 1) Prepare Release Layout (Pre-Inscription)

Generate the source V2 output, then create a release unit under
`artifacts/releases/<release-id>`.

```bash
node scripts/encode-v2.js \
      --input dataset/inscriptions.jsonl \
      --output-dir dataset_v2 \
      --default-family base \
      --shard-target-bytes 350000

node scripts/release-v2.js prepare \
      --release-id <release-id> \
      --source-output-dir dataset_v2
```

Expected outputs:
- `payload/<family>/shards/*.bin`
- `checksums/shard-checksums.sha256`
- `planning/publish-order.json`
- `planning/inscription-map.template.json`
- `temp/pre-inscription/manifest.local.v2.json` (temporary, non-canonical)
- `metadata/release-metadata.json`

## 2) Pre-Verify Temporary Local Manifest

Run dual V2 verification against the temporary local manifest.

```bash
node scripts/verify-v2.js verify \
      --manifest artifacts/releases/<release-id>/temp/pre-inscription/manifest.local.v2.json \
      --output-dir artifacts/releases/<release-id>/payload \
      --base-hash-file dataset/inscriptions.jsonl.sha256
```

Notes:
- The temporary manifest is local verification state only.
- Do not treat the temporary manifest as canonical release output.

## 3) Publish Shards to GitHub (Pre-On-Chain)

Publish shard payloads and planning artifacts for auditability before
inscription.

Publish at minimum:
- `payload/**/shards/*.bin`
- `checksums/shard-checksums.sha256`
- `planning/publish-order.json`
- `planning/inscription-map.template.json`

Do not publish a canonical `manifest.v2.json` in this stage.

## 4) Inscribe Shards in Publish Order

Use `planning/publish-order.json` as the source of truth for inscription order.

- Inscribe each shard in listed order.
- Collect real on-chain inscription ids.
- Preserve the family/index pairing from the planning template.

## 5) Reconcile Inscription IDs

Fill `planning/inscription-map.template.json` by replacing all
`inscription_id: null` entries with real inscription ids.

Rules:
- no missing ids
- no duplicate ids
- contiguous shard indexes must remain unchanged

## 6) Finalize Canonical Manifest (Post-Inscription)

Finalize the canonical manifest only after the mapping is complete.

```bash
node scripts/release-v2.js finalize-manifest \
      --release-id <release-id> \
      --inscription-map artifacts/releases/<release-id>/planning/inscription-map.template.json
```

Expected outputs:
- `canonical/manifest.v2.json`
- `reconciliation/inscription-map.final.json`
- `reconciliation/shard-reconciliation.json`
- updated `metadata/release-metadata.json`

## 7) Post-Verify Finalized Release and Evidence

Run release verification and unified V1+V2 verification.

```bash
node scripts/release-v2.js verify-release \
      --release-id <release-id> \
      --base-hash-file dataset/inscriptions.jsonl.sha256

node scripts/verify_volumes.js \
      --mode both \
      --manifest artifacts/releases/<release-id>/canonical/manifest.v2.json \
      --output-dir artifacts/releases/<release-id>/payload \
      --base-hash-file dataset/inscriptions.jsonl.sha256
```

Required machine-readable evidence:
- `temp/verification/verify-v2.json`
- `temp/verification/verify-volumes.both.json`
- `temp/verification/verification-evidence.json`

## 8) Release Sign-Off

Before production inscription cycles, require all of the following:

- deterministic rerun parity confirmed
- all verification steps exit with code `0`
- checklist entries completed in `docs/09-release-checklist.md`
- commit binding and hash commitments captured in evidence artifacts

If any step fails, stop and regenerate artifacts from `prepare`.
