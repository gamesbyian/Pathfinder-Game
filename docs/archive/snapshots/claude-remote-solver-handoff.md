# Claude remote solver handoff

Current as of **2026-08-11** after the revised neighbor-budget population A/B, the first explicit-prefix CP-SAT run, and the level-blind capability reconciliation.

Read first:

- [`solver-level-blindness.md`](solver-level-blindness.md)
- [`future-work.md`](future-work.md)
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)
- [`../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md)

## Non-negotiable capability rule

Pathfinder's solver must treat every level as unseen. The level editor cannot supply historical winning configs, seeds, gates, hints, solutions, previous solved status, or attempt caches for a newly created level. Therefore no production/capability experiment may use exact-level history.

The principal workflow `.github/workflows/solver-stress-refresh.yml` is now level-blind by construction. Do not add `--prime-winner`, `--baseline`, baseline-derived priority/budgets, saved-hint guidance, or exact-level caches back into that workflow.

`portfolio-solve-sweep.mjs --prime-winner` remains only for explicit historical re-verification/replay research and must not produce a headline capability number.

## Completed remote jobs

### A. Revised `PRUNE_MC_NEIGHBOR_BUDGET` full C2 A/B — COMPLETE

Runs:

- control #32 / id `31537140410`;
- treatment #33 / id `31537474435`.

Actual shard solver SHA in **both arms**: `c86ba8f86192801176b1e6c5fece3b120850df44`.

Result:

- C1: 94/102 → 94/102;
- C2: **611/1700 → 665/1700**;
- **+54 net, 59 gained / 5 lost**;
- C2 nodes: 43,017,428,195 → 41,320,735,149 (-3.94%);
- C2 work: 59,668,825,637 → 56,486,598,535 (-5.33%);
- zero C2 attempt errors and zero deadline truncations.

Lost IDs: `R00635`, `R02119`, `R02422`, `R02823`, `R02867`.

Do **not** dispatch another unchanged full A/B. The population gate has been paid for. The next neighbor-budget job is narrow five-loss diagnosis / equal-work integration design.

The old 725→739 result is historical re-verification evidence from a `--prime-winner` workflow. Do not use 725 as the solver capability baseline.

### B1. First explicit-prefix CP-SAT labels — COMPLETE

Workflow: `.github/workflows/cpsat-explicit-prefix-oracle.yml`

Run id: `31537268571`.

Default atlas-abstain batch result:

- 12 cases;
- 7 dead;
- 1 live (`R00001:42:child-[5,6]:3`, OPTIMAL, referee-valid witness);
- 4 abstain, all R00039 `unsupported-mechanics`;
- 0 correctness alarms;
- 0 input alarms.

Do **not** rerun these 12 unchanged.

## Remote jobs still useful

### B2. Extinction-adjacent exact-prefix CP-SAT expansion

Goal: label a bounded, informative set of same-parent siblings near actual score/width winning-lineage extinctions.

Use `.github/workflows/cpsat-explicit-prefix-oracle.yml` with a committed generic case file:

```json
{
  "corpus": "data/stress/stress-levels-random.json",
  "cases": [
    { "id": "...", "levelId": "R.....", "prefix": [[1,1],[1,2]], "child": [2,2] }
  ]
}
```

Coordinate rule:

- explicit `[x,y]` / `{x,y}` entries are raw-level **1-based** coordinates;
- packed numeric solver keys, when extracted by the tooling, are internal zero-based and are converted before the oracle call.

Dispatch inputs:

- `cases_file=<committed case file>`;
- `case_format=cases`;
- `corpus=` blank if each case/file already supplies it;
- `time_limit=60` initially;
- `max_cases=<bounded case count>`.

Keep `live`, `dead`, and `timeout/abstain` distinct. Unsupported mechanics are abstentions, not dead branches. Treat any native-prefix or referee alarm as a correctness blocker.

The purpose is to test neutral future-opportunity descriptions against exact feasibility, not to hard-code labels or per-level behavior into the solver.

### C. Exact repair-retreat CP-SAT

Use the same explicit-prefix workflow and generic case format. Build bounded retreat prefixes from retained repair elites, coarse-to-fine or binary where practical.

Question: how far back must the elite be rolled before an exact valid continuation exists?

Do not interpret the earlier longest-common-prefix rollback pilot as minimum edit distance. Known solutions are incomplete and that pilot was only a demonstrated distance to a known solution-bearing prefix.

### D. Main-loop late-reserve full population A/B

Now unblocked because neighbor-budget's population gate is complete.

Workflow: `.github/workflows/solver-stress-refresh.yml`.

The workflow itself is level-blind. It has **no `prime_winner` input** and does not pass a solver baseline.

Common inputs for all arms:

```text
corpus2_budget_ms=86400000
corpus2_node_budget=36000000
corpus2_workers=1
persist_hints=false
corpus1_budget_ms=86400000
corpus1_node_budget=50000000
corpus1_workers=1
deterministic=true
disable_flags=
main_loop_late_reserve_config_count=4
```

Control:

```text
enable_flags=
main_loop_late_reserve_fraction=
```

Treatments, one arm each:

```text
enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE
main_loop_late_reserve_fraction=0.05
```

then `0.10`, then `0.15`.

Schema-v2 preflight manifests must capture the full workflow input set. Allowed workflow differences are only:

- `enable_flags`;
- `main_loop_late_reserve_fraction`.

`main_loop_late_reserve_config_count=4` is identical in control and every treatment.

Accept only complete 1700/1700 + 102/102 arms. Compare actual report `commitSha` as well as dispatch metadata. The hardened workflow pins `github.sha`, so a mismatch is now a correctness failure rather than something to reconcile after the fact.

## Neighbor-budget next step, not another population rerun

Analyze the five losses from the completed revised A/B. Determine whether they share a deterministic frontier/order/budget mechanism.

Any proposed recovery must satisfy all of these:

- generic, not level-ID-specific;
- uses only level/current-invocation information;
- no exact-level winner/hint replay;
- equal total canonical work against the control;
- preserves the 59-gain upside as much as possible while eliminating or reducing the five losses.

A bounded complementary/fallback lane is a candidate design, but it must share the same total work envelope. Giving it another full 48.24M work budget would not be a fair promotion experiment.

## Interpretation after first CP-SAT labels

Winning-lineage forensics already said score representation was a stronger lead than exact ties or merely widening the beam. The CP-SAT labels strengthen that: at least one sibling ranked first at an R00001 parent is exact-infeasible while a known-valid continuation exists from that parent.

Do not jump straight to a new score. First expand the exact-label set around real extinction events, then test neutral descriptors. A secondary structural-family reservoir/quota remains a possible narrow experiment only after the exact labels say what property the current score is missing.

## Workflow hygiene

- Principal capability workflow: level-blind only.
- Saved hints/provenance: output-only, still persistable after a solve.
- A/B arms: use `deterministic=true`, `persist_hints=false` so queued arms cannot mutate the shared/interpretive state (hint corpus, canonical baselines) between measurements. This still leaves a small, run-id-namespaced analysis summary committed under `reports/stress/capability-runs/<run_id>/` (2026-08-15+) -- it is written once per run to a path unique to that run and never read back into any solve, so it cannot affect a queued arm's measurement; it exists specifically so a run's full per-level breakdown is available via `git`/the GitHub API without depending on the uploaded Actions artifact (Azure blob storage downloads have been observed blocked by at least one sandbox's egress policy).
- Actions checkout: immutable `github.sha`.
- Historical `logs/stress-corpus2-baseline.json` currently contains a malformed/empty compiled baseline from an intervening refresh; this is no longer a solve input. A complete non-deterministic level-blind refresh will regenerate it.
- Do not rewrite old observational `solverRef` values merely because some historical emitter SHAs no longer resolve. Preserve the provenance blemish honestly.

## Remote order

Population experiments should still serialize when one promotion changes the configuration used to interpret the next. Oracle/observational work can run alongside them.

Recommended order now:

1. neighbor-budget five-loss diagnosis and integration plan;
2. B2 extinction-adjacent CP-SAT labels;
3. C repair-retreat CP-SAT;
4. D late-reserve full population A/B.

B2/C can be dispatched while 1 is being analyzed; D is also technically unblocked after this workflow-hardening merge, but interpret it against the production/default flag state that actually exists at dispatch time.
