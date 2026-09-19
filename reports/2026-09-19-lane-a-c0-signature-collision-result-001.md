# Lane A: C0 signature-collision experiment result

> **Status:** concluded-negative
> **Last evidence:** 2026-09-19 — combined 581/581 (cut, prefix) CP-SAT reference labels from GHA run [35417717852](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35417717852) (all 20 shards succeeded; real solver compute), recombined without any re-execution as run [35420473468](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35420473468) and independently reconfirmed as run [35466554891](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35466554891) (identical summary both times), then analyzed with `scripts/stress/lane-a-c0-signature-collision-analysis.mjs` per this program's shared `summarizeSignatureCollisions` primitive.
> **Decision:** **C0 is MIXED.** 2 of 144 cut-signature groups (R02525:196620,327686 and R02345:65540,196612,393218 -- two distinct independent-parent levels) each contain both `live` and `dead` decisive labels on prefixes crossing the identical geometric cut. Per this experiment's own precommitted decision rule, this is the expected outcome and does **not** license promoting C0 to any consumer. **Proceed to precommit C1** (boundary kinematics) as the separate follow-on pass specified in the preflight, reusing the same frozen 581-case population.
> **Remaining gate:** precommit and dispatch the C1 contract (C0 + crossing-cell direction/heading continuity + portal-jump-boundary state) per `docs/solver-separator-dynamic-interface-contract-preflight.md`.
> **Evidence role:** first exact-label pass against the frozen C0 signature-collision population; decisive falsifier for the C0 (interface-identity-only) contract layer. No new solver compute spent producing this report (only recombination of already-collected shard results).
> **Population identity:** unchanged from `reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md`'s precommitment -- 144 cut-signature groups / 98 levels / 581 (cut, prefix) query pairs, `reports/stress/lane-a-c0-signature-collision-cases-2026-09-19.json`. No new frontier sampling in this pass.

## Why this ran

`reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md` precommitted this experiment's population, instrument, signature, analysis, and decision rule before any outcome was inspected. Its handoff was blocked on combining GHA run 35417717852's shard results: all 20 shards succeeded (581/581 real CP-SAT queries: 4 live / 542 dead / 35 timeout-abstain), but the run's `combine` job failed at its final publish step with

```
Error: duplicate population identities: 131073, 131075, ... 655364, 655364::R01132:frontier-1181, ... R00046:131081, R00046:2, ...
```

## Root cause and fix (already resolved on `main` before this session started work)

Investigation (job logs for run 35417717852, job `Combine explicit-prefix reference results`) traced the throw to `canonicalizeIdentities` (`scripts/solver-experiment-contract.mjs:66`) called from `buildCaseIntegrity` (`scripts/cpsat-prefix-reference-integrity.mjs:20`), not from `write-solver-experiment-contract.mjs` as the throw's file path in the stack trace superficially suggested (that script never received an `identities` array in this workflow's contract spec at all -- its `population` block only ever carries `{kind, identityBasis}`). The actual defect: `cpsat-prefix-reference-integrity.mjs`'s `main()`, at the commit that ran (`9d8e24c`, PR #1902), read the expected-ids file with `.split(/[\s,]+/)` -- splitting on commas as well as newlines. PR #1902's own fix (same run's dispatched commit) had just changed the disambiguated dispatched id to `${levelId}:${sortedCutCells.join(',')}::${caseId}`, which legitimately embeds commas from the cutCells list. Every such id was being shredded at its own internal commas into bogus fragments (bare packed cutCell integers for 3+-cutCell signatures, and `levelId:firstCutCell` fragments for 2-cutCell signatures), which then collided with fragments from other ids -- a downstream text-tokenization bug, not a population defect (581 dispatched ids were already confirmed globally unique).

This was already root-caused and fixed by a sibling process in this same research session, merged to `main` before this task began: PR #1905 (`2b03cf1`, "Fix expected-ids comma-splitting bug; add cheap shard-recombine path") extracted the parser into an exported, newline-only `parseExpectedIdsFile()` with a comma-bearing-id regression test, and added the `recombine_run_id` workflow input this report's redispatch uses. Verified via `git log`/`git diff` against `origin/main` and by rerunning the full targeted test suite on current `main` (see Validation below) -- no further code change was needed or made for this task. A prior pass in this same session (PR #1906, PR #1907) had already used that recovery path to combine run 35417717852 into a decisive result (run 35420473468) and to add per-group mixed-signature detail to the analysis script's console output (run 35466554891, this report's source).

## Validation (current `main`, no code changed by this task)

```
npm run test:cpsat-prefix-reference-integrity        # pass (includes PR #1905's comma-bearing regression case)
npm run test:cpsat-explicit-prefix-reference-pipeline # pass
npm run test:cpsat-explicit-prefix-reference-lib      # pass
npm run test:solver-experiment-contract               # pass
npm run test:write-solver-experiment-contract          # pass
npm run check:validators                              # pass (24/24 checks)
```

## Combine/recombine provenance

- Shard compute (real, not repeated): [35417717852](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35417717852), 20/20 shards succeeded, 581/581 cases, `4 live / 542 dead / 35 abstain`.
- First successful combine (post-fix, zero new compute, `recombine_run_id=35417717852`): [35420473468](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35420473468) -- identical summary; `lane_a_signature_collision_analysis` step printed the aggregate counts below.
- Reconfirmation combine (this task, same shard data, zero new compute, current `main` with mixed-group detail added to the analysis script's printed output): [35466554891](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35466554891) -- identical summary and mixed-group detail; confirms the result is stable and reproducible from the same frozen shard artifacts.

No CP-SAT query was re-executed at any point in this task; both post-fix combines only re-read the 20 already-uploaded shard artifacts from run 35417717852.

## Analysis result

`summarizeSignatureCollisions` over the 546 decisive (`live`/`dead`) rows, grouped by true C0 signature (`levelId` + sorted `cutCells`), `independentUnit = levelId`:

| | |
|---|---:|
| Total rows | 581 |
| Decisive rows (live/dead) | 546 |
| Abstain rows (timeout/abstain) | 35 (6.02%) |
| Correctness/input alarms | 0 |
| Distinct C0 signatures | 144 |
| Multi-member groups (>=2 rows) | 143 |
| Rows in multi-member groups | 545 |
| Independent parent levels across multi-member groups | 98 |
| Largest group | 5 rows |
| **Mixed groups (live and dead on the same cut)** | **2** |
| Rows in mixed groups | 8 |
| Same-parent mixed groups | 2 |
| Cross-parent mixed groups (rows of *one* group spanning >1 level) | 0 -- expected, since a C0 signature already includes `levelId` by construction |

**Mixed-group detail** (from the reconfirmation run's printed output):

| Signature | Level (independent parent) | Rows | Labels |
|---|---|---:|---|
| `R02525:196620,327686` | R02525 | 4 | dead, live, dead, live |
| `R02345:65540,196612,393218` | R02345 | 4 | dead, live, dead, live |

The mixing is small in absolute count (8/546 decisive rows, 2/143 multi-member groups) but **reproduces across two distinct independent parent levels** (R02525 and R02345 share no ancestry): each group's own C0 signature -- geometric cut identity alone -- is provably insufficient to determine exact whole-prefix completion outcome, since two prefixes crossing the *identical* `cutCells` set on the *same* level land on opposite outcomes. This is a decisive falsifier for the C0 contract layer under this program's own precommitted rule ("mixed... reproducing across multiple independent parents"), not an ambiguous or sparse result: the 6.02% abstention rate is low and does not obscure the signal, and 0 correctness/input alarms means every decisive label is trustworthy per this pipeline's referee/legality checks.

## Decision (per the preflight's frozen decision rule)

Applying `reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md`'s "Decision rule, fixed before dispatch" verbatim:

- **C0 mixed on a non-trivial number of soundly-labelled rows, reproducing across multiple independent parents** -- matches: 2 independent-parent levels (R02525, R02345) each show live/dead mixing on repeated crossings of one identical cut. This is the branch the preflight itself called the expected outcome ("existing evidence makes sufficiency unlikely").
- Per that rule: **stop C0 as insufficient. Proceed to precommit C1 (boundary kinematics) as a separate follow-on pass over the same frozen 581-case population** -- not a resampling, and not a promotion of C0 to any consumer.
- The "C0 pure" and "sparse/too-many-UNKNOWN" branches do not apply: C0 is not pure (2 mixed groups exist), and abstention (6.02%) is well below any sparse-support threshold that would block a conclusion.

No promotion, nomination, or production consumer is authorized by this result. C0's minimal geometric-cut-identity signature is falsified as insufficient for exact-outcome determination; the separator/decomposition premise itself remains open pending C1.

## Constraints honored

- No reinterpretation of the mixed outcome as anything other than "expected, proceed to precommit C1."
- No promotion of any pure subpopulation to a decomposition engine, region DP, or production consumer (C0 is not pure; this branch does not apply here regardless).
- No CP-SAT query was re-executed; both combines reused run 35417717852's already-uploaded shard artifacts via the `recombine_run_id` recovery path.
