# Solver research resumption after naming cleanup

> **Status:** pre-Phase-15 handoff contract. This becomes the operational bridge for solver research only after Phase 15 closes and the checks below are fully resolved.
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
| historical stage IDs such as `main-loop`, `repair-probe`, `portfolio-pass` | current solver stage IDs | `normalizeSolverStageId()` in `modules/solver/stage-id-normalization.mjs` |
| historical routing/archetype values such as `high-intersection-burden` or `default` | current routing-regime values | `normalizeRoutingRegime()` in `modules/solver/routing-regime-normalization.mjs` |
| raw/wire challenge metric keys | normalized `requiredLength` / `requiredIntersections` | `readRawChallengeMetrics()` / `parseRawLevel()` in `modules/domain/level-codec.ts` |

Removed commands, source paths, and private helper names are different: they are not persisted compatibility identities. Resolve those against current `package.json` and current source rather than expecting old aliases to remain executable.

## Phase-15 boundaries that must be resolved before this bridge is complete

Phase 15 must extend the same single-reader/single-write discipline to the remaining deferred contracts. The implementation record must name the actual reader and representative historical fixture for each boundary, or amend the row if no real reader exists rather than manufacturing one.

| Row | Boundary | Resumption requirement |
| --- | --- | --- |
| NC-P15-001 | shared family root CLI/API | canonical CLI accepted; explicitly authorized legacy CLI still accepted for its compatibility window; current docs emit only canonical syntax |
| NC-P15-002 | family evaluation run-manifest legacy dataset field | historical manifest fixture reaches the family index as the same canonical dataset identity; new manifests write only the canonical field |
| NC-P15-003 | dated legacy variant-family artifact discovery | historical paths remain discoverable; new artifacts use the canonical path convention; indexing joins old and new evidence without splitting one logical dataset |
| NC-P15-004 | application/Firestore fingerprint cluster | application names are qualified without changing stored document identity, fingerprint versions, duplicate semantics, or historical Firestore readability |
| NC-P15-005 | CP-SAT explicit-prefix result/job identities | historical result values/fields are normalized before analysis/combination; new results/jobs use reference terminology; workflow dependency wiring remains valid |
| NC-P15-006 | shared CP-SAT branch-label eligibility library | all prune-gap and CP-SAT-harvest import consumers migrate together; no compatibility alias is invented for a private source filename |
| NC-P15-007 | atlas-directory CLI/generated-report boundary | canonical CLI/report writes are used for new runs; historical report/CLI compatibility exists only where a real reader/external caller justifies it |

The Phase-15 closeout must add representative fixtures for these resolved boundaries to the automated resumption check or to a named stronger test that the resumption check invokes.

## Rules for consuming frozen solver evidence

- Never group, join, deduplicate, or compare historical attempt/stage/routing identities by raw string when an owning normalizer exists.
- Do not write a five-line replacement parser in a one-off analysis script. Import the owning normalizer. If the owner lacks a case required by real evidence, extend the owner and add a fixture there.
- Treat historical shell commands, workflow names, source paths, and private helper names as provenance. Resolve them against current `main` before execution.
- Treat raw level JSON as wire data. Parse it before passing it to normalized/runtime code.
- Preserve negative knowledge. Before reopening a treatment because its old name is absent from current source, canonicalize the historical identity and check the live workstream/experiment disposition.
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
