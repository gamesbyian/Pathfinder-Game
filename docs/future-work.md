# Future Work

This is the **live queue and status source of truth for genuinely open work**. It is intentionally short. Completed campaigns, closed experiments, and long evidence narratives belong in their canonical topic docs and dated reports, not here.

Last reconciled: **2026-08-11**. See [`../reports/2026-08-11-future-work-hygiene-reconciliation.md`](../reports/2026-08-11-future-work-hygiene-reconciliation.md) for the cleanup that removed stale completed/closed material.

For retained/default-off solver features, also read [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). `OPT_IN_FEATURES` records production default polarity, not a backlog.

For how the active solver-research programmes fit together, read [`solver-research-operating-model.md`](solver-research-operating-model.md). Its core pipeline is **semantic truth -> controlled evidence -> failure classification -> missing representation/artifact -> shadow evaluation -> narrow intervention -> population verdict**. Use it to route work among family analysis, heuristic gaps, interoperability, repair, solver-aware domain architecture, and allocation/control instead of treating them as independent queues.

Historical solver campaign chronology and the still-useful diagnosis -> generalize -> verify -> refresh method live in [`solver-development-roadmap.md`](solver-development-roadmap.md).

## Operating rule: promotion work serializes; observation does not

Production-changing descendants should wait when their design depends on an unresolved promotion gate. **Read-only measurement should not sit idle merely because an unrelated full-population A/B is pending.** Crossing-slack analysis, family-boundary analysis, symmetry diagnosis, winning-lineage instrumentation, and offline solution mining may proceed whenever their interpretation does not depend on the pending production decision.

A read-only correlation remains evidence, not permission to create a score or hard prune.

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

**Interpret the result as control-plane evidence, not merely a flag verdict.** A broad win strengthens the case for participation floors; a loss despite recovering known starved cases strengthens the case that static reserve is too crude and later allocation should be failure-conditioned/online.

## Cross-cutting evidence programme

These are deliberately diagnostic first. They should inform several research tracks before any new production policy is chosen.

### 1. Crossing-slack measurement — analyzer implemented, run pending

`scripts/stress/mc-crossing-slack-analysis.mjs` reuses the exact `computeMcNeighborBudget` derivation without changing solver behavior. It measures `crossingSlack = freeInt - forcedFutureNeighbourRevisits` on the oracle-labelled atlas and unique known-valid solution prefixes, buckets by depth and remaining must-cross count, separates dead residual branches from already-gauntlet-pruned branches, and reports both sample-weighted and level-balanced solution-prefix summaries. Negative slack on an oracle-alive branch or known-valid prefix is a soundness alarm.

**Next action:** run it now; it does not need to wait for the revised neighbor-budget A/B. Ask whether low-but-nonnegative slack separates dead residual branches from live/winning prefixes after controlling for depth and remaining must-cross. Treat any positive signal first as a neutral semantic fact that could later serve beam retention, repair description, admissible-order ties, family diagnosis, or eventually a proof.

### 2. Wide family-boundary analysis — tooling implemented, run pending

Use the existing family boundary tooling over the wide variant trove to identify independent robust/fragile/starved/basin-sensitive families. Family analysis should act as a **routing layer**: robust failures nominate missing representation; fragile failures nominate ordering/retention/interoperability; starved fitting configs nominate allocation.

### 3. Winning-lineage survival instrumentation

**Plan:** [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md).

Existing winning-path archaeology measures local correct-child rank but not whether any known-valid solution lineage survives the real beam frontier.

**Next action:** add observation-only beam instrumentation that labels, without guiding search, whether known-valid prefixes are generated, hard-pruned, dedup-displaced, score/width-culled, or retained. Report **winning-support coverage by depth** across all available solution families, first/final known-winning extinction depth, cull margins, and canonical work after known-support extinction.

This is high leverage because it can distinguish heuristic gaps, beam-retention/dedup problems, correctness alarms, and simple budget/width issues before another score term is invented.

### 4. Contrastive winning-prefix branch atlas

After the winning-prefix replay/index machinery exists, use selected referee-valid prefixes as controlled branch points. Label legal siblings as live/dead with CP-SAT/reference machinery where tractable, then compare neutral facts between siblings from the **same parent state**.

This is a cleaner precursor to online failure learning/CEGAR than comparing arbitrary live and dead states. Candidate quantities include crossing slack, landmark completion-interface counts, residual volume, portal/flipper state, separator/interface capacity, score terms, and admissible slack.

## Dynamic must-cross resource/interface frontier

**Synthesis:** [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md).

The latest analysis strengthens one broad conclusion: raw `reqInt` and simple root-level must-cross geometry are not the main remaining problem. The promising signal is **dynamic destruction of future completion opportunity** as the path consumes cells, axes, revisits, and interfaces.

After interpreting crossing-slack measurement, pursue the proof-heavy descendants in this order unless the evidence redirects them:

1. **Locally-abstaining portal extension.** Re-derive the neighbor-budget proof so portal levels are not rejected wholesale when the particular required neighbour is an ordinary non-portal cell. Preserve all existing exclusions; do not simply remove the portal guard. Stored-solution replay -> shadow harness -> live A/B only if it earns one.
2. **Bounded joint must-cross interface compatibility.** Enumerate conservative local completion patterns for interacting pending crossings and ask whether any mutually compatible combination remains. This is the principled successor to the falsified static forced-edge rule, not a retry of it.

Do not turn the current solver comfort band into editor restrictions. Treat it as a moving benchmark frontier and keep pushing it outward.

## Other mechanic-derived inference

### Must-turn / adjacent-turn / surround completion interfaces

Must-cross benefited from explicitly deriving what future local interfaces its rules force. Must-turn, adjacent-turn, and surround have not yet received the same state-conditioned treatment.

**Next action:** derive candidate necessary conditions on paper first, expressed in terms of remaining entry/exit axes, chirality, candidate satisfaction cells, and local path state. Falsify them against stored solutions / independent truth before writing production pruning code. Do not repeat already-measured plain reachability or copied-MST counterparts.

Prefer exposing any useful quantity first as a neutral semantic state fact described in the language of [`mechanic-state-contracts.md`](mechanic-state-contracts.md), so it can be tested as a proof, beam descriptor, repair descriptor, or interoperability artifact rather than being born prematurely as one technique's score.

### Surround-landmark clean-orbit rule change

This is a **product decision**, not a solver cleanup. The current rules allow scattered visits to the eight neighbours; a clean continuous orbit would be a different win condition. Existing corpus evidence says scattered solutions are the norm, so changing the rule would invalidate a large amount of current solution data and may make some levels unsolvable.

**Next action:** none until an explicit product decision asks whether the rule should change. If reopened, first measure feasibility/regeneration cost before changing code.

## Symmetry / variant-family diagnosis

**Current synthesis:** [`../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md). **Current control audit:** [`../reports/2026-08-11-symmetry-control-audit.md`](../reports/2026-08-11-symmetry-control-audit.md). **Tooling plan:** [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md).

The old universal orientation claim is stale. Different diagnosed fragile families implicate different mechanisms, and current code contains several additional symmetry confounds that must be controlled before declaring a heuristic gap:

1. semantic equivariance violation;
2. intentional directional templates/strategies;
3. fixed E/W/S/N tie-breaking among equal scores/slack;
4. repair's coordinate-derived PRNG streams and survivor-index ordering;
5. only after those, emergent frontier/retention/search asymmetry.

**Next action:** run the wide boundary tooling, then extend the existing family-pair/divergence path with semantic equivariance checks rather than building a new transform system. For repair-involved cliffs, add a tooling-only explicit seed override so isomorphic siblings can use the same abstract PRNG streams. Determine whether the first divergence is a semantic mismatch, directional policy, equal-score tie, stochastic trajectory, or genuine retention effect before doing deep score ablation.

Brute-force rotated/mirrored retries remain a symptom-hiding production workaround, not the research target.

### Metamorphic symmetry audit

Exact rotations/reflections can act as a solver test oracle. Corresponding transformed prefixes should agree on symmetry-respecting candidate sets, legality, mechanic substate, hard bounds, prune verdicts, and neutral metrics. Add this as an extension of existing geometry/family replay only when it serves active diagnosis. Intentionally directional templates are not failed invariants.

## Repair-search stagnation

**Master reference:** [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md).

The existing plateau penalty, exact relinking, current-form elite-prefix DFS, and turn-bias promotion paths have all been measured and are not live build tasks in their current forms. Constant tuning of burst length / elite diversity / stagnation threshold has also been exhausted.

The remaining evidence-backed question is whether useful interventions can be identified **during descent**, before an improving restart gets steered into the same length-short / turn-coupled basin.

**Next action 1:** add descent-aware shadow probing that records what a candidate intervention would have changed on otherwise-improving restarts without changing search.

**Next action 2:** before building another substantial prefix-editing operator, run a **rollback/causal-window census** on hard near-misses with known valid solutions: how far back must the path usually be changed before a viable alternative structural continuation exists? If the answer is usually the last 10-20%, suffix regeneration becomes plausible; if the decisive error is usually early, local repair surgery is probably the wrong architecture.

The re-scoped extend/detour idea remains behind this evidence gate.

## Solver interoperability and cooperative-search groundwork

**Architectural reference:** [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md). **Current sequencing:** [`solver-research-operating-model.md`](solver-research-operating-model.md).

The producer -> receptor framing remains authoritative, but the **current implementation gate is narrower than the full artifact ecosystem described in the master plan**.

First build only enough common representation to answer one shadow question:

> Does one producer emit replayable, structurally useful information that a named receptor does not independently rediscover before it matters?

Strongest initial comparison: beam survivors versus repair elites.

Minimum slice:

- replay-complete prefix/witness representation;
- common neutral metric projection;
- bounded beam-survivor sampling;
- bounded repair-elite sampling;
- offline/shadow novelty, overlap, and arrival-time comparison.

Do **not** yet build broad consumer hooks across every technique if this minimal comparison cannot establish non-redundant producer value.

If producer value exists, compare exact-prefix handoff against softer structural transfer (obligation order, region/interface state, attraction set). Preserve ordinary/fresh recipient search and a participation floor. Useful imported information can still lose solves by displacing native work.

## Cheap discovery lane: residual-interface segment mining

Several literature-inspired ideas should begin as one offline mining experiment over existing validated solutions rather than as separate solver implementations.

Search for subpaths that enter and leave through the same meaningful external interface and compare their consequences.

Potential evidence:

- same interface, different length/intersection delta -> detour gadget;
- excursions commute while preserving the external state -> partial-order relation;
- alternate segment preserves full future-relevant state -> safe repair-surgery candidate;
- a compact interface predicts interchangeability -> evidence for residual-interface abstractions useful to separators, repair, CEGAR, and interoperability.

This subsumes the current corridor/intersection-capacity question as one possible interface property. Do not build generalized separator DP/CEGAR/partial-order machinery before this cheap evidence exists.

## Differential reduction: conditional tooling extension

The existing automatic reducer is single-level/signature based. It does not currently expose a generic paired interestingness predicate.

If family work produces recurring relational cliffs, extend the **existing** reducer rather than creating another one. Candidate predicates include preserving A-fails/B-solves symmetry cliffs, large work ratios, winner flips, or a specific first-divergence mechanism while simplifying both members correspondingly.

**Trigger:** recurring differential specimens whose interpretation would materially benefit from reduction. Tool elegance alone is not a reason to build it.

## Failure-conditioned control / future scheduling

This is a distinct future umbrella from the closed cold-start portfolio scheduler.

Question:

> Given what the solver has learned during this solve so far, where should the next unit of canonical work go?

Potential evidence sources include starvation, beam collapse, repair plateau/descent signatures, contradiction depth, artifact arrival, and interoperability results.

If interoperability eventually succeeds, a work slice may have value because it solves **or** because it produces information that materially raises a later receptor's solve probability. A future scheduler should therefore consider expected solve value including measured information value, not only standalone per-technique hazard.

This is a future implication, not a current scheduler build task.

## Smaller research items with real evidence

### Homotopy / topological path-class curation axis

**Reference:** [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md#4-homotopy--topological-path-class-signatures--confirmed-real-2026-07-11-second-probe).

A real winding-number probe found that 12/19 qualifying must-cross-heavy published levels contain multiple topological path classes, and 16.6% of cross-class hint pairs are still rated similar by the current curator. The current production `featureDistance` still uses edge overlap, crossing placement, and must-cross order only.

**Next action:** prototype the topological class as a curation/analysis axis with a robust obstacle interior-point representation and verify that it improves displayed behavioral variety without breaking the existing gate/portal/must-cross coverage guarantees. This is a hint-quality/data improvement, not currently a direct solver-solve-rate project.

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
9. **Known solutions used in diagnostics are labels, not guidance.** Observation-only lineage/contrastive experiments must not alter candidate generation, ranking, retention, budgets, or random streams.
10. **Control symmetry confounds before heuristic conclusions.** Separate semantic mismatch, intentional directional policy, fixed tie order, and stochastic trajectory before calling an orientation cliff a heuristic gap.
11. **Prefer shared evidence.** A new measurement is especially valuable when it can route several programmes at once rather than answer one narrow tuning question.