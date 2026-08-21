# Solver interoperability and cooperation plan

> **Status:** design and research plan, not production solver behavior
> **Written:** 2026-08-10
> **Decision:** Pathfinder has enough technique-specific evidence to treat cross-attempt information sharing as a concrete solver-improvement hypothesis rather than a generic portfolio idea. Build a common, replay-safe artifact substrate and use it to test specific **producer -> receptor** pairings in shadow mode before any information changes live search.
> **First decision gate:** show that an earlier technique produces bounded information that (a) is not already available to the later technique, (b) addresses a measured sensitivity or failure mode of that later technique, (c) arrives early enough to matter, and (d) would be cheap enough to consume that a matched-work experiment has a realistic chance of net gain.

## Executive summary

Pathfinder's solver is already a portfolio of genuinely different search processes: score-ordered DFS/LDS, width-limited beam search, admissible-slack-ordered deterministic search, randomized repair with elite splicing and restart memory, plus a feature-keyed attempt policy that allocates work among them. The important new conclusion is that these techniques are not merely different ways to search. They have different **information sensitivities**.

The repository now contains enough direct evidence to identify several such sensitivities with confidence:

- **Repair benefits from memory and alternative starting material.** It already keeps an eight-member elite pool, usually restarts from elite splices once that pool exists, forces fresh bursts when those elites converge, and now ships a repair-scoped exact-state nogood cache because hard levels were measured to rediscover the same dead states at very high rates. [`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md) showed repeat rates of roughly 54-98% on the measured hard repair population and a directional node-saving A/B.
- **DFS/LDS is highly sensitive to branch ordering.** Its cheap LDS waves succeed when the winning path stays near the scorer's preferred ordering and become expensive when early ranking mistakes accumulate. This is not abstract: the repair technique itself was introduced after witness traces showed deterministic score ordering accumulating 22-59 discrepancies on a hard cluster. [`solver-architecture.md`](solver-architecture.md) and [`repair-search.ts`](../modules/solver/repair-search.ts) document that diagnosis.
- **Admissible-order search is also highly sensitive to ordering information, specifically where its hard information ties.** Changing only the child ordering while preserving the same legal state space and admissible pruning found 71 solutions in an initially 1,266-level population that the full production ladder had failed; soft tie-breaking and additional tie-break profiles raised the distinct total to 115. [`2026-07-24-admissible-order-search-corpus2-validation.md`](../reports/2026-07-24-admissible-order-search-corpus2-validation.md) also records that a meaningful population depended on the no-tie-break ordering, proving that apparently small ordering decisions can change reachability within budget.
- **Beam is highly sensitive to diversity and retention.** Its coarse state-dedup mechanism turned out not to be exact duplicate elimination: true exact-future duplicates were only about 0.019% of candidates in the measured sample. Yet disabling the coarse merge caused 18 of 75 tested levels to lose a beam solve and only one to gain one. [`2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md) concluded that the mechanism's practical value is width/diversity management: it prevents superficially similar candidates from crowding out structurally different opportunities.
- **The outer ladder is sensitive to allocation and starvation.** A technique can be capable of solving a level and still contribute nothing if it receives too little or zero meaningful work. [`2026-07-31-admissible-order-tier-node-starvation.md`](../reports/2026-07-31-admissible-order-tier-node-starvation.md), [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md), and [`future-work.md`](future-work.md) own the current evidence here.

These are not yet proofs that **cross-technique** information transfer improves the full solver. They are stronger and more useful than a vague cooperation premise, however: they establish that the solver contains identifiable **receptors** for information.

At the same time, the techniques naturally produce potentially relevant information:

- beam produces a diverse population of viable prefixes and evidence about frontier collapse;
- repair produces elites, signed residual/plateau signatures, repeated-basin evidence, and exact repair-scoped dead-state memory;
- DFS/LDS produces deep productive prefixes, expensive failed subtrees, contradiction depth, discrepancy context, and prune/failure distributions;
- admissible-order produces highly constrained prefixes, equal-slack decision points, discrepancy/order context, and evidence about where hard bounds cease to discriminate;
- attempt orchestration produces timing, budget, starvation, technique-outcome, and arrival-order context.

The central research question is therefore no longer:

> Could solver techniques conceivably help one another?

It is:

> **Which producer -> receptor pairing transfers enough genuinely new information, early and cheaply enough, to improve solves or reduce work at equal canonical budget without erasing the recipient's independent search?**

That framing changes the plan. A generic artifact blackboard is still the right interoperability substrate, but **artifact non-redundancy alone is no longer sufficient evidence to proceed**. An artifact must have a plausible receptor whose measured failure mode it addresses. Likewise, a later technique being information-sensitive is not enough: the earlier technique must actually produce the right information before the recipient would otherwise spend the work rediscovering it.

The architectural principle remains:

> **Standardize the language in which techniques exchange evidence, not the search philosophy that produces the evidence.**

But the experimental principle is now sharper:

> **Measure the producer, the receptor, and the cost of the handoff separately before asking whether the combined mechanism wins.**

## 1. What is already known, and what is not

A useful way to prevent both overclaiming and excessive caution is to distinguish three levels of evidence.

### 1.1 Receptor evidence

A **receptor** is a measured property of a technique that can plausibly be improved by additional information.

Examples already supported by Pathfinder evidence:

- repair wastes work revisiting known dead states and can benefit from memory;
- repair depends on diverse starting material and explicitly combats elite-pool convergence with fresh bursts;
- DFS/LDS success cost depends strongly on branch rank/discrepancy;
- admissible-order search depends materially on tie-breaking among equally constrained branches;
- beam loses solves when structurally different frontier capacity is allowed to collapse into superficially similar candidates;
- the attempt ladder loses capability when later techniques are starved.

For these, we do **not** need another experiment to establish that the technique is information-sensitive in principle. The repo already did that work.

### 1.2 Producer evidence

A **producer** is a technique that naturally creates potentially useful information while doing work it already performs.

Examples:

- a beam frontier is already a collection of surviving alternative prefixes;
- repair already maintains elites, best badness, residual signatures in research modes, stagnation history, and exact repair-scoped nogoods;
- DFS already has the stack structure needed to identify deep/productive prefixes and, under existing debug instrumentation, expensive failed subtrees;
- admissible-order already computes admissible slack for every sibling it ranks;
- orchestration already records technique, config, gate, budget, outcome, nodes/work, and starvation-relevant attempt metadata.

Some producer evidence is strong because the data structure already exists. Other proposed artifacts, such as a cross-technique structural novelty score, are only hypotheses until measured.

### 1.3 Handoff evidence

A **handoff** is the actual use of producer information by a receptor technique.

This is the layer that remains mostly untested.

Pathfinder currently has **no general result** showing that beam information improves repair, repair information improves DFS, DFS information improves beam, or online failure evidence improves the outer scheduler at equal total canonical work.

The closest local precedent is deliberately cautionary: [`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md) proved that deterministic search from selected repair elite prefixes can genuinely improve intermediate state quality, yet the mechanism lost 4/20 versus 5/20 at the shared budget because its extra work displaced ordinary repair work needed by a real solution. This is proof that **useful information can still reduce solver success when consumption cost is wrong**.

The plan must therefore treat handoff value as:

**new information delivered to a known receptor, minus the work and independence lost by consuming it.**

Do not collapse that into one universal numeric score in code. It is a decision model for experiments, not a new solver heuristic.

## 2. Technique map: producers and receptors

The table below is the current mechanistic hypothesis map. “Receptor evidence” describes what Pathfinder has already measured. “Potential producer” describes information another technique could supply. “Handoff status” is intentionally conservative.

| Receptor | Measured sensitivity | Potential external information | Natural producers | Handoff status |
|---|---|---|---|---|
| Repair | repeated dead-state work; elite convergence; starting-point dependence | replayable structurally distinct prefixes; basin/region novelty; exact compatible facts | beam, DFS, admissible-order | cross-technique untested; intra-repair memory positive |
| DFS/LDS | cumulative discrepancy; expensive consequences of early rank errors | soft ordering preference; evidence that an early branch survives independent search; expensive-failure avoidance | beam, repair, admissible-order | untested |
| Admissible-order | equal/near-equal slack ties; tie-break choice changes solved population | external tie-break preference; independent survival/obligation evidence | beam, repair, DFS | untested |
| Beam | frontier-width crowding; diversity preservation strongly affects solves | structural novelty buckets; protected candidate families; external “keep one of these” signal | repair, DFS, admissible-order | untested |
| Attempt scheduler | static pre-search features cannot see collapse, plateau, deep contradiction, or starvation as they happen | typed failure/activity signatures; artifact arrival/improvement hazard | every technique | untested online; cold-start portfolio negative |
| Any technique | repeated exact work when state identity is truly complete | exact dead fact / sound bound / forced fact | technique-specific proof producer | repair-scoped exact memory positive; cross-technique proof sharing later |

This map should evolve only from measured results. If a proposed artifact has no named receptor, it is logging, not interoperability work.

## 3. Technique-specific reasoning

### 3.1 Repair: strongest immediate receptor for candidate information

Repair is already an information-reuse algorithm.

[`modules/solver/repair-search.ts`](../modules/solver/repair-search.ts) uses randomized epsilon-greedy construction plus restart/splice repair. Its elite pool is deliberately not a single best path: it keeps several distinct near-misses because a single best-so-far path was measured to produce premature convergence. Once elites exist, most restarts splice from them, while stagnation-triggered fresh bursts restore independence when the elite family collapses.

This gives repair two clearly distinct external receptors.

#### Candidate receptor

A replayed external prefix can serve as starting material analogous to an elite, provided it is validated through the real state transition machinery.

The strongest first producer is beam because beam naturally pays to maintain multiple simultaneously viable prefixes. If those prefixes are structurally different from repair's own elites, they may bypass the cost of repair randomly rediscovering those basins.

The key premise is **not** “beam's top state is good.” It is:

> beam may cheaply expose viable structural families that repair's own stochastic trajectories have not yet sampled.

The handoff should therefore preserve several diverse beam survivors, not one nominal `best` prefix.

#### Memory receptor

[`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md) already demonstrated that repair revisits exact dead states often enough for memory to matter. That mechanism is intra-technique and carefully scoped, but it proves the underlying receptor: repair can waste enormous work rediscovering facts known earlier in the same solve.

This makes exact cross-technique proof/fact sharing conceptually valid if a future producer can supply truly equivalent semantic facts. It does **not** justify treating approximate signatures as proof.

#### Important negative boundary

Do not interpret the above as permission to rerun repair-elite -> DFS anchoring under a new name. [`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md) already implemented a real bounded deterministic search from multiple elite prefixes. It improved some intermediates but was net-negative at the tested shared budget. Any later repair -> deterministic handoff needs a materially new selection premise, a lower consumption cost, or both.

### 3.2 DFS/LDS: strongest receptor for cheap ordering information

DFS's legal search space is not its main limitation. The order in which it traverses that space is.

[`solver-architecture.md`](solver-architecture.md) describes score-ordered iterative DFS wrapped in LDS probes. Cheap waves test low cumulative discrepancy from the scorer's preferred branch ordering before an unbounded fallback. The repair technique's own origin story is direct evidence that local scores can be individually sensible while accumulating 22-59 discrepancies from the winning path on hard levels.

That makes DFS a high-leverage receptor for **soft early-decision guidance**.

A useful cross-technique signal need not provide a full prefix. It may simply change the order among currently legal siblings. Examples worth measuring in shadow mode:

- another technique independently retained a prefix whose next move matches this sibling;
- several external artifacts share this early decision despite differing later structure;
- a previous technique spent unusually large work beneath this early choice and ended in repeated deep contradiction;
- an external candidate satisfies a scarce obligation/interface unusually early through this branch.

The recipient must retain ordinary DFS/LDS as a protected path. Cross-technique guidance should initially affect only order or discrepancy cost, never legality.

The reason this is attractive is leverage: changing one early rank can alter millions of downstream expansions without itself requiring a second search.

### 3.3 Admissible-order search: a particularly clean tie-break receptor

Admissible-order search already asks the sound lower bounds to rank siblings by remaining slack. That provides a strong primary signal, but integer slack naturally produces ties.

[`2026-07-24-admissible-order-search-corpus2-validation.md`](../reports/2026-07-24-admissible-order-search-corpus2-validation.md) established both sides of the opportunity:

- changing the primary ordering away from ordinary soft DFS exposed a large new solved population;
- changing only the tie-break rule exposed additional solutions and also made some earlier solutions disappear until the original no-tie-break regime was restored.

This means there are real decision points where admissible information says “these branches are equally constrained enough that ordering policy decides what gets explored within budget.”

That is almost an ideal place for **external soft evidence**, because it does not have to fight a stronger local theorem. A shadow consumer can first ask:

- how often does an external artifact distinguish siblings that have equal admissible slack?
- how often do different producer techniques agree on one of those siblings?
- does that agreement correlate with eventual winning paths or lower work on held-out levels?

If a live experiment follows, external information should be a tertiary/secondary ordering signal only. It must never change the admissible pass/reject boundary.

### 3.4 Beam: strongest receptor for retention/diversity information

Beam search's essential scarcity is frontier capacity.

At each phase it generates a candidate population and keeps only a bounded frontier. Every cull is permanent. A path that leaves the frontier does not later get ordinary DFS-style backtracking recovery.

[`2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md) provides unusually strong evidence about what matters. Exact duplicate states were nearly nonexistent, yet the coarse `(cell, constraint-state)` merge materially improved solve outcomes because it prevented many similar-looking candidates from consuming the width needed by other structural opportunities.

So the most interesting imported information for beam is not “a state has high global quality.” It is **“this candidate represents an opportunity class worth preserving.”**

Potential soft uses:

- reserve a tiny number of slots for candidates structurally distant from external elites/prefixes;
- reserve one representative matching an external obligation-order or approach pattern;
- protect candidates that enter a region another technique reached productively but beam's own score under-ranks;
- increase novelty pressure when another technique's failure artifacts indicate repeated convergence on the same basin.

These should be tested as retention rules, not hard filters. Beam already demonstrates that heuristic culling can help and hurt specific levels in both directions.

### 3.5 The outer scheduler: receptor for online failure evidence

The current attempt policy is feature-keyed before search. That is a deliberate strength for generalization and reproducibility, but it cannot use facts that do not exist until an attempt runs.

Examples:

- beam frontier diversity collapsed early versus remained broad until late;
- repair improved rapidly then froze versus never found a close basin at all;
- DFS repeatedly dies shallowly versus spends huge subtrees beneath deep prefixes;
- admissible-order is genuinely exhausting a region versus simply starved before its characteristic behavior appears;
- one technique emitted several promising artifacts early versus emitted nothing useful after substantial work.

A later scheduler can use these as **failure-conditioned allocation evidence**. This is not the failed fast-portfolio scheduler in [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md). That experiment reordered cold starts. The proposed scheduler would respond to information generated by the current level's actual search.

The static repair-winner classifier is also a boundary, not a model to revive. [`2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md) concluded negative. A future adaptive allocator must demonstrate that **online search evidence** adds predictive value beyond static level features.

## 4. Interoperability layers

Interoperability should support several kinds of exchange without pretending they are equivalent.

### 4.1 Observational interoperability

Every technique describes what happened using a shared outer contract.

Examples:

- canonical work when an artifact appeared;
- attempt/gate/config identity;
- deepest/productive progress;
- residual obligations/resources;
- frontier or elite diversity;
- plateau duration;
- contradiction/prune distribution;
- timeout, exhaustion, or starvation.

This layer alone is valuable because it makes producer/receptor premise tests possible.

### 4.2 Candidate interoperability

A technique emits a replayable path or prefix. Another technique reconstructs the exact semantic state through the real transition machinery.

Candidate exchange is appropriate when the recipient genuinely has a starting-state receptor, especially repair and bounded seeded searches.

### 4.3 Guidance interoperability

A technique emits information used only to rank, retain, diversify, or allocate.

Examples:

- sibling ordering preference;
- structural bucket preference;
- “preserve one candidate with this obligation order”;
- “this failure basin has already consumed large work”;
- “another technique's conditional hazard is now historically higher.”

Guidance may change search order. It may not change legality.

### 4.4 Diagnostic interoperability

A technique emits a typed description of its own search dynamics or failure shape.

Diagnostics are especially relevant to scheduling and to deciding whether a candidate handoff should even be attempted.

### 4.5 Proof interoperability

A technique emits an independently justified fact safe for hard consumption by another technique.

This is deliberately last. Pathfinder's state is history-sensitive. [`mechanic-state-contracts.md`](mechanic-state-contracts.md), [`solver-architecture.md`](solver-architecture.md), and [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) control what semantic identity must include.

Approximate signatures, population summaries, repair badness, beam buckets, and empirical correlations are never promoted to proof merely because they predict well.

## 5. Non-goals and architectural constraints

### 5.1 No universal `bestState`

There is no reason to expect repair badness, beam score, DFS depth, admissible slack, and structural novelty to collapse into one meaningful global ordering.

The exchange layer should preserve why a producer selected an artifact rather than flattening everything into `quality: number`.

### 5.2 No universal mutable solver state

Do not serialize each technique's private mutable state into a giant cross-technique object.

Transferable candidates should cross the boundary as replayable witnesses. Recipients reconstruct their own native state.

### 5.3 No imported heuristic information in hard-prune APIs

Guidance can affect:

- ordering;
- retention;
- seeding;
- restart choice;
- bounded work allocation.

Only proof/bound artifacts with explicit soundness contracts may affect hard rejection.

### 5.4 Preserve native search

Every first live handoff must be additive or budget-partitioned with an explicit protected native share.

The elite-prefix DFS result proves why. A useful mechanism can consume enough budget to displace the recipient's own eventual win.

### 5.5 Do not rebuild existing infrastructure

Do not create a second:

- work currency;
- provenance system;
- level-family database;
- reducer;
- generic shadow framework;
- benchmark harness;
- attempt serialization stack.

Reuse the canonical owners listed below.

### 5.6 Do not store raw search traces by default

Artifacts must be selected and bounded. The project needs evidence, not a second copy of the search tree.

## 6. Documentation ownership map

This document is the canonical home for interoperability/cooperation design. It does not override the documents that own current behavior or measured verdicts.

| Topic | Canonical reference | Role here |
|---|---|---|
| Documentation authority/index | [`README.md`](README.md) | Check before creating new tooling/docs. |
| Live solver queue/status | [`future-work.md`](future-work.md) | Determines what is actually open now. |
| Production solver architecture and replay semantics | [`solver-architecture.md`](solver-architecture.md) | Controls real search behavior and witness reconstruction. |
| Dynamic mechanic state contracts | [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Audit checklist for replay/exact identity. |
| Canonical work and deterministic comparison | [`solver-budget-determinism.md`](solver-budget-determinism.md) | Controls equal-work experiments. |
| Correctness/state-identity archaeology | [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Controls proof-quality claims. |
| Shadow evaluation infrastructure | [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Reuse observe-only evaluation patterns. |
| Heuristic capability gaps | [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) | Owns broader representation/control gaps. |
| Repair stagnation and elite/plateau work | [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) | Repair-specific evidence and negative boundaries. |
| Cold-start portfolio experiment | [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) + [`decision report`](../reports/portfolio/portfolio-scheduler-decision.md) | Closes blind fast portfolio rotation, not evidence-conditioned cooperation. |
| Variant/family research | [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) | Owns symmetry/family conclusions. |
| Solution/path fingerprints | [`solution-profile.md`](solution-profile.md) | Reuse path-distance machinery where semantically appropriate. |
| Historical research ledger | [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Prevent rediscovery of closed ideas. |
| Literature-informed hazard/activity hypotheses | [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) | Hypothesis source, not Pathfinder evidence. |
| Investigation conventions | [`investigation-report-conventions.md`](investigation-report-conventions.md) | Use for promoted experiments. |
| Existing dev/reducer/failure tooling | [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Reuse diagnostics infrastructure. |

### 6.1 Canonical `Attempt` contract precedent

There is no dedicated design document for the 2026-08-09 `Attempt` projection/transport cleanup. Its durable precedent is the implementation and tests:

- [`scripts/test-lib/fixtures.mjs`](../scripts/test-lib/fixtures.mjs) contains the maximally populated attempt fixture;
- [`modules/solver/hint-provenance.test.ts`](../modules/solver/hint-provenance.test.ts) classifies persistent versus transient provenance fields;
- [`modules/solver/worker-result-serialization.mjs`](../modules/solver/worker-result-serialization.mjs) preserves raw attempts across structured-clone worker transport;
- [`scripts/portfolio-solve-sweep-lib.mjs`](../scripts/portfolio-solve-sweep-lib.mjs) owns canonical report projection.

The originating merge is `1d98ef2763a041b751536b1e6ee873d5da5f729f`.

Artifact serialization should copy this **contract-tripwire pattern**, not its exact field list.

## 7. Prior evidence that constrains this plan

These results are close enough to proposed cooperation mechanisms that they must be read before implementing anything similar.

### 7.1 Cold-start fast portfolio: negative

[`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) and [`portfolio-scheduler-decision.md`](../reports/portfolio/portfolio-scheduler-decision.md): every measured broad fast-portfolio variant was slower than legacy.

Interpretation: more frequent technique rotation without information exchange is not cooperation and is closed as a production direction.

### 7.2 Exact repair path relinking: negative

[`2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md): exact suffix transplantation through the real legality machinery was sound but failed because a guide suffix is often illegal under another prefix's history-dependent state.

Interpretation: transfer replayable starting state, not blindly copied future moves.

### 7.3 Repair elite-prefix DFS: mechanistically real, net-negative

[`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md): bounded deterministic completion from selected repair elite prefixes improved an intermediate on traced runs but solved 4/20 versus 5/20 with the mechanism off at the shared budget.

Interpretation: useful intermediate progress is insufficient. Consumption cost and displacement must be measured.

### 7.4 Repair exact-state memory: positive efficiency result

[`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md): exact repair-scoped dead-state repetition was far higher than prior intuition suggested. The cache saved nodes directionally and flipped one tight-budget failure to a solve in the 20-level A/B, with no solved-count change at the later generous full-corpus budget.

Interpretation: “previous search already learned this” is a real efficiency lever when semantic identity and consumption cost are controlled.

### 7.5 Admissible-order: ordering alone can expose large new solved populations

[`2026-07-24-admissible-order-search-corpus2-validation.md`](../reports/2026-07-24-admissible-order-search-corpus2-validation.md): changing exploration order while preserving sound pruning produced a large set of previously unreachable solves; tie-breaking itself materially changed which levels solved.

Interpretation: cheap external information that improves ordering can have far greater leverage than its own computational cost.

### 7.6 Beam coarse dedup: diversity management materially affects solves

[`2026-08-06-beam-state-dedup-sound-signature-audit.md`](../reports/2026-08-06-beam-state-dedup-sound-signature-audit.md): exact duplicates were nearly absent, but the coarse grouping still materially improved results because it preserved frontier capacity for different-looking candidates.

Interpretation: beam has a measured receptor for structural-retention information.

### 7.7 Admissible-order/main-loop starvation: capability is not outcome

[`2026-07-31-admissible-order-tier-node-starvation.md`](../reports/2026-07-31-admissible-order-tier-node-starvation.md), [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md), and [`future-work.md`](future-work.md): later techniques may have known fitting witnesses but receive too little work in the real ladder.

Interpretation: a failure artifact must distinguish “searched and failed” from “never meaningfully ran.”

### 7.8 Static repair-winner classifier: negative

[`2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md): the larger deterministic validation closed the static learned repair-winner classifier.

Interpretation: failure-conditioned allocation must earn its value from **new online evidence**, not rename a weak static feature classifier.

## 8. The common artifact contract

The common contract should standardize identity, replayability, neutral measurements, soundness class, and provenance while retaining technique-specific payloads.

Conceptually:

```ts
type SolverArtifact = {
  schemaVersion: number;
  id: string;
  kind: ArtifactKind;
  claimClass: ClaimClass;

  context: {
    levelHash: string;
    levelId?: string;
    solverVersion: string;
    gateKey: number;
    attemptId: string;
    configKey: string;
    technique: TechniqueId;
    profile?: string;
    template?: string;
    seed?: number;
  };

  timing: {
    workAtEmission: number;
    attemptWorkAtEmission: number;
    ordinal: number;
  };

  witness?: ReplayWitness;
  metrics?: CommonCandidateMetrics;
  payload: TechniqueSpecificPayload;
};
```

### 8.1 Claim class

A small explicit taxonomy should separate epistemic status:

- `witness`: exact replayable path/prefix/population member;
- `diagnostic`: measured property of the producer's search;
- `guidance`: intentionally heuristic information safe for ordering/retention/seeding/allocation;
- `bound`: sound bound with explicit preconditions;
- `proof`: exact proved fact/nogood within an explicit semantic identity contract.

Make illegal consumption difficult to express. A hard-prune API should not accept a generic artifact.

### 8.2 Context identity

Reuse existing attempt/provenance identity wherever possible:

- level stable identity/content hash;
- gate;
- technique;
- config/profile/template;
- deterministic seed/salt where applicable;
- attempt and solver version;
- canonical work at emission.

Do not invent parallel aliases for fields already owned by `Attempt` or hint provenance.

### 8.3 Schema tripwires

Follow the canonical `Attempt` precedent:

- maximally populated fixtures;
- explicit persistent/derived/transient classification;
- worker/report round-trip tests;
- schema versioning;
- tests that fail when a field is silently omitted.

## 9. Replayable witnesses

A path/prefix must cross technique boundaries as a replayable witness, not copied mutable state.

A coordinate sequence alone must not automatically be assumed sufficient. Portal transitions are the clearest ambiguity: adjacent portal endpoints can make a coordinate-to-coordinate transition ambiguous between ordinary movement and a forced jump. Any future mechanic with history-dependent transition semantics creates the same class of issue.

The witness must contain enough transition information for one canonical replay entrypoint to reconstruct the semantic state through production `applyMove`/transition logic.

Audit the witness against [`mechanic-state-contracts.md`](mechanic-state-contracts.md). At minimum, replay must reproduce everything that affects future legality or pruning, including:

- current cell/path;
- real path length and portal-jump accounting;
- visit counts;
- edge/axis usage;
- intersection count;
- must-pass state;
- must-cross masks, counts, and relevant axis state;
- portal-use state and `lastWasPortalJump`;
- flipper state;
- surround state and remaining-neighbor masks;
- must-turn state;
- adjacent-turn state;
- any future dynamic mechanic state.

### 9.1 One canonical replay validator

Expose one reusable function:

```ts
replayArtifactWitness(level, gate, witness)
  -> { state, commonMetrics, fingerprint }
  | { replayError }
```

Recipients must not implement their own reduced replay logic.

### 9.2 Imported candidates are untrusted until replayed

Even same-process artifacts should be replayed before another technique consumes them. This centralizes mechanic correctness, schema drift handling, common metric computation, and failure diagnostics.

### 9.3 Approximate fingerprints stay approximate

A replayed artifact may have coarse fingerprints for dedupe or novelty. Those fingerprints may not silently become hard state identity.

## 10. Common derived metrics

Common metrics should describe a state in producer-neutral terms. They should not declare universal quality.

### 10.1 Progress and residuals

Potential initial fields:

- replay depth / decision count;
- real length used and remaining;
- intersection count and deficit/slack;
- goal distance;
- pending must-pass/must-cross/must-turn/adjacent-turn/surround masks/counts;
- portal/flipper resource state where meaningful;
- existing admissible lower-bound slack values;
- reachable fresh volume where already available cheaply;
- goal/interface flexibility where a current sound calculation already exists.

This builds on the richer residual-resource direction in [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) without prematurely turning that vector into a production score.

### 10.2 Structural descriptors

Where useful and cheap:

- path cell/edge footprint hashes;
- obligation-order prefix;
- revisit distribution;
- turn/intersection placement summary;
- approach-side or coarse region occupancy;
- existing solution-profile path distances;
- existing homotopy/topology descriptors if and when a canonical implementation exists.

Use [`solution-profile.md`](solution-profile.md) and [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) rather than inventing a parallel path-comparison subsystem.

### 10.3 Novelty must name its comparison set

“Novelty = 0.7” is meaningless without knowing relative to what.

If novelty is computed, preserve:

- distance definition;
- comparison population;
- structural dimensions included;
- schema/version.

A useful artifact may be novel relative to the producer, the blackboard, the recipient's private population, or known validated solutions. Those are different claims.

## 11. Artifact kinds

Keep the first taxonomy small and explicitly tied to receptors.

### 11.1 `candidate-prefix`

Replayable partial path plus selection reason.

Possible reasons:

- beam survivor from a distinct frontier bucket;
- deepest productive deterministic prefix;
- highly constrained admissible-order prefix;
- repair elite;
- pre-plateau best;
- rare obligation-order representative;
- structurally novel candidate.

Do not require one `bestPrefix`.

### 11.2 `candidate-complete-nearmiss`

Replayable terminal/complete near-miss with an exact residual vector.

Most naturally produced by repair, but not repair-exclusive.

### 11.3 `population-sample`

A bounded representative set from a frontier/elite population, with why each member was retained.

Natural for beam and repair.

### 11.4 `population-summary`

Fixed-size summary such as:

- population size;
- structural bucket count;
- concentration ratio;
- residual-resource spread;
- obligation-state spread;
- elite turnover;
- extinction/repopulation events.

Primary receptors: scheduler and diversity-aware consumers.

### 11.5 `failure-signature`

Typed description of why productive progress stopped or the attempt ended:

- exhausted / timed-out / budget-starved / error;
- contradiction-depth distribution;
- dominant prune classes;
- deepest useful depth;
- work since last improvement;
- beam extinction/collapse;
- repair plateau shape;
- repeated-basin evidence;
- persistent residual/obligation bottleneck.

Diagnostics are not proofs.

### 11.6 `search-activity-summary`

Coarse fixed-size dynamics over canonical work buckets:

- improvement intervals;
- productive depth progression;
- survivor/population count;
- contradiction rate;
- diversity/entropy/bucket count;
- repair elite turnover;
- repeated-return rate.

The activity/hazard framing is related to the hypotheses in [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md), but any Pathfinder use must be validated from Pathfinder data.

### 11.7 `proof-fact`

Reserved for exact, independently justified transferable facts.

Examples might eventually include:

- exact semantic state proved dead within an exact scope;
- mechanic-derived forced fact;
- admissible lower-bound result with declared preconditions;
- exact impossibility of an obligation interface.

Construction APIs and tests should be stricter than for heuristic artifacts.

## 12. Technique-specific emitters

Emitters should expose information the technique already computes or can select cheaply. Do not turn instrumentation into a second search algorithm.

### 12.1 Beam

Priority artifacts:

- 2-4 structurally/resource-distinct survivors at selected phases;
- representative from each already-existing diversity bucket where bounded;
- frontier concentration/collapse summary;
- extinction depth/work;
- candidates with mediocre native score but unique structural bucket;
- common-metric spread over retained frontier.

Beam should be treated primarily as a **reconnaissance producer**.

### 12.2 Repair

Reuse existing machinery:

- elites;
- best/final badness where already tracked;
- exact residual vector;
- signed plateau/failure shape where instrumentation already exists or can be reused;
- best pre-plateau candidate;
- elite diversity/turnover;
- fresh-vs-spliced ancestry;
- work since last improvement;
- exact repair-scoped repeat/dead facts only with their existing semantic scope.

Repair is both a strong candidate consumer and a rich diagnostic producer.

### 12.3 DFS/LDS

Priority artifacts:

- deepest/productive prefixes;
- prefixes above unusually expensive failed subtrees;
- contradiction-depth histogram;
- dominant prune/failure histogram;
- discrepancy level/context;
- productive-depth progression by work bucket;
- early decisions associated with very large exhausted subtrees.

Existing `_DFS_DEBUG` backtrack/subtree instrumentation in [`modules/solver/search.ts`](../modules/solver/search.ts) is an important precedent. Reuse or adapt it rather than adding parallel subtree accounting.

### 12.4 Admissible-order

Priority artifacts:

- deep prefixes with low remaining admissible slack;
- equal-slack sibling decision events;
- tie-break winner and margin where applicable;
- discrepancy/order-deviation context;
- exhausted versus budget-starved distinction;
- prefixes where hard bounds remained feasible unusually deep.

A particularly valuable artifact may be **decision ambiguity**, not candidate quality: “the admissible signal tied here, so an external discriminator could have mattered.”

## 13. The per-solve artifact board

The `SolveArtifactBoard` should be a bounded session-owned exchange substrate, not an intelligent scheduler in its first form.

Responsibilities:

- validate schema and size;
- replay candidate witnesses;
- compute common metrics centrally;
- deduplicate exact artifact duplicates;
- retain bounded diversity by declared rules;
- preserve per-producer participation;
- expose read-only queries;
- record hypothetical and actual consumption;
- track lineage from producer artifact through consumer result.

It should not initially decide which technique runs next.

### 13.1 Retention

Use class- and producer-specific quotas so one noisy technique cannot occupy the board.

Illustrative starting shape, subject to measurement:

- 8-16 replayable candidates total;
- 2-4 candidates per technique;
- latest population/failure summary per technique;
- small rolling activity history;
- separately bounded proof-fact cache.

### 13.2 Preserve different reasons for interest

Do not keep top-N by one score.

Reserve capacity for candidates that are extreme or distinct along different axes:

- depth;
- remaining length/intersection slack;
- obligation progress;
- residual volume;
- topology/footprint novelty;
- producer-local relevance;
- rare structural bucket.

### 13.3 Lineage

Every consumed artifact should record:

- source artifact ID;
- producer technique;
- consumer technique;
- action type;
- work spent after import;
- whether the imported structure survived;
- whether neutral metrics improved;
- whether the solve was attributable to the imported lineage.

Without lineage, cooperation results become anecdotes.

## 14. Shadow evaluation: test producer and receptor before live handoff

The existing [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) supplies the project's precedent for observe-only evidence. Artifact work should extend or sit beside that machinery without distorting its branch-reasoner API.

### 14.1 Producer tests

For each artifact class, measure:

- emission frequency;
- canonical work at first emission;
- bytes/count per attempt;
- replay success;
- within-technique redundancy;
- cross-technique redundancy;
- structural/resource novelty;
- how long the information remains relevant before the recipient would run.

A producer that emits useful-looking information only after the solve budget is essentially gone is a poor handoff source.

### 14.2 Receptor tests

Before changing behavior, measure whether the artifact would touch a **real decision surface** in the recipient.

Examples:

#### Repair receptor probe

- Would this external prefix be accepted as legal/replayable?
- Is it structurally different from repair's current elites?
- Does it satisfy obligations or occupy regions absent from repair's population?
- Would importing it merely duplicate an elite repair already found earlier?

#### DFS/LDS receptor probe

- Does external information distinguish siblings whose native scores are close enough that rank could change?
- How early do such decision points occur?
- Would the hint reduce discrepancy of known validated winning prefixes, where multiple hints exist?

#### Admissible-order receptor probe

- Does external information distinguish equal-slack siblings?
- How frequently does that happen before the winning path diverges?
- Is the producer signal stable across different validated solutions or families?

#### Beam receptor probe

- Would external information preserve a candidate the native cull would discard?
- Is that candidate genuinely structurally different from the retained frontier?
- Does the imported retention rule create diversity rather than merely protect another high-score clone?

#### Scheduler receptor probe

- Conditional on this failure/activity signature, does another technique's success probability or solve cost differ materially from its unconditional rate?
- Does the signal add information beyond static level features and already-known starvation state?

### 14.3 Counterfactual consumer records

A shadow consumer should emit something like:

```ts
{
  sourceArtifactId,
  consumerTechnique,
  proposedAction,
  reason,
  estimatedExtraWork,
  nativeAlternative,
}
```

No search changes yet. This creates an auditable opportunity population before live experimentation.

## 15. Known-solution and family analysis

Validated known solutions are useful positive examples, not exhaustive ground truth.

Where multiple solutions exist, ask:

- did an emitted artifact share a prefix/structure with any known winning path?
- did a producer discover winning-like structure that its own retention later lost?
- would a cross-technique board preserve winning structure longer at equal capacity?
- does external guidance reduce the recipient's discrepancy/rank cost to at least one known solution?
- are useful artifacts structurally complementary even when not close to stored hints?

The variant/family corpus in [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) is a later high-value validation layer because it can test whether signals generalize across related puzzles rather than memorizing level identity.

Useful family questions include:

- does an artifact transform coherently under rotation/mirroring?
- when one sibling solves and another fails, which technique's artifact population diverges first?
- does a successful sibling expose an artifact class missing from the canonical failure?
- does a handoff predictor generalize across held-out parent families?
- are orientation-sensitive failures accompanied by beam/ordering/population collapse that points to a deeper search-control asymmetry?

Do not make family identity a production policy feature.

## 16. Priority handoff experiments

The order below reflects both receptor evidence and the risk of repeating known negative work.

### Priority 1: beam diverse survivors -> repair external seeds

**Why it is first:**

- beam already pays to maintain multiple viable alternatives;
- repair already consumes multiple starting structures;
- the two techniques fail for different reasons;
- candidate transfer can be replayed exactly;
- the hypothesis is materially different from repair's own elite-prefix DFS experiment because the producer is an independent search population, not repair's existing elite family.

#### Shadow premise gate

Before a live A/B, show that on a meaningful unsolved population:

- beam emits candidates early enough to precede repair;
- at least some are not near-duplicates of repair's own eventual elite population;
- they occupy distinct obligation/resource/topology buckets;
- a non-trivial number pass the repair-seed eligibility rule;
- the seed pool can be limited to 2-4 candidates.

#### Live design if the gate passes

- replay 2-4 selected beam prefixes;
- give imported-seed repair a tiny fixed canonical-work slice;
- preserve ordinary repair unchanged with a protected budget;
- compare against a control that gives the same extra work to ordinary repair/fresh repair seeds;
- attribute wins through artifact lineage.

A gain must beat “repair simply got more work.”

### Priority 2: external soft guidance at deterministic ordering ambiguities

This combines the strong DFS/admissible-order receptor evidence with a lower expected consumption cost than seeded secondary searches.

Begin with **shadow rank analysis**, not live guidance.

Potential producer signals:

- multiple independent artifacts share an early next move;
- an external candidate survives deeply with a particular early decision;
- a previous technique spent large canonical work beneath the opposite decision and repeatedly contradicted;
- an external candidate clears a scarce obligation/interface through one branch.

Potential recipients:

1. admissible-order equal-slack ties;
2. DFS siblings with near-equal native score;
3. LDS discrepancy accounting for externally supported branches.

The first live version, if justified, should only reorder siblings. It should never delete them.

### Priority 3: failure-conditioned bounded allocation

Use standardized failure/activity summaries to decide whether another **small** slice is worth buying.

The first model should be an interpretable empirical handoff table, not a learned black box:

`producer failure/artifact class -> proposed recipient -> conditional success/cost`

Examples worth testing:

- early beam diversity collapse -> repair value;
- repair plateau with continuing elite turnover versus frozen elite family -> beam/deterministic value;
- deep expensive DFS contradiction -> alternative-order technique value;
- admissible-order starvation -> reserve rather than true failure;
- no useful artifact after substantial work -> retire technique earlier.

Only after explicit rules show a stable signal should a hazard model be considered.

### Priority 4: external evidence -> beam retention

This is mechanistically promising because beam already has strong retention sensitivity, but producer-to-retention semantics are less obvious than beam -> repair.

Start in shadow mode:

- identify candidates native beam would cull;
- mark which ones external artifacts would have protected;
- measure whether they occupy genuinely missing structural buckets;
- track their descendants hypothetically where feasible.

A live rule should reserve only a tiny number of frontier slots so native beam ranking remains dominant.

### Priority 5: repair -> deterministic seeded completion

Demoted relative to the original intuition because Pathfinder has already tested a close cousin and measured a net-negative result.

Reconsider only if shadow evidence identifies a **new selector** that sharply reduces the opportunity population and work cost, for example a specific residual class where deterministic completion historically has high conditional success.

Do not repeat a fixed grid of repair elites × fractional destroy points.

### Priority 6: cross-technique proof/fact sharing

Potentially powerful but highest soundness burden and uncertain opportunity rate.

Only pursue after exact proof classes and semantic identity rules are independently justified. Candidate/guidance interoperability may deliver most of the value without this layer.

## 17. Failure-conditioned scheduling design

If the earlier pairwise work succeeds, the scheduler can consume standardized evidence rather than technique internals.

Conceptually:

```ts
nextSlice({
  levelFeatures,
  attemptsSoFar,
  canonicalWorkRemaining,
  latestFailureSignatures,
  artifactBoardSummary,
  participationFloors,
})
```

### 17.1 Start with conditional tables

For each meaningful signal:

- eligible level count;
- recipient success rate;
- recipient work-to-solve distribution;
- static-feature baseline rate;
- incremental predictive value of the online signal;
- artifact arrival work;
- likely cost of acting.

This directly tests whether online evidence contributes something the failed static classifier did not.

### 17.2 Hazard framing later

A later model may estimate probability of success in the **next canonical-work slice** given:

- coarse level features;
- technique work already spent;
- failure/activity class;
- artifact improvement rate;
- population diversity trend;
- starvation status.

Use it to continue, retire, or introduce a specialist only after the empirical conditioning is stable.

### 17.3 Participation floors remain mandatory

A learned or explicit scheduler must not suppress independent rescue techniques to zero merely because another producer's correlated evidence looks persuasive.

## 18. Evaluation standards

### 18.1 Instrumentation acceptance

The substrate ships only if:

- artifact emission disabled is behavior-identical;
- shadow emission does not affect search decisions;
- overhead is negligible or explicitly research-gated;
- same-revision replay success is effectively 100%;
- artifact volume is tightly bounded;
- serialization tests prevent field loss;
- heuristic artifacts cannot enter hard-prune APIs;
- canonical work accounting remains authoritative.

### 18.2 Producer acceptance

An artifact class is worth retaining only if it has at least one named receptor and demonstrates some combination of:

- non-trivial opportunity frequency;
- cross-technique novelty;
- early enough arrival;
- stable replay;
- useful structural/resource diversity;
- predictive relation to a recipient decision surface.

“Looks interesting in an inspector” is not acceptance.

### 18.3 Receptor acceptance

Before live use, show that the information could actually alter a meaningful decision:

- different seed than native population;
- different sibling rank;
- different beam retention outcome;
- different bounded allocation decision.

If an artifact is usually redundant with what the consumer already knows, do not spend live budget on it.

### 18.4 Live handoff acceptance

Every live A/B must compare at equal canonical work and report:

- solved count gained/lost;
- solved-ID set changes;
- work-to-solve distribution;
- native recipient wins displaced;
- artifact production overhead;
- replay/consumption cost;
- eligible versus consumed handoffs;
- lineage-attributable solves;
- deadline truncation separately from deterministic failure;
- matched-work control where the same work is given without imported information.

### 18.5 Scheduler acceptance

Additionally report:

- how often policy differs from static baseline;
- exact signal causing each difference;
- gains/losses by decision rule;
- technique participation by level class;
- starvation introduced or repaired;
- counterfactual matched-work static schedule;
- stochastic stability where relevant.

## 19. Tooling

Build only missing seams.

### 19.1 Artifact schema/fixture tripwire

Mirror the `Attempt` contract discipline:

- maximal fixtures;
- exhaustive field classification;
- serialization round trips;
- schema version tests.

### 19.2 Canonical replay/metric evaluator

One reusable artifact witness validator and common-metric projector.

### 19.3 Artifact inspector

For one level, show:

- attempt timeline in canonical work;
- emitted artifacts;
- common metrics;
- producer-local reasons;
- hypothetical receptor actions;
- lineage;
- eventual solve/provenance when present.

### 19.4 Producer-receptor matrix report

This supersedes a generic “artifact diversity” report as the main decision tool.

For each pairing, report:

- producer;
- artifact kind;
- recipient/receptor;
- eligible level count;
- artifact arrival work;
- redundancy with recipient-native information;
- hypothetical action frequency;
- known-winning affinity where valid;
- conditional recipient success/cost;
- estimated consumption work.

The report should rank **testable handoffs**, not artifacts in isolation.

### 19.5 Cross-technique redundancy report

Still useful as a supporting diagnostic:

- exact/near duplicate candidate rates;
- unique topology/resource buckets;
- unique obligation-order states;
- earliest discovery of candidate classes;
- unique failure evidence.

### 19.6 Artifact fixture export

Export a surprising artifact/handoff as a stable test fixture and feed the level into the existing reducer/testing ecosystem. Do not build a second reducer.

### 19.7 Shadow consumer hooks

A consumer declares:

- artifact eligibility;
- hypothetical action;
- required work;
- reason;
- native alternative.

Run the decision without altering live search.

## 20. Staged implementation roadmap

### Stage 0: inventory both producers and receptors

Do not inventory artifact-like outputs alone. For each technique, record:

1. what useful data it already creates;
2. what measured sensitivity could consume external information;
3. current instrumentation exposing that sensitivity;
4. prior experiments that already tested a similar mechanism;
5. cheapest shadow probe connecting producer and receptor.

Read [`README.md`](README.md) and [`future-work.md`](future-work.md) before creating any new tool or doc.

Output: a producer/receptor inventory and mapping to existing code, not solver changes.

### Stage 1: common contract and replay boundary

Implement:

- artifact discriminated union;
- claim classes;
- context identity reusing `Attempt` fields;
- replay-complete witness;
- canonical replay validator;
- modest common metric vector using existing calculations;
- maximal fixtures and serialization tripwires.

No live consumption.

### Stage 2: bounded cheap emitters

Priority:

1. repair elites + failure/plateau summaries already supported by existing machinery;
2. beam diverse survivor sample + frontier concentration summary;
3. DFS productive/deep-prefix + expensive-subtree summary using existing debug concepts;
4. admissible-order equal-slack decision + constrained-prefix summary.

Avoid expensive new structural calculations until cheap signals are characterized.

### Stage 3: receptor probes and shadow board

Instantiate the bounded board and run shadow consumers for at least:

- beam survivor -> repair seed eligibility/novelty;
- external signal -> admissible-order tie-break opportunity;
- external signal -> DFS rank/discrepancy opportunity;
- failure signature -> next-technique conditional outcome.

This is the first real decision gate.

**Stop** if artifacts are redundant, arrive too late, rarely touch recipient decisions, or would require too much work to consume.

### Stage 4: first live pairwise handoff

Choose the pair with the strongest Stage 3 producer/receptor evidence.

Beam -> repair is the default candidate only if evidence is roughly tied, not a commitment.

Use a tiny fixed work slice, protected native recipient budget, lineage, and matched-work control.

### Stage 5: cheap guidance experiment

If ordering-receptor evidence is strong, test one soft reordering mechanism separately from seeded search.

Prefer a minimal perturbation such as admissible-order tie-breaking or DFS sibling ordering at explicitly eligible nodes.

### Stage 6: second independent handoff shape

Only after one mechanism wins, test a qualitatively different exchange mode, such as retention guidance or failure-conditioned allocation.

The purpose is to determine whether the substrate generalizes or merely supports one special-case trick.

### Stage 7: bounded adaptive allocation

Use measured online evidence to grant/deny small future work slices. Start with explicit rules.

### Stage 8: proof sharing, optional

Only for exact fact classes with full identity/soundness tests.

## 21. Questions this groundwork must answer

The completed substrate should make these questions answerable directly from data:

- Which technique first discovers candidate structure another technique later needs?
- Which technique pairs mostly rediscover the same prefixes despite different algorithms?
- Are beam survivors genuinely different from repair elites on the same level?
- Does repair ever spend substantial work rediscovering a structural family beam had already exposed?
- At DFS decision points with high downstream cost, did another technique already prefer the winning branch?
- At admissible-order equal-slack ties, does independent search provide a useful discriminator?
- Which external signals would actually protect beam candidates the native cull removes?
- When beam collapses structurally, which later technique has the highest conditional rescue rate?
- Which repair plateau shapes predict value from deterministic or beam search?
- Are late attempts failing, or simply being starved before their characteristic artifacts appear?
- How early does a useful handoff artifact exist relative to the recipient's start time?
- How often does a proposed consumer request information it already has independently?
- Can a tiny imported-work slice outperform giving the same work to the recipient's ordinary search?
- Do cross-technique gains survive held-out family/variant splits?
- Are orientation-sensitive failures accompanied by systematic artifact/population asymmetries?
- Which apparent insights are attractive diagnostics but have no measurable receptor value?

If the system cannot answer questions at this level, it has become logging for logging's sake.

## 22. Recommended first implementation scope

The first coding task should implement and test the **interoperability research substrate**, not cooperation policy.

It should:

1. inventory existing producer data **and measured receptors** before adding fields;
2. define the typed common envelope and claim classes;
3. define the replay-complete witness and canonical replay validator;
4. compute a modest neutral common metric vector from replayed state;
5. add bounded opt-in shadow emitters using values each technique already possesses;
6. add an observe-only per-solve artifact board;
7. add canonical serialization/fixture tests modeled on the `Attempt` contract;
8. add shadow consumer hooks capable of expressing candidate-seed, ordering, retention, and allocation proposals without changing search;
9. add a producer-receptor report measuring novelty, redundancy, arrival work, receptor eligibility, and hypothetical action frequency;
10. prove observe-only mode does not alter deterministic results;
11. stop before any artifact changes a move order, frontier, seed, prune, or budget allocation.

The first research runs should then decide **which handoff deserves implementation**, rather than implementing several cooperation mechanisms at once.

## Bottom line

Pathfinder no longer has to justify interoperability with the generic claim that “search algorithms sometimes benefit from sharing information.” The solver's own history gives a more specific foundation.

Repair has measured memory and diversity receptors. DFS/LDS has a measured ordering/discrepancy receptor. Admissible-order has a measured tie-break receptor. Beam has a measured retention/diversity receptor. The outer ladder has a measured allocation/starvation problem and currently lacks online search evidence.

At the same time, each technique already generates information that another technique might use. The missing fact is not whether the algorithms are information-sensitive. **They are.** The missing fact is whether one technique produces the right information for another **soon enough and cheaply enough** to beat the cost of consumption at fixed total work.

That makes interoperability a serious, evidence-backed research direction, but not yet a production feature.

The right foundation is:

**typed producer artifacts + named recipient receptors + replay-complete witnesses + neutral common metrics + explicit soundness classes + bounded retention + lineage + canonical-work accounting + shadow counterfactuals.**

Build that foundation first. Then promote only the producer -> receptor pairing that earns its way into the live solver.

## Observation-layer implementation update (2026-08-11)

Bounded beam/repair population comparison is now available offline; there is still no live consumption or blackboard. The original synthetic check has been superseded by the three-level real producer pilot below; it remains observation-only and supplies no receptor verdict. See [`reports/2026-08-11-solver-research-observation-tooling-pilot.md`](../reports/2026-08-11-solver-research-observation-tooling-pilot.md).

## Producer-premise pilot update (2026-08-11)

The first observation-only comparison is complete on three hard Corpus-2 levels: 107 bounded beam
survivors versus 191 repair-elite arrivals had zero exact-prefix and zero full metric-projection
overlap. This is preliminary non-redundancy, not receptor evidence; no live consumption is justified.
The next bounded experiment should add region/interface descriptors and counterfactual repair
receptor evaluation. See
[`reports/2026-08-11-beam-repair-producer-population-pilot.md`](../reports/2026-08-11-beam-repair-producer-population-pilot.md).

**Stratified follow-up (2026-08-13):** the pilot tool now supports a deterministic stratified draw
(`--sample=N --seed=X`); a 25-level stratified run (~8x the original level count, same per-level
budget) found the identical zero/zero result — 942 beam artifacts vs. 1,657 repair-elite artifacts,
no exact-prefix or metric-projection overlap on any level. The non-redundancy premise is now
reasonably solid at population scale, not just a 3-level observation. Still no receptor verdict: the
next gate remains a counterfactual evaluation (does repair's own outcome improve when seeded with a
beam survivor, budget-matched), not a live handoff. See the report's own "Stratified follow-up"
section for the full numbers and the negative repair-elite-prefix-DFS precedent this must clear.

**Counterfactual evaluation, run and closed negative (2026-08-13):** built `enableBeamSeed`
(`repair-search.ts`) — a small beam search seeds repair's initial elite pool from its surviving
frontier, validated through the real state machinery and budget-charged against repair's own node
counter — and wired it into the live ladder as `STRATEGY_REPAIR_BEAM_SEED`. An ISOLATED
`repairSearchFromGate` counterfactual (bypassing the full ladder, matched 2,000,000-node budget)
found what looked like a real win: R00701 went from stuck-at-badness-2 to fully solved, 0 solve
losses across n=13. Re-tested through the actual `solveLevel()` ladder on the same sample at
production-realistic budget (25M nodes): R00701 was **already solved by ordinary repair fallback
with the flag OFF** — the isolated test's budget was far more constrained than what repair actually
gets inside the full ladder, so the apparent gain never existed at the level that matters. Full-ladder
result: 2/13 solved in both arms, byte-identical, +3.5% nodes for zero benefit. Closed, not promoted
— but a durable methodological lesson for this whole research line: **an isolated-technique
counterfactual must be re-verified through the full ladder before it's trusted**, since constraining
a receptor's own budget more tightly than production ever would can manufacture a gain that doesn't
exist at the resource envelope that actually ships. See
`docs/solver-opt-in-experiment-ledger.md`'s `STRATEGY_REPAIR_BEAM_SEED` entry for the full record.

> **2026-08-11 review status:** No production policy from this track was changed in the PR #1356 follow-up. Completed lineage/correctness evidence and the explicitly uncompleted oracle/receptor work are recorded in [the review follow-up report](../reports/2026-08-11-pr1356-review-follow-up.md); oracle abstentions remain abstentions.
