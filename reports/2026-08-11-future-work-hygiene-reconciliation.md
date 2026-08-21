# Future-work hygiene reconciliation (2026-08-11)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-11 — repository review of `docs/future-work.md` against current topic docs, implementation commits, and experiment dispositions
> **Decision:** keep `docs/future-work.md` as a short live queue of concrete next actions and explicit revisit triggers; remove completed build history and closed experiment narratives from the queue
> **Remaining gate:** none for this reconciliation

## Purpose

`docs/future-work.md` had gradually accumulated three different kinds of material:

1. genuinely open work with a concrete next action;
2. deliberately deferred work with a clear event that would make it worth revisiting; and
3. completed or closed history retained inline because it was useful context when the item was originally investigated.

That third category had become large enough to obscure the first two. This pass reconciles the queue against the repository's current canonical docs and reports and moves the live file back to its stated purpose.

No solver behavior was changed and no new solver experiment was run in this reconciliation.

## Stale or non-future-work material removed from the live queue

### Solve-button variety

The entire `Find N Hints` open-items block was stale. `docs/solve-button-variety.md` is already a completed-work/current-behavior reference. The supposedly open decisions were resolved and implemented in July:

- the complete-DFS safety ceiling is the staged 1,000 / 2,500 / 5,000 cap design;
- the two `Find all` variants are shipped;
- tier values are deliberate defaults, not pending tuning work absent measured slowness;
- the `navDensity`-aware preflight warning/threshold decision is shipped; and
- complete-mode browser worker parallelism subsequently shipped as well.

Therefore no solve-button variety item remains in the live queue. Revisit only if real usage produces a concrete latency/cap/UX problem.

### Persistent level IDs

Persistent IDs shipped across all three corpora in July and are described by the current data/provenance docs. A section whose only status is `Complete` does not belong in a file advertised as the live future-work queue.

### Completed campaign summaries

Campaigns 0–3 remain useful chronology, but `docs/solver-development-roadmap.md` is their canonical historical home. The live queue now links that roadmap rather than repeating completed/retired campaign narratives inline.

### Closed rule-recognition findings and closed solver experiments

Portal parity, the no-gap rule-recognition questions, meet-in-the-middle/frontier work, backward exact reachability, backward-route guidance, axis-aware connectivity, `freeInt >= 1` reachability dilation, fresh-pocket bridging, static must-cross forced-edge propagation, CP-SAT-as-production-tier, and other measured negatives remain documented in their dated reports/canonical topic docs. They no longer occupy hundreds of lines in the live queue.

The point is not to erase negative results. It is to keep their evidence in the reports where future agents can find it while preventing a live backlog from becoming a second development journal.

### `reports/hint-selection.json`

The loose-thread table called this an unexplained/quarantined artifact. Git history resolves it: it came from the July 2 read-only hint-selection analyzer used to calibrate the player-facing curator that shipped later the same day. The curator implementation commit explicitly records that calibration against the corpus. The JSON is therefore a historical calibration artifact, not an unresolved investigation. It remains in place as evidence; there is no future-work item attached to it.

### Standalone hint-candidate CLI

The `candidate-grid` technique was ported into `hint-workbench.mjs`, and the workbench is the consolidated default. The standalone CLI still exists and remains callable, but coexistence is not itself a task. Its removal is not queued unless maintenance burden or a concrete parity/migration need appears. This preserves the 2026-07-25 tool-comparison decision without making "maybe delete a still-working specialist CLI someday" look like active product work.

## Current live solver gates after reconciliation

The queue now distinguishes exact existing-feature promotion gates from broader research directions.

### Existing implementation promotion gates

1. **Revised `PRUNE_MC_NEIGHBOR_BUDGET`** — the old 725→739 full Corpus-2 A/B tested the pre-`a113d47` wiring. After that run, the prune was removed specifically from repair's seeded-random `takePly` survivor selection while remaining active in DFS/beam and deterministic repair sub-searches. The current wiring therefore needs a fresh deterministic full-population ON/OFF A/B. The old +14 result remains strong historical evidence for the rule, not the current implementation's final promotion verdict.
2. **`STRATEGY_MAIN_LOOP_LATE_RESERVE`** — mechanism pilot complete; frozen matched-budget full-population A/B remains the decision gate.

Current status for every retained/default-off solver experiment is separately canonicalized in `docs/solver-opt-in-experiment-ledger.md`. `OPT_IN_FEATURES` is not a backlog.

### Mechanic/search research with concrete next measurements

- instrument `crossingSlack` before using it as search policy;
- derive and shadow-test the locally-abstaining portal form of neighbor-budget reasoning;
- only after those cheaper steps, try bounded joint must-cross interface compatibility;
- perform the analogous interface-aware derivation pass for must-turn / adjacent-turn / surround;
- run descent-aware repair-stagnation probing before inventing more bounded repair operators;
- run the implemented wide-trove symmetry-boundary ranking and diagnose the highest independent orientation cliffs;
- implement the instrumentation-only first gate of the solver-interoperability/cooperation plan;
- test the homotopy/topological path-class axis in hint curation, where a real 16.6% cross-class blind spot was already measured; and
- re-probe the redirected corridor/intersection-capacity hypothesis before any articulation-point-derived production prune.

## Deferred work now expressed as triggers, not pseudo-tasks

The live queue keeps a short deferred section for things that should not consume work until a named condition occurs, including:

- systematic solver scaling, when a concrete change needs a cutoff/scaling curve;
- recipe cousins, after tighter family tiers produce a question they can answer;
- optional hint top-up generators, only after an explicit hint-gap report;
- AI-assisted manual solving, only after automated differential diagnosis leaves a narrow unresolved first-divergence question;
- memory-bandwidth/storage optimization, only after profiling again shows allocation pressure as dominant;
- emulator-backed Firestore rules tests, alongside the next substantive rules change; and
- the admin custom-claim cutover, after the required production/Firebase operation is available.

## Standing hygiene rule

A live queue item should now satisfy at least one of these:

1. it has a concrete next measurement/build step that is presently worth doing; or
2. it is explicitly deferred and names the event that should reopen it.

Completed work, closed negatives, and preserved experimental instruments belong in their canonical docs/reports and should be linked, not recopied as backlog prose.
