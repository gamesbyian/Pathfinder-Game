# Future Work

This is the **live queue and status source of truth for genuinely open work**. It is intentionally short. Completed campaigns, closed experiments, and long evidence narratives belong in their canonical topic docs and dated reports, not here.

Last reconciled: **2026-08-11**. See [`../reports/2026-08-11-future-work-hygiene-reconciliation.md`](../reports/2026-08-11-future-work-hygiene-reconciliation.md) for the cleanup that removed stale completed/closed material.

For retained/default-off solver features, also read [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). `OPT_IN_FEATURES` records production default polarity, not a backlog.

Historical solver campaign chronology and the still-useful diagnosis → generalize → verify → refresh method live in [`solver-development-roadmap.md`](solver-development-roadmap.md).

## Immediate solver decision gates

### 1. Revised must-cross neighbor-budget prune: fresh full-population A/B

**Evidence:** [`../reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md), [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md), and [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).

`PRUNE_MC_NEIGHBOR_BUDGET` is sound on the existing evidence and the original wiring moved deterministic Corpus-2 from 725/1700 to 739/1700, with 42 gained and 28 lost. That run is **not the promotion verdict for the current implementation**.

After that A/B, commit `a113d47` identified a specific churn mechanism: repair's seeded-random `takePly` chooses an index into the surviving candidate array, so pruning one dead candidate can reindex the same random draw onto a different move. The current implementation therefore skips neighbor-budget only for that random candidate-selection path while retaining it for DFS, beam, and deterministic repair sub-searches.

**Next action:** run a fresh deterministic full Corpus-2 ON/OFF A/B of the revised wiring. The old +14 result remains evidence for the rule and the pre-`a113d47` implementation, not a substitute for this run.

### 2. Main-loop late reserve: frozen full-population A/B

**Evidence/protocol:** [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md), [`../reports/2026-08-08-main-loop-profile-order-starvation.md`](../reports/2026-08-08-main-loop-profile-order-starvation.md), and [`../reports/2026-08-10-main-loop-late-reserve-mechanism-pilot.md`](../reports/2026-08-10-main-loop-late-reserve-mechanism-pilot.md).

The current census found 34/975 unsolved Corpus-2 levels with a historically matched, budget-fitting config that currently receives zero nodes, including 14 hard deterministic matches. The reserve-not-reorder mechanism is implemented default-off; its pilot activated all beneficiaries and recovered 1/14 hard matches at the tested arm.

**Next action:** execute the frozen fresh-control, deterministic matched-budget full-population A/B. The 14-level cohort is only a mechanism check; the full population is the acceptance population because this codebase has repeatedly measured finite-budget reordering/allocation effects to be non-monotonic.

## Dynamic must-cross resource/interface frontier

**Synthesis:** [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md).

The latest analysis strengthens one broad conclusion: raw `reqInt` and simple root-level must-cross geometry are not the main remaining problem. The promising signal is **dynamic destruction of future completion opportunity** as the path consumes cells, axes, revisits, and interfaces.

After the revised neighbor-budget promotion gate above, pursue these in order:

1. **Crossing-slack measurement — analyzer implemented, run still pending.** `scripts/stress/mc-crossing-slack-analysis.mjs` now reuses the exact `computeMcNeighborBudget` derivation without changing solver behavior. It measures `crossingSlack = freeInt - forcedFutureNeighbourRevisits` on the existing oracle-labelled atlas and on unique known-valid solution prefixes, buckets by depth and remaining must-cross count, separates dead residual branches from already-gauntlet-pruned branches, and reports both sample-weighted and level-balanced solution-prefix summaries. It also treats negative slack on an oracle-alive branch or known-valid prefix as a soundness alarm. **Next action:** run the analyzer and interpret whether low-but-nonnegative slack separates dead residual branches from live/winning prefixes. Treat any signal as a diagnostic representation first, not a score.
2. **Locally-abstaining portal extension.** Re-derive the neighbor-budget proof so portal levels are not rejected wholesale when the particular required neighbour is an ordinary non-portal cell. Preserve all existing exclusions; do not simply remove the portal guard. Stored-solution replay → shadow harness → live A/B only if it earns one.
3. **Bounded joint must-cross interface compatibility.** Enumerate conservative local completion patterns for interacting pending crossings and ask whether any mutually compatible combination remains. This is the principled successor to the falsified static forced-edge rule, not a retry of it.

Do not turn the current solver comfort band into editor restrictions. Treat it as a moving benchmark frontier and keep pushing it outward.

## Other mechanic-derived inference

### Must-turn / adjacent-turn / surround completion interfaces

Must-cross benefited from explicitly deriving what future local interfaces its rules force. Must-turn, adjacent-turn, and surround have not yet received the same state-conditioned treatment.

**Next action:** derive candidate necessary conditions on paper first, expressed in terms of remaining entry/exit axes, chirality, candidate satisfaction cells, and local path state. Falsify them against stored solutions / independent truth before writing production pruning code. Do not repeat already-measured plain reachability or copied-MST counterparts.

### Surround-landmark clean-orbit rule change

This is a **product decision**, not a solver cleanup. The current rules allow scattered visits to the eight neighbours; a clean continuous orbit would be a different win condition. Existing corpus evidence says scattered solutions are the norm, so changing the rule would invalidate a large amount of current solution data and may make some levels unsolvable.

**Next action:** none until an explicit product decision asks whether the rule should change. If reopened, first measure feasibility/regeneration cost before changing code.

## Repair-search stagnation

**Master reference:** [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md).

The existing plateau penalty, exact relinking, current-form elite-prefix DFS, and turn-bias promotion paths have all been measured and are not live build tasks in their current forms. Constant tuning of burst length / elite diversity / stagnation threshold has also been exhausted.

The remaining evidence-backed question is whether useful interventions can be identified **during descent**, before an improving restart gets steered into the same length-short / turn-coupled basin.

**Next action:** add descent-aware shadow probing that records what a candidate intervention would have changed on otherwise-improving restarts without changing search. Use that evidence before building another repair operator. The re-scoped extend/detour idea remains behind the broader append-only prefix-editing limitation and is not the first move.

## Solver interoperability and cooperative-search groundwork

**Master reference:** [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md).

The design is complete; implementation has not started. This is deliberately an instrumentation-first track, not a scheduler rewrite.

**First gate:** unchanged solver runs must emit bounded, typed artifacts that are materially non-redundant and have predictive or handoff value at equal canonical work. Build only the common artifact envelope, replay-complete witness representation, neutral metrics, producer adapters, bounded retention/reporting, and shadow analysis required to answer that question. Do not let imported artifacts alter search or allocation until the shadow gate is positive.

If positive, test one pairwise handoff at a time, preserving native/fresh starts and a participation floor.

## Symmetry / variant-family diagnosis

**Current synthesis:** [`../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md). **Tooling plan:** [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md).

The old universal orientation claim is stale. Different diagnosed fragile families currently implicate different navigation/attraction terms, so brute-force rotated/mirrored retries would paper over the symptom rather than explain it.

**Next action:** run the implemented read-only boundary tooling over the wide family trove, then apply transform validation, equal-work attempt traces, first-divergence replay, and ablations to the highest-ranked independent symmetry solve-status cliffs. Stop after either one intervention mechanism recurs across independent families or the top five produce distinct signatures. That result decides whether a bounded diversity treatment has a common mechanism to target.

## Smaller research items with real evidence

### Homotopy / topological path-class curation axis

**Reference:** [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md#4-homotopy--topological-path-class-signatures--confirmed-real-2026-07-11-second-probe).

A real winding-number probe found that 12/19 qualifying must-cross-heavy published levels contain multiple topological path classes, and 16.6% of cross-class hint pairs are still rated similar by the current curator. The current production `featureDistance` still uses edge overlap, crossing placement, and must-cross order only.

**Next action:** prototype the topological class as a curation/analysis axis with a robust obstacle interior-point representation and verify that it improves displayed behavioral variety without breaking the existing gate/portal/must-cross coverage guarantees. This is a hint-quality/data improvement, not currently a direct solver-solve-rate project.

### Corridor/intersection-capacity hypothesis

The original articulation-point distance/discrepancy hypothesis was refuted. The only surviving form is a different question: whether narrow separators/corridors bound how many revisits/intersections can still be realized on one side.

**Next action:** re-probe that capacity hypothesis offline before implementing any prune. Existing MST/flood-fill distance reasoning already subsumes the old length-based version.

## Deferred until a concrete trigger

These are not active jobs. Reopen only when the named condition occurs.

- **Systematic solver-scaling analysis:** when a concrete solver change needs a scaling curve or cutoff across board size/family tiers. The narrower `reqLen` sweep is already available.
- **Recipe cousins:** after symmetry/local/constrained-shuffle families produce a question that looser recipe-level variation can actually answer.
- **Optional hint-corpus top-up generators:** only after an explicit gap report from the existing enumeration/ablation/workbench tooling identifies a missing kind of solution evidence.
- **AI-assisted manual solving:** only after automated differential diagnosis isolates a narrow first-divergence question it cannot resolve.
- **Fixed repair-probe node budgets vs. short UI budgets:** only if a real materially sub-30s caller shows measured latency dominated by the fixed probe.
- **Tier-2/Tier-3 memory-bandwidth work:** only after profiling again shows allocation/storage pressure is a dominant solver cost.
- **State-dominance/transposition caching:** only with materially new evidence; sound duplicates were sparse and expensive to identify in the measured form.
- **Standalone hint-candidate CLI retirement:** the workbench now contains the `candidate-grid` technique and is the consolidated default, but the specialist CLI can remain until maintenance burden or a concrete parity/migration reason makes removal useful. Coexistence alone is not debt.
- **Emulator-backed Firestore rule tests:** alongside the next substantive `firestore.rules` change, not proactively.
- **Admin custom-claim production cutover:** once the required Firebase/production operation can be performed; see [`firestore-security-model.md`](firestore-security-model.md).

## Explicitly closed / do not rediscover from scratch

Use the linked evidence rather than reopening these because code or experimental switches still exist:

- **Current-form elite-prefix DFS, turn bias, and portal parity:** current dispositions in [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).
- **Meet-in-the-middle / stored bidirectional frontier:** closed by the corrected frontier measurement; state explosion remains far beyond practical storage before meet depth.
- **Backward exact static reachability:** redundant with distance + parity on the static graph.
- **Backward shortest-route scoring bias:** measured harmful; Pathfinder needs long legal wandering rather than standing shortest-path attraction.
- **Axis-aware connectivity and `freeInt >= 1` reachability dilation:** sound and computationally real, but negative in matched-budget solve outcomes. See [`../reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md).
- **Fresh-pocket bridging:** sound but nearly inert in the labelled dead-branch gap.
- **Static must-cross forced-edge propagation:** falsified against stored valid solutions. Any successor must reason over compatible completion patterns rather than assert one permanent edge pattern.
- **CP-SAT as a production solver tier:** explicitly rejected. It remains an offline oracle / hint / research source, not evidence that the browser solver solved a level.
- **Learned repair-winner classifier:** closed after the larger Corpus-2 rerun.
- **Repair constant tuning and exact-copy relinking:** measured dead ends in the current repair architecture.
- **Solve-button variety / Find-all safety/tier decisions:** complete and in production. See [`solve-button-variety.md`](solve-button-variety.md); do not treat its old July planning questions as open work.
- **Persistent level IDs:** complete across all three corpora; current behavior belongs in the data/provenance docs, not this queue.
- **`reports/hint-selection.json` identification:** resolved as a historical calibration output from the July 2 hint-selection analyzer that informed the shipped curator. It is evidence, not an unresolved orphan.

## Standing verification rules

These apply to future solver work before reporting complete:

1. **Published 160/160 is inviolable.** No change ships without `npm run solver:bench -- --check` and an appropriate before/after cost measurement.
2. **Feature-keyed, never level-identity-keyed.** See `check:no-solver-level-numbers`.
3. **Negative results are first-class.** Record disproven ideas in `reports/`; do not quietly abandon them and let the same idea reappear later.
4. **Memoization soundness is non-negotiable.** Any cache key must capture every future-relevant state variable its cached value depends on.
5. **Use canonical work for deterministic comparisons.** Distinguish solver work from wall-clock latency and treat deadline-truncated outcomes as indeterminate when appropriate.
6. **Cross-technique artifacts are evidence by default.** Incomplete signatures/correlations may guide ranking, retention, or allocation but may not become hard rejection without proof-quality equivalence.
7. **Dynamic-resource correlations remain guidance until proved.** A useful slack/interface signal may justify instrumentation or shadow evaluation; only a rule-derived necessary condition plus replay/oracle/property validation may become a hard prune.
8. **An A/B belongs to the exact wiring it tested.** If participation, ordering, budget, applicability, or random-candidate behavior changes afterward, explicitly decide whether the old run still answers the current promotion question. See [`investigation-report-conventions.md`](investigation-report-conventions.md).
