# Solver stress-corpus refresh workflow

**Status: replaces the old 20-branch `solver-corpus2-batch-*.yml` scheme** (see
[`README-solver-corpus2-batches.md`](README-solver-corpus2-batches.md) for that design's full
history — kept for the record, not deleted, since it documents two real stale-code incidents
worth remembering). That scheme's 20 persistent `stress-corpus2-batch-NN` branches turned out to
be a real, recurring source of confusion: the branches only ever advanced when a batch job
happened to push to them, so a branch left over from a prior refresh silently made the *next*
refresh run stale solver code twice (2026-07-16 and 2026-07-17 — see that README's "Track record"
section). The branches also existed purely to survive `--resume --checkpoint=...` across separate
workflow runs, a feature this workflow deliberately drops: every trigger is on-demand
(`workflow_dispatch` only, never on push), so there is no "background job that might get killed
and need resuming later" scenario to design for — every run just re-solves its whole range fresh.

## What this is

One workflow, `solver-stress-refresh.yml`, that solves **both** stress corpora in a single
`workflow_dispatch` and commits **one** combined result directly to `main`:

- **`solve-corpus2`**: a 20-way GitHub Actions *matrix* (not 20 separate workflow files) — each
  matrix leg solves 85 of stress-corpus-2's 1700 levels (`data/stress/stress-levels-random.json`)
  via `portfolio-solve-sweep.mjs --scheduler-mode=legacy --save-hints`, same as before, but
  **uploads its results as a workflow artifact instead of committing to a branch**. No git writes
  at all in this job — `permissions: contents: read`.
- **`solve-corpus1`**: one job, stress-corpus-1 (`data/stress/stress-levels.json`, 102 levels) —
  small enough that it never needed sharding. This directly closes the gap where corpus-2 got
  refreshed repeatedly through 2026-07-16/17 while corpus-1's baseline sat stale at 2026-07-12 —
  every future stress refresh now touches both corpora by construction, not by remembering to run
  a second command.

  **Changed 2026-07-18: runs `stress:benchmark --parallel=N` (cross-level worker threads, `N` via
  the `corpus1_workers` input, default 2) instead of `--engine=sequential`.** The first real
  end-to-end run of this workflow (2026-07-18) showed corpus-1 was the slowest job by a wide
  margin — a strictly one-level-at-a-time sequential run of 102 levels doesn't benefit from a
  multi-core runner the way corpus-2's sharded+`--workers`-parallel approach does, so it kept the
  whole refresh waiting on the `combine` job long after every corpus-2 shard had finished. This
  was a deliberate trade, not an oversight: `--engine=sequential` was originally chosen
  specifically so corpus-1's timing stayed the one CPU-contention-free source in the whole stress
  pipeline (`compile-baseline.mjs`'s `sequential-official` tag). Asked explicitly, given that
  trade-off, whether to (a) fold corpus-1 into the same 20-shard matrix as corpus-2, (b) give it
  its own parallel job without merging it into corpus-2's matrix, or (c) leave it sequential and
  accept the wait — **(b) was chosen**: real speed win, smaller diff than reshaping the corpus-2
  matrix to also carry corpus-1's levels, keeps corpus-1 solving as its own conceptually distinct
  job.

  **Consequence**: corpus-1 no longer has a CPU-contention-free timing source from this workflow.
  `scripts/stress/compile-baseline.mjs` was updated the same day to stop assuming "the official
  file" means sequential/trustworthy — it now reads the run's own self-reported `engine`/
  `parallel` fields and labels the compiled baseline's `officialSource.timingTrustworthy`
  accordingly (`sequential-official` when genuinely sequential, `official-contended` otherwise).
  Solved/failed counts remain trustworthy either way; `elapsedMs` does not. If a genuinely
  sequential corpus-1 timing baseline is ever needed again, run
  `npm run stress:benchmark -- --engine=sequential --budget-ms=20000 --out=reports/stress/benchmark-latest.json`
  locally or in a one-off job — `reports/stress/benchmark-latest.json` (the last real sequential
  run, from before this change) is left permanently in place as a frozen reference point, since no
  future run of this workflow will ever refresh it again.
- **`combine`**: runs after both of the above (`if: always()`, so a partial refresh — some shards
  timed out, say — still gets combined rather than discarded). Downloads every artifact, archives
  the *previous* refresh's live report files under a timestamped
  `logs/solver-corpus2-batches/archive/<date>-refresh/` folder (formalizing the archiving that was
  previously done by hand — see that directory's existing entries), lays the new results onto a
  fresh `main` checkout, regenerates both baselines
  (`logs/stress-corpus{1,2}-baseline.json`) and corpus-2's dev-benchmark curation, and pushes
  **one commit** to `main`. This is the only job with `contents: write`.

## Why this is simpler than the branch scheme

- **Nothing to reset before a run.** The old scheme required verifying all 20 branches were reset
  to `main`'s tip (and their stale checkpoint files removed) before every refresh — a real,
  easy-to-get-wrong manual checklist (see the old README's "After you're done" section). This
  scheme has no persistent branches at all, so there is nothing to check or reset: every trigger
  starts from `main`'s current tip, unconditionally, every time.
- **Nothing to clean up after a run.** The old scheme required deleting/resetting 20 branches
  after every combine, or the *next* refresh would silently inherit stale code. This scheme's
  `combine` job leaves `main` as the only place results live — the next trigger is automatically
  starting clean.
- **One artifact-based hand-off instead of 20 branch pushes + a manual multi-branch git-merge.**
  The old scheme's combine step was a multi-command manual git-merge across 20 branches (see the
  old README — it hit real rename-detection conflicts and stale-ref bugs doing this by hand
  twice). This scheme's combine is one job, downloading artifacts and committing once.
- **No `--resume`/checkpoint state.** Dropped entirely, per the reasoning above — simpler
  semantics (every run is a full fresh solve of its range) at the cost of not being able to
  incrementally resume a killed run without re-solving already-done levels. Given `portfolio-
  solve-sweep.mjs` already writes `--out`/`--summary-out` after every level (not just at the end),
  a shard that gets killed mid-run still uploads whatever it found before the kill — it just
  starts over from the top on its *next* trigger rather than picking up where it left off. This
  matches how the workflow is actually used (occasional, deliberate, on-demand refreshes, not a
  long-running background job).

## Historical data

Nothing is lost:
- Every commit to `main` is permanent, diffable, ordinary git history — `git log -- logs/
  solver-corpus2-batches/` shows every past refresh's results the same way it always has.
- The `combine` job additionally auto-archives the previous refresh's live report files into a
  timestamped folder before overwriting them (the same `logs/solver-corpus2-batches/archive/`
  convention this repo already uses, previously done manually) — so a browsable snapshot of every
  past refresh survives at a stable path without needing to check out old commits.

## Trigger

Manual only (`workflow_dispatch`) — GitHub UI (Actions tab → "Solver stress-corpus refresh" →
"Run workflow") or `gh workflow run solver-stress-refresh.yml`. Inputs (all optional):

- `corpus2_budget_ms` (default `8000`), `corpus2_node_budget` (default `20000000`),
  `corpus2_workers` (default `2`) — same meaning as the old scheme's equivalent inputs.
- `corpus1_budget_ms` (default `20000`) — matches the historical corpus-1 baseline's own budget.
- `corpus1_workers` (default `2`) — cross-level worker threads for corpus-1's `--parallel` run
  (see the 2026-07-18 note above). Don't set this to `1`: `stress:benchmark` only treats
  `--parallel` as active when the value is `> 1` — at `1` it silently falls back to raced-engine
  default behavior instead of genuine cross-level parallelism, so you'd get raced-engine timing
  with none of the speed benefit `--parallel` is for. The job's explicit `--out=` keeps this from
  touching `benchmark-latest.json` (the frozen last-genuinely-sequential reference file, described
  above) either way, and `compile-baseline.mjs`'s engine/parallel-field check would still label a
  `--parallel=1` result correctly as untrustworthy-timing — there's just no reason to pass a value
  that gives up the speed win without gaining anything back. Use `2`+, or run a genuinely
  sequential local/one-off job if trustworthy timing is what you actually want.

## Migration note

**Done, 2026-07-17.** The in-flight refresh running when this workflow was added has finished and
its results (302/1700 corpus-2, 94/102 corpus-1) are combined into `main`. The old
`solver-corpus2-batch-*.yml` files and `scripts/generate-corpus2-batch-workflows.mjs` are deleted;
their `stress-corpus2-batch-NN` branches couldn't be deleted with this session's GitHub
credentials, so they were force-reset to `main`'s tip instead (inert orphaned refs). This is now
the only solver-stress-refresh mechanism.
