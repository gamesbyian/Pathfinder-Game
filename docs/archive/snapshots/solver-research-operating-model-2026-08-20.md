# Solver research operating model

> **Status:** living coordination model, reconciled 2026-08-11 after the revised neighbor-budget population A/B and first explicit-prefix CP-SAT run
> **Queue authority:** [`future-work.md`](future-work.md)
> **Capability contract:** [`solver-level-blindness.md`](solver-level-blindness.md)

This document explains how Pathfinder's solver-research programmes fit together. It is not a second backlog. Dated reports remain authoritative for what they actually measured; `future-work.md` decides what remains worth doing.

## One research pipeline

Most nontrivial solver work should move through this chain:

> **semantic truth → controlled evidence → failure classification → missing representation/artifact → shadow/exact evaluation → narrow intervention → level-blind population verdict**

A correctness bug can skip directly to a fix and regression tests. A speculative heuristic generally should not.

## The non-negotiable measurement boundary

Pathfinder's product use case is a newly created editor level. A capability solve therefore receives puzzle mechanics plus current solver/configuration only. Exact-level history cannot guide the solve.

Allowed research use of known solutions/hints/history:

- label what an unchanged search generated or lost;
- supply CP-SAT/oracle test cases;
- compare variants/families;
- discover general neutral features or policies;
- validate regressions and proofs.

Forbidden capability use:

- previous winning config/gate/seed;
- saved solution/hint guidance;
- exact-level solved status, timing, nodes or badness for allocation;
- attempt caches or per-level special cases;
- permanent level ID/corpus position as a policy or seed signal.

The principal workflow enforces this structurally; see [`solver-level-blindness.md`](solver-level-blindness.md).

## Evidence/measurement substrate

Shared infrastructure should make hypotheses cheap to falsify before production search changes:

- canonical work accounting and deterministic budgets;
- explicit-prefix CP-SAT/reference labels;
- shadow probe infrastructure;
- exhaustive tiny-state/reference checks;
- solution/hint provenance;
- family/variant provenance and transformations;
- real-state path replay;
- winning-lineage observation;
- automatic level reduction;
- solver testing APIs exposing real primitives.

When a new idea appears, first ask whether one of these can test its premise without changing production behavior.

## Semantic substrate

Mechanic state contracts and solver-aware domain architecture are research infrastructure when they expose future-relevant facts precisely enough to be independently tested.

Prefer **neutral semantic facts** before technique-specific knobs. Examples:

- crossing slack;
- remaining must-cross completion interfaces;
- viable entry/exit axes for turn-family obligations;
- residual opportunity counts;
- neutral structural-family descriptors.

A fact may later become a beam retention feature, repair diagnostic, scheduler signal, tie-break, or, only with a proof, a prune.

## Family/variant analysis routes failures

Variants are controlled experiments, not production retries.

### Robust failure

Canonical and nearby/symmetry relatives mostly fail; config changes do not cheaply rescue them; known-valid trajectories reveal unrepresented future constraints.

Route toward mechanic-derived facts, exact labels, shadow analysis, and representation work.

### Fragile failure

Rotation/reflection or small mutation changes outcome cheaply; local winning moves are not obviously bad; tiny ordering/retention changes cause cliffs.

Route toward first divergence, beam survival, score/retention, symmetry controls, stochastic trajectory sensitivity and interoperability.

### Starved capability

A relevant late technique/config can solve related/historical cases but receives little or zero current work.

Route toward participation/allocation. `STRATEGY_MAIN_LOOP_LATE_RESERVE` is the current bounded experiment.

### Repair-basin failure

Repair repeatedly returns to similar elites/near misses and append-only/local changes cannot escape.

Route toward exact retreat depth and genuinely deeper prefix editing, not another attraction tweak.

## Current evidence routing after the remote runs

### Neighbor-budget population gate is complete

The revised `PRUNE_MC_NEIGHBOR_BUDGET` level-blind A/B produced:

- Corpus 2: **611 → 665**;
- **+54 net, 59 gained / 5 lost**;
- Corpus 1: **94 → 94**;
- treatment C2 nodes ~3.94% lower;
- treatment canonical work ~5.33% lower.

This is no longer a pending population-measurement task. The five losses now route the mechanism into a narrow **integration/placement** question. Do not rerun the same 1700-level A/B unchanged.

### Winning-lineage observation is implemented and has a first real cohort

The 30-level same-config cohort found 13 solved / 17 failed. Failed final labelled-support losses were 15 score/width and 2 dedup, with zero hard-prune alarms. Score/width forensics classified the 15 as:

- 10 clear mis-ranks;
- 3 weak-margin misses;
- 0 exact-tie/stable-order;
- 2 width-saturation.

This routes the beam problem toward score representation/future viability, not global tie shuffling or merely widening the beam.

### First exact-prefix CP-SAT batch is complete

The original 12 atlas abstentions produced:

- **7 dead**;
- **1 live** with referee-valid OPTIMAL witness;
- **4 abstain**, all R00039 unsupported mechanics;
- zero input/correctness alarms.

At least one R00001 sibling ranked first by beam score is exact-dead while the same parent has a known-valid continuation. This is direct evidence of genuine future-viability mis-ranking.

The route is now: expand a bounded set of extinction-adjacent same-parent exact labels, then test neutral descriptors. Do not immediately freeze a score or retention quota.

## Promotion work serializes; observation does not

Production-changing experiments should be interpreted against a known default configuration. Independent observation/oracle work can proceed in parallel.

Current implications:

- neighbor-budget population A/B is finished; its five-loss integration analysis can proceed;
- explicit-prefix CP-SAT expansion can proceed independently;
- exact repair-retreat CP-SAT can proceed independently;
- late-reserve full population A/B is unblocked after the level-blind workflow hardening;
- a production policy derived from the CP-SAT labels should wait until the exact-label evidence is broad enough to justify it.

## Winning-lineage and contrastive branch laboratory

Known solutions are diagnostic fluorescence only. The observer may ask whether a generated/retained node matches any known valid prefix, but it may not alter search.

The useful boundaries are:

1. incoming frontier;
2. generated candidates;
3. post-hard-prune;
4. post-dedup;
5. post-score/width;
6. post-diversity selection where relevant.

The next exact-label experiment should sample same-parent siblings near **actual score/width extinction events**. This is stronger than generic live/dead branch sampling because history up to the decision is identical.

Candidate neutral descriptors include:

- crossing slack;
- remaining completion-interface counts;
- residual volume/topology;
- portal/flipper state;
- turn opportunity;
- future resource commitments;
- structural-family descriptors.

## Interoperability: producer → receptor

Do not build a universal blackboard because different techniques happen to expose artifacts. First show that a producer emits replayable, structurally useful information that a named receptor does not rediscover in time.

The existing beam-versus-repair pilot found preliminary non-redundancy but no live receptor verdict. If revisited, compare:

- replayed prefixes;
- softer structural summaries such as obligation order, region/interface state, or attraction sets.

Preserve recipient independence. Exact transplantation has already failed in repair relinking, so “more exact path sharing” is not automatically better.

## Repair route

Closed unchanged forms:

- plateau penalty;
- soft recombination;
- exact relinking;
- turn bias;
- current elite-prefix DFS constants;
- fallback-loop node-budget reserve (`STRATEGY_REPAIR_FALLBACK_NODE_RESERVE`): a 300-level level-blind A/B confirmed the mechanism removes starvation as designed (7x more levels get a fallback attempt) but produced zero additional solves — every fallback attempt burns its full node allotment while stalled at a fixed badness plateau, the same wall the other closed forms hit. Allocation alone does not touch this failure mode.

The next evidence gate is exact retreat depth through the existing CP-SAT seam. If valid continuation only reappears after deep rollback across many levels, that supports a genuinely different prefix-edit operator.

## Failure-conditioned allocation

The old broad cold-start portfolio scheduler is closed. The still-open question is different:

> **Given evidence generated during this solve, where should the next unit of work go?**

Candidate current-invocation evidence includes:

- config progress/stall signatures;
- frontier diversity/extinction;
- repair elite/badness/plateau facts;
- dynamic resource slack;
- repeated exact nogoods;
- producer/receptor novelty.

Historical exact-level winners are forbidden. Any eventual bespoke ladder must infer from the puzzle and current run.

The late-reserve experiment is the current narrow precursor because it tests whether guaranteeing participation to starved late configs helps at population scale without reordering the ladder.

## Current routing summary

1. **Neighbor-budget:** diagnose five losses; test generic equal-work integration; then decide promotion.
2. **Beam/score:** expand exact extinction-adjacent labels; test neutral viability descriptors; only then design retention/score counterfactual.
3. **Repair:** exact retreat CP-SAT; only then decide whether deep prefix editing deserves engineering.
4. **Allocation:** run level-blind late-reserve population A/B; positive result supports participation floors, negative-with-target-recoveries favors adaptive online allocation.
5. **Variants/symmetry:** continue as controlled diagnostics, never production rotate/retry.

The recurring rule is simple: **historical data may teach the general solver; the solver must then prove the lesson without remembering the level.**
