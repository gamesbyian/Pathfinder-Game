# STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: development A/B preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — control run [`33684326389`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33684326389) (78/150 solved) vs. treatment run [`33684335986`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33684335986) (79/150 solved): clean **+1/-0** (gained `R00355`, lost nothing), and the treatment arm's aggregate work/nodes across all 150 levels were both slightly *lower* too (work −0.12%, nodes −1.21%) despite giving the tier more room to spend. A local single-level reproduction of `R00355` under each arm's exact flags/envelope confirms the mechanism directly: control gets **zero** `goal-attraction-disabled-retry` attempts (the shared pool is already spent by the time this tier's turn comes up — exactly the starvation this opt-in targets), while treatment gets two real dispatches and **wins the level** on the tier's own `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` action.
> **Decision:** this is a clean, mechanism-confirmed positive development result. It nominates `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` for independent confirmation on a fresh, independently-drawn population; it does not itself promote anything, per this report's own pre-declared acceptance framing (this population was chosen for likely reach, not blind).
> **Remaining gate:** a locked, disjoint, independently-drawn confirmation cohort (not this range, not any range previously mined this session) before any promotion decision.
> **Evidence role:** development (population chosen for likely reach, not drawn independent of any prior evidence; a positive result here would still need independent confirmation before promotion)
> **Selection:** the population (Corpus-2 positions 1-150) is reused from the same range this session's own `additive-tier-participation-audit.mjs` runs already characterized (high participation across nearly every late-ladder additive tier at a smaller local node budget) — chosen for a plausible chance of reaching `goal-attraction-disabled-retry`'s own gate, not drawn blind. A positive finding here is a development signal only.

## Context

`docs/solver-opt-in-experiment-ledger.md`'s new `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` entry (implemented earlier today, see [`the implementation report`](2026-09-02-goal-attraction-disabled-retry-fresh-work-pool-implementation.md)) is explicitly "awaiting population-scale before/after evidence" before any promotion — the flag is a real code path (opt-in, default OFF, zero live-play risk) but has only been validated by unit test and byte-identical regression, never run against real levels at population scale. This report is that first population-scale look, at the smallest reasonable size before investing in a larger confirmation.

## Candidate arms

Both arms enable the tier's existing closed-but-compatible node reserve, since without it the tier is essentially never eligible at all (this session's own diagnosis found 0/40 eligible with the reserve off vs. 39/40 with it on, on this same position range at a smaller local budget) — testing the fresh work pool's own marginal value requires the node dimension already fixed, or the comparison would just remeasure the already-closed node question.

| arm | flags |
|---|---|
| control | `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` |
| treatment | `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE,STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` |

## Population

150 levels, Corpus 2 (`data/stress/stress-levels-random.json`), positions 1-150 (`data/stress/goal-attraction-disabled-retry-fresh-work-pool-ab-001-ids.txt`, committed for reproducibility). Not independently drawn — reused from a range this session already characterized as reaching most late-ladder additive tiers at a smaller local budget, to give this pilot a real chance of exercising the mechanism under test rather than risking a degenerate zero-reach run (per this program's own repeated lesson from the static-portfolio pilot's first two degenerate runs). This selection choice is why the evidence role is development, not confirmation — a positive result would need a fresh, independently-drawn population before any promotion claim.

## Envelope

`node_budget=50,000,000`, `strict_total_work_budget=false` (ordinary additive-tier semantics — this experiment is specifically about additive-tier work-pool behavior, so a strict total-work cap would change the very mechanism under test). This is the standard production-shaped envelope this program's own real A/Bs use (e.g. the `finishFirst` concentrated-population A/B), scaled up from the smaller local diagnostic budget (`nodeBudget=2,000,000`) used to first characterize this population and this mechanism — not re-validated at this exact larger scale before dispatch, since GHA sharding makes the real dispatch itself the cheapest way to find out.

## Primary outcome and acceptance framing

- **Primary outcome:** solved-level count and identity in each arm; gained/lost relative to control.
- **Secondary outcome:** `goal-attraction-disabled-retry` participation/win counts specifically (from each arm's own per-level attempt records), to see directly whether the fresh pool changes this tier's own real engagement, independent of whether that changes final solve-set outcomes.
- **This is a development pilot, not a promotion gate.** Any gain nominates the mechanism for independent confirmation on a fresh population; a null result (matching the already-closed sibling node-reserve experiment's own "negligible movement" finding) would close this exact candidate/population combination without necessarily closing the mechanism outright, since a null here could reflect this population's own character rather than the fix's real value elsewhere. Any loss would be a genuine concern requiring root-cause diagnosis before any further step, per this program's own standing rule that a clear negative closes the tested form.

## Reproduction

Workflow: `solver-level-blind-targeted-sweep.yml`, `ids_file=data/stress/goal-attraction-disabled-retry-fresh-work-pool-ab-001-ids.txt`, `corpus=data/stress/stress-levels-random.json`, `node_budget=50000000`, `strict_total_work_budget=false`.

- Control dispatch: `enable_flags=STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`
- Treatment dispatch: `enable_flags=STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE,STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`

## Result

Both arms ran to completion, all 38/38 shards succeeding in each, recovered from the "Combine shard results" job's own console log (same method used throughout this session — the raw artifact blob-storage host remains blocked by this session's egress policy):

| arm | solved | work | nodes |
|---|---:|---:|---:|
| control (node reserve only) | 78/150 | 19,650,869,835 | 15,815,078,319 |
| treatment (node reserve + fresh work pool) | 79/150 | 19,627,970,899 | 15,624,248,323 |
| delta | **+1** | −0.12% | −1.21% |

**Gained:** `R00355`. **Lost:** none. A clean, unambiguous win — every one of control's 78 solves is also present in treatment's 79 (set difference confirmed programmatically from the two full solved-level lists), and the gain isn't bought with more aggregate work or nodes across the population; both went down slightly (noise-level, but the direction rules out "the tier just got greedier and cost more").

### Mechanism-level confirmation (local reproduction of `R00355`)

The job-log summary only gives solved/unsolved status per level, not per-attempt stage participation, so `R00355` (Corpus-2 position 49) was reproduced locally under each arm's exact flags and envelope (`--node-budget=50000000 --work-budget=67000000 --attempt-budget-telemetry`, commit `84012236`) to check the secondary outcome this preflight specified: whether the fresh pool actually changes the tier's own engagement, not just the final solve-set.

| arm | result | attempts (total) | `goal-attraction-disabled-retry` attempts |
|---|---|---:|---|
| control | unsolved (`node-budget-reached`), workSpent=266,359,958, nodes=150,000,107 | 26 | **0** — never dispatched at all |
| treatment | **solved**, workSpent=160,014,184, nodes=37,383,389 | 11 | **2** — one `exhausted` (workSpent 3,219,911), one **`success`** (workSpent 3,752,235) |

Treatment's winning action is `goal-attraction-disabled-retry|beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` — the tier itself is the rescuer, not some unrelated later stage that happened to differ between arms. Control's shared-pool dispatch never reaches this tier at all (`workSpent >= workBudget` already true by the time its turn comes up in `runGateSerialAttempts`/`runInterleavedAttempts`), exactly the starvation mechanism [`the diagnosis report`](2026-09-02-goal-attraction-disabled-retry-work-pool-starvation.md) found and this opt-in was built to fix. This is about as direct as attribution gets without the raw per-shard artifact: the mechanism engages only in the treatment arm, and the one level it engages on is exactly the one level treatment gains.

### Disposition

**Close this development pilot as a clean positive.** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` is nominated for independent confirmation on a fresh, independently-drawn cohort — this population was chosen for likely reach (per this report's own "Selection" framing above), so a promotion decision still needs evidence from a population this exact investigation didn't help pick. Update `docs/solver-opt-in-experiment-ledger.md`'s entry accordingly.
