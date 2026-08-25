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

A second static pass replayed the same prefixes under `search-state.ts`'s edge-usage convention: every ordinary move marks its H/V axis bit on both source and target. The selected queried prefixes contain zero portal jumps up to the query state, so this replay has no portal ambiguity.

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

### 5. Global “less axis capacity consumed” is not a dominance rule either

Replaying the four pairs under the native edge-usage convention gives the number of already-touched cells whose H and V axis bits are both spent:

| parent | dead top | live alternative |
|---|---:|---:|
| `S00001` | 16 | 15 |
| `S00030` | 6 | 4 |
| `S00048` | 14 | 14 |
| `R00104` | 18 | **21** |

The direction is inconsistent. `S00030` fits the tempting story that the dead state has consumed more residual axis capacity, but `R00104` is the opposite: the exact-live alternative has **more** globally axis-exhausted cells. `S00048` ties.

The same problem appears in total used axis bits over touched cells: dead/live are 41/41, 21/19, 38/36, and 54/57 respectively. Aggregate topology consumption is therefore another coarse progress/resource summary, not a general future-opportunity order.

The useful information, if any, has to be more **where/how** than simply **how much**.

## A specific cheap representation gap: pending versus half-completed must-cross

`S00030` exposes a more targeted state distinction.

Both exact states:

- are at `(8,9)`;
- have the same remaining length and intersection budget;
- still have both must-cross obligations pending in `mustCrossMask`;
- have not used the level's flipping filter, so their flipper-used mask is also the same.

But the exact-live alternative has already visited must-cross `(8,6)` once, while the exact-dead top candidate has never visited it. A first visit does **not** clear the pending bit; the bit remains set until the second visit. Therefore the production diverse-beam bucket `(flipperUsedMask, mustCrossMask)` treats these two histories as the same diversity class even though `crossCounts` distinguishes them.

This is not a newly discovered implementation bug. [`2026-08-06-beam-state-dedup-sound-signature-audit.md`](2026-08-06-beam-state-dedup-sound-signature-audit.md) already documented that the coarse beam mask cannot distinguish “0 visits” from “1 visit, axis partially locked” at a pending must-cross cell and explicitly left it as a plausible future gap. The new evidence is narrower and stronger: an existing exact D-class extinction pair now shows that this previously hypothetical distinction coincides with **dead versus live** inside one current diversity bucket.

It still does **not** prove that the bucket caused the extinction or that adding this field will improve survivor selection. The two candidates differ in other history-dependent state as well. Treat it as a high-value descriptor nomination, not a promotion result.

The signal is also not globally absent from the solver. Scoring already reads `crossCounts[i] === 1` to switch must-cross guidance from the cell itself to perpendicular second-pass approach maps. The gap is specifically in coarse **retention/diversity representation**, not basic scoring awareness. That makes a first-pass/half-completed must-cross mask attractive for offline #4 analysis: it is bounded, derived from state already maintained, and far cheaper than a new topology traversal.

## Runtime-cost audit: what “cheap topology” can mean

A static source audit after the scalar check narrows the admissible descriptor space further.

Pathfinder's current connectivity prune already performs substantial residual-topology work. `isConnected()` runs a residual flood fill that:

- treats blocks/geese/gates as static walls;
- treats used flipping filters as hard walls;
- can treat cells with both axis bits spent as walls;
- accounts for the reserved second crossing of pending must-cross cells;
- traverses portal edges;
- records the full reached set internally;
- verifies reachability of goal and unsatisfied must-pass/must-cross objectives; and
- computes `freshVolume`, used for the residual length-capacity check on portal-free levels.

This is not free. The topology module documents connectivity as a major hot path, including prior profiling around roughly one third of published-corpus solver CPU and dedicated bit-parallel optimization. The flood fill itself is therefore already an expensive future-opportunity approximation.

Beam search deliberately **throttles** it rather than running it for every generated candidate: connectivity runs when remaining steps are at most 20 or when real path length is divisible by 8. DFS is sparser still, every 64 expanded nodes plus the final 10 steps. A new descriptor that independently launches another flood fill for every candidate would change the cost structure materially and would duplicate information the solver already pays to obtain intermittently.

There is, however, a promising observation seam. During an already-scheduled connectivity pass, the implementation computes richer information than the caller retains. `isConnected()` collapses the reached set, objective reachability, and `freshVolume` down to a boolean pass/fail result. Therefore a shadow/offline experiment can distinguish two categories:

1. **already-paid topology facts:** values derivable from the connectivity pass that was going to run anyway, such as `freshVolume` or bounded summaries of the reached set;
2. **new topology work:** component counts, bridge/articulation analysis, cut width, corridor decomposition, or a second residual traversal not already performed.

The first category is the correct starting point. The second must earn its cost separately.

### First cheap descriptor shortlist

The first offline projection should therefore prefer:

- **must-cross first-pass mask/count:** distinguish untouched pending obligations from half-completed ones using existing `crossCounts`, motivated specifically by `S00030` and the older sound-signature audit;
- **existing connectivity slack:** where an ordinary connectivity pass already occurs, `freshVolume + intNeeded - rSteps` on portal-free levels rather than only its current sign test;
- **local axis availability:** O(1) or bounded-neighborhood summaries of unused H/V capacity at the current cell and pending obligation interfaces, not a global exhausted-cell count;
- **already-known obligation reachability shape:** only if summarized from an already-paid reached set, not by launching a new traversal;
- **current diversity masks plus one interface signal:** test whether `(flipperUsedMask, mustCrossMask)` becomes more informative when paired with first-pass status or another cheap residual-interface quantity.

Do **not** begin with full bridge/articulation/cut analysis, repeated component decomposition, or exact attainable-resource dynamic programming. Those remain diagnostic candidates only if the cheap layer fails and the expected information gain can justify their cost.

### Important comparison baseline

Any candidate descriptor must be compared against what the pruning gauntlet and scoring already know. A descriptor that merely predicts the boolean connectivity verdict, MST lower bounds, intersection deficit, existing must-cross deadlocks, or a score term already reacting to the same state is not automatically new future information. The useful target is residual variation **among states that already pass current hard pruning and nevertheless compete for finite beam retention**.

For must-cross first-pass status specifically, the question is not whether scoring can see it. It can. The question is whether representing it explicitly in survivor-coverage analysis preserves a distinct live future that the current coarse diversity partition does not distinguish.

## More useful next descriptor families

The scalar sanity check does **not** establish which descriptor will work. It does narrow where information must come from.

The next offline pass should prespecify only a few state/interface families that can distinguish histories even when scalar progress is tied:

1. **Residual axis/interface availability.** How much H/V edge capacity remains around the current region and unsatisfied must-cross/turn obligations, using information already represented by edge usage and mechanic masks.
2. **Residual component/corridor capacity.** Prefer information reusable from an already-paid connectivity pass. New bridge/cut/corridor work is second-line because connectivity is already a major hot path.
3. **Exact-resource attainability summaries.** Not merely remaining intersection/length counts, but whether a cheap relaxed/restricted residual model suggests those exact remaining values are still attainable. This is not a first runtime feature unless computation is demonstrably cheap.
4. **Obligation geometry/status, not counts.** Location/interface relationships and partial-completion state among pending objectives. Counts alone are explicitly falsified above, and `S00030` shows that a pending bit can hide a meaningful first-pass distinction.

Existing must-cross/flipper diversity masks remain valid candidate coordinates for survivor coverage; the point is to test whether adding a small amount of **future interface** information distinguishes the exact-live alternatives from redundant/dead survivors.

Do not launch a high-dimensional learned feature search from these four cases. They are selected mechanism examples and can only falsify simplistic summaries or nominate descriptor families.

## Relationship to B-class near-ties

Keep B class separate. The existing exact B2 evidence has usable B-class parents where both score-top and alternative candidates are exact-live. That is a different failure shape: finite-width choice among multiple viable futures, not score preferring an already-dead future.

A descriptor that is valuable for A/D dead-vs-live separation need not help B-class live/live crowding. Do not pool the classes merely to increase row count.

## Next gate

No new CP-SAT campaign is needed first. The exact case material already answers the initial truth question.

Next:

1. project a **small prespecified descriptor set** onto the existing A/D exact cases, leading with must-cross first-pass status, bounded local axis/interface summaries, and already-paid connectivity slack rather than a new graph traversal;
2. compare each descriptor's incremental separation against current score and current prune/connectivity outputs, not against a blank baseline;
3. inspect whether the same descriptor direction recurs across unrelated parents rather than fitting thresholds to these selected cases;
4. only if a compact descriptor family survives, expand exact labels or construct a fixed-width offline survivor-coverage counterfactual;
5. before any live retention treatment, use an unchanged width and matched `workSpent`, with random-reserve and width-only controls, then confirm outside the selected extinction parents.

### Stop gate

Stop this branch if the cheap descriptors merely restate current prunes/scoring, separate each selected parent for unrelated reasons, or require near-exact residual solving to compute. In that case preserve the exact extinction evidence as mechanism truth but do not build a generic future-opportunity framework around it.
