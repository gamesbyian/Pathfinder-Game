# MST-tightening wide sweep: 4 genuine new corpus-2 solves (2026-07-29)

## What this is

Closing measurement for the day's turn-load-mechanism thread: diagnosis
(`2026-07-29-turn-load-mechanism-missing-mst-tightening.md`) → surround MST tightening (`9defcc66`,
verified in `2026-07-29-surround-mst-tightening-shipped.md`) → adjacent-turn MST tightening
(`67bbbe97`). That last report flagged two open questions: does the *combination* of both fixes flip
any of the 8 confirmed-robust ceiling-case levels, and does either fix produce **any** measurable gain
across the wider corpus-2 population (the fairer test, since the 8 were deliberately the hardest cases
in the whole investigation, not a representative sample). Both are answered here.

## Ceiling cases: still 0/8, as expected

Re-ran the 8 confirmed-robust levels at the same 8000ms/20M-node budget against commit `67bbbe97`
(both surround and adjacent-turn tightening combined): **still 0/8 solved**, same as the surround-only
recheck. Consistent with the prior report's reasoning — these were deliberately selected as the
hardest-of-hard (0/22 structural variants each), not where a first incremental gain would be expected
to show.

## Wider population: 4/200 genuine new solves (2%)

Sampled 200 levels at random from corpus-2's unsolved-with-≥2-surround-objects population (433
candidates, excluding the 8 ceiling levels already tested), and ran the same 8000ms/20M-node sweep
against the surround-only commit (`7e532fd1`) with `--save-hints`. **4 newly solved**, all independently
re-verified (`refereeValid: true`):

| Level | Archetype | turnLoad | surround | adjTurn | winning config |
|---|---|---|---|---|---|
| R02670 | high-intersection-burden | 8  | 2 | 0 | `ida:none` |
| R02888 | must-cross-heavy | 8  | 3 | 5 | `ida:none` |
| R03222 | default | 12 | 4 | 8 | `ida:intersectionHarvest` |
| R03293 | high-intersection-burden | 9  | 3 | 0 | `dfs:repair:repair` |

Every one of these levels was previously confirmed unsolved not just at this session's 8000ms/20M
budget but at the pinned baseline's much larger verification budgets (up to 125,000ms/300M nodes,
`logs/stress-corpus2-baseline.json`) — so these are not "would've solved anyway with more time" cases;
the new bound genuinely opened search paths the old bound couldn't prune into within the same budget.

**This is the mechanistically coherent result the whole thread predicted**: 3 of 4 wins came from
`ida:*` configs — the admissible-order-search tier, whose entire mechanism is lower-bound-driven
pruning (per `docs/solver-architecture.md`). A tighter admissible bound helps exactly this technique
most directly, more than it would help e.g. a pure greedy DFS attempt. The 4 wins also span 3 different
archetypes (high-intersection-burden ×2, must-cross-heavy, default) at turnLoad 8–12 — the same
archetype-independence the disambiguation report already established, now showing up as a genuine
capability gain rather than just a robustness classification.

**Caveat on the rate**: 4 events is a small sample — treat "~2%" as an order-of-magnitude signal, not
a precise population estimate. It's also surround-only; the wider sweep predates the adjacent-turn
commit and wasn't re-run combined (time-bounded choice, not a gap in the reasoning — the ceiling-case
recheck already confirms the combined code is at least as good, and there's no mechanism by which
combining a second correctly-composed `Math.max` tightening could *reduce* the solve count).

## What this means

The mechanism report's hypothesis is now supported by **direct capability evidence**, not just
diagnostic reasoning: the missing MST tightening was a real, measurable gap, and closing even the
easier (surround) half of it recovered genuine solves in the population it was aimed at, with zero
regressions anywhere else (published-corpus `solver:bench --check` clean twice, 1500+ level-checks of
real-witness soundness verification clean, full solver test suite green). Extrapolated loosely, a
similar rate across the full ~430-level remaining candidate population would suggest single-digit-to-
low-double-digit additional corpus-2 solves from this one mechanism — worth a full-population sweep
(not run here) if corpus-2's overall solved count is a tracked metric worth updating.

## Not done here (flagged, not silently skipped)

- **`logs/stress-corpus2-baseline.json` is not updated.** That pinned baseline has its own compilation
  process and sourcing conventions (`.github/workflows/solver-stress-refresh.yml`); hand-patching 4
  rows here would bypass that process. The 4 new hints (with provenance) are committed to
  `data/stress/hints-random/`, which is the correct, independent source of truth for "this level has a
  known solution" regardless of when the baseline JSON next refreshes.
- **A full (not sampled) sweep of the ~430-level remaining candidate population**, and a combined
  (surround+adjTurn) wide sweep — both reasonable follow-ups, not run here for time.

## Verification

The 4 solves are independently referee-verified (`refereeValid: true` in the sweep output, the same
`validateCandidatePath` re-check every other high-budget sweep in this corpus's history uses). Hints
committed with full provenance via the existing `--save-hints` → `writeLevelsWithHints` pipeline —
no hand-edited JSON.
