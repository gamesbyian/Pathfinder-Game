# Solver future work

Deferred or exploratory solver work that is **not currently the top-ranked execution queue**.

| Question | Authority |
|---|---|
| What work is next? | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| How should research run? | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| How should portfolio work be allocated? | [`solver-scheduling-policy.md`](solver-scheduling-policy.md) |
| How should unresolved future state be represented/reasoned about? | [`solver-residual-state-representation.md`](solver-residual-state-representation.md) |
| Does retained/default-off code await promotion? | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| How can variants help? | [`variant-level-research.md`](variant-level-research.md) |
| What did an experiment measure? | [`../reports/README.md`](../reports/README.md) + dated report |
| What did the 2026-08-24 external literature change? | [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md) |
| Historical future-work ledger | [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md) |

This file is intentionally a **short research backlog**, not an experiment diary. Completed measurements belong in dated reports; closed mechanisms belong in the opt-in ledger; current ranked work belongs in the queue. Before implementing anything here, check current code, the research-status index, [`tooling-catalog.md`](tooling-catalog.md), the queue, the ledger, [`solver-residual-state-representation.md`](solver-residual-state-representation.md) where future-interface/feasibility/beam/repair/caching questions are concerned, and the 2026-08-24 synthesis.

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
- For exact-resource constraints, do not assume “less used is better.” A dominance/prune needs a proof that one state's possible completions subsume another's.
- Keep **exact interfaces, relaxed over-approximations, restricted/representative sets, and predictive abstractions** separate. A useful predictor is not a cache key or hard prune.
- Keep **interface width, basin width, backdoor depth/distance to tractability, and exact-resource opportunity** separate unless evidence supports combining them.

## High-value deferred programs

### Maintained exact/reference formulation

**Why it matters:** many current questions are being answered by observing the heuristic solver's failures. An independent exact or bounded reference provides cleaner labels for whether a prefix, retreat, mechanic commitment, residual resource target, or reduced instance is genuinely completable.

CP-SAT/reference tooling already exists and has been useful for repair retreat and prefix feasibility. The missing step is to make it a maintained research instrument rather than an occasional side experiment.

Useful increments:

1. inventory which mechanics/full-level sizes are modeled exactly today;
2. classify every model component as exact, one-sided relaxation, or unsupported;
3. add small-instance differential tests against the canonical referee in **both directions**;
4. support explicit-prefix completion queries and reduced-instance exact controls;
5. record model limitations, timeout/unknown states, and approximation direction explicitly;
6. use it to produce exact-live/dead labels for beam/DFS lineage, repair interfaces, residual opportunity, and new propagator/reason tests;
7. use it to **falsify overcoarse residual interfaces** by searching for two states sharing a proposed signature but differing in exact continuation behavior;
8. where assumption/proof support is clean, treat cores/MCS-style diagnoses or boundary predicates as offline research outputs rather than runtime truth;
9. only expand toward full-level competition if measurements justify the engineering cost.

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

The broad “does search revisit failures?” premise has already split by search paradigm and should **not** be rerun generically.

- Repair already has a shipped per-call exact-signature dead-end cache. On hard repair-close cases, exact repeated dead-end signatures were common enough to save work. Its semantics are deliberately local and weak: a hit means that the randomized repair continuation previously dead-ended from that exact state/context, **not** that the state is logically unsatisfiable.
- Systematic DFS exact transposition was separately measured with a sound full-state signature and found weak, roughly 0.5–16% repeated-state opportunity rather than the misleading 92–99% seen under a loose unsound abstraction. Another exact DFS transposition-table push is therefore closed absent materially new evidence.
- Existing cheap sound prune reasons already cover many obvious dead states, so a learned reason that merely restates them late is unlikely to pay.

The remaining question is narrower and more interesting:

> Do expensive **sound** failures, across different exact states, share a compact structural reason that becomes knowable materially earlier than the solver currently rejects them?

Candidate reason vocabulary includes exact resource no longer attainable, residual maximum capacity below target, obligation isolation behind a cut, Hall/matching deficiency in a necessary relaxation, finite-state/resource nonattainment, joint resource/topology incompatibility, and assumption-based cores from validated exact models. These are hypotheses, not preapproved hard prunes.

Investigate observation-first:

1. collect a bounded sample of soundly dead situations from existing prune proofs, systematic exhaustion where proof scope is clear, and/or exact-prefix labels; keep these separate from repair's merely unproductive randomized dead ends;
2. group only candidate reason classes that arise from observed repeated structure, rather than inventing a large hand-written nogood language up front;
3. for every candidate class, state the proof scope and every state field its validity depends on;
4. measure recurrence across distinct exact states and unrelated parents;
5. measure the earliest point the reason could be known, the current rejection point, and work performed in between;
6. measure overlap with existing cheap prunes and exact-state caches;
7. estimate checking/storage cost before adding a hard reject;
8. only if one compact class earns its keep, prototype a bounded per-solve reason store or reason-producing prune for that class.

Conflict-directed backjumping is a separate later branch. It is warranted only if systematic-search failures demonstrably depend on a small subset of earlier decisions. Do not attach CBJ to randomized repair merely because both appear in conflict-learning literature.

**Hard guardrails:** no cross-level persistent learning in cold capability; no approximate “reason” may become a hard reject; every nogood identity must include all state needed for its proof scope.

**Pilot gate:** at least one compact reason class must be sound, recur across distinct states and unrelated parents, become available appreciably before current rejection, and plausibly save more work than it costs to check/store.

**Stop gate:** if abstractions collapse toward full-state identity, rarely recur, overlap almost entirely with current cheap prunes, or become recognizable only when the solver already rejects, close abstract nogood learning before building general conflict infrastructure.

### Automatic algorithm configuration and portfolio construction

The solver has enough configurable dimensions that manual profile design is no longer an efficient exploration method. Candidate dimensions include weight vectors, structural templates, direction, beam width/diversity, admissible tie-breaks, seeds/restarts, eligibility rules, and budget bands.

Deferred work beyond the scheduler's first static version:

- expose a clean conditional configuration schema over existing knobs;
- bound ranges before searching them; do not let an external configurator invent an effectively unbounded policy language;
- add bounded racing/successive-elimination support so poor configs die early;
- optionally integrate an external configurator offline if the plumbing cost is justified;
- optimize **marginal** portfolio coverage/work and rare exclusive capability rather than standalone solve count;
- treat continuation tranches as candidate actions rather than permanent entitlement;
- use grouped/held-out validation and report the number/range of configurations searched;
- compare against simple baselines so complexity must earn its place;
- distill successful configurations into a small understandable production action set rather than preserving the entire search space as named profiles.

**Pilot gate:** demonstrate that systematic search finds configurations/portfolio combinations materially better than the best existing hand-authored candidates on development data, then retain improvement on independent confirmation.

**Stop gate:** if a simple current-action subset/reorder captures nearly all measured headroom, do not build a large configurator integration merely because the parameter space is interesting.

Survival/hazard, bandit, or explicit value-of-computation scheduling belongs **after** the simple static-tranche scheduler demonstrates held-out value and leaves material residual headroom. If that gate is crossed, interface/basin/backdoor/conflict telemetry becomes a candidate dynamic feature family rather than current scheduler scope. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md).

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

### Residual representation and bounded future models

Durable concepts and role/soundness distinctions live in [`solver-residual-state-representation.md`](solver-residual-state-representation.md).

The third-wave literature adds four deferred questions. They are **not** four implementation projects.

1. **Exact interface/context:** does any bounded residual family admit a compact boundary state that is actually future-sufficient?
2. **Restricted/representative future set:** can a small retained family preserve materially more extension capability than scalar top-K beam selection?
3. **Relaxed future model:** is there a cheap over-approximation that proves new deadness/bounds beyond existing prunes?
4. **Counterexample-guided refinement:** when a coarse signature fails, do exact counterexamples repeatedly point to a small missing distinction rather than exploding toward full state?

Potential structural labels include:

- interface/frontier width;
- connectivity partition/boundary state;
- finite mechanic/product state;
- exact-resource counters/residues;
- solution density/abstract future mass;
- backdoor depth/distance to a tractable residual class.

**Pilot gate:** one small reduced/observational population shows a recurring compact structure that answers an existing ranked question better than current descriptors and can be falsified/validated with the reference model.

**Stop gate:** if interfaces immediately approach full state, width explodes, exact counterexamples require idiosyncratic fields, or a relaxed model duplicates current prunes, do not build DD/ZDD/CEGAR/backdoor infrastructure.

### Residual future opportunity beyond current prunes

The solver already uses length/intersection overflow, goal distance, parity, MP/MC lower bounds, connectivity, and related hard checks. Do **not** start a generic RCSP/label-setting rewrite or assume ordinary resource dominance transfers to exact targets.

The open feasibility question is narrower:

> Among states that pass the current prune gauntlet, is there a cheap residual quantity or safe relaxation that separates exact-live from exact-dead states materially earlier than current rejection?

Prespecify only a few families:

- **upper** residual capacity, complementing existing lower bounds;
- parity/congruence or small attainable-value summaries for exact length/intersections;
- residual component capacity and cut/bridge/corridor scarcity;
- joint obligation/topology summaries;
- a compact finite-state/resource propagation model where a mechanic subset genuinely admits one.

Possible roles must remain separate:

- proved one-sided condition -> candidate hard prune;
- safe over-approximation -> candidate relaxed bound/deadness proof;
- predictive but unsound -> ranking/beam/repair descriptor only;
- expensive exact/relaxed computation -> offline diagnostic/reference label;
- recurrent compact impossibility -> candidate learned-failure reason.

For exact targets, “less resource used” does not automatically dominate “more resource used.” A hard dominance relation needs a proof that one state's attainable completion set subsumes another's.

**Pilot gate:** a descriptor/relaxation adds reproducible early exact-live/dead separation beyond existing prune outcomes on unrelated parents and has plausible check cost.

**Stop gate:** if proposed summaries mostly duplicate existing prunes, rarely separate exact labels, or require near-exact residual solving to compute, do not expand generic completion-bound machinery.

### Beam retention and survivor selection

Exact-prefix evidence now distinguishes at least two failure shapes:

- **A/D-class extinction:** exact labels have repeatedly shown score-preferred dead material surviving while a lower-ranked exact-live sibling is lost, including width-saturated D cases;
- **B-class near-ties:** resolved cases have been live/live, so they should not automatically receive the same treatment.

The next question is not generic “make beam more diverse.” It is:

> At proven A/D extinction parents, does a small set of cheap level-blind descriptors reveal that the current survivor set spends multiple slots on states with effectively similar futures while an exact-live alternative occupies an underrepresented structural class?

The third-wave literature sharpens the ideal: a survivor set should be thought of as a **restricted representation** of true futures, and representative-set theory gives an exact bounded-width analogue where a small family collectively preserves extension capability. Pathfinder has no such guarantee today; the value is the target, not the machinery.

Start offline on existing lineage/exact-label material. Prespecify a **small** descriptor set drawn from already-available or cheap runtime state, including remaining length/intersection resources, outstanding objective/mechanic masks, existing MustCross/flipper diversity state, and selected residual opportunity/interface summaries where they add information beyond current prunes. Do not launch a broad learned-feature search merely because many descriptors are available.

A descriptor is interesting only if it recurs across unrelated parents and separates useful future coverage better than score alone **and** a neutral random-reserve control.

If that premise holds, test the simplest expression first:

- a bucket/quota or crowding rule over the descriptor; or
- one small reserve slot, with a random reserve as neutral control.

Keep beam width unchanged for the primary comparison and match total `workSpent`; include ordinary width increase as the “just buy more beam” control. Known-lineage or exact-live survival is still only diagnostic. Promotion requires actual cold solve/work improvement.

**Pilot gate:** recurring A/D future-coverage structure on unrelated parents plus a simple descriptor-aware treatment that beats score-only, random-reserve, and width-only explanations at the relevant boundary.

**Stop gate:** if descriptor structure does not recur, random reserve performs equally well, or better exact-live retention fails to become solve/work improvement, close broad diversity work rather than escalating.

Do not jump to DPP subset selection, MAP-Elites, large novelty archives, representative-set algebra, or a decision-diagram engine unless simple evidence first proves real future-coverage structure that those mechanisms specifically address. Coarse beam dedup is already an intentional population-shaping policy, not an exact-equivalence mechanism.

### Repair reachability, reconstructability, and operator quality

Plain repair has unique deep capability, but most hard residual levels still fail after large isolated budgets. The external LNS literature is useful mainly as a diagnostic vocabulary; Pathfinder repair is not textbook routing ALNS and should not mechanically import destroy/reinsert machinery.

Exact repair-retreat work already answers the crude rollback question by showing **both regimes**:

1. some retained elites become provably unrecoverable at an early choice, so useful repair would have to reopen substantial earlier structure;
2. other elites remain exactly completable until only 1–2 moves before their observed dead end, yet current randomized repair and `closeLengthGap`-style reconstruction can still fail from those exact-live states.

The second regime matters because a state can be **reachable in principle but effectively unreconstructable by the current repair paradigm**. On the strongest observed example, CP-SAT proved a long exact completion from a late prefix while thousands of repair-style randomized continuations all died quickly and a vastly enlarged `closeLengthGap` search still failed. More rollback depth or more of the same local search is not the obvious remedy there.

So do **not** run another generic rollback census or indiscriminately tune ruin size. Instead classify a bounded unrelated-parent sample on two independent axes:

1. **reachability:** how far back must the prefix be relaxed before an exact completion exists?
2. **reconstructability by current repair:** from an exact-live prefix, how much viable basin does current repair expose before dying?

Third-wave structural questions can enrich that diagnosis without becoming runtime features:

- what is the residual/interface width at the repair boundary;
- does a core identify frozen commitments already sufficient for impossibility;
- does an MCS/diagnosis identify a small relaxation that restores feasibility;
- does the residual appear shallow in backdoor depth/distance-to-tractability even when nominal neighborhood size is large;
- does a finite-state/resource subproblem admit stronger bounded reconstruction than random rollout.

Then ask whether cheap, hint-free runtime state can distinguish early-broken states from exact-live-but-repair-hostile residuals. Known-solution common-prefix distance remains discovery evidence only and is illegal as a production feature.

Only after a recurring legal descriptor separates regimes should implementation branch:

- **early-broken:** one deeper or dependency-targeted prefix/splice reopening mechanism;
- **late-live but repair-hostile:** one stronger bounded reconstruction mechanism, plausibly exact/constraint-assisted on a deliberately small residual, rather than more random rollout or another copy of ordinary DFS.

Do not bundle these into an adaptive-repair framework first. Do not build operator weighting, bandits, or RL selection until at least two complementary operators independently demonstrate conditional value. A selector cannot manufacture useful operators.

**Pilot gate:** cheap legal descriptors separate reachability/reconstructability regimes across unrelated parents strongly enough to nominate one regime-specific treatment.

**Stop gate:** if cheap descriptors do not predict the regimes beyond already-known coarse correlations, close static regime routing; if a treatment only improves badness or exact-prefix survival without cold solve/work gain, close that operator form.

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

### Orientation equivariance diagnosis

Detailed policy lives in [`variant-level-research.md`](variant-level-research.md). The durable research question is not “make every rotated trace identical.” It is to locate recurring **harmful** first non-equivariant decisions on transform-controlled parent pairs.

Heuristic invariance does not imply search equivariance: equal corresponding scores can still diverge through successor order, tie-breaking, retention/dedup, coordinate-derived identifiers, or PRNG-consumption order. Current direction inversions are aggregate-balanced, so there is no evidence for a universal directional correction.

Residual-representation research adds one cross-cutting check: any descriptor claimed to be structural should declare whether it is expected to be invariant or equivariant under puzzle symmetries. A coordinate-dependent frontier/cache/reason identity can fragment equivalent evidence even if the underlying search asymmetry is harmless.

**Pilot gate:** the same first-divergence mechanism recurs across unrelated parent-level cliffs and materially changes solve/work.

**Stop gate:** if cliffs are mechanism-heterogeneous, directionally balanced, and provide complementary coverage, treat them as finite-budget diversification and do not pursue global canonicalization/invariance engineering.

### Typed producer -> receptor artifacts

One search stage may occasionally discover useful information another cannot cheaply rediscover. Potential examples include proven dead interfaces, repair elites, exact-live prefix descriptors, frontier scarcity signals, or a compact structural certificate class.

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
- generic repair elite-pool diversification/relinking without a newly diagnosed conditional failure mode;
- a general ALNS/adaptive-operator framework before complementary operators earn it;
- universal beam-width increases;
- DPP/MAP-Elites/large novelty-archive beam machinery before a simple descriptor-aware policy shows unexplained headroom;
- production ZDD/Graphillion/TdZdd or a generic decision-diagram engine before a bounded interface question earns it;
- representative-set algebra without an exact interface/property matching its proof assumptions;
- generic `REGULAR`/`MULTICOST-REGULAR` infrastructure before a compact finite-state residual subproblem earns it;
- online CEGAR/interpolation/backdoor machinery before one candidate abstraction/tractable class proves value;
- exact DFS transposition-table work absent new sound recurrence evidence;
- context-equivalent caching from an approximate interface;
- full CDCL/LCG-style learning architecture absent a compact recurring sound reason class;
- generic RCSP/label-setting infrastructure or exact-resource dominance without a sound subsumption proof;
- broad graph canonicalization or production rotate/mirror retries instead of diagnosing symmetry bias;
- survival/hazard/bandit/VOC scheduler infrastructure before simple conditional-tranche scheduling shows residual headroom;
- giant variant generation before defining the unanswered question and analysis plan;
- full-corpus A/Bs for ideas already falsified by a narrow causal test;
- retaining closed experimental code solely as an archive;
- building a scheduler/configuration/reference-model/framework before its smallest value-of-information pilot succeeds;
- optimizing an intermediate research metric after actual solve/work improvement has failed to appear.

## History

Detailed pre-consolidation ideas, experiment narratives, old queue states, and concluded follow-ups are preserved in [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), and dated reports. This live file should stay about **plausible future work and its gates**, not chronology.