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
  small enough that it never needed sharding. Runs `stress:benchmark --engine=sequential` (not
  raced) so its timing stays trustworthy for `compile-baseline.mjs`'s "sequential-official"
  source, matching how the existing corpus-1 baseline was produced. This directly closes the gap
  where corpus-2 got refreshed repeatedly through 2026-07-16/17 while corpus-1's baseline sat
  stale at 2026-07-12 — every future stress refresh now touches both corpora by construction, not
  by remembering to run a second command.
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

## Migration note

**Done, 2026-07-17.** The in-flight refresh running when this workflow was added has finished and
its results (302/1700 corpus-2, 94/102 corpus-1) are combined into `main`. The old
`solver-corpus2-batch-*.yml` files and `scripts/generate-corpus2-batch-workflows.mjs` are deleted;
their `stress-corpus2-batch-NN` branches couldn't be deleted with this session's GitHub
credentials, so they were force-reset to `main`'s tip instead (inert orphaned refs). This is now
the only solver-stress-refresh mechanism.
