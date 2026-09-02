# `dfs|score=finishFirst` suppression: next-rung zero-production-win DFS-tail candidate

> **Status:** active
> **Last evidence:** 2026-09-02 — development A/B dispatched on the EW1 60-level sample (control [`33601212956`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33601212956), treatment [`33601220410`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33601220410))
> **Decision:** pending — this report is prespecified before either arm's outcome is known; do not read "Why this candidate" as a post-hoc justification
> **Remaining gate:** both dispatched runs must complete and be evaluated against the frozen zero-loss/gain-or-≥10%-work acceptance rule
> **Evidence role:** development (candidate selection + first A/B) — prespecified before either arm's outcome is known
> **Selection:** chosen from the join's own numbers by a fixed, mechanical rule (see "Why this candidate"), not tuned after any A/B outcome

## Context

Gate-sequence step (C) (`docs/solver-optimization-workstreams.md`, Workstream 2) closed its first candidate class negative: the two ordinary main-loop DFS score-profile actions with **zero** EW1 equal-work solves (out of 2,015 cells) *and* zero production wins (`dfs|score=closureCommitment|bias=none`, `dfs|score=nearClosureRescue|bias=none`) were suppressed alone and combined on the EW1 60-level sample; both were clean nulls (0 losses, but no gain and work flat to within noise, +0.004%/+0.0089% — the wrong direction). That closed the entire "zero-EW1/zero-production-win" candidate class on this population. The recorded next step was explicit: either (a) a materially larger-footprint candidate, with correspondingly more scrutiny, or (b) a different evaluation population where these actions' corpus-wide cost is actually concentrated.

This report takes path (a).

## Why this candidate

Re-scanning the join's (`reports/stress/capability-runs/33588487486/equal-work-production-reach.md`) "Joined action view" for **zero-production-win** actions (any EW1 solve count), sorted by corpus-wide `workSpent`:

| action | EW1 solves/60 cells | production reached levels | production wins | production `workSpent` |
|---|---:|---:|---:|---:|
| `dfs\|score=finishFirst\|bias=none` | 1/60 | 130 | **0** | 279,363,562 |
| `beam\|score=harvestThenFinish\|bias=none\|width=2000\|retention=plain` | 3/60 | 37 | **0** | 150,622,749 |
| `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` | 3/60 | 37 | **0** | 149,168,055 |
| `dfs\|score=nearClosureRescue\|bias=none` | 0/60 | 129 | 0 | 96,138,442 *(closed negative, tested combined 2026-09-02)* |
| `dfs\|score=closureCommitment\|bias=none` | 0/60 | 128 | 0 | 54,097,041 *(closed negative, tested 2026-09-02)* |

`dfs|score=finishFirst|bias=none` is the largest zero-production-win action in the join by a wide margin — **279M corpus-wide `workSpent`, ~1.86x the already-tested combined pair's 150M**, and 2.6x-5x any single ordinary-DFS-tail candidate tested so far. This report selects it alone (not paired with a beam-class action) for four reasons:

1. **Stay within the tested mechanism class first.** The prior two closed candidates were both ordinary main-loop DFS score profiles. `finishFirst` is the next-largest member of the *same* class (`dfs|score=*|bias=none`), so this A/B isolates "does footprint size change the outcome" without also changing mechanism (beam retention/width is a materially different action family with its own EW1 capability shape — see `beam|score=harvestThenFinish`/`knotBuilder` rows above, both left untested here).
2. **No entanglement with a different action class.** `modules/solver/attempts.ts`'s `ADMISSIBLE_ORDER_PROFILES = ['default', 'none', 'mustCrossFirst', 'intersectionHarvest', 'nearClosureRescue']` does **not** include `finishFirst` — unlike `nearClosureRescue`, suppressing `PROFILE_finishFirst` cannot also silently remove an admissible-order tie-break arm. Confirmed by grep: `finishFirst` appears in `attempts.ts` only inside the `sparse-low-intersection` routing rule's `profilesFirst([...])` list (main-search, replayed verbatim into every retry-tier ladder via the shared `getAttemptConfigs` policy) and nowhere else in `attempts.ts`/`policy.ts` structurally.
3. **No new code.** Same mechanism as both prior candidates: `applyAttemptConfigOptions`'s existing `PROFILE_${scoringProfileId}` filter, and `PROFILE_finishFirst` is already a registered default-ON `FEATURES` flag (`ablation-config.ts`). Suppression is exactly `--disable-flags=PROFILE_finishFirst` on the treatment arm.
4. **"Correspondingly more scrutiny" is warranted and applied.** Unlike the fully-zero prior pair, this action has a nonzero EW1 equal-work solve (1/60 cells) — real, if currently production-unrealized, latent capability at equal work. Its zero production win count means the current competitive ladder never lets that capability surface (either starved of budget behind higher-priority actions, or another action always solves first on the levels where it would win). Per this program's rare-capability guardrail, any gained/lost level in the result must be cross-checked against the 2026-09-01 technique-niches singleton/doubleton list before concluding no capability was lost, and the specific EW1-solved cell's identity must be checked against the result even if it is not a production win today.

This is explicitly **not** a reopening of the closed global two-DFS suppression (`objectiveFirst`/`intersectionHarvest`, tens of billions of work each, 14/9 production wins) — `finishFirst` has zero production wins anywhere in the current 1,802-row join.

## Protocol (inherited unchanged from the preflight report and the two closed candidates)

1. **Envelope:** `strictTotalWorkBudget: true`, both arms, `workBudget=10,000,000` per level (EW1's own canonical per-cell work).
2. **Candidate:** control = production defaults; treatment = control + `--disable-flags=PROFILE_finishFirst`.
3. **Development population:** the durable EW1 60-level frozen-gap sample (`reports/stress/ew1/33156541827-pricing-snapshot.json`'s own 60 level IDs, all `corpus2`), the same population both prior candidates used. This is development evidence only.
4. **Confirmation population:** deferred — only run if this development A/B passes.
5. **Frozen acceptance rule:** zero solve losses, plus either a solve gain or ≥10% lower aggregate `workSpent`, decided on the aggregate verdict first — same rule both prior candidates were held to and failed.
6. **Rare-capability guardrail:** cross-check any changed level against the 2026-09-01 technique-niches singleton/doubleton list, and separately check whether the EW1-solved cell (1/60) falls inside this 60-level sample and what happens to it under treatment, before concluding no capability was lost.
7. **Reporting:** gains/losses by level ID, aggregate `workSpent` delta, wall cost, actions touched.

## Fresh control required (source changed since the last candidates' shared control)

The prior two candidates (`closureCommitment` alone, then `closureCommitment`+`nearClosureRescue` combined) both reused one control run (`33598928296`) after confirming the intervening commit touched only two hint files. That reuse does not extend to this A/B: `main` has since picked up `915754e5` ("Fix beam's 31/32 flipping-filter numeric key radix"), a genuine beam-search numeric-key correctness fix. It is reported byte-identical only on the published corpus (no 31/32-flipper levels there); it was not specifically checked against the EW1 60-level sample's own flipper cardinalities. Rather than re-deriving that proof, this A/B dispatches a **fresh control** at current `main` head alongside the treatment, so both arms are guaranteed to differ only in `PROFILE_finishFirst`.

## Commands (as dispatched)

```
ids = <the same 60 EW1 corpus2 ids from reports/stress/ew1/33156541827-pricing-snapshot.json>
corpus = data/stress/stress-levels-random.json   # default; all 60 ids are corpus2
node_budget = 7462687   # 7462687*134/100 floors to exactly 10,000,000 work under --strict-total-work-budget=true
strict_total_work_budget = true
```

Dispatched via `mcp__github__actions_run_trigger` (`run_workflow`, `ref=main`) at head `5ad0faa84a23023c4f2a80efb014a81a7f6ac241`:

- **Control** (`disable_flags=""`): run [`33601212956`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33601212956)
- **Treatment** (`disable_flags=PROFILE_finishFirst`): run [`33601220410`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33601220410)

Both dispatched against the exact same `main` head, so no cross-commit reasoning is needed for this pair.

## Result

*(pending — filled in once both runs complete)*

## Disposition

*(pending)*
