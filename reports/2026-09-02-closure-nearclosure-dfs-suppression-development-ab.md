# `closureCommitment` + `nearClosureRescue` DFS suppression: second repricing candidate

> **Status:** active
> **Last evidence:** 2026-09-02 — closed-negative result on `PROFILE_closureCommitment` alone ([`closureCommitment suppression development A/B`](2026-09-02-closure-commitment-dfs-suppression-development-ab.md))
> **Decision:** candidate selected and protocol locked before running the treatment arm.
> **Remaining gate:** run the treatment arm and compare to the existing control (reused, not re-run).
> **Evidence role:** development
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

_Pending — filled in once the treatment run completes._
