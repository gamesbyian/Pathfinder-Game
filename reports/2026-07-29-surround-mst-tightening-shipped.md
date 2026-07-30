# Surround MST tightening: shipped, verified safe, doesn't flip the hardest 8 (2026-07-29)

> **UPDATE (2026-07-30): REVERTED.** "Verified safe" here meant sound (never wrongly prunes a
> reachable solution) and non-regressing on the published corpus — both true, and neither was
> wrong. What this report never checked was cost against corpus-2's already-solved population at
> the operating budget; that check, done the next day, found a real net regression (26 levels lost
> vs. 14 gained on a 353-level sample) and the change was reverted. See
> [`2026-07-30-mst-tightening-reverted-net-negative.md`](2026-07-30-mst-tightening-reverted-net-negative.md).

## What this is

Closes out the implementation phase for the surround half of
`reports/2026-07-29-turn-load-mechanism-missing-mst-tightening.md`'s recommendation. Shipped in
commit `9defcc66` (`modules/solver/lower-bounds.ts`'s `surroundObjectMSTLowerBound`, wired into
`surroundLowerBound` via `Math.max`). See that commit and the mechanism report for the design and
admissibility argument.

## Verification performed (summary — full detail in the commit message)

- Two new unit tests (joint bound exceeds max-single-object bound on a purpose-built level; the
  <2-object fallback still works).
- Full solver suite: 266/266 pass.
- **Soundness**: replayed the known-valid witness/hint path through every level across all 3
  corpora with ≥2 surround objects (597 levels) and confirmed the bound never exceeds the true
  remaining path length at any step — 0 violations. (The first run found 597 false violations,
  traced to the verification script itself misreading corpus-2's 1-indexed `[x,y]` witness format
  as packed keys — a bug in the scratch checker, not production code; fixed and reconfirmed clean.)
- `eslint` + `check:types`: clean.
- `solver:bench --check`: 160/160, no regressions, cost flat vs. baseline (-0.7% time, +0.8% nodes).

## Does it flip any of the session's confirmed-robust levels? No — and that's expected, not a failure

Re-ran the 8 levels from `reports/families/2026-07-29-turn-load-vs-archetype-disambiguation.md`
(the ones confirmed robust across 22 structural variants each) at the same 8000ms/20M-node budget
against the new code: **still 0/8 solved**, all still exhausting the node budget (or, for R03180,
the wall-clock timeout) exactly as before.

This is not a meaningful negative signal against the mechanism report's hypothesis, for three
concrete reasons:
1. **2 of the 8 (R00082, R01052) have zero surround objects** — this change cannot possibly affect
   them; only 6 were even in scope.
2. **This ships only half the identified gap.** `adjTurnLowerBound` still has no joint tightening
   (the harder half — its "any one neighbor suffices" semantics need their own admissibility
   argument, not yet written). On a level whose robustness comes from *both* categories being
   loose, tightening only one may not be enough alone to cross the solve threshold within budget.
3. **These 8 were deliberately selected as the hardest of the hard** — 0/22 structural variants
   solved each, the ceiling case in the whole investigation. A single incremental pruning
   improvement flipping the single hardest-known cases in one shot would be a surprisingly strong
   result, not the expected one; a real effect is more plausible to show up first as incremental
   improvement across the wider corpus-2 population (more nodes pruned, more near-miss levels
   crossing the threshold) than as an immediate win on the ceiling cases.

The nodesExpanded comparison between the pre- and post-change runs on these 8 is **uninformative**:
7 of 8 hit the identical hard 20,000,000-node cap in both runs (a ceiling, not a search-quality
signal), and the 8th (R03180, wall-clock-timeout-bound) shows fewer nodes explored in the same wall
time post-change — expected from the new bound's added per-call cost, not evidence either way about
pruning quality.

## What would actually answer "did this help"

Not yet run, out of scope for this pass: a broad sweep of corpus-2's wider unsolved-with-≥2-surround
population (586 levels, of which the 8 above are only the most extreme) checking for **any** new
solves — the fairer test, since the mechanism predicts incremental gains distributed across
near-the-threshold levels, not necessarily wins on the hardest-known cases. That, plus the
adjacent-turn half of the fix, are the two concrete next steps if this thread continues.

## Recommendation

Ship as-is — it's independently verified safe (sound, no regressions, flat cost) regardless of
whether it measurably moves the needle alone. Don't read "0/8 flipped" as refuting the mechanism
report; read it as "half a fix on the single hardest cases in the corpus wasn't expected to be
enough, and wasn't." The adjacent-turn tightening and/or a wider corpus-2 sweep are what would
actually test the mechanism's practical impact.
