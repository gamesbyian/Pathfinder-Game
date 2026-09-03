# Frozen technique census staleness: a 12-cell spot-check

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — local reproduction of 12 frozen T1 census cells against current HEAD (commit `9b87958`)
> **Decision:** the frozen T1 technique census (run `32240161854`, generated **2026-08-20** — two weeks before this session, not 2026-09-01 as `technique-niches`' own join date might suggest) is measurably stale. 3 of 12 spot-checked cheap frozen wins (25%) no longer solve at current HEAD within the same node budget; 2 became dramatically cheaper (IDA); 1 became dramatically more expensive but still solves (repair). This is not evidence of a correctness bug — it is exactly the ordinary capability drift two weeks of real heuristic/scheduling changes produce — but it is concrete, cheap evidence that decision-bearing work should not treat the frozen census/technique-niches capability map as current without accounting for this.
> **Remaining gate:** none for this spot-check itself — it established that a refresh is motivated, not that one is scheduled. **Superseded by action:** [`2026-09-03-technique-census-refresh-001-preflight.md`](2026-09-03-technique-census-refresh-001-preflight.md) subsequently dispatched the full re-census this report motivated.
> **Evidence role:** development — a tiny, non-random-selected spot-check (first N cheap cells per family by a fixed seed, not cherry-picked on outcome), sized only to answer "is a refresh motivated at all," not to characterize the full extent of drift.

## Why this check

`docs/solver-optimization-workstreams.md`'s Workstream-wide rules say: "After a major solver capability change, meaningful census refresh, or current-head reach/work refresh, rejoin/rebuild the capability map... Do not let the September-1 snapshot become a frozen historical curiosity." Reviewing the queue for independent work (see the tail-percentile cost-probe thread's own reports for the main thread this session pursued), no workstream had a ready-to-execute next step; this doc's own text suggested a capability-map refresh as "a reasonable place to look for" fresh evidence. Before committing to (or dismissing) a full re-census, this checks cheaply whether one is even motivated: does the frozen census still describe current solver behavior at all, on a tiny sample?

## Method

Sampled cheap (`nodesExpanded < 150,000`) frozen T1 census cells (`reports/stress/technique-census/32240161854/combined-cells.json`) meeting the same filter as prior rejoin analyses (corpus2, single `techniqueKey`, no ablation/pair/flag, `ok:true`, referee-valid) — cheap cells chosen deliberately so a local re-run is fast and safe (no need to burn a 50,000,000-node budget on cells whose SOLVE was itself cheap; a naturally-terminating solve reproduces or fails fast either way). Grouped by family (beam/repair/dfs/ida; 2,225 eligible cells total), took the first 3 per family after a fixed-seed shuffle (12 cells total — not selected on outcome), and re-ran each in isolation via `technique-census-cell.mjs`'s `runCell` at current HEAD with the frozen cell's own `corpus`/`levelPos`/`techniqueKeys`/`nodeBudget` (the level data itself is static committed corpus data, unchanged).

## Result

| level | technique | frozen nodes | current nodes | current ok | note |
|---|---|---:|---:|---|---|
| R02731 | `beam:perimeterSweep/perimeterCCW@beam2000` | 99,112 | 94,648 | **false (exhausted)** | regression |
| R02066 | `beam:perimeterSweep/perimeterCCW@beam2000` | 50,269 | 50,272 | true | matches (near-identical) |
| R02912 | `beam:knotBuilder@beam2000` | 145,042 | 155,404 | true | matches (near-identical) |
| R03107 | `dfs:repair:repair` | 88,736 | 4,778,439 | true | solves, ~54x more expensive |
| R03010 | `dfs:repair:repair` | 32,855 | 66,591 | true | solves, ~2x more expensive |
| R02871 | `dfs:repair:repair` | 27,089 | 50,000,002 | **false (node-budget-reached)** | regression |
| R03359 | `dfs:portalFirstTransfer` | 70,172 | 50,000,124 | **false (node-budget-reached)** | regression |
| R03359 | `dfs:perimeterSweep` | 62,562 | 50,000,227 | **false (node-budget-reached)** | regression (same level, second technique) |
| R02066 | `dfs:portalCommitted` | 42,337 | 46,627 | true | matches (near-identical) |
| R02115 | `ida:default` | 53,000 | 159 | true | solves, ~333x cheaper |
| R01061 | `ida:mustCrossFirst` | 548 | 985 | true | matches (near-identical, ~2x) |
| R03010 | `ida:intersectionHarvest` | 15,016 | 1,919 | true | solves, ~8x cheaper |

**3/12 (25%) regressed from solved to unsolved** within the same 50,000,000-node budget: `R02731`/beam, `R02871`/repair, and `R03359` under **two different** DFS techniques (`portalFirstTransfer` and `perimeterSweep`) — the same level losing two independent solvers is a real signal something about that level's search landscape changed materially, not noise in one technique's tie-breaking. The rest either matched closely (near-identical node counts, consistent with no material change) or solved at a very different cost (both directions — IDA got dramatically cheaper on two cells, repair got dramatically more expensive on one).

## Interpretation

This is **not** the "fresh vs. preceded" research-integrity concern `docs/solver-correctness-hardening.md` tracks — that rule is about same-revision divergence between an isolated action and the same action reached after ladder history, with the solver otherwise held fixed. This is cross-revision drift: two weeks of real, intentional solver changes (repair budget-model migration, the beam 31/32-flipper identity fix, `admissible-order-fallback` work-cap resolution, scheduling/scoring tuning, etc.) between the census's `2026-08-20` generation and current HEAD. Non-monotonic capability drift — some levels gained, some lost, at varying cost — is the ordinary, expected signature of iterative heuristic-search tuning, not a bug signature (a bug signature would be one-directional, concentrated in a single recent commit, or reproducible as a controlled fresh-vs-preceded discrepancy per the correctness doc's own diagnosis pattern).

What this does establish: the frozen census is old enough, and drift is large enough at even this tiny sample size (25% regression rate on cheap cells, which should be the *most* stable/reproducible ones — deep expensive cells are probably more, not less, drift-prone), that any decision leaning on `reports/stress/technique-niches/2026-09-01/level-capability.json`'s specific per-level/per-technique claims (singleton/doubleton status, thin-boundary classification, or exact node costs) should treat them as dated evidence, not current ground truth. This matters concretely for anything that still cites `frozenT1SupportClass`, singleton/doubleton counts, or the residual capability numbers from `2026-08-25-post-976-portfolio-exposure-rejoin.md` (73 not-offered/57 starved/9 adequate-depth) as if they described today's solver.

## What this does not establish

- **Not a characterization of total drift.** 12 cells, non-random only in the sense of a fixed-seed shuffle (not cherry-picked on outcome), is enough to show a refresh is motivated, not to quantify how much of the map has changed.
- **Not evidence of a correctness bug.** No individual regression was root-caused to a specific commit here; per `docs/solver-correctness-hardening.md`, only a same-revision fresh-vs-preceded discrepancy (not cross-revision drift) would warrant that escalation, and nothing here shows that pattern.
- **Not a dispatched refresh.** A full re-census (78,553 cells, the same scale as the original) is a large, multi-shard GHA undertaking needing its own population/budget/scope decision — reflexively dispatching one from a 12-cell motivation check would violate this program's own "smallest evidence for the next gate" discipline. This report's job is done: a refresh is now evidenced-motivated; scoping and dispatching it is a separate, deliberate next step for whoever picks this up.

## Reproduction

Not committed as a script (a one-off local diagnostic, same convention as other ad hoc joins in this research line). Method: filter `reports/stress/technique-census/32240161854/combined-cells.json` to `tier==='T1' && corpus==='corpus2' && techniqueKeys.length===1 && !pairLabel && !flagExperiment && !ablation && ok===true && refereeValid!==false && nodesExpanded<150000`, group by family (`beam:`/`ida:`/`dfs:repair:`/`dfs:` prefix), take the first 3 per family after a `mulberry32(0xC0FFEE)`-seeded shuffle, and re-run each via `scripts/technique-census-cell.mjs`'s `createCellRunner().runCell({ corpus, levelPos, techniqueKeys, nodeBudget })` (run under `node scripts/run-bundled.mjs <script>`, since `technique-census-cell.mjs` imports the TypeScript solver bundle).
