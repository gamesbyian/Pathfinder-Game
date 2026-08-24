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

## Entry contract for future-work ideas

An idea in this file is a **question**, not authorization to build the final mechanism. Before substantial implementation, define:

1. **mechanism premise:** what limitation it addresses and why current evidence points there;
2. **smallest informative pilot:** the cheapest test that could falsify or materially weaken the premise;
3. **control/comparator:** including equal total work for search-policy alternatives;
4. **evidence role:** discovery/tuning vs confirmation vs transfer;
5. **success gate:** what result would justify the next increment;
6. **failure/stop gate:** what result closes or demotes the tested form;
7. **scope of implementation:** prototype plumbing should be disposable unless the pilot earns expansion;
8. **promotion path:** how an offline effect becomes legal level-blind production behavior.

Do not turn a deferred idea into a framework project before the pilot demonstrates value. Do not change the success criterion after results arrive without calling the next test exploratory.

## Research principles for this backlog

- Prefer a new source of information, representation, operator, or search paradigm over another nearby scoring profile.
- Prefer systematic configuration/racing over serial hand-tuning when the hypothesis is “some combination of these knobs may work.”
- Prefer exact/shadow diagnosis before changing heuristic behavior.
- Prefer fixed-work portfolio competition over additive dead-last retries.
- Prefer a small falsifying pilot before broad compute.
- Separate discovery/tuning from confirmation.
- Treat Corpus 2 and heavily mined variant families as development data, not automatic evidence of generalization.
- A technique that already fails at substantial/full isolated budget has a search-quality problem until contrary evidence shows useful late hazard.
- Do not optimize a research proxy after it becomes easy to measure. Lineage survival, badness, profile similarity, exact-label catch rate, and scheduler prediction accuracy matter only insofar as they improve actual solve/work/correctness outcomes.
- Prefer a Pareto view where capability and cost trade off. A scalar score can hide rare exclusive solves or expensive tails.

## High-value deferred programs

### Maintained exact/reference formulation

**Why it matters:** many current questions are being answered by observing the heuristic solver's failures. An independent exact or bounded reference provides cleaner labels for whether a prefix, retreat, mechanic commitment, or reduced instance is genuinely completable.

CP-SAT/reference tooling already exists and has been useful for repair retreat and prefix feasibility. The missing step is to make it a maintained research instrument rather than an occasional side experiment.

Useful increments:

1. inventory which mechanics/full-level sizes are modeled exactly today;
2. classify every model component as exact, one-sided relaxation, or unsupported;
3. add small-instance differential tests against the canonical referee in **both directions**;
4. support explicit-prefix completion queries and reduced-instance exact controls;
5. record model limitations, timeout/unknown states, and approximation direction explicitly;
6. use it to produce exact-live/dead labels for beam/DFS lineage, repair interfaces, and new propagator tests;
7. only expand toward full-level competition if measurements justify the engineering cost.

**Hard guardrail:** never report `UNSAT`/dead as puzzle truth from a model that contains a relaxation, omitted mechanic, timeout, or unproven encoding. Approximate models may prove only what their direction logically supports.

**Pilot gate:** demonstrate reliable bidirectional agreement on a bounded suite plus useful turnaround on at least one active research question before broadening model scope.

**Stop gate:** if model maintenance grows faster than the number/value of questions it resolves, keep only the exact/reduced query forms that have demonstrated research value.

The reference model does **not** need to beat production. Its value is independent truth.

### Restart/randomization study for systematic search

The repair multi-seed result shows that early stochastic commitments can materially change outcomes. That should trigger a systematic question rather than another seed-specific patch:

> How variable is solve/work behavior across legal randomized tie-breaks or restart points for DFS/admissible/related systematic search?

Start with an observation-only population:

- repeat selected hard levels across a **prespecified** deterministic seed/tie-break set;
- measure solve probability and the work distribution, not only the best observed run;
- identify heavy-tail or bimodal cases;
- compare bounded geometric/Luby-like/restart schedules with equivalent aggregate work;
- preserve an unrandomized control;
- account for **all** restart work in the treatment, not only the successful seed's work.

Do not cherry-pick the best seed and then compare it against a single deterministic control. If seeds were searched, the best seed is tuning evidence. A production restart policy must specify its generic seed/schedule in advance and pay for failed restarts too.

**Pilot gate:** show reproducible across-seed variance on unrelated levels and a restart schedule that improves the solve/work frontier at equal aggregate work.

**Stop gate:** if variance is small or best schedules do not beat simply continuing the baseline search at equal work, close systematic-search restart expansion rather than proliferating seed actions.

A positive result would justify a generic restart action for the scheduler. A negative result closes a whole class of “try another ordering seed” speculation cheaply.

### Learned failure / reason-producing propagation

Current pruning mostly asks whether generic bounds prove a state dead. It does little to explain a conflict and reuse that explanation later in the same solve.

Investigate incrementally rather than attempting a SAT-style rewrite:

1. identify common dead-state detections whose reason can be represented as a small set of commitments/resources;
2. prove the reason sound and determine exactly which future-state fields its validity depends on;
3. instrument repeated encounters first to estimate theoretical reuse opportunity;
4. memoize/reuse those reasons as local nogoods inside one solve;
5. cap memory/storage and measure lookup/bookkeeping overhead;
6. measure whether they actually prevent repeated exploration rather than merely add bookkeeping;
7. if successful, explore non-chronological backtracking or richer reason-producing propagators.

The existing repair-scoped exact-state nogood cache is precedent, not completion of this idea. Avoid unsound global keys that omit future-relevant state.

**Hard guardrails:** no cross-level persistent learning in cold capability; no approximate “reason” may become a hard reject; every nogood identity must include all state needed for its proof scope.

**Pilot gate:** show that an exact/sound reason recurs often enough on real hard searches to repay storage/lookups and saves measured work without solve loss.

**Stop gate:** if repeated-conflict opportunity is rare or bookkeeping exceeds avoided work, close that reason class before building a general conflict-learning architecture.

### Automatic algorithm configuration and portfolio construction

The solver has enough configurable dimensions that manual profile design is no longer an efficient exploration method. Candidate dimensions include weight vectors, structural templates, direction, beam width/diversity, admissible tie-breaks, seeds/restarts, eligibility rules, and budget bands.

Deferred work beyond the scheduler's first static version:

- expose a clean conditional configuration schema over existing knobs;
- bound ranges before searching them; do not let an external configurator invent an effectively unbounded policy language;
- add bounded racing/successive-elimination support so poor configs die early;
- optionally integrate an external configurator offline if the plumbing cost is justified;
- optimize marginal portfolio coverage/work and rare exclusive capability rather than standalone solve count;
- use grouped/held-out validation and report the number/range of configurations searched;
- compare against simple baselines so complexity must earn its place;
- distill successful configurations into a small understandable production action set rather than preserving the entire search space as named profiles.

**Pilot gate:** demonstrate that systematic search finds configurations/portfolio combinations materially better than the best existing hand-authored candidates on development data, then retain improvement on independent confirmation.

**Stop gate:** if a simple current-action subset/reorder captures nearly all measured headroom, do not build a large configurator integration merely because the parameter space is interesting.

### Generalization/challenge corpus maintenance

Once the first locked/fresh transfer cohort exists, maintain it as a renewable resource:

- never inspect exact failures while a treatment is being designed against it;
- expose aggregate results only when practical during iteration, keeping exact identities/failure traces hidden until a decision is frozen;
- once repeated exact inspection begins, reclassify that cohort as development data;
- replenish with fresh generated/editor-like levels under declared generation rules;
- keep challenge distributions distinct enough to detect overfitting to current stress-generation quirks, not merely “harder versions of the same generator”;
- keep sibling variants in one split;
- record generator/version/distribution metadata so transfer sets can be compared over time.

The challenge set should test **distributional transfer**, not become a secret leaderboard that agents optimize against by repeated peeking.

**Pilot gate:** establish one reproducible holdout creation/split protocol and use it for at least one selected solver treatment.

**Stop/renewal gate:** once exact failures materially influence design, retire/reclassify the exposed set and create a new locked transfer cohort.

This program is about claim quality, not runtime capability, but it protects every later research result.

## Search-quality directions that remain plausible

### Beam retention and survivor selection

Exact-prefix evidence shows viable candidates can be generated and then lose to higher-ranked dead material. Continue with causal retention research:

- first-divergence and live/dead sibling labels;
- frontier churn and exact-live survival probability;
- dedup/near-tie/diversity interactions;
- state-conditioned width or retention only when the descriptor predicts extinction;
- simple controls such as width-only/random-neutral retention;
- held-out family confirmation.

Do not treat larger width as monotonically better; current evidence already shows width/diversity inversions. Do not optimize known-lineage survival as an end in itself; a treatment must improve actual cold solve/work.

**Pilot gate:** identify a recurring exact-live/exact-dead retention mistake and a neutral descriptor/intervention that changes that boundary without simply buying more width.

**Stop gate:** if candidate descriptors only separate the hand-picked extinction fixtures that inspired them, close/demote rather than adding another scoring dimension.

### Repair operator quality

Plain repair has unique deep capability, but most hard residual levels still fail after large isolated budgets. Open questions should therefore change the trajectory or edit operator rather than simply extend it:

- exact-informed choice of retreat/edit interface;
- initialization diversity and restart policy;
- state-conditioned ruin size;
- alternative elite diversity/selection;
- operators that preserve scarce must-cross/portal/length resources.

The CP-SAT retreat finding that some diverged elites have zero rollback slack is a warning against indiscriminate deeper backtracking.

Any initialization/seed-diversity proposal must compare against the same total work spent on baseline repair. “One of N seeds solves” is not enough if N multiplies the budget.

**Pilot gate:** show a changed operator/initialization produces a different and measurably more productive trajectory on exact/diagnosed failure cases at equal work.

**Stop gate:** if the new operator only improves intermediate badness or lineage/proxy metrics without increasing cold solves/work, close that form.

### State-conditioned must-cross reasoning

Unconditional must-cross attraction is closed. The remaining plausible form is a live-state policy that distinguishes when to target, defer, or reserve a second approach. Require recurrence across unrelated levels/families and shadow separation before touching scoring.

**Pilot gate:** a state descriptor must separate exact-live/dead or known successful/failing must-cross choices better than current local heuristics on held-out parents.

**Stop gate:** if the descriptor is effectively a family identifier, only works on the cases used to invent it, or requires known-solution information at runtime, reject it.

### Distance guidance distinct from admissible pruning

`6f00baf` correctly tightened pruning distance semantics but changed finite-budget guidance behavior. The global legacy-guidance swap was net negative; the dead-last retry recovered a few solves by buying extra search.

A genuinely open form would derive a better **guidance-specific** distance or opportunity-cost feature, validated by first-divergence evidence, rather than replaying the old map globally or adding another whole-ladder retry.

**Pilot gate:** identify a recurring ranking error caused specifically by the distance term and show a guidance quantity that corrects it in shadow/paired traces without changing pruning truth.

**Stop gate:** do not continue trying blended/legacy distance formulas merely because some threshold somewhere recovers a selected regression population.

## Representation and interoperability ideas

### Typed producer -> receptor artifacts

One search stage may occasionally discover useful information another cannot cheaply rediscover. Potential examples include proven dead interfaces, repair elites, exact-live prefix descriptors, or frontier scarcity signals.

Do not build a general blackboard. A handoff must satisfy the producer/receptor contract in [`solver-research-operating-model.md`](solver-research-operating-model.md): demonstrated receptor limitation, novel useful information, timely arrival, bounded storage/replay cost, independent control, positive shadow evidence, and matched-work benefit.

Count artifact production, storage, replay, and branch-multiplication cost. Information is not free because it was produced by work the solver was already doing.

**Stop gate:** if the receptor can cheaply rediscover the same information, the artifact arrives too late, or consumption displaces more useful search, keep the stages independent.

### Queryable analytical layer

Only pursue a new analytical store if repeated joins among run identity, attempt telemetry, static features, family identity, oracle labels, and experiment arms continue spawning bespoke scripts after the current census/lifecycle infrastructure is extended.

Requirements:

- existing manifests remain the source of comparability truth;
- generated views are rebuildable;
- canonical raw evidence stays in existing JSON/JSONL/artifact forms where appropriate;
- no second production-policy truth source;
- new infrastructure must replace repeated one-off work, not merely centralize it aesthetically;
- define the specific repeated queries it will eliminate before choosing a database/schema.

**Stop gate:** if two or three reusable join helpers solve the real pain, prefer them to a general research database.

## Architecture/runtime ideas

Runtime research is ranked separately in [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md). Capability work should remember that implementation speed increases effective search under latency limits, but pure-speed and policy evidence remain separate.

A native/WASM search-kernel prototype is explicitly worth a **bounded feasibility benchmark**, not a rewrite commitment. The benchmark must include boundary/marshalling overhead, warm and steady-state JS behavior, representative short and long searches, identical logical work/decisions where possible, and end-to-end caller cost.

**Stop gate:** if representative end-to-end speed is not materially better, close it and continue V8 optimization. Do not rationalize a rewrite from an isolated microkernel result.

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
- retaining closed experimental code solely as an archive;
- building a scheduler/configuration/reference-model framework before its smallest value-of-information pilot succeeds;
- optimizing an intermediate research metric after actual solve/work improvement has failed to appear.

## History

Detailed pre-consolidation ideas, experiment narratives, old queue states, and concluded follow-ups are preserved in [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), and dated reports. This live file should stay about **plausible future work and its gates**, not chronology.