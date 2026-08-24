# External research → Pathfinder development synthesis

**Date:** 2026-08-24  
**Scope:** reconcile six external literature reviews against Pathfinder's existing solver evidence and convert them into bounded research decisions without treating named academic methods as an implementation backlog.

External inputs:

- [`deep-research-report.md`](deep-research-report.md) — repair/LNS
- [`nogood-deep-research-report.md`](nogood-deep-research-report.md) — learned failure
- [`beam-deep-research-report.md`](beam-deep-research-report.md) — beam survivor selection
- [`portfolios-deep-research-report.md`](portfolios-deep-research-report.md) — sequential portfolios/continuation value
- [`heuristic-symmetry-deep-research-report.md`](heuristic-symmetry-deep-research-report.md) — symmetry/equivariance/representation bias
- [`feasibility-deep-research-report.md`](feasibility-deep-research-report.md) — residual future-opportunity reasoning

Canonical priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md). This synthesis **sharpens** existing queue items; it does not displace P0 cross-stage-state diagnosis, scheduler repricing, or generalization work.

## Executive decision

Do **not** implement general ALNS, CDCL/LCG, novelty/DPP/MAP-Elites beam selection, graph canonicalization, a survival-model scheduler, bandit control, or a new RCSP label-setting engine merely because those frameworks appear in the literature.

The six reports are most valuable as a diagnostic vocabulary. Together they reduce the development problem to five questions:

1. **Allocation:** after an action has already failed through work `t`, what is the conditional value of its next work tranche versus another action?
2. **Beam:** which partial states represent meaningfully different future possibilities, and is the beam wasting slots on redundant futures?
3. **Repair:** is a stuck state broken because the wrong earlier commitment is frozen, or because the residual is live but hostile to current reconstruction?
4. **Failure learning:** do distinct exact states repeatedly fail for the same compact, sound reason early enough for reuse to save work?
5. **Representation:** when symmetric puzzle orientations diverge, where does search first cease to transform equivariantly, and is that divergence harmful or useful diversification?

The feasibility literature supplies candidate **future-opportunity descriptors** for questions 2–4 rather than creating a separate solver architecture: lower/upper residual capacity, attainable exact-resource classes, parity/congruence, residual components/cuts/bridges, and joint obligation/topology state.

---

## Track A — Continuation-value repricing for the scheduler

**Queue mapping:** #1 scheduler/fixed-work portfolio repricing.  
**Priority among research-derived work:** highest because the program is already active and the required evidence largely exists.

### What is already known

The census already contains capped/tranche observations and censored solve-hazard curves. Beam often exhausts cheaply; plain repair retains real late yield; some deep DFS/IDA work is heavily substitutable; rare configurations retain exclusive capability. The current scheduler plan already calls for joining those curves to actual production reach and machine-independent `workSpent`.

The portfolio literature sharpens the target quantity:

> **Among runs that are still unsolved at the start of a tranche, what additional solve probability/capability does that tranche buy per unit work, and what would the same work buy from another fresh or continuing action?**

A budget stop is right-censoring, not proof that the action would never solve. A naturally exhausted search is different and should leave the risk set rather than be treated as an ordinary timeout.

### Smallest useful analysis

For each material action and work band, compute on current comparable data:

- reached/eligible risk set at tranche start;
- incremental solves in the tranche conditional on surviving unsolved to it;
- `workSpent` consumed by successful and failed tranche continuations;
- exhaustion versus censoring;
- marginal/exclusive solves not cheaply reproduced elsewhere;
- overlap/substitution with candidate alternative actions;
- uncertainty, especially in late rare cohorts;
- sequence provenance so historical predecessor effects are not mistaken for causal continuation value.

Then compute fixed-envelope portfolio frontiers using these tranche actions rather than treating a 50M algorithm as one indivisible arm.

### What this does **not** justify yet

Do not jump from “hazard curves exist” to “run the action with maximum hazard.” Hazard is a useful local summary, not a generally optimal finite-budget policy. Remaining budget, correlation among actions, continuation-vs-restart semantics, rare exclusive solves, and future choices matter.

Likewise, bandits and value-of-computation control are later complexity layers. They become plausible only if:

1. a simple static tranche schedule leaves material oracle headroom;
2. conditional current-run telemetry predicts residual value beyond legal static features;
3. the extra policy complexity survives held-out validation.

### Immediate development consequence

The existing scheduler work should explicitly treat **continuations as actions that must re-earn each tranche**. This is a refinement of current policy, not a new project.

---

## Track B — Beam future-equivalence at exact A/D extinction boundaries

**Queue mapping:** #4 beam score/retention.

### What is already known

Exact CP-SAT prefix labeling has repeatedly found score-preferred dead candidates while lower-ranked siblings are live at real A-class and D-class extinctions. Resolved B-class near-ties instead showed live/live alternatives. Exact/sound beam duplicate states are extremely rare; the existing coarse dedup is intentional width/diversity management and removing it costs solves.

Therefore generic “increase width,” “improve dedup,” and “make beam diverse” are already too vague.

### New contribution from the feasibility literature

The beam report asked what state abstraction corresponds to different futures. The feasibility report provides a more concrete candidate vocabulary:

- remaining exact length/intersection resources;
- **lower and upper** residual resource capacity;
- parity/congruence or small attainable-value summaries;
- outstanding objective/mechanic obligations;
- residual connectivity/component structure;
- scarce bridges/cuts/corridors connecting future obligations;
- existing MustCross/flipper state.

Pathfinder already has several hard versions of these ideas: goal distance, parity, MP/MC lower bounds, and connectivity. The question is therefore **incremental information beyond the current prune gauntlet**, not reimplementing classical bounds.

### Smallest useful diagnostic

At existing exact-labeled A/D extinction parents, compute a **small prespecified set** of cheap level-blind future-opportunity descriptors offline and ask:

> Does the retained beam repeatedly spend multiple slots on candidates with similar residual opportunity while an exact-live alternative lies in a structurally distinct, underrepresented class?

For every descriptor, record whether it adds information beyond current score, existing diversity buckets, and existing prune outcomes.

### Positive branch

Only if the same descriptor separates useful survivor coverage across unrelated parents:

1. test the simplest quota/crowding/bucket expression at unchanged width;
2. compare with one neutral random-reserve slot;
3. compare with simply buying more width;
4. hold total `workSpent` fixed;
5. require cold solve/work improvement, not just exact-live lineage survival.

### Stop gate

If descriptor structure does not recur, random reserve performs equally well, or improved live retention fails to create solve/work value, close broad diversity work. Do not escalate to DPP, MAP-Elites, or large novelty archives.

---

## Track C — Repair reachability versus reconstructability

**Queue mapping:** #7 repair/CP-SAT-anchored operators.

### What is already known

Pathfinder repair is not textbook destroy/reinsert ALNS. Existing broad extra budget, gate widening, generic elite diversification, and additive elite-prefix DFS have already been weak or negative.

Exact repair-retreat work has demonstrated two qualitatively different regimes:

1. **early-broken:** a retained elite becomes provably unrecoverable at an early decision, so meaningful repair must reopen earlier structure;
2. **late-live but repair-hostile:** a prefix remains exactly completable until very near the observed dead end, yet randomized rollout and enlarged `closeLengthGap` still fail badly.

The latter proves that rollback depth alone is not the issue. A residual can be feasible but have a tiny viable basin for the available repair paradigm.

### New contribution from feasibility reasoning

Residual opportunity should be treated as more than distance to the goal. Cheap descriptors worth evaluating include:

- minimum and maximum remaining length/crossing capacity;
- parity/attainable-resource restrictions;
- residual component/cut structure;
- corridor/bridge scarcity;
- unresolved objective distribution across components;
- current exact resource slack plus topology, not slack alone.

Prior population evidence already suggests obstacle density/topology helps distinguish admissible-order from repair capability even after controlling for MustCross. Raw mechanic count is therefore a weaker starting explanation.

### Smallest useful diagnostic

Do not run another generic rollback census. On a bounded unrelated-parent sample of stuck repair states, measure two axes independently:

1. **Reachability:** how far back must the prefix be relaxed before an exact completion exists?
2. **Reconstructability by current repair:** from an exact-live prefix, how much viable continuation basin does current repair expose before dying?

Ask whether a few cheap hint-free residual descriptors separate these regimes.

### Positive branch

Only after a recurring legal descriptor exists:

- early-broken cases may justify one deeper/dependency-targeted splice or reopening mechanism;
- live-but-repair-hostile cases may justify one bounded stronger reconstruction mechanism, potentially exact/constraint-assisted on a deliberately small residual.

Do not build adaptive ALNS weighting/bandits/RL until at least two complementary operators independently demonstrate conditional value. A selector cannot manufacture useful operators.

### Stop gate

If cheap runtime descriptors do not predict the regimes across unrelated parents, close static regime routing. If an operator improves badness/exact-prefix survival but not cold solve/work, close that operator form.

---

## Track D — Sound structural failure reasons beyond existing caches/prunes

**Queue mapping:** #6 learned failure.

### What is already known

Do not repeat a generic recurrence census.

- Repair's per-call exact-state dead-end memory already found high recurrence and shipped useful work savings, but its semantics are only “this randomized continuation dead-ended before,” not logical UNSAT.
- Systematic DFS exact-state transposition was measured with a sound signature and found weak enough to close as a major lever.
- Current systematic search already uses hard length/intersection overflow, goal distance, parity, MP/MC lower bounds, connectivity, and related sound checks.

### New contribution from feasibility reasoning

The most plausible reusable reason classes are not arbitrary clauses but **structural impossibility statements** such as:

- required exact resource value no longer attainable;
- residual maximum capacity below the remaining target;
- an obligation isolated behind an exhausted cut;
- a scarce bridge/corridor commitment makes remaining obligations mutually incompatible;
- a joint resource/topology condition fails even though each scalar bound passes alone.

These are examples of reason languages, not implementation recommendations.

### Smallest useful diagnostic

Collect bounded examples of **soundly dead** states from existing prune proofs, systematic exhaustion where proof scope is clear, and exact-prefix labels. Keep them separate from randomized repair dead ends.

For each observed candidate reason class measure:

- recurrence across distinct exact states and unrelated parents;
- proof scope and every state field required for soundness;
- earliest point the reason could have been known;
- current rejection point and work performed between them;
- overlap with existing cheap prunes/caches;
- checking/storage cost.

### Positive branch

A bounded per-solve learned reason or reason-producing prune is justified only if one compact class is sound, recurrent, available materially earlier, and saves enough work to repay bookkeeping.

Conflict-directed backjumping is a later, separate branch and only makes sense if failures depend on small subsets of earlier **systematic-search** decisions.

### Stop gate

Close abstract nogood learning if reasons collapse toward full-state identity, rarely recur, mostly restate existing prunes, or become detectable only when current search already rejects.

---

## Track E — Orientation/symmetry as a representation-bias diagnostic

**Queue mapping:** supporting variant/family research; no new ranked queue item.

### What is already known

The frozen technique census contains real directional inversions, but aggregate beam/DFS direction discordance is balanced rather than showing a global CW/CCW winner. Existing structural summaries did not reveal a shared static predictor. Production rotate/mirror retries are already disfavored as a substitute for diagnosis.

The symmetry literature clarifies why this is not contradictory:

> **heuristic invariance does not imply search equivariance.**

Corresponding states may receive identical scores while successor ordering, tie-breaking, beam truncation, dedup, stable-sort order, coordinate-derived IDs, or PRNG-consumption order produce different finite-budget traces.

Canonicalizing symmetry orbits addresses redundant equivalent states; it does not automatically remove orientation dependence in ranking/retention. Given Pathfinder's negligible true beam-duplicate rate, broad symmetry canonicalization has no demonstrated capability premise here.

### Smallest useful diagnostic

Use selected current-code parent-level rotate/reflect cliffs from the existing variant trove. Align traces through the inverse transformation and identify the **first non-equivariant decision**:

1. legal successor set differs → semantic/correctness issue;
2. corresponding heuristic/prune value differs unexpectedly → representation/heuristic issue;
3. values agree but rank/order differs → tie-break/ordering issue;
4. ranks agree but survivor sets differ → retention/dedup/truncation issue;
5. deterministic structure agrees but random sequence diverges → PRNG-consumption/order issue.

Then ask whether the same mechanism recurs across unrelated parents.

### Interpretation

Classify findings as:

- harmless trace difference;
- useful diversification;
- arbitrary representation bias;
- systematic harmful bias.

Balanced directional wins may be useful diversification rather than something to “fix.” Only a recurring harmful mechanism earns an intervention. Any production directional diversification still competes through the scheduler at fixed work.

### Stop gate

If cliffs arise from different local mechanisms with balanced parent-level effects and no recurring harmful bias, keep orientation variants as diagnostic evidence and do not pursue global invariance engineering.

---

## Cross-cutting future-opportunity audit

The feasibility report's most useful contribution is a common vocabulary that may feed beam, repair, and learned failure. It should **not** become a “build an RCSP solver” task.

Pathfinder already implements several classic completion checks. Before adding any new bound, run an opportunity audit on exact-labeled states that currently survive the prune gauntlet:

> **Is there a cheap residual quantity that separates exact-live from exact-dead states materially earlier than current rejection?**

Candidate families, kept deliberately small:

- residual **upper** capacity, complementing existing lower bounds;
- parity/congruence or small attainable-value sets for exact length/intersections;
- component capacity and cut/bridge scarcity;
- joint obligation/topology summaries.

Possible roles depend on evidence:

- proven one-sided condition → candidate hard prune;
- predictive but not sound → heuristic ranking/beam-retention descriptor;
- expensive exact/relaxed calculation → offline diagnostic/reference label;
- recurrent compact impossibility → candidate learned-failure reason.

Do not conflate these roles. A useful predictor is not automatically a safe prune.

---

## Unified conditional development DAG

| Premise test | Positive result unlocks | Negative result closes/demotes |
|---|---|---|
| Conditional tranche value + fixed-envelope scheduler headroom | simpler repriced static schedule; later dynamic telemetry if needed | survival/bandit/VOC scheduler complexity |
| A/D beam future-equivalence descriptor | simple quota/crowding/reserve treatment | broad diversity frameworks |
| Repair reachability/reconstructability descriptor | one regime-specific reopening or stronger reconstruction operator | generic adaptive repair routing |
| Early recurrent sound structural failure reason | one bounded reason-store/propagator; later CBJ only if local conflict sets exist | broad nogood/CDCL architecture |
| Recurrent harmful first-divergence mechanism across symmetry cliffs | smallest orientation-neutral ordering/retention fix | global invariance/canonicalization work |
| New residual opportunity beyond current prunes | role-specific prune/heuristic/reason experiment | generic completion-bound expansion |

If the **same cheap residual descriptors** independently matter for beam future coverage, repair reconstructability, and failure explanations, then consider exposing them as a shared research feature substrate. Do not build a grand unified state abstraction in advance.

---

## Existing tooling to reuse

Most premise tests already have a home:

- lifecycle reach and machine-independent `workSpent`;
- cap/tranche census and censored hazard outputs;
- exact-prefix CP-SAT labeling;
- winning-lineage/beam shadow traces;
- repair-retreat CP-SAT and elite-path tools;
- repair rollout/stagnation tools;
- repair exact-state nogood A/B harness;
- prune IDs/shadow-evaluation harness;
- family/variant index and transform-controlled pair tools.

Extend outputs narrowly before creating frameworks.

The CP-SAT model remains a **research microscope**, not a production truth oracle outside validated scope. Unsupported, timeout, and UNKNOWN remain abstentions; SAT witnesses must pass the canonical referee.

---

## Explicit non-actions

The six external reports do **not** currently justify:

- a general ALNS framework;
- adaptive repair bandits/RL before complementary operators exist;
- more generic repair elite diversity/relinking/budget expansion;
- DPP/MAP-Elites/large novelty beam machinery;
- universal beam-width increases;
- exact/sound beam dedup as a major capability lever;
- full CDCL/LCG conversion;
- another exact DFS transposition-table push;
- approximate conflict patterns used as hard prunes;
- a new generic RCSP/label-setting engine;
- ordinary “less resource used is better” dominance for exact targets without a proof of completion-set subsumption;
- broad graph canonicalization as a response to orientation cliffs;
- production rotate/mirror retries as a substitute for bias diagnosis;
- survival/hazard/bandit/VOC scheduler infrastructure before simple fixed-work repricing demonstrates remaining headroom;
- optimization of proxy metrics after cold solve/work value fails;
- appending any specialist as permanent tail work without scheduler competition.

---

## Relation to the canonical queue

The literature does not reorder the queue.

1. **P0** cross-stage dependence still blocks some allocation conclusions.
2. **#1 scheduler:** explicitly model continuation tranches as conditional residual-value actions and distinguish exhaustion from censoring.
3. **#2 generalization:** remains necessary because every descriptor, selector, operator, and reason class is vulnerable to repeated-corpus/family overfitting.
4. **#3 configuration:** Hydra/portfolio literature reinforces marginal contribution and portfolio-size overfit; systematic racing remains the correct first complexity step.
5. **#4 beam:** use future-opportunity descriptors at proven A/D extinction boundaries.
6. **#5 exact/reference:** use the independent model to label future opportunity, retreat, and candidate sound reasons where supported.
7. **#6 learned failure:** search for recurrent early **structural** reasons beyond existing exact caches/prunes, not another generic state-revisit study.
8. **#7 repair:** distinguish reachability from reconstructability before designing another operator.
9. **Variant research:** symmetry cliffs remain a lower-priority diagnostic for first non-equivariant search decisions, not a production retry strategy.

Offline analyses that do not depend on unexplained stage history can proceed while P0 is resolved. Production changes still require matched work, correctness, independent confirmation, and scheduler repricing.

## Bottom line

Across six literatures, the strongest common theme is **option value under representation**:

- scheduler: which algorithm still has valuable future work;
- beam: which frontier states preserve distinct futures;
- repair: which commitments must be reopened and which live futures are reconstructable;
- learning: which failures share a reusable structural cause;
- feasibility: which exact resource/topology futures remain attainable;
- symmetry: which behavior differences are real search information versus arbitrary representation effects.

The research has therefore narrowed Pathfinder's development agenda rather than expanding it. The next gains should come from measuring these distinctions with existing tooling, then implementing only the smallest mechanism whose premise survives.