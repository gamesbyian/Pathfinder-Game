# Worker-count solve-outcome sensitivity under a nominally canonical work budget (2026-08-12)

**RESOLVED (partially) by
[`2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`](2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md)'s
"Corpus-scale directionality, resolved" section**: Evidence 2 below (the 617/1700 vs. 665/1700
corpus-scale gap) was NOT a worker-count effect — it was an ablation-flag confound
(`PRUNE_MC_NEIGHBOR_BUDGET`'s incomplete promotion; one run explicitly passed
`--enable-flags=PRUNE_MC_NEIGHBOR_BUDGET`, the other left it blank on the reasonable-but-wrong
assumption that the flag's registry-only "promotion" already meant it defaulted on — see that
report for the exact job-log trace). A separate, genuine worker-count/contention bug (`runRepairProbe`'s
wall-clock trip-wire) was found and fixed in the same follow-up. Evidence 1 (R02823's single-level
non-reproducibility) remains unresolved. Kept below in its original form as the source evidence;
read the follow-up report for the current disposition.

**Status: open investigation, evidence gathered, root cause NOT identified.** This report exists
to hand off a real, reproduced finding without pretending it's more resolved than it is.

## The claim being contradicted

`docs/solver-budget-determinism.md` documents the solver's canonical WORK-budget model
(`modules/solver/work-meter.ts`) as host/load-independent by design: a fixed price per metered
operation, counted rather than timed, so a run pinned to a WORK budget with a non-binding wall
deadline should produce the *same* solved set regardless of the host's speed or load. This report
documents two pieces of evidence that this does not fully hold in practice, at two very different
scales.

## Evidence 1: a single level, three local runs, two different outcomes

During the `PRUNE_MC_NEIGHBOR_BUDGET` five-loss diagnosis
(`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`), level `R02823` (corpus-2) was
re-solved locally three times, identical code/config/level, `--node-budget=36000000
--work-budget=48240000 --budget-ms=86400000` (non-binding):

| run shape | result |
|---|---|
| `--workers=4`, 4 sibling levels solving concurrently | unsolved, node-budget-reached (~36,000,200 nodes) |
| `--workers=1`, sequential batch of 5 levels (no sibling contention) | unsolved, node-budget-reached (~36,000,222 nodes) |
| `--workers=2`, this level run completely alone, nothing else active | **solved**, `dfs:repair:repair(mustTurnBiased)`, 9,308,917 nodes — well under the cap |

The real GitHub Actions control run for the neighbor-budget A/B (workers=2, full 85-level shard)
also solved this level cleanly. So the pattern is: solved when run in isolation or as part of a
real production-shaped batch, unsolved in two different local single-machine reproduction attempts
with more levels queued behind/around it in the same process lineage.

## Evidence 2: a full 1700-level corpus, same code and flags, workers=1 vs workers=2

The `STRATEGY_MAIN_LOOP_LATE_RESERVE` frozen population A/B's control arm (run `#34`, id
`31555042628`, `.github/workflows/solver-stress-refresh.yml`, `corpus2_workers=1`,
`corpus1_workers=1`, `deterministic=true`, commit `b925d3f35e794f18a3f4ab2616ae9ac1cd875a62`) has
no ablation flags enabled — meaning its effective solver configuration is identical to the
2026-08-11 revised neighbor-budget A/B's *treatment* arm (`PRUNE_MC_NEIGHBOR_BUDGET` is default-on
as of this commit; that A/B explicitly enabled it and no other flag differs), which ran with
`corpus2_workers=2` / `corpus1_workers=2`.

| run | workers | corpus-1 | corpus-2 |
|---|---:|---:|---:|
| 2026-08-11 A/B treatment (run #33, id `31537474435`, commit `c86ba8f86`) | 2 | 94/102 | 665/1700 |
| 2026-08-12 late-reserve control (run #34, id `31555042628`, commit `b925d3f35e794f18a3f4ab2616ae9ac1cd875a62`) | 1 | 91/102 | 617/1700 |

**A 48-level (2.8%) gap on corpus-2 and a 3-level gap on corpus-1**, with the same effective
solver flags and no meaningful solver-code difference between the two commits (`git log --oneline
c86ba8f86..b925d3f35e -- modules/solver/` shows only test-file and doc changes plus this session's
own already-diagnosed neighbor-budget fix/promotion, nothing else touches production solver code).
This is not a single fragile level anymore — it's a corpus-wide, directionally consistent effect:
**fewer workers solved fewer levels**, at a scale far outside CLAUDE.md's documented "±5 is noise"
floor for the old non-deterministic workflow (this is the new, supposedly-deterministic workflow).

## What this does NOT invalidate

Both the neighbor-budget promotion and the currently-running late-reserve A/B remain valid on their
own terms: the neighbor-budget A/B's own internal control-vs-treatment comparison used the same
workers count in both arms, and the late-reserve A/B's four arms (control + three reserve
fractions) all consistently use `workers=1` per its frozen protocol. The concern here is narrower
but still real: **any comparison across two runs that used a different worker count is not
apples-to-apples**, and the absolute solved-count level achieved by any past or future run depends
on a parameter (`--workers`) that the whole canonical-work-budget design was supposed to make
irrelevant.

## What has been ruled out or weakened

- **Solver production code drift between the compared commits**: ruled out (see above).
- **A wrapper-level wall-clock timeout silently truncating a shard**: `solver-stress-refresh.yml`
  wraps each shard's corpus-2 sweep in `timeout -k 30s --preserve-status 300m` (45m for corpus-1).
  If this fired mid-shard, the affected shard's output file would hold fewer rows than its expected
  range, and the workflow's own "Verify complete coverage" step (`.github/workflows/solver-stress-
  refresh.yml`, checks `rows.length !== total` against the full 1700/102 combined report) would
  have caught it and set `complete=false`, blocking the run. The 2026-08-12 control run's combine
  step reported exactly `1700/1700` / `102/102` covered, so this specific mechanism does not appear
  to explain **this** shortfall — though it hasn't been checked whether any shard came close to
  the 300m/45m ceiling under `workers=1` (worth confirming: a shard that barely finishes in time is
  still a fragility worth knowing about, distinct from the actual solved-count gap).

## What has NOT been checked (candidate next steps for investigation)

1. **Per-shard wall-clock margin.** Pull each corpus-2 shard's actual elapsed time from the
   `workers=1` control run's job logs and compare against the 300-minute wrapper ceiling. A shard
   that finished at, say, 295 minutes would still pass the coverage check but would be a real
   warning sign distinct from the corpus-wide solved-count gap itself.
2. **Persistent worker-process state leakage.** `scripts/solver-worker-pool.mjs` forks each worker
   process **once** and dispatches many tasks to it over its lifetime via IPC (`worker.send({type:
   'task', ...})`) — it does not spawn a fresh process per level. Under `workers=1`, every level in
   an 85-level shard solves sequentially inside the *same* long-lived V8 isolate; under `workers=2`,
   each of two processes handles roughly half as many. If any module-level mutable state (a cache,
   a memoized table, a reused typed-array scratch buffer) persists across solves within one worker
   process in a way that isn't fully reset between levels, a level's outcome could depend on how
   many — and which — other levels solved in the same process before it, which is exactly the kind
   of effect that would correlate with worker count without needing any wall-clock involvement at
   all. This codebase has a documented precedent for exactly this class of bug: a per-call-allocated
   typed-array scratch buffer that was mistakenly reused across calls in `topology.ts`'s
   flipper-aware connectivity work, which caused a real regression (referenced in `repair-search.ts`'s
   own comments and `data/stress/README.md`). This is the strongest structural hypothesis and has
   not yet been tested.
3. **A hidden wall-clock-gated decision inside the "canonical" search path.** A targeted audit for
   any `Date.now()`/`performance.now()` call whose result feeds a *decision* (not just a reported
   `elapsedMs` field) somewhere in the main solve loop, repair search, or beam search — something
   that's supposed to be purely node/work-count-gated but isn't. `docs/solver-budget-determinism.md`
   already documents that the wall-clock deadline is the one known source of past non-determinism
   (`reports/2026-07-31-refresh-nondeterminism.md`); this would be looking for a *different*,
   not-yet-found instance of the same class of bug, one that isn't neutralized by setting
   `deterministic=true` / a 24h non-binding deadline.
4. **A controlled, isolated local reproduction** designed specifically to distinguish hypotheses 2
   and 3 without needing a full GitHub Actions run: solve a small set of individually-known-fragile
   levels (e.g. `R02823`) completely alone, then again as the *last* level in an artificially long
   single-`workers=1`-process sequential batch of otherwise-irrelevant filler levels, and compare.
   If the outcome flips based on queue position/predecessor count alone (with wall-clock elapsed
   time for the whole batch kept far under any timeout), that isolates hypothesis 2. If it doesn't,
   that's evidence pointing back toward hypothesis 3 or something not yet considered.

## Why this matters beyond the two experiments that surfaced it

Every solved-count figure quoted anywhere in this codebase's solver research — historical and
future — implicitly assumes worker count doesn't matter once the wall deadline is non-binding and a
canonical work/node budget is pinned. That assumption is demonstrably false at least for these two
data points. Any future comparison between two runs (or a run and a stored baseline) should record
and match worker count as carefully as it already records and matches solver commit, flags, and
work/node budget — and any existing report that doesn't record worker count should be treated as
having one more unverified assumption than previously believed.
