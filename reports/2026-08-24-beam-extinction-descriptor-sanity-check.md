# Beam extinction descriptor sanity check

> **Status:** active
> **Last evidence:** 2026-08-24 — static reconstruction of the four existing exact A/D dead-top/live-alternative pairs, native edge-axis replay, landmark-phase replay, and current beam snapshot/diversity implementation
> **Decision:** simple scalar progress/resource summaries remain falsified. The first follow-up projection also rejects **MustCross first-pass state as a standalone recurring descriptor**: it separates only `S00030` of the four exact A/D pairs. A stricter local H/V-corridor-availability check around pending MustCross obligations separates none. The broader interface-state hypothesis remains open because pair-specific dead/live differences occur in cheap state already maintained by beam (`mpVisitedMask`, `adjTurnMask`, intersections, plus MustCross first-pass state not currently snapshotted), but selected-pair separation is not enough to justify a kitchen-sink diversity key or production retention change.
> **Remaining gate:** capture/reconstruct the full extinction-boundary pools read-only and project a **small prespecified set of low-cardinality state-phase bucket keys** against fixed-width survivor coverage and bucket cardinality. Start with current `(mustCrossMask, flipperUsedMask)` plus one of: `mpVisitedMask`, `adjTurnMask`, or MustCross first-pass phase. Stop if recurrence disappears, buckets fragment toward one candidate each, or live-coverage gains are explainable by generic width/reserve effects. Only then test one matched-work production retention intervention.
> **Evidence role:** discovery
> **Selection:** deliberately selected known exact dead-top/live-alternative A/D extinction parents; not prevalence or effect-size evidence
> **Queue:** [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) Priority 4
> **Source cases:** [`reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json)
> **Exact labels:** [`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md), including the 2026-08-15 flipping-filter rerun

## Question

Before building a broad future-opportunity model, ask the cheapest falsification question:

> Can the already-confirmed dead-top/live-alternative beam extinctions be separated by simple scalar or interface-state descriptors already implicit in the current state?

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

A native-convention static replay then reconstructs:

- per-cell H/V `edgeUsage`;
- exact MustCross visit counts and first-pass phase;
- must-pass completion;
- landmark completion masks and bounded residual landmark progress;
- intersection count.

For the follow-up local MustCross test, a still-pending obligation is considered locally axis-realizable only when a required straight H/V corridor remains available under the current grid/static-block and `edgeUsage` rules, including the endpoint straight-continuation case. This deliberately remains a **local** test; it does not perform a flood fill, separator analysis, or residual exact solve.

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

## First nomination: untouched versus half-completed MustCross

`S00030` provides a particularly clean representation seam.

Both states:

- occupy `(8,9)`;
- have identical remaining length/intersection budget and goal distance;
- still have both MustCross obligations pending in `mustCrossMask`;
- have the same flipper-used state.

But the live alternative has already visited MustCross `(8,6)` once, while the dead state has never visited it.

A first visit does not clear `mustCrossMask`; only the second visit does. Therefore the production diversity bucket `(flipperUsedMask, mustCrossMask)` treats these states as the same coarse class even though `crossCounts` distinguishes them.

This is not a newly discovered implementation bug. The 2026-08-06 beam-state signature audit already documented the latent omission: pending mask alone cannot distinguish zero visits from one pass with partially consumed axis state. The contribution here is an exact D-class dead/live pair where that old hypothetical distinction is present at the retention boundary.

Scoring already reads `crossCounts[i] === 1` to switch MustCross guidance toward the required perpendicular second-pass approach. The missing information is therefore specifically in coarse **retention/diversity representation**, not solver awareness generally.

That made MustCross first-pass status a good first offline descriptor candidate because it is cheap, bounded and semantic. The follow-up below tests whether that distinction actually recurs.

## Follow-up: projection across all four exact A/D pairs

The first-pass hypothesis does **not** recur as a standalone discriminator.

| parent | MustCross first-pass phase | local pending-MC H/V corridor | must-pass phase | adjacent-turn phase | intersections used | disposition |
|---|---|---|---|---|---|---|
| `S00001` A | same | same / locally feasible | **different** | n/a | **dead 4 / live 3** | MC phase does not explain pair |
| `S00030` D | **different** | both locally feasible | **different** | same | same | MC phase separates this pair only |
| `S00048` D | same | same / locally feasible | same | n/a | **dead 2 / live 3** | no tested objective-phase distinction |
| `R00104` A | same | same / locally feasible | same | **different** | same | landmark phase separates pair |

### MustCross first-pass status: one of four

Exact MustCross visit-count replay gives:

- `S00001`: dead and live both have the same one half-completed pending MustCross;
- `S00030`: dead has both pending MustCross cells untouched; live has one pending cell already visited once;
- `S00048`: dead and live have the same MustCross completion/visit phase;
- `R00104`: dead and live have the same one half-completed pending MustCross.

So MustCross first-pass state is a real distinction at `S00030`, but **1/4 selected unrelated parents is not recurrence**. Do not proceed directly from this evidence to a MustCross-phase quota/crowding treatment.

### Local H/V corridor availability: no separation

A stronger cheap check asks whether each still-required MustCross crossing has a locally available straight H/V corridor after replaying existing edge usage.

It separates **none** of the four pairs. In every dead/live pair, the still-required MustCross axis is locally available on both sides. For untouched pending MustCross cells, the same candidate axes remain locally available on both sides.

This closes the tested local form. A useful MustCross topology descriptor, if one exists, must encode more than immediate straight-axis availability. Do not rescue this result by quietly expanding the local check into a second flood fill or separator analysis.

### Landmark residual detail supplies examples, not a universal rule

The replay also exposes state distinctions that current coarse masks either partly or fully hide:

- `S00030`: its surround landmark remains binary-pending in both states, but the dead prefix has 3 still-unvisited required surround neighbors while the live prefix has 8;
- `R00104`: the same binary surround obligations are pending/done on both sides, but the two pending landmarks have residual-neighbor counts `3,4` dead versus `1,5` live; its `adjTurnMask` also differs, with five adjacent-turn obligations satisfied in the dead state versus four in the live state;
- `S00048`: the tested landmark/interface phases do not distinguish the pair.

These are useful counterexamples to treating a binary obligation mask as the whole residual interface. They are **not** evidence for a monotone rule such as “more residual surround neighbors is better.” The directions already differ and the selected sample is tiny.

## What beam already carries versus what diversity currently uses

Current `BeamNode` snapshots cheap scalar/mask state at candidate-generation time:

- `ints`;
- `mpVisitedMask`;
- `mustCrossMask`;
- `flipperUsedMask`;
- `surroundMask`;
- `mustTurnMask`;
- `adjTurnMask`;
- endpoint key plus score/order fields.

The sound beam dedup key uses the full captured state tuple (and endpoint). The **diverse survivor selector**, however, currently buckets only by:

`(mustCrossMask, flipperUsedMask)`.

That distinction matters. Across the four exact dead/live pairs, state that is already maintained by the beam but ignored by current diversity separates several cases:

- `S00001`: `mpVisitedMask` differs;
- `S00030`: `mpVisitedMask` differs, and MustCross first-pass state differs but is not currently snapshotted into `BeamNode`;
- `R00104`: `adjTurnMask` differs;
- `S00048`: the captured objective masks agree, while `ints` differs.

This supports a narrower hypothesis than “MustCross phase is the answer”:

> current diversity may be compressing candidates that occupy different cheap **residual state phases**, even when the scoring function itself knows some of those distinctions.

But merely concatenating every available field into the diversity bucket would be feature shopping. It could create nearly one bucket per candidate, converting a diversity quota into an accidental width expansion/reordering mechanism.

## Why selected-pair separation is insufficient

The four pairs were selected precisely because they are exact counterexamples at known extinction boundaries. A key that separates all four after looking at their differences proves very little.

Before touching production retention, the descriptor must earn itself at the **set level**:

- Does the same low-cardinality distinction recur across unrelated extinction pools?
- Does preserving that distinction retain more exact-live alternatives at the same width?
- How many buckets does it create per phase?
- Are buckets populated by multiple candidates, or nearly singleton?
- Does any gain survive a random-reserve control and a plain width-only control?

The target is marginal future coverage of the survivor set, not retrospective classification of four hand-picked pairs.

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

The frozen exact case artifact does not preserve connectivity outputs, so already-paid connectivity descriptors cannot be projected faithfully from it without another capture. That is a data limitation, not permission to recompute connectivity for every candidate just to populate a descriptor table.

## Descriptor dispositions after the first projection

| candidate family | current disposition |
|---|---|
| MustCross first-pass mask/count | **keep only as one component for set-level projection**; standalone recurrence failed (1/4 pairs) |
| local pending-MC H/V availability | **close tested form**; separates 0/4 pairs |
| `mpVisitedMask` / must-pass phase | **nominate for full-pool projection**; already snapshotted and differs on 2/4 selected pairs |
| `adjTurnMask` / landmark phase | **nominate cautiously**; already snapshotted and differs on `R00104`, absent/not useful on other selected pairs |
| intersection phase/count | **diagnostic only for now**; separates some pairs but exact-target resource use has already shown non-monotone behavior |
| binary surround mask | insufficient by itself on the examined landmark pairs; bounded residual-neighbor detail may contain more interface information but is not currently a proven low-cardinality descriptor |
| already-paid connectivity facts | still plausible, but require a capture where the solver already ran connectivity; do not manufacture them with extra traversals |

Do not begin with full bridge/cut analysis, repeated component decomposition, exact resource DP, or a composite bucket containing every field above.

## Keep B-class live/live cases separate

The B-class exact cases include live/live near-ties. That is a different problem from A/D dead-vs-live displacement.

A descriptor useful for identifying an already-dead survivor may not help choose among multiple viable futures. Do not pool the classes just to increase row count.

## Revised next gate

The next value-of-information step is a **read-only full-pool survivor projection**, not a production retention treatment.

At the existing A/D extinction boundaries, preserve or regenerate the full ranked candidate pools and reconstruct the cheap candidate state needed to compare a tiny prespecified key set:

1. current baseline `(mustCrossMask, flipperUsedMask)`;
2. baseline + `mpVisitedMask`;
3. baseline + `adjTurnMask` where applicable;
4. baseline + MustCross first-pass phase;
5. at most one deliberately coarse resource/interface phase if justified before looking at the result.

For each key, report:

- bucket count and occupancy distribution;
- fraction of candidates in singleton buckets;
- whether the known exact-live alternatives fall into a different bucket from the exact-dead top candidate;
- an offline fixed-width selection counterfactual using the same scores and width;
- exact-live retention where labels exist;
- comparison with a random reserve and modest width-only control.

Do **not** tune a custom composite key per parent. Do **not** treat improved exact-live retention as the production objective. It is only the gate for one later cold matched-work intervention.

Stop if the cheap keys do not recur, fragment the pool excessively, merely restate score/prune information, or require near-exact residual solving to compute.
