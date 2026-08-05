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

- **`solve-shards`**: a 20-way GitHub Actions *matrix* (not 20 separate workflow files) — each
  matrix leg solves 85 of stress-corpus-2's 1700 levels (`data/stress/stress-levels-random.json`)
  **and** ~5-6 of stress-corpus-1's 102 levels (`data/stress/stress-levels.json`), both via
  `portfolio-solve-sweep.mjs --scheduler-mode=legacy --save-hints`, in two separate steps within
  the same shard job. **Uploads its results as a workflow artifact instead of committing to a
  branch** — no git writes at all in this job (`permissions: contents: read`).
- **`combine`**: runs after `solve-shards` (`if: always()`, so a partial refresh — some shards
  timed out, say — still gets combined rather than discarded). Downloads every artifact, archives
  the *previous* refresh's live report files under a timestamped
  `logs/solver-corpus2-batches/archive/<full-timestamp>-refresh/` folder (formalizing the archiving
  that was previously done by hand — see that directory's existing entries), lays the new results
  onto a fresh `main` checkout, regenerates both baselines (`logs/stress-corpus{1,2}-baseline.json`)
  and corpus-2's dev-benchmark curation, and pushes **one commit** to `main`. This is the only job
  with `contents: write`. The archive stamp is a full date+time timestamp
  (`date -u +%Y-%m-%dT%H%M%SZ`), not just a date — a day-only stamp (the original design) collides
  when the workflow runs more than once in the same UTC day, since `git mv` refuses to overwrite an
  existing destination. This bit the 2nd run on 2026-07-18: it aborted the whole archive step
  (`set -e`) partway through, on the first `git mv` whose destination already existed from the 1st
  run's archive, skipping every downstream step (lay-down/combine/commit) for the rest of the job —
  no data was lost (the failure is before anything gets overwritten), but the refresh silently
  produced no commit. Fixed the same day.

### Sharding corpus-1 into the matrix (2026-07-23)

Corpus-1 originally got its own dedicated job (`solve-corpus1`) rather than being folded into the
20-shard matrix — see the "2026-07-18" note below for the reasoning at the time: a real speed win
over strictly-sequential corpus-1 solving, smaller diff than reshaping the matrix, and keeping
corpus-1 conceptually distinct. **That decision is reversed as of 2026-07-23.** In practice, 20
matrix legs plus one separate `solve-corpus1` job meant **21 concurrently-queued jobs**, not 20 —
and GitHub Actions' per-workflow concurrent-runner limit meant the 21st job (`solve-corpus1`) sat
queued behind the matrix instead of running alongside it, waiting for a runner slot to free up as
the 20 shards finished. Observed effect: **nearly double the total wall time** of the refresh,
since `combine` (which needs both) couldn't start until corpus-1 finally got its turn.

Fixed by folding corpus-1's 102 levels into the same 20-shard matrix used for corpus-2 — each shard
now runs two `portfolio-solve-sweep.mjs` invocations (a small corpus-1 slice, then its corpus-2
slice), so there are only ever **20 concurrently-queued jobs**, matching GitHub's per-workflow
runner allowance exactly. `logs/solver-corpus2-batches/` (kept its name — renaming would ripple
into docs/history for no functional gain) now holds both corpora's per-shard files, distinguished
by filename prefix: corpus-2's stay unprefixed (`batch-NN.json`, unchanged), corpus-1's are
`corpus1-batch-NN.json`. The `combine` job's single `--in-dir` combine pass became two explicit
`--in=<comma-list>` passes (one per corpus) since `portfolio-sweep-reports-to-benchmark.mjs`
rejects a mixed-corpus input set by design (its mismatched-corpus guard) and `--in-dir` reads every
`*.json` in a directory indiscriminately. `reports/stress/benchmark-parallel.json` (corpus-1's
combined output, feeding `compile-baseline.mjs --mode=corpus1`) keeps its existing filename/role —
only how it gets produced changed, not what consumes it.

Corpus-1's slice also gets the same 2026-07-23 batch-speed treatment as corpus-2 — but **only
`--baseline=logs/stress-corpus1-baseline.json --prime-winner`, not `--baseline-budget`**. Both were
wired in initially; `--baseline-budget` caused a real regression on this workflow's first run under
it (corpus-2 dropped 503→473 solved) and was reverted the same day — its adaptive per-level node
cap assumes a deterministic re-solve, which is false for a repair-search winner recorded without a
seed (repair tries a fresh random seed cold each time, so its node cost genuinely varies run to
run). `--prime-winner` was kept: it already self-gates away from exactly that case (no seed to
replay = no priming attempted), so it did no harm, and its only cost on a miss is one bounded extra
attempt. See `reports/2026-07-23-solver-batch-speed-and-hint-provenance.md` for the full root-cause
writeup and the fix needed before `--baseline-budget` can be re-attempted.

**Consequence, unchanged from the 2026-07-18 note below**: corpus-1 still has no
CPU-contention-free timing source from this workflow — solved/failed counts remain trustworthy,
`elapsedMs` does not (`compile-baseline.mjs` labels it `official-contended`, same as before). If a
genuinely sequential corpus-1 timing baseline is ever needed again, run `stress:benchmark
--engine=sequential` locally or in a one-off job, as described there.

**2026-07-18 (superseded by the above, kept for history):** runs `stress:benchmark --parallel=N`
(cross-level worker threads, `N` via the `corpus1_workers` input, default 2) instead of
`--engine=sequential`. The first real end-to-end run of this workflow (2026-07-18) showed corpus-1
was the slowest job by a wide margin — a strictly one-level-at-a-time sequential run of 102 levels
doesn't benefit from a multi-core runner the way corpus-2's sharded+`--workers`-parallel approach
does, so it kept the whole refresh waiting on the `combine` job long after every corpus-2 shard had
finished. This was a deliberate trade, not an oversight: `--engine=sequential` was originally
chosen specifically so corpus-1's timing stayed the one CPU-contention-free source in the whole
stress pipeline (`compile-baseline.mjs`'s `sequential-official` tag). Asked explicitly, given that
trade-off, whether to (a) fold corpus-1 into the same 20-shard matrix as corpus-2, (b) give it its
own parallel job without merging it into corpus-2's matrix, or (c) leave it sequential and accept
the wait — **(b) was chosen at the time**: real speed win, smaller diff than reshaping the
corpus-2 matrix to also carry corpus-1's levels, keeps corpus-1 solving as its own conceptually
distinct job. **(a) is what actually got built on 2026-07-23**, once the 21-job queuing cost of (b)
showed up in practice — see above.

`scripts/stress/compile-baseline.mjs` was updated 2026-07-18 to stop assuming "the official file"
means sequential/trustworthy — it now reads the run's own self-reported `engine`/`parallel` fields
and labels the compiled baseline's `officialSource.timingTrustworthy` accordingly
(`sequential-official` when genuinely sequential, `official-contended` otherwise). If a genuinely
sequential corpus-1 timing baseline is ever needed again, run
`npm run stress:benchmark -- --engine=sequential --budget-ms=20000 --out=reports/stress/benchmark-latest.json`
locally or in a one-off job — `reports/stress/benchmark-latest.json` (the last real sequential
run, from before this change) is left permanently in place as a frozen reference point, since no
future run of this workflow will ever refresh it again.

## Recovering a failed shard — re-dispatch fresh, do NOT "re-run failed jobs"

A GH-hosted runner can be reclaimed mid-shard (a "runner has received a shutdown signal" —
happened to shard 17 of the 2026-07-22 60 s/120 M run). That single shard fails, its
upload/artifact steps are skipped, and — because `combine` runs `if: always()` — the refresh still
commits the **other 19 shards'** results to `main`. That is net-additive and lossless: the failed
shard's ~85-90 levels (85 from corpus-2, plus its ~5-6 from corpus-1 since 2026-07-23) simply keep
whatever they had on `main` before this run.

To recover the missing shard, **dispatch a fresh full workflow run** — do **not** use GitHub's
"Re-run failed jobs". Re-running failed jobs fails at `combine`'s *"Download every shard's
artifact"* step: `actions/download-artifact@v4`, in a re-run attempt, can only see artifacts
uploaded **in that same attempt**, so the re-run's `combine` sees only the one re-run shard's
artifact (not the 19 successful shards from the first attempt) and cannot reassemble — it errors
and commits nothing. (Confirmed: the 2026-07-22 shard-17 re-run died exactly there.) A fresh
dispatch has no such split-attempt problem — every shard uploads in one attempt, `combine`
downloads them all, and because the hand-off lays results onto a fresh `main` checkout that already
carries the earlier run's committed shards, re-solving the whole range only ever *adds* to `main`,
never regresses it. The cost is re-solving all 20 shards (both corpora's slices); there is
currently no cheap single-shard-subset dispatch (a `shards` input + dynamic matrix would add one,
if the per-shard re-solve cost ever justifies it).

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

- `corpus2_budget_ms` (default `86400000`, deliberately non-binding), `corpus2_node_budget`
  (default `36000000`), `corpus2_workers` (default `2`) — same meaning as the old scheme's
  equivalent inputs. Raised 2026-08-05 from the original `8000`/`20000000`: the 8s deadline was
  measured (deterministically, `reports/2026-08-01-budget-vs-algorithm.md`) to be costing ~32
  corpus-2 solves for free, and 20M -> 36M nodes worth a further ~25 — see the workflow file's own
  2026-08-05 comment for the numbers. The real per-level ceiling is now `corpus2_node_budget`; the
  shard-level `timeout` wrapper around the sweep command is the outer safety net against a runaway
  level.
- `enable_flags` (default blank) — comma-separated ablation flags to turn ON via
  `portfolio-solve-sweep --enable-flags`, applied to **both** corpora's sweep (renamed 2026-07-23
  from `corpus2_enable_flags`, which only reached corpus-2's sweep — now that corpus-1 shares the
  same shard job and tool, there's no reason for the toggle to be corpus-2-only).
- `corpus1_budget_ms` (default `20000`) — matches the historical corpus-1 baseline's own budget.
- `corpus1_workers` (default `2`) — cross-level worker *processes* for `portfolio-solve-sweep`'s
  `--workers` on corpus-1's slice (same mechanism as `corpus2_workers`; renamed meaning 2026-07-23 —
  corpus-1 no longer runs `stress:benchmark --parallel`, see the sharding section above). Each
  shard only carries ~5-6 corpus-1 levels, so this rarely matters in practice.

## Migration note

**Done, 2026-07-17.** The in-flight refresh running when this workflow was added has finished and
its results (302/1700 corpus-2, 94/102 corpus-1) are combined into `main`. The old
`solver-corpus2-batch-*.yml` files and `scripts/generate-corpus2-batch-workflows.mjs` are deleted;
their `stress-corpus2-batch-NN` branches couldn't be deleted with this session's GitHub
credentials, so they were force-reset to `main`'s tip instead (inert orphaned refs). This is now
the only solver-stress-refresh mechanism.
