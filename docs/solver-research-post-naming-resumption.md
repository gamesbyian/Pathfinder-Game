# Solver research resumption after naming cleanup

> **Status:** The repository-wide naming cleanup is complete through Phase 15. This document is now the active post-cleanup bridge for interpreting frozen pre-cleanup evidence and for the baseline checkpoint before resumed decision-bearing solver research.
>
> **Purpose:** preserve research continuity across frozen historical evidence without rewriting that evidence or teaching every consumer two vocabularies.

The naming cleanup deliberately leaves dated reports, archived snapshots, historical logs, and immutable workflow artifacts in the vocabulary that existed when they were produced. That evidence remains valid, but it is not a current executable runbook. Start solver work from current `main`, use the live workstream and vocabulary authorities, and normalize old machine identities at their owning compatibility boundary before grouping, joining, comparing, or replaying them.

## Authority order for resumed solver work

1. `docs/solver-optimization-workstreams.md` owns current research priority, workstream state, next gates, and closed forms.
2. `docs/naming-and-vocabulary.md` owns current terminology.
3. Current `package.json`, workflows, and source own executable command/file/API identity.
4. Frozen reports own historical observations and provenance, not current command syntax.
5. A named compatibility normalizer owns legacy machine-identity translation. Do not copy its map into scratch tooling.

When historical prose and current code use different names for the same concept, preserve the historical source and translate at the read boundary. Do not rewrite old evidence to make it look contemporary.

## Established historical-to-current boundaries

| Historical evidence surface | Current internal form | Owning reader/normalizer |
| --- | --- | --- |
| compact attempt identity such as `beam:intersectionHarvest@beam5000(diverse)` | `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | `normalizeAttemptIdentityKey()` in `modules/solver/attempt-identity.mjs` |
| composite action identity persisted as stage + compact config, such as a historical main-search/beam action or early-repair/repair action | canonical stage + canonical attempt identity, with repair seed explicit | `normalizeAttemptActionKey()` in `modules/solver/attempt-identity.mjs` |
| historical stage IDs such as `main-loop`, `repair-probe`, `portfolio-pass` | current solver stage IDs | `normalizeSolverStageId()` in `modules/solver/stage-id-normalization.mjs` |
| historical routing/archetype values such as `high-intersection-burden` or `default` | current routing-regime values | `normalizeRoutingRegime()` in `modules/solver/routing-regime-normalization.mjs` |
| raw/wire challenge metric keys | normalized `requiredLength` / `requiredIntersections` | `readRawChallengeMetrics()` / `parseRawLevel()` in `modules/domain/level-codec.ts` |

Removed commands, source paths, and private helper names are different: they are not persisted compatibility identities. Resolve those against current `package.json` and current source rather than expecting old aliases to remain executable.

## Resolved Phase-15 boundaries used by this bridge

Phase 15 narrowed compatibility to the actual readers/callers found on the implementation tree.
Resumed research must use these resolved contracts rather than reconstructing the pre-15A seven-row
assumptions.

| Row(s) | Current boundary | Resumption requirement |
| --- | --- | --- |
| NC-P15-001 / NC-P15-008 | variant-family dataset-root CLI vs private source vocabulary | current commands use `--variant-family-dataset-root`; Phase 15J retired `--trove-root` and current tooling rejects it; private source names are canonical-only |
| NC-P15-002 | family evaluation run-manifest schema | new manifests are schema v2 and single-write `variantFamilyDataset`; authentic schema-v1 `trove` manifests permanently normalize through the owning validator/index reader |
| NC-P15-003 / NC-P15-009 | historical family attempt discovery vs current output paths | frozen `wide-trove-attempts-*` evidence remains discoverable; current new-run artifacts use stable `variant-family-dataset-*` names; old/new evidence joins through the family index without rewriting frozen paths |
| NC-P15-004 | application level-fingerprint vocabulary | current application names use `levelFingerprint` while computed bytes, Firestore document/path identity, persisted fields, versions, duplicate semantics, and historical readability remain invariant |
| NC-P15-005 / NC-P15-010 | CP-SAT explicit-prefix result schema and workflow-local shard job | current same-run output is schema v2 `referenceLabel`/`referenceReason`, and the workflow job is `reference-shards`; there is **no maintained historical schema-v1 result reader**, so frozen old result artifacts are not normalized or mixed into current shard combination |
| NC-P15-011 / NC-P15-012 | external case-format token and known-prefix source schema | canonical `reference-abstain` is the only current input spelling; Phase 15J retired `atlas-abstain`; authentic schema-v1 `oracle-abstain` known-prefix sources permanently normalize through the shared extractor to the canonical reference model |
| NC-P15-006 | shared CP-SAT branch-label eligibility library | current consumers import `cpsat-branch-label-eligibility.mjs` and canonical exports; no private filename/export compatibility alias exists |
| NC-P15-007 / NC-P15-013 | prune-gap directory CLI/local vocabulary and generated report metadata | current tools use `--prune-gap-dir`/`PRUNE_GAP_DIR` and new reports write `pruneGapDir`/`pruneGapFiles`; no maintained old CLI/report reader was found, so atlas-directory spellings survive only in frozen history/migration evidence |
| NC-P15-014 | repair-retreat CP-SAT result-local vocabulary | current diagnostic output uses `referenceProbe`/`referenceLabel`/`referenceReason`; historical unversioned outputs remain frozen and are not promoted into a new compatibility schema |

The Phase-15 closeout must replay every compatibility claim above that actually has a reader,
prove canonical single-write for the current writers, and explicitly prove that boundaries without a
historical reader do not acquire synthetic adapters.

## Rules for consuming frozen solver evidence

- Never group, join, deduplicate, or compare historical attempt/stage/routing identities by raw string when an owning normalizer exists.
- Do not write a five-line replacement parser in a one-off analysis script. Import the owning normalizer. If the owner lacks a case required by real evidence, extend the owner and add a fixture there.
- Treat historical shell commands, workflow names, source paths, and private helper names as provenance. Resolve them against current `main` before execution.
- Treat raw level JSON as wire data. Parse it before passing it to normalized/runtime code.
- Preserve negative knowledge. Before reopening a treatment because its old name is absent from current source, canonicalize the historical identity and check the live workstream/experiment disposition. `research-status-index` expands stage/routing aliases through the owning normalizers so current-name queries can still discover frozen evidence written in the prior vocabulary.
- Do not resume from old `solver-dev-queue-*` branches. Create a new branch from post-Phase-15 `main`.

## Post-Phase-15 baseline checkpoint

Before the first decision-bearing solver change after the naming cleanup:

1. confirm Phase 15 and final naming closeout are complete on current `main`;
2. run `npm run test:solver-research-resumption`;
3. run `npm run solver:regression -- --check` on the current solver;
4. run the current experiment preflight appropriate to the first resumed workstream;
5. execute one small current equal-work/census path and record the exact command/output as the post-naming research anchor;
6. for any confirmation workflow used next, inspect its persisted resolved treatment/control flags as well as the workflow conclusion.

The checkpoint is not authority to reopen August experiments. Its purpose is to prove the current research toolchain can still interpret the evidence needed by the live queue before new results depend on it.


## Minimum post-naming evidence bundle

The first resumed solver-research branch must be able to point at one compact, reproducible bundle
from post-Phase-15 `main`. Record:

- exact `main` SHA and completed Phase-15 closeout identity;
- `npm run test:solver-research-resumption` result, including the Phase-15 historical fixtures;
- `npm run solver:regression -- --check` result;
- the current experiment-preflight command/result for the next workstream;
- one small equal-work/census execution with exact command and output path;
- one canonical research-status query that discovers representative frozen evidence written under
  historical stage/routing vocabulary, plus the equivalent legacy query/disposition;
- one representative mixed-era identity join from current analysis tooling, not merely a
  single-record parser;
- if the next experiment uses a confirmation workflow, the persisted resolved
  treatment/control-flag artifact or equivalent proof of arm wiring.

This bundle is a toolchain/provenance checkpoint. It is not a new scientific result and must not be
used to reopen a closed treatment.

## Resumption no-go conditions

Do not start a decision-bearing solver experiment if any of the following is true:

- a Phase-15 row or hostile closeout is still open/repaired-but-not-reclosed;
- current `AGENTS.md`, workstream docs, package commands, workflows, or tooling catalog disagree
  about the executable identity needed for the next run;
- a historical stage/routing/attempt identity needed by the planned analysis is compared raw rather
  than through its owning normalizer;
- a Phase-15 persisted boundary can read one era in isolation but has no mixed-era
  grouping/join/deduplication proof where the real consumer combines eras;
- a new writer still emits a retired field/value/path spelling that should have become
  canonical-single-write;
- a claimed legacy reader exists only as comments, checker allowlists, or a synthetic string fixture;
- the regression/preflight/equal-work anchor was run on a different commit than the branch base
  without an explicit reconciliation;
- a confirmation workflow has not proven which flags/arm actually reached its worker.

If the naming program changes solver-research priority while resolving these conditions, update the
canonical workstream authority with the implementation/evidence reason. Do not infer a priority
change from renamed terminology alone.
