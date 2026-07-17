# Why the repair-search stagnation plateau resists constant tuning: the near-miss signature freezes, not just the badness number (2026-07-17)

## Context

Three individually well-motivated constant-tuning fixes for the repair-search stagnation plateau
have now failed empirically
([`reports/2026-07-17-repair-burst-diversify-pool-negative-result.md`](2026-07-17-repair-burst-diversify-pool-negative-result.md)):
burst length, burst-time elite-pool acceptance, and trigger threshold. All three assume the
plateau is a *search-coverage* problem — not enough independent restarts, or restarts that don't
escape the current elite pool's structural family. This report checks that assumption directly by
instrumenting `PF_REPAIR_DEBUG=1` (existing env-gated tracing in `repair-search.ts`, previously
used only for aggregate bestBadness-over-time curves) and reading the actual `computeBadness` term
breakdown at every improvement, not just the badness number.

## Method

Called `repairSearchFromGate` directly (bypassing the full attempt ladder) on two of the levels
most sensitive to the failed constant-tuning experiments — `R02344` (froze at badness 2 under
production defaults) and `R02123` (froze at badness 6) — at `budgetMs=8000`,
`nodeBudget=3,000,000`, and read every logged improvement line plus every `STAGNATION` burst
trigger for the remainder of the run.

## Finding: the near-miss *signature*, not just the badness number, is frozen

**`R02344`**: reaches `bestBadness=2` at restart 68,012 (t=3952ms) with breakdown
`len=1 int=0 mp=0/13 mc=0 mustTurnMask=10000` (path length off by exactly 1; exactly one
must-turn landmark still needs its required-direction turn). The run continues for **11 more
stagnation bursts** (restart 74,012 through 134,012+, ~66,000 more restarts, budget exhausted at
2.19M nodes) with **zero further best-ever-improvement lines logged**. The debug line only fires
when a restart beats the current global best (`b < bestBadnessEver`), so this proves no restart,
burst or spliced, ever beat badness 2 within the observed 8000ms/3M-node run — it does **not** by
itself establish that every individual restart reproduced the identical deficit signature, or that
the elite pool's other 7 members stayed unchanged (a tying or non-best-but-pool-worthy candidate
can enter the pool without triggering this log line; that would need separate, un-collected
instrumentation to confirm).

**`R02123`**: reaches `bestBadness=6` at restart 127,881 (t=4437ms) with breakdown
`len=4 int=0 mp=0/13 mc=0 mustTurnMask=1100000` (length off by 4; **two** must-turn cells still
pending). Same pattern: **13 more stagnation bursts** (restart 133,881 through 223,881+, ~90,000
more restarts, budget exhausted at 2.5M nodes), zero further best-ever improvement logged.

Both levels independently converge to a near-miss whose *specific* deficit combination is
length-off-by-N **plus** M pending must-turn cells, and then stay stuck at that same best-ever
badness for the remainder of the bounded run — not a generic "close but not quite" state, a
precise recurring structural signature at the point search stops making further progress within
budget.

## Why this explains all three negative constant-tuning results

Every failed fix (burst length, burst-time pool diversification, trigger threshold) assumes more
or differently-timed *independent random restarts* would eventually stumble onto a better
structural family. But the evidence here shows repair already finds this exact signature at
3952ms/68,012 restarts (`R02344`) and 4437ms/127,881 restarts (`R02123`) — roughly the first half
of each level's 8000ms budget, not an early or vanishingly small fraction of it — and every burst
afterward (which forces `STAGNATION_BURST_LEN` genuinely independent fresh-from-gate restarts,
each with its own random walk) fails to log a further best-ever improvement for the *entire
remaining budget* — tens of thousands of additional restarts and a dozen-plus more bursts. If
independent restarts kept landing on genuinely different structural families, at least some
fraction would eventually resolve the length+turn combination by chance
(as several *did* resolve every other deficit term along the way — must-pass, must-cross,
intersections all reach 0 well before length/must-turn do). The fact that length-off-by-N and
pending-must-turn specifically *never* co-resolve, across tens of thousands of independent
attempts, suggests these two terms interact in a way ordinary random-walk move selection can't
easily satisfy simultaneously — not that the search hasn't tried enough distinct starting points.

**A plausible mechanism, not yet confirmed**: turning at a must-turn cell in the *specific*
required direction (`TurnDir`) very likely costs a specific, non-arbitrary number of extra/fewer
path steps relative to a "just pass through" trajectory (a direction-specific detour), and hitting
`reqLen` exactly while also taking that specific detour is a much narrower target than either
constraint alone. This lines up with `CLAUDE.md`'s own documented precedent that must-turn cells
are unusually sensitive for repair search — the `EXIT_GUIDANCE_EPSILON_BOOST`/S030 episode already
found that even a *rarely*-taken different move near a must-turn cell can break established
convergence, in the opposite direction (a nudge that was *supposed* to help regressed a solved
level to a timeout). This report's finding is the same sensitivity showing up from the other
side: ordinary un-nudged random exploration essentially never finds the (apparently narrow) set of
paths that resolve a must-turn direction requirement and hit the exact required length together.

## What this doesn't do

No solver code changed, no fix implemented or tested here — this is a mechanism diagnosis, not a
fix. It does redirect where a future fix attempt should look: **not** more/different generic
random-restart tuning (three variants already falsified), but something that specifically reasons
about the interaction between a pending must-turn direction requirement and the current length
deficit — e.g. a targeted local move/repair operator that, once only these two deficit terms
remain, searches for or constructs a length-preserving detour through the pending must-turn
cell(s) rather than relying on ordinary epsilon-greedy step selection to find one by chance. This
is a materially different, more invasive kind of change (a new move-generation mechanism, not a
constant) and would need the full correctness+regression rigor `CLAUDE.md` requires for any
solver-hot-path change — proposed as a concrete direction for a future session, not attempted
here.

**Caveat on generality**: only 2 levels were instrumented this deeply (chosen because they were
the most constant-tuning-sensitive members of the 12-level sample, not randomly). Both happen to
have pending must-turn deficits at their frozen signature; this doesn't establish that *every*
`repair-close` plateau is must-turn-specific — a level with only a must-cross or must-pass deficit
remaining might show the same frozen-signature behavior for a different structural reason. The
next step to generalize this finding would be running the same instrumentation across a larger,
diverse sample of `repair-close` levels and checking whether "frozen signature" is universal and
whether must-turn specifically dominates the frozen terms, or whether other deficit types show it
too.

## Verification

Both traces captured via direct, unmodified `repairSearchFromGate` calls (no solver code changed)
with `PF_REPAIR_DEBUG=1` set before module import (the flag is read once at module load — setting
it after import is a silent no-op, caught and fixed during this investigation). Raw debug logs
retained in this investigation's session for both levels; the reported badness-breakdown lines are
verbatim from `debugBadnessBreakdown`'s output, not paraphrased or recomputed.
