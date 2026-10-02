# Dead-last portal tier dose-response probe result

> **Status:** concluded-negative
> **Last evidence:** 2026-10-02 — 27 unsolved portal parents of the regenerated 160-level U block, main ladder with the portal coarse-state merge on, 200M-node budget.
> **Decision:** raising the dead-last portal tier's node ceiling from 50M to 200M converts none of the 27 unsolved parents (0/27), so a dose increase is not a cold-solve lever. No ceiling change is nominated.
> **Remaining gate:** none.
> **Evidence role:** discovery.
> **Owner:** `docs/solver-optimization-workstreams.md`.

Question: is the 27-parent residual after the production ladder a dose miss (needs more nodes in the promoted dead-last portal tier) or a structural miss?

## Protocol

`scripts/stress/portal-dead-last-dose-probe.mjs`. Emulates the tier body with existing knobs: `solveLevel` with `disableExtraBudgetPasses`, `STRATEGY_PORTAL_COARSE_STATE_MERGE` on, node budget 200M (`baseWorkBudget` = 1.34x). One large-budget run gives the whole curve, since a level solved after n nodes is solved at any budget >= n. Inputs: `data/stress/portal-dead-last-dose-probe-001-unsolved-ids.txt` on `data/stress/ws1-late-continuation-single-001-regenerated-corpus.json`. Rows: `data/stress/portal-dead-last-dose-probe-001.jsonl`.

## Findings

1. **0/27 solved at 200M.** No dose-curve point exists below 200M for any parent.
2. **Most parents exhaust the ladder before the budget.** 19/27 ended `failed` at 134M-194M nodes (the main ladder ran out of strategies), and only 8/27 hit `node-budget-reached`. A larger ceiling cannot help the 19 at all; only the 8 are even potentially dose-limited, and those got 4x the production ceiling without solving.
3. Cost: roughly 5-10 minutes per level on one core at this budget.

## Limits

- The emulation was validated on one control winner only (U00064, solved at 524K nodes); it is not a bit-exact reproduction of the tier's entry-relative ceiling.
- The 8 budget-limited parents were not run beyond 200M; a 1B-node run would be needed to rule out an extreme dose miss, and the repo's R03365 note (~101M nodes) suggests such cases are rare.
- Single regenerated block of 160 levels.

## Reproduce

```bash
node --import tsx scripts/stress/portal-dead-last-dose-probe.mjs --corpus=data/stress/ws1-late-continuation-single-001-regenerated-corpus.json --ids-file=data/stress/portal-dead-last-dose-probe-001-unsolved-ids.txt --node-budget=200000000 --shard=i/4 --out=<jsonl>
```
