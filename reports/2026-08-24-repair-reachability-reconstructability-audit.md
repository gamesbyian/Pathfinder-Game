# Repair reachability versus reconstructability audit

> **Status:** active
> **Last evidence:** 2026-09-02 — a second, prespecified fresh batch (10 unrelated-parent cases, all CP-SAT-resolved, all operator-incapable) more than doubled the recurrence-check sample and substantially narrowed the rate estimate: **2/16 (12.5%) near-budget-boundary, 14/16 (87.5%) operator-incapable**
> **Decision:** do not design a new large repair operator yet. Twenty exact-live cases are now classified (plus one CP-SAT-abstained) across **four distinct cost/regime shapes**, with operator-incapable now overwhelmingly dominant: `R00648`/`R03176`/`R03097`/`R02644`/`R02975`/`R02575` plus the ten fresh batch-2 cases (`R02271`, `R02293`, `R02459`, `R03297`, `R03171`, `R03162`, `R02596`, `R02816`, `R00260`, `R02075`) all defeat `closeLengthGap` even at 500x-plus its production node budget; `R03176` alone is known to have the whole repair process eventually solve it from a different restart trajectory (untested for the rest); `R00630` is solved by `closeLengthGap` in just 3,247 nodes, *under* its own 4,000-node production budget (cheap reconstruction — a retreat/reopening question, still a singleton); `R02449` is also solved, but only at 1,268,180 nodes, 317x its production budget (a genuine budget-scale gap, also still a singleton); `R02257` (4,674 nodes, 1.17x budget) and `R02426` (5,060 nodes, 1.27x budget) remain the only near-budget-boundary cases found so far — the shape is real (two independent referee-verified recurrences) but, with a larger sample behind it, now reads as a small minority (12.5%), not the roughly-a-third read the first batch suggested. See [`2026-08-27 classification`](../reports/2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md) and [`2026-09-02 rate-estimate report`](../reports/2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md) (batch 1, n=6) plus its batch-2 addendum (n=16 total).
> **Remaining gate:** n=16 is closer to but still short of the report's own "order 20-30+" target; the interval is narrower than at n=6 but still not precise enough to size a mechanism. Do not design any mechanism (retreat, reconstruction-budget, or destroy) from this population yet — the operator-incapable majority is now stronger evidence than before, not weaker. Use known-dead points only as correctness controls when cheap; do not buy more CP-SAT resolution merely to narrow existing UNKNOWN intervals (`R02449`'s own `[20,36]` interior and `R02919`'s wide-open interior both stay open).
> **Evidence role:** discovery
> **Selection:** observational — cases and candidate descriptors come from already-mined repair-retreat and beam-extinction evidence, plus (2026-09-02) two freshly-drawn independent stratified samples for the recurrence check specifically (batch 1, seed `repair-reachability-recurrence-check-2026-09-02`; batch 2, seed `repair-reachability-recurrence-check-2026-09-02-batch2`).

## Core distinction

Current near-miss metrics conflate two materially different failures:

1. **Retreat/reachability failure:** repair does not reopen far enough, or does not reopen the right commitment, to return to an exactly live prefix.
2. **Reconstructability failure:** repair reaches an exactly live prefix, but its bounded reconstruction/search neighborhood still cannot find any completion that actually exists from that prefix.

Those require different remedies. Deep destroy/recreate work is not justified when the exact-live boundary is one move away. Stronger reconstruction is not justified when the current operator already solves reliably once given the right live prefix.

## Existing exact retreat evidence is heterogeneous

`reports/2026-08-12-repair-retreat-cpsat.md` initially found three resolved elites where the observed known-solution divergence boundary was also the exact feasibility boundary:

- `R00001:elite:0`: depth 15 live -> depth 16 dead;
- `R00001:elite:4`: depth 15 live -> depth 16 dead;
- `R00044:elite:0`: depth 0 live -> depth 1 dead.

Those genuinely show effectively zero hidden slack beyond the observed divergence.

The broadened 2026-08-13/15 follow-up then found other regimes:

- `R03176:elite:2`: exact liveness returns only about 1-2 steps before the elite end;
- `R00648:elite:4`: similarly shallow exact rollback despite a much larger known-solution-based rollback estimate;
- `R00630:elite:0`: exact boundary around depth 36/37 for an elite of length 65, implying roughly 28 steps of real rollback;
- `R02449:elite:3`: known live at depth 19 and dead at depth 37, with a CP-SAT-hard unresolved interior.

Therefore “repair elites have zero rollback slack” is not a general result. Pathfinder already has evidence for both shallow and deep retreat regimes.

## Diagnostic matrix

For each exact-retreat elite define:

- `D_live`: latest known exactly live prefix;
- `D_dead`: earliest known dead prefix after it;
- rollback depth from the elite end, or an interval where CP-SAT remains UNKNOWN;
- `native_reconstruct(prefix, budget, operator)`: whether a named existing bounded native completion/reconstruction mechanism solves from that frozen prefix at fixed canonical work.

Interpretation:

| Exact prefix | Native reconstruction | Meaning |
|---|---|---|
| dead | fails | expected control |
| dead | succeeds | correctness/model/prefix-semantics alarm |
| live | succeeds | this operator is adequate once given the live commitment; retreat/selection may be the bottleneck |
| live | fails | exact completion exists but this operator cannot exploit it at the tested envelope; operator-specific reconstructability bottleneck |

The operator qualifier matters. Failure of `closeLengthGap` does not prove that every native completion method must fail, and success of the full repair process does not prove that a particular frozen-prefix operator is sufficient.

## Already answered: `R00648` is exact-live but hard for both existing repair technique classes

The August 13 diagnostic already performed a stronger version of one quadrant this audit originally proposed.

A CP-SAT-verified feasible prefix at depth 30 on `R00648` was replayed through native state machinery. `closeLengthGap` was then invoked directly through its test seam with:

- `floor=0`, allowing backtracking all the way to the gate rather than only within the current splice;
- a **2,000,000-node** allowance, about 500x its production 4,000-node budget.

It still failed to find the exact completion.

The same exact-live state was also handed to the randomized construction primitive used by repair. Across **2,000 independent rollouts**:

- 0/2000 solved;
- average continuation length before death was about 4.3 nodes;
- the best rollout reached depth 60 of required length 141.

This is direct evidence for a real **live-but-native-hard** residual, not merely a near-miss metric. It rules out the specific ideas that `R00648` is failing because `closeLengthGap` triggers too late, cannot backtrack far enough, or simply needs a modest budget increase.

It does **not** prove an impossibility theorem for every native reconstruction algorithm. It says the two current repair-search technique classes tested there, randomized rollout and deterministic heuristic backtracking, are badly matched to that residual.

Do not rerun this same case with another nearby node cap and call it new evidence.

### `R03176` is also exact-live but hard at the tested frozen prefix

The same August 13 evidence already contains the apples-to-apples direct-prefix measurement this audit had left marked open. At `R03176`'s CP-SAT-verified depth-74 live branch point, the identical diagnostic used for `R00648` was run:

- `closeLengthGap` with `floor=0` and a 2,000,000-node allowance: **failed**;
- 2,000 independent randomized rollouts: **0/2000 solved**, average continuation about 6.5 nodes, best depth **134/141**.

So `R03176` is a second live-but-hard frozen prefix for these two named native mechanisms. It is still a useful contrast with `R00648`: blind rollouts get dramatically closer on `R03176` (134/141 versus 60/141), and an isolated full `repairSearchFromGate` run eventually solves `R03176` at roughly 1.86M nodes with `closeLengthGap` succeeding from a different restart trajectory. This separates frozen-prefix reconstructability from whole-process access to a friendlier basin.

The direct comparison is already recorded in [the repair-retreat CP-SAT report](2026-08-12-repair-retreat-cpsat.md). Do not rerun `R03176` merely to fill the matrix; it is filled.

## Also answered (2026-08-27): `R00630` and `R02449` are exact-live and reconstructable, at opposite cost extremes

The remaining bounded pilot below was executed for the two other supported elites with a resolved boundary: `R00630:elite:0` (`low=36`, `high=37`) and `R02449:elite:3` (`low=19`, referee-verified feasible; `high=37`, interior `[20,36]` still open) — see [`2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md`](2026-08-27-repair-live-prefix-reconstruction-classification-r00630-r02449.md) for full method and referee validation.

Unlike `R00648`/`R03176`, `closeLengthGap` (`floor=0`, same 2,000,000-node ceiling) **solved both**, referee-validated:

- `R00630`: solved in 3,247 nodes — *under* `closeLengthGap`'s own 4,000-node production budget;
- `R02449`: solved in 1,268,180 nodes — 317x that production budget.

Randomized rollout still failed on both (0/2000 each), consistent with every case tested this way so far.

This adds a third regime the original two-quadrant matrix (below) did not distinguish: **live, reconstructable by the same named operator, but only far outside the work production actually spends on it.** `R00630`'s cheap solve reframes it as a retreat/reopening question (does ordinary repair ever reach this branch point at all?), not a reconstruction-strength one; `R02449` is reconstructable in principle but only at a work multiple no production budget currently provides. Neither shape yet recurs across unrelated cases — do not build a mechanism from either alone.

## Answered (2026-09-02): the recurrence check finds a fourth shape, then a larger draw turns it into a rate estimate

A fresh, prespecified, independent 30-level sample (each case run through CP-SAT bisection and classification before the next batch was selected, but the selection rule fixed before seeing any outcome — see [`2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md`](2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md) for the full method) drew seven unrelated-parent exact-live cases in ascending shallowest-rollback order: `R02257:elite:3`, `R02426:elite:4`, `R03097:elite:4`, `R02644:elite:2`, `R02919:elite:4`, `R02975:elite:4`, `R02575:elite:0` — all run through the identical `closeLengthGap`/rollout diagnostic, referee-validated and independently replayed where a solve was found. One (`R02919`) never reached a resolved CP-SAT boundary (bisection abstained) and is excluded from the count below.

Neither `R00630`'s comfortably-under-budget shape nor `R02449`'s 317x-over-budget shape recurred. Two cases (`R02257` at 4,674 nodes/1.17x budget, `R02426` at 5,060 nodes/1.27x budget) landed in a shape neither prior case occupied: reconstructable, but only modestly above the 4,000-node production budget — a genuine, referee-verified recurrence. The other four (`R03097`, `R02644`, `R02975`, `R02575`) all defeat `closeLengthGap` entirely, each exhausting the full 2,000,000-node diagnostic ceiling — recurring the `R00648`/`R03176` operator-incapable shape. `R02426` is also the first case in this program with any nonzero randomized-rollout success (2/2000) — flagged, not investigated further.

Six resolved cases give a first population-level rate: **2/6 (33%) near-budget-boundary, 4/6 (67%) operator-incapable.** This is the more informative outcome, not a weaker one: it confirms the near-budget-boundary shape is real (not a coincidence — two independent, referee-verified recurrences) while showing it is the **minority** shape, not the dominant one, in a fresh unrelated-parent sample. A budget-increase mechanism sized for the near-budget-boundary third would do nothing for the operator-incapable two-thirds. At n=6 the rate's own confidence interval is wide (roughly 10-65%), so this is a first read, not a settled number. Per the parent stop rule, the next gate is a materially larger sample (order 20-30+ resolved cases) to narrow that interval, not more individually-classified cases and not any mechanism design yet.

### Same day, second batch: n=16, rate estimate narrows to 12.5%/87.5%

Following through on that gate, a second independent 40-level sample (seed `repair-reachability-recurrence-check-2026-09-02-batch2`, no overlap with any previously-classified level) was drawn the same day, and the next 10 distinct-parent cases in the same fixed shallowest-rollback-first selection order were run through the identical pipeline: `R02271:elite:4`, `R02293:elite:4`, `R02459:elite:0`, `R03297:elite:4`, `R03171:elite:3`, `R03162:elite:0`, `R02596:elite:3`, `R02816:elite:2`, `R00260:elite:4`, `R02075:elite:0`. One operational note: the first attempt at CP-SAT bisection for this batch ran as an unmanaged local background process and was silently killed mid-run after resolving only 3 of 10 (plus one apparent abstention); rather than lose that partial work, the run was repeated in full under proper background-task tracking, which reproduced the first 3 cases' boundaries exactly (confirming determinism) and, on the clean full rerun, converged on all 10 — the 3 timeout/abstentions seen in the interrupted first attempt (`R02271` at depth 16, `R02816` at depth 15, `R00260` at depth 37) turned out to be 60-second CP-SAT time-limit flukes on individual probes, not fundamental unresolvability; every case in this batch has a genuine resolved boundary.

All ten converged, and **all ten are operator-incapable** — `closeLengthGap` (`floor=0`, 2,000,000-node ceiling) failed on every single one, each confirmed by its own reported node count exhausting the full ceiling exactly (the same signature every prior operator-incapable case used). Randomized rollout (2,000 trials each) also failed on all ten except `R03297:elite:4`, which had 2/2000 rollout successes (like `R02426` in the first batch) without changing its `closeLengthGap` classification. No near-budget-boundary case appeared in this batch at all.

Combining both fresh batches (excluding `R02919`'s abstention, unchanged): **16 resolved cases, 2/16 (12.5%) near-budget-boundary (`R02257`, `R02426`), 14/16 (87.5%) operator-incapable** (`R03097`, `R02644`, `R02975`, `R02575` from batch 1; all ten of batch 2). This is a substantial narrowing from the n=6 read (33%/67%) — not a contradiction of it (2/6 and 2/16 are the same two cases; the denominator simply grew), but a materially more precise picture. At n=16, a two-sided ~95% confidence interval around 12.5% is roughly 4-32%, still wide but no longer consistent with "roughly a third" the way the n=6 estimate was. The practical implication sharpens in the same direction the n=6 read already pointed: a near-budget-boundary-sized budget increase would help a small minority of unrelated exact-live cases and do nothing for the large majority.

n=16 is closer to, but still short of, this report's own "order 20-30+ resolved cases" target for a precise rate. The next gate, if this program continues, is a third batch of comparable size — not a mechanism design yet.

## Remaining bounded pilot

Reuse existing exact labels. Do not generate a new retreat corpus first, and do not repeat `R00648`.

For the remaining supported elites with resolved or bracketed boundaries:

1. replay an already-proven `D_live` into native state;
2. invoke one **named** existing bounded reconstruction mechanism chosen before seeing that case's result;
3. cap new comparisons in canonical `workSpent` rather than treating equal node counts as cross-operator equality;
4. where a cheap `D_dead` control is already available, confirm the operator does not manufacture a purported valid completion from an exact-dead prefix;
5. record solve/failure, actual `workSpent`, operator identity, best residual/badness where meaningful, and censoring/exhaustion semantics;
6. for `R02449`-style intervals, use already-known live/dead points rather than buying more CP-SAT time merely to shrink the interval.

Prefer existing machinery:

- bounded DFS from a frozen prefix / the mechanism underlying elite-prefix DFS repair;
- `closeLengthGap` when the question specifically concerns that operator;
- current relink/recombination only where their prerequisites naturally exist;
- ordinary repair continuation from a frozen prefix if an existing testing seam permits it.

If no clean seam exists, expose one existing operator from an explicit prefix. Do not use that tooling task as an excuse to invent a new repair method.

### Why future comparisons should use `workSpent`

The historical `R00648` result used an enormous node allowance and is qualitatively decisive for “does modestly more of the same search fix this?” It need not be rerun merely to translate its cost into a newer accounting currency.

For **new** cross-case or cross-operator comparisons, however, nodes are not the queue-wide cost currency. Different reconstruction techniques can perform very different amounts of scoring, propagation, topology work, and repair bookkeeping per node. Use `workSpent` whenever the question compares economic value or establishes a common fixed-work envelope.

## Regimes and their implications

### Shallow live boundary + reconstruction succeeds

The elite is only one/few reversible decisions away from viability, and the tested completion machinery is capable once returned there. Nominate a small reversible retreat/reopening treatment, not a large destroy operator.

### Shallow live boundary + reconstruction fails

The prefix is already correct enough in exact-feasibility terms, but the tested native heuristic cannot exploit its completion basin. `R00648` is already one confirmed instance for both `closeLengthGap` and randomized rollout.

One instance does not establish a general repair policy. Seek recurrence across unrelated parents before building stronger reconstruction machinery.

Offline diagnostics may include viable-branching/forced-choice, basin-width proxies, residual interface width, solution density under a safe abstraction, or distance-to-tractability. None becomes a production feature without independent value.

If an independently justified exact frontier/DD representation can count continuations for one of these same live prefixes at negligible extra cost, retain the exact count or a coarse log-count bin as a stronger basin-width label. This can distinguish “one needle-like completion exists” from “many completions exist but native reconstruction still cannot find them.” That distinction is diagnostically useful, but exact counting is not a new prerequisite for repair work.

### Deep live boundary

Tiny local edits are structurally incapable of success. This is the only regime where a larger destroy window, dependency-guided reopening, or eventual core/MCS-guided unrefinement becomes plausible.

`R00630` is the clearest existing deep-retreat nomination, not proof of a recurrent population. Do not build core-guided repair until deep rollback recurs across unrelated cases and the current reconstruction question is separated from retreat depth.

### CP-SAT-hard interior

Keep an interval. UNKNOWN is not evidence for either side. Native reconstruction at an already-proven-live point still answers a useful question without resolving the exact minimum rollback.

## State-conditioned MustCross seam: now a weak shared diagnostic, not a lead

`mustCrossMask` does not distinguish a pending MustCross cell that is:

- untouched, zero passes completed; versus
- half-completed, first straight pass done and second perpendicular pass still required.

`crossCounts` and axis state do distinguish them. Current scoring already uses that information; coarse beam diversity does not.

The exact `S00030` beam pair demonstrates that this distinction can matter for one dead/live retention boundary. But the later projection across the other exact A/D beam pairs found **no recurrence**: MustCross first-pass state distinguished `S00030` but not `S00001`, `S00048`, or `R00104`, and a cheap local required-axis corridor check separated none of the four.

Therefore MustCross phase may still be recorded cheaply on repair cases, but it is no longer a privileged explanatory candidate. Do not gate repair policy on it without independent recurrence.

For live retreat prefixes where it is already available, optional diagnostics may record:

- pending count;
- untouched versus half-completed count;
- used/required axis per pending cell where available;
- free intersection budget after reserving required second crossings.

Avoid adding expensive topology work just to populate a diagnostic field.

## Keep the concepts separate

Future reports should distinguish:

- **liveness:** at least one exact completion exists;
- **retreat depth:** how far the trajectory must be unfrozen before liveness returns;
- **reconstructability:** work/probability for a specified native operator to find a completion from a live prefix;
- **basin width:** feasible continuation mass/flexibility;
- **interface width:** future-relevant boundary/context size;
- **distance to tractability/backdoor depth:** how many hard choices remain before the residual enters a simpler class.

Exact continuation count, when available from an already-built exact representation, is one unusually direct basin-width label. It is still distinct from reconstructability: a large exact basin can be hard for a badly matched heuristic, and a singleton basin can occasionally be easy if guidance points directly into it.

Do not collapse these into one “repair difficulty” scalar without evidence.

## Success and stop gates

Continue toward retreat-policy work if multiple unrelated elites have shallow live boundaries, the same existing reconstruction operator succeeds from those exact-live prefixes, and ordinary repair nevertheless fails to reopen them often enough.

Continue toward reconstruction work if exact-live prefixes repeatedly defeat named current native reconstruction operators at meaningful fixed-work budgets. `R00648` and `R03176` supply two confirmed hard-live cases for the same named mechanisms, with materially different basin shapes; `R00630` and `R02449` (2026-08-27) instead both succeed with the same operator, at opposite cost extremes. Four classified cases now span three regimes with no recurrence in any one of them; classify further exact-live cases (as they become available) before building a mechanism for any single regime.

Continue toward large destroy/core-guided work only if a recurrent population requires genuinely deep exact rollback and smaller reopening is ruled out by oracle evidence.

Continue toward a retreat/reopening treatment if multiple unrelated cases match `R00630`'s shape (shallow live boundary, cheap reconstruction, i.e. under the operator's own production budget) and ordinary repair still fails to reach that boundary often enough. Continue toward a larger `closeLengthGap` budget specifically if multiple unrelated cases match `R02449`'s shape (reconstructable by the same operator, but only at a large multiple of its production budget). One case of each is not that population.

Stop/deprioritize if regimes remain heterogeneous, the remaining cases do not reproduce any of the now-three named patterns, oracle UNKNOWN/unsupported dominates, or proposed descriptors merely restate badness/exact identity.

## Cross-queue role

The same residual descriptor can have different legal roles:

- beam retention (#4): predictive diversity/coverage feature;
- learned failure (#6): only a proved sound certificate may prune;
- repair (#7): predictive regime descriptor;
- scheduler (#1): only after held-out value may a cheap runtime descriptor guide allocation.

`crossCounts`/MustCross phase is currently a cheap optional diagnostic, not a universal mechanism.

Exact continuation counts from an already-paid exact representation remain offline labels unless a separate cheap predictor and held-out policy value are demonstrated.