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

## Commands (fixed before running)

```bash
# Build the fixed 60-level EW1 corpus subset once (level IDs from the pricing snapshot's own results)
python3 - <<'PY'
import json
snap = json.load(open('reports/stress/ew1/33156541827-pricing-snapshot.json'))
ids = sorted({r['levelId'] for r in snap['results']})
corpus = json.load(open('data/stress/stress-levels-random.json'))
byid = {l['id']: l for l in corpus['levels']}
json.dump({'levels': [byid[i] for i in ids]}, open('/tmp/ew1-60level-corpus.json', 'w'))
PY

# Control
node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- \
  --corpus=/tmp/ew1-60level-corpus.json --strict-total-work-budget --work-budget=10000000 \
  --workers=4 --out=/tmp/closure-commitment-ab-control.json --summary-out=/tmp/closure-commitment-ab-control-summary.md

# Treatment
node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- \
  --corpus=/tmp/ew1-60level-corpus.json --strict-total-work-budget --work-budget=10000000 \
  --workers=4 --disable-flags=PROFILE_closureCommitment \
  --out=/tmp/closure-commitment-ab-treatment.json --summary-out=/tmp/closure-commitment-ab-treatment-summary.md
```

## Result

_Pending — filled in after both arms complete._
