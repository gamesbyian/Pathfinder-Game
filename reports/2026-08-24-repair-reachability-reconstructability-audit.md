# Repair reachability versus reconstructability audit (2026-08-24)

## Decision

The next repair-neighborhood research should explicitly separate two failure modes that current near-miss metrics conflate:

1. **retreat/reachability failure** — repair does not reopen far enough, or does not reopen the right commitment, to return to an exactly live prefix;
2. **reconstructability failure** — repair reaches an exactly live prefix, but its bounded reconstruction/search neighborhood still cannot find any of the completions that actually exist from that prefix.

The existing CP-SAT prefix oracle plus existing repair/DFS reconstruction machinery are already sufficient to diagnose this distinction on a small set of exact retreat cases. No new large operator should be designed before that diagnostic.

This is queue item #7's first gate.

## Why the distinction matters

A stuck repair elite can be “close” to a valid solution in several incompatible senses:

- few path edits from one known witness;
- low scalar badness;
- only a shallow rollback from an exactly feasible prefix;
- large feasible continuation basin but poor repair access to it;
- tiny feasible basin that only an exact solver can locate;
- repair neighborhood frozen around a commitment that must be destroyed.

These do not imply the same intervention.

If the elite becomes exactly feasible after undoing only one or two moves, building a huge destroy operator is probably the wrong response. If the live boundary is 20-60 moves back, tiny local repairs cannot possibly suffice. And if a live prefix is handed directly to a bounded native reconstruction operator and it still cannot complete, the missing capability is not “retreat farther” at all.

## Existing exact retreat evidence is heterogeneous

`reports/2026-08-12-repair-retreat-cpsat.md` began with three oracle-resolved elites where the last known-solution common prefix was also the exact feasibility boundary:

- `R00001:elite:0`: depth 15 live -> depth 16 dead;
- `R00001:elite:4`: depth 15 live -> depth 16 dead;
- `R00044:elite:0`: depth 0 live -> depth 1 dead.

Those cases genuinely had essentially no hidden slack beyond the observed divergence point.

But the same report's broadened 2026-08-13/15 follow-up found different regimes:

- `R03176:elite:2`: exact live/dead boundary near the end of the elite, implying only about 1-2 steps of rollback are needed to regain exact feasibility;
- `R00648:elite:4`: similarly shallow exact rollback despite a much larger known-solution-based demonstrated rollback;
- `R00630:elite:0`: exact boundary around depth 36/37 for an elite of length 65, implying roughly 28 steps of real rollback are required;
- `R02449:elite:3`: a broad unresolved interior, with a referee-validated live prefix at depth 19 and a dead prefix at depth 37; exact boundary within that band remained CP-SAT-hard.

So “repair elites have zero rollback slack” is not a general result. The current evidence already contains both shallow and deep retreat regimes.

## Diagnostic matrix

For each exact-retreat elite, define:

- `D_dead`: the earliest known dead prefix depth on the elite trajectory;
- `D_live`: the latest known exactly live prefix before it;
- `rollback = elite_end - D_live` (or an interval if CP-SAT leaves UNKNOWN points);
- `native_reconstruct(prefix, budget)`: whether an existing native bounded completion/reconstruction mechanism solves from that frozen prefix at a fixed work budget.

Then classify:

| Exact prefix status | Native reconstruction | Interpretation |
|---|---|---|
| dead | fails | expected control; says nothing about operator quality |
| dead | succeeds | correctness alarm: oracle/model/prefix semantics disagree |
| live | succeeds | repair **can** reconstruct once returned to the right live prefix; retreat/selection is the likely bottleneck |
| live | fails | exact completion exists but current neighborhood cannot find it; **reconstructability** bottleneck |

This matrix is much more informative than comparing elite badness or known-solution edit distance alone.

## Smallest pilot

Reuse the existing exact retreat cases. Do not generate a large new corpus first.

For each oracle-supported elite with a resolved or bracketed live/dead boundary:

1. replay the exact `D_live` prefix into native state;
2. give one existing bounded reconstruction mechanism a prespecified work budget from that state;
3. separately run the same mechanism from `D_dead` as a negative/control case where feasible;
4. record solved/unsolved, work spent, best residual/badness reached, and whether failure was natural exhaustion or budget censoring;
5. for bracketed cases such as `R02449`, probe a small number of already-labeled live/dead points rather than trying to finish the expensive CP-SAT bisection first.

The purpose is diagnosis, not immediate production comparison.

Candidate existing reconstruction machinery should be preferred over new code where possible:

- bounded DFS from a frozen prefix / the machinery underlying elite-prefix DFS repair;
- `closeLengthGap` where the state satisfies its structural trigger;
- existing relink/recombination only when their required inputs exist;
- ordinary repair continuation from the frozen prefix if the testing seam supports it without changing semantics.

If no clean testing seam exists, the smallest coding task is to expose one existing operator from an explicit prefix, not to invent a new operator.

## What the regimes would imply

### Regime A: shallow live boundary + native reconstruction succeeds

Example shape: elite dead at depth 75, live at 74, and bounded native completion succeeds from 74.

Interpretation:

- exact future opportunity is immediately adjacent to the stuck state;
- the reconstruction engine is capable enough once given the right prefix;
- the likely missing piece is a **reversible local edit / retreat trigger / state choice**, not a stronger completion solver.

A tiny ruin window or state-conditioned one/few-step reopening would be the relevant future treatment.

### Regime B: shallow live boundary + native reconstruction fails

Interpretation:

- repair does not need a large destroy window;
- it needs a better way to search the residual completion basin from an already-correct prefix;
- CP-SAT is proving existence that the heuristic neighborhood cannot exploit.

This nominates stronger reconstruction, not deeper retreat.

Useful offline descriptors then include basin-width proxies, forced-choice fraction, residual interface width, solution density under a safe abstraction, or distance-to-tractability/backdoor proxies. These remain diagnostic until held-out predictive value is shown.

### Regime C: deep live boundary

Example shape: elite length 65, last exactly live prefix around depth 36.

Interpretation:

- tiny local changes near the elite tip cannot be sufficient in principle;
- a repair operator that freezes the first ~37 moves is structurally incapable of recovery;
- the main question is which earlier commitment needs reopening and whether a large destroy window is economically viable.

This is where CP-SAT assumption/core/MCS-style analysis could eventually become useful: not to solve the level in production, but to identify which frozen commitments participate in infeasibility and how much of the prefix must be unfrozen.

Do not build core-guided repair until the simple depth/reconstructability matrix shows a recurrent deep-retreat population.

### Regime D: CP-SAT-hard interior

Example: `R02449` with known live at 19, dead at 37, and repeated UNKNOWNs inside.

Treat this as an interval, not as evidence for either endpoint. For repair diagnosis, testing native reconstruction at the known-live point can still answer a useful question even without resolving the exact minimum rollback.

## State-conditioned MustCross seam

The beam-extinction audit identified a concrete low-cost state distinction that is also relevant here.

For a pending MustCross cell, `mustCrossMask` alone does not distinguish:

- untouched: zero passes completed;
- half-completed: first straight pass completed, second perpendicular pass still required.

`crossCounts` and axis state do distinguish them, and current scoring already uses that distinction. Beam diversity currently does not.

The `S00030` exact dead/live beam pair showed two candidates in the same coarse pending-mask bucket where the live candidate had already completed the first MustCross pass and the dead candidate had not. That does not prove the same descriptor predicts repair reconstructability, but it makes **MustCross completion phase** a particularly cheap, semantically grounded candidate feature for the repair diagnostic.

For each live retreat prefix with pending MustCross obligations, record at least:

- pending count;
- untouched versus half-completed count;
- per-cell used axis / required remaining axis where available;
- free intersection budget after reserving pending second crossings;
- whether required-axis neighbor cells are fresh, revisitable-with-budget, or permanently blocked.

These are diagnostic labels/features, not a routing rule or prune.

## Reconstructability is not liveness

A live prefix can be extremely hard for repair. Conversely a prefix may look easy under scalar badness and already be exactly dead.

Therefore keep these quantities separate in all future reports:

- **liveness:** at least one exact completion exists;
- **retreat depth:** how far the current trajectory must be unfrozen before liveness returns;
- **reconstructability:** probability/work for a specified native operator to find a completion from a live prefix;
- **basin width:** how much feasible continuation mass exists, exact or approximate;
- **interface width:** how much future-relevant boundary state must be represented;
- **backdoor/distance to tractability:** how many hard choices remain before a simpler residual class is reached.

Do not collapse them into one “repair difficulty” score without evidence.

## Success / stop gates

### Continue toward retreat-policy work if

- multiple unrelated elites have shallow exact-live boundaries;
- existing reconstruction succeeds reliably when handed those live prefixes;
- normal repair nevertheless fails to reopen those few moves at useful frequency.

Then test one bounded, reversible reopening treatment at equal total work.

### Continue toward reconstruction work if

- exact-live prefixes repeatedly fail under current native reconstruction at meaningful budgets;
- failures recur across unrelated parents/mechanics;
- cheap legal descriptors predict the hard-live regime better than current badness alone.

Then test one stronger bounded reconstruction treatment, not a general repair rewrite.

### Continue toward large destroy/core-guided work if

- a recurrent population requires genuinely deep exact rollback;
- small/shallow reopening is structurally incapable by oracle evidence;
- there is enough repeated structure in the conflicting prefix commitments to make guided destruction plausible.

### Stop/deprioritize if

- exact-live prefixes are usually easy for existing reconstruction and normal repair already reaches them often;
- regimes are too heterogeneous for a stable legal descriptor;
- CP-SAT UNKNOWN/unsupported dominates the population needed to distinguish the regimes;
- a proposed descriptor only restates badness or exact identity without predictive transfer.

## Interaction with scheduler and #4/#6

The same residual descriptors can play different roles with different proof requirements:

- beam retention (#4): predictive coverage/diversity feature;
- learned failure (#6): only a mathematically sound certificate may prune;
- repair (#7): predictive regime classifier for retreat/reconstruction choice;
- scheduler (#1): only after a cheap descriptor has held-out value may it guide action allocation.

The `crossCounts`/MustCross-phase seam is currently best understood as a **shared diagnostic candidate**, not one universal mechanism.

## Disposition

- Existing exact retreat material is sufficient for the first reachability/reconstructability pilot.
- Do not broaden CP-SAT coverage or generate more retreat labels until a specific missing label blocks that pilot.
- Do not build a new destroy/recreate operator first.
- First classify the existing exact-live prefixes by whether current native reconstruction can finish from them at fixed work.
- Let that result determine whether the next implementation target is retreat selection, reconstruction strength, or neither.
