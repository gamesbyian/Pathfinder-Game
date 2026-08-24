# External research → Pathfinder development synthesis

**Date:** 2026-08-24  
**Scope:** translate the three external research reports on repair/LNS, failure learning, and beam diversity into Pathfinder-specific research actions without duplicating prior work or treating the literature as an implementation backlog.

External inputs:
- [`deep-research-report.md`](deep-research-report.md) — repair/LNS
- [`nogood-deep-research-report.md`](nogood-deep-research-report.md) — learned failure
- [`beam-deep-research-report.md`](beam-deep-research-report.md) — beam diversity/retention

Canonical project priorities remain [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md). The external reports **sharpen** queue items #4, #6, and #7; they do not displace P0 cross-stage-state diagnosis, scheduler repricing, or holdout/generalization work.

## Decision

Do **not** implement ALNS, CDCL, novelty search, DPP selection, MAP-Elites, or another general framework from the literature.

The literature is most useful as a diagnostic taxonomy. It reduces three vague questions:

- “How do we improve repair?” → distinguish **reachability**, **reconstructability**, and **effective diversity**.
- “Should search learn failures?” → determine whether useful repetition is **exact-state equivalence**, **sound failure-reason equivalence**, or neither.
- “How do we improve beam?” → determine whether finite slots are lost to bad individual ranking, redundant survivor-set coverage, or both, and what state abstraction represents genuinely different futures.

The correct next step is three bounded diagnostic tracks. Each has a stop gate before implementation.

---

## Track 1 — Beam future-equivalence at exact A/D extinction boundaries

**Priority among research-derived tracks: 1.** This directly sharpens current queue item #4.

### What is already known

Exact CP-SAT prefix labeling has repeatedly confirmed a specific failure shape: at some real beam extinction points, the score-preferred candidate is provably dead while a lower-ranked sibling is provably live. The follow-up broadened this from A-class large-margin extinctions to D-class width-saturation extinctions. B-class near-ties that resolved exactly instead had both alternatives live. See [`2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md).

This means:

- generic “beam needs more width” is not the right premise;
- exact/sound duplicate elimination is already known to have negligible headroom;
- A/D mis-ranking/crowding is the most specific proven beam-quality boundary;
- B-class near-ties should not be pooled into the same treatment by default.

Existing coarse beam dedup/diversity is intentionally population shaping, not exact equivalence. Prior attempts to refine it mechanically, including finer MustCross-axis granularity, were net-negative. Do not restart that line as “better dedup.”

### Smallest useful diagnostic

At the existing exact-labeled A/D extinction points, ask:

> **Do cheap, level-blind state descriptors reveal that the current beam spends multiple slots on states with effectively similar futures while an exact-live alternative occupies an underrepresented structural class?**

Start with a **small prespecified set of descriptors already available or cheap from current state**, not a learned feature model or large feature search. Candidate families include:

- remaining length / intersection resources;
- outstanding objective/mechanic masks already represented by solver state;
- the existing MustCross/flipper diversity state;
- simple residual-connectivity/topology summaries only where already cheap and sound to compute.

This is an observational/offline analysis first. It should use the existing lineage traces and exact live/dead labels, expanding exact labels to unrelated parents only if the current sample is too small.

### What would justify implementation

A descriptor is interesting only if, across unrelated parents, it repeatedly distinguishes useful survivor-set coverage better than score alone and better than a neutral random-reserve baseline.

If that premise holds, test the **simplest** survivor intervention that expresses it:

1. bucket/quota or crowding rule over the descriptor; or
2. one small stochastic reserve slot as a neutral control.

Compare at unchanged beam width and matched total `workSpent`; include ordinary width increase as the “just buy more beam” control. Promotion still requires cold solve/work gain, not merely more known-lineage survival.

### Stop gate

Close this branch if descriptor structure does not recur across unrelated A/D parents, if random reserve performs as well as the structural descriptor, or if improved exact-live retention does not become solve/work improvement.

**Do not escalate** to DPP subset optimization, MAP-Elites, full novelty archives, or specialized NLP diverse-beam algorithms unless a simple policy has first demonstrated real retained headroom that it cannot capture.

---

## Track 2 — Repair reachability vs reconstructability regime audit

**Priority among research-derived tracks: 2.** This sharpens current queue item #7.

### What is already known

Pathfinder repair is not textbook routing ALNS. It is a randomized elite/splice/restart search, so the useful LNS concepts are diagnostic rather than literal destroy/reinsert recipes.

Several tempting generic forms are already closed or weak:

- broad extra repair budget;
- broad fallback-gate widening;
- generic elite-pool diversification / burst diversification;
- elite-prefix DFS as an additive repair mechanism;
- generic plateau-proxy optimization;
- repeatedly tuning the same repair trajectory with more iterations.

Exact repair-retreat work has already answered the crude rollback question. [`2026-08-12-repair-retreat-cpsat.md`](2026-08-12-repair-retreat-cpsat.md) found **both regimes**:

1. some retained elites become provably unrecoverable at an early branch choice, so meaningful repair would require reopening substantial earlier structure;
2. other elites remain exactly completable until only 1–2 moves before their observed dead end, yet ordinary repair/`closeLengthGap` can still fail badly from those exact-live states.

The second regime is especially informative. On R00648, an exact-live prefix with a long valid completion produced 0/2000 successful repair-style random rollouts, and a vastly enlarged `closeLengthGap` search also failed. The issue was not rollback depth or insufficient local budget; the residual was reconstructable in principle but hostile to the available repair paradigms.

The same work also found population-scale evidence that obstacle density/topology correlates with repair-vs-admissible-order provenance even after controlling for MustCross=0. Therefore “raw mechanic count” is already a weak explanation and topology deserves attention.

### Smallest useful diagnostic

Do **not** run another generic rollback census. Instead classify a bounded, unrelated-parent sample of stuck repair states along two independent axes:

1. **Reachability:** how far back must the prefix be relaxed before an exact completion exists?
2. **Reconstructability by current repair:** from an exact-live prefix, how much viable basin does the current repair machinery actually expose before dying?

Use CP-SAT only as an offline truth oracle where its mechanic support is exact/validated. Use current repair rollout/trace tools for the second axis. Unknown/timeouts remain unknown.

The practical question is:

> **Can cheap, hint-free runtime state distinguish (a) early-broken states needing deeper structural reopening from (b) exact-live but narrow residuals needing a different reconstruction paradigm?**

Prespecify only a few plausible descriptor families, especially topology/connectivity and residual-resource/objective state already available at runtime. Known-solution common-prefix distance is discovery evidence only and cannot be a production feature.

### What would justify implementation

Only after a level-blind descriptor separates these regimes on unrelated parents should an operator be tested conditionally:

- **early-broken / no nearby exact completion:** test one deeper or dependency-targeted prefix/splice reopening mechanism;
- **late-live but repair-hostile residual:** test one stronger bounded reconstruction mechanism, plausibly exact/constraint-assisted on a deliberately small residual, rather than more random rollout or another copy of ordinary DFS.

These are different treatments for different diagnosed failures. They should not be bundled into a general adaptive-repair framework first.

Any treatment pays its full work cost and competes against baseline repair plus the current portfolio. A CP-SAT-assisted prototype is research-only until it demonstrates bounded runtime, validated mechanic support, and fixed-work solve value.

### Stop gate

Close static regime routing if cheap legal descriptors do not predict the exact/reconstructability regimes beyond already-known coarse correlations. Close a proposed operator if it improves badness or exact-prefix survival but not cold solve/work.

Do not build ALNS weighting, bandits, or RL operator selection until **at least two complementary operators have independently demonstrated conditional value**. A selector cannot manufacture useful operators.

---

## Track 3 — Abstract learned-failure opportunity beyond existing caches/prunes

**Priority among research-derived tracks: 3.** This sharpens queue item #6.

### What is already known

Do not repeat the generic “do failures recur?” premise test.

Repair already has a shipped per-call exact-signature memory. [`2026-08-07-repair-nogood-cache.md`](2026-08-07-repair-nogood-cache.md) measured exact repeated repair dead-end signatures at roughly 54–98% on seven hard repair-close levels and showed useful node savings. However, this cache's semantics are intentionally limited: a hit means the randomized repair walk previously dead-ended from that exact state/context, **not** that the state is logically UNSAT.

Systematic DFS tells the opposite exact-equivalence story. [`2026-07-17-dfs-state-revisit-rate-transposition-premise.md`](2026-07-17-dfs-state-revisit-rate-transposition-premise.md) initially appeared to show enormous duplication under a loose signature, but the sound full-state signature reduced recurrence to roughly 0.5–16%, typically near the low end; exact DFS transposition was correctly downgraded/closed as a major opportunity.

The shared prune gauntlet already detects many cheap sound failures directly: length/intersection overflow, distance/parity, objective lower bounds, connectivity, forced-neighbor/resource failures, etc. Learning an abstraction that merely rediscovers these same cheap prunes is unlikely to pay.

Therefore the unanswered learned-failure question is much narrower:

> **Do expensive failures that are not already handled by exact repair memory or cheap sound prunes share a smaller, sound structural reason that becomes knowable materially earlier than the solver currently discovers the failure?**

### Smallest useful diagnostic

Observation only. Do not add hard pruning yet.

Collect a bounded sample of **soundly dead** situations from systematic search exhaustion where proof scope is clear, existing prune reasons, and/or exact-prefix CP-SAT labels. Separate them from repair's merely-unproductive randomized dead ends.

For candidate structural reason classes, measure:

- recurrence across different exact states;
- which state fields the reason's validity actually depends on;
- whether the reason becomes detectable before the current failure;
- downstream work between earliest-detectable reason and current rejection;
- overlap with existing prune IDs and exact-state caches;
- cost of checking the reason.

Candidate abstractions should emerge from observed repeated structure; do not start by inventing dozens of hand-written nogoods. Any proposed abstraction that could become a hard reject must receive a soundness argument and, where practical, exact/counterexample checking through the reference model.

### What would justify implementation

Proceed only if at least one compact reason class:

- is sound under an explicit scope;
- recurs across distinct exact states and unrelated parents;
- becomes available substantially before current rejection;
- avoids enough work to plausibly exceed lookup/propagation cost.

Then test the smallest mechanism: a bounded per-solve reason store or reason-producing prune for that one class.

Conflict-directed backjumping is a separate later branch. It is justified only if failures demonstrably depend on a small subset of earlier systematic-search decisions. Do not attach CBJ to randomized repair merely because the literature places both under “learning from failure.”

### Stop gate

If sound abstractions collapse back toward full state, rarely recur, overlap almost entirely with existing cheap prunes, or become recognizable only at the point the current solver already rejects, close abstract nogood learning for now.

Do not build CDCL/LCG infrastructure without this premise.

---

## Conditional development DAG

The three tracks should be treated as premise tests with conditional implementation, not six parallel projects:

| Diagnostic | Positive result unlocks | Negative result closes |
|---|---|---|
| Beam future-equivalence at A/D extinctions | simplest descriptor-aware quota/crowding treatment | broad beam-diversity mechanism work |
| Repair reachability vs reconstructability regimes | one regime-specific rollback or stronger-reconstruction treatment | generic adaptive-repair routing on static descriptors |
| Sound abstract failure recurrence with early detectability | one bounded learned-reason prototype; later CBJ only if local conflict sets exist | broad nogood/CDCL-style architecture |

After these diagnostics, compare the successful descriptor/reason vocabularies. If the **same cheap structural quantities** repeatedly matter for beam futures, repair residuals, and failure reasons, consider exposing them as a shared research feature substrate. Do not create a grand unified state abstraction in advance; convergence must be earned by independent evidence.

---

## Existing tools to reuse

The repo already contains most necessary machinery. Prefer extending outputs narrowly over building frameworks:

- exact-prefix live/dead labeling and CP-SAT explicit-prefix probes;
- winning-lineage / beam shadow traces;
- repair-retreat CP-SAT driver and repair elite-path dumps;
- repair stagnation/rollout tools;
- `nogood-cache` A/B harness;
- prune IDs / shadow-evaluation harness;
- solver lifecycle and machine-independent `workSpent` accounting;
- family/variant grouping and research-status tools.

See [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) and [`../docs/solver-shadow-eval-harness.md`](../docs/solver-shadow-eval-harness.md).

The exact model remains a **research microscope**, not a production replacement. Treat unsupported mechanics, timeout, and UNKNOWN as abstention, never dead. Validate SAT witnesses with the canonical referee.

---

## Explicit non-actions

The external literature does **not** currently justify:

- a general ALNS framework;
- adaptive repair bandits/RL before useful complementary operators exist;
- more generic repair diversity/relinking/elite-pool work;
- broad extra repair budget or wider repair fallback gates;
- DPP beam selection, MAP-Elites, large novelty archives, or NLP-specific diverse beam machinery;
- universal beam-width increases;
- exact/sound beam dedup as a major capability lever;
- full CDCL/LCG conversion;
- another exact DFS transposition-table push;
- approximate conflict patterns used as hard prunes;
- optimization of proxy metrics after cold solve/work fails to improve;
- appending any positive specialist as another permanent tail attempt without scheduler repricing.

These ideas can be reopened only by new premise evidence, not by their appearance in the external reports.

## Relation to the canonical queue

This synthesis does not change the queue ordering:

1. resolve P0 cross-stage dependence before trusting stage-isolated allocation/cap conclusions;
2. continue fixed-work scheduler repricing and holdout/generalization infrastructure;
3. use **Track 1** as the next external-research-informed beam investigation (#4);
4. use the exact/reference model (#5) as bounded truth infrastructure for all three tracks;
5. use **Track 3** to sharpen learned-failure research (#6), without repeating exact-state premise work;
6. use **Track 2** to sharpen CP-SAT-anchored repair research (#7), without repeating rollback/diversity/budget experiments already closed.

Offline/shadow diagnostics that do not depend on unexplained cross-stage behavior can proceed while P0 is being resolved. Production promotion still waits on matched work, correctness, generalization, and scheduler competition.

## Bottom line

The external reports do not point to three new algorithms. They point to three **representation questions**:

- Beam: which states have interchangeable futures?
- Repair: which commitments must be reopened, and which live residuals are reconstructable by the current paradigm?
- Learned failure: which distinct states fail for the same sound reason?

The immediate development value lies in answering those questions cheaply with existing exact/shadow tooling. Only then should Pathfinder encode the smallest mechanism that exploits a demonstrated pattern.