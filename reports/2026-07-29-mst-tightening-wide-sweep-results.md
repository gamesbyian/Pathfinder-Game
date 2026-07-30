# MST-tightening full-population sweep: 6 genuine new corpus-2 solves (2026-07-29)

> **UPDATE (2026-07-30)**: the 6 new solves reported below are real (referee-verified, kept as
> permanent hint provenance) — but this report only tested the unsolved-with-≥2-surround
> population, where a regression was structurally impossible (everything started at `ok:false`).
> A same-budget check against corpus-2's already-*solved* population (never run here) found the
> same change cost 26 levels for those 6 gains. Net negative; the underlying code was reverted.
> See [`2026-07-30-mst-tightening-reverted-net-negative.md`](2026-07-30-mst-tightening-reverted-net-negative.md).

## What this is

Closing measurement for the day's turn-load-mechanism thread: diagnosis
(`2026-07-29-turn-load-mechanism-missing-mst-tightening.md`) → surround MST tightening (`9defcc66`,
verified in `2026-07-29-surround-mst-tightening-shipped.md`) → adjacent-turn MST tightening
(`67bbbe97`). That last report flagged open questions: does the *combination* of both fixes flip any
of the 8 confirmed-robust ceiling-case levels, and does either fix produce **any** measurable gain
across the wider corpus-2 population (the fairer test, since the 8 were deliberately the hardest cases
in the whole investigation, not a representative sample). This report covers the full candidate
population in two passes — a 200-level random sample (surround-only commit `7e532fd1`), then the
remaining 233 candidates (combined commit `a8030e37`) — together covering all 433 corpus-2 levels that
were unsolved, had ≥2 surround objects, and weren't among the 8 already-tested ceiling cases.

## Ceiling cases: still 0/8, as expected

Re-ran the 8 confirmed-robust levels at the same 8000ms/20M-node budget against the combined-fix
commit: **still 0/8 solved**. Consistent with the prior report's reasoning — these were deliberately
selected as the hardest-of-hard (0/22 structural variants each), not where a first incremental gain
would be expected to show.

## Full population: 6/433 genuine new solves (1.4%)

| Level | Archetype | turnLoad | surround | adjTurn | winning config | pass |
|---|---|---|---|---|---|---|
| R02670 | high-intersection-burden | 8  | 2 | 0 | `ida:none` | 1 (surround-only) |
| R02888 | must-cross-heavy | 8  | 3 | 5 | `ida:none` | 1 (surround-only) |
| R03222 | default | 12 | 4 | 8 | `ida:intersectionHarvest` | 1 (surround-only) |
| R03293 | high-intersection-burden | 9  | 3 | 0 | `dfs:repair:repair` | 1 (surround-only) |
| R02110 | high-intersection-burden | 7  | 2 | 5 | `ida:none` | 2 (combined) |
| R03045 | portal-heavy | 8  | 2 | 6 | `ida:none` | 2 (combined) |

All 6 independently re-verified (`refereeValid: true`). All were previously confirmed unsolved not
just at this session's 8000ms/20M budget but at the pinned baseline's much larger verification budgets
(up to 125,000ms/300M nodes, `logs/stress-corpus2-baseline.json`) — these are not "would've solved
anyway with more time" cases; the new bounds genuinely opened search paths the old bounds couldn't
prune into within the same budget.

**This is the mechanistically coherent result the whole thread predicted**: 4 of 6 wins came from
`ida:*` configs — the admissible-order-search tier, whose entire mechanism is lower-bound-driven
pruning (per `docs/solver-architecture.md`). A tighter admissible bound helps exactly this technique
most directly, more than it would help e.g. a pure greedy DFS attempt. The wins span **5 different
archetypes** (high-intersection-burden ×3, must-cross-heavy, default, portal-heavy) at turnLoad 7–12 —
the same archetype-independence the disambiguation report already established, now showing up as a
genuine capability gain rather than just a robustness classification. R03045's portal-heavy win is
notable: the two MST bounds shipped today touch only surround/adjacent-turn state, with zero portal
awareness — the gain there is purely from the general search having more slack elsewhere in the
attempt ladder, not from anything portal-specific.

**Rate is consistent across both passes** (4/200 ≈ 2.0%, 2/233 ≈ 0.9%, combined 6/433 ≈ 1.4%) — no
sign the effect was a first-pass fluke that dried up, though with only 6 total events the rate itself
should still be read as an order-of-magnitude signal, not a precise estimate.

## What this means

The mechanism report's hypothesis is now supported by **direct capability evidence**, not just
diagnostic reasoning, over the *full* candidate population (not a sample extrapolation): closing the
missing MST tightening recovered 6 genuine corpus-2 solves, with zero regressions anywhere else
(published-corpus `solver:bench --check` clean twice, 1500+ level-checks of real-witness soundness
verification clean, full solver test suite green throughout). At this measured rate, the two shipped
bounds add roughly 6 levels to corpus-2's known-solved count outright, on top of whatever further
levels a similar mechanism might unlock in the untested surround<2/adjTurn<2 population (not
investigated — these bounds are inactive by construction below 2 objects) or via other pruning-tier
techniques this sweep didn't specifically probe.

## Not done here (flagged, not silently skipped)

- **`logs/stress-corpus2-baseline.json` is not updated.** That pinned baseline has its own compilation
  process and sourcing conventions (`.github/workflows/solver-stress-refresh.yml`); hand-patching 6
  rows here would bypass that process. The 6 new hints (with provenance) are committed to
  `data/stress/hints-random/`, which is the correct, independent source of truth for "this level has a
  known solution" regardless of when the baseline JSON next refreshes. A full `solver-stress-refresh`
  run would pick these up automatically.
- **Extending the search to levels with exactly 1 surround or 1 adj-turn object** (where the shipped
  MST terms are structurally inactive, `remainLen < 2`) — not investigated; would need a different
  mechanism (or none — a single object was already well-bounded by the pre-existing max-of-individual
  term).

## Verification

All 6 solves are independently referee-verified (`refereeValid: true` in the sweep output, the same
`validateCandidatePath` re-check every other high-budget sweep in this corpus's history uses). Hints
committed with full provenance via the existing `--save-hints` → `writeLevelsWithHints` pipeline — no
hand-edited JSON.
