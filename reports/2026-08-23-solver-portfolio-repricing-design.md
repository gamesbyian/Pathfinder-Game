# Solver portfolio repricing design

> **Status:** active
> **Last evidence:** 2026-08-23 — current technique-census cap/tranche analysis, lifecycle/work accounting, scheduling policy, operational taxonomy, and retry/tail review
> **Decision:** the first scheduler deliverable is an offline fixed-envelope repricing of existing actions and continuations, followed by a deliberately simple static-policy baseline; do not build a dynamic/ML scheduler before this establishes material headroom and need
> **Remaining gate:** build the current action × reached-population × `workSpent` × cap/tranche residual-value table and compute fixed-envelope oracle/Pareto headroom; then report how much of that headroom a simple deterministic policy captures
> **Evidence role:** tuning
> **Selection:** observational — design was motivated by the heavily mined current Corpus-2 technique census, current production lifecycle telemetry, and existing promoted retry behavior

## Question

Can the current solver obtain more cold level-blind solves, or the same solves for less machine-independent work, by **repricing and reallocating existing search actions** rather than adding more default tail work?

This is the concrete first experiment beneath [`docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md). The policy document defines the durable architecture and evidence rules; this report prespecifies the first decision-bearing analysis so the scheduler program does not become a framework project before its value is demonstrated.

## Why this experiment comes first

The current solver already has:

- cheap/self-exhausting beam screens;
- deep repair with measurable late yield;
- several ordinary DFS/admissible configurations with overlapping capability;
- a distinct-looking deep `ida:none` candidate;
- promoted late retries that add real solves but also add tail work;
- cheap isolated wins that production sometimes fails to offer/reach;
- current `workSpent` accounting suitable for cross-technique allocation; and
- enough operational/census tooling to study action overlap without inventing another broad census.

That creates an allocation problem before it creates a need for a sophisticated scheduler.

The critical counterfactual is:

> At the same total `workSpent`, how much better could the current action menu perform if its work were ordered, truncated, continued, or displaced more intelligently?

If the answer is “not much,” the scheduler should remain simple and engineering should move elsewhere. If the answer is “a lot,” the size and shape of the gap determines what scheduler complexity is justified.

## Non-goals

This experiment does **not**:

- add a new solver technique;
- append a new dead-last retry;
- train a high-dimensional level classifier;
- use exact level IDs, known winning configs, family outcomes, or historical solved status at runtime;
- treat the current census oracle as an unbiased forecast;
- require a new database or telemetry store;
- optimize wall time as the allocation currency; or
- prove generalization beyond the development population.

## Unit of analysis: action, not technique name

An action is the smallest scheduler-relevant unit whose marginal value can differ materially:

```text
search family / engine
+ configuration / template / width / direction / seed mode
+ relevant flags
+ eligibility/dependencies
+ budget tranche
+ fresh-vs-continuation identity
```

Examples include:

- a cheap beam run at one width/config;
- the first 2M work of a repair configuration;
- continuing that same repair configuration from 2M → 5M;
- `ida:none` at a specific work band;
- the current late legacy-distance retry decomposed to the actual winning action(s) rather than a whole retry bundle;
- the second deterministic repair seed as a distinct action when seed diversification is the mechanism.

A profile label alone is insufficient when budget depth, retry context, or seed changes operational value.

Stable action/config identity should reuse existing config keys/lifecycle metadata where possible. Do not create permanent public profile names merely to make the matrix rectangular.

## Inputs

Start from existing rebuildable sources.

### Required

1. **Current production lifecycle telemetry**
   - stage/action/config identity;
   - reached/eligible counts;
   - `workSpent` by attempt/stage;
   - solved/failed/exhausted/budget-stop state;
   - current retry/tail participation.

2. **Technique-census cap/tranche outputs**
   - solve status at `100K/250K/500K/1M/2M/5M/10M/20M/30M/40M/50M`;
   - late conditional solve hazard;
   - isolated outcome overlap/substitution;
   - known duplicate/near-duplicate action nominations.

3. **Current production capability baseline**
   - current-code, level-blind;
   - deterministic work where decision-bearing;
   - comparable run identity.

4. **Operational-similarity evidence where already measured**
   - use to explain redundancy/complementarity;
   - do not require tracing every pair before the first frontier.

### Optional, only when decision-relevant

- compact static level features for the simple-policy phase;
- family/group identity for grouped resampling or confirmation design;
- exact/reference labels for diagnosing surprising frontier cells, not for runtime routing;
- historical artifact evidence only after current-code comparability is established.

## Data contract

The first durable output should be a rebuildable action-level table, not prose assembled by hand.

Minimum columns:

| Field | Meaning |
|---|---|
| `actionId` | stable research identity |
| `family` | beam / DFS / admissible / repair / other |
| `configKey` | current configuration identity |
| `budgetFrom`, `budgetTo` | tranche boundaries in `workSpent` |
| `freshOrContinuation` | whether the tranche starts fresh or continues prior state |
| `eligibility` | generic prerequisites |
| `productionReachedN` | current count that actually reaches the action |
| `productionSolvedN` | current solves attributable to it |
| `productionWork` | aggregate/quantile `workSpent` when reached |
| `isolatedEligibleN` | census population with comparable action cell |
| `isolatedSolvedN` | solve count by tranche/cap |
| `uniqueResidualN` | solves not reproduced by cheaper/current predecessor set under the chosen analysis |
| `evidenceFreshness` | current / historical / mixed |
| `sequenceComparable` | yes/no/unknown |
| `uncertaintyN` | independent denominator used for intervals/resampling |

Do not fill missing cells with failure. Missing/unmeasured, unsupported, deadline-truncated, and genuine exhaustive failure remain distinct.

## Phase 0: validity exclusions

Before computing a causal-looking frontier:

1. exclude or separately flag admissible-order cells whose interpretation depends on the unresolved stage-history P0;
2. reject stale-code joins that cannot recover action/config/budget identity;
3. distinguish isolated capability from observed sequential marginal value;
4. ensure cross-technique cost uses `workSpent`, not raw nodes;
5. identify additive retry bundles whose internal actions must be decomposed before pricing;
6. mark census-derived values as development/tuning evidence.

This phase is allowed to make the first frontier incomplete. A smaller honest action set is better than a complete table containing false comparability.

## Phase 1: current tail audit

For every current additive/retry stage, report:

- reach count and rate;
- total/median/p90/p99 `workSpent` when reached;
- current unique residual solves;
- narrower internal action that actually produced each win;
- cheaper/current actions that reproduce those wins in isolated evidence;
- whether upstream improvements have made the stage partly redundant;
- uncertainty around tiny unique-win cohorts;
- the same-cost alternative work it displaces in a fixed-envelope scenario.

Priority targets include promoted late repair, non-default admissible retry, connectivity-axis retry, must-cross retry, legacy-distance retry, multi-seed repair, and any whole-ladder retry currently surviving in production.

The point is not to delete successful retries reflexively. It is to remove **permanent budget entitlement** from history.

## Phase 2: cap and continuation repricing

Treat later budget bands as separate continuation actions.

For each action family/configuration estimate censored conditional yield such as:

```text
P(solve in 2M→5M | reached 2M unsolved)
P(solve in 5M→10M | reached 5M unsolved)
...
```

Report both:

- incremental solves produced by the tranche; and
- incremental `workSpent` consumed by all cases entering that tranche.

A tranche with rare unique hard solves may remain Pareto-relevant even if its average ratio is poor. Conversely, a tranche that contributes no unique residual capability and is dominated on both solve and work dimensions is a strong displacement candidate.

Repair must be analyzed separately from ordinary DFS/IDA because existing evidence shows genuine deep repair yield. Do not infer a global cap from the easy/production-solved median.

## Phase 3: fixed-envelope oracle frontier

Compute an optimistic ceiling from the measured action cells under several explicit total-work envelopes.

At minimum report:

- current production point;
- same-work maximum measured solve coverage under perfect static selection where cells are comparable;
- cheaper envelopes that preserve most/all current measured coverage;
- higher envelopes only as an explicit capability/cost tradeoff, never as free gain;
- rare/exclusive solves lost along the cheaper frontier;
- sensitivity to missing cells and uncertainty;
- a version excluding sequence-ambiguous actions.

The oracle is deliberately optimistic because it is constructed from the same development matrix used to inspect action performance. Its job is **headroom detection**, not forecasting.

### Primary gate

The scheduler program earns further implementation only if the fixed-envelope oracle shows material headroom over current production.

No single numeric threshold is prespecified because the current work envelope and uncertainty still need to be rebuilt consistently, but the report must make the decision explicit. “There is some theoretical gain” is not sufficient. The gain must be large enough to repay policy complexity, validation, and maintenance.

If the oracle headroom is small, close/demote dynamic scheduler work and retain only obvious dominated-tail cleanup/reordering.

## Phase 4: simple static policy baseline

Before a learned/dynamic policy, test deliberately simple policies using only legal static features and current action metadata.

Required baselines:

1. **global repriced order** — no level features; reorder/truncate actions by current residual value;
2. **global order + tranche continuations** — same, but allow continuation decisions by measured late hazard;
3. **small feature/rule table** — only a few prespecified generic features where evidence strongly suggests action interaction;
4. **current production policy** — matched total work.

Do not begin by predicting “the winning technique.” The easier and more robust problem may be to put cheap screens earlier, cut dominated deep continuations, preserve measured deep repair, and condition only a handful of expensive residual actions.

### Complexity gate

A dynamic/learned scheduler is justified only if:

- oracle headroom remains material after the simple policy;
- the residual headroom appears correlated with current-solve telemetry or static features available legally at runtime;
- the simple policy is stable across grouped resamples/splits;
- added complexity has a plausible path to independent confirmation.

If a simple policy captures most measured headroom, ship/evaluate the simple policy and stop there.

## Rare capability protection

Average solve/work ratio must not silently delete the only action that solves a hard phenotype.

For every proposed removal/cap/reorder, report:

- current unique residual solves;
- isolated unique solves under comparable cells;
- whether uniqueness is robust across related configs/budgets or rests on one selected example;
- uncertainty and independent denominator;
- extra work required to preserve the capability as a protected late action;
- whether another action can substitute at equal or lower work.

A protected rare action is allowed when evidence supports it. “Rare” is not automatic immunity from repricing.

## Sequence-dependence handling

Historical `P(B solves | A failed)` is observational unless B is controlled fresh-vs-preceded under identical explicit input/config/seed/work.

Until the P0 admissible-order dependence is resolved:

- do not use its isolated-vs-live difference to estimate a causal cap or scheduler value;
- keep historical sequential evidence visible as nomination/upper-bound context;
- compute a frontier both excluding ambiguous cells and, if useful, including them as an explicitly optimistic sensitivity analysis.

If the P0 becomes an intentional typed handoff, the handoff becomes part of the action identity and its producer work must be charged.

## Confirmation and transfer

The frontier/simple-policy analysis is tuning evidence because current census/Corpus-2 evidence has been heavily mined.

A selected policy that looks positive must therefore move through the protocol in [`2026-08-23-solver-confirmation-transfer-protocol-design.md`](2026-08-23-solver-confirmation-transfer-protocol-design.md):

1. freeze treatment and acceptance criteria;
2. evaluate on untouched/grouped confirmation data;
3. only then use locked/fresh transfer evidence for broad unseen-level claims.

Do not inspect exact transfer failures and continue calling the same cohort transfer evidence for later iterations.

## Tooling rule

Use existing surfaces first:

- `technique-census-second-order.mjs` already produces cap/tranche economics;
- lifecycle telemetry already owns stage reach/work;
- existing config/action-key helpers own identity;
- operational-similarity tooling already exists for bounded pair study;
- current experiment manifests own comparability/provenance.

Create a new analyzer only for a repeated join/output that these surfaces cannot express cleanly. Do not create a new database for this experiment unless the actual join work proves that reusable helpers are insufficient.

## Deliverables

The first completed repricing report should contain:

1. action registry version and source refs;
2. intended/actual population and exclusions;
3. current tail economics;
4. cap/tranche residual-value table;
5. fixed-envelope Pareto/oracle frontier;
6. uncertainty/sensitivity, including sequence-ambiguous exclusions;
7. rare/exclusive solve table;
8. simple static-policy baseline;
9. selected policy, if any, with full selection disclosure;
10. explicit verdict:
   - **stop at cleanup/reorder**,
   - **promote simple static policy to matched-work A/B**, or
   - **measured residual headroom justifies dynamic scheduler research**.

## Stop conditions

Close or sharply demote the scheduler framework if any of these holds:

- comparable oracle headroom is small;
- simple static repricing captures nearly all useful headroom;
- apparent headroom disappears when equal `workSpent` is enforced;
- gains depend mainly on sequence-ambiguous/stale cells;
- rare capability losses erase the apparent average benefit;
- selected policy is unstable across grouped resamples/confirmation; or
- maintaining the action/config machinery costs more than the policy value it recovers.

A negative result here would be highly valuable: it would prevent another large framework from being built for a problem the existing static ladder already solves near the measurable frontier.