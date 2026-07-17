# Correction: the "286/1700" corpus-2 refresh never actually ran the repair-probe fixes (2026-07-17)

## What was claimed, and why it was wrong

Earlier today, PR #1237 (two repair-probe budget bugfixes + `node_budget` 8M→20M) was merged,
followed by triggering all 20 `solver-corpus2-batch-*.yml` workflows and combining the result
into PR #1239, reported as **286/1700 solved, up from 236/1700 — attributed to the repair-probe
fixes**. This number, and its causal attribution to the fixes, is **wrong**. The batches never
actually ran the fixed solver code.

## Root cause

The 20 `stress-corpus2-batch-NN` branches from the *prior* (2026-07-16) refresh still existed —
branch deletion isn't available in this session's GitHub credentials (confirmed via a real 403;
see PR #1237's own description). The batch workflow's checkout logic:

```sh
if git ls-remote --exit-code --heads origin ${branch} >/dev/null 2>&1; then
  git checkout -B ${branch} origin/${branch}   # <- this path, since the branch existed
else
  git checkout -B ${branch} origin/main
fi
```

Earlier today's fix for the "stale checkpoint causes `--resume` to skip everything" problem
(documented in PR #1237) archived the checkpoint *data* on each of the 20 batch branches
directly — but never merged `main` (carrying the actual repair-probe fixes) into those branches.
When the 20 workflows were triggered with `ref: main`, GitHub Actions resolved the *workflow
definition* (hence the `node_budget=20000000` default correctly appearing in each batch's
recorded summary) from `main`, but each job's own checkout step continued from the **existing,
still-pre-fix branch** — so the actual solver source code executed (`orchestration.ts`,
`repair-search.ts`) was the *2026-07-16* version, entirely missing commits `590aadc`
(`repairBudgetFractionOverride` probe-skip fix) and `86efc75` (probe external-`nodeBudget` cap
fix).

**Confirmed directly**: `git merge-base --is-ancestor 590aadc origin/stress-corpus2-batch-04`
(and 4 other sampled batches) returned false — the fix commit was not an ancestor of any sampled
batch branch at the time of the "fresh" run. Also confirmed: `R01698`'s recorded result in the
supposedly-fresh `batch-04.checkpoint.jsonl` is **byte-identical** to its entry in the
*archived* pre-refresh checkpoint (`status: node-budget-reached`, `totalMs: 50636`,
`nodesExpanded: 20000002`, `attemptCount: 7`, matching exactly) — the "fresh" run reproduced the
old run's result deterministically, because it was running the same code with the same seeded
PRNG.

## How this was caught

Investigating a promising-looking lead (many near-miss levels showing `attemptCount: 3`,
`nodesExpanded` landing just above exactly 10,000,000 — the repair probe's own total worst case
— with `status: node-budget-reached` despite a 20,000,000 external ceiling) led to reproducing
`R01698` directly via `Solver.solve()` with the exact same `timeBudgetMs`/`nodeBudget`: the
direct reproduction ran the **full** flow (probe → main-loop DFS/beam attempts →
repair fallback, 6-7 attempts, ~29-74s, ~20-21M nodes) — nothing like the truncated 3-attempt/
25s/10M-node result in the committed data. Reproducing via the actual `portfolio-solve-sweep.mjs`
tool (not a simplified script) at `--workers=1` and `--workers=2` also produced the full,
untruncated flow. The only remaining variable was the branch-vs-main code version, confirmed by
the `merge-base --is-ancestor` check above.

## Fix applied

For each of the 20 `stress-corpus2-batch-NN` branches: reset to `origin/main`'s tip (bringing in
every fix merged there, including today's repair-probe fixes) via `git push --force`, with a
fresh commit archiving that batch's now-known-invalid 2026-07-17 checkpoint/report files
(`logs/solver-corpus2-batches/archive/2026-07-17-invalid-stale-code-refresh/`) so the next
`--resume` run is both code-correct and checkpoint-fresh. Force-push (not merge) was used
deliberately: these are ephemeral, disposable automation branches by design (the corpus2-batch
README's own "After you're done" section says to delete them once finished), so resetting to
main's tip is simpler and safer than reconciling a merge, and avoids re-triggering the exact
git-rename-detection false-conflict issue documented in
[`reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md`](../reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md)'s
unrelated context and the corpus2-batch README's "Second run" note.

All 20 workflows re-triggered against the now-corrected branches. See the follow-up commit/PR
for the genuine result once this run completes.

## What needs correcting (tracked here, applied once the genuine numbers are in)

- `docs/solver-development-roadmap.md`'s "Where things stand" table (286/1700 claim)
- `data/stress/README.md`'s corpus-2 baseline artifact description
- `.github/workflows/README-solver-corpus2-batches.md`'s "Second run, 2026-07-17" track record
- `logs/stress-corpus2-baseline.json` / `reports/stress/dev-benchmark-corpus2.json` (need
  regenerating from the genuine run, not the stale-code one)
- Every report and roadmap passage from earlier today that cited "286/1700... post repair-probe
  budget fixes" as a verified, code-correct result

**Important clarification**: none of this affects the diagnostic *research* findings from later
in the day (the turn-landmark archetype work, the transposition-table investigation, the
repair-search stagnation diagnosis) — those were all run via direct `Solver.solve()`/
`runAttemptSearch()` calls against the current working tree, not against the stale batch
branches, and are unaffected by this bug. Only the corpus-2 *headline solved-count number* and
its causal attribution to the repair-probe fixes are wrong and need correcting.

## Verification

Root cause confirmed directly (`git merge-base --is-ancestor`, byte-identical stale-vs-current
checkpoint comparison, live reproduction via both a standalone script and the actual
`portfolio-solve-sweep.mjs` tool at both `--workers=1` and `--workers=2`). Fix applied and
verified (`git merge-base --is-ancestor 590aadc origin/stress-corpus2-batch-04` now returns
true, sampled across the fix). Fresh workflow runs triggered and confirmed `in_progress` for all
20 batches immediately after triggering.
