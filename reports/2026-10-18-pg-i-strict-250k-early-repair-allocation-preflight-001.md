# PG-I strict-250k early-repair allocation falsifier (2026-10-18)

> **Status:** active
> **Last evidence:** 2026-10-18 — source-accurate fixed-control run 39171380197 and retained stage accounting
> **Decision:** execute one bounded, paired, source-identical, cold 250k-work falsifier of early-repair opportunity cost on the existing 12 historically resistant PG-I parents; no production policy is authorized
> **Remaining gate:** one 12-parent default-vs-early-repair-off strict-total 250k run, confirm execution/work/referee and any new cold solve; if no new solve, close this treatment form without wider dispatch
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Evidence role:** discovery
> **Selection:** fixed original PG-I 12-member hash-ranked cohort, reused after observing original 250k no-solve and original repaired 250k stage work
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Selection history:** PG-I selected 12 from 625 historically baseline-unsolved, T1-isolated-non-success/unknown Corpus-2 candidates by precommitted ID hash; selection for *this* question additionally conditioned on observing 9/12 early-repair budget monopolization and 0/12 default solves
> **Inference scope:** development evidence on twelve selected parent puzzles and a specific strict-total 250k regime, not representative population prevalence or a production-default improvement
> **Proposal provenance:** forensics of issue #2202 exact work-meter fix and the post-fix twelve-parent attempt-level source artifact

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-10-18","decision":"Execute an equal-work, hint-free twelve-parent early-repair-off development falsifier; no production action authorized.","remainingGate":"One source-identical 250k strict-total paired cold-control run on the twelve frozen PG-I parents","joins":{"researchQuestion":"WS2-VARIANT-RESPONSE-HARDNESS","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"historically resistant PG-I original twelve, retrospectively selected for this question after 250k stage starvation observation","inferenceScope":"twelve development parents only, source-identical strict-total 250k protocol"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-i-strict-250k-fixed-control-20261018.json"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":"early-repair-off will expose beam/main-work on parents previously fully consumed by repair; solve gain unknown","surprise":null,"anomaly":"nine of twelve frozen cold controls never reach main-search under strict 250k"}} -->

## Why now

Corrected strict-total work behaviour was independently verified in [run 39171380197](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39171380197), with every parent exactly 250,000 units, complete attempt accounting and zero source/referee alarms. Re-analysis of that **pre-treatment** result, counting stage `workSpent`, finds that 9/12 independent parents assign the *entire* 250k to `early-repair-search`, leaving zero real work to the other actions. Aggregated early-repair charges are 2,250,000/3,000,000 (75%). The other three parents expose the main search. Total attempts with zero work remain telemetry, never a counted distinct technique exposure.

The early-repair policy has previously shown legitimate benefit under other budget regimes. These observations only establish an allocation cliff **under immutable strict-total 250k** on historically resistant parents, and are not evidence that repair ought to be globally disabled.

## Frozen cheap falsifier

- Control: default current code `solveLevel`, `baseWorkBudget=250000`, `nodeBudget=250000`, `timeBudgetMs=600000`, `strictTotalWorkBudget=true`.
- Treatment: identical invocation except `ablation: {STRATEGY_EARLY_REPAIR_SEARCH:false}`. No other heuristics, scorer weights, beam widths, seed changes or historical inputs.
- Population: the same twelve literal IDs, source corpus checksum, and independent-unit parent. The script consumes only the ordered IDs from `reports/stress/pg-i-strict-250k-fixed-control-20261018.json`, not its outcome classifications or paths.
- One of each arm per parent at the same immutable source SHA, fixed order control then treatment. Do not change method identities based on observed outcomes or give the treatment additive/free work.
- Source identity, exact per-attempt and per-stage work totals, reached stages and stage outcomess, progress/termination, actual solution path when found, referee validity, work sum, and any overrun/error/deadline must be recorded.
- Read-only execution, a single runner, 24 cells / at most 6,000,000 canonical work. The evidence producer terminates and archives its artifact even if a validity gate fails.

**Primary advancement criterion:** at least one additional verified cold solve at actual <=250k work, with no control-only lost solve. Such a result earns a *new*, source-legal conditional early-repair work-allocation treatment, not direct default promotion; independent confirmation and a solved-control loss guard are mandatory.

**Stop negative:** treatment demonstrably reaches previously starved main-search on >=one parent but yields zero additional solves. Close this complete-off form for the frozen strict-250k cohort without another larger matrix. If the treatment cannot expose main due another budget/eligibility gate, stop as implementation/participation inconclusive, investigate only a cheap specific gate.

No hints, historical win labels or parent ID route the cold solver. The historical cohort identity is only offline experiment selection. Production code remains unchanged.
