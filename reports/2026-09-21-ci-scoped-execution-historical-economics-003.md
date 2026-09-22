# CI scoped execution historical economics 003

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — the 27-PR historical backtest was translated through the current validation planner and execution-lane packing to quantify modeled runner/capability savings.
> **Decision:** scoped execution has enough modeled economic value to justify rehearsal, while these numbers remain modeled rather than measured runtime savings.
> **Remaining gate:** validate the execution plan in a controlled dry run and preserve fail-closed final-status semantics before activation.

> **Inputs:** current validation ownership, validation planner, execution-plan packing, and `historical-backtest-002`.

## Question

What would the current scoped execution model actually remove from the recent PR workload, beyond merely producing nicer semantic labels?

## Historical runner consequence

The 27-PR backtest contains 18 scoped candidates and 9 earned full-impact changes.

Under the current conservative execution plan:

- **16/27 PRs (59%)** would skip the entire `deep-verification` hosted runner.
- **11/27 (41%)** would require the deep runner.
  - 9 are full-impact.
  - #1947 requires solver coverage/proofs.
  - #1940 reaches `shared`, which conservatively requires covered implementation tests.
- No scoped candidate in this sample has persistence impact; therefore **18/27** would avoid the Firestore boundary, while the 9 full-impact changes still exercise it.

This is the largest immediate wall-time/runner-saving opportunity because skipping the deep lane also avoids its checkout, setup-node, dependency install, and (when irrelevant) Java/Firestore setup rather than merely making those steps faster.

## Expensive-capability consequence

| Capability | Would run | Would skip | Notes |
|---|---:|---:|---|
| production build | 10/27 | **17/27** | 9 full + #1947 solver |
| solver capability canary | 10/27 | **17/27** | same initial boundary as build |
| covered ordinary implementation population | 11/27 | **16/27** | full + #1947 solver + #1940 shared |
| heavyweight solver proofs | 10/27 | **17/27** | full + #1947 solver |
| Firestore emulator boundary | 9/27 | **18/27** | only full-impact changes in this sample |

These counts are historical-model consequences, not runtime measurements. They do not claim a specific minutes-saved value.

## Fast-lane population consequence

The current permanent populations are:

- 28 semantic validators;
- 165 Node/CLI harnesses.

Representative selected populations:

| Surface set | Validators | Node/CLI harnesses | Deep lane |
|---|---:|---:|---|
| research only | 3/28 | 81/165 | skip |
| repo only | 10/28 | 9/165 | skip |
| repo + research | 13/28 | 90/165 | skip |
| data + repo + research | 18/28 | 123/165 | skip |
| repo + research + shared | 15/28 | 115/165 | coverage only |
| repo + research + solver | 15/28 | 104/165 | coverage + proofs |
| full | 28/28 | 165/165 | all capabilities |

This is intentionally not maximally aggressive. Research-system work still exercises a large research contract population, and lint remains universal. The first routed implementation aims to remove clearly unrelated work, not to solve test selection perfectly.

## Interpretation

The expected win is not primarily "run fewer tiny validators." It is:

1. avoid an entire second installed-dependency runner on the common research-only path;
2. avoid production build and solver canary on non-production changes;
3. avoid heavyweight solver proofs except for solver/full-impact work;
4. avoid Java/Firestore except for persistence/full-impact work;
5. shrink the Node/validator population while keeping substantial research contracts on research changes.

The model therefore still has useful headroom even if bounded `test:node` concurrency produces no speed improvement at all.

## Safety context

All numbers above are generated from the conservative current model:

- unknown/router/workflow authority => full;
- validation aggregate edits => full;
- production solver changes propagate downstream to research;
- `shared` still requests covered implementation tests;
- no proof-level solver selection;
- lint remains universal.

Do not increase savings by weakening these boundaries merely to improve the percentages.

## Next evidence

The next empirical questions remain:

1. real shadow decisions on non-router PRs;
2. end-to-end manual `ci-scoped-dry-run.yml` runs on representative research/solver/full cases;
3. bounded Node concurrency benchmark repetitions.

Only those measurements should drive activation or further execution optimization.
