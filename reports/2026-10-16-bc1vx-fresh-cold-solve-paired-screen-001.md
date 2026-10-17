# BC1-VX fresh cold-solve paired screen 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-16 — complete [64-level paired GHA run 38976765549](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38976765549): control 49/64 versus BC1-VX 51/64; +2 referee-valid cold solves / 0 losses; canonical work 9,193,084,933 → 9,084,075,977 (−1.19%).
> **Decision:** BC1-VX adds disjoint level-blind production-ladder solves R01765 and R02951, with no lost levels in this development sample; prior 300-level +7/−0 result remains distinct. Flag stays production default-OFF.
> **Remaining gate:** prespecified solved-control regression suite at the same production envelope, including per-level work and loss audit, before any default-ON promotion.
> **Research question:** `WS2-CUT-BALANCE-PROJECTION`
> **Evidence role:** discovery
> **Selection:** SHA256-frozen outcome-independent 64 IDs, disjoint from all 300 of the prior representative set; repeatedly mined Corpus 2 is development evidence.
> **Population identity:** GHA run 38976765549, source SHA 49504b1773cf59498259031143a795adf7f2486e, corpus SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.
> **Inference scope:** exact 64-row sample, not untouched population confirmation, a production promotion, or a guarantee of monotonic per-level work.


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

## Decision-bearing completed verdict (2026-10-16)

Every one of the 16 independent paired shards completed and validated all four levels, yielding 64/64 unique paired rows, no missing or referee-invalid results, identical effective requests except the intended BC1-VX boolean, and the same node/work envelope. The permanent [machine verdict and both winning paths](stress/bc1vx-fresh-paired-screen-20261016-001.json) preserve the aggregate and full row list independently of GitHub Actions artifact expiration.

| Metric | Control | BC1-VX treatment |
|---|---:|---:|
| Referee-valid solves | 49/64 | **51/64** |
| Total canonical workSpent | 9,193,084,933 | **9,084,075,977** |
| Treatment-only successes | 0 | **2** |
| Treatment-only losses | — | **0** |

- **R02951:** control node-budget-reached after 270,120,973 work; treatment referee-valid solve after 233,703,361 work (117 packed path steps; source shard 5).
- **R01765:** control node-budget-reached after 331,475,570 work; treatment referee-valid solve after 308,436,094 work (94 packed path steps; source shard 15).

Net canonical work was **1.19% lower** across all 64, but some shared successes (e.g. R03342) became more expensive. The solved-set and aggregate-work wins are real for this cohort; a per-level monotonic work property was neither proved nor expected.

This fresh screen excludes all IDs from the earlier 300-row representative A/B. The two extra successes are new relative to those seven gains. The sample is still within the heavily investigated Corpus 2 and is labelled development evidence, not independent confirmation or an estimated worldwide gain rate.

The first run 38976563995 is **instrument-invalid**, failed on missing explicit per-position prefixes before any solver ran; only corrected run [38976765549](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38976765549) contributes outcome evidence. Its sixteen shard artifacts include raw arm outputs with complete paths and attempt histories and an outcome-blind manifest. All shard verdicts are captured in [machine evidence](stress/bc1vx-fresh-paired-screen-20261016-001.json). This branch-only workflow has been retired from the PR's final tree, with its definition retained in git and its run artifacts retained for 90 days.

**No promotion yet.** The remaining solved-control regression still decides whether to change the default-OFF production setting.

