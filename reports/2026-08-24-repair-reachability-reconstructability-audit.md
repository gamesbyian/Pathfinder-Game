# Repair reachability versus reconstructability audit

> **Status:** active
> **Last evidence:** 2026-08-26 reconciliation of exact repair-retreat CP-SAT evidence through the 2026-08-15 follow-up, including the 2026-08-13 apples-to-apples direct reconstruction/rollout diagnostics from exact-live `R00648` and `R03176` prefixes, current repair machinery, the narrowed beam MustCross-state audit, and cross-representation reuse audit
> **Decision:** do not design a new large repair operator yet. Two exact-live-but-native-hard reconstructability cases are **already confirmed for the same two named native mechanisms**. At CP-SAT-verified live prefixes, both `R00648` and `R03176` defeat unrestricted-floor `closeLengthGap` at a 2,000,000-node allowance and 2,000 randomized rollouts. Their basin shapes differ sharply: the best rollout reaches only depth 60/141 on `R00648` but 134/141 on `R03176`; full repair eventually solves `R03176` from another restart trajectory. Do not repeat either frozen-prefix experiment. Classify the remaining exact-live retreat cases before deciding whether retreat, reconstruction, or larger destroy work is recurrently warranted. If a future exact frontier/DD experiment independently exposes exact continuation counts for these residuals, preserve them as opportunistic basin-width labels; do not build counting machinery for this audit.
> **Remaining gate:** reuse the existing exact-live cases other than `R00648` and `R03176` and apply one prespecified existing native reconstruction operator per case under a canonical `workSpent` cap where new execution is required. Keep operator-specific conclusions explicit. Use known-dead points only as correctness controls when cheap; do not buy more CP-SAT resolution merely to narrow existing UNKNOWN intervals.
> **Evidence role:** discovery
> **Selection:** observational — cases and candidate descriptors come from already-mined repair-retreat and beam-extinction evidence.

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

Continue toward reconstruction work if exact-live prefixes repeatedly defeat named current native reconstruction operators at meaningful fixed-work budgets. `R00648` and `R03176` now supply two confirmed hard-live cases for the same named mechanisms, with materially different basin shapes. Two cases still do not justify a new mechanism by themselves; classify the remaining unrelated exact-live cases first.

Continue toward large destroy/core-guided work only if a recurrent population requires genuinely deep exact rollback and smaller reopening is ruled out by oracle evidence.

Stop/deprioritize if regimes remain heterogeneous, the remaining cases do not reproduce either shallow-live/success or live-but-hard patterns, oracle UNKNOWN/unsupported dominates, or proposed descriptors merely restate badness/exact identity.

## Cross-queue role

The same residual descriptor can have different legal roles:

- beam retention (#4): predictive diversity/coverage feature;
- learned failure (#6): only a proved sound certificate may prune;
- repair (#7): predictive regime descriptor;
- scheduler (#1): only after held-out value may a cheap runtime descriptor guide allocation.

`crossCounts`/MustCross phase is currently a cheap optional diagnostic, not a universal mechanism.

Exact continuation counts from an already-paid exact representation remain offline labels unless a separate cheap predictor and held-out policy value are demonstrated.