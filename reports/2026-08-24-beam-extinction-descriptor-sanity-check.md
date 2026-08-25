# Beam extinction descriptor sanity check

> **Status:** active bounded analysis; no production score/retention change
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 4
> **Source cases:** [`reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json)
> **Exact labels:** [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md), including the 2026-08-15 flipping-filter rerun
> **Evidence role:** discovery / mechanism narrowing
> **Selection:** deliberately selected known exact dead-top/live-alternative A/D extinction parents; not prevalence or effect-size evidence

## Question

Before building a broad future-opportunity atlas, ask the cheapest falsification question:

> Can the already-confirmed dead-top/live-alternative beam extinctions be separated by simple scalar progress/resource descriptors already implicit in the current state?

This is not a classifier fit. It is a hand-audited sanity check over the four B2 parents where the 2026-08-15 exact rerun establishes the relevant shape: the beam's score-preferred top candidate is exact-dead while a same-parent discarded or near-cutoff alternative is exact-live.

The broader B1/B2 evidence contains more exact cases, but these four are enough to falsify several tempting dominance/progress stories without generating new solver or CP-SAT work.

## Method

For each committed case, reconstruct the candidate prefix exactly as the oracle driver does: `prefix + child`. Derive only simple quantities directly from that path and raw level data:

- counted length consumed / remaining;
- intersections consumed / remaining, using repeated-cell count on these prefixes;
- number of unsatisfied must-pass cells;
- a deliberately coarse must-cross residual-visit count (`sum(max(0, 2 - visits))`), **not** an axis-aware feasibility bound;
- Manhattan distance from current position to goal;
- current position.

All four selected prefixes contain zero portal jumps up to the queried state, so counted prefix length here is ordinary move count. No new oracle calls were made.

The exact live/dead labels come from the existing CP-SAT explicit-prefix pipeline, whose live witnesses are checked by the canonical referee. The 2026-08-15 rerun reports 25 live / 4 dead / 3 timeout with zero correctness or input alarms after flipping-filter support removed the earlier modeling abstentions.

## Results

| parent / class | exact label | remaining length | remaining intersections | pending MP | coarse pending MC visits | Manhattan to goal | position |
|---|---|---:|---:|---:|---:|---:|---|
| `S00001` A, score top-1 | **dead** | 37 | 2 | 0 | 1 | 5 | `(6,8)` |
| `S00001` A, culled supported | **live** | 37 | 3 | 1 | 1 | 1 | `(3,7)` |
| `S00030` D, score top-1 | **dead** | 73 | 8 | 2 | 4 | 3 | `(8,9)` |
| `S00030` D, culled supported | **live** | 73 | 8 | 3 | 3 | 3 | `(8,9)` |
| `S00048` D, score top-1 | **dead** | 78 | 5 | 2 | 4 | 6 | `(7,12)` |
| `S00048` D, culled supported | **live** | 78 | 4 | 2 | 4 | 10 | `(8,9)` |
| `R00104` A, score top-1 | **dead** | 37 | 1 | 3 | 1 | 7 | `(6,2)` |
| `R00104` A, culled supported | **live** | 37 | 1 | 3 | 1 | 5 | `(4,8)` |

## What this immediately falsifies

### 1. `(position, remaining length, remaining intersections)` is not enough

`S00030` is the cleanest counterexample. Dead and live candidates are at the **same position** `(8,9)` with identical remaining counted length (73) and identical remaining intersection budget (8).

Therefore any proposed exact future-equivalence/cache signature containing only those three quantities is unsound on an already-proven extinction parent. History-dependent topology/mechanic state matters.

This does not make those quantities useless for ranking. It fixes their logical role: they cannot identify equivalent futures by themselves.

### 2. “More objective progress is better” is not a dominance rule

At `S00001`, the dead top-ranked state has already satisfied the must-pass objective while the live alternative has not. At `S00030`, the dead state has fewer pending must-pass objectives, yet is still dead.

Objective completion count is progress, not proof of preserved completion opportunity.

### 3. “Use fewer exact resources” is not a dominance rule

`S00048` is the sharp counterexample. The dead top-ranked state has used **one fewer intersection** than the live alternative, leaving 5 rather than 4 intersections available, yet the live sibling remains completable and the apparently more resource-conservative state is dead.

For exact targets, unused resource can itself become a liability if the residual topology can no longer realize it. This is the concrete Pathfinder instance of the queue's warning that ordinary monotone resource dominance does not transfer automatically to exact lower/equality requirements.

### 4. Goal proximity is not future opportunity

At `S00048`, the dead candidate is Manhattan distance 6 from the goal while the live candidate is distance 10. `S00030` has equal goal distance on both sides. Goal proximity therefore cannot be interpreted as residual feasibility even on this tiny selected set.

This is unsurprising for exact-length path construction, but the exact labels make the failure concrete at the actual beam retention boundary rather than at arbitrary states.

## More useful next descriptor families

The scalar sanity check does **not** establish which descriptor will work. It does narrow where information must come from.

The next offline pass should prespecify only a few state/interface families that can distinguish histories even when scalar progress is tied:

1. **Residual axis/interface availability.** How much H/V edge capacity remains around the current region and unsatisfied must-cross/turn obligations, using information already represented by edge usage and mechanic masks.
2. **Residual component/corridor capacity.** Cheap connected-component volume, bridge/cut/corridor scarcity, or interface width after accounting for already-consumed traversal resources. Compare against current connectivity/prune output so a new descriptor must add information rather than rename an existing check.
3. **Exact-resource attainability summaries.** Not merely remaining intersection/length counts, but whether a cheap relaxed/restricted residual model suggests those exact remaining values are still attainable.
4. **Obligation geometry, not counts.** Location/interface relationships among pending objectives and available regions. Counts alone are explicitly falsified above.

Existing must-cross/flipper diversity masks remain valid candidate coordinates for survivor coverage; the point is to test whether adding a small amount of **future interface** information distinguishes the exact-live alternatives from redundant/dead survivors.

Do not launch a high-dimensional learned feature search from these four cases. They are selected mechanism examples and can only falsify simplistic summaries or nominate descriptor families.

## Relationship to B-class near-ties

Keep B class separate. The existing exact B2 evidence has usable B-class parents where both score-top and alternative candidates are exact-live. That is a different failure shape: finite-width choice among multiple viable futures, not score preferring an already-dead future.

A descriptor that is valuable for A/D dead-vs-live separation need not help B-class live/live crowding. Do not pool the classes merely to increase row count.

## Next gate

No new CP-SAT campaign is needed first. The exact case material already answers the initial truth question.

Next:

1. project a **small prespecified descriptor set** onto the existing A/D exact cases, starting with quantities already cheap/available in current prepared/search state;
2. compare each descriptor's incremental separation against current score and current prune/connectivity outputs, not against a blank baseline;
3. inspect whether the same descriptor direction recurs across unrelated parents rather than fitting thresholds to these selected cases;
4. only if a compact descriptor family survives, expand exact labels or construct a fixed-width offline survivor-coverage counterfactual;
5. before any live retention treatment, use an unchanged width and matched `workSpent`, with random-reserve and width-only controls, then confirm outside the selected extinction parents.

### Stop gate

Stop this branch if the cheap descriptors merely restate current prunes, separate each selected parent for unrelated reasons, or require near-exact residual solving to compute. In that case preserve the exact extinction evidence as mechanism truth but do not build a generic future-opportunity framework around it.
