# `dfs|score=closureCommitment` suppression: smallest production-shaped repricing candidate

> **Status:** active
> **Last evidence:** 2026-09-02 — joined corrected-EW1 × exact-current-head production reach/work (GHA run [`33588487486`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33588487486), `reports/stress/capability-runs/33588487486/equal-work-production-reach.md`)
> **Decision:** candidate selected and protocol locked before running the development A/B, per [`2026-09-02-production-shaped-repricing-ab-preflight.md`](2026-09-02-production-shaped-repricing-ab-preflight.md)'s already-fixed mechanical rules.
> **Remaining gate:** run the development A/B on the EW1 60-level sample under `strictTotalWorkBudget`; if it passes the frozen acceptance rule, a locked confirmation cohort next — do not promote from development evidence alone.
> **Evidence role:** development (candidate selection + first A/B); confirmation is a separate, later step
> **Selection:** the candidate was chosen from the joined table's own numbers, using a fixed, mechanical rule (see "Why this candidate") — not tuned after any A/B outcome, since no A/B has run yet at the time this section was written

## Why this candidate

The join (`equal-work-production-reach.md`'s "Joined action view") lists every attempt-config action's EW1 equal-work solve rate alongside its exact-current-head production reach/wins/work. Two ordinary main-loop DFS score-profile actions show **zero** EW1 solves (out of 2,015 equal-work cells) **and zero production wins** (out of 51,231 matched current-production attempts, across 1,802 corpus1+corpus2 rows):

| action | EW1 solves/60 cells | production reached levels | production wins | production `workSpent` |
|---|---:|---:|---:|---:|
| `dfs\|score=nearClosureRescue\|bias=none` | 0/60 | 129 | **0** | 96,138,442 |
| `dfs\|score=closureCommitment\|bias=none` | 0/60 | 128 | **0** | 54,097,041 |

Both are candidates for suppression under the protocol's item 2 ("a small, legally-scoped reallocation... suppressing/narrowing one or two named actions"). This report picks **`closureCommitment` alone** — the single smaller-`workSpent` action — for three reasons:

1. **Smallest, not smallest-two.** The protocol says "the first candidate must be small"; a single action is smaller than a pair, and `closureCommitment` is the cheaper of the two by `workSpent`.
2. **No entanglement with a different action class.** `closureCommitment` is not a member of `ADMISSIBLE_ORDER_PROFILES` (`modules/solver/attempts.ts`'s `ADMISSIBLE_ORDER_PROFILES = ['default', 'none', 'mustCrossFirst', 'intersectionHarvest', 'nearClosureRescue']`) — `nearClosureRescue` is. The existing ablation flag `PROFILE_nearClosureRescue` would also silently remove `admissible-order|tieBreak=nearClosureRescue|lds=off`, which the same joined table shows at **2/60 EW1 solves** (real, if currently unexercised, equal-work capability — row: `| admissible-order|tieBreak=nearClosureRescue|lds=off | 2/60 | 9,746,449 | 0 | 0 | 0 | 0 |`). `closureCommitment` has no such second use anywhere in `attempts.ts` or `policy.ts` — it is used only via the generic `SCORING_PROFILE_ORDER.filter(...).map(dfs)` late-ladder tail (`policy.ts`'s `SCORING_PROFILE_ORDER` lists it **last**, i.e. already the lowest-priority ordinary DFS profile).
3. **No new code.** `modules/solver/attempts.ts`'s `applyAttemptConfigOptions` already filters any attempt config by `PROFILE_${scoringProfileId}` (`if (pKey in cfg && !cfg[pKey]) return false;`), and `PROFILE_closureCommitment` is already a registered `FEATURES` flag (`ablation-config.ts`), default-ON (not in `OPT_IN_FEATURES`). Suppressing it for this A/B is exactly `--disable-flags=PROFILE_closureCommitment` on the treatment arm — no source change, so this A/B cannot itself introduce a new defect independent of the flag's own (already-exercised) filtering logic.

This is explicitly **not** a reopening of the closed global two-DFS suppression (`2026-08-25-scheduler-static-repricing-join.md`): that form suppressed `dfs:objectiveFirst`/`dfs:intersectionHarvest`, two of the *highest*-production-engagement DFS actions (14 and 9 production wins, tens of billions of work each in the current join). `closureCommitment` is the opposite end of the distribution — the single lowest-priority DFS tail profile, with zero observed wins anywhere in current production.

## Protocol (inherited unchanged from the preflight report)

1. **Envelope:** `strictTotalWorkBudget: true`, both arms, `workBudget=10,000,000` per level (EW1's own canonical per-cell work).
2. **Candidate:** control = production defaults; treatment = control + `--disable-flags=PROFILE_closureCommitment`.
3. **Development population:** the durable EW1 60-level frozen-gap sample (`reports/stress/ew1/33156541827-pricing-snapshot.json`'s own 60 level IDs, all `corpus2`), extracted verbatim into a fixed local corpus file for this run. This is development evidence only.
4. **Confirmation population:** deferred — only run if this development A/B passes.
5. **Frozen acceptance rule:** zero solve losses, plus either a solve gain or ≥10% lower aggregate `workSpent`, decided on the aggregate verdict first.
6. **Rare-capability guardrail:** cross-check any changed level against the 2026-09-01 technique-niches singleton/doubleton list before concluding no capability was lost.
7. **Reporting:** gains/losses by level ID, aggregate `workSpent` delta, wall cost, actions touched.

## Execution note: moved from local to GHA mid-flight

The first attempt ran both arms locally (`scripts/level-blind-capability-sweep.mjs` directly, `--workers=4`, against a hand-extracted 60-level corpus subset). This was stopped after control reached 33/60 and treatment 8/60, for two reasons raised in review: (1) every prior repricing development/confirmation A/B in this program (the closed two-DFS suppression's `32901181013`/`32908734154`, the mustcross-flipper/reserve-widen A/Bs, `confirm-transfer-topology-001`, the level-blind targeted sweeps) is anchored to a citable, immutable GHA run ID, not a local session transcript; (2) this session had already lost partial CP-SAT bisection work once earlier to a local background process dying silently mid-run (Workstream 6's own batch-2 recovery, this same day) — a demonstrated reliability gap for uncommitted local compute in this sandbox. `solver-level-blind-targeted-sweep.yml` (`.github/workflows/`) exists for exactly this shape (explicit id list, one-off ablation-flag comparison, no baseline/hint writes) and was used instead.

## Commands (as actually dispatched)

```bash
# 60 level IDs from the EW1 pricing snapshot's own results (all corpus2)
ids=$(python3 -c "
import json
snap = json.load(open('reports/stress/ew1/33156541827-pricing-snapshot.json'))
print(','.join(sorted({r['levelId'] for r in snap['results']})))
")

# node_budget chosen so node_budget*134/100 (this workflow's own node->work conversion,
# see solver-level-blind-targeted-sweep.yml) floors to exactly 10,000,000 -- EW1's own
# canonical per-cell work -- under --strict-total-work-budget=true.
node_budget=7462687   # 7462687*134/100 = 10,000,000 exactly (integer floor)
```

Dispatched via `mcp__github__actions_run_trigger` (`run_workflow`, `ref=main`) with `ids=<60 ids>`, `node_budget=7462687`, `strict_total_work_budget=true`:

- **Control** (`disable_flags=""`): run [`33598928296`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33598928296)
- **Treatment** (`disable_flags=PROFILE_closureCommitment`): run [`33598934794`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33598934794)

Both dispatched against `main` head at the time (post-capability-refresh commit `df614a5a`); no source change was needed since the suppression uses only the pre-existing `PROFILE_closureCommitment` ablation flag.

Note: this workflow's `run-name` template (`flags=${{ inputs.enable_flags || 'control' }}`) only reflects `enable_flags`, not `disable_flags` — both runs display `flags=control` in the GitHub UI. This is a display-only artifact of the run-name template; the actual dispatch correctly threads `disable_flags` into the solve step's `--disable-flags` argument (verified in the workflow source, `solver-level-blind-targeted-sweep.yml` lines ~193-194). Worth a follow-up doc/template fix, not a correctness issue for this A/B.

## Result

_Pending — filled in after both runs complete._
