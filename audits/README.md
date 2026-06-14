# Audit artifact policy

The solver audit files in this directory are **not ordinary source files**. They
are large generated outputs that can create noisy diffs and hide meaningful code
changes if every local or CI run is committed.

## What belongs in git

- Small, intentionally curated fixtures that a test or documented investigation
  depends on.
- Historical baselines that are explicitly named in this policy or in a future
  fixture manifest.
- Human-written documentation that explains how audit output should be produced,
  compared, or archived.

## What should not be committed by default

- Routine `audits/raw/*.json` output from every solver-audit run.
- Large exploratory local runs that are useful only during one debugging session.
- CI-generated audit output that can be uploaded as a workflow artifact instead.

## Current tracked raw-audit exceptions

The repository currently keeps these raw audit snapshots as compatibility
baselines while the solver/audit workflow is being cleaned up:

- `audits/raw/2026-06-12T22-57-04Z-ca8febfb44f0.json`
- `audits/raw/latest.json`

Do not add more files under `audits/raw/` unless a PR explains why the file is a
curated fixture. Prefer attaching generated raw audits to CI runs or releases.
