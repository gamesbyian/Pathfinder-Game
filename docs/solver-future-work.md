# Solver future work

Deferred or exploratory solver work that is **not currently the top-ranked execution queue**.

| Question | Authority |
|---|---|
| What work is next? | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| How should research run? | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| How should portfolio work be allocated? | [`solver-scheduling-policy.md`](solver-scheduling-policy.md) |
| Does retained/default-off code await promotion? | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| How can variants help? | [`variant-level-research.md`](variant-level-research.md) |
| What did an experiment measure? | [`../reports/README.md`](../reports/README.md) + dated report |
| Historical future-work ledger | [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md) |

This file is intentionally a **short research backlog**, not an experiment diary. Completed measurements belong in dated reports; closed mechanisms belong in the opt-in ledger; current ranked work belongs in the queue. Before implementing anything here, check current code, the research-status index, [`tooling-catalog.md`](tooling-catalog.md), the queue, and the ledger.

## Research principles for this backlog

- Prefer a new source of information, representation, operator, or search paradigm over another nearby scoring profile.
- Prefer systematic configuration/racing over serial hand-tuning when the hypothesis is “some combination of these knobs may work.”
- Prefer exact/shadow diagnosis before changing heuristic behavior.
- Prefer fixed-work portfolio competition over additive dead-last retries.
- Prefer a small falsifying pilot before broad compute.
- Separate discovery/tuning from confirmation.
- Treat Corpus 2 and heavily mined variant families as development data, not automatic evidence of generalization.
- A technique that already fails at substantial/full isolated budget has a search-quality problem until contrary evidence shows useful late hazard.

## High-value deferred programs

### Maintained exact/reference formulation

**Why it matters:** many current questions are being answered by observing the heuristic solver's failures. An independent exact or bounded reference provides cleaner labels for whether a prefix, retreat, mechanic commitment, or reduced instance is genuinely completable.

CP-SAT/reference tooling already exists and has been useful for repair retreat and prefix feasibility. The missing step is to make it a maintained research instrument rather than an occasional side experiment.

Useful increments:

1. inventory which mechanics/full-level sizes are modeled exactly today;
2. add small-instance differential tests against the canonical referee;
3. support explicit-prefix completion queries and reduced-instance exact controls;
4. record model limitations and approximation direction explicitly;
5. use it to produce exact-live/dead labels for beam/DFS lineage, repair interfaces, and new propagator tests;
6. only expand toward full-level competition if measurements justify the engineering cost.

The reference model does **not** need to beat production. Its value is independent truth.

### Restart/randomization study for systematic search

The repair multi-seed result shows that early stochastic commitments can materially change outcomes. That should trigger a systematic question rather than another seed-specific patch:

> How variable is solve/work behavior across legal randomized tie-breaks or restart points for DFS/admissible/related systematic search?

Start with an observation-only population:

- repeat selected hard levels across deterministic seed salts/tie-break perturbations;
- measure solve probability and work distribution, not only best observed run;
- identify heavy-tail or bimodal cases;
- compare bounded geometric/Luby-like/restart schedules with equivalent aggregate work;
- preserve an unrandomized control.

A positive result would justify a generic restart action for the scheduler. A negative result closes a whole class of “try another ordering seed” speculation cheaply.

### Learned failure / reason-producing propagation

Current pruning mostly asks whether generic bounds prove a state dead. It does little to explain a conflict and reuse that explanation later in the same solve.

Investigate incrementally rather than attempting a SAT-style rewrite:

1. identify common dead-state detections whose reason can be represented as a small set of commitments/resources;
2. prove the reason sound and determine its scope;
3. memoize/reuse those reasons as local nogoods inside one solve;
4. measure whether they actually prevent repeated exploration rather than merely add bookkeeping;
5. if successful, explore non-chronological backtracking or richer reason-producing propagators.

The existing repair-scoped exact-state nogood cache is precedent, not completion of this idea. Avoid unsound global keys that omit future-relevant state.

### Automatic algorithm configuration and portfolio construction

The solver has enough configurable dimensions that manual profile design is no longer an efficient exploration method. Candidate dimensions include weight vectors, structural templates, direction, beam width/diversity, admissible tie-breaks, seeds/restarts, eligibility rules, and budget bands.

Deferred work beyond the scheduler's first static version:

- expose a clean conditional configuration schema over existing knobs;
- add bounded racing/successive-elimination support so poor configs die early;
- optionally integrate an external configurator offline if the plumbing cost is justified;
- optimize marginal portfolio coverage/work rather than standalone solve count;
- use grouped/held-out validation and report selection procedure;
- distill successful configurations into a small understandable production action set rather than preserving the entire search space as named profiles.

### Generalization/challenge corpus maintenance

Once the first locked/fresh transfer cohort exists, maintain it as a renewable resource:

- never inspect exact failures while a treatment is being designed against it;
- once repeated inspection begins, reclassify it as development data;
- replenish with fresh generated/editor-like levels under declared generation rules;
- keep challenge distributions distinct enough to detect overfitting to current stress-generation quirks;
- keep sibling variants in one split.

This program is about claim quality, not runtime capability, but it protects every later research result.

## Search-quality directions that remain plausible

### Beam retention and survivor selection

Exact-prefix evidence shows viable candidates can be generated and then lose to higher-ranked dead material. Continue with causal retention research:

- first-divergence and live/dead sibling labels;
- frontier churn and exact-live survival probability;
- dedup/near-tie/diversity interactions;
- state-conditioned width or retention only when the descriptor predicts extinction;
- held-out family confirmation.

Do not treat larger width as monotonically better; current evidence already shows width/diversity inversions.

### Repair operator quality

Plain repair has unique deep capability, but most hard residual levels still fail after large isolated budgets. Open questions should therefore change the trajectory or edit operator rather than simply extend it:

- exact-informed choice of retreat/edit interface;
- initialization diversity and restart policy;
- state-conditioned ruin size;
- alternative elite diversity/selection;
- operators that preserve scarce must-cross/portal/length resources.

The CP-SAT retreat finding that some diverged elites have zero rollback slack is a warning against indiscriminate deeper backtracking.

### State-conditioned must-cross reasoning

Unconditional must-cross attraction is closed. The remaining plausible form is a live-state policy that distinguishes when to target, defer, or reserve a second approach. Require recurrence across unrelated levels/families and shadow separation before touching scoring.

### Distance guidance distinct from admissible pruning

`6f00baf` correctly tightened pruning distance semantics but changed finite-budget guidance behavior. The global legacy-guidance swap was net negative; the dead-last retry recovered a few solves by buying extra search.

A genuinely open form would derive a better **guidance-specific** distance or opportunity-cost feature, validated by first-divergence evidence, rather than replaying the old map globally or adding another whole-ladder retry.

## Representation and interoperability ideas

### Typed producer → receptor artifacts

One search stage may occasionally discover useful information another cannot cheaply rediscover. Potential examples include proven dead interfaces, repair elites, exact-live prefix descriptors, or frontier scarcity signals.

Do not build a general blackboard. A handoff must satisfy the producer/receptor contract in [`solver-research-operating-model.md`](solver-research-operating-model.md): demonstrated receptor limitation, novel useful information, timely arrival, bounded storage/replay cost, independent control, positive shadow evidence, and matched-work benefit.

### Queryable analytical layer

Only pursue a new analytical store if repeated joins among run identity, attempt telemetry, static features, family identity, oracle labels, and experiment arms continue spawning bespoke scripts after the current census/lifecycle infrastructure is extended.

Requirements:

- existing manifests remain the source of comparability truth;
- generated views are rebuildable;
- canonical raw evidence stays in existing JSON/JSONL/artifact forms where appropriate;
- no second production-policy truth source;
- new infrastructure must replace repeated one-off work, not merely centralize it aesthetically.

## Architecture/runtime ideas

Runtime research is ranked separately in [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md). Capability work should remember that implementation speed increases effective search under latency limits, but pure-speed and policy evidence remain separate.

A native/WASM search-kernel prototype is now explicitly worth a **bounded feasibility benchmark**, not a rewrite commitment. If representative search is not materially faster after boundary/marshalling costs, close it and continue V8 optimization.

## Explicitly demoted patterns

Do not treat these as open research directions without materially new evidence:

- another generic dead-last whole-ladder retry;
- another global seed fan-out that simply buys more total work;
- another hand-authored scoring profile whose novelty is only weights/name;
- widening an existing coarse repair gate by trying nearby thresholds;
- broad extra repair budget after full-budget failures;
- universal beam-width increases;
- production rotate/mirror retries instead of diagnosing symmetry bias;
- giant variant generation before defining the unanswered question and analysis plan;
- full-corpus A/Bs for ideas already falsified by a narrow causal test;
- retaining closed experimental code solely as an archive.

## History

Detailed pre-consolidation ideas, experiment narratives, old queue states, and concluded follow-ups are preserved in [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), and dated reports. This live file should stay about **plausible future work**, not chronology.
