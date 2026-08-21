# Solver-research observation tooling pilot

> **Status:** inconclusive  
> **Scope:** tooling validation and deliberately small smoke evidence; not a solver-policy decision  
> **Date:** 2026-08-11

## Implemented

The real beam now has a default-absent observer seam at incoming frontier, generation, hard-prune,
production dedup, score/width cull, and diversity selection. It receives copied replay-complete paths
only after decisions. `WinningPrefixIndex` deduplicates labels while retaining provenance/family;
`WinningLineageObserver` reports support, loss stages, normalized depth, and canonical work after
loss. Cull records include width, cutoff scores, equal-score population and stable-order admission;
dedup removals name the kept competitor.

Repair accepts a tooling-only `_repairResearchSeed`. Absent it, both production formulae are
unchanged. Present, main and must-turn streams derive distinct streams from one coordinate-independent
seed. Survivor order remains unchanged, allowing replayed prefixes to reveal draw/index interactions.

The existing divergence library gained a machine-readable semantic comparator for mapped legal sets,
mechanic masks, lower bounds, prune verdicts, neutral metrics and invariant score components.
Directional CW/CCW and side-axis policies are annotations, not invariant failures.

A small offline library adds authoritative known-prefix sibling enumeration (unknown siblings abstain),
exact/metric beam-versus-repair overlap, conservative repeated-interface mining, and an explicitly
limited known-trajectory rollback proxy. It adds no oracle, scheduler, handoff, repair operator,
reducer, search policy, or solver.

## Commands and sample

```text
npm run check:types -- --pretty false
npm run test:divergence-lib
npm run test:research-analysis-lib
npx vitest run modules/solver/research-lineage.test.ts modules/solver/search.test.ts modules/solver/repair-search.test.ts
npm run test:family-boundary
npm run test:family-boundary-cli
mkdir -p /tmp/empty-atlas
node scripts/run-bundled.mjs scripts/stress/mc-crossing-slack-analysis.mjs -- --corpora=corpus2 --limit-levels=10 --atlas-dir=/tmp/empty-atlas --out=reports/stress/mc-crossing-slack-smoke-2026-08-11.json
```

Focused suites passed (58 Vitest tests plus both library tests). Existing beam/repair fixtures exercised
the OFF path unchanged. Synthetic fixtures distinguished loss buckets, exact versus approximate
interface claims, producer overlap, and the rollback proxy.

The crossing-slack smoke processed 10 Corpus-2 levels, 289 valid unique paths and 7,957 applicable
prefixes, with zero negative-slack soundness alarms. Its oracle atlas was intentionally empty, so this
validates current-main replay and the valid-path alarm only. Family-boundary library/CLI smokes passed;
the wide sweep was not run.

## Findings, limitations, and disposition

This is tooling validation, not population evidence. No independent family-cliff, 8–15-level lineage,
CP-SAT contrastive atlas, hard-level producer population, solution trove interface census, or repair
near-miss census was run; therefore no mechanism or solve-rate conclusion is warranted. No semantic
correctness alarm arose in the synthetic mapped-set check. The rollback proxy demonstrates divergence
from a known trajectory, not minimum edit distance; exact continuation checks are required for causal
interpretation.

The existing reducer remains single-level/predicate-oriented. Its predicate boundary is the smallest
future relational seam, but no recurring signature was established, so no differential reducer was
built.

Next justified runs are a bounded 8–15-level lineage sample and dozens-of-branches atlas using the
new observer/index and existing oracle workflow, followed by a small producer/elite sample. Not run:
wide family trove, full Corpus-2 lineage, either pending promotion A/B (`PRUNE_MC_NEIGHBOR_BUDGET` or
late reserve), live consumption, or opt-in promotion. Winning-lineage stays high priority; a generic
differential reducer and full blackboard remain lower priority until recurring signatures exist.

## Follow-up hardening (same research change)

Review found that treating each per-candidate emission as a population boundary could manufacture
support-loss/reappearance transitions, and that taking the maximum support of one candidate
undercounted distinct known families spread across a frontier. Emission is now batched per beam
phase, frontier support is the union of solution/family identities, removal events are excluded from
extinction transitions, and rejection of any known-valid prefix is surfaced as an explicit
correctness alarm. Score-cull rows now retain candidate rank and margin per removed path, while
dedup rows retain each removed/kept replay pair.

The real-beam test now runs observation OFF and ON on the same fixture and asserts identical returned
path and `nodesExpanded`, in addition to checking that replay-complete boundary records were emitted.
Repair seed tests prove that the absent/null override preserves the production derivation and that a
shared explicit research seed normalizes both independent streams across different gates/salts.
Finally, the previously incomplete benchmark was rerun to completion:
`npm run solver:bench -- --check` solved 160/160 with 51,959,647 nodes and reported no regressions.

## Real-beam bounded lineage pilot

After hardening, the first actual observation run used:

```text
npm run solver:winning-lineage-pilot -- --limit-levels=8 --beam-width=100 \
  --node-budget=50000 --out=reports/stress/winning-lineage-pilot-2026-08-11.json
```

Selection was deterministic and metadata-driven only in the limited sense that the tool selected the
first eight Corpus-2 records with stored solutions, then chose each level's gate having the most
labels. All 415 distinct labels were canonical-referee-valid before search. The OFF/ON paired runs
matched solution, failure outcome, and `nodesExpanded` on all 8/8 levels. No run solved under this
isolated width-100 beam configuration, so this sample is a cold-failure mechanism pilot rather than a
solved-control comparison.

Known support disappeared early: normalized last-support depth ranged 0.056–0.187. Seven final losses
occurred at the production score/width cull; one occurred at production dedup. Searches then spent
3,370–10,211 canonical beam nodes after the last observed known support. There were zero hard-prune
correctness alarms. This is preliminary evidence that the instrumentation separates real retention
losses and that a larger stratified run is worthwhile; it is not evidence for a scoring, width, or
dedup change because labels are incomplete and this deliberately narrow sample has no solved control.

## Stratified lineage follow-up

The compact JSON artifact now records a metadata-stratified rerun, superseding the initial
first-eight smoke output:

```text
npm run solver:winning-lineage-pilot -- \
  --metadata=logs/winning-path-archaeology/corpus2-sample.json --limit-levels=8 \
  --beam-width=100 --node-budget=50000 \
  --out=reports/stress/winning-lineage-pilot-2026-08-11.json
```

The archaeology metadata supplied four cold-solved controls and four cold-unsolved levels; selection
was performed by the tool, not solver identity checks. All eight isolated width-100 beam runs failed,
which is expected to differ from the full cold portfolio label, but OFF/ON path, outcome, and nodes
again matched 8/8 with zero correctness alarms.

Known support survived qualitatively deeper in the cold-solved controls: mean normalized last-support
depth 0.212 (range 0.091–0.395) versus 0.068 (range 0.053–0.089) in cold-unsolved levels. Final loss
was score/width culling in five cases and production dedup in three. This tiny stratified sample is a
preliminary signal, not a population estimate, but it answers the pilot question: the diagnostic is
scientifically useful and the control groups look different enough to justify a larger bounded run.
It still does not justify changing scoring, width, or dedup.

## Loss-cause hardening

Hard-prune records now retain the first named prune-gauntlet rejection and full diagnostics for each
removed replay path, including the forced-first-step pre-candidate rule. Summary extinction rows link
to the supported removal event at the same depth (`hard-pruned`, `dedup-removed`,
`score-width-culled`, or `diversity-culled`) instead of requiring consumers to infer cause from stage
adjacency. The stratified artifact reports five score-width and three dedup final losses; it contains
no hard-prune correctness alarm.

## Full-suite validation follow-up

The standalone research and probe-corpus assertion scripts were renamed from `*-unit-tests.mjs` to
`*-check.mjs` so Vitest no longer mis-discovers Node CLI checks as empty suites. The executable opt-in
registry descriptions now explicitly carry the `production default-OFF` marker required by the
existing drift test; no flag default changed. `npm run test:unit` subsequently passed all 82 files /
1,091 tests.

## Telemetry-volume hardening

`WinningLineageObserver` now filters removal-event detail to known-supported candidates by default,
while preserving aggregate candidate/support counts and cutoff metadata. An explicit
`retainAllRemovalDetails` option remains for tiny forensic runs. The 4+4 pilot rerun retained identical
outcomes, nodes, loss stages, and alarms, and its compact artifact remains approximately 12 KiB.

## Supersession note (2026-08-11 follow-up)

The 8-level lineage pilot remains a historical instrumentation check. Active status now lives in the
30-level same-configuration cohort and score/width forensic report linked from
[`../docs/future-work.md`](../docs/future-work.md); do not treat “run a bounded 8–15-level sample” as
the current next action.
