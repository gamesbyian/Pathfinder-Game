# Repair-stagnation escape plan: shared turn-aware selective biasing (2026-07-22)

## What this is

The lever both the Stage 2 and Stage 3 reports converged on: make the plateau bias **selective**
using Stage 1's turn-aware features, instead of the flat cell-identity biases (Stage 2's attractor
penalty, Stage 3's guide reward) that couldn't tell a load-bearing cell from an incidental one.
**Verdict: the best-performing mechanism of the whole investigation — net-positive on near-miss
quality (bestBadness better on 4, worse on 3, with large wins), and clean/sound — but still no
solved-count gain, and it still carries the descent-phase near-solved regression (now confirmed a
second time to be immune to an arming-time guard).** Kept default-off.

## The mechanism

Stage 1's Finding 2: the dominant plateau (13/15) is a pending **must-turn** — the walk *reaches* the
must-turn cell but leaves it without making the required-direction turn. So the load-bearing decision
is one specific move: the step **out of a pending must-turn cell**. The bias acts exactly there and
nowhere else — the "selective" part:

- `preferredTurnExit(prev, pos, neighbors, reqDir)` (pure, unit-tested; extracted from `takePly`'s
  existing exit-guidance logic so both share one definition) returns the neighbour that makes the
  required-direction turn.
- While a must-turn plateau is active, in `takePly`, when the current position is a pending must-turn
  cell: **reward** the required-turn exit (`+TURN_BIAS_REWARD`) and **penalize** every other exit
  (`−TURN_BIAS_PENALTY`). This targets *how* the must-turn cell is handled, not which cells are
  revisited — the discrimination the flat-cell prototypes lacked.
- Armed on a stagnation trigger, but **only when the plateau's best-ever restart still has a pending
  must-turn** (`bestHadPendingMustTurn`) — the selective condition that keeps it off levels it can't
  help. Decays on a fixed window, retired on any best-ever improvement, with a memory-blind restart
  fraction (support preservation). Gated by an opt-in `enableTurnBias` param, default off ⇒
  byte-identical to before (unit-tested; the `preferredTurnExit` extraction is behavior-preserving,
  confirmed by the pre-existing must-turn-bias determinism tests still passing).

Only active during a *detected* plateau, which is what distinguishes it from raw always-on exit
guidance — `EXIT_GUIDANCE_*` / the S030 episode (CLAUDE.md) document that always-on turn nudges are
fragile on levels that already solve. Being plateau-conditioned and default-off avoids that.

## Result (equal-work A/B, deterministic 3,000,000-node budget, gate 0)

| id | OFF | ON | Δbad |
|---|---:|---:|---:|
| R02077 | 13 | **5** | **+8** |
| R02267 | 8 | **4** | +4 |
| R02279 | 19 | **11** | **+8** |
| R03280 | 18 | **10** | **+8** |
| R02654 | 12 | 15 | −3 |
| R02859 | 3 | 14 | **−11** |
| R03294 | 6 | 11 | −5 |

(levels not listed: Δ0.) **Solved: 1/16 both. bestBadness: ON better 4, worse 3.**

## Reading the result

- **The most effective mechanism so far.** The improvements are large and land on genuinely stuck
  levels: R02077 13→5, R03280 18→10, R02279 19→11, R02267 8→4. Summed, the badness improvement (+28)
  outweighs the regression (−19). Turn-awareness is a real, better signal than flat cell identity —
  the reports' central hypothesis is confirmed.
- **But still no solve.** The wins get close (R02077→5, R02267→4) without tipping any level to
  solved in this budget — the residual is the coupled "make the turn *and* hit exact length"
  problem the frozen-signature diagnosis named, and rewarding the turn alone doesn't close the
  length half.
- **The near-solved regression persists (R02859 3→14, R03294 6→11), and — the notable finding — an
  arming-time near-solved guard does NOT fix it, a second time.** I added a guard (don't arm when
  `bestBadnessEver ≤ 6`), predicting turn bias's harm was *at* the must-turn plateau (unlike Stage 2,
  where it was during the descent). The measurement refuted that: R02859 stayed 3→14, guard or not.
  Reason: in the ON run R02859 never reaches badness 3 — the first stagnation arms turn bias at a
  higher badness the guard permits, and the bias then blocks the descent OFF uses to reach 3. **The
  near-solved regression is a descent-phase phenomenon for turn bias too, immune to arming-time
  guards — now confirmed on two independent mechanisms (Stage 2 penalty and this).** Any real fix
  must reason about the descent path, not how close the search currently is. The guard was reverted.

## Verification

- Unit tests (`repair-search.test.ts`, 32/32): pure `preferredTurnExit` (required-turn exit;
  opposite directions pick opposite exits; straight-through / non-orthogonal → null), soundness
  (`enableTurnBias=true` returns only `isSolutionState`-valid paths), determinism, and
  `enableTurnBias=false` byte-identical to omitting it. The pre-existing must-turn-bias tests still
  pass, confirming the `preferredTurnExit` extraction changed no behavior.
- `npm run solver:bench -- --check`: 160/160, no regressions (production default = flag off; the
  shared-`takePly` refactor is transparent to the published corpus).
- `tsc`/`eslint` clean.

## Recommendation / where this leaves the investigation

Turn-aware biasing is the direction that works — keep it, and it should be the base for any further
Stage-2/3 refinement (the flat-cell versions are superseded). Two concrete next steps, in order:

1. **Pair turn bias with a length-aware partner.** The wins stall at badness 4–5 because the turn is
   made but exact length isn't hit. The existing `closeLengthGap` operator already targets exactly
   "structural cleared, only length/int remains" — turn bias gets levels *closer* to that trigger
   condition, so the highest-value experiment is measuring turn-bias + a widened `closeLengthGap`
   together, rather than either alone. This is the first combination in the investigation with a
   plausible path to an actual solve.
2. **The descent-phase regression needs a descent-aware idea, not another arming guard.** Two
   mechanisms now confirm arming-time guards can't fix it. A shadow-mode approach (log what turn bias
   *would* change on a would-be-improving restart before letting it) is the honest next probe, per
   the plan's own soundness rule 7.

## Caveats

16 levels, single gate, one node budget, endpoint bestBadness (not the plan's plateau-survival
curve). `TURN_BIAS_REWARD`/`_PENALTY`/`_WINDOW` and the memory-blind period are unmeasured starting
values; this is one point in that space. The net-positive bestBadness is real but modest and does not
(yet) convert to a solve — a genuine step forward from the flat-cell prototypes, not a finished win.
