# Retired Corpus-2 batch workflows

**Status: retired 2026-07-17.** The 20 persistent-branch `solver-corpus2-batch-*.yml` workflows and their generator were removed. Use [`solver-stress-refresh.yml`](solver-stress-refresh.yml) and [`solver-stress-refresh.md`](solver-stress-refresh.md) for current population refreshes.

This file remains only so old links resolve and the failure modes of the retired design stay visible.

## Historical results and incidents

- First complete run, 2026-07-16: **236/1700** Corpus-2 levels solved. PR #1230 combined the 20 branches.
- First 2026-07-17 re-run initially did no new solving because each persistent branch retained its old `--resume` checkpoint. After archiving stale checkpoints and rerunning, the result was **237/1700**. Full investigation: [`../../reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md`](../../reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md).
- A later 2026-07-17 run reported **286/1700** but is **invalid**: existing batch branches caused the workflow to execute stale pre-fix solver code rather than current `main`. Do not use this count. Full diagnosis: [`../../reports/2026-07-17-corpus2-refresh-ran-stale-code-correction.md`](../../reports/2026-07-17-corpus2-refresh-ran-stale-code-correction.md).
- After force-resetting all batch branches to current `main`, the genuine run produced **295/1700**. Combining also exposed a second stale-ref risk: locally cached batch refs could point to an earlier run unless explicitly fetched immediately before merge.

These incidents established the requirements now embodied by the replacement workflow: immutable run SHA, no persistent per-shard branches, current-run-only artifacts, complete-coverage checks, and incremental result persistence.

## Retired design

The old system split Corpus 2 into 20 independent 85-level jobs. Each job ran `portfolio-solve-sweep.mjs --scheduler-mode=legacy --save-hints`, checkpointed incrementally, and committed results/hints to a dedicated `stress-corpus2-batch-NN` branch for later merge.

That design avoided concurrent pushes to one branch but made branch history and checkpoint state part of execution. The resulting stale-code/stale-checkpoint hazards were the reason it was replaced.

The persistent batch branches were force-reset to `main` when the workflows were retired and are inert historical refs.
