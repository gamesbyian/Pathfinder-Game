# Solver research operating model

> **Status:** living coordination document for active and proposed solver research
> **Written:** 2026-08-11
> **Purpose:** connect Pathfinder's currently separate solver-research programmes so future work is sequenced by evidence, shares instrumentation, and does not rediscover the same questions under different names.
>
> **Queue authority:** [`future-work.md`](future-work.md) remains the live backlog/status source. This document explains **how the major programmes fit together and how evidence should route work between them**. Dated reports remain authoritative for the experiments they actually ran.

## 1. The big programmes are stages of one research system

Recent work has opened several apparently separate directions:

- heuristic/capability-gap analysis;
- family/variant analysis;
- cross-technique interoperability;
- solver-aware game/domain architecture;
- repair stagnation diagnosis;
- attempt allocation/starvation and future adaptive scheduling;
- oracle/shadow/reference-search diagnostics;
- provenance, replay, reduction, and deterministic work accounting.

Treating these as independent queues wastes information. They answer different parts of one chain:

1. **Semantic substrate:** what future-relevant facts actually exist in a Pathfinder state, and can the game/domain model describe them safely?
2. **Controlled evidence:** under controlled changes to the same or closely related puzzle, where does solver competence change?
3. **Failure classification:** is the failure primarily representation/heuristic, retention/search-order, repair-basin, allocation/starvation, stochastic, or something else?
4. **Missing representation or artifact:** what fact would distinguish the useful states/branches from the wasted ones?
5. **Shadow evaluation:** does that fact actually separate live/winning states from dead/wasted states without changing search?
6. **Narrow intervention:** which technique is the natural receptor, and what is the least invasive way to use the information?
7. **Population verdict:** does the exact implementation improve solves or work at matched deterministic budget without unacceptable regression?

A useful shorthand is:

> **semantic truth -> controlled evidence -> failure classification -> missing representation/artifact -> shadow evaluation -> narrow intervention -> population verdict**

This is the preferred Pathfinder solver-development pipeline unless a task is a straightforward correctness fix.

## 2. The two cross-cutting substrates

### 2.1 Evidence/measurement substrate

This is not a research competitor. It is what makes every research programme cheaper and more trustworthy.

Existing pieces include:

- canonical work accounting and deterministic budget protocols: [`solver-budget-determinism.md`](solver-budget-determinism.md);
- CP-SAT-labelled residual branches and the shared shadow harness: [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md);
- exhaustive tiny-state/reference checks;
- solution/hint provenance and variant-parent replay;
- real-state path replay and score ablation;
- family provenance and controlled mutations: [`sibling-cousin-system.md`](sibling-cousin-system.md);
- solution profiles and hint diversity;
- the automatic level reducer: [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md);
- the testing API that exposes real solver primitives without making analysis reimplement the solver.

A new solver hypothesis should first ask whether one of these can falsify it without changing production search.

### 2.2 Semantic substrate

[`mechanic-state-contracts.md`](mechanic-state-contracts.md) and [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) should be treated as solver-research infrastructure, not merely code-quality documentation.

The most useful form of “make the game friendlier to the solver” is:

> **make every important rule's future-relevant semantics precise enough that diagnostics, proofs, neutral state facts, and independent tests can be derived from them.**

Do not refactor game architecture for tidiness alone. A domain change earns solver priority when it exposes, centralizes, validates, or makes independently testable a fact that several search techniques or research tools need.

New concepts should preferably be born as **neutral semantic facts** before becoming a score/prune/search trick. For example, a future “remaining viable adjacent-turn completion interfaces” quantity could later serve beam retention, repair diagnosis, admissible-order ties, or a proof. Naming it initially as one technique's score would prematurely narrow its use.

## 3. Family/variant analysis is a routing layer

The family system is more than a performance-comparison project. It can classify failures before expensive engineering begins.

A useful first taxonomy is:

### Robust failure / likely representation gap

Signs:

- canonical level fails;
- symmetry siblings mostly fail;
- nearby controlled mutants mostly fail;
- config/order changes do not cheaply rescue it;
- known-valid trajectories expose a dynamic property the solver does not currently represent.

Route these toward heuristic/capability-gap work, mechanic-derived necessary conditions, neutral dynamic metrics, and shadow/oracle reasoning.

### Fragile failure / likely search-control or retention problem

Signs:

- a rotation/reflection or small local mutant solves cheaply;
- several configurations can solve relatives;
- known successful paths are locally scored reasonably;
- tiny ordering/retention changes produce large outcome cliffs.

Route these toward first-divergence replay, beam survival/retention, tie-breaking, repair trajectory sensitivity, and interoperability. Do **not** begin by inventing a new hard prune.

### Starved capability / allocation problem

Signs:

- a fitting technique/config solves close relatives or historical controls;
- the current canonical attempt receives zero or negligible work;
- increasing its isolated budget recovers capability.

Route these toward participation/allocation work, currently represented by [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md), not toward new heuristics.

### Repair-basin failure

Signs:

- repair repeatedly reaches similar near-miss signatures/elites;
- descent is initially productive and then collapses into the same basin;
- deterministic search and repair exhibit complementary reachable structures.

Route these toward descent-aware diagnostics, causal/rollback-window measurement, or eventually narrowly justified handoffs/operators.

This classification need not become a learned classifier. It is first an experimental routing discipline.

## 4. Family data should feed heuristic-gap research directly

Variant solving has produced canonical-parent-valid paths for levels the cold canonical solver cannot solve. Those paths are diagnostic ground truth, not cold solves.

Use them aggressively for **non-guiding observation**:

- replay neutral metrics along winning trajectories;
- compare them with oracle-dead residual branches;
- identify depths where future opportunity collapses;
- inspect which obligations/interfaces remain viable;
- measure whether the solver ever reaches or retains prefixes from any known solution family.

The correct discipline is “fluorescent dye in the microscope”: known solutions may label what the running solver did, but they must not guide the search in experiments claiming cold-solver behavior.

This is especially valuable for the dynamic-resource frontier described in [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) and [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md).

## 5. Promotion work serializes; observation does not

A recurring inefficiency is allowing a pending full-population A/B to block unrelated read-only measurement.

Use this rule:

> **Production-changing descendants should wait for unresolved promotion gates when their design depends on the outcome. Read-only observation should run whenever its interpretation does not depend on that outcome.**

Examples as of 2026-08-11:

- the revised `PRUNE_MC_NEIGHBOR_BUDGET` full Corpus-2 A/B is a production promotion decision;
- main-loop late reserve is a separate production promotion decision;
- crossing-slack measurement is read-only and does not need to wait for either;
- the wide family-boundary report is read-only and does not need to wait;
- winning-lineage survival instrumentation can be developed as observation without promoting a new heuristic.

Do not build a later hard prune that assumes an earlier opt-in will ship until the earlier gate closes.

## 6. Neutral dynamic facts can have several receptors

A major theme of the capability-gap work is **future opportunity cost**: the solver understands immediate progress better than the ways a partial path destroys future completion options.

Crossing slack is the current concrete example. If it proves informative, do not immediately translate “correlates with success” into `SCORE_CROSSING_SLACK`.

A neutral state fact could be useful as:

- a beam diversity/retention descriptor;
- a repair elite descriptor;
- a tie-break among otherwise equal admissible-order branches;
- a failure artifact for a later technique or scheduler;
- a family-analysis explanatory variable;
- eventually, if a necessary condition is proved, a prune.

The same principle should apply to future landmark completion-interface quantities.

## 7. Winning-lineage survival is the next missing beam diagnostic

See [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md).

Existing winning-path archaeology measures the local rank of the known correct child. It does **not** answer whether globally viable solution lineages survive the real beam frontier.

The next diagnostic should observe an otherwise unchanged beam and identify, for all available validated solutions:

- whether a known-winning prefix is generated;
- whether it is rejected by a hard prune;
- whether it is displaced by beam dedup;
- whether it survives score/width culling;
- the first depth at which the final known-winning family disappears;
- how much work is spent after no known solution family remains represented.

The primary family-level metric should be **winning-support coverage by depth**, not survival of one arbitrary witness.

This diagnostic can route future work cleanly:

- never generated -> legality/pruning/local ordering investigation;
- generated then score-culled -> heuristic/representation problem;
- dedup-displaced -> beam state/retention abstraction problem;
- several winning families survive deep -> width may not be the bottleneck;
- all viable families collapse together after a dynamic-resource event -> opportunity/interface reasoning becomes more plausible.

## 8. Build a contrastive branch laboratory before online failure learning

A stronger successor to generic “dead branch versus live branch” comparisons is available from known solution prefixes.

At selected real prefixes of referee-valid known solutions:

1. the known continuation is live by construction;
2. enumerate its legal siblings using the real solver state;
3. where tractable/supported, use CP-SAT/reference machinery to label whether each sibling has any valid completion;
4. compare neutral state facts between live and dead siblings from the **same parent state**.

This creates a **contrastive winning-prefix branch atlas**: live sibling versus dead sibling under identical history until the decision point.

Candidate quantities include crossing slack, completion-interface counts, residual volume, portal/flipper state, turn opportunity, separator/interface state, and future resource commitments.

This is a cheaper and cleaner precursor to online failure-directed learning/CEGAR. Build online adaptation only after recurring contrastive structure exists to learn from.

## 9. Residual-interface segment mining unifies several research ideas

Two literature-inspired proposals, detour-gadget discovery and commuting-segment/partial-order analysis, should begin as one offline mining experiment over the existing solution corpus.

Search validated solution paths for subpaths that enter and leave through the same meaningful external interface. Compare their internal consequences.

Possible findings:

- same interface, different length/intersection deltas -> **detour gadget**;
- two excursions can occur in either order with the same resulting interface state -> **commuting relation**;
- alternate segment preserves full future-relevant state -> candidate **safe repair surgery**;
- a compact reduced interface predicts interchangeability reliably -> evidence for a **residual-interface abstraction**.

This is deliberately evidence-first. Do not begin by implementing generalized separator DP, CEGAR, or partial-order reduction.

The current corridor/intersection-capacity hypothesis should be treated as one possible property of such interfaces rather than an independent top-level project.

## 10. Interoperability should begin smaller than the full architecture plan

[`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md) remains the architectural reference, especially its producer -> receptor discipline and proof-strength rules. The **current implementation gate is narrower** than building the whole artifact ecosystem.

First build only enough to answer one concrete question in shadow mode:

> **Does one producer emit replayable, structurally useful information that a named receptor does not independently rediscover before it matters?**

The strongest first comparison is beam versus repair because both naturally produce populations of partial paths.

Minimum useful slice:

- replay-complete witness/prefix representation;
- common neutral metric projection;
- bounded beam-survivor sampling;
- bounded repair-elite sampling;
- offline/shadow comparison of novelty, arrival time, and overlap.

Do not yet build broad consumer hooks across DFS, beam, repair, admissible-order, and scheduler if this minimal comparison cannot establish non-redundant producer value.

### Exact prefixes are not automatically the best handoff

Repair's history shows that exact suffix transplantation/relinking can be worse than softer structural influence. If beam -> repair proceeds, compare at least two transfer semantics in shadow/small tests:

1. replayed beam prefix as a repair starting point;
2. softer structural information from that prefix, such as obligation order, region sequence, interface state, or attraction set, while repair retains more independent construction.

If exact prefixes are tried, prefer selected moderate-depth handoff cuts rather than assuming the deepest surviving prefix is best.

### Preserve recipient independence

Every live handoff should preserve native/fresh starts or an explicit participation floor. The elite-prefix DFS result already showed that useful imported material can reduce total solves when its consumption displaces the recipient's ordinary search.

## 11. Repair: measure the causal edit window before building another operator

The live repair direction remains descent-aware shadow probing. Add a companion measurement before implementing another substantial prefix-editing operator:

> **How far back from a hard near-miss must the path usually be changed before a viable alternative structural continuation exists?**

This is a rollback/causal-window census, not a demand for the unique minimal edit.

Interpretation:

- if viable repairs usually exist by modifying only the last 10-20% of the path, suffix regeneration/surgery becomes economically plausible;
- if the decisive mistake is routinely in the first third, local repair architecture is probably the wrong recipient for more local operators.

Known solutions can be used for offline comparison, but must not guide any cold-search result.

## 12. Differential reduction is a valuable later tool extension

The existing automatic reducer is a single-level, single-signature reducer. Its candidate generation, validation, fixed-point iteration, deterministic budget use, and repair-disabled safeguard are reusable, but it does **not** currently expose a generic paired interestingness predicate.

Do not build a second reducer.

If family work produces recurring relational cliffs worth shrinking, extend the existing reducer toward a **differential predicate** capable of preserving relationships such as:

- A fails while symmetry-equivalent B solves;
- both solve but the work ratio remains above a threshold;
- one local mutant flips the winning technique;
- disabling heuristic H removes the A/B differential.

For symmetry pairs, candidate simplifications must be applied correspondingly so the relation remains an isomorphism.

Build this after recurring differential signatures appear, not merely because the tool would be elegant.

## 13. Symmetry-family diagnosis needs controls before heuristic archaeology

See [`../reports/2026-08-11-symmetry-control-audit.md`](../reports/2026-08-11-symmetry-control-audit.md).

Current code contains several sources of orientation-dependent finite-budget behavior that are not equivalent to a broken semantic heuristic:

1. semantic equivariance violation;
2. directional strategy/template behavior;
3. arbitrary deterministic tie order;
4. stochastic seed/trajectory differences;
5. only after controlling the above, emergent frontier/retention/search asymmetry.

Future symmetry diagnosis should classify a cliff into these buckets before interpreting it as a missing heuristic.

The important practical controls are:

- compare transformed semantic facts and candidate sets before scores;
- identify equal-score/equal-slack decisions whose outcome comes from fixed neighbor order;
- normalize repair's research PRNG streams across symmetry siblings before attributing a repair cliff to geometry;
- account for CW/CCW and X/Y directional templates as intentional portfolio specialists rather than demanding every individual strategy be invariant.

Brute-force rotate-and-retry remains the wrong production fix.

## 14. Metamorphic symmetry can become a solver test oracle

Exact rotations/reflections provide stronger evidence than ordinary related levels.

For a level, state, and path prefix transformed through the canonical geometry functions, symmetry-respecting semantic quantities should transform predictably or remain equal.

A research/test audit can compare:

- transformed candidate sets;
- legality decisions;
- mechanic masks/substate;
- hard lower bounds;
- prune-gauntlet verdicts;
- neutral dynamic metrics;
- symmetry-respecting score components.

Disagreement before intentionally directional policy is either a bug or an undocumented coordinate dependency.

This should extend existing family-pair/divergence tooling and canonical geometry functions. Do not create a second transform implementation.

## 15. Failure-conditioned control is a separate umbrella

The failed cold-start portfolio scheduler should not discourage later online control work. A different question is emerging:

> **Given what has happened during this solve so far, where should the next unit of work go?**

Late reserve, starvation, beam collapse, repair plateau behavior, contradiction depth, artifact arrival, and eventual interoperability all contribute evidence to this control problem.

The current main-loop late-reserve experiment is a small static precursor.

Interpret its full-population result as a fork:

- **reserve helps:** participation floors deserve more attention; capability is being stranded by allocation;
- **reserve hurts despite recovering known starved cases:** static guaranteed work is too crude, strengthening the case for failure-conditioned/online allocation.

Do not treat either outcome as merely “flag on/off.” It informs the control-plane research direction.

## 16. Future scheduling should value information as well as direct solves

If interoperability eventually succeeds, the economic value of a work slice is not only its immediate solve probability.

An attempt can have value because it:

- solves directly;
- produces a replayable candidate family that materially improves a later receptor;
- proves/records an exact dead fact;
- cheaply reveals that a technique is in a bad basin and should stop receiving work.

So a future adaptive scheduler should eventually optimize **expected solve value of work, including measured information value**, not only direct per-technique hazard.

This is a future implication, not permission to build a new scheduler today.

## 17. Research ordering as of 2026-08-11

Run three lanes concurrently where resources permit.

### Decision lane

1. revised `PRUNE_MC_NEIGHBOR_BUDGET` full Corpus-2 A/B;
2. main-loop late-reserve full-population A/B.

### Evidence lane

1. run crossing-slack analyzer;
2. run wide family-boundary analysis;
3. add controlled symmetry-equivariance/PRNG diagnosis;
4. add winning-lineage survival instrumentation;
5. build contrastive winning-prefix branch atlas where oracle tractability permits.

### Cheap discovery lane

1. mine solution corpora for residual-interface segment relations: detours, commuting segments, state-preserving substitutions;
2. if repair remains a priority, measure rollback/causal windows on known hard near-misses.

Let those results decide whether the next substantial solver build should be:

- landmark completion-interface reasoning;
- joint must-cross compatibility;
- portal-local must-cross reasoning;
- beam retention/diversity changes;
- beam/repair cooperation;
- repair surgery;
- failure-conditioned allocation;
- or a different mechanism exposed by the evidence.

Do not pre-commit to the most architecturally ambitious option.

## 18. Kill criteria and discipline

1. **A neutral diagnostic may fail and still be useful.** Record which proposed explanation it ruled out.
2. **A correlation is not a prune.** Hard rejection requires a rule-derived necessary condition and proof-quality validation.
3. **An artifact without a named receptor is logging.** Do not build interoperability infrastructure around it yet.
4. **A receptor without an early producer is not a handoff opportunity.** Arrival time matters.
5. **A useful handoff can still be net negative.** Measure consumption/displacement separately.
6. **Equivalent-family evidence does not imply every technique must itself be symmetry-invariant.** Distinguish intentional directional specialists from arbitrary coordinate leakage.
7. **Do not conflate stochastic robustness with heuristic correctness.** Normalize research random streams when diagnosing symmetry.
8. **Do not build a giant learned router merely because the classification vocabulary exists.** Use the taxonomy to choose experiments first.
9. **Do not revive closed machinery under a broader name.** Check [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md), [`future-work.md`](future-work.md), and dated negative reports.
10. **Prefer experiments that make several research programmes more informative at once.** Winning-lineage survival and contrastive branch labels are high value precisely because they inform heuristics, beam retention, variants, repair, and interoperability simultaneously.

## 19. Handoff for future agents

When directed to “improve the solver” or “pick up pending solver research,” do not choose a plausible idea directly from an old brainstorm.

1. Read [`future-work.md`](future-work.md) for current status.
2. Read [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) before touching default-off mechanisms.
3. Use this document to identify which research lane the task belongs to and what evidence can be shared with adjacent lanes.
4. Read the canonical topic doc/report linked from the queue.
5. Check whether the requested experiment is observational, shadow, or production-changing.
6. Reuse existing replay/oracle/family/reducer/testing infrastructure before adding tooling.
7. Record negative results and update the queue when a gate closes.

The goal is not to keep every research alley busy. It is to make each new measurement eliminate multiple wrong turns and make each expensive population run answer a question that cheap evidence could not.

### 2026-08-11 observation tooling update

The default-OFF winning-lineage substrate, semantic symmetry comparator, bounded producer/interface/rollback helpers, and their limitations are recorded in [`reports/2026-08-11-solver-research-observation-tooling-pilot.md`](../reports/2026-08-11-solver-research-observation-tooling-pilot.md). The first lineage run, stratified controls, producer comparison, contrastive-atlas smoke, residual-interface miner, and rollback proxy are complete. CP-SAT labelling and larger stratified populations remain in the evidence lane.

### Residual-interface mining pilot update (2026-08-11)

A bounded five-level / 45-solution miner found 2,825 exact represented-state-preserving alternate
segments among 33,264 endpoint-interface candidate pairs, plus 100 named-obligation ordering
candidates. This supports deeper signature reduction, not an online substitution operator. See
[`reports/2026-08-11-residual-interface-segment-mining-pilot.md`](../reports/2026-08-11-residual-interface-segment-mining-pilot.md).

### Tooling completion handoff (2026-08-11)

The objective-by-objective implementation, pilot, correctness-alarm, and deliberately-not-run matrix
is [`reports/2026-08-11-solver-research-tooling-completion-matrix.md`](../reports/2026-08-11-solver-research-tooling-completion-matrix.md).
Use it before inventing adjacent telemetry or scheduling a larger evidence run.

## 2026-08-11 PR #1356 review reconciliation

The neighbor-budget caller-policy regression is repaired with independent named participation and diagnostics options; the fresh full-population verdict remains pending rather than being inferred from a partial run. Winning-lineage family semantics now separate exact paths from the existing structural hint-diversity axes, and a 13-solved/17-failed same-configuration beam cohort confirms earlier known-support loss in failures, most often at score/width retention. Route the next lineage work to cutoff-margin/equal-score diagnosis, not directly to a score or width change. Full details and explicit infrastructure blockers are in [`../reports/2026-08-11-pr1356-review-follow-up.md`](../reports/2026-08-11-pr1356-review-follow-up.md).

### Residual-interface signature reduction (2026-08-11)

The 20-level/288-solution follow-up reduced 31,351 exact-state-preserving pair occurrences to 845 translation-invariant local substitution signatures. Although 459 signatures span multiple solutions and 201 span structural solution families, only 14 recur across levels. This resolves the main methodological ambiguity: the phenomenon is predominantly correlated within-level multiplicity, with a small reusable residue worth held-out inspection. Do not build substitution or partial-order machinery yet; validate the 14 cross-level signatures first. See [`../reports/2026-08-11-residual-interface-segment-mining-pilot.md`](../reports/2026-08-11-residual-interface-segment-mining-pilot.md).

### Decision-experiment preflight manifests (2026-08-11)

Use `npm run solver:experiment-preflight -- ...` before an expensive decision run. The command refuses a dirty worktree by default and records the exact commit, corpus path, ordered level IDs plus SHA-256 selection hash, arm, full solver flag map, seeds, canonical work budget, wall deadline, profile, instrumentation state, and output destination. `compareExperimentArms` rejects every control/treatment mismatch except run/output identity and the explicitly named target flag. This is an audit sidecar, not a new experiment scheduler or source of truth.
