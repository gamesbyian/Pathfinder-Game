# Historical solver evidence compatibility after naming cleanup

> **Status:** Current compatibility reference. The repository-wide naming cleanup and the one-time solver-resumption checkpoint are complete.
>
> **Purpose:** explain how current tooling interprets frozen pre-cleanup solver evidence. This is not a resumption gate, execution checklist, or priority authority.

Frozen reports, archived snapshots, historical logs, and immutable workflow artifacts retain the vocabulary that existed when they were produced. That evidence remains useful, but current `package.json`, workflows, source, and solver workstream authorities define executable identity and current priority. Translate persisted historical identities at their owning read boundary rather than rewriting evidence or keeping retired commands alive.

## Authority order

1. `docs/solver-optimization-workstreams.md` owns current research priority, state, and next gates.
2. `docs/naming-and-vocabulary.md` owns current terminology.
3. Current source, `package.json`, and workflows own executable commands, paths, APIs, and schemas.
4. Frozen reports/logs own historical observations and provenance, not current command syntax.
5. Named compatibility normalizers own legacy machine-identity translation.

Removed commands, private helper names, migration phase labels, and old source paths are provenance only. They do not require permanent aliases or CI checks.

## Persisted historical-to-current boundaries

| Historical evidence surface | Current internal form | Owning reader/normalizer |
| --- | --- | --- |
| compact attempt identity such as `beam:intersectionHarvest@beam5000(diverse)` | canonical attempt identity | `normalizeAttemptIdentityKey()` in `modules/solver/attempt-identity.mjs` |
| composite action identity persisted as stage + compact config | canonical stage + attempt identity, with repair seed explicit | `normalizeAttemptActionKey()` in `modules/solver/attempt-identity.mjs` |
| historical stage IDs such as `main-loop`, `repair-probe`, `portfolio-pass` | current solver stage IDs | `normalizeSolverStageId()` in `modules/solver/stage-id-normalization.mjs` |
| historical routing/archetype values such as `high-intersection-burden` or `default` | current routing-regime values | `normalizeRoutingRegime()` in `modules/solver/routing-regime-normalization.mjs` |
| raw/wire challenge metric keys | normalized `requiredLength` / `requiredIntersections` | `readRawChallengeMetrics()` / `parseRawLevel()` in `modules/domain/level-codec.ts` |
| family evaluation schema-v1 `trove` manifests | schema-v2 `variantFamilyDataset` model | family experiment-manifest validator/index readers |
| historical `wide-trove-attempts-*` family artifacts | current logical family-result rows | family index mixed-era discovery/reconciliation |
| schema-v1 known-prefix `oracle-abstain` sources | current reference model | shared known-prefix extractor/normalizer |

Those readers are current functionality because current research still consumes frozen evidence. Their owner tests should remain. Migration phase closeout tests are not required to protect them.

## Current-only boundaries established by the cleanup

These old forms deliberately have no maintained compatibility alias/reader and should stay retired:

- variant-family dataset-root input uses `--variant-family-dataset-root`; `--trove-root` is rejected;
- current CP-SAT explicit-prefix output is schema v2 with `referenceLabel` / `referenceReason`; old same-run result schemas are frozen rather than mixed into current shard combination;
- CP-SAT branch-label consumers use the canonical branch-label library/exports;
- prune-gap tools use `--prune-gap-dir`, `PRUNE_GAP_DIR`, `pruneGapDir`, and `pruneGapFiles`; atlas-directory spellings remain historical only;
- current application-local level identity vocabulary uses `levelFingerprint` while persisted fingerprint bytes/identity remain invariant;
- current repair-retreat diagnostics use `referenceProbe` / `referenceLabel` / `referenceReason`; old unversioned outputs remain frozen.

Current domain-named tests protect these contracts directly. Do not recreate phase-specific closeout machinery around them.

## Rules for consuming frozen solver evidence

- Never group, join, deduplicate, or compare persisted historical attempt/stage/routing identities by raw string when an owning normalizer exists.
- Import the owning normalizer instead of reproducing compatibility maps in one-off analysis code.
- Treat historical shell commands, workflow names, source paths, and private helpers as provenance. Resolve execution against current `main`.
- Treat raw level JSON as wire data and parse it before passing it to normalized/runtime code.
- Before reopening a treatment because its old spelling is absent from current source, canonicalize the historical identity and check the current workstream/experiment disposition.
- `research-status-index` should discover representative frozen evidence from either current or historical vocabulary through the owning normalizers.
- When family aggregates combine eras, preserve historical-only rows and surface genuine conflicts rather than silently treating them as duplicates.
- A claimed compatibility reader must be exercised by its current owner test. Comments, migration allowlists, and frozen string fixtures do not constitute a live reader.

## What completion changed

The one-time post-Phase-15 checkpoint proved that solver research could resume across the renamed interfaces and historical evidence boundaries. Solver research has since resumed and produced new decision-bearing work. Consequently:

- there is no perpetual “solver research resumption” CI gate;
- there is no requirement to replay the naming ledger or phase closeouts before ordinary solver research;
- there is no standing post-naming evidence bundle to regenerate;
- current compatibility owner tests and ordinary solver/research CI are the continuing guardrails.

Use this file only when frozen pre-cleanup evidence participates in current analysis or when a historical/current identity mapping needs explanation. Ordinary solver work should start from the current workstream and research-operating authorities.
