# Evidence-driven solver scheduling and allocation

> **Status:** **ASAP / HIGH PRIORITY ACTIVE PROGRAM**.
> **Objective:** replace continued fixed-ladder accretion with level-blind, evidence-driven ordering and bounded allocation that maximizes marginal solves per unit `workSpent` while preserving important capability.
> **Authority:** implementation behavior remains [`solver-architecture.md`](solver-architecture.md); research rules are [`solver-research-operating-model.md`](solver-research-operating-model.md); budget semantics are [`solver-budget-determinism.md`](solver-budget-determinism.md); ranked execution is [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Why this program exists

Recent gains repeatedly came from adding a late attempt or whole-ladder retry so already-solved levels exited before the new work. That is a useful regression-control technique, but it does not scale as architecture. Every successful addition can become another tax paid by the hardest unsolved levels.

The technique census also showed that production sometimes misses cheap capability already present in the solver, while several named techniques are operationally close relatives. The problem is therefore no longer merely “invent another technique.” It is **algorithm selection, configuration, and resource allocation**.

The runtime question should become:

> Given this unseen level's legal features, what has happened in this solve so far, the candidate actions still available, and the remaining shared work budget, which action or continuation has the highest expected marginal value next?

## Governance rules

1. **Adding an action expands the menu, not the default total budget.** New actions normally displace weaker residual work or are conditionally selected.
2. **Schedule actions, not names.** The unit is `technique/config + flags/mode + budget quantum + eligibility/dependencies`, not a marketing label for a profile.
3. **A continuation must re-earn its budget.** Reaching an early tranche does not automatically entitle the same technique to every later tranche.
4. **Use `workSpent` across techniques.** Raw nodes remain within-technique diagnostics.
5. **Dead-last zero-regression placement is not economic evidence.** Existing retry tiers remain current baselines but are subject to repricing, decomposition, shrinking, conditioning, reordering, or removal.
6. **Level-blindness is necessary but not sufficient.** Scheduler rules tuned on Corpus 2 or a family trove require untouched/grouped confirmation before broad generalization claims.
7. **Unexplained predecessor-stage dependence blocks scheduler inference.** If an action behaves differently fresh vs after unrelated stages, diagnose mutable state/accounting first.
8. **Do not hand-author a large configuration family when systematic configuration can answer the question more efficiently.** Use racing/successive elimination or an offline configurator where feasible.

## Runtime information boundary

Allowed runtime inputs include generic level structure and telemetry produced during the current solve: grid/area/density, `reqLen`, `reqInt`, mechanic counts/layouts, topology/connectivity descriptors, distances, gate/config attempted, exhaustion vs budget stop, current `workSpent`, objective progress, repair trajectory, and bounded frontier/retention signals shown useful in production.

Forbidden steering remains exact identity/corpus position, saved solutions/hints, historical solved status, prior winner/config/seed/order, per-level historical budgets/timing/badness, and family/variant outcomes. Offline research may use these as labels to discover generic legal descriptors.

## Current evidence that shapes allocation

The 2026-08-23 census/budget analysis establishes several durable facts:

- beams are often cheap/self-exhausting screens; their problem is frequently ordering/reach, not entitlement to huge depth;
- plain repair has real 20M-50M depth value and cannot be globally chopped to an easy-level median cap;
- deep ordinary DFS/IDA is a stronger overspend nomination because much of its hard-population work is reproduced elsewhere;
- admissible-order profiles have unequal value and some historical sequence dependence, so cap changes need real-ladder validation;
- `ida:none` appears more distinct at deep budgets than the other canonical admissible profiles;
- the hard residual population has materially deeper required budgets than the easy/production-solved population;
- cheap isolated winners being omitted by production proves that routing/allocation can matter as much as new search capability.

See [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md) and [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md).

## Action registry

Create one stable registry of meaningful candidate actions. Each action should identify:

- search family/engine;
- config/template/width/direction/seed/restart mode;
- relevant ablation or retention flags;
- budget quantum or continuation band;
- eligibility/dependencies;
- whether it is a fresh action or continuation;
- operational family/cluster when measured;
- current production status.

Do not proliferate permanent profile names simply to encode combinations. The registry should make the parameter space machine-readable enough for analysis and configuration search.

## Automatic configuration and racing

The scheduler program should use algorithm-configuration methods as **offline discovery machinery**, even if the final production policy is simple and deterministic.

### What to configure

Candidate dimensions include scoring weights/profiles, template geometry, direction, beam width/diversity, admissible tie-breaks, seeds/restart policy, eligibility thresholds, and budget tranches.

### How to search

1. define legal conditional parameter ranges and stable config IDs;
2. screen on a bounded development population;
3. use racing/successive elimination so clearly inferior configs stop receiving levels/budget;
4. optimize **marginal portfolio value**, not standalone solve count;
5. account for work and censoring, not just wins;
6. confirm selected candidates on data not used to select them;
7. prefer a compact production action set over retaining every explored configuration.

An external configurator is optional. The required idea is systematic search and early elimination, not a particular package.

## Offline scheduler analysis

Before a live scheduler changes production order, build the following views from current evidence.

### Residual-value table

For every material action/context report:

- eligible/reached population;
- solves and unique marginal solves;
- solve hazard by work band;
- work quantiles on solved and failed cases;
- conditional success after common predecessor failures;
- outcome overlap/substitution;
- operational similarity/difference where measured;
- current production reach and starvation/overspend status;
- evidence freshness/provenance.

### Oracle frontier

Estimate the best solve-vs-work frontier possible from measured action cells under fixed envelopes. Start with perfect static routing; add sequential residual routing where the data are causally comparable.

This is a value-of-information gate. If even an oracle selector cannot materially beat the live policy at fixed work, do not build a complicated scheduler.

### Tail audit

Audit all current additive/retry stages on the current baseline. For each, ask:

- how often is it reached;
- current unique residual solves;
- total and conditional `workSpent`;
- which narrower actions actually produce those wins;
- whether upstream improvements have made it redundant;
- what earlier work could replace it at equal cost.

Whole-ladder retries deserve special scrutiny because one stage name can fan out into many expensive attempts.

## Generalization protocol

Scheduler development has a high overfitting risk because it selects among many actions and thresholds using repeatedly mined data.

Use three evidence roles where feasible:

1. **Discovery/tuning:** current stress/census/family evidence used to generate rules and configure actions.
2. **Confirmation:** untouched or grouped-held-out levels used after the candidate is selected.
3. **Transfer/challenge:** locked or freshly generated levels not inspected during policy design, used for broad claims.

Variant siblings remain grouped by parent. A holdout becomes development data once its exact failures repeatedly influence policy and should then be replaced/reclassified.

Until a locked transfer population exists, report Corpus-specific improvements as such.

## Scheduler generations

### Generation A: static scheduler

Use only legal static level features and a fixed aggregate work envelope. Rank candidate actions and budget bands deterministically. Existing archetypes are baseline features, not the final routing language.

This generation should already answer whether current cheap screens, repair depth, redundant deep DFS/IDA, and retry-tail work can be better allocated.

### Generation B: dynamic re-ranking

After Generation A demonstrates value, update priorities using telemetry generated by the current solve: exhaustion, progress, repair plateau shape, frontier/retention pressure, objective/resource state, etc. Add telemetry only for a concrete scheduling hypothesis.

The target quantity is conditional marginal value, not global technique strength.

### Generation C: typed producer → scheduler signals

Only after measured evidence shows one stage emits information another action can exploit should a typed artifact enter scheduler state. Follow the producer/receptor contract in [`solver-research-operating-model.md`](solver-research-operating-model.md); do not create an unconstrained blackboard.

## Architecture seam

Keep strategic policy centralized:

- `stage-policy.ts`: stable stage/action metadata;
- `attempts.ts`: candidate action definitions and static features;
- `stage-plan.ts`: eligibility and ordering/planning;
- `stage-budget.ts`: shared work envelope, tranches, protected minima;
- `orchestration.ts`: execution and telemetry feedback, not policy sprawl;
- `stage-executors.ts`: execute an action without owning global ordering.

The migration should reduce first-match hand-authored bundle logic rather than put another policy layer beside it.

## Promotion path

1. **Preflight:** verify run identity, population, action IDs, deterministic work envelope, and discovery/confirmation role.
2. **Offline oracle/frontier:** establish plausible value before framework work.
3. **Shadow plan:** legacy scheduler still executes while the candidate scheduler records its choices without changing search/order/randomness/work.
4. **Matched-work A/B:** scheduler drives an explicit population under `strictTotalWorkBudget` or another declared fixed envelope.
5. **Confirmation:** use data not involved in selecting the policy/configuration; family-group when relevant.
6. **Transfer:** check published/Corpus 1/2 and locked/fresh challenge data appropriate to the claim.
7. **Report:** paired gains/losses, `workSpent`, wall time, reach, selected actions, budget bands, truncation/errors, and residual unique wins.
8. **Reprice continuously:** an action's historical win count is not permanent budget entitlement.

## Immediate execution order

1. Resolve the P0 fresh-vs-predecessor stage-dependence issue for any action whose isolated/live evidence conflicts.
2. Join current production lifecycle reach and `workSpent` to existing cap/tranche census outputs.
3. Define stable action IDs and expose the current configuration space without creating new named profiles.
4. Compute fixed-work oracle frontiers and current retry/tail economics.
5. Build a simple racing/successive-elimination harness over existing action/config data for offline candidate pruning.
6. Prototype Generation A static scheduling under strict total work.
7. Shadow and matched-work A/B it.
8. Establish untouched confirmation/transfer evaluation before claiming broad generalization.
9. Add dynamic telemetry only after static scheduling demonstrates value.

Do not let scheduler infrastructure become a large project before the oracle-frontier gate proves headroom exists.

## Relationship to speed research

Scheduling reduces unnecessary work; architectural optimization reduces the cost of work still worth doing. Keep the evidence separate:

- scheduler comparisons use machine-independent work;
- pure-speed changes preserve search work/decisions when claiming order preservation;
- wall speed must not alter scheduler allocations;
- doing less work is not itself an implementation speedup.

See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).
