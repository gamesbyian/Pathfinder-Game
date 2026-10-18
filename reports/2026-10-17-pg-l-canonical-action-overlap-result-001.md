# PG-L canonical two-action basin overlap shadow result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — successful [Actions run 39091213935](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39091213935), exact source `15ffc65bbee4c378a8915ca2677f195fd5ceb916`; 16/16 observer-on/off comparisons matched on solution/status/work/nodes, zero deadline/correctness alarms.
> **Decision:** **real canonical-action overlap is measurable**, whereas the old malformed 100% overlap telemetry was not trustworthy. At fixed isolated gate, width-500 and 150k nominal work per action, `objectiveFirst` versus `intersectionHarvest` beam scorers overlap on **29.14% mean exact processed-parent-path Jaccard** across eight independent parents (range **13.53–77.05%**) and **27.82% deep exact Jaccard**. However their first-eight-move bucket overlap is **95.35%**. This is genuine descriptive repeated-path participation, not sound reusable proof identity, eligible production double execution, marginal saved work or a cold solve.
> **Remaining gate:** price a **cheap current-solve cross-action exposure/consumer seam**: verify the production portfolio actually dispatches both actions on a frozen miss/solved-control cohort and determine whether their identical full-history states repeat expensive *sound* facts which could be checked cheaply before rederivation. Only then consider a small matched-total-work no-harm A/B. The R02037 high-overlap outlier is a microscope, not a global rule. Do not revive old scalar divergence guards or loose transposition caching.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** discovery
> **Selection:** frozen pre-outcome SHA-256 parent sort; first eight parents, one current-input prepared gate each; two real scoring profiles, 500 beam width, 150k nominal canonical work per isolated attempt, with an exactly same-config collector-OFF control on every observed action.
> **Population identity:** Eight outcome-blind Corpus-2 parent levels R02781, R02676, R02929, R02579, R02024, R02857, R02037, R03004, selected once by salted SHA-256 from the frozen Corpus-2 SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.
> **Inference scope:** isolated same-gate, same-work development scoring-profile comparison, **not** an actual multi-stage production dispatch; the eight parent puzzle IDs, not tens of thousands of path rows, are the independent units.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-17","decision":"A genuine read-only observer with 16/16 exact OFF/ON parity checks sees mean processed-full-path Jaccard 0.2914 (range 0.1353 to 0.7705) and mean deep-path Jaccard 0.2782 over eight source-blind parents; shallow eight-move path-bucket Jaccard is 0.9535. A cross-action overlap phenomenon is established, without a sound reuse key or production saved-work conclusion.","remainingGate":"Check actual production two-action participation and whether expensive sound facts can be keyed before derivation at useful cost; only then a tiny matched-work consumer on independent current misses plus solved no-harm controls.","joins":{"researchQuestion":"WS2-CROSS-ATTEMPT-BASIN-OVERLAP","premiseRefs":["P067","P080","P081"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"Eight outcome-blind Corpus-2 parent levels R02781, R02676, R02929, R02579, R02024, R02857, R02037, R03004, selected once by salted SHA-256 from the frozen Corpus-2 SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.","selection":"first eight salted-sha256-selected Corpus-2 parents before observing technique outcomes, first canonical current-input gate, two fixed beam scoring profiles and equal nominal per-action canonical work","inferenceScope":"instrumented isolated beam action population overlap, no demonstration of source-hint independence of a production scheduler decision or cacheable cross-action proof"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-l-canonical-action-overlap-20261017-001.json","scripts/stress/pg-l-canonical-action-overlap-shadow.mjs"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP","WS2-SOLVE-LOCAL-REDISCOVERY"],"artifacts":[]},"prospective":{"expectation":"Distinct scoring actions may have substantial repeat deep search work, but historical overlap=1.0 was instrument-invalid and must not be assumed.","surprise":"Shallow eight-move bucket sets are nearly identical even when exact deep search diverges sharply; one outcome-blind parent R02037 has 77% exact processed-path overlap, while another R02024 has only 13.5%.","anomaly":"One earlier one-shot run failed ESM import compilation before processing any levels; it contributes no science."}} -->

## Why this answers an old real gap

The [September 13 archaeology](2026-09-13-solver-archaeology-overlap-restart-retention-006.md) showed that previous portfolio overlap instrumentation dropped canonical profile IDs and root-move scores on transport, producing a mechanically false `pairwiseStateOverlap=1`. An old guard/restart implementation then suffered separate participation/delivery failures; it was not a valid broad no-redundancy verdict.

The new [read-only observer](../scripts/stress/pg-l-canonical-action-overlap-shadow.mjs) uses the tested beam `_beamResearchObserver` parent-expansion surface rather than resurrecting the old audit conversion. The machine verdict preserves canonical scoring-profile IDs, parent IDs, prepared gate, nominal and observed work, expanded nodes, result status, observer-generated record counts, unique full-path set counts, deep path counts and hashed overlap identities. The full path hash represents the **entire packed path history** at a processed parent expansion. Prefix hash buckets of length four/eight are separately labelled **coarse descriptive markers**, never treated as states or cache keys.

The two profiles are real Pathfinder scoring policies, not fictional agents. They were run isolated under `width=500` and `workBudget=150000`, which is explicitly **smaller/different from the typical actual production menu**. The two calls do not share prep state or allocate work within one real production solve. Each ran once with the observer disabled and once enabled using independent `prepLevel`, both at the same source profile, gate, width, and work cap; **16/16 comparisons exactly matched** on found indicator, solution hash, status, workSpent and nodesExpanded. All 16 actions reached a work-budget phase boundary; no cold solves, truncation or clock-censoring were observed. Eight independent parents were outcome-blind selected from the full frozen 1,700-row Corpus-2 file.

## Observed source-matched overlap

| Independent parent | Exact processed-path Jaccard | Deep path Jaccard (depth 8+) | First-eight-move bucket Jaccard | Matched minimum parent-expansion work* |
|---|---:|---:|---:|---:|
| R02781 | 0.178 | 0.178 | 1.000 | 29,382 |
| R02676 | 0.219 | 0.216 | 1.000 | 22,595 |
| R02929 | 0.272 | 0.268 | 1.000 | 36,742 |
| R02579 | 0.244 | 0.214 | 0.923 | 42,012 |
| R02024 | 0.135 | 0.106 | 0.705 | 18,218 |
| R02857 | 0.257 | 0.229 | 1.000 | 35,455 |
| R02037 | **0.771** | **0.768** | 1.000 | **71,802** |
| R03004 | 0.255 | 0.245 | 1.000 | 33,229 |
| **Mean (independent parents)** | **0.2914** | **0.2782** | **0.9535** | not an independent effect statistic |

`*` For each identical complete parent-path hash, the observer takes `min(observed parent-expansion work in action A, observed work in action B)` and sums. Over all eight parents this descriptive matched minimum totals **289,435 work units** alongside **2,437,362 canonical units** spent across the 16 instrumented actions. These are **not** a promised saving, even a proven upper bound on net portfolio work: the same path can be necessary in two different ranking/frontier contexts, equivalent future computation was not formally established, cost to construct/check a key is unmeasured, and the true production scheduler might not execute both attempts. The present sum is an overlap *exposure marker* only.

Seven parents range from exact-path Jaccard 0.135–0.272; one parent, R02037, shows 0.771. These are not uniformly duplicate actions. By contrast six of eight parents have **identical first-eight-move prefix bucket sets** between scorers, and the other two still overlap 0.705 and 0.923. Early shared prefixes therefore dramatically **overstate** deep full-path similarity. Never use them to infer a sound transposition key or a decision to skip the second scorer.

The important result is the combination: (1) exact instrumentation parity, (2) real but highly heterogeneous repeated complete parent paths under distinct scoring actions, (3) shallow branch groups that overlap far more than genuine search work. It replaces an invalid historical 100% number with an interpretable, source-pinned development bound.

## What survives and what stops

**Survives:** the semantic PG-L premise that two legitimate solving actions may share meaningful work within the same puzzle; distinct scorer configurations are not guaranteed to explore nonoverlapping paths. The per-instance possibility from PG-M also survives, now with concrete observational overlap rather than only repeated puzzle IDs.

**Not earned:** production anti-redundancy, exact transposition across distinct attempts, general proof reuse, a new shared blackboard, workload repricing or solver improvement. Even a full-path match is not *yet* proven to be a safe, cost-recovering cached certificate for every mechanic/hard-prune state. We have not replayed the real scheduler to verify both arm actions are launched in the same invocation, nor observed an actually avoided derivation.

The next smallest consumer-adjacent question is therefore not to increase widths or portfolio budgets immediately. First join actual current production action participation to the same canonical profile/gate signatures on a frozen residual-and-solved-control population, and measure whether a cheap key can prevent a repeated **specific sound computation** (for example a static lower-bound/memo hit or mechanically pure rejected-child generation). Model both key cost and displacement of useful frontier diversity. If participation/cheap reuse is negligible, close the proposed policy form even though overlap exists.

## Provenance, reproducibility, closure

- Successful [Actions run 39091213935](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39091213935), exact tested commit `15ffc65bbee4c378a8915ca2677f195fd5ceb916`.
- Original artifact `12123116232` `pg-l-bounded-action-overlap-20261017`, ZIP digest `sha256:07e811996fb4ecce47563daf6a154b1fc442e0aa0b678ba4b8b361c8179d3d33`.
- The complete eight-parent, 16-arm source-ID/work-parity and hashed overlap ledger is committed as [machine evidence](stress/pg-l-canonical-action-overlap-20261017-001.json), including the full SHA-256 corpus identity and literal selected parent IDs.
- Run the maintained test `node scripts/run-bundled.mjs scripts/stress/pg-l-canonical-action-overlap-shadow.mjs -- --self-test`, then `--out=tmp/pg-l-overlap.json`. This is an isolated measured shadow, not a production default.
- An initial run 39091137291 failed module-import syntax before processing levels and was discarded. The successful run passed pure overlap tests and strict observer OFF/ON identity checks on all 16 actions. The one-shot workflow is retired before evidence integration.

This result asserts **zero new cold solves** and makes no behavior changes to production.
