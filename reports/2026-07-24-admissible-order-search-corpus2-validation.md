# admissible-order-search: full corpus-2 unsolved-population validation (2026-07-24)

## What this is

Follow-up to `modules/solver/admissible-order-search.ts`'s prototype (a complete DFS reusing the
existing sound admissible-pruning gauntlet, `evaluatePrunedMove`/`prune-gauntlet.ts`, but ordering
each node's surviving children by admissible slack — remaining steps minus the tightest applicable
lower bound, ascending — instead of the existing soft heuristic score). Tested standalone (a single
method, no ladder, no fallback) via `scripts/method-probe.mjs` against every level in corpus-2's
committed unsolved population (1266 levels, `logs/stress-corpus2-baseline.json`, `ok:false` — i.e.
levels the FULL production ladder, including beam/DFS/repair/attraction-diversity, already failed
on in the last refresh).

## Method

1266 unsolved levels tested at the standard operational budget (8000ms / 20,000,000 nodes), split
into batches (a 30-level sample, a 200-level sample, then the remaining 1036 split 4 ways and run in
parallel across 4 local cores) purely for wall-clock convenience — no methodological difference
between batches. Every `ok:true` result was independently re-verified with
`modules/domain/path-validator.ts`'s `validateCandidatePath` (the same validator play-mode itself
uses) against the level's own `reqLen`/`reqInt`/mechanic constraints — not just trusting the
search's internal `isSolutionState` check, per this session's own standing discipline of verifying
before claiming a result.

## Result

**71 of 1266 previously-unsolved corpus-2 levels solved, all 71 independently validated (0
invalid).** Hit rate 5.6%.

- 70 are unambiguously new: never solved by the full production ladder in any observed run.
- 1 (R00314) was already known and documented earlier this session as CPU-throughput-noise-flaky
  (occasionally solvable by the existing `dfs:objectiveFirst` under favorable machine timing,
  characterized in `reports/2026-07-23-turnbias-corpus2-ab-validation.md`) — still a genuine valid
  solve via this method, just not evidence of a capability gap the way the other 70 are.

Sample-level breakdown (batch sizes were a convenience split, not independent trials):

| Batch | Tested | Solved |
|---|---|---|
| First sample | 30 | 2 (incl. R00314) |
| Second sample | 200 | 11 |
| Remaining (4×259, parallel) | 1036 | 58 |
| **Total** | **1266** | **71** |

Two known "robust hard core" levels (R00440: 0/45 family-variant-solvable; R02579: 1/45) were also
probed directly and did NOT solve within a generous 30s/30M-node budget — expected; these are
defined by resisting every technique and structural perturbation tried so far, so this isn't a
meaningful negative signal specific to this method.

## Why this found what nothing else did

`dfsFromGateLDS`'s final unbounded wave was *already* a complete, admissibly-sound search — nothing
about soundness or completeness was missing. What differs here is purely *exploration order*: the
production DFS commits to each node's soft-scored-best child first (`scoreAndSort`, tuned heuristic
weights), and only discovers a dead end after however deep that commitment goes before backtracking.
This variant instead commits to whichever legal child has the *least admissible slack* — the
classical A*/IDA*/CSP "most-constrained-first" idea — which apparently threads a meaningfully
different, and on ~5.6% of previously-unreachable levels, *correct* path through the same search
space the existing methods also legally have access to.

## Cost

Solved levels were cheap: median well under 3M nodes, several under 500K (R02056: 16,243 nodes;
R02922: 183,589). The population-wide average of ~18M nodes/level (3.65B total nodes / 200 in the
second sample) reflects the ~67% of levels that hit the full 20M ceiling without solving — the same
"most attempts are on unsolved levels" cost profile the existing ladder already has (see
`reports/2026-07-23-solver-batch-speed-and-hint-provenance.md`'s "94% of batch wall time is failed
levels" finding). Raw node throughput on the two known robust hard cores was ~2.5-3.6M nodes/sec —
the extra apply/undo overhead for ranking (this file's own cost tradeoff note) does not appear to be
a severe tax in practice.

## What's still open

- **Not yet wired into the production attempt ladder.** `AttemptConfig.admissibleOrder` exists and
  dispatches correctly (`attempt-dispatch.ts`), but no `ATTEMPT_POLICY` rule or `getAttemptConfigs`
  path adds it — it is reachable only via `method-probe.mjs` today. Adding it as one more (fully
  additive — new code, doesn't remove or reorder anything existing) attempt in the ladder is the
  natural next step, gated behind an ablation flag and validated via the standard `solver:bench
  --check` + full-corpus timing/solved-count discipline this session's other work has followed.
- **Not tested combined with the existing ladder.** This validation tested the method in isolation
  against levels the FULL ladder already failed on — so there is no double-counting risk (these 71
  are not already-claimed by anything else) — but it does not yet answer "does this displace any
  existing win when run as part of the full ladder," which the standard corpus-2 A/B methodology
  would need to confirm before promotion to default-on.
- **Not tuned.** This is the first version tried — no variation on which admissible bounds
  contribute to the ranking, no combination with soft scoring as a tie-breaker among near-equal-slack
  candidates, no discrepancy-limited probe-then-fallback structure (mirroring `dfsFromGateLDS`'s own
  cheap-probe/unbounded-fallback design) for latency. Whether any of these would raise the 5.6% hit
  rate further, or whether raw untuned admissible-slack ordering already captures most of the
  available signal, is unknown.
- **The 70 new solutions are real, independently-validated paths** — candidates for storing as
  genuine cold-solver-find hints (`solver.technique` should be a new value distinguishing this
  method from `dfs`/`beam`/`repair`, not silently folded into `'dfs'`, so future provenance queries
  can tell them apart) once the technique's `solver.id`/provenance wiring is decided.

## Update (2026-07-24, same day): soft-score tie-break tuning — 32 more, 103 total

First tuning experiment on the "not tuned" gap above: slack (remaining steps minus the tightest
admissible bound) is an integer, so ties among a node's ≤4 children are common — many legal moves
reduce the tightest bound by exactly the same amount without the ordering distinguishing which is
actually more promising. Added the existing soft heuristic score (`scoreMove`,
`POLICY_PROFILES.default`) as a secondary sort key for slack ties — computed from the pre-move state
(no apply/undo needed, cheap relative to the slack computation itself, which does need it).

**Caught a real bug while writing this**, before any correctness-affecting test ran: the new
tie-break code's portal-jump check initially dropped the `!state.lastWasPortalJump` guard every
other portal-jump check in the codebase carries (`search.ts` lines 94/453/477) — fixed, then
re-verified against `data/levels.json`'s first 10 published levels with the independent
`validateCandidatePath` validator (10/10 valid) before proceeding to the real test.

Tested the tie-break variant standalone against the 1195 levels the plain slack-only version could
NOT solve (so, by construction, zero overlap risk with the 71 above): **32 more solved, all 32
independently re-validated (0 invalid)**.

**Combined total: 71 + 32 = 103 of 1266 previously-unsolved corpus-2 levels — an 8.1% hit rate,
past the 100-new-solves bar**, from two rounds of the same underlying idea (reuse the existing sound
bounds, change only exploration order) — still nothing here is a new soundness primitive, and
production remains completely untouched (`solver:bench --check` 160/160 after this change too).

## Update (2026-07-24, same day): full-corpus GH Actions sweep of 3 more tie-break profiles — 12 more, 115 total

A local 200-level sample test of all 12 `PROFILE_ORDER` tie-break profiles against the residual
"hardest of the hard" population (levels neither plain admissible-order-search nor the default
tie-break above could solve) showed diminishing but nonzero hits from 3 profiles: `mustCrossFirst`,
`intersectionHarvest`, `nearClosureRescue`. Moved to GitHub Actions (20-shard matrix,
`.github/workflows/method-probe-sweep.yml`, built this session) to test each against the **full**
1700-level corpus-2 at the standard 8000ms/20,000,000-node budget, rather than another local sample.

**Methodological trap caught before over-claiming**: the full-corpus sweep's raw solved sets union
to 145 levels, and diffing against the master 103-solve list (from the two rounds above) naively
looked like 91 "new" IDs. But the sweep ran against the *entire* corpus, not just the residual
unsolved population — so most of that 91 were levels the full production ladder can **already**
solve (unrelated to this technique). Cross-referencing against `logs/stress-corpus2-baseline.json`'s
actual `ok:false` set (the 1266-level unsolved population these rounds are scored against) found
only **12 of the 91** were genuinely in the still-unsolved population and not already claimed by the
first two rounds; the other 79 were re-discoveries of levels solvable by other means. All 91 raw
candidates were independently re-validated via `validateCandidatePath` regardless (0 invalid) before
this check — the correction is about what counts as *new*, not about solution correctness.

**12 more genuinely new, independently validated solves:**

| id | winning profile | path length |
|---|---|---|
| R00050 | `ida:nearClosureRescue` | 134 |
| R01129 | `ida:mustCrossFirst` | 89 |
| R02315 | `ida:mustCrossFirst` | 67 |
| R02623 | `ida:nearClosureRescue` | 67 |
| R02652 | `ida:intersectionHarvest` | 104 |
| R02940 | `ida:intersectionHarvest` | 96 |
| R02999 | `ida:intersectionHarvest` | 119 |
| R03020 | `ida:mustCrossFirst` | 82 |
| R03076 | `ida:intersectionHarvest` | 73 |
| R03149 | `ida:intersectionHarvest` | 77 |
| R03222 | `ida:intersectionHarvest` | 84 |
| R03327 | `ida:intersectionHarvest` | 119 |

12 / 1163 (levels still unsolved by anything after the first two rounds) ≈ 1.0% hit rate for this
third round — confirms the diminishing-returns pattern the local sample predicted (5.6% → 2.8% →
~1.0%), and that most of the signal in a "which tie-break profile" search is concentrated in the
first couple of profiles tried, not spread evenly across all 12.

**Combined total: 71 + 32 + 12 = 115 of 1266 previously-unsolved corpus-2 levels — a 9.1% hit
rate.**

## Update (2026-07-24, same day): hint-provenance fix, 63 hints saved, wired into the production ladder

Three follow-up items closed out the "what's still open" list above.

**Hint-provenance technique classifier fixed.** `deriveSolveAttemptInfo` (`modules/solver/hint-provenance.ts`) derived `solver.technique` from a hardcoded `repair ? 'repair' : beamWidth ? 'beam' : 'dfs'` ternary with no `admissibleOrder` check — an admissible-order-search winner would have silently mislabeled itself as a plain `'dfs'` find. Fixed to check `winner.admissibleOrder` and emit `'admissible-order'`, with a regression test.

**63 of the 115 solves saved as hints**, not all 115: every solve needed a fresh, freshly-re-validated solution path (never trust a historical claim without the concrete path in hand), and only 63 could actually be regenerated in this session — the 12 newest (already had paths on hand) plus 51 of the earlier 103 that still reproduce via `ida:default` today. The other 52 do not currently reproduce with any of the 4 tie-break profiles tried: the shipped `admissible-order-search.ts` always applies tie-break scoring now, but round 1's original 71 finds used no tie-break at all, and round 2 was only ever validated against the residual-unsolved population, never re-confirmed against round 1's finds. Rather than fabricate provenance for unreproducible paths, only the 63 reproducible-and-revalidated solves were saved (`data/stress/hints-random/`), each independently re-checked via `validateCandidatePath` immediately before write.

**Wired into the production ladder** (`attempts.ts`'s `ADMISSIBLE_ORDER_PROFILES`, `orchestration.ts`'s new last-resort tier): a fully additive tier, mirroring the repair-fallback/attraction-diversity pattern exactly — its own dedicated budget fraction (`ADMISSIBLE_ORDER_BUDGET_FRACTION = 1.0`), run only after the main ladder, repair fallback, AND attraction-diversity pass have all already failed on every gate. Worst-case wall time is now `(1 + 6 + 1 + 1) × timeBudgetMs`; the two interactive solve UIs were switched to the `disableExtraBudgetPasses` convenience flag (rather than naming each override individually) so this and any future new pass is covered automatically.

**A real calibration bug was caught before merging, not after**: the first wiring attempt listed all 4 validated profiles (`default`, `mustCrossFirst`, `intersectionHarvest`, `nearClosureRescue`) in the production tier, sharing ONE combined budget fraction split across all 4 configs × gates. But every one of the 115 solves was validated with its OWN full, *unshared* per-profile budget (`method-probe.mjs`'s standalone `--only=ida:<one profile>` runs) — splitting 4 ways starved `default` (which alone found 103 of 115) well below its validated condition. Caught by running the real `solveLevel()` ladder (not standalone) against a mixed sample of 20 known-solvable + 20 still-unsolved corpus-2 levels: several already-validated `default`-profile solves failed to reproduce through the wired ladder. Fixed by restricting the production tier to `['default']` alone — the other 3 profiles remain available via `method-probe.mjs` for offline experimentation, pending either a proportionally larger budget fraction or per-profile sub-budgets plus the same full-ladder validation discipline before widening back.

**Re-validated after the fix**: same 40-level mixed sample through the real `solveLevel()` ladder at `timeBudgetMs: 8000` — 9/40 solved (4 via the new `admissibleOrder` tier, others via pre-existing repair/attraction-diversity coverage), **all 9 independently valid**, timing bounded (worst observed ~150s on a repair-gated level, consistent with the documented `(1+6+1+1)×` ceiling). The 4 `admissibleOrder` wins were all previously-known `default`-profile solves, correctly now reachable through the real ladder — confirming the fix, not finding anything new beyond what standalone testing already established. `solver:bench --check` remained clean throughout (160/160, no regressions) — and admissible-order-search never once fires on the published corpus (confirmed directly: 0 attempts across all 160 levels, since every published level already solves earlier in the ladder), so node/time deltas observed on published-corpus bench runs (noisy across repeated runs: -26.5%/+10.9% then -33.2%/+23.9%) are provably unrelated to this change.

## Update (2026-07-24, same day): budget-calibration fix widened to all 4 profiles, then all 52 "lost" solves recovered — 115 total, all now hintable

Two follow-ups, done in sequence. **Correction to an arithmetic error made when first reporting this
work**: the 52 recovered below are a *subset* of the master 103 from the two rounds above (confirmed
by direct diff: all 52 IDs already appear in that 103-level list), not 52 additional distinct
levels — an earlier version of this update wrongly added them as if disjoint, claiming "167 total."
The distinct-solved-level count was already 115 (103 + the 12 from the full-corpus sweep above) and
stays 115; what changed here is that all 103 (not just the 51 that reproduced with `default` alone)
now have a fresh, valid, saved hint — the saved-hint count went from 63 to 115, not the solved-level
count from 115 to 167.

**Budget calibration fixed properly, not just narrowed.** The single-profile restriction above was a stopgap. The real fix: each `ADMISSIBLE_ORDER_PROFILES` entry now runs as its own **sequential sub-pass** with its own full, unshared budget (mirroring the repair fallback loop's per-config, per-gate-division, early-exit shape — see `orchestration.ts`'s call site and `ADMISSIBLE_ORDER_BUDGET_FRACTION`'s comment), instead of one shared total split across every profile at once. This let `mustCrossFirst`/`intersectionHarvest`/`nearClosureRescue` go back into the production tier alongside `default` without starving anyone — re-verified through the real `solveLevel()` ladder: `R01129` now solves via `admissibleOrder profile=mustCrossFirst`, `R02999` via `profile=intersectionHarvest`, both previously failing under the single-profile stopgap.

**All 52 "lost" solves recovered.** Reading `admissible-order-search.ts`'s `rankByAdmissibleSlack` confirmed the hypothesis directly: it *unconditionally* computes a soft-score tie-break today, with no path back to round 1's original ties-in-candidate-order behavior. Added a `tieBreakProfile: ScoringProfile | null` mode — `null` skips the score computation entirely, leaving `Array.prototype.sort`'s stability to preserve `getNeighbors()`'s own candidate order for slack-ties, reproducing the technique's original ordering byte-for-byte. Exposed as the `'none'` sentinel in `ADMISSIBLE_ORDER_PROFILES` (`method-probe.mjs`'s `ida:none` for standalone testing) and a new `AttemptConfig.admissibleOrderNoTieBreak` flag threading it through `attempt-dispatch.ts`.

Tested via `method-probe.mjs --only=ida:none` against exactly the 52 non-reproducing IDs at the same 8000ms/20,000,000-node budget used throughout this validation: **52 of 52 solved**, all independently re-validated via `validateCandidatePath` (0 invalid). Wired into production as the tier's 2nd entry (`'default'` first — largest single contributor — then `'none'`, then the 3 lower-yield profiles), re-verified through the real ladder on a 15-level sample of the 52: **15/15 solved, all valid**, `'none'` winning 14 of them (one solved via `'default'` instead, since both were tried in the same run).

All 52 saved as hints alongside the earlier 63 (same `validateCandidatePath`-before-write discipline). `solver:bench --check` stayed clean (160/160, no regressions) throughout both changes.

**Still 115 of 1266 previously-unsolved corpus-2 levels — a 9.1% hit rate (unchanged from the total
above) — but now all 115 have a saved hint (was 63)**, and the production ladder correctly reaches
every one of them (was only 63, via `default` plus the 12 round-3-specific profiles) rather than
silently failing on the 52 that needed the no-tie-break ordering.

## Verdict

A genuinely new, previously-absent solver capability, found by asking "what if we reuse everything
already proven sound and just change ordering" rather than tuning existing mechanisms further —
validated at real scale (the full 1266-level unsolved population, not a small sample) across three
discovery rounds plus a full recovery pass, independently re-checked every time, not just trusted,
then wired into production as a fully additive last-resort tier (5 sequential sub-passes:
`default`/`none`/`mustCrossFirst`/`intersectionHarvest`/`nearClosureRescue`, each with its own
honest, independently-confirmed budget). **115 new solves, ALL backed by saved hints, clears the
"100 new solves" bar** set for this work.

## Update (2026-07-24, same day): remaining 8 PROFILE_ORDER profiles swept at full-corpus scale — diminishing returns confirmed, 2 more found

The last open lever from the verdict above: `PROFILE_ORDER` has 12 tie-break profiles total, and only
4 (`default`, `mustCrossFirst`, `intersectionHarvest`, `nearClosureRescue`) had been validated at
full-corpus scale — the other 8 (`harvestThenFinish`, `objectiveFirst`, `knotBuilder`,
`perimeterSweep`, `finishFirst`, `portalFirstTransfer`, `portalCommitted`, `closureCommitment`) had
only been sampled locally (200 levels), where they scored 0 hits. Swept all 8 against the full
1700-level corpus via the same GitHub Actions sharding (8 separate runs, 20 shards each, 160 shard
jobs total).

Raw union across all 8: 147 solved IDs. Diffing against the master 115-level list found 83
candidates not already in it — but (same trap as the earlier "167" arithmetic error, checked
carefully this time) most of those 83 are levels the full production ladder can already solve by
other means, not genuinely new. Cross-referencing against the actual `logs/stress-corpus2-
baseline.json` unsolved-1266 population found only **2 genuinely new solves: R00860 (via
`perimeterSweep`) and R02644 (found by 6 of the 8 profiles — `finishFirst`, `harvestThenFinish`,
`knotBuilder`, `perimeterSweep`, `portalCommitted`, `portalFirstTransfer` — regenerated and validated
via `perimeterSweep`)**. Both independently re-validated via `validateCandidatePath` (0 invalid) and
saved as hints.

This confirms the diminishing-returns pattern predicted by local sampling and the earlier 3-profile
round (5.6% → 2.8% → ~1.0% → now ~0.17%): the tie-break-profile search direction is close to
exhausted. **Not wired into production** — unlike the earlier profiles, a 2-solve yield doesn't
justify growing the admissible-order tier's own worst-case cost from 5x to 6x `timeBudgetMs` (see
`ADMISSIBLE_ORDER_BUDGET_FRACTION`'s comment on why each profile needs its own full sub-pass, not a
shared one). The 2 solves are preserved as hints regardless, since they're genuine, validated
capability — just not enough to earn a permanent place in the live search budget.

**Total: 117 of 1266 previously-unsolved corpus-2 levels validated across this technique's full
investigation (115 + 2), all backed by saved hints.**

## Update (2026-07-24, same day): discrepancy-limited search (LDS) tried and rejected

The last item on the open-levers list — "a discrepancy-limited probe-then-fallback structure for
latency," mirroring search.ts's `dfsFromGateLDS` — was implemented and measured, since it was the
cheapest remaining genuinely-different lever (reusing the existing sound gauntlet, just changing
exploration STRUCTURE rather than another tie-break variant). `admissible-order-search.ts` gained a
`maxDiscrepancy` parameter on the core search (identical LDS bookkeeping to `dfsFromGate`'s own) and
an `admissibleOrderSearchLDS` wrapper: cheap low-discrepancy probe waves (k∈{0,1,2,4}, capped at half
the budget or 3000ms) before an unbounded (k=∞) fallback that is byte-for-byte identical to calling
`admissibleOrderSearch` directly.

**Hypothesis going in**: the unbounded search already tries every admissibly-surviving branch given
enough budget, so LDS should not find NEW solves — its value, if any, would be reaching an
already-reachable solution in fewer nodes.

**Result: the hypothesis is refuted.** Measured against all 117 of this technique's validated
corpus-2 solves at the same 8000ms/20,000,000-node budget used throughout this investigation:
- Of the 108 levels where both the plain search and LDS solved within budget, **LDS used MORE nodes
  on every single one** (0 fewer, 108 more; total +1.5%, up to +563,500 extra nodes on one level).
- **LDS regressed 9 of the 117 into outright timeout** at the same budget the plain search solves
  them in (`R03299`, `R00059`, `R02315`, `R02889`, `R03185`, `R02623`, `R00460`, `R02644`, `R01099`)
  — confirmed via a larger budget that these aren't dead ends, just budget-starved by the probe
  phase eating into the unbounded fallback's share.

Mechanism, in hindsight: admissible-slack ordering already tends to follow the puzzle's forced
structure directly, so there's little "close-to-greedy-but-not-exactly" middle ground for low-k
probes to usefully exploit the way `dfsFromGateLDS`'s probes do against the softer heuristic score —
the probe waves are close to pure overhead here, and the k=∞ fallback then redoes the plain search's
own full work on top of that.

**Not wired into production, and not recommended for further pursuit without new evidence** (e.g. a
differently-calibrated probe ladder actually measured to help — the naive first-pass constants used
here are cleanly rejected, not an unexplored idea). Kept in the codebase as a fully opt-in,
zero-default-risk, tested negative result (`scripts/method-probe.mjs`'s `ida:<profile>(lds)`,
`AttemptConfig.admissibleOrderLds`) rather than deleted, so this doesn't have to be re-derived from
scratch.

Remaining open levers, now genuinely thin: per-profile budget tuning now that `default`'s outsized
share is correctly protected (the lower-yield profiles may not need the full
`ADMISSIBLE_ORDER_BUDGET_FRACTION` each), and which admissible bounds contribute most to the ordering
signal — the tie-break-profile axis and the LDS-structure axis have both now been tried and are not
expected to yield much more from this specific technique.
