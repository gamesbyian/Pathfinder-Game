# Beam state-dedup: sound-signature duplicate ceiling and heuristic-key soundness audit (2026-08-06)

Follow-up to an uploaded design note proposing "exact future-state equivalence" as the top-ranked
lever for finding more solves (canonical state identity → safe transposition/beam dedup). That
exact avenue was already measured for **DFS** and downgraded
(`reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md`: sound-signature duplicate
rate 0.5–16%, not the 92–99% a crude signature suggested — "checked and found weak"). This report
runs the same kind of measurement against **beam search** specifically, since beam holds many
candidates alive concurrently at one depth — a structurally different setting where duplicates
seemed more plausible — plus a second question the DFS report didn't ask: is the dedup mechanism
beam *already ships* (`STRATEGY_STATE_DEDUP`, `search.ts`'s `useStateDedup`) actually sound?

**Method, matching this repo's own established practice** (temporary instrumentation, measure,
revert — see the DFS report and `mitm-frontier-probe.mjs`'s history): added a `_SIG_AUDIT` debug
hook directly in `beamSearchFromGate` (env-gated, zero prod cost), computing for every candidate,
at the moment right after `applyMove` and before `undoMove` (so `ws`'s live typed arrays are
exactly that candidate's post-move state, no path replay needed): a **sound signature** — sorted
unique visited-cell keys + per-cell `edgeUsage`, `crossCounts`, `realLen`, `ints`, the existing
`sc` mask bundle, and `lastWasPortalJump`. (Portal-usage identity doesn't need a separate field:
portals are single-use, so a used terminal's key is already in the visited-cell set.) At the end of
each expansion step, before any culling, grouped the full candidate pool both by this sound
signature and by production's actual heuristic key (`key + sc * KEY_SPACE`), and logged the
cross-tabulation. Reverted immediately after measuring (`git checkout --`); no production code
changed.

**Sample**: 80 levels, evenly sampled — 20 published, 20 stress-corpus-1, 40 stress-corpus-2 — using
each level's real `getAttemptConfigs`-selected beam config (production routing, not a hand-picked
one), 2.5s / 300k-node budget per attempt. 62/80 levels actually exercised a beam attempt (the rest
routed to DFS-only configs and generated no beam candidates at all). 27 of the 62 had portals.

## Experiment A: the sound-signature duplicate ceiling is smaller than DFS's, not larger

| population | candidates generated | true sound-duplicate slots | rate |
|---|---:|---:|---:|
| all | 11,399,149 | 2,129 | **0.019%** |
| non-portal | 6,228,564 | 453 | 0.007% |
| portal | 5,170,585 | 1,676 | 0.032% |

Even a hypothetically perfect, zero-cost sound key would merge about **1 candidate in 5,000** in
beam's per-step frontier. This is an order of magnitude *below* the DFS report's already-downgraded
0.5–16% (median ~1–2%) trace-revisit rate, not above it — the "beam holds many candidates
concurrently, so duplicates should be more common" intuition doesn't hold up empirically. Portal
levels show a somewhat higher rate (0.032% vs 0.007%) but both are negligible in absolute terms.
This directly answers the uploaded document's "Ranked Research Programme #1" experiment for beam:
**the ceiling has been established, and it's not worth building anything on.**

## Experiment B: today's shipped dedup key is essentially always unsound when it fires

| | count |
|---|---:|
| heuristic-key groups with 2+ candidates | 1,647,849 |
| … of which contain a genuine sound-signature mismatch | 1,647,849 (**100.00%**) |
| candidate-slots touched by an unsound merge | 8,780,147 |
| levels with at least one unsound-merge event | 62/62 |

Every level that generated any multi-candidate heuristic-key group had at least one group where the
merged candidates are, by the sound signature, genuinely different future states. This is not
surprising given Experiment A: the (cell, `sc`-mask) key is coarse relative to the true state space
(which specific ~dozens of cells got visited, via which axis), so two *different* candidates landing
on the same cell with the same aggregate mask values are — per Experiment A's own number —
overwhelmingly likely to be non-identical underlying states, not a coincidental exact match. The two
findings are two sides of the same fact, not in tension: true duplicates are rare (A), so almost
every collision the coarse key catches is a false one (B). This gives `docs/future-work.md`'s terse
"State-dominance/transposition caching — correctness risk... unfavorable" line concrete,
beam-specific evidence it didn't have before (that line's likely evidentiary basis, the DFS report,
never actually measured a shipped, active dedup mechanism — only a proposed future one).

**Caveat on "unsoundCandidates":** this counts every member of a group as "affected" whenever *any*
mismatch exists in that group, not the number of specific non-matching pairs — a conservative
(over-counting) proxy, called out explicitly rather than presented as an exact pairwise count.

## Experiment C: the unsoundness has not cost a single solve on this sample

| | dedup ON (production default) | dedup OFF (`STRATEGY_STATE_DEDUP: false`) |
|---|---:|---:|
| solved (of 35 non-portal levels with a real beam attempt) | 35 | 35 |

Zero divergence. Every level beam solved with dedup on, it also solved with dedup off, and vice
versa, at a matched budget. (Portal levels excluded from this half — production already disables
`useStateDedup` there unconditionally, so there's no ON/OFF question to ask.)

**Reading Experiment B and C together, not in isolation:** the shipped key is formally unsound
almost every time it merges anything, yet empirically that unsoundness has not (on this sample)
foreclosed a reachable solution. The likely reason: a puzzle instance that's solvable from a given
`(cell, mask-state)` combination usually has *multiple* valid completions regardless of exactly
which other cells happen to already be visited, so discarding one specific route to get there rarely
forecloses the goal — the "different future" the sound signature correctly detects is often a
difference that doesn't matter for reachability, even though it's a real difference in principle.
This is consistent with, and adds a mechanistic story to, Experiment A's own finding.

## What this changes about the uploaded document's recommendations

- **"Ranked Research Programme #1" (exact future-state key laboratory) and "#2" (portal-aware beam
  dedup)**: both already have a direct answer for beam, matching the DFS answer this repo already
  had. Building either is not recommended — the ceiling (Experiment A) is too small to repay the
  cost of computing and storing a sound signature (the DFS report separately measured that cost as
  large: 5–6× fewer nodes per unit time once a sound signature is computed per node).
- **The document's soundness caution itself is still worth keeping**, independent of this specific
  technique's payoff: the shipped `useStateDedup` key is a real, if apparently harmless-in-practice,
  correctness gap. Not recommended as something to fix reactively (Experiment C found no cost to
  fix), but worth knowing precisely, and worth re-checking if `useStateDedup` is ever extended to a
  new population (e.g. portal levels, or a level with denser must-cross constraints, where the
  additional gap this audit surfaced — `sc`'s `mustCrossMask` bit can't distinguish "0 visits" from
  "1 visit, axis partially locked" on the same must-cross cell — could plausibly matter more than it
  did on this sample).
- Everything else in the uploaded document (Opportunities 2–9, the ranked programme's items 3–6)
  is unaffected by this measurement — it was scoped specifically to Opportunity 1 / the top two
  ranked-programme items, for beam.

## Verification

Pure read-only measurement. Temporary instrumentation added to `modules/solver/search.ts`
(`_SIG_AUDIT`, env-gated), run via a throwaway driver script (not committed), then reverted via
`git checkout --`. `git status` and `tsc --noEmit` confirmed clean against production `search.ts`
after reverting. No production code changed by this investigation.
