# Solver work budgets and determinism

> **Status:** current contract; main-ladder allocation migration complete, additive-tier compatibility debt explicitly tracked.
> **Allocation policy:** [`solver-scheduling-policy.md`](solver-scheduling-policy.md); [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) owns rank and next gate.
> **Priority:** remaining budget-model completion is active queue item #2 and is a prerequisite to new scheduler repricing policy.
> **Current budget-depth evidence:** [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md).
> **History:** [`archive/snapshots/solver-budget-determinism-2026-08-20.md`](archive/snapshots/solver-budget-determinism-2026-08-20.md).

Solver allocation's canonical currency is machine-independent work. The main ladder is fully work-denominated. A bounded set of historical additive fallback/retry tiers still derives fresh work from ms-shaped stage fractions; those sites are compatibility debt, not the target model, and CI now prevents the set from growing.

## Work unit

[`../modules/solver/work-meter.ts`](../modules/solver/work-meter.ts):

```text
work = applyMove calls + 12 * isConnected calls
```

The fitted connectivity weight reduced DFS/beam/repair work-rate spread from ~11x under `nodesExpanded` to ~1.02x under `workSpent`. Raw nodes are comparable only within a technique.

`workSpent` is an allocation currency, not literal CPU cost: the weight fairly divides finite search across techniques but does not claim every `isConnected()` costs exactly 12 `applyMove()` calls. A pure implementation optimization may reduce wall time with unchanged work; a policy change may reduce work without making primitives faster.

Use pinned work for deterministic search-effort/policy comparisons. For hot-path speed, also report wall time and whether primitive cost changes. Matched work alone cannot prove an implementation speedup.

## Work scopes

Both counters use the same work unit:

| Counter | Scope / authority |
|---|---|
| `prep._workMeter.units` | Fresh per `solveLevel()`. Authority for internal caps, attempt allocation, and `SolveResult.workSpent`; concurrent solves cannot consume each other's budgets. |
| module-global `workMeter.units` | Monotonic realm/process total for discovery tooling spanning sequential black-box solves. Not a solve-budget authority. |

`applyMove()` and `isConnected()` increment both. Keep internal checks on `prep._workMeter`; cumulative tooling must not assume the global counter is session-isolated when unrelated solves can coexist. Isolated multi-solve budgets should use caller-owned scope or sum `SolveResult.workSpent`. Migration direction: [`architecture-unification-debt.md`](architecture-unification-debt.md).

`modules/solver/diversification.ts`'s `createDiversificationSession`, `modules/solver/hint-ablation-generator.ts`'s `createHintAblationGenerator`, and `scripts/hint-workbench.mjs`'s `runAblationUi`/`runCandidateGrid`/`runPortalGrid` follow the caller-owned pattern: each accumulates its own session-local counter from every `solverApi.solve()` call's `workSpent` (win or lose) instead of reading the realm-global counter, so an unrelated solve elsewhere in the same realm cannot pad or steal that session's own budget accounting. Only `hint-workbench.mjs`'s `runEnumeration` hang-safety callback (secondary/non-binding — fires from inside `variety-search.ts`'s own `run()`, which has no caller-visible per-step result to intercept) still reads the realm-global counter — remaining migration debt, see [`../reports/2026-08-28-discovery-work-meter-session-scope-fix.md`](../reports/2026-08-28-discovery-work-meter-session-scope-fix.md).

## Budget roles

| Field | Role |
|---|---|
| `baseWorkBudget` | Preferred API name for the base cross-technique machine-independent allocation. The main ladder divides it; under legacy production semantics additive stages may spend fresh work beyond it. |
| `workBudget` | Compatibility alias for `baseWorkBudget`, retained for existing workflows/artifacts. Supplying both with different values is an error. |
| `timeBudgetMs` | Intended role: outer latency/safety deadline. A finite inventory of legacy additive stages still uses ms-shaped fractions as compatibility sizing debt; no new sites are permitted. |
| `nodeBudget` | Cumulative/technique diagnostic cap; deterministic, but not portable cross-technique cost. Often still acts as the practical whole-level guard under legacy additive semantics. |
| `strictTotalWorkBudget` | Experiment-only switch that turns the configured `workBudget` into an immutable whole-solve work ceiling. |

If `workBudget` is omitted, ms-shaped callers convert at the run boundary using committed work-per-ms calibration; live host speed never controls allocation.

The compatibility conversion is centralized in `modules/solver/budget-units.ts` as `LEGACY_MS_TO_WORK_RATE`. Do not copy that number into another caller. It is a frozen boundary calibration, not measured host throughput.

### Base work versus total work

The historical name `workBudget` predates the current additive tail. New code may use the clearer `baseWorkBudget` alias; existing workflows/artifacts remain compatible with `workBudget`. In ordinary production mode it means **base allocation**, not necessarily **total work purchased by the whole solve**. Several fallback/retry stages can receive fresh deterministic work after that base pool has been depleted. Consequently:

- `workSpent > workBudget` is legal under legacy production semantics;
- an equal `workBudget` does not by itself prove equal total treatment cost when additive-stage reach differs;
- `strictTotalWorkBudget: true` is the current experiment mechanism for a genuine whole-solve work envelope;
- future scheduler APIs should prefer names such as `baseWorkBudget` and `totalWorkCap` rather than perpetuating this ambiguity.

Changing production to strict-total semantics is decision-bearing and requires matched solve-retention evidence. Renaming/documenting the distinction is not.

### Migration priority

Treat this as active research-enabling infrastructure, not optional cleanup. The live queue's order is authoritative; within its budget-model item, prefer:

1. explicit stage/attempt work ownership and parity;
2. session-isolated multi-solve accounting;
3. equal-work execution for scheduler-pricing evidence;
4. one behavior-preserving ms-derived additive-tier migration at a time;
5. whole-solve deadline-independence regression once the legacy inventory reaches zero;
6. only then new fixed-work repricing policy.

Do not combine several additive-tier migrations into one opaque solve-set change. A conversion that changes policy is an experiment and must be evaluated as one.

### Remaining ms-shaped allocation debt

The remaining legacy sites are in additive stage setup inside `orchestration.ts`: repair fallback, attraction-diversity, admissible-order, and promoted retry-stage work pools derived from `timeBudgetMs * stageFraction` before conversion to work. They are deterministic for identical inputs, but they violate the stronger target invariant that a non-binding deadline can change **only latency**, never search allocation.

`scripts/check-solver-budget-boundaries.mjs` records these sites as an allowlist/ratchet. Removing a site is automatically allowed; adding a new one fails CI. Migrate them only through a behavior-preserving representation change or a separately measured production-policy experiment.

### Clock-shaped compatibility names

Some older APIs and CLIs still expose names such as `--wall-ms` or `wallClockDeadlineMs` even though the implementation now converts that value once into canonical work and never gates search extent on `Date.now()`. Treat these as compatibility shims, not evidence of a live wall-clock budget. New APIs should prefer explicit `workBudget` / `haltedByWorkBudget` names; persisted old names may remain as documented aliases until consumers migrate.

Conversely, a genuine outer wall deadline must say when it actually bound. Decision-bearing research harnesses must expose/propagate the stop reason and reject or separately classify a wall-truncated arm rather than silently recording it as ordinary unsolved-at-work evidence.

## Scheduler portfolio contract

Evidence-driven scheduling changes the division of work, not the definition of work.

- The default scheduler experiment uses a **fixed aggregate work envelope**. Adding a candidate action expands the menu; it does not automatically increase total permitted work.
- Search actions may have budget quanta or protected minima when evidence shows useful deep hazard, but those reservations must be visible within the shared envelope.
- A new retry/tail action must normally displace weaker work, be conditionally routed, or explicitly justify a larger total envelope. Do not hide a solve gain inside additive budget growth.
- Compare conditional/marginal value on the population that reaches the action. An old retry's historical unique wins do not prove it still merits the same allocation after upstream policy changes.
- Scheduler decisions must never depend on live host speed, elapsed-time throughput, or wall-derived calibration. Static level features and current solve telemetry may alter allocation; machine performance may not.
- During scheduler A/Bs, prefer `strictTotalWorkBudget` when legacy additive tiers would otherwise make treatment/control envelopes incomparable. If strict containment is intentionally not used, report the total-work difference as part of the treatment.

See [`solver-scheduling-policy.md`](solver-scheduling-policy.md) for action identity, residual-value analysis, shadow planning, and promotion rules.

## Cap and tranche discipline

Do not infer a technique's safe production cap from the median depth of its successful easy levels. The census shows materially different depth distributions on the hard residual population. The dated measurements are in [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md); the scheduling consequences live in [`solver-scheduling-policy.md`](solver-scheduling-policy.md).

Current rules:

- **No universal low cap from “wins early” intuition.** The perfect isolated router retains only 171/253 frozen-gap oracle solves at 10M nodes and 202/253 at 20M; some useful action therefore needs access to deeper search.
- **Self-exhausting techniques do not need artificial entitlement just because a high outer cap exists.** Beam searches generally exhaust their frontier in the sub-million range. Their budget problem is ordering/reach, not a 50M burn.
- **Protect deep continuations only where measured late yield exists.** Plain repair earns this treatment: 37/121 frozen-gap wins occur in the 20M–50M interval and the measured conditional hazard rises in that band. A scheduler may split repair into successive quanta, but must not assume the late tranche is dead work.
- **Deep budget is not hereditary.** Ordinary DFS/IDA profiles with high overlap/substitutability must compete for later quanta by current residual value. Historical existence in the ladder or historical wins do not confer a permanent full-depth allowance.
- **Sequence-dependent stages require live-ladder validation.** Admissible-order reverse-oracle evidence shows that isolated cap curves can miss preceding-ladder effects. Budget reductions for such stages must be tested through the real sequential path.
- **Node-band evidence is diagnostic, not cross-technique currency.** Use node curves to decide where a technique's own useful depth lies; use `workSpent` to compare whether that tranche deserves shared portfolio budget against another technique.

For scheduler analysis, a budget tranche should be treated as an action extension: “continue technique X for the next q work” competes with starting/continuing other eligible actions. Reaching an earlier tranche does not automatically reserve all later tranches.

## Reproducible comparison

For decision-bearing offline work:

1. pin `workBudget`;
2. use non-binding `timeBudgetMs` or deterministic workflow mode;
3. exclude/separately classify `deadlineTruncated`;
4. compare `workSpent` for cost;
5. record protocol, commit, flags, corpus, budget.

For the fully work-denominated main ladder, equal level/config/seed/work allocation with a non-binding deadline is deterministic across host speed/load; a regression test pins that invariant. Whole production solves can still change additive-stage dose when `timeBudgetMs` itself changes because of the inventoried compatibility debt above. Therefore matched experiments must pin BOTH explicit work and the same deadline until those sites are migrated, and must reject `deadlineTruncated`. Remote A/Bs: `solver-typical-budget-baseline.yml` with `deterministic: true`. Binding historical baselines may preserve continuity but are not machine-independent causal evidence.

## Deadline truncation

A wall deadline can end a solve before its work budget. `deadlineTruncated` means requested deterministic search did not complete within the latency envelope, not reproducible unsolved-at-budget evidence. Offline tools must exclude or label it.

## Hint discovery and provenance

Phase/escalation decisions use work, not elapsed time; cooperative yielding/latency reporting may read the clock.

- `workSpent`: comparable algorithmic cost.
- `workBudget`: intended deterministic ceiling.
- `deadlineTruncated`: wall interference.
- `nodesExpanded`: within-technique diagnostics/legacy data.
- `elapsedMs`: runtime latency.

Label units in old/new provenance; never mix nodes and work silently.

## Matched-work experiments

Declare whether additive retries/passes are inside the envelope. If treatment can spend extra work, use `strictTotalWorkBudget` or report extra cost. Equal `nodeBudget` does not imply equal work when technique mixes differ.

For scheduling experiments, also report which actions were selected/reached, their allocated work bands, paired gains/losses, and residual unique wins. This distinguishes a better policy from a larger search purchase.

A cap/tranche experiment must additionally report solves retained/lost at each candidate band, the population reaching the band, simulated or measured capped spend, and any sequence dependency that makes isolated curves non-causal. Do not promote a lower cap merely because the median successful attempt lies far below it.

## Non-regression rules

- No wall-clock-derived attempt shares/escalation thresholds.
- No live warm-up speed measurement in solver policy.
- No raw nodes as portable cross-technique cost.
- No deadline-truncated failure recorded as ordinary unsolved capability.
- No hidden total-work increase behind retry/reserve mechanisms.
- No scheduler candidate that obtains its apparent advantage solely by escaping the declared shared envelope.
- No deep-cap reduction justified solely by easy-population medians when hard-residual hazard/retention evidence exists.
- Work-meter weight changes are budget-unit migrations requiring cross-technique calibration plus reproducibility/regression validation.

The archived snapshot preserves nondeterminism measurements, raw-node prototype failure, fitting, migration, hint-workbench diagnosis, and tool-conversion history.