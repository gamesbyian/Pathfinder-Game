# Solver archaeology: uploaded research crosswalk 009

> **Status:** inconclusive
> **Last evidence:** 2026-09-13 — external research reports were cross-walked against current `main`, historical commits, exact-label follow-ups, and current solver authority.
> **Decision:** preserve three archaeology lessons: unfinished symmetry-equivariance causality, formulation-specific relinking failure with surviving soft complementarity evidence, and regime-dependent repair locality.
> **Remaining gate:** none changes current priority by itself; each may reopen only when current exact/fixed-work evidence produces the matching phenotype and the current-authority boundary is satisfied.

Scope: cross-check externally supplied research reports against retained Pathfinder history and current authority. This is archaeology evidence, not a new opportunity catalogue. `docs/solver-optimization-workstreams.md` remains current execution authority and `docs/solver-future-work.md` remains reopen/deferred authority.

## 1. Symmetry/equivariance: the observer chain stopped one decision gate short

The external symmetry research distinguishes heuristic invariance from full search equivariance and specifically warns that successor order, tie-breaking, survivor ordering, random-number consumption, beam truncation, and data-structure order can create finite-budget orientation cliffs even when puzzle semantics are exactly symmetric.

Pathfinder later built a remarkably direct version of that diagnostic.

Historical sequence:

- The first July symmetry-family headline was substantially contaminated by a dead elite-splice mechanism. After that repair bug was fixed, three of four repair-gated core families lost their apparent orientation-dependent failures. Therefore the original broad orientation-cliff result was not a clean solver-bias measurement.
- `R02248` survived that correction. Its hard/easy split followed rotation rather than reflection. Beam attempts on hard orientations genuinely exhausted at tiny frontier sizes and repair plateaued. A score-component ablation found `SCORE_INTERSECTION_SETUP` could unlock all four hard orientations.
- A second near-Hamiltonian/surround family, `R01465`, reproduced the broad phenotype but not the same responsible score term: `SCORE_SURROUND_URGENCY` was the unlock. This argues for a recurring representation/trajectory interaction family, not one universally broken score feature.
- On 2026-08-11, `reports/2026-08-11-symmetry-equivariance-prefix-pilot.md` replayed mapped parent/rotation witnesses through authoritative solver semantics. Across 202 corresponding prefixes it found zero semantic mismatches. The earliest differences were ranking/order, not legality or hard pruning.
- The matched repair-seed control then gave parent and rotation the same explicit random streams. Equal mapped survivor sets were nevertheless ordered differently. At choice 14, the same two exploratory draws selected different mapped moves solely because of survivor order; random-stream consumption diverged afterward.
- That bounded 100k-node control left both sides unsolved, so it did not reproduce or decide the historical 60-second solve-status cliff. The report explicitly left the historical-budget capability verdict pending.

Disposition:

- `rotate/mirror` retries and broad symmetry canonicalization remain correctly demoted by current authority.
- A real deterministic-order -> stochastic-trajectory mechanism is established for at least one historical witness.
- What remains unresolved is whether neutralizing or controlling that first-divergence mechanism has material solve/work value at matched canonical work on an independently recurring current phenotype.

Smallest legitimate descendant: observer/counterfactual first. On a freshness-cleared current symmetry family with a recurring cliff, preserve semantics and total work, normalize the compared random stream, and counterfactually reorder only the mapped-equal survivor set at the first diagnosed divergence. Ask whether the historical winner/loser capability gap follows that ordering intervention. Parent puzzle is the unit of generalization. Do not build a production symmetry policy from the historical R02248 witness alone.

## 2. Repair recombination: the literal formulation failed while a softer premise produced a solve

The external repair/path-relinking research made a crucial distinction before implementation: classical path relinking assumes meaningful reversible edits between complete candidates, while Pathfinder repair was append-only. It proposed a weaker guide-biased reconstruction as the honest approximation if those edit primitives did not exist.

The repository then executed both forms.

### Soft complementarity-guided recombination

`reports/2026-07-22-repair-stagnation-stage3-recombination-prototype.md` used a spliced base elite plus a soft reward toward a structurally distant guide. Guide selection prioritized complementary satisfied constraints, with distance only as tiebreak.

At fixed 3M-node work on 16 levels:

- control solved 1/16;
- complementarity-guided recombination solved 2/16, adding `R02239`;
- distance-only guide selection instead lost the existing `R03349` solve, producing 0/16.

This is small-sample and mixed on near-miss quality, but it proves that the broad recombination direction was not sterile. It also proves that structural distance alone was the wrong abstraction: complementarity was load-bearing.

### Exact anchor/suffix transplantation

`reports/2026-07-22-repair-stagnation-stage3-real-relinking-prototype.md` then implemented the more literal anchor-splice: keep a base prefix and copy the guide's exact suffix through the authoritative legality/prune gauntlet.

At the same 3M-node scale it produced 1/16 versus 1/16 and delta-zero best badness on all 16 levels, despite firing repeatedly. Instrumentation found the structural reason: the guide suffix was legal under the guide's path history, but under the base prefix it quickly collided with different visited cells, intersection state, portal state, masks, length/parity, or related history. The copied suffix therefore collapsed before its useful structure could transfer.

Disposition:

- Exact segment transplantation is a clean formulation-specific negative. More anchors or more budget do not fix the path-history mismatch that makes the transplanted continuation illegal.
- The broad elite-complementarity/recombination premise did not fail. The softer treatment actually gained one solve.
- The historical proposed descendant, selective turn/edge/axis-aware discrimination rather than flat cell identity, was not found as a later measured descendant under that vocabulary.
- Current authority demotes generic scorer proliferation. Therefore this archaeology does not license reviving `GUIDE_REWARD` or adding another hand score term.

Durable lesson: good continuation structure is not portable independently of the state that made it legal. Any future producer/receptor or recombination premise should preserve/reconstruct the relevant completion regime rather than transplanting geometry alone.

## 3. Repair locality: numeric nearness and known-solution divergence are not edit-distance proxies

The external LNS research stresses that nominal neighborhood size is less important than the effective subproblem exposed after constraints and propagation. Pathfinder's repair-retreat archaeology independently reached a closely related result.

`reports/2026-08-11-repair-rollback-causal-window-pilot.md` examined 15 low-badness repair elites from three levels. The longest common prefix with a known valid trajectory implied a median demonstrated rollback of 63 steps, 0.815 of `reqLen`, range 0.738-0.890. That first pass suggested the near misses were not suffix-local.

The intended exact descendant really ran:

- `ab2f4159...` added elite-path dump and explicit-prefix CP-SAT round building.
- `601b89c...` binary-searched three supported elites and found exact minimum feasible rollback equal to the demonstrated known-solution rollback in all three.
- `184d296...` deliberately broadened toward smaller demonstrated rollback and reqInt/must-cross-heavy cases.
- `9233d142...` reversed the apparent general rule. Two supported broadened cases had true minimum rollback of only 1-2 steps while the known-solution proxy said 27-29 steps, roughly a 25-27x overestimate. Two other candidates abstained because of exact-model coverage.

The correct result is regime dependence, not `repair requires huge rollback` and not `near misses are local`.

Current September evidence adds another boundary: on the 28-level first-loss population, repair's natural search reached only about 19% common prefix with the known-live trajectory even at depths comparable to beam's cull point, and 10x more work improved this on only 2/28. That is an exposure observation, not proof about the minimum edit operator required.

Disposition:

- `bestBadness`, endpoint closeness, and longest-common-prefix with the known solution are not reliable repair-locality measures.
- Before building an LNS/suffix-repair/receptor treatment around an apparent near miss, exact/reference continuation labels should establish whether the needed revision is actually local, interior, or early.
- This supports current WS6's reopen boundary: interior/early commitment revision should be evidence-driven rather than assumed from endpoint quality.

## 4. External reports that are already substantially absorbed or currently demoted

The uploaded reports contain many useful literature directions, but archaeology should not confuse external plausibility with an open Pathfinder premise.

Already substantially absorbed, tested, or superseded:

- exact-state and abstract nogood caching: the repair-stagnation plan explicitly pivoted away from hard badness-shape caching; current compact-dead-cause work is already restricted to solve-local sound recurrence;
- generic beam diversity, novelty, MAP-Elites, DPP, broad Pareto machinery: current authority demotes these absent a mechanism;
- broad RCSP/label-setting, bidirectional labeling, CDCL/LCG, CEGAR, ZDD, etc.: current authority requires a bounded mechanism first;
- hazard/bandit/ML scheduling: current authority requires simpler fixed-work evidence of actionable headroom first;
- generic symmetry canonicalization/rotated retries: current authority requires first-divergence diagnosis first;
- exact transposition/state abstraction as a generic win: repeated Pathfinder history shows the future-equivalence problem is path-history-sensitive and sound full-state recurrence can be tiny.

Potentially useful as premise vocabulary only, not current experiments:

- dominance/partial-order reasoning if a future exact-labelled case produces a concrete sound dominance relation;
- strategic oscillation if a current phenotype actually crosses a reversible exact-count boundary. The July repair population approached length only from below and was append-only, so its planned Stage 4 was correctly re-scoped and never earned execution;
- automatic invariant or derived-predicate ideas only when a current microscope yields a specific recurring sound cause that the representation can express cheaply.

## Cross-era synthesis

Three recurring principles survive this crosswalk:

1. **Path history is not incidental state.** It determines whether a continuation, transplant, memo key, or abstract equivalence is valid.
2. **Representation differences can become capability differences through finite-budget ordering.** Semantic symmetry can hold perfectly while deterministic survivor order changes stochastic trajectories and ultimately which basin receives work.
3. **Outcome closeness is not structural closeness.** A low badness elite can require an early rewrite, while another apparently distant-from-known-solution elite may be repairable one step back.

These are useful because they constrain what the next microscope should ask. They argue for exact/reference-labelled questions about completion regime, first divergence, and effective repair interface, not another generic framework or scalar score.