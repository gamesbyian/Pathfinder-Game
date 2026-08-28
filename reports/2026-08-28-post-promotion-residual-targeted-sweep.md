# Post-promotion residual targeted sweep — 3/724 new level-blind solves

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — level-blind targeted sweep (GHA run [`33140805411`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33140805411)) over the full 724-level corpus2 residual from the `32835403128` baseline, dispatched at `main`'s current head after `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`'s promotion and every other change merged since that baseline
> **Decision:** production capability on this exact residual moved from 0/724 to 3/724 since the `32835403128` baseline — a real, level-blind gain (new solves `R02151`, `R00817`, `R02010`, each confirmed `ok: false`/`node-budget-reached` in the baseline), but small relative to the 724-level population. 721/724 remain unsolved even at a generous 50,000,000-node/67,000,000-work budget. This corroborates (does not exceed) the already-established `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` promotion evidence from an independent angle (full-residual level-blind re-sweep, not an archetype-sample A/B), and confirms the post-976 rejoin's "739 confirmed-solvable/starved/adequate-depth-non-replay" residual [`2026-08-25-post-976-portfolio-exposure-rejoin.md`](2026-08-25-post-976-portfolio-exposure-rejoin.md) is still overwhelmingly open.
> **Remaining gate:** none for this specific sweep. The post-976 rejoin's own remaining gate (a single cheap missing-exposure beam pilot) is unaffected and still the recommended next step for queue item #1.
> **Evidence role:** confirmation (level-blind, no exact history/hints/solved-status leakage — see `level-blind-capability-sweep.mjs`'s own scope comment) of an already-decided promotion, on an independently-selected population (the full prespecified residual, not a mined subset)
> **Selection:** the population (all 724 levels `ok: false` in baseline run `32835403128`) was fixed before this sweep ran and was not re-selected after seeing results; it is the same population `2026-08-25-post-976-portfolio-exposure-rejoin.md` analyzed, re-measured after the intervening promotion rather than mined fresh.

## Motivation

`2026-08-25-post-976-portfolio-exposure-rejoin.md` found that of the 724 levels unsolved in Corpus-2 capability run `32835403128`, a substantial share had existing isolated-technique-census evidence of solvability (not-offered/starved/adequate-depth-non-replay in production's actual portfolio). That report's recommended next step — a scoped exposure pilot — became `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, developed, confirmed, and promoted default-ON ([`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #1). This sweep asks the most direct possible follow-up question: **does the exact same 724-level residual actually solve more now, measured level-blind (no hints, no history, no prior-solved status reaching the solver)?**

## Population and protocol

- Population: all 724 levels with `ok: false` in `reports/stress/capability-runs/32835403128/per-level-corpus2.json` (baseline commit `fc625d18`), the same set `2026-08-25-post-976-portfolio-exposure-rejoin.md` analyzed.
- Dispatch: `.github/workflows/solver-level-blind-targeted-sweep.yml`, `node_budget=50,000,000`, `workers=4`, `target_wall_minutes=20`, 181 shards (`plan-highbudget-shards.mjs`, `solo-threshold-multiplier=2.5`), run at `main`'s head (`5ab9bffb`), which includes the `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` promotion plus every other change merged to `main` since the `32835403128` baseline.
- Per shard: `level-blind-capability-sweep.mjs`, which strips exact-level identity/history/prior solved status/winning config/seed before `prepareLevelForSolver` — the solver receives mechanics-only puzzles, matching the level-editor use case this tool exists for.
- No `--strict-total-work-budget` was passed (matching the current default for this workflow — see [`2026-08-28-additive-tier-participation-audit.md`](2026-08-28-additive-tier-participation-audit.md)'s Part 3), so the real per-level ceiling on hard levels ran somewhat above the nominal 50M/67M figures wherever an additive tier engaged; this does not affect the solved/unsolved comparison itself, since both this run and the original baseline (`32835403128`, its own separate production ladder) ran under the same additive semantics.

## Result

**3/724 solved: `R02151`, `R00817`, `R02010`.** All three verified `ok: false`, `status: node-budget-reached` in the `32835403128` baseline — genuine new solves, not artifacts of a different id set. 721/724 remain `node-budget-reached` at this budget.

```
Targeted sweep: 3/724 solved.
Solved: R02151, R00817, R02010
```

(Full unsolved-id list: job `98767044856`'s "Print a solved-count summary to the job log" step, or the `targeted-sweep-combined` artifact.)

## Reading

- This is a real, level-blind, no-leakage capability gain on the exact population the post-976 rejoin flagged as actionable — consistent with (not independent proof of, since the intervening main branch also picked up every other merged change) the `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` promotion's own confirmed +3/-0 result on a differently-constructed archetype sample.
- 3/724 (0.4%) is small next to the rejoin's own finding that 139/724 levels had at least one observed unablated singleton T1 census solver — the promoted exposure fix targeted a narrow must-cross+flipper-heavy sub-rule, not the whole residual, so a small yield here is expected and does not contradict that report's larger "substantial capability still sits behind exposure" finding.
- 721/724 unsolved even at 50,000,000 nodes confirms the post-976 rejoin's own residual is still overwhelmingly open. The rejoin's own recommended next step (one more cheap missing-exposure beam pilot before richer selector machinery) remains the right next action for queue item #1, not superseded by this result.

## What this does not establish

- Not a new development A/B and not itself confirmation-grade selection evidence for any new candidate — it re-measures an already-decided promotion on an already-analyzed population.
- Does not attribute the 3 gains to `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` specifically versus any other change merged to `main` since the `32835403128` baseline (a large span of unrelated queue #0/#2 work also landed in that window). Attribution would need an isolated before/after A/B on just that flag, which this sweep does not perform.
- Does not update the technique-census join itself; `2026-08-25-post-976-portfolio-exposure-rejoin.md`'s per-cause breakdown (not-offered/starved/adequate-depth-non-replay) is not recomputed here.

## Reproduction

The dispatch used `mcp__github__actions_run_trigger` (`run_workflow`) against `.github/workflows/solver-level-blind-targeted-sweep.yml` with `ids` set to the 724 baseline-unsolved ids, `node_budget=50000000`. See the workflow's own `workflow_dispatch` inputs for the full parameter set.
