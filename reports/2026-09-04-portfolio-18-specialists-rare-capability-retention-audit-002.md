# portfolio-18-specialists rare-capability retention audit, refreshed against the 2026-09-03 census

> **Status:** superseded
> **Last evidence:** 2026-09-04 — superseded by `2026-09-04-portfolio-18-fresh-census-temporal-holdout.md`, an independent pass at the same join that reached the identical 147/155 (94.8%) figure; this report's per-identity newly-omitted-exclusive tracking and kept-technique-concentration detail have been folded into that canonical report, which now also cites this one as the cross-validating independent pass.
> **Decision:** superseded — see the canonical report.
> **Remaining gate:** none — use `2026-09-04-portfolio-18-fresh-census-temporal-holdout.md` going forward.
> **Evidence role:** development — a join/analysis of two already-published evidence artifacts, no new dispatch (superseded)

## Why re-run this

`2026-09-03-portfolio-18-specialists-rare-capability-retention-audit.md` answered `docs/solver-scheduling-policy.md`'s rare-capability guardrail against `reports/stress/technique-niches/2026-09-01/level-capability.json`. That snapshot is now explicitly superseded by the 2026-09-03 refresh (`2026-09-03-technique-census-refresh-001-rejoin.md`: 229 support-class changes, singleton count 181→175, doubleton 96→94). A retention claim resting on stale exact winner identities is exactly the kind of drift `docs/solver-optimization-workstreams.md`'s workstream-wide rules warn against ("do not let the September-1 snapshot become a frozen historical curiosity"). This report reruns the identical join method against the current snapshot.

## Method

Identical to the original audit: load `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` rows (already canonical-keyed, no legacy-name translation needed this time — the 2026-09-03 refresh generates canonical identities directly), confirm all 34 `full-menu` keys resolve (34/34, no gaps), split into the 18 `portfolio-18-specialists` keeps and 16 drops, and sum each group's `exclusiveLevels`/`thinBoundaryLevels`/`solvedLevels`.

## Result

| | techniques | Σ exclusiveLevels | Σ thinBoundaryLevels | Σ solvedLevels |
|---|---:|---:|---:|---:|
| `portfolio-18-specialists` (kept) | 18 | **147** | 283 | 9,209 |
| dropped (in `full-menu`, not kept) | 16 | **8** | 25 | 6,155 |
| all `full-menu` | 34 | 155 | — | — |

**Retention: 147/155 = 94.8%**, versus 144/151 = 95.4% against the 2026-09-01 snapshot — a small, unremarkable movement given 229 support-class changes occurred underneath it. The conclusion is unchanged: the curated 18-technique menu retains nearly all measured singleton exclusive capability.

**Dropped techniques, refreshed (sorted by exclusiveLevels desc):**

| exclusive | thinBoundary | solved | technique |
|---:|---:|---:|---|
| **2** | 4 | 444 | `admissible-order\|tieBreak=nearClosureRescue\|lds=off` |
| 1 | 5 | 371 | `dfs\|score=intersectionHarvest\|bias=none` |
| 1 | 4 | 387 | `dfs\|score=perimeterSweep\|bias=perimeterCW` |
| 1 | 4 | 454 | `admissible-order\|tieBreak=intersectionHarvest\|lds=off` |
| 1 | 2 | 385 | `dfs\|score=perimeterSweep\|bias=cornerHarvest` |
| 1 | 2 | 511 | `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` |
| 1 | 1 | 364 | `dfs\|score=portalCommitted\|bias=none` |
| 0 | 2 | 385 | `dfs\|score=default\|bias=none` |
| 0 | 1 | 369 | `dfs\|score=objectiveFirst\|bias=none` |
| 0 | 0 | 361 | `dfs\|score=harvestThenFinish\|bias=none` |
| 0 | 0 | 361 | `dfs\|score=knotBuilder\|bias=none` |
| 0 | 0 | 365 | `dfs\|score=mustCrossFirst\|bias=none` |
| 0 | 0 | 365 | `dfs\|score=perimeterSweep\|bias=none` |
| 0 | 0 | 341 | `dfs\|score=closureCommitment\|bias=none` |
| 0 | 0 | 345 | `dfs\|score=finishFirst\|bias=none` |
| 0 | 0 | 347 | `dfs\|score=nearClosureRescue\|bias=none` |

**Newly omitted exclusive specialists** (identities where the refresh changed a dropped technique's exclusive-win count, compared against the original audit's table):

- **Newly exclusive (0 → nonzero):** `admissible-order|tieBreak=nearClosureRescue|lds=off` (0→2 — now the single largest dropped-technique exclusive count observed in either audit), `dfs|score=intersectionHarvest|bias=none` (0→1), `dfs|score=portalCommitted|bias=none` (0→1).
- **Lost exclusivity (nonzero → 0):** `dfs|score=knotBuilder|bias=none` (1→0), `dfs|score=default|bias=none` (1→0), `dfs|score=finishFirst|bias=none` (1→0).
- **Unchanged exclusive:** `dfs|score=perimeterSweep|bias=perimeterCW` (1→1), `admissible-order|tieBreak=intersectionHarvest|lds=off` (1→1), `dfs|score=perimeterSweep|bias=cornerHarvest` (1→1), `beam|score=knotBuilder|bias=none|width=2000|retention=plain` (1→1).

The one structural change worth flagging: `admissible-order|tieBreak=nearClosureRescue|lds=off` now carries 2 exclusive wins, the first time any single dropped technique in either audit has exceeded 1. This is still small in absolute terms (2 of 1,962 census levels) and does not change the "diffuse, not concentrated" reading, but it is a real, not merely noisy, movement — this exact profile is one of the four `admissible-order-alternate-tiebreak-retry` tie-break profiles this session's `2026-09-04-production-ladder-marginal-value-tail-audit-001.md` already flagged as carrying documented rare value, reinforcing rather than contradicting that report's caution against suppressing that tier.

**Kept-technique concentration is also refreshed** (largest specialists, unchanged ranking from the original audit): `repair|score=repair|guidance=standard` 50 exclusive (was 59), `repair|score=repair|guidance=must-turn-biased` 19 (was 14), `admissible-order|tieBreak=none|lds=off` 17 (was 15), `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` 15 (new to the top tier), `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` 14, `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` 11. The concentration story is unchanged: a handful of kept specialists (repair, `tieBreak=none`, the mechanic-bucket-retention wide beams) carry the overwhelming majority of exclusive capability, both before and after the refresh.

## What this does not establish

Identical caveats to the original audit: this is an isolated-oracle census join (broad, cross-corpus, node-budget), not the same population/currency as the work-budget `static-portfolio-confirmation-00N` populations, and it does not by itself confirm production-envelope retention for a real scheduler caller.

## Disposition

The 2026-09-03 audit's conclusion survives the refresh essentially unchanged (94.8% vs. 95.4%), with individual dropped/kept exclusive identities shuffling underneath a stable aggregate picture — exactly the kind of "structural finding survives, exact winners drift" pattern `docs/solver-optimization-workstreams.md`'s workstream-wide rules anticipated when they called for rejoining the capability map after a refresh. No queue action follows from this alone; it is confirmatory maintenance of an already-closed guardrail, and its `admissible-order|tieBreak=nearClosureRescue|lds=off` finding is folded into `2026-09-04-production-ladder-marginal-value-tail-audit-001.md`'s existing caution about that tier.
