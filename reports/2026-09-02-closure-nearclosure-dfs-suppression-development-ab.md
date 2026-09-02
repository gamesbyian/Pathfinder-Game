# `closureCommitment` + `nearClosureRescue` DFS suppression: second repricing candidate

> **Status:** concluded-negative
> **Last evidence:** 2026-09-02 — treatment run [`33599749870`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33599749870) vs. reused control [`33598928296`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33598928296)
> **Decision:** close this combined candidate too — same solved set, work flat to within noise (+0.0089%, wrong direction). This closes the entire "smallest zero-EW1/zero-production-win ordinary-DFS-tail action(s)" candidate class on the EW1 60-level sample: both members tested (alone and combined), same null both times.
> **Remaining gate:** none for this candidate class. Gate-sequence step (C) itself remains open — see Disposition for what a future attempt needs.
> **Evidence role:** development — concluded without reaching confirmation
> **Selection:** the joined table's own numbers, following the same fixed rule as the first candidate — chosen without seeing this arm's own outcome (only the already-published closureCommitment-alone result, which is a distinct candidate)

## Why this candidate

The first candidate (`PROFILE_closureCommitment` alone, 54.1M corpus-wide `workSpent`, 0/60 EW1, 0 production wins) came back a clean null: identical solved set, aggregate work flat to within noise (+0.004%). The joined table's own interpretation section predicted this — the corpus-wide total is a sum across 1,802 rows, and this 60-level sample's own slice of it could easily be too small to clear noise.

The join's other zero-EW1/zero-production-win ordinary-DFS-tail action, `dfs|score=nearClosureRescue|bias=none` (96,138,442 corpus-wide `workSpent`), is nearly double `closureCommitment`'s footprint. Per the protocol's own candidate-scope rule ("suppressing/narrowing one or two named actions"), testing both together is still within the smallest-candidate mandate and gives roughly 150M combined corpus-wide footprint — the best remaining shot at a signal above noise without escalating to a materially different mechanism.

## The nearClosureRescue entanglement, checked before dispatch

`nearClosureRescue` is also one of `ADMISSIBLE_ORDER_PROFILES` (`modules/solver/attempts.ts`), so the shared `PROFILE_nearClosureRescue` ablation flag removes **both** the ordinary main-loop DFS tail use (the join's 0/60-EW1/0-production-win row) **and** `admissible-order|tieBreak=nearClosureRescue|lds=off` (join row: 2/60 EW1 solves, 0 production reach/wins/work). Checked the EW1 pricing snapshot directly for what those 2 EW1 solves are:

- `R02128` (`EW1-0000692`): **7 EW1 winners total** (beam, several DFS profiles, this admissible-order tie-break). Broadly supported — no risk.
- `R00732` (`EW1-0000559`): **2 EW1 winners** — `admissible-order|tieBreak=default|lds=off` and `admissible-order|tieBreak=nearClosureRescue|lds=off`. Removing the latter drops this from a doubleton to a **singleton** in EW1's own isolated census (not erased — `tieBreak=default` still solves it there).

Two reasons this is an acceptable risk for this development A/B specifically, not a blanket dismissal of the rare-capability guardrail:

1. This admissible-order tie-break has **zero production reach** across the full 1,802-row current-production join — it has never once been the stage that actually wins a solve in current production, so nothing in *live production* is at stake.
2. `R00732` is **already unsolved in both arms of the closureCommitment A/B** (status `work-budget-reached` in both control and treatment logs) — the full attempt ladder never reaches the dead-last admissible-order tier for this level at this budget regardless of this flag, so this specific development A/B's own solved-set outcome cannot be affected by this entanglement either way.

The narrowing (doubleton→singleton) is noted here for the record and will be re-examined if this candidate ever advances to confirmation; it does not block this development pass.

## Protocol (unchanged from the first candidate)

Same envelope (`strictTotalWorkBudget=true`, `workBudget=10,000,000`/level), same EW1 60-level development population, same frozen zero-loss/gain-or-≥10%-work acceptance rule, same rare-capability guardrail (addressed above).

## Commands

Control is **reused**, not re-run — same commit, same corpus, same budget, no flags, already computed: [`33598928296`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33598928296) (3/60 solved, `R03171`/`R02657`/`R02651`, work=586,813,728, nodes=262,561,189).

Treatment dispatched via `mcp__github__actions_run_trigger` (`solver-level-blind-targeted-sweep.yml`, `ref=main`, same 60 ids, `node_budget=7462687`, `strict_total_work_budget=true`, `disable_flags=PROFILE_closureCommitment,PROFILE_nearClosureRescue`):

- **Treatment**: run [`33599749870`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33599749870), commit `98103a1d8729dbbdd96760d4aaef0c156851a1c9`

**Commit drift check.** `main` had moved between the control dispatch (`607028815812de144cedd1308014d500e2869b32`) and this treatment dispatch, via an automated "Harvest solver evidence" commit (`98103a1d...`). Verified via `mcp__github__get_commit` that this commit touches only `data/stress/hints-random/R02657.json` and `data/stress/hints-random/R03171.json` (the two solved control levels' saved hints) — no solver source file. `level-blind-capability-sweep.mjs`'s own capability invariant ("no saved hint, prior solution, or historical status reaches the solve") means level-blind runs never read these files regardless of content, so the reused control remains a valid baseline for this treatment.

## Result

Treatment run [`33599749870`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33599749870) completed ("Combine shard results" job log):

| metric | control (reused, `33598928296`) | treatment |
|---|---:|---:|
| solved | 3/60 | 3/60 |
| solved set | `R03171`, `R02657`, `R02651` | `R03171`, `R02651`, `R02657` (same set) |
| aggregate `workSpent` | 586,813,728 | 586,866,104 |
| work delta | — | **+52,376 (+0.0089%)** |
| aggregate `nodesExpanded` | 262,561,189 | 262,530,633 |

Same result shape as `closureCommitment` alone: zero gained, zero lost, work flat to within noise (wrong direction again). **Fails the frozen acceptance rule** the same way.

## Interpretation

Doubling the combined-suppression footprint (54.1M → ~150.2M corpus-wide `workSpent`) did not produce a measurable effect on this specific 60-level sample either. This strengthens, not just repeats, the first candidate's conclusion: it is not that `closureCommitment` specifically was too small a slice — the *entire zero-EW1/zero-production-win ordinary-DFS-tail action class*, on this particular 60-level EW1 sample, contributes work/solve outcomes indistinguishable from noise. The corpus-wide `workSpent` figures that motivated both candidates are real but are dominated by levels outside this 60-level sample; EW1's own 60 levels are a frozen-gap stratum (each already hard enough to defeat the equal-work census at 10M work), not a representative draw of where these actions actually spend their corpus-wide total.

## Disposition

**Close this exact combined candidate as a clean null too; do not promote either suppression.** No confirmation cohort warranted (development failed for both). This closes the "smallest zero-EW1/zero-production-win ordinary-DFS-tail action(s)" candidate class on the EW1 60-level sample specifically — both members of it were tested (individually and combined) with the same null result. Gate-sequence step (C) remains open. A future attempt needs either: (a) a materially different, larger-footprint candidate (accepting more scrutiny/risk, per the complexity ladder's next rung), or (b) evaluation on a population where these actions' corpus-wide cost is actually concentrated (a fresh sample or the full current-production corpus itself, not the frozen-gap EW1 stratum) — not another small action drawn from the same EW1-null-footprint pool.
