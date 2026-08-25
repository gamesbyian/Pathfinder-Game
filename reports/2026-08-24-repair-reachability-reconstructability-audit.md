# Repair reachability versus reconstructability audit

> **Status:** active
> **Last evidence:** 2026-08-24 — exact repair-retreat CP-SAT evidence through the 2026-08-15 follow-up, plus current repair/reconstruction machinery and beam MustCross-state audit
> **Decision:** do not design a new large repair operator yet. First separate retreat/reachability failure from reconstructability failure by handing existing exact-live prefixes to an existing bounded native reconstruction mechanism at fixed work.
> **Remaining gate:** on the already-labeled exact retreat cases, measure whether current native reconstruction succeeds from known-live prefixes and fails from known-dead controls; classify shallow/deep retreat and live-but-repair-hostile regimes before choosing any operator.
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
- `native_reconstruct(prefix, budget)`: whether an existing bounded native completion/reconstruction mechanism solves from that frozen prefix at fixed work.

Interpretation:

| Exact prefix | Native reconstruction | Meaning |
|---|---|---|
| dead | fails | expected control |
| dead | succeeds | correctness/model/prefix-semantics alarm |
| live | succeeds | reconstruction is adequate once repair reopens the right commitment; retreat/selection is the likely bottleneck |
| live | fails | exact completion exists but the current neighborhood cannot find it; reconstructability bottleneck |

This is a stronger diagnosis than badness, known-solution edit distance, or rollback depth alone.

## Smallest pilot

Reuse existing exact labels. Do not generate a new retreat corpus first.

For each supported elite with a resolved or bracketed boundary:

1. replay `D_live` into native state;
2. invoke one existing bounded reconstruction mechanism with a prespecified work budget;
3. invoke the same mechanism from `D_dead` as a negative control where practical;
4. record solve/failure, `workSpent`, best residual/badness, and whether failure exhausted naturally or was censored;
5. for `R02449`-style intervals, use already-known live/dead points rather than buying more CP-SAT time merely to shrink the interval.

Prefer existing machinery:

- bounded DFS from a frozen prefix / the mechanism underlying elite-prefix DFS repair;
- `closeLengthGap` when its trigger applies;
- current relink/recombination only where their prerequisites naturally exist;
- ordinary repair continuation from a frozen prefix if an existing testing seam permits it.

If no clean seam exists, expose one existing operator from an explicit prefix. Do not use that tooling task as an excuse to invent a new repair method.

## Regimes and their implications

### Shallow live boundary + reconstruction succeeds

The elite is only one/few reversible decisions away from viability, and the current completion machinery is capable once returned there. Nominate a small reversible retreat/reopening treatment, not a large destroy operator.

### Shallow live boundary + reconstruction fails

The prefix is already correct enough in exact-feasibility terms, but the native heuristic cannot exploit its completion basin. Nominate stronger bounded reconstruction rather than deeper retreat.

Offline diagnostics may include viable-branching/forced-choice, basin-width proxies, residual interface width, solution density under a safe abstraction, or distance-to-tractability. None becomes a production feature without independent value.

### Deep live boundary

Tiny local edits are structurally incapable of success. This is the only regime where a larger destroy window, dependency-guided reopening, or eventual core/MCS-guided unrefinement becomes plausible.

Do not build core-guided repair until a recurrent deep-retreat population is demonstrated.

### CP-SAT-hard interior

Keep an interval. UNKNOWN is not evidence for either side. Native reconstruction at an already-proven-live point still answers a useful question without resolving the exact minimum rollback.

## State-conditioned MustCross seam

The beam-extinction audit exposed a particularly cheap residual-state distinction relevant to repair too.

`mustCrossMask` does not distinguish a pending MustCross cell that is:

- untouched, zero passes completed; versus
- half-completed, first straight pass done and second perpendicular pass still required.

`crossCounts` and axis state do distinguish them. Current scoring already uses that information; coarse beam diversity does not.

The exact `S00030` dead/live beam pair showed two candidates in the same coarse pending-mask bucket where the live state had completed the first MustCross pass and the dead state had not. That does not prove predictive value for repair, but it nominates **MustCross completion phase** as a low-cost shared diagnostic.

For live retreat prefixes with pending MustCross obligations, record:

- pending count;
- untouched versus half-completed count;
- used/required axis per pending cell where available;
- free intersection budget after reserving required second crossings;
- whether required-axis approach neighbors are fresh, budget-revisitable, or permanently blocked.

These remain diagnostics, not hard pruning or routing rules.

## Keep the concepts separate

Future reports should distinguish:

- **liveness:** at least one exact completion exists;
- **retreat depth:** how far the trajectory must be unfrozen before liveness returns;
- **reconstructability:** work/probability for a specified native operator to find a completion from a live prefix;
- **basin width:** feasible continuation mass/flexibility;
- **interface width:** future-relevant boundary/context size;
- **distance to tractability/backdoor depth:** how many hard choices remain before the residual enters a simpler class.

Do not collapse these into one “repair difficulty” scalar without evidence.

## Success and stop gates

Continue toward retreat-policy work if multiple unrelated elites have shallow live boundaries, existing reconstruction succeeds from those prefixes, and ordinary repair nevertheless fails to reopen them often enough.

Continue toward reconstruction work if exact-live prefixes repeatedly defeat current native reconstruction at meaningful work budgets and cheap legal descriptors separate those hard-live cases across unrelated parents.

Continue toward large destroy/core-guided work only if a recurrent population requires genuinely deep exact rollback and smaller reopening is ruled out by oracle evidence.

Stop/deprioritize if regimes are too heterogeneous, oracle UNKNOWN/unsupported dominates the useful population, or proposed descriptors merely restate badness/exact identity.

## Cross-queue role

The same residual descriptor can have different legal roles:

- beam retention (#4): predictive diversity/coverage feature;
- learned failure (#6): only a proved sound certificate may prune;
- repair (#7): predictive regime descriptor;
- scheduler (#1): only after held-out value may a cheap runtime descriptor guide allocation.

`crossCounts`/MustCross phase is currently a shared diagnostic candidate, not a universal mechanism.
