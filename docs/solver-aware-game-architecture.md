# Solver-aware game architecture

> **Status:** exploratory design note, revised against the repository's existing solver research.
>
> This document asks a lateral question: after extensive work improving Pathfinder's solver, are there changes to the **game's rule representation, domain model, compilation pipeline, or mechanic contracts** that could make the solver faster, safer to optimize, or capable of finding more solutions?
>
> The answer remains yes, but several obvious versions of the idea have already been tested. In particular, exact transposition caching is not an unmeasured high-priority opportunity: a sound DFS signature was measured on 2026-07-17 and found to have modest duplicate rates with prohibitive per-node overhead. This revision treats that result as settled evidence rather than proposing the same experiment again.

## Current baseline

Pathfinder already gives the solver a strong foundation:

- `modules/Solver.ts` is a thin facade over `modules/solver/`.
- `normalizeRawLevel()` converts wire-format levels into the solver's packed internal representation.
- `prepLevel()` precomputes distances, adjacency, masks, mechanic indexes, approach maps, pairwise objective distances, portal-parity guidance, and bit-parallel connectivity data.
- DFS uses mutable state with `applyMove()` / `undoMove()`.
- Beam search uses parent-pointer nodes and a reusable replay state.
- Returned candidates are checked by the domain-level `validateCandidatePath()` referee.
- Runtime path derivation is centralized and cross-checked by invariant tests.
- Solver policy is selected by level features rather than level identity.

This note therefore does **not** recommend sharing UI code with the solver, replacing the solver with the runtime engine, or broadly rewriting existing hot paths for architectural neatness.

## The semantic principle that still matters

Pathfinder is history-sensitive. Two paths can end on the same cell with the same length and intersection count while having different legal futures because they used different axes at cells, visited different cells, entered from different directions, used different portals or flippers, or satisfied different constraints.

Any system that merges, caches, memoizes, or compares search states must answer:

> What information is sufficient to prove that two histories have the same relevant future?

This principle is already supported by hard-won repository evidence:

- the must-cross lower-bound cache-key gotcha;
- the MST scratch-buffer correctness bug;
- the corrected `mitm-frontier-probe.mjs`, whose original key omitted future-relevant state;
- the 2026-07-17 DFS transposition premise test, where a crude key reported 92–99% apparent duplication but the sound key found only 0.5–16%.

The lesson is broader than transposition tables: a compact state summary is useful only after both its **soundness** and its **economic value** have been measured.

## Existing negative result: exact DFS transposition caching

The report `reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md` already tested the central transposition premise.

A crude signature appeared spectacular, reporting 92–99% duplicate visits. It omitted the actual visited-cell identity, per-cell edge-axis usage, and portal history. Once replaced by a sound signature containing the full visited-cell identity, `edgeUsage`, portal state, and constraint masks, duplicate rates fell to 0.5–16%, typically around 1–2%.

Computing the sound signature was also expensive enough that the instrumented runs processed roughly five to six times fewer nodes in the same budget. The report correctly downgraded the idea from a leading priority to “checked and found weak.” `docs/future-work.md` likewise lists state-dominance/transposition caching as deprioritized because the correctness-risk/payoff trade is unfavorable.

Consequences for this document:

1. Do not propose a general DFS transposition table as fresh work.
2. Do not assume canonical state merging substantially compresses Pathfinder's state space.
3. Do not make exact future-state identity the top-ranked route to more solves.
4. Retain the semantic inventory as a correctness reference for experiments that already merge states.

The corrected MITM frontier work reinforces this conclusion from another direction: even with a sound key, realistic meet frontiers grow to hundreds of millions or billions of distinct states. Exact identity is necessary for trustworthy measurement, but it does not by itself make the search space small.

## Live opportunity 1: audit beam deduplication for soundness

Beam search currently applies state deduplication only on portal-free levels. Its key is built from the candidate cell and packed constraint code `sc`.

The packed code includes constraint progress such as flipper, must-cross, must-pass, intersection, surround, must-turn, and adjacent-turn masks. It does not include the full visited-cell identity or general per-cell edge-axis usage. Those facts affect future legality in Pathfinder.

That creates a live question more urgent than extending dedup to portals:

> Can the current beam key merge candidates that share `(cell, sc)` but have different legal futures?

The repository's prior under-keying incidents make this a correctness question, not merely an optimization question. The existing key may still be safe under some beam-specific invariant, but that safety needs an explicit argument or measurement. Absent such an argument, it should be treated as potentially under-keyed.

### Recommended audit

Instrument beam candidate pools before dedup and compare the current key against an exact reference signature containing all future-relevant state.

Measure:

- how often one current-key bucket contains multiple exact states;
- whether those exact states have different legal-neighbour sets;
- whether the candidate retained by current dedup is ever different from the only candidate that can complete a known solution;
- whether disabling current dedup restores any failed beam attempts;
- time and memory saved by the present optimization;
- solve-count and stability effects across relevant corpora.

This audit should precede any attempt to make portal-aware beam deduplication.

## Live opportunity 2: measure exact duplicate rates inside beam frontiers

The DFS transposition result does not automatically settle beam search.

DFS explores one active path and revisits states over time. Beam search holds many candidates at the same depth concurrently, often produced from nearby parents. That population may contain substantially more exact duplicates than DFS's traversal history.

The necessary infrastructure largely exists from the DFS and MITM investigations. Reuse the exact reference state signature offline or in diagnostic mode, without changing production selection.

Questions to answer:

1. What fraction of beam candidates are exact duplicates before culling?
2. How does the rate vary by level family and mechanic mix?
3. How much apparent duplication under `(cell, sc)` disappears under the sound key?
4. Are portal levels especially duplicate-rich?
5. Could a cheap incremental fingerprint approximate the exact key without unsound merging?
6. Does exact dedup save enough frontier capacity to offset hashing and memory costs?

A positive result would justify designing a cheaper sound beam key. A negative result would close this avenue without production risk.

## Live opportunity 3: certified forced-sequence macro transitions

This appears to be the freshest game-side opportunity in this note.

The game/compiler can identify stretches where the path advances through several cells but no genuine decision exists. The solver could process such a stretch as one macro transition while still applying every underlying move through the real state machinery.

Possible initial cases:

- a static corridor whose interior cells each have one legal continuation;
- a forced portal jump plus a forced exit sequence;
- a fixed-axis filter passage with only one possible continuation;
- a degree-one chain created by static obstacles;
- a locally forced landmark approach that remains forced under a clearly stated precondition.

### Why this is different from forced-structure bounds

Existing forced-structure work derives mandatory cells or local facts for lower bounds and pruning. Macro transitions target a different cost:

- repeated neighbour generation;
- repeated scoring and sorting at non-decisions;
- repeated search-loop bookkeeping;
- effective search depth.

A macro does not claim a branch is dead or alive. It merely skips presenting deterministic intermediate steps as separate branch points.

### Safety design

A macro must:

1. execute each underlying move through the authoritative solver transition logic;
2. stop before the first genuine choice;
3. stop before any step whose forcedness depends on unmodelled dynamic state;
4. return a composite undo token or a stack of ordinary undo tokens;
5. preserve exact metrics, path reconstruction, intersection accounting, and referee validity;
6. be disabled behind an ablation flag initially.

### First experiment

Begin only with statically forced chains certified from the compiled graph. Measure:

- number of ordinary transitions collapsed;
- nodes expanded;
- wall time;
- change in search order;
- solve-count differences;
- which level families contain enough forced-chain length to matter.

If static chains show value, expand carefully to state-dependent macros.

## Opportunity 4: first-class dynamic mechanic contracts

Even when exact state merging is not economically attractive, explicit mechanic state remains valuable for correctness and tooling.

Every mechanic whose history affects future legality should document:

- its dynamic state;
- whether state is per cell, per object, per pair, or global;
- whether state is monotonic;
- whether incoming direction matters;
- whether it changes connectivity or only move legality;
- what external models must encode to remain sound;
- what must be included in any cache or dedup key.

Conceptually:

```ts
interface MechanicStateContract {
  stateCardinality: number | 'unbounded';
  monotonic: boolean;
  affectsMoveLegality: boolean;
  affectsConnectivity: boolean;
  affectsWinState: boolean;
  requiresIncomingDirection: boolean;
  externalModelSupport: 'exact' | 'relaxed' | 'unsupported';
}
```

This need not become allocation-heavy runtime machinery. It can be documentation, types, tests, and compiler metadata.

Its main benefits are:

- preventing future under-keyed experiments;
- keeping CP-SAT and other oracles honest about unsupported mechanics;
- guiding mechanic design toward bounded explicit state;
- making provenance and telemetry comparable across solvers.

## Opportunity 5: a shared compiled puzzle graph

`prepLevel()` already performs extensive solver-specific compilation. A smaller domain-owned compiled graph could still reduce semantic drift among:

- editor validation;
- runtime replay;
- procedural generation;
- solver prep;
- CP-SAT and other external models;
- analysis scripts.

Possible contents:

- dense cell IDs;
- static geometric adjacency;
- move axes;
- static impassability;
- portal transitions;
- mechanic indexes;
- connected components;
- parity classes;
- corridor and separator structure;
- symmetry information.

The solver would still construct specialized typed arrays on top of this graph. The goal is shared semantics, not forcing domain objects into hot loops.

The strongest practical use may be making external models consume the same compiled topology and mechanic declarations rather than independently interpreting raw level data.

## Opportunity 6: region and separator facts as advisory signals

This overlaps with existing work on bounded global consistency, contradiction-only propagation, solver-response families, and structural analysis. It should not be presented as an unexplored new direction.

The remaining angle is narrower:

- compile articulation, bridge, separator, corridor, and region-objective facts once;
- expose them as features;
- evaluate them in shadow mode for move ordering, diversity, strategy selection, and budget allocation;
- do not promote them to hard prunes without proof.

The CP-SAT prune-atlas result suggests there may be little easy territory for additional binary prunes in the modelled subset. Advisory information could still help finite-budget search, but it must demonstrate predictive value beyond current scoring and family features.

## Opportunity 7: preserve generation history as optional evidence

Procedural generation often knows facts later discarded:

- construction or witness paths;
- solvable parents;
- mutation and symmetry history;
- order of imposed constraints;
- intended regions or intersection sites;
- generation biases.

This metadata should remain provenance, not privileged truth about all solutions. It can support:

- portfolio selection;
- seed generation;
- family analysis;
- diagnostics;
- hint diversification;
- evaluation of learned guidance.

The cold solver must continue to work without it, and hint-guided or construction-guided results must remain separately identified.

## Opportunity 8: solver-compatible mechanic design

Future mechanics should be reviewed partly in terms of their state-space footprint.

Questions to answer before shipping a mechanic:

1. How much history does it add?
2. Is that history bounded and explicit?
3. Is the state local, global, or per object?
4. Can different histories merge again?
5. Does it alter topology or only transition legality?
6. Does it require incoming direction or ordered history?
7. Can external solvers encode it exactly?
8. Can it be relaxed safely for distances or bounds?
9. Does it preserve useful symmetry?
10. Which caches, signatures, and telemetry records must include it?

This is not an argument for mechanically simple puzzles. Rich finite-state mechanics are friendlier than rules whose future behaviour depends on arbitrary ordered history, even when both feel equally complex to a player.

## Opportunity 9: explicit domain limits

Formal caps on board dimensions, object counts, path length, and mechanic cardinalities can make fixed-width representations and external models provably complete.

Potential benefits include:

- compact worker messages;
- bounded oracle models;
- fixed-size bitsets;
- cheaper snapshots;
- simpler mechanic-state contracts.

This should be pursued only where the limits already match the game's intended design. Existing packed-key and typed-array choices have measured performance advantages and should not be displaced for aesthetic reasons.

## Revised ranked research programme

### 1. Audit current beam dedup soundness

Compare current `(cell, sc)` buckets with exact future-relevant state. Determine whether production beam search currently merges states with different legal futures and whether that affects solves.

This is the highest priority because it concerns a live search optimization and possible correctness risk.

### 2. Measure beam-specific exact duplication

Before designing a new key, establish whether exact duplicate candidates occur often enough in beam frontiers to repay a sound implementation. Keep this diagnostic-only initially.

### 3. Prototype static forced-sequence macros

Collapse only easily certified non-branching chains, preserving every underlying transition and undo. Measure effective-depth and runtime gains.

This is the most clearly novel route in this document.

### 4. Evaluate region/separator features in shadow mode

Treat this as an extension of existing structural-analysis work, not a new campaign. Require out-of-sample predictive value before changing ordering or policy.

### 5. Prototype a shared compiled graph with one additional consumer

The best first consumer is an external oracle or editor validator, where reducing semantic drift has clear value and hot-loop risk is low.

### 6. Audit symmetry prevalence

Measure exact automorphisms and duplicated root branches before implementing canonicalization.

## What is most likely to find more solves?

Based on existing evidence, the plausible direct routes are now:

1. **Forced-sequence macro transitions**, if difficult levels contain long deterministic stretches that currently consume meaningful search overhead.
2. **A sound and economical beam-specific dedup key**, but only if diagnostic measurement finds substantial exact duplication in concurrent frontiers.
3. **Region/separator features used as guidance**, provided they add predictive information beyond current features.
4. **Optional generation provenance**, especially for generated corpora and portfolio selection.

General DFS transposition caching is not on this list. It was measured and found weak with the known sound signature.

## Non-goals and cautions

- Do not reopen general DFS transposition caching without materially new evidence, such as an incremental sound key with radically lower cost.
- Do not assume beam inherits either the crude-signature optimism or the DFS sound-signature pessimism; measure its frontier directly.
- Do not extend current beam dedup to portals before auditing the non-portal key's soundness.
- Do not derive a production key from an incomplete field list.
- Do not treat advisory region facts as prunes without proof.
- Do not make gameplay call solver hot-path code or make the solver depend on browser/controller machinery.
- Do not assume compact representation is faster; benchmark it.
- Do not count construction-guided solving as cold solving.
- Do not redesign player-facing rules solely for solver convenience unless the formulations are genuinely equivalent.

## Conclusion

Pathfinder is already highly solver-conscious, and much of the obvious state-merging territory has been investigated. The repository evidence specifically warns against assuming that many superficially similar paths have identical futures: once Pathfinder's full path consequences are included, exact duplication can be sparse and expensive to recognize.

The strongest remaining game-side idea is therefore not “build a general canonical transposition system.” It is to use the game's formal structure more selectively:

- verify that existing beam merging is sound;
- measure whether beam frontiers contain economically useful exact duplication;
- collapse certified non-decisions into macro transitions;
- expose mechanic and graph semantics consistently to solvers and oracles;
- preserve optional construction evidence without weakening the cold-solve standard.

The immediate next experiment should be a **beam dedup soundness and duplicate-rate audit**. The most novel implementation experiment should be **static forced-sequence macro transitions**.