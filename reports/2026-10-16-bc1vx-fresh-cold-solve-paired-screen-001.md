# BC1-VX fresh cold-solve paired screen 001

> **Status:** active; no result or new cold solve claimed until the workflow completes and the paired rows are independently checked.
> **Workstream:** WS2-CUT-BALANCE-PROJECTION / 2X. Production default remains OFF.
> **Authority:** [solver workstreams](../docs/solver-optimization-workstreams.md) and [BC1-VX result](2026-10-02-bc1-volume-consequence-result-001.md).
> **Evidence role:** development. Existing Corpus 2 is repeatedly mined, so this cannot be called untouched independent confirmation.
> **Purpose:** find *additional* genuinely cold production-ladder gains not among the random-300 already evaluated, without using known winners, hints, or identity during solving.

## Frozen selection and contract

Use `data/stress/stress-levels-random.json` (Corpus 2), excluding **all IDs** in `data/stress/bc1-prune-ab-001-ids.txt` (the prior representative random-300).

Before running either arm, rank the remaining rows by ascending SHA-256 of `pathfinder-bc1vx-fresh-cold-20261016-001|<id>`; break hash ties by ID; select the first **64**. Shard by rank position modulo **16**. This is mechanically deterministic and independent of both arms' outcomes, and prevents overlap with the seven gains already counted. Each shard must persist its exact selected IDs and corpus positions before execution.

Run **both arms** on the same four selected rows per shard under the ordinary production scheduler, the same fixed `--node-budget=50000000 --work-budget=67000000 --budget-ms=86400000` envelope, with `strictTotalWorkBudget=false` (the existing additive retry contract), each using the canonical level-blind, mechanics-only `scripts/level-blind-capability-sweep.mjs`.

- Control: current production default flags.
- Treatment: exactly `--enable-flags=STRATEGY_BC1_VERTEX_VOLUME_PRUNE`.
- Require matching corpus SHA, sample SHA, requested IDs, solver mode, budgets and completeness. Compare effective configurations for the intended flag-only difference. Refuse to count missing/timeout/unsupported as unsolved.
- Require `refereeValid === true` for every claimed solve; a treatment-only success is a *candidate new cold solve* only if the control definitively failed under the same envelope.
- Record gains, losses, paired solved counts and total canonical `workSpent` for **all 64**, plus per-level artifacts. Never mine treatment outcomes for a retrospective confirmation claim.

## Execution

An explicitly branch-scoped, one-shot push workflow, `.github/workflows/bc1vx-fresh-cold-screen-20261016.yml`, owns 16 independent paired shards. It uploads the exact rows and a per-shard integrity/verdict JSON artifact. Do not allow a passing workflow to promote the experimental flag: **the already-prespecified solved-control regression gate remains separate and outstanding**.

After inspection, fold a verified result into the existing BC1-VX report and canonical workstream state; do not turn exploratory gains into independent confirmation. The workflow can be removed when its evidence has been captured (Git preserves it). 

## Dispatch/recovery ledger

- Initial workflow run [38976563995](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38976563995), source `b0eff28cbd6d3a9fed639f1e1bef1333ee692632`, is **instrument-invalid, zero solver results**. Deterministic disjoint selection succeeded; the CLI refused a comma-separated position selector whose later tokens omitted the required `pos:` prefix. Do not count any row from this run.
- Corrected workflow run [38976765549](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38976765549), source `49504b1773cf59498259031143a795adf7f2486e`, uses an explicit `pos:` prefix per selected position; same salt, cohort, budgets, flags and validation. Its result is pending.
