# Beam extinction descriptor sanity check

> **Status:** active
> **Last evidence:** 2026-08-24 — static reconstruction of the existing exact A/D beam-extinction cases plus current scoring/diversity/connectivity implementation
> **Decision:** simple scalar progress/resource summaries are already falsified as future-opportunity rules. The first bounded retention descriptor candidate is pending-vs-half-completed MustCross state, supplemented only by cheap local/interface or already-paid connectivity information. No production retention change is justified yet.
> **Remaining gate:** project a small prespecified cheap descriptor set onto unrelated exact A/D parents, test incremental information beyond current score/prunes, and proceed to one matched-work fixed-width retention intervention only if recurrence survives.
> **Evidence role:** discovery
> **Selection:** deliberately selected known exact dead-top/live-alternative A/D extinction parents; not prevalence or effect-size evidence
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 4
> **Source cases:** [`reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json)
> **Exact labels:** [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md), including the 2026-08-15 flipping-filter rerun

## Question

Before building a broad future-opportunity model, ask the cheapest falsification question:

> Can the already-confirmed dead-top/live-alternative beam extinctions be separated by simple scalar progress/resource descriptors already implicit in the current state?

This is not a classifier fit. It is a hand-audited sanity check over four B2 parents where exact labels establish the relevant shape: the beam's score-preferred top candidate is dead while a same-parent discarded or near-cutoff alternative is live.

No new solver or CP-SAT runs were needed.

## Method

For each committed case, reconstruct the queried candidate prefix as `prefix + child` and derive simple quantities directly from path/level data:

- remaining counted length;
- remaining intersections;
- unsatisfied must-pass count;
- coarse pending MustCross visits;
- Manhattan distance to goal;
- current position.

A second static replay used the native edge-axis convention to count consumed H/V capacity. The selected prefixes contain no portal jumps before the queried state.

The exact labels come from the existing explicit-prefix CP-SAT pipeline, whose live witnesses are referee-checked. The 2026-08-15 rerun reports 25 live / 4 dead / 3 timeout with zero correctness or input alarms.

## Selected exact pairs

| parent / class | exact | remaining length | remaining intersections | pending MP | coarse pending MC visits | goal Manhattan | position |
|---|---|---:|---:|---:|---:|---:|---|
| `S00001` A, top | **dead** | 37 | 2 | 0 | 1 | 5 | `(6,8)` |
| `S00001` A, alternative | **live** | 37 | 3 | 1 | 1 | 1 | `(3,7)` |
| `S00030` D, top | **dead** | 73 | 8 | 2 | 4 | 3 | `(8,9)` |
| `S00030` D, alternative | **live** | 73 | 8 | 3 | 3 | 3 | `(8,9)` |
| `S00048` D, top | **dead** | 78 | 5 | 2 | 4 | 6 | `(7,12)` |
| `S00048` D, alternative | **live** | 78 | 4 | 2 | 4 | 10 | `(8,9)` |
| `R00104` A, top | **dead** | 37 | 1 | 3 | 1 | 7 | `(6,2)` |
| `R00104` A, alternative | **live** | 37 | 1 | 3 | 1 | 5 | `(4,8)` |

## Cheap falsifications

### Position + length slack + intersection slack is not future equivalence

`S00030` is decisive. Dead and live candidates occupy the same cell `(8,9)` with identical remaining length and intersection budget.

Any exact cache/equivalence signature using only those quantities is unsound. History-dependent topology/mechanic state matters.

### More objective progress is not dominance

At `S00001`, the dead state has already satisfied a must-pass objective that remains pending in the live alternative. `S00030` shows the same direction for pending must-pass count.

Objective completion is progress, not proof of preserved completion opportunity.

### More unused exact resource is not dominance

At `S00048`, the dead state has used one fewer intersection than the live state. The apparently more resource-conservative state is still infeasible.

For exact targets, unused resource can become a liability when residual topology can no longer realize it.

### Goal proximity is not residual feasibility

`S00048`'s dead state is closer to the goal; `S00030` ties. Goal distance cannot stand in for future opportunity in exact-length construction.

### Less globally consumed axis capacity is not dominance

Native edge-axis replay gives globally axis-exhausted cell counts:

| parent | dead | live |
|---|---:|---:|
| `S00001` | 16 | 15 |
| `S00030` | 6 | 4 |
| `S00048` | 14 | 14 |
| `R00104` | 18 | **21** |

The direction reverses. Total used axis bits is similarly inconsistent. Useful topology information, if any, must encode **where/how**, not merely how much.

## Concrete representation seam: untouched versus half-completed MustCross

`S00030` provides the strongest cheap candidate.

Both states:

- occupy `(8,9)`;
- have identical remaining length/intersection budget and goal distance;
- still have both MustCross obligations pending in `mustCrossMask`;
- have the same flipper-used state.

But the live alternative has already visited MustCross `(8,6)` once, while the dead state has never visited it.

A first visit does not clear `mustCrossMask`; only the second visit does. Therefore the production diversity bucket `(flipperUsedMask, mustCrossMask)` treats these states as the same coarse class even though `crossCounts` distinguishes them.

This is not a newly discovered implementation bug. The 2026-08-06 beam-state signature audit already documented the latent omission: pending mask alone cannot distinguish zero visits from one pass with partially consumed axis state. The new contribution is an exact D-class dead/live pair where that old hypothetical distinction is present at the retention boundary.

Scoring already reads `crossCounts[i] === 1` to switch MustCross guidance toward the required perpendicular second-pass approach. The missing information is therefore specifically in coarse **retention/diversity representation**, not solver awareness generally.

This makes MustCross first-pass status a strong first offline descriptor because it is:

- already maintained;
- bounded and cheap;
- semantically meaningful;
- invisible to the current coarse diversity bucket;
- grounded by an exact dead/live pair.

It remains a nomination, not a proven causal fix. The pair differs in other history-dependent state too.

## Runtime-cost guardrail

Current `isConnected()` already performs substantial residual-topology analysis:

- residual flood fill;
- static/used-flipper/axis-exhausted walls;
- reserved MustCross treatment;
- portal edges;
- goal and pending-objective reachability;
- reachable fresh volume for residual length capacity.

Connectivity is a major hot kernel and beam deliberately throttles it rather than evaluating every candidate.

Therefore “add a topology descriptor” must not casually mean “run another flood fill per candidate.”

Prefer two categories:

1. **already-paid topology facts:** values exposed from a connectivity pass that was already scheduled, such as `freshVolume`, capacity slack, or bounded reached-set summaries;
2. **new topology work:** component/bridge/articulation/cut/corridor analysis or another traversal, which must independently earn its cost.

Start with category 1.

## First cheap descriptor shortlist

Prespecify only a few families:

- MustCross first-pass mask/count from existing `crossCounts`;
- local H/V axis availability around current/pending obligations;
- portal-free connectivity slack `freshVolume + intNeeded - remainingSteps` only where connectivity already ran;
- bounded summaries of already-known objective reachability/reached-set shape;
- current diversity masks paired with one interface-state signal.

Do not begin with full bridge/cut analysis, repeated component decomposition, or exact resource DP.

Any candidate must add information beyond current hard prunes/scoring. Predicting a fact the gauntlet already knows is not automatically useful for finite-width retention.

## Keep B-class live/live cases separate

The B-class exact cases include live/live near-ties. That is a different problem from A/D dead-vs-live displacement.

A descriptor useful for identifying an already-dead survivor may not help choose among multiple viable futures. Do not pool the classes just to increase row count.

## Next gate

1. Project the small prespecified descriptor set above onto existing A/D cases.
2. Compare incremental separation against current score and current prune/connectivity outputs.
3. Check recurrence across unrelated parents rather than fitting per-parent thresholds.
4. Only then expand exact labels or build a fixed-width offline survivor-coverage counterfactual.
5. Before production retention changes, use unchanged width and matched `workSpent`, with random-reserve and width-only controls, then confirm outside the selected extinction parents.

Stop if cheap descriptors merely restate current scoring/prunes, separate each selected parent for unrelated reasons, or require near-exact residual solving to compute.
