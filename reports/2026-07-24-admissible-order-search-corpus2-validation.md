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

## Verdict

A genuinely new, previously-absent solver capability, found by asking "what if we reuse everything
already proven sound and just change ordering" rather than tuning existing mechanisms further —
validated at real scale (the full 1266-level unsolved population, not a small sample) in two rounds,
independently re-checked both times, not just trusted. **103 new solves clears the "100 new solves"
bar** set for this work. Remaining open levers, in case further gains are wanted: wiring into the
full ladder (may recover additional levels currently reached only via a combination this method's
isolation testing couldn't see), further tuning (which admissible bounds contribute, a
discrepancy-limited probe-then-fallback structure for latency), and deciding the hint-provenance
question (`solver.technique` needs a new value to tell this method's finds apart from
`dfs`/`beam`/`repair` if the 103 solutions are stored as hints).
