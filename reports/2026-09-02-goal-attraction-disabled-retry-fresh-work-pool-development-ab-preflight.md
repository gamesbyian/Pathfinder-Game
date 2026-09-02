# STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: development A/B preflight

> **Status:** active
> **Last evidence:** 2026-09-02 — protocol fixed, population drawn, dispatch pending
> **Decision:** not yet made; this report fixes the candidate, population, envelope, and acceptance framing before any run
> **Remaining gate:** dispatch both arms via `solver-level-blind-targeted-sweep.yml` and record the result below
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

[Recorded once both runs complete.]
