# Solver interoperability and cooperation plan

> **Status:** design and research plan, not production solver behavior
> **Written:** 2026-08-10
> **Revised:** 2026-08-10 to make documentation ownership and prior evidence explicit
> **Decision:** build a common artifact contract and shadow-mode exchange layer before allowing techniques to influence one another. Standardize evidence, replayability, provenance, and neutral derived metrics; do not force techniques into one shared notion of state quality.
> **First gate:** demonstrate, on unchanged solver runs, that different techniques emit non-redundant artifacts that have measurable predictive or handoff value at equal canonical work.

## Executive summary

Pathfinder's solver already has multiple techniques with genuinely different search behavior: DFS and its variants, beam search and diversity mechanisms, admissible-order search, randomized repair and its elite/plateau machinery, plus a feature-keyed attempt policy that decides which configurations receive work. The existing architecture is therefore already a portfolio. What it mostly lacks is a durable way for one technique to leave behind useful information that another technique can understand and safely exploit.

The proposed direction is to make failed and partial search produce **typed, standardized artifacts** and expose those artifacts through a bounded per-solve exchange layer, or "blackboard". Techniques remain independent algorithms. They do not need to agree on a universal score, universal partial-state representation, or universal definition of progress. Instead, they agree on:

- how an artifact identifies its producer and the exact solve context;
- how replayable path/state witnesses are represented;
- which neutral state/resource measurements have common meanings;
- how proof-strength is distinguished from heuristic evidence;
- how technique-specific payloads are carried without being flattened into fake commonality;
- how much artifact data may be emitted and retained;
- how later experiments can measure whether a proposed handoff would have helped.

This creates two capabilities at once.

First, it creates a **research instrument**. A failed run stops being only `solved=false`; it can become a small structured account of the best, strangest, deepest, most diverse, most constrained, or most informative states each technique discovered and of the shape of its failure. That lets the project test whether techniques actually possess complementary information before spending solver budget on cooperation.

Second, if the evidence supports it, the same contract becomes the substrate for **live cooperation**. Beam survivors can seed repair. Repair elites can become replayed prefixes for bounded deterministic completion. Failure signatures can choose which complementary technique receives the next work slice. Exact proved facts can eventually be shared across techniques, while soft evidence remains guidance only.

The important architectural principle is:

> **Standardize the language in which techniques exchange evidence, not the search philosophy that produces the evidence.**

A universal `bestState` or universal scalar score would likely destroy useful diversity. A common envelope plus common derived measurements plus typed technique-specific payloads preserves it.

## Documentation ownership map

This plan is the canonical home for **interoperability and cooperation design**, but it intentionally does not duplicate the documents that own current solver behavior, current experiment status, mechanic state, or prior results. When this plan and another document overlap, use the following ownership rules.

| Topic | Canonical reference | How this plan uses it |
|---|---|---|
| Where to find current docs and which docs are authoritative | [`README.md`](README.md) | Start here before adding a new artifact tool or document so an existing owner is not accidentally duplicated. |
| Live solver queue and current verdicts | [`future-work.md`](future-work.md) | Determines what is actually open now. This plan may propose later stages that are not yet live work. |
| Current solver architecture, techniques, attempt policy, search state, replay semantics | [`solver-architecture.md`](solver-architecture.md) | Controls how witnesses are reconstructed and what current production behavior actually is. |
| Dynamic mechanic state and state-cardinality contracts | [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Mandatory audit checklist for any replay-complete witness or exact shared state identity. |
| Canonical work accounting and deterministic-budget comparisons | [`solver-budget-determinism.md`](solver-budget-determinism.md) | Controls all equal-work handoff and scheduling experiments. |
| Current correctness lessons, unsafe state abstractions, and hardening precedent | [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Controls proof-quality artifact and state-equivalence claims. |
| Shared shadow-mode reasoning evaluation | [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Existing model to reuse for observe-only evaluation rather than creating another generic shadow framework. |
| Current heuristic/inference capability gaps | [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) | Supplies the open failure-conditioned-control and residual-resource motivations that artifacts may expose. |
| Repair stagnation, elites, plateau signatures, recombination, relinking, and later corrections | [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) | Source of repair-specific artifact semantics and several important negative-result boundaries. |
| Broad cold-start portfolio scheduler experiment | [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) and its [`decision report`](../reports/portfolio/portfolio-scheduler-decision.md) | Establishes that merely reordering/restarting techniques faster did not help. It does not test artifact-driven cooperation. |
| Variant/family boundary research and symmetry diagnosis | [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) | Owns family-specific conclusions; later artifact studies should feed it rather than form a parallel family-analysis stack. |
| Solution-space fingerprints and existing path-distance machinery | [`solution-profile.md`](solution-profile.md) | Reuse for candidate novelty/structural comparisons where its semantics fit. |
| Historical solver research ledger, including homotopy and transposition/classifier work | [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Prevents old ideas from being rediscovered as new artifact features. |
| Literature-informed activity, hazard, and adaptive-search hypotheses | [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) | Source for search-activity and conditional-hazard ideas used here as hypotheses, not findings. |
| Investigation status/decision/gate conventions | [`investigation-report-conventions.md`](investigation-report-conventions.md) | Any live handoff or scheduler experiment promoted from this plan should follow these conventions. |
| Existing reducer/benchmark/failure-inbox development tooling | [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Reuse these tools for artifact-caused regressions and minimal repros instead of building a second diagnostics stack. |

### Implementation precedent: the canonical `Attempt` contract

There is not currently a separate design document whose sole job is to describe the 2026-08-09 `Attempt` projection/transport cleanup. The durable implementation precedent is therefore the code and tests themselves. The maximally populated fixture in [`scripts/test-lib/fixtures.mjs`](../scripts/test-lib/fixtures.mjs), provenance contract tests in [`modules/solver/hint-provenance.test.ts`](../modules/solver/hint-provenance.test.ts), raw structured-clone worker transport in [`modules/solver/worker-result-serialization.mjs`](../modules/solver/worker-result-serialization.mjs), and canonical report projection in [`scripts/portfolio-solve-sweep-lib.mjs`](../scripts/portfolio-solve-sweep-lib.mjs) collectively establish the pattern this plan wants to reuse: define the field contract once, classify what persists, and make tests fail when a new field silently disappears. The originating merge was commit `1d98ef2763a041b751536b1e6ee873d5da5f729f`.

### Prior evidence that must not be accidentally repeated under new names

Several experiments sit unusually close to proposed cooperation mechanisms. Read the exact result before implementing a superficially similar handoff:

- **Broad fast portfolio / cold-start tier rotation:** [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) and [`portfolio-scheduler-decision.md`](../reports/portfolio/portfolio-scheduler-decision.md). Result: slower than legacy in every measured variant. New cooperation must exchange information, not merely restart/reorder attempts.
- **Exact repair path relinking:** [`2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md). Result: built and sound, but exact suffix transplantation collapses under prefix-dependent legality.
- **Elite-prefix deterministic repair:** [`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md). Result: real mechanism, net-negative under the shared budget. A later repair-to-DFS handoff must be materially different in selection/evidence or it is a rerun.
- **Repair exact-state memory:** [`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md). Result: a complete repair-scoped exact-state key actually found substantial repeated dead states and shipped default-on. This is positive evidence for exact local memory, not permission to use incomplete cross-technique signatures as hard facts.
- **Admissible-order budget starvation:** [`2026-07-31-admissible-order-tier-node-starvation.md`](../reports/2026-07-31-admissible-order-tier-node-starvation.md), the current main-loop treatment in [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md), and the live status in [`future-work.md`](future-work.md). A zero-work technique did not fail; it was never given a meaningful attempt.
- **Learned repair-winner routing:** [`2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md). Result: concluded negative. Failure-conditioned scheduling here must use genuinely new online evidence, not quietly rebuild the same static classifier.

This evidence map is intentionally redundant with some later inline links. For this document, easy navigation is more valuable than making readers remember where an earlier footnote lived.

## Reuse existing infrastructure rather than rebuilding it

This plan depends on existing systems and should extend them only where the artifact use case exposes a real missing seam:

- [`solver-budget-determinism.md`](solver-budget-determinism.md) already provides the canonical cross-technique work currency needed for fair effort accounting.
- [`solver-architecture.md`](solver-architecture.md) already owns the real state transition machinery and the feature-keyed attempt policy.
- [`mechanic-state-contracts.md`](mechanic-state-contracts.md) already inventories dynamic state that can make two superficially similar path prefixes semantically different.
- the canonical `Attempt` fixture/projection/transport implementation described above already provides a model for field-contract tripwires.
- [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) already provides the project's pattern for observing candidate reasoning without changing solver behavior.
- [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) already provides repair elites, badness, signed plateau information, and multiple measured attempts to exploit them.
- [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) already provides the family-conditioned evaluation discipline needed later.
- [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) already provides reducer, ranking, diff, regression, and failure-inbox infrastructure.

Do not create a second provenance system, second work currency, second family database, second reducer, second generic shadow harness, or second generic benchmark/report stack just to make artifact work feel self-contained.

## 1. What "interoperability" should mean

Interoperability should be broader than "technique A can pass a path to technique B". There are at least four useful layers.

### 1.1 Observational interoperability

Every technique can describe what happened using a shared outer contract. Reports can compare attempts without knowing the internals of each technique.

Examples:

- how much canonical work was spent before an artifact appeared;
- how deep a replayable prefix is;
- which obligations remain;
- which residual resources are scarce;
- whether the search population has collapsed into one structural family;
- whether progress has plateaued;
- which prune/failure classes dominate.

This layer is useful even if no technique ever consumes another technique's artifacts.

### 1.2 Candidate interoperability

A technique can emit one or more replayable candidate witnesses, and another technique can reconstruct them through the real solver transition machinery defined by [`solver-architecture.md`](solver-architecture.md).

This enables handoffs such as beam-to-repair or repair-to-DFS without sharing mutable internal solver objects.

### 1.3 Diagnostic interoperability

A technique can emit a failure or search-condition signature that a scheduler or another technique can use as soft evidence.

Examples include beam extinction, repair plateau shape, repeated contradiction classes, lack of improvement for a measured work interval, or population diversity collapse.

### 1.4 Proof interoperability

A technique can emit an independently justified fact that is safe for another technique to rely on as a hard constraint.

This is the most powerful and most dangerous layer. It must be opt-in by artifact kind and must never arise merely because a heuristic signal is strong. Pathfinder's history-sensitive state makes lossy shared-state nogoods especially risky. The state-key warnings in [`solver-architecture.md`](solver-architecture.md), the corrected/superseded cases collected in [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md), and the contrast between the sound repair-scoped cache in [`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md) and older incomplete transposition ideas all remain controlling: an incomplete state identity may guide diversity or retention, but it cannot silently become a sound global dead-state key.

## 2. Non-goals and traps to avoid

### 2.1 Do not invent one universal solver state

The techniques have different internal data structures for good reasons. The exchange layer should not require beam, DFS, repair, and admissible-order search to serialize their private working representation into one giant `UniversalState`.

For transferable candidates, the authoritative representation should be a **replayable witness** plus centrally derived measurements. The recipient reconstructs its own native state by replaying that witness through the real transition machinery.

This also avoids coupling every future mechanic addition to every technique's serializer. Any witness design must be checked against [`mechanic-state-contracts.md`](mechanic-state-contracts.md) so a new or history-sensitive mechanic cannot silently disappear from the exchange boundary.

### 2.2 Do not invent one universal score

There should not be a mandatory `quality: number` with the implication that higher means closer to a solution.

Repair's badness, beam's score/frontier rank, DFS depth, LDS discrepancy, admissible-order progress, residual resource margins, and structural novelty answer different questions. They can all be retained, but their semantics should stay explicit.

A common scalar would make the system easier to code and harder to reason about. It would also encourage the coordinator to erase the independence that makes a multi-technique solver valuable.

### 2.3 Do not turn correlations into prunes

Artifact consumers must know whether a claim is:

- a replayable observation;
- a diagnostic summary;
- heuristic guidance;
- an exact proved fact;
- an admissible bound with stated preconditions.

A beam population concentrating on one topology is evidence about beam search. It is not a theorem about the level. A repair elite with badness 2 is a promising repair state, not proof that states with badness 8 are inferior. A useful approximate state signature may drive novelty retention while remaining forbidden as a dead-state key.

The project's existing soundness boundary is documented repeatedly in [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md), [`solver-architecture.md`](solver-architecture.md), and the soundness rules in [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md). Artifact code should make that boundary structural rather than relying on comments or author discipline.

### 2.4 Do not let imported artifacts replace native search by default

Every live handoff should initially be **additive**. A technique keeps a protected slice for its ordinary starting behavior and may spend a bounded additional slice on imported candidates.

Otherwise one technique's bias can propagate through the whole portfolio and destroy the independent rescue paths that justified having multiple techniques in the first place.

### 2.5 Do not create another scheduler before proving complementarity

The failed fast-portfolio experiment is important evidence. [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) and its [`decision report`](../reports/portfolio/portfolio-scheduler-decision.md) show that a broad timed portfolio placed ahead of the legacy ladder was slower in every measured form. A sophisticated adaptive scheduler with no genuinely useful cross-technique signal is still only an expensive way to reorder attempts.

Artifact instrumentation should establish what information is complementary before live scheduling responds to it.

### 2.6 Do not persist huge search traces

The goal is not a debugger recording every expanded node. Artifact production must be aggressively bounded and purposeful. A solve should leave a small set of selected evidence, not a compressed duplicate of the whole search tree.

## 3. The common artifact envelope

A shared TypeScript contract should define the fields that every artifact carries, with technique-specific payloads behind a typed discriminant. The exact names can change during implementation; the semantic responsibilities should not.

Conceptually:

```ts
type SolverArtifact = {
  schemaVersion: number;
  kind: ArtifactKind;
  claimClass: ClaimClass;

  context: {
    levelId?: string;
    levelHash: string;
    solverVersion: string;
    gateKey: number;
    attemptId: string;
    technique: string;
    configKey: string;
    profile?: string;
    template?: string;
    seed?: number;
  };

  timing: {
    workAtEmission: number;
    attemptWork: number;
    ordinal: number;
  };

  witness?: ReplayWitness;
  metrics?: CommonCandidateMetrics;
  payload: TechniqueSpecificPayload;
};
```

### 3.1 Context identity

Artifacts need enough identity to answer both live and retrospective questions:

- exact level identity or stable content hash;
- gate;
- solver version/commit or provenance version already used by hints;
- attempt identity and config identity;
- technique;
- profile/template where meaningful;
- deterministic seed/salt where meaningful;
- canonical work consumed when the artifact was created.

This should reuse existing `Attempt` and hint-provenance identities rather than introduce parallel names for the same concepts. The canonical `Attempt` fixture in [`scripts/test-lib/fixtures.mjs`](../scripts/test-lib/fixtures.mjs) should be inspected before creating any duplicated context fields.

### 3.2 Claim class

Use an explicit field, not comments, to separate epistemic categories. A possible small enum is:

- `witness`: an exact replayable path/prefix/population member;
- `diagnostic`: a measured property of this search process;
- `guidance`: intentionally heuristic information safe only for ordering/retention/allocation;
- `bound`: a sound bound with declared preconditions;
- `proof`: a proved fact or exact nogood safe for hard consumption within its stated identity contract.

The artifact type should make illegal consumers difficult to write. A pruning API, for example, should accept only proof/bound artifacts, never a generic `SolverArtifact`.

### 3.3 Schema versioning and projection tripwires

Artifacts are likely to outlive individual experiments in stored reports. Give the contract an explicit `schemaVersion` from the beginning.

Do not silently reinterpret an old field after its meaning changes. Migrate reports when worthwhile or keep a compatibility reader. Mirror the current `Attempt` pattern: a maximally populated artifact fixture, explicit persistent/derived/transient classifications, worker/report round-trip tests, and failures when a new field has no declared destination. The concrete precedent lives in [`scripts/test-lib/fixtures.mjs`](../scripts/test-lib/fixtures.mjs), [`modules/solver/hint-provenance.test.ts`](../modules/solver/hint-provenance.test.ts), [`modules/solver/worker-result-serialization.mjs`](../modules/solver/worker-result-serialization.mjs), and [`scripts/portfolio-solve-sweep-lib.mjs`](../scripts/portfolio-solve-sweep-lib.mjs).

## 4. Replayable witnesses: the safest shared state boundary

The exchange layer should prefer **replayable witnesses** over copied mutable solver state.

A witness must contain enough information to reconstruct the exact semantic state through the production transition code. A coordinate sequence alone must not be assumed sufficient. Portal behavior is the obvious caution: when endpoints are adjacent, coordinate history can be ambiguous about whether a transition was an ordinary move or a forced portal jump. The portal-parity investigation had to move from coordinate-only reasoning to real solver-state replay for exactly this class of ambiguity; see the portal-parity closure summarized in [`future-work.md`](future-work.md) and the state model in [`solver-architecture.md`](solver-architecture.md).

More generally, [`mechanic-state-contracts.md`](mechanic-state-contracts.md) is the checklist for replay completeness. Any mechanic state listed there that can affect future legality, pruning, scoring semantics, or exact identity must either be reconstructed from the witness or explicitly shown to be derivable.

The exact witness format should therefore be whatever minimal move/transition trace allows a single canonical replay function to reproduce:

- current cell;
- real path length;
- visit counts;
- edge usage/axis history;
- intersection count;
- must-pass and must-cross state including cross counts/axis usage;
- portal jumps and portal-use state;
- flipper state;
- must-turn, adjacent-turn, and surround state;
- incoming-direction/history fields where future legality depends on them;
- any future mechanic state that [`mechanic-state-contracts.md`](mechanic-state-contracts.md) adds to the solver's semantic contract.

### 4.1 One canonical replay entrypoint

Create or expose one reusable function that accepts a level, gate, and replay witness and returns either:

- the reconstructed native solver state plus derived common metrics; or
- a precise replay failure describing why the witness no longer applies.

Do not let each consumer write its own partial replay logic. Reuse the same `createState`/`applyMove` semantics that [`solver-architecture.md`](solver-architecture.md) documents and that [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) already relies on when reconstructing labelled branch states.

### 4.2 Imported candidates are untrusted until replayed

Even artifacts produced by the same solver process should pass through replay before another technique consumes them. This provides:

- mechanic-state correctness;
- protection against stale schema or future refactors;
- a clear failure mode instead of corrupting a recipient technique;
- a natural place to compute common metrics consistently.

### 4.3 State fingerprints after replay

A replayed candidate may receive a canonical fingerprint for dedupe/diversity purposes. That fingerprint can be lossy if its declared use is lossy, such as artifact pool deduplication or novelty bucketing.

Do not reuse a lossy artifact fingerprint as a sound transposition/nogood key merely because it already exists. [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) and the exact-state discussion in [`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md) are the governing precedent for what a hard identity has to capture.

## 5. Common derived candidate metrics

A major benefit of replay is that neutral measurements can be computed centrally and identically for artifacts from every technique.

These metrics should describe the state, not declare its quality.

A useful initial vocabulary includes:

### 5.1 Basic progress

- replay depth / number of decisions;
- real length used;
- remaining exact length;
- current intersection count;
- remaining required intersections;
- current cell and goal distance;
- whether direct goal completion is currently legal/relevant.

### 5.2 Obligation state

- pending must-pass count/mask;
- pending must-cross count/mask;
- must-cross axis/completion summary;
- pending must-turn count/mask;
- pending adjacent-turn count/mask;
- pending surround count/mask;
- remaining portal/flipper obligations or useful resources where defined.

The exact dynamic fields and cardinalities should come from [`mechanic-state-contracts.md`](mechanic-state-contracts.md), not from a second hand-maintained artifact inventory.

### 5.3 Residual resource vector

This should build on the open research direction already described in [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md), without prematurely turning it into a production ordering rule.

Possible components:

- length slack above current admissible lower bound;
- intersection slack / free intersection budget;
- residual reachable fresh volume;
- available approach/interface counts for pending landmarks when cheaply measurable;
- portal parity/resource availability;
- remaining reusable cells/axes relevant to crossing obligations;
- goal-approach flexibility;
- any existing sound bound residuals that are already computed cheaply.

The purpose is to make statements such as "these two prefixes have equal length slack but radically different intersection and approach resources" visible across techniques.

### 5.4 Structural descriptors

Useful for diversity and retrospective analysis:

- coarse topology/homotopy signature where the existing research supports one;
- path cell/edge footprint hashes;
- approach-side or region occupancy summaries;
- revisit distribution;
- turn/intersection placement summaries;
- obligation order prefix;
- beam-style state bucket identity when meaningful.

Do not invent a new generic path-distance system before checking [`solution-profile.md`](solution-profile.md), which already owns cell/edge/turn/portal/must-cross solution fingerprints and distance comparisons, and [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md), which owns the still-relevant homotopy-class research thread. If those representations are insufficient for partial prefixes, extend their underlying primitives or document exactly why a new prefix-specific descriptor is required.

These descriptors should remain explicitly approximate where they are approximate.

### 5.5 Novelty

Novelty should be relative to a declared comparison set, not a mysterious scalar.

Examples:

- distance from other artifacts in the same producer's elite/frontier set;
- distance from artifacts already admitted to the blackboard;
- whether it occupies a previously absent structural bucket;
- edge/cell Jaccard distance using [`solution-profile.md`](solution-profile.md)'s existing machinery where appropriate.

If a single novelty score is computed for retention, preserve the underlying distance definition and comparison set in the payload or schema version.

## 6. Artifact kinds worth standardizing

The initial type system should be small enough to remain comprehensible but broad enough to cover the genuinely different outputs already available from the solver.

### 6.1 `candidate-prefix`

A replayable partial path selected because the producer considers it useful.

Sub-reasons should be explicit, for example:

- deepest productive prefix;
- best producer-local score;
- best resource margin;
- most obligation-complete;
- most structurally novel;
- pre-plateau best;
- surviving frontier representative;
- near-miss anchor.

A producer may emit several candidates with different reasons. This is preferable to pretending there is one `bestPrefix`.

### 6.2 `candidate-complete-nearmiss`

A replayable complete or terminal path that fails one or more exact objectives but may be especially useful to repair or diagnosis.

Repair naturally produces these. Deterministic techniques may occasionally produce meaningful terminal near-misses too.

Include an exact failure/residual vector rather than only a scalar badness. Repair's existing signed-residual and plateau work is documented in [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md).

### 6.3 `elite-set-sample`

A bounded sample of a technique's internally retained high-value population, with membership reason and diversity metadata.

This is especially natural for repair and beam.

Do not dump the whole population. Select a few representatives.

### 6.4 `frontier-summary`

A population-level diagnostic such as:

- frontier size;
- number of occupied diversity buckets;
- concentration ratio in the largest bucket;
- resource-vector spread;
- obligation-state spread;
- recent extinction/repopulation events;
- fraction of candidates sharing the same structural signature.

This can tell the scheduler that a beam is nominally large but behaviorally collapsed.

### 6.5 `failure-signature`

A typed summary of why productive progress stopped or why the attempt terminated.

Potential dimensions:

- exhausted versus budget-truncated;
- dominant prune/failure categories;
- contradiction depth distribution;
- last-improvement work offset;
- deepest useful depth;
- length-short versus other residual direction;
- repeated obligation/resource bottleneck;
- beam extinction;
- repair plateau signature/shape;
- seed convergence/repeated-basin evidence;
- no viable candidate surviving a specific interface condition.

These are diagnostics, not proofs unless a separate proof artifact exists. Repair plateau semantics should reuse [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md), while deadline/budget interpretation must follow [`solver-budget-determinism.md`](solver-budget-determinism.md).

### 6.6 `search-activity-summary`

A compact time/work-series summary of the attempt's dynamics:

- work between meaningful improvements;
- branch factor or survivor count over coarse work buckets;
- contradiction rate;
- improvement hazard;
- depth progression;
- beam population entropy/bucket count;
- repair elite turnover;
- repeated-return rate to the same coarse basin.

These ideas come from the failure-directed activity and adaptive/hazard proposals in [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md). That document is research, not evidence that these metrics will pay. The artifact layer is a cheap way to measure them before they become policy.

The key is coarse fixed-size summaries, not raw event logs.

### 6.7 `proof-fact`

Reserved for genuinely sound transferable facts. Examples may eventually include:

- exact semantic state proven dead;
- mechanic-derived forced fact;
- admissible lower bound result with exact preconditions;
- exact impossibility of satisfying an obligation interface.

This kind should require stronger construction APIs/tests than heuristic artifacts. The proof boundary should be reconciled with [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md), current mechanic state in [`mechanic-state-contracts.md`](mechanic-state-contracts.md), and any corresponding measured rule in [`future-work.md`](future-work.md) before a new hard consumer is written.

## 7. Technique-specific emissions

A common envelope should not imply identical artifact production.

### 7.1 DFS / LDS / deterministic search

Potential useful emissions:

- deepest prefixes that remained feasible for unusually long subtrees;
- prefixes immediately before high-cost contradictions;
- best prefixes under neutral resource vectors, not only local score;
- contradiction-depth histogram;
- dominant prune-reason histogram;
- productive-depth progression by work interval;
- discrepancy count and ordering-policy context for LDS-derived artifacts;
- exact exhausted-state facts only where the full semantic key is already sound.

A particularly interesting diagnostic is whether DFS repeatedly spends large subtrees beneath a small number of early choices before learning they fail. That can support later bounded divergence or alternate-technique handoffs without introducing an unsound prune. The measured finding that simple move ordering was not the general bottleneck is already reconciled in [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md); do not interpret deep failures as automatic evidence for yet another score term.

### 7.2 Beam search

Potential useful emissions:

- a small Pareto/diverse sample of surviving prefixes;
- best representative from each occupied diversity bucket;
- frontier collapse/concentration summary;
- extinction depth and work;
- frontier resource-vector spread;
- states that are mediocre by beam score but uniquely occupy a structural/resource bucket;
- bucket transitions over coarse work intervals.

Beam is probably the most natural producer of **reconnaissance artifacts**. Its value to cooperation may be less "beam almost solved this" and more "beam cheaply surveyed several qualitatively different viable regions of search space". Existing beam dedup/diversity behavior is described in [`solver-architecture.md`](solver-architecture.md) and its current limitations/evidence in [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md).

### 7.3 Repair

Reuse its existing machinery instead of inventing parallel notions:

- elites;
- best/final badness;
- signed residual/failure signature;
- plateau shape;
- restart ancestry where useful;
- best pre-plateau candidate;
- structurally complementary elites;
- elite turnover and convergence rate;
- work since last meaningful improvement.

[`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) is the semantic owner for these signals. It records that plateaus are often length-short, complementarity-guided soft recombination can matter, exact relinking fails under prefix-dependent legality, turn-bias promotion is net-negative, and the repair-scoped exact-state nogood cache later shipped. Use those existing meanings and results rather than adding a second set of nearly identical artifact concepts.

### 7.4 Admissible-order search

Potential emissions:

- best prefix under admissible-order objective progress;
- discrepancy/order-deviation metadata;
- whether the ordering regime is being starved before meaningful work;
- prefixes where the ordering constraints remain satisfiable but ordinary search did not reach deeply;
- exhaustion versus allocation-starvation distinction.

Budget/participation metadata is mandatory here. [`2026-07-31-admissible-order-tier-node-starvation.md`](../reports/2026-07-31-admissible-order-tier-node-starvation.md) demonstrated that many historically solvable configurations could receive zero current work because earlier tiers consumed the cumulative budget. The analogous main-loop issue and current reserve-not-reorder experiment are tracked in [`future-work.md`](future-work.md) and [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md). An artifact record must distinguish "technique exhausted/faltered" from "technique never really entered."

## 8. The per-solve blackboard

Once artifact emission exists, add a bounded in-memory `SolveArtifactBoard` owned by the solve session or orchestrator, not by any individual technique.

Its responsibilities should be deliberately boring:

- accept validated artifacts;
- enforce type/schema and size limits;
- replay/validate candidate witnesses before indexing them for consumption;
- deduplicate exact duplicates;
- compute common metrics centrally;
- retain a bounded diverse subset according to declared retention rules;
- expose read-only queries to techniques and scheduler experiments;
- record every proposed and actual consumption for later attribution.

It should **not** decide the solver's global strategy in its first implementation. The current attempt-policy/orchestration boundary is described in [`solver-architecture.md`](solver-architecture.md); the board should start as data infrastructure underneath that boundary, not an implicit replacement for it.

### 8.1 Bounded retention

Use separate quotas by artifact class so one noisy technique cannot fill the board.

An illustrative shape, to be measured rather than copied literally:

- 8-16 replayable candidate prefixes total;
- 2-4 candidates per technique;
- 1 latest frontier/population summary per technique;
- a small rolling set of failure/activity summaries;
- all sound proof facts subject to their own safe bounded cache policy.

Candidate retention should preserve different reasons for interest, not just top-N by one score.

### 8.2 Pareto-style candidate preservation

A candidate pool becomes much more useful if it keeps states that are good in different dimensions.

Possible retention axes:

- remaining length slack;
- intersection slack;
- pending obligation count/type;
- residual volume;
- interface flexibility;
- producer-local quality;
- structural novelty;
- depth.

A full Pareto frontier may be unnecessarily expensive or large. A practical bounded approximation is enough: reserve slots for extremes and structurally distinct buckets, then fill remaining slots by producer-local relevance. The resource-vector motivation comes from [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md); this section proposes using it for retention research, not promoting it to a universal solver score.

### 8.3 Technique participation protection

Give each technique either a small artifact quota or a protected chance to contribute before global retention can evict all of its outputs. Otherwise the blackboard can become another hidden universal scorer.

The same principle should later apply to live work allocation: imported information must not erase the independent rescue behavior of the recipient's native search.

### 8.4 Artifact lineage

When an imported candidate produces another artifact, record lineage:

- source artifact ID;
- consuming technique;
- work spent after import;
- whether the descendant improved neutral metrics, producer-local score, or solved;
- whether the imported prefix was modified immediately or preserved deeply.

This makes cooperation measurable rather than anecdotal and lets later reports separate "recipient solved after seeing artifact X" from "artifact X causally supplied the starting state that led to the solve."

## 9. Shadow-mode first: prove the substrate contains information

The first production-quality implementation should leave solver behavior unchanged.

The project already has a model for this discipline in [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md): measure a candidate signal against common data before wiring it into production behavior. Artifact consumers are richer than the harness's current reject/pass probe API, so extend that harness only where the abstraction remains clean. Do not contort arbitrary artifact policies into `verdict: reject|pass`, but also do not create a second generic shadow framework if a small sibling consumer contract can share its runner/report infrastructure.

### 9.1 Shadow artifact emission

During ordinary deterministic corpus runs, allow each technique to emit a tiny bounded artifact set. Persist it only in dedicated experiment reports or env-gated logs, not normal player provenance until its value/size is known.

Measure:

- artifact count and bytes per attempt/level;
- emission overhead in canonical work and wall time;
- replay success rate;
- redundancy within and across techniques;
- structural diversity;
- how early useful artifacts appear.

All work comparisons should follow [`solver-budget-determinism.md`](solver-budget-determinism.md). Deadline-truncated attempts are censored/indeterminate where that document says they are, not silently treated as deterministic failures.

### 9.2 Shadow handoff simulation

For every candidate consumer pair, ask "would this consumer have selected this artifact?" without actually changing its search.

Examples:

- would repair have accepted these beam survivors as seeds?
- would bounded DFS completion have selected this repair elite?
- would the scheduler have switched technique after this failure signature?

Record the hypothetical decision and compare it with what eventually happened in the unchanged baseline.

### 9.3 Known-solution prefix survival analysis

Where a validated known solution exists, compare emitted candidates against winning-prefix structure without treating the known hint as unique truth.

Questions:

- does one technique emit candidates closer to at least one known winning path than another?
- does a technique emit winning-like states that its own retention later loses?
- would cross-technique candidate pooling preserve known-winning prefixes longer at equal work?
- are useful candidates structurally complementary even when they are not geometrically close to one stored hint?

Use multiple known solutions where available and treat them as positive examples, not exhaustive ground truth. [`solution-profile.md`](solution-profile.md) already documents the saturated-versus-complete caution for solution corpora and should govern any claim that a known-hint sample represents the solution space.

The large variant/family corpus can make this analysis much stronger because many related levels have multiple solutions and provenance. [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) remains the owner of family-specific conclusions; this interoperability layer should provide standardized observations to it rather than grow a competing family-analysis subsystem.

### 9.4 Artifact-to-outcome conditional analysis

Build tables such as:

- producer technique -> artifact kind -> later solver technique -> solve rate;
- failure signature -> complementary technique success rate;
- artifact age/work offset -> eventual usefulness;
- candidate resource shape -> successful consumer;
- beam-collapse class -> repair/DFS/admissible-order outcome;
- repair plateau class -> deterministic-completion outcome.

This is the evidence needed before an adaptive scheduler is allowed to respond live.

Where dense variant rows are used, split evaluation by whole parent/family as required by [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md). Random row splits would leak near-duplicate family information into both sides of the analysis.

## 10. First live cooperation mechanisms worth testing

The order below intentionally starts with mechanisms that preserve solver independence and have clear attribution.

### 10.1 Beam survivors -> repair seeds

This is the cleanest initial live handoff if Stage 3 evidence does not identify a stronger pair.

Beam naturally creates multiple viable, structurally varied prefixes. Repair naturally consumes starting points and explores stochastic perturbations. The techniques are complementary in shape: reconnaissance versus local/randomized exploration.

Experiment design:

- select only 2-4 beam artifacts using structural/resource diversity, not simply top score;
- replay them through the canonical witness path;
- give imported-seed repair a tiny fixed canonical-work reservation;
- keep ordinary repair unchanged and separately budgeted;
- compare against a matched-work baseline that gives the same extra work to ordinary repair or beam, so a gain cannot be explained by "more work";
- attribute any solve to the imported artifact lineage.

Acceptance should require net solve gain or substantial equal-work cost reduction without regression on existing solved levels. Use the corpus/report discipline in [`future-work.md`](future-work.md), [`solver-budget-determinism.md`](solver-budget-determinism.md), and [`investigation-report-conventions.md`](investigation-report-conventions.md).

### 10.2 Repair elites -> bounded deterministic completion

Repair often finds near-misses and plateaus. A deterministic technique may be better at completing a constrained suffix once repair has discovered a globally promising prefix.

This area already has two especially relevant negative experiments and must not be approached as untouched ground:

- [`2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md`](../reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md) showed that copying exact guide suffixes through a different prefix collapses quickly under prefix-dependent legality.
- [`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md) generalized bounded deterministic completion to points across repair elites, worked mechanically, but was net-negative under the shared budget.

Therefore a new cross-technique version is justified only if Stage 3 artifacts supply **materially new selection evidence** that those experiments lacked. The useful shape is:

- choose a replayable repair prefix/anchor based on measured cross-technique opportunity, not merely "one of the best elites";
- reconstruct native DFS/beam state at that prefix;
- allow the recipient to search freely from there rather than transplanting a guide suffix;
- keep prefix length/selection variable and evidence-driven;
- prefer several structurally different anchors only if the shadow data says diversity predicts recipient success;
- compare against an equal-work native deterministic completion baseline and against the already-measured elite-prefix operator where relevant.

If the only novelty is a renamed selection rule with no evidence that it separates the old wins/losses, stop rather than rerun the negative experiment.

### 10.3 Shared candidate pool -> independent consumers

After pairwise handoffs are understood, allow techniques to query the common pool by declared needs:

- "give me two candidates with smallest intersection slack but different topology";
- "give me a deep candidate not produced by my technique";
- "give me a candidate with this obligation already satisfied";
- "give me the most structurally novel replayable candidate under a minimum residual-volume threshold".

The board answers with artifacts; the recipient still decides how to use them.

Do not make the board infer one universal best candidate. Producer quotas, query semantics, and native-search floors are the protection against turning interoperability into an implicit monoculture.

### 10.4 Soft cross-technique guidance

A technique can consume another's artifact without starting from its path.

Examples:

- use frequently successful approach regions as a temporary ordering preference;
- encourage structural buckets absent from another technique's frontier;
- discourage, softly, a basin repeatedly explored by repair;
- prefer early decisions that diverge from several expensive deterministic failures.

These must remain soft and bounded. They are potentially cheaper than replay-seeded search, but also easier to overgeneralize. [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) is a strong caution here: multiple sensible-looking soft biases materially reshaped search yet failed to improve solves or regressed them. A signal being real is not the same as its policy being useful.

### 10.5 Proof/fact sharing

Only after the artifact contract has a strong proof class and exact state identity rules should techniques share hard facts.

A useful eventual pattern is a session-scoped proof cache where a sound fact discovered by any technique becomes available to all. Examples might include exact dead semantic states or mechanic-derived impossibilities.

Do not start here. The soundness burden is much higher than for candidate handoffs. [`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md) is useful precedent because it demonstrates that exact dead-state reuse can pay when the state key is complete and scoped to the mechanism that proves the dead state. [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) and [`mechanic-state-contracts.md`](mechanic-state-contracts.md) are the mandatory references before attempting to broaden that idea across techniques.

A cross-technique `proof-fact` must carry its proof preconditions and exact identity scope. "The producer tried this and failed" is never a proof artifact.

## 11. Failure-conditioned scheduling

The most ambitious cooperation layer is not candidate exchange but **adaptive allocation based on evidence arriving during the solve**.

The current attempt policy is feature-keyed before search, as documented in [`solver-architecture.md`](solver-architecture.md). Yet some of the most relevant information appears only after work begins:

- beam collapses or preserves diversity;
- repair rapidly improves and then plateaus;
- deterministic search reaches deep contradictions or dies shallowly;
- one obligation/resource repeatedly dominates failures;
- a technique produces several promising candidates early or none at all;
- a specialist's historical conditional solve hazard remains high after the observed failure class.

This is exactly the search-control gap identified in [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md), but the failed broad portfolio experiment means the project should demand evidence that online signals actually identify complementary future work before changing allocation.

### 11.1 Scheduler input should be standardized evidence

The scheduler should consume artifact summaries, not technique internals. For example:

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

This keeps the decision surface observable and testable.

### 11.2 Complementarity table before learned policy

Before fitting any learned scheduler, measure a simple empirical handoff matrix:

`producer failure/artifact class -> recipient technique -> conditional success/cost`

This can reveal rules such as:

- repair plateau class X is unusually often rescued by beam;
- beam extinction with low topology diversity predicts repair value;
- deep deterministic contradiction after high productive depth predicts a different action than shallow exhaustion;
- a particular residual resource shape predicts admissible-order value.

Start with explicit bounded rules whose evidence can be inspected. The static learned "will repair win?" classifier was rerun and closed as weak in [`2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md). Do not smuggle that same model back in under the label "adaptive cooperation." A new policy must be based on genuinely new online artifact/failure evidence or a new action space.

### 11.3 Hazard-based continuation/retirement

The hazard framing in [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) remains useful here if applied narrowly and empirically.

For each attempt family, estimate the probability of solving in the **next** canonical-work interval given:

- the level's coarse features;
- how much work this technique has already consumed;
- observed artifact/failure class;
- whether useful candidates are still improving;
- whether population diversity is collapsing.

This can support:

- granting another bounded slice when conditional hazard remains high;
- retiring an attempt when hazard collapses;
- reserving entry for a specialist with high early hazard on the observed failure class;
- extending a technique that historically solves late in this specific regime.

The scheduler should preserve participation floors and evaluate at equal deterministic work under [`solver-budget-determinism.md`](solver-budget-determinism.md).

Budget starvation is not theoretical in this solver. [`2026-07-31-admissible-order-tier-node-starvation.md`](../reports/2026-07-31-admissible-order-tier-node-starvation.md) and the later main-loop starvation work in [`future-work.md`](future-work.md) show that a finite cumulative budget can prevent a technique from entering at all. Any adaptive policy must report participation and cannot label an unallocated technique a negative observation.

### 11.4 Do not conflate scheduling and scoring experiments

If a scheduler experiment changes which technique runs **and** changes that technique's score/seed/retention policy, attribution becomes muddy. Test scheduling using frozen technique behavior first.

The fast portfolio result, repair turn-bias history, and multiple budget-sensitive reordering results documented in [`future-work.md`](future-work.md) all reinforce the need to separate "better technique behavior" from "different finite-budget allocation."

## 12. Tooling that would make the artifact layer useful

Build only pieces not already supplied by existing tools. Before adding a new CLI, check [`README.md`](README.md), [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md), and the command-selection guidance in [`solver-architecture.md`](solver-architecture.md).

### 12.1 Artifact schema/fixture tripwire

Mirror the canonical `Attempt` strategy:

- one maximally populated fixture per artifact discriminant or one fixture generator covering all fields;
- tests that every field is explicitly persistent, derived, transient, or technique-private;
- worker/report serialization round-trip tests;
- schema version tests;
- no hand-maintained partial projection in individual reports.

The concrete precedent is [`scripts/test-lib/fixtures.mjs`](../scripts/test-lib/fixtures.mjs), [`modules/solver/hint-provenance.test.ts`](../modules/solver/hint-provenance.test.ts), [`modules/solver/worker-result-serialization.mjs`](../modules/solver/worker-result-serialization.mjs), and [`scripts/portfolio-solve-sweep-lib.mjs`](../scripts/portfolio-solve-sweep-lib.mjs).

### 12.2 Artifact inspector

A CLI/report view for one level showing:

- attempt timeline in canonical work;
- artifacts emitted by each technique;
- candidate metrics;
- lineage/hypothetical handoffs;
- population/failure summaries;
- eventual solve/hint provenance when present.

This should be built as a consumer of the canonical artifact report format, not embedded into search code. If an existing report can be extended cleanly, extend it rather than creating another top-level inspection ecosystem.

### 12.3 Cross-technique redundancy report

For a corpus run, quantify how much each technique contributes that was not already represented:

- duplicate/near-duplicate candidate rate;
- unique topology/resource buckets;
- unique obligation-progress states;
- earliest discovery of useful candidate classes;
- unique failure evidence.

This answers the foundational question: are multiple techniques actually seeing different things?

Use existing structural-distance primitives from [`solution-profile.md`](solution-profile.md) where their semantics fit. If a partial-prefix-specific distance is needed, document why the full-solution metric cannot be reused before adding another representation.

### 12.4 Handoff matrix report

Given baseline artifact logs and outcomes, produce candidate pairwise experiments ranked by evidence:

- producer technique/artifact class;
- proposed consumer;
- number of eligible levels;
- baseline consumer success rate;
- estimated opportunity population;
- known-winning-prefix affinity where available;
- typical artifact emission work offset.

Use it to choose experiments rather than inventing handoffs by intuition.

The report should link or carry enough identifiers to inspect prior nearby experiments such as [`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md), so a high-ranked handoff is not mistaken for an untested mechanism when only its selection rule is new.

### 12.5 Artifact reducer / minimal witness fixture

When an artifact or handoff causes a surprising solve, regression, or replay disagreement, feed its level and witness into the existing level-reduction/testing ecosystem documented in [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) rather than create a separate reducer.

The only new helper should be enough to export an artifact as a stable test fixture or feed its replay witness into an existing reducer/diagnostic seam.

### 12.6 Shadow consumer harness

Extend or parallel the existing shadow reasoner harness only where needed so a consumer can declare:

- which artifacts it would accept;
- what action it would take;
- how much work it would request;
- why.

Run that decision without changing live search and log the hypothetical action.

[`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) is the canonical existing infrastructure. Its current probe contract is oriented around reasoner verdicts on labelled branches, so a consumer policy may need a sibling interface. Share its replay, corpus, report, soundness-class, and execution infrastructure where possible rather than duplicating the whole harness.

## 13. Evaluation standards

### 13.1 Groundwork acceptance

The instrumentation layer should ship only if:

- behavior is bit-identical with artifact emission disabled;
- shadow emission does not change search decisions;
- overhead is negligible or explicitly env-gated for research runs;
- replay success is effectively 100% for artifacts produced by the same solver revision;
- serialization tests prevent silent field loss;
- artifact volume is tightly bounded;
- no heuristic artifact can enter a hard-prune API by accident.

Witness completeness must be audited against [`mechanic-state-contracts.md`](mechanic-state-contracts.md), and projection completeness should use the same tripwire philosophy as the current `Attempt` fixture/tests.

### 13.2 Evidence of useful complementarity

Before live cooperation, require at least one of:

- one technique consistently emits structurally/resource-distinct candidates absent from another;
- an emitted artifact is measurably closer to known winning prefixes than the recipient's own candidates at equal work, across a meaningful population;
- a failure signature materially changes another technique's conditional solve probability;
- shadow handoff selection identifies a non-trivial opportunity population with plausible budget fit;
- artifact pooling improves winning-prefix survival/diversity at fixed retention size.

Known solutions are evidence, not complete truth. Use [`solution-profile.md`](solution-profile.md)'s provenance/saturation cautions, and use whole-family holdouts when dense variants are involved as required by [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md).

### 13.3 Live handoff acceptance

Every live handoff experiment should compare at **equal canonical work** and report:

- solved count gained/lost;
- existing solved-level regressions;
- work-to-solve distribution;
- artifact production overhead;
- imported-candidate replay cost;
- fraction of eligible handoffs actually consumed;
- solves causally attributable to imported lineage;
- whether ordinary/native technique wins were displaced;
- deadline truncation separately from deterministic negative results.

A handoff that wins only because it adds extra work is not evidence for cooperation. Use [`solver-budget-determinism.md`](solver-budget-determinism.md) for the work model and [`investigation-report-conventions.md`](investigation-report-conventions.md) for the final decision/gate write-up.

### 13.4 Scheduler acceptance

For adaptive scheduling, additionally report:

- technique participation by level class;
- how often a decision differs from the static policy;
- which artifact/failure signal caused each difference;
- gains/losses by decision rule;
- counterfactual matched-work static schedule;
- starvation introduced or repaired;
- stability across seeds where stochastic techniques are involved.

The current starvation and budget-sensitive reordering history in [`future-work.md`](future-work.md) is part of the acceptance context, not merely background.

## 14. Staged implementation roadmap

### Stage 0: reconcile and inventory

Before writing new runtime structures:

1. read [`README.md`](README.md) and [`future-work.md`](future-work.md) so the implementation starts from current canonical ownership and current verdicts rather than a dated plan;
2. inventory every useful artifact-like value already emitted or retained by DFS, beam, repair, admissible-order, attempt orchestration, provenance, and research tooling;
3. map each to one of: common context, replay witness, common derived metric, technique payload, diagnostic summary, proof fact;
4. audit candidate replay fields against [`mechanic-state-contracts.md`](mechanic-state-contracts.md);
5. identify existing duplicate serialization/projection paths and choose one canonical home, using the current `Attempt` fixture/projection implementation as precedent;
6. explicitly list prior experiments that superficially resemble proposed handoffs so they are not accidentally rerun under new names, starting with the evidence map near the top of this document;
7. check [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) and [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) before adding any new generic CLI/harness/reducer.

Output: a small schema inventory and reuse map, not solver behavior changes.

### Stage 1: common contract and replay boundary

Implement:

- artifact discriminated union;
- claim-class/soundness separation;
- context identity reusing `Attempt` fields;
- replay witness contract;
- canonical replay/validation entrypoint;
- centrally computed common metrics;
- maximal fixtures and serialization tripwire tests.

No technique consumes artifacts. No schedule changes.

The replay contract is not complete until it has been checked against [`mechanic-state-contracts.md`](mechanic-state-contracts.md), and any hard identity must satisfy the correctness constraints in [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md).

### Stage 2: bounded shadow emitters

Add env/option-gated emitters to each technique using data it already computes where possible.

Priority order:

1. repair elites + plateau/failure summaries, reusing [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md)'s existing concepts;
2. beam survivor sample + frontier diversity/collapse summary;
3. DFS deep/productive prefix + contradiction/prune summaries;
4. admissible-order progress/starvation summaries, explicitly separating zero allocation from exhaustion using [`2026-07-31-admissible-order-tier-node-starvation.md`](../reports/2026-07-31-admissible-order-tier-node-starvation.md)'s lesson.

Avoid adding expensive new metric computation until the cheap existing signals are characterized.

### Stage 3: blackboard in shadow mode

Instantiate the per-solve board, validate/dedupe/retain artifacts, and log:

- cross-technique redundancy;
- neutral metric diversity;
- artifact arrival time;
- hypothetical consumer eligibility;
- lineage IDs even though no live consumption occurs.

Run deterministic corpus studies and variant/family studies where useful. Use [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) infrastructure where it fits, [`solver-budget-determinism.md`](solver-budget-determinism.md) for work comparisons, and [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) for family split/interpretation rules.

Decision gate: if artifacts are overwhelmingly redundant or appear too late to matter, stop and record that result rather than proceeding because the architecture is attractive.

### Stage 4: first pairwise live handoff

Choose the pair with the strongest Stage 3 evidence, not a predetermined favorite.

Default candidate if evidence is roughly tied: beam diverse survivors -> repair imported seeds.

Use a tiny fixed work slice, preserve ordinary repair, and run a matched-work full-population A/B after the mechanism pilot.

Before implementation, check the evidence map near the top of this doc and search [`future-work.md`](future-work.md) for any newer experiment that has functionally tested the same handoff since this plan was written.

### Stage 5: second independent handoff

Only after one pairwise mechanism proves that the substrate can create value, test a handoff of a different shape, likely repair elite/prefix -> free deterministic completion.

This stage has a higher anti-duplication burden because [`2026-08-07-repair-elite-prefix-dfs.md`](../reports/2026-08-07-repair-elite-prefix-dfs.md) already tested a broad elite-prefix deterministic operator and found it net-negative. Proceed only if the interoperability data identifies a selection/recipient condition that materially distinguishes the proposed population from that experiment.

The goal is to determine whether the framework generalizes or only one special pairing works.

### Stage 6: shared pool consumers

Allow multiple techniques to query a common bounded candidate pool. Keep imports additive and trace lineage.

At this stage, measure whether pool-wide retention itself becomes a hidden bias. Preserve producer quotas and native-search floors.

### Stage 7: failure-conditioned allocation

Use measured artifact/failure classes to grant or deny small future work slices. Begin with explicit rules supported by the handoff matrix, not a learned black box.

Re-read [`2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md), [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md), and current starvation status in [`future-work.md`](future-work.md) before building the first rule. Those negative results define what counts as genuinely new evidence.

Only after explicit rules have a stable signal should a learned hazard model be considered, using the hazard hypothesis in [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) as research inspiration rather than a production prescription.

### Stage 8: hard fact sharing, only if justified

Introduce a proof-artifact cache only for fact classes with exact identity and soundness tests. This stage is optional. Candidate/diagnostic interoperability may deliver most of the value without it.

Use [`2026-08-07-repair-nogood-cache.md`](../reports/2026-08-07-repair-nogood-cache.md) as positive precedent for a complete scoped exact-state cache, and [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) plus [`mechanic-state-contracts.md`](mechanic-state-contracts.md) as the boundary for any attempt to broaden proof reuse.

## 15. Relationship to variants and solution provenance

The family/variant corpus is unusually valuable for this work because it can distinguish algorithmic information from level identity memorization.

[`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) remains the canonical owner of family-boundary methodology, symmetry interpretation, family leakage rules, and the current wide-trove gate. Interoperability should add new observable quantities to that framework, not create a separate family-research campaign.

Potential uses:

- compare artifacts from siblings where one orientation/variant solves and another does not;
- determine the earliest point their artifact populations diverge;
- test whether a candidate class transfers structurally across family members even when exact paths do not;
- see whether the same failure signature predicts the same successful complementary technique across variants;
- test whether orientation-sensitive failures correspond to frontier/tie/cutoff collapse visible in standardized artifacts;
- use multiple known family solutions to reduce dependence on a single hint when evaluating winning-prefix affinity;
- test whether an artifact is invariant under symmetry when the underlying abstract puzzle is invariant;
- test whether handoff predictors survive whole-family holdout rather than exploiting near-duplicate sibling leakage.

Do not let variant identity become a production lookup key unless separately justified. The immediate value is diagnostic: variants provide controlled counterfactuals for testing whether artifact signals reflect genuine search structure.

Where solution-space distance is needed, reuse [`solution-profile.md`](solution-profile.md). Where homotopy-class structure is relevant, check the open historical item in [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) before inventing a new topological signature.

The existing wide-trove boundary run remains a nearer-term task in [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md); interoperability groundwork should not block or silently replace it.

## 16. Questions the completed groundwork should let us answer

The project should be able to ask these directly from recorded data:

- Which technique most often discovers a promising state first?
- Which techniques discover essentially the same states despite different algorithms?
- What useful states does beam find that repair never reaches independently, and vice versa?
- Does repair plateau because its elite population loses structural diversity, because it exhausts a resource, or because its operator cannot revise the required earlier decision?
- Do deterministic searches repeatedly encounter the same coarse failure basin even when their exact states differ?
- When a technique eventually solves, was a recognizable precursor artifact already present much earlier?
- Which artifact kinds are merely visually compelling but statistically unrelated to success?
- Which failure signatures predict that another technique has high conditional solve probability?
- Are late attempts starved before they can produce their characteristic artifacts?
- Are orientation/mirroring-sensitive family failures accompanied by artifact-population collapse that points to a deeper search-control asymmetry?
- Does a shared diverse candidate pool retain known-winning structure longer than each technique's private retention at the same total capacity?
- Do imported candidates create genuinely new solves, or merely reproduce solves the recipient would have found with the same extra work?
- Which technique contributes unique proof-quality facts, if any?
- Which apparent handoff opportunities disappear when evaluated on whole-family holdouts?
- Which artifact signals remain useful after conditioning on work already spent and on whether the producer was actually allocated meaningful work?

If the artifact layer cannot answer questions of this kind, it has probably become logging for logging's sake.

## 17. Recommended first implementation scope

The first coding task should be deliberately narrower than this document.

Implement and test only the **interoperability substrate**, not cooperation policy:

1. reconcile current ownership via [`README.md`](README.md) and current status via [`future-work.md`](future-work.md);
2. inventory existing artifact-like outputs and reuse them;
3. define the typed common envelope and claim classes;
4. define a replay-complete witness and canonical replay validator, audited against [`mechanic-state-contracts.md`](mechanic-state-contracts.md);
5. compute a modest initial common metric vector from replayed state using existing calculations;
6. add bounded, opt-in shadow emitters for repair, beam, DFS, and admissible-order using values they already possess;
7. add the per-solve board in observe-only mode;
8. add canonical serialization/fixture tests modeled directly on the current `Attempt` contract implementation;
9. add one report/inspector that measures cross-technique artifact diversity, redundancy, arrival work, and hypothetical handoff eligibility, reusing [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) and existing report infrastructure where practical;
10. prove that enabling the observe-only layer does not alter solver decisions or deterministic results;
11. stop before any imported artifact changes search.

Before calling that implementation complete, explicitly check that it has **not** rebuilt a reducer, family-analysis database, provenance system, work-budget model, generic shadow harness, or path-distance framework already owned elsewhere in the repo.

That produces the dataset needed to choose the first real handoff scientifically.

## Bottom line

Pathfinder already spends substantial computation generating information that is mostly discarded when an attempt fails. The various techniques are different enough that this discarded information may itself be one of the strongest remaining resources in the solver. The right response is not to merge the techniques into one algorithm or to build a more elaborate blind portfolio. It is to give them a safe common language for leaving evidence behind.

The foundation should therefore be:

**common identity + replay-complete witnesses + neutral derived metrics + typed technique payloads + explicit soundness class + bounded blackboard + complete lineage/provenance.**

Build that first in shadow mode. If the data shows real complementarity, progressively activate pairwise handoffs, shared candidate pools, and finally failure-conditioned scheduling. If the artifacts turn out to be redundant or non-predictive, the project still gains a substantially better diagnostic instrument and avoids paying the complexity cost of a cooperative solver that has no useful information to exchange.

The documentation rule for this work is equally important: **when an idea inherits a premise, warning, negative result, or implementation contract from elsewhere in the repository, link the owning document or report at the point where the idea depends on it.** This plan should be a map into the repo's accumulated evidence, not a new island that requires future agents to repeat the archaeology.