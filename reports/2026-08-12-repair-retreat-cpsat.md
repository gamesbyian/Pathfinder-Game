# Exact repair-retreat CP-SAT (item C)

Date: 2026-08-12

This is item C from [`docs/claude-remote-solver-handoff.md`](../docs/claude-remote-solver-handoff.md): does the
repair-rollback pilot's ~63-step / 0.815×`reqLen` **demonstrated** rollback (longest common prefix
against a *known* solution) actually reflect the **minimum causal edit window**, or is it an
overestimate because the known-solution set is incomplete? [`reports/2026-08-11-repair-rollback-causal-window-pilot.md`](2026-08-11-repair-rollback-causal-window-pilot.md)
and its artifact ([`reports/stress/repair-rollback-census-pilot-2026-08-11.json`](stress/repair-rollback-census-pilot-2026-08-11.json))
were explicit that this was only an upper-bound witness. This report answers the exact version with
CP-SAT.

## Method

Four repair-search elites across the same 3 Corpus-2 levels the pilot used (`R00001`, `R00039`,
`R00044`, all from `data/stress/stress-levels-random.json`) were re-selected deterministically
(`scripts/stress/repair-elite-path-dump.mjs`, which reproduces `repair-rollback-census-pilot.mjs`'s
elite-selection bit-for-bit and additionally dumps full packed-key paths):

- `R00001:elite:0` (badness 5, eliteLength 80) and `R00001:elite:4` (badness 10, eliteLength 77) —
  two different observed near-misses from the same level/gate, to see whether the boundary is a
  property of the level's structure or of the individual elite;
- `R00044:elite:0` (badness 14, eliteLength 81);
- `R00039:elite:0` (badness 16, eliteLength 53), included specifically because it is where the pilot
  measured the *shallowest* demonstrated common-prefix (only the gate).

For each elite, `low` was seeded at the pilot's demonstrated-feasible depth (the elite's longest
common prefix with any known valid solution from that gate, minus one) — trivially CP-SAT-feasible
by construction, no oracle call needed, per the task framing. `high` started at the elite's full
stuck length. Binary search then walked forward from `low`: at each midpoint, the prefix (elite path
cells 0..depth) was replayed against the native solver for legality (same check
`cpsat-explicit-prefix-oracle.mjs` performs) and then submitted to `scripts/stress/cpsat-full-probe.py`
via the explicit `--prefix` seam. Feasible (`OPTIMAL`/`FEASIBLE`) raised `low`; infeasible
(`INFEASIBLE`) lowered `high`. This is valid because feasibility is monotonic non-increasing along a
single elite's own forced trajectory: a prefix with no exact completion stays infeasible for every
longer forced prefix built on top of it (more forced cells is a strictly stronger constraint, never a
weaker one). The search stops when `high - low = 1` — an exactly adjacent feasible/infeasible pair,
i.e. the exact minimum rollback.

The oracle used is the same `cpsat-full-probe.py` model / `cpsat-explicit-prefix-oracle.mjs` code path
as B1/B2 (`.github/workflows/cpsat-explicit-prefix-oracle.yml`), not a new model. Given the Actions
runner queue was backed up behind a long corpus sweep at dispatch time (rounds 1-2 ran there and are
recorded in `reports/stress/repair-retreat-round{1,2}-2026-08-12.json`), rounds 3+ and the final
consolidated sweep were run directly in this session's sandbox (`pip install ortools`, same
`cpsat-full-probe.py` invoked the same way) — same code, same referee, no shortcuts taken on
correctness. `scripts/stress/repair-retreat-binary-search.mjs` is the reusable driver.

Every one of the 25 final consolidated cases replayed legally against the native solver before being
submitted (checked programmatically, not just asserted). The full 25-case set — spanning every
probed depth across all rounds, both the feasible and infeasible sides, for all 4 elites — is
committed at [`reports/stress/repair-retreat-cases-2026-08-12.json`](stress/repair-retreat-cases-2026-08-12.json)
in the required `{corpus, cases:[{id, levelId, prefix}]}` format, and its labeled oracle result at
[`reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`](stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json).

## Results

| elite | reqLen | eliteLength | pilot demonstrated rollback (steps / frac) | exact minimum rollback (steps / frac) | boundary (low feasible → high infeasible) |
|---|---:|---:|---:|---:|---|
| `R00001:elite:0` | 84 | 80 | 65 / 0.7738 | **65 / 0.7738** | depth 15 (live, OPTIMAL) → depth 16 (dead, INFEASIBLE) |
| `R00001:elite:4` | 84 | 77 | 62 / 0.7381 | **62 / 0.7381** | depth 15 (live, OPTIMAL) → depth 16 (dead, INFEASIBLE) |
| `R00044:elite:0` | 91 | 81 | 81 / 0.8901 | **81 / 0.8901** | depth 0 (live, OPTIMAL) → depth 1 (dead, INFEASIBLE) |
| `R00039:elite:0` | 65 | 53 | 53 / 0.8154 | **abstain** (unsupported-mechanics) | tested at depth 26 and depth 53, both abstained |

Summary across the 25-case final sweep: **3 live / 20 dead / 2 abstain, 0 correctness alarms, 0 input
alarms** (`reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`, solver ref
`c495fbb7`). Every `live` label carries a referee-valid emitted witness
(`Solver.validateCandidatePath` returned `ok: true` for all three); every `dead` label is a genuine
`INFEASIBLE` CP-SAT result on a replay-legal prefix, not a timeout or unsupported-mechanics fallback.

For the two `R00001` elites, the binary search bottomed out at exactly the pilot's own demonstrated
boundary: depth 15 is the last cell shared with the matched known solution (`commonPrefixSteps=16`
means cells 0..15 match), and CP-SAT confirms it's live — but the very next cell (depth 16, the first
point where the elite's trajectory diverges from every known solution) is already provably
infeasible. Same pattern for `R00044:elite:0`: only the gate (depth 0) is shared with any known
solution, and CP-SAT confirms the elite's first actual move (depth 1) is already infeasible.

`R00039:elite:0` could not be resolved either way: `cpsat-full-probe.py` reports `unsupported-mechanics`
at both the full elite length and the midpoint, consistent with B1's finding that R00039 is outside
this CP-SAT model's supported mechanics. This is an abstention, not a dead branch — no exact rollback
number exists for this elite from this oracle. (The pilot's own R00039 numbers remain a demonstrated,
not exact, figure.)

## Interpretation

**The heuristic was already exact, not an overestimate, for every elite this oracle could resolve.**
In all three resolved cases the exact minimum rollback equals the pilot's demonstrated
longest-common-known-prefix rollback to the step — not "close to," identical. The very first cell
where a retained repair elite's trajectory parts ways with every known valid solution from that gate
is already the point of no return: CP-SAT proves no exact completion exists one step later, and proves
one exists at that exact boundary (with a referee-valid witness, which happens to be a real 84/84 and
91/91-length solution respectively).

This is a real, if narrow, finding, not the one hypothesized going in. The original expectation
(stated by the task itself) was that CP-SAT might reveal the true minimum rollback to be considerably
shorter than 63 steps, i.e. that repair search's near-misses might have unrecorded shortcuts back
toward validity closer to their dead end. That did not happen for the 2 levels/3 elites resolvable
here. Instead: once a repair elite's trajectory diverges from every currently-known solution, it is
*immediately* unrecoverable in these cases — there is no slack. That argues **against** "repair search
over-commits to doomed branches early" in the sense of committing well before the actual divergence
point is visible; the commitment happens exactly where the divergence itself happens, not earlier.
It is also consistent with (not contradicting) the idea that the *choice* made at the divergence point
is the real defect to study — these results just say the window for fixing it after the fact is zero,
not that the choice itself was inevitable.

Whether this generalizes is genuinely open. The evidence base is thin by design (2 resolvable levels,
1 abstained; the two `R00001` elites share the same divergence cell since they're both near-misses
from the same repair run before diverging from each other later, so they are closer to one data point
on "does the boundary move" than two). It does **not** establish that every repair elite has zero
rollback slack — only that the 3 tested here do. A broader sample, especially ones with a *smaller*
`commonPrefixSteps` gap or a `reqInt`/must-cross-heavy profile unlike these three, could still show
slack the way the task's original hypothesis expected.

**Scope discipline, matching B2's own boundary**: this is exact-label evidence gathering only. No
change to `modules/solver/repair-search.ts`'s retention policy, elite scoring, or rollback/suffix
regeneration is proposed or implied by this result — consistent with the task's own instruction and
the concurrent collision-avoidance constraint on that file this session was run under.

## Broadened sample (2026-08-13) — the zero-slack finding does NOT generalize

This section directly answers the "whether this generalizes is genuinely open" question above. It
does not generalize — the opposite pattern (large, real slack) shows up just as readily once the
sample is deliberately chosen to include smaller-`commonPrefixSteps`-gap and `reqInt`/must-cross-heavy
elites, exactly the population the original report flagged as untested.

**Method**: `repair-rollback-census-pilot.mjs` and `repair-elite-path-dump.mjs` both gained
deterministic stratified sampling / direct-id selection (same FNV-1a → mulberry32 → Fisher-Yates
convention used throughout this session). A cheap 40-level stratified census (`--sample=40
--seed=repair-retreat-broaden-2026-08-13`, no CP-SAT — pure repair-search + known-solution matching)
surfaced four candidates satisfying both of the original report's stated criteria simultaneously:

| elite | reqLen | eliteLength | commonPrefixSteps | rollbackSteps (demonstrated) | reqInt | mustCross |
|---|---:|---:|---:|---:|---:|---:|
| `R03176:elite:2` | 141 | 76 | 50 | 27 | 10 | 5 |
| `R00630:elite:0` | 70 | 65 | 37 | 29 | 5 | 5 |
| `R00648:elite:4` | 141 | 32 | 4 | 29 | 4 | 0 |
| `R02449:elite:3` | 76 | 44 | 15 | 30 | 2 | 2 |

Same binary-search driver, same `cpsat-full-probe.py` oracle. Two abstained on **`unsupported-
mechanics`** even at full elite length (`R00630`, `R02449`, both `mustCross ≥ 2`) — a real coverage
gap distinct from the previously-known flipping-filter one, not further resolvable by this oracle.
The other two (`R03176:elite:2`, `R00648:elite:4`) resolved cleanly at full length to `dead
(infeasible)`, matching the original pattern — but their first midpoint probe returned CP-SAT
`UNKNOWN` (genuine time-limit exhaustion at 60s, not a structural abstention), so a second round
re-ran just those two at `--time-limit=240` to let the bisection actually converge.

**Result — real, large slack, not zero:**

| elite | eliteLength | demonstrated rollback | exact minimum rollback | boundary |
|---|---:|---:|---:|---|
| `R03176:elite:2` | 76 | 27 | **1–2** | depth 74 (live, OPTIMAL) → depth 75 (dead, INFEASIBLE) |
| `R00648:elite:4` | 32 | 29 | **1–2** | depth 30 (live, OPTIMAL) → depth 31 (dead, INFEASIBLE) |

Both elites are exactly recoverable to within one or two steps of their own dead end — nothing close
to the demonstrated (known-trajectory) rollback of 27–29 steps. The demonstrated-rollback proxy
overestimated the true minimum by roughly **25–27×** on both cases. This is the mechanical opposite
of the original 3-elite finding: there, the true boundary sat exactly at the point where the elite's
trajectory first diverged from every known solution (zero slack beyond visible divergence); here, a
real exact continuation exists almost the entire remaining length, and the known-solution set simply
never happened to contain a path matching that near-full-length prefix — the divergence-from-known-
solutions proxy was measuring "how different is this from a path we happened to store," not "how
close is this to any valid completion."

**Practically**: both `R03176` and `R00648` are already solved by the production ladder overall
(confirmed via `level-blind-capability-sweep.mjs` at 25M nodes, presumably by a different technique
or a different repair restart than the specific stuck elites tested here) — so this is not two new
capability gaps. The value is in what it says about the population, not these two levels specifically:
**selecting elites by small demonstrated rollback appears to correlate with real, large exact slack
near the elite's own end (2/2 resolved cases here)**, which is a very different profile from the
large-demonstrated-rollback population the original 3 cases came from (where zero slack held both
times). This is suggestive, not proven, at n=2 resolved — but it directly falsifies "zero slack is a
general property of stuck repair elites," which the original report's own hedging already anticipated
might happen.

**Implication for future repair-search work, not acted on here** (scope discipline unchanged from the
original report — no `repair-search.ts` change is made or implied by this finding): the existing
`closeLengthGap`/`enableElitePrefixDfs` bounded-backtrack mechanisms already try exactly this kind of
last-mile recovery, but apply broadly and were found net-negative or marginal at population scale
(see `docs/repair-search-stagnation-escape-plan.md`). A version gated specifically on "small
demonstrated rollback" (a cheap, already-computed signal — no new instrumentation needed) rather than
applied indiscriminately might be a meaningfully different, more targeted experiment than what's
already been tried — but that is a new mechanism proposal for a future session, not evidence gathered
here.

## Artifacts

- Elite-path dump tool (deterministic, reproduces the pilot's exact selection):
  [`scripts/stress/repair-elite-path-dump.mjs`](../scripts/stress/repair-elite-path-dump.mjs)
- Case-builder + local-replay validator:
  [`scripts/stress/cpsat-explicit-prefix-round-builder.mjs`](../scripts/stress/cpsat-explicit-prefix-round-builder.mjs)
- Binary-search driver (used for the local continuation once the Actions queue was long):
  [`scripts/stress/repair-retreat-binary-search.mjs`](../scripts/stress/repair-retreat-binary-search.mjs)
- Round 1/2 case files (GitHub Actions, `cpsat-explicit-prefix-oracle` runs 3/4 on this branch):
  [`reports/stress/repair-retreat-round1-2026-08-12.json`](stress/repair-retreat-round1-2026-08-12.json),
  [`reports/stress/repair-retreat-round2-2026-08-12.json`](stress/repair-retreat-round2-2026-08-12.json)
- Round 3 case file (also dispatched to Actions before the local run superseded it):
  [`reports/stress/repair-retreat-round3-2026-08-12.json`](stress/repair-retreat-round3-2026-08-12.json)
- Final consolidated case file (required deliverable format):
  [`reports/stress/repair-retreat-cases-2026-08-12.json`](stress/repair-retreat-cases-2026-08-12.json)
- Final labeled oracle result (0 correctness alarms, 0 input alarms):
  [`reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`](stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json)

**Broadened-sample artifacts (2026-08-13)**:
- Elite paths for the 4 new candidates (small-rollback / `reqInt`-`mustCross`-heavy):
  [`reports/stress/repair-retreat-broaden-elite-paths-2026-08-13.json`](stress/repair-retreat-broaden-elite-paths-2026-08-13.json)
- Round 1 (`--time-limit=60`, all 4 elites — 2 abstained `unsupported-mechanics`, 2 hit `UNKNOWN` at their midpoint probe):
  [`reports/stress/repair-retreat-broaden-round1-2026-08-13.json`](stress/repair-retreat-broaden-round1-2026-08-13.json)
- Round 2 (`--time-limit=240`, the 2 `UNKNOWN`-midpoint elites only — both resolved to an exact boundary):
  [`reports/stress/repair-retreat-broaden-round2-retry-2026-08-13.json`](stress/repair-retreat-broaden-round2-retry-2026-08-13.json)
