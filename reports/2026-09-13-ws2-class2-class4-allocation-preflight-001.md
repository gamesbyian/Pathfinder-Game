# WS2 class-2 / class-4 allocation preflight 001

> **Status:** preregistered design / implementation handoff
> **Authority:** `docs/solver-optimization-workstreams.md`, `docs/solver-future-work.md`
> **Scope:** only (1) class-2 7M late must-turn-biased repair economics and (2) class-4 portal coarse-state dead-last additive exposure. No class-5, categorical full-pool, or homotopy work.
> **Current base:** `main` at `fb5c83df3726ab0c0caaceedd80744ef62bbfac5` when this preflight was written.

## Executive decision

Both live WS2 composition questions are now narrow enough that the next expensive step should be small and decision-bearing.

- **Class 2:** no solver implementation is needed. The 7M treatment is already correctly integrated, default-off, and demonstrated on two current residuals. The next test is a bounded, frozen, participant-aware A/B that measures marginal solves *and* downstream displacement/cost. The test must not be built only from current misses, because the treatment runs before later promoted retries and can therefore consume cumulative resources before a control-side downstream winner.
- **Class 4:** freshness is already established. The safe changed treatment is a **new dead-last additive whole-ladder retry** with `STRATEGY_PORTAL_COARSE_STATE_MERGE: true` applied only inside that retry. This is materially different from the closed global enablement. It should run only after every currently promoted production tier has failed, with its own fresh work scope and explicit additive node reserve. That runtime wiring is nontrivial enough that this report stops at a precise implementation handoff rather than editing solver architecture casually.

## Evidence reconciled before freezing the designs

### Class 2

`reports/2026-09-13-must-turn-biased-repair-dose-pilot-001.md` establishes all of the following under current code:

- the original seven-row shorthand is impure; `R03049` is a dose/allocation case, leaving six genuine must-turn-guidance rows;
- at 7M matched isolated dose, plain repair fails while must-turn-biased repair solves `R02768` at 1,179,294 nodes and `R02180` at 6,206,072;
- the real production ladder reproduces those exact wins, referee-valid, only after a real `late-repair-search` attempt fails;
- the treatment is already implemented as `late-repair-must-turn-biased-retry`, default-off, with a 7M stage-local node cap and fresh work scope.

Inspection of `modules/solver/orchestration-additive-retry-tiers.ts` adds one important allocation fact: the class-2 stage runs **after** `late-repair-search` but **before** `guidance-goal-distance-retry` and `late-repair-multiseed-retry`. It cannot steal capability from earlier stages, but it can increase cumulative work/nodes before later specialists. Therefore an economics A/B made only from baseline misses is invalid for collateral accounting.

### Class 4

`reports/2026-09-09-portal-coarse-state-merge-ab-001-preflight.md` remains the hard negative for global enablement: 954 portal levels, +158 / -12, with a confirmed hard control-capability regression on `R01273` even at 10x budget. The global form stays closed.

`reports/2026-09-13-class4-portal-coarse-freshness-replay-001.md` separately proves that the positive basin is still live: the corrected current class-4 residual has 113 portal-coarse nominations, and a prespecified stratified 8-level current-code replay solved 8/8 referee-valid. This means the live question is exposure/allocation, not rediscovery or freshness.

The existing additive-tier implementation pattern (`runWholeLadderRetryTier` + `proxyOverrides`) is already used for several changed-treatment descendants of globally unsafe mechanisms. That is the correct architectural family for class 4, but the new tier must be the **actual end of the ladder** to preserve the reason for using it.

---

# 1. Class-2 must-turn economics

## Question

On a bounded population that was genuinely eligible to participate, does enabling the already-integrated 7M `late-repair-must-turn-biased-retry` buy enough referee-valid solves to justify its incremental `workSpent` and wall cost without displacing downstream production capability?

This is an economics/collateral test, not another mechanism proof.

## Frozen treatment

Do not retune the candidate.

- flag: `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY=true`
- stage: `late-repair-must-turn-biased-retry`
- node dose: existing 7,000,000 stage-local cap
- work semantics: existing fresh stage work scope exactly as integrated
- placement: unchanged
- ordinary production flags/defaults otherwise unchanged

No 13M widening and no attempt to include slower historical must-turn winners merely to manufacture known gains.

## Population identity: freeze from control-side evidence only

Materialize and commit one ID file **before** either A/B arm is run. Selection may use only current-control lifecycle/config facts, never treatment outcomes.

Start from Corpus 2 at the same corpus revision as the current production boundary. A row enters the candidate pool only if the control-side solve satisfies all of these:

1. level has at least one must-turn obligation;
2. the ordinary `late-repair-search` stage actually participated, not merely qualified nominally;
3. the treatment's other structural gates are true (`repairConfigs.length === 0`, `repairLateProbeTierWillRun` under the resolved production config);
4. the solve reached the point at which the child treatment would be legal if enabled.

Split that control-qualified pool into two strata:

- **gain stratum:** control remains unsolved after the full ladder;
- **collateral stratum:** control eventually solves, but only *after* `late-repair-search` (especially `guidance-goal-distance-retry`, `late-repair-multiseed-retry`, or any later stage if ordering changes before dispatch).

The collateral stratum is mandatory. Those levels are the direct detector for displacement by the inserted 7M treatment.

### Smallest useful cohort

Freeze **60 levels** unless one stratum is smaller:

- 40 deterministic-seeded rows from the gain stratum;
- 20 deterministic-seeded rows from the collateral stratum, or all of that stratum if fewer than 20 exist, with the unused slots transferred to the gain stratum.

Exclude `R02768` and `R02180` from the primary 60 because they were the mechanism-development pair. Preserve them as two separate positive controls, run after the frozen cohort if desired. Exclude `R03049` from must-turn-guidance gain accounting entirely. Do not exclude other historical winners merely because their identities are known; selection is by the frozen control-side participation strata, not by historical technique outcome.

Why 60: this is a bounded advancement screen, not a promotion population. It is large enough to observe real participation/cost distribution and contains an explicit 1/3 collateral slice, while avoiding another broad 500+ level run before the economics premise earns it.

## Population/config immutability

Before dispatch, commit or artifact-pin:

- exact ID file and SHA-256;
- corpus path and corpus SHA-256;
- base commit SHA;
- deterministic selection seed and selection script/version;
- resolved enable/disable flags for each arm;
- `node_budget`, explicit/derived `work_budget`, `strict_total_work_budget`, wall deadline, scheduler mode, workers;
- expected stage ordering hash or an equivalent checked list containing `late-repair-search`, `late-repair-must-turn-biased-retry`, `guidance-goal-distance-retry`, `late-repair-multiseed-retry`.

If HEAD changes treatment placement, budget resolution, or any upstream/downstream production default after population freeze, invalidate and rematerialize before running rather than silently reusing the IDs.

## A/B envelope

Use `solver-level-blind-targeted-sweep.yml` and the same frozen IDs in both arms.

**Control:** production defaults; candidate flag OFF.

**Treatment:** identical inputs plus `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` ON.

Use the production-shaped starting envelope already used by the current class-4/repair work unless a pre-dispatch canary proves it no longer reproduces current control behavior:

- `node_budget=50,000,000`
- `work_budget=67,000,000` (explicitly pin it rather than relying on derivation drift)
- `strict_total_work_budget=false`
- nonbinding deterministic wall deadline
- same scheduler mode and worker count

This is a **matched dispatch/base envelope**, not a claim of equal realized whole-solve work. The treatment intentionally owns an additive 7M stage and may spend more. That incremental cost is a primary outcome. Do not switch to a strict 67M whole-solve cap: existing production semantics are additive and a strict cap would change the control being evaluated.

If a true fixed-total-work substitution is later desired, it is a successor experiment after this marginal-value screen, not a silent reinterpretation of this A/B.

## Participation gate

The cohort was selected from historical control-side participation, but current-run participation must still be checked.

A row counts as **treatment-participating** only if treatment telemetry shows `late-repair-must-turn-biased-retry` with nonzero nodes or nonzero `workSpent`. Stage label presence with zero work is not participation.

The run is decision-bearing only if:

- at least 75% of the gain stratum reaches the treatment stage with real work; and
- at least 75% of the collateral stratum reaches the insertion point in the control arm under current HEAD.

If either fails, classify population drift/config drift and rematerialize. Do not call it an efficacy null.

## Required telemetry and accounting

Per level and aggregate, preserve:

- solved/referee-valid outcome;
- exact winning `stageId`;
- attempts, nodes, stage-local nodes, and `workSpent` by stage;
- whole-solve `workSpent`;
- wall milliseconds;
- treatment-stage entry/exit work meter and nodes;
- stop reason / node-budget / work-budget / deadline censoring;
- whether every control-side downstream winning stage still received real work in treatment.

Report four paired quantities explicitly:

1. **gains:** control unsolved -> treatment solved;
2. **losses:** control solved -> treatment unsolved;
3. **downstream displacement:** control downstream-winning stage loses material nodes/work or disappears under treatment even if final solve status happens to stay solved;
4. **incremental cost:** treatment minus control `workSpent` and wall time, both aggregate and distribution (median/p90 plus max).

Use `workSpent` for cross-technique economics. Nodes remain diagnostic.

## Frozen advancement / stop rule

Advance to a larger eligible-population test only if all are true:

- at least **one new referee-valid solve** on the frozen 60, attributable to `late-repair-must-turn-biased-retry` itself;
- **zero credible solve losses**;
- no control-exclusive downstream specialist is materially starved in a way that plausibly threatens capability, even if that particular level still solves elsewhere;
- treatment participation gate passes;
- no asymmetric deadline/error/missing-shard censoring;
- incremental work/wall cost is measured cleanly enough to quote a cost per gained solve.

Stop/demote the 7M unconditional eligible-population exposure if any credible loss is found, or if zero gains occur despite informative participation on at least 30 gain-stratum rows. A zero-gain informative result means the two-level mechanism proof did not generalize economically at this exposure; do not widen the dose as an automatic rescue.

If there are gains with zero losses but very high cost, keep the treatment default-off and hand the result to WS1/allocation work for a narrower legal selector premise rather than promoting globally.

## Minimal implementation work

No solver/runtime change is required for this A/B.

The only justified repo work before dispatch is a tiny materializer/analyzer if existing lifecycle tooling cannot already emit the exact four-gate population above. Prefer extending an existing selection/report script over creating a new framework. The selected ID file, manifest, and pre-outcome config identity must be committed before dynamic outcomes are inspected.

---

# 2. Class-4 portal coarse-state allocation

## Question

Can the known-fresh portal coarse-state capability be exposed as a **dead-last additive whole-ladder retry** so that it can recover current class-4 misses without altering any earlier production survivor decisions, and at a bounded measurable marginal cost?

The question is not whether global coarse-state merge is good. That treatment is closed negative.

## Frozen changed treatment

Add one new default-off retry tier with these semantics:

- stage id: choose one stable explicit id, recommended `portal-coarse-state-merge-retry`;
- entry guard: `!result.solution` and portal-bearing level and candidate flag ON;
- placement: **after every currently promoted additive retry**, including `late-repair-multiseed-retry`; it must be the true final solver tier at implementation time;
- executor: existing `runWholeLadderRetryTier` path;
- override only inside the retry: `proxyOverrides: { STRATEGY_PORTAL_COARSE_STATE_MERGE: true }`;
- ordinary main/search behavior before entry remains production-default merge-OFF on portal levels;
- fresh work scope; no inheritance of a depleted earlier `prep._workCap`;
- explicit additive node reserve owned by this tier; no carving from any earlier tier's existing reserve;
- lifecycle/attempt telemetry must distinguish eligibility, entry, real participation, and stage solve.

This changed treatment is causally clean with respect to the 12 global losses: a level solved by any current production stage never enters the retry, so the global merge key cannot perturb its earlier survivor set.

## Implementation handoff: do not improvise these details

This is the next code-heavy step. Before any population run, implementation must touch the same control points sibling whole-ladder retries use:

1. ablation/default-off flag declaration and documentation;
2. stage-budget plan fields for tier-will-run, node reserve/ceiling, and work fraction/dose;
3. `runAdditiveRetryTiers` final ordering;
4. lifecycle/stage id plumbing and tests;
5. worker/sequential parity declaration if the raced worker does not execute the tier directly;
6. unit tests proving default-off no-op, portal-only eligibility, true-dead-last ordering, fresh work scope, and no earlier-stage attempt changes when enabled on an earlier-solved level.

Do not reuse `STRATEGY_PORTAL_COARSE_STATE_MERGE` as a global enable switch for the treatment arm. Either introduce a dedicated retry flag or otherwise guarantee that the existing flag is applied solely via the retry's proxy override. A workflow `enable_flags=STRATEGY_PORTAL_COARSE_STATE_MERGE` that turns it on for the primary search would simply rerun the already-closed experiment.

### Initial dose

For the first canary, use **one production-sized main-ladder retry dose**, not an oversized capability sweep. Resolve its node/work allowance through the same stage-budget machinery as sibling whole-ladder retries. Do not make the wall deadline the allocator.

The implementation PR must state the exact additive reserve in node units and the exact fresh work budget in canonical `workSpent` units before any canary outcomes are inspected. If there is no principled existing sibling constant to reuse, choose the smallest dose that can replay the known cheap freshness positives first; do not start at 10x or a 50M-per-config capability sweep.

## Canary population: reuse existing frozen evidence

The first runtime gate should use the already-prespecified 8-level freshness sample:

`R00082, R02173, R02807, R03365, R00466, R03228, R00329, R03303`.

No new sampling is needed for the canary. Those IDs were selected before the freshness outcomes by deterministic routing-regime stratification and already span intersection-heavy, multi-portal, and must-cross-heavy class-4 rows.

Add two negative-control classes without expanding into a broad A/B:

- `R01273` as a **global-form regression control**: production must still solve it before the retry or otherwise remain byte/attempt-equivalent through its winning point; the retry itself must never be allowed to change the earlier search that global merge broke;
- at least two non-portal levels as structural no-op controls: enabling the retry flag must produce zero retry participation and no attempt/work differences.

This is an implementation/exposure canary, not a population efficacy estimate.

## Canary acceptance rule

Advance to a population test only if all are true:

- at least one of the eight freshness rows is solved *by the new retry stage* under its frozen dose;
- every claimed retry solve is referee-valid;
- `R01273`'s production path/outcome before the retry is unchanged and the retry does not run before that solve;
- non-portal controls show zero participation;
- telemetry proves a fresh work scope and nonzero real retry work;
- no existing stage loses attempts/work because the tier is truly dead-last;
- wall deadline is nonbinding and no asymmetric censoring occurs.

If **0/8** freshness rows are recovered with genuine retry participation, stop. That means the changed exposure form does not transport the known global capability at this dose. Do not immediately broaden to 113 or reopen global enablement; first determine whether the issue is dose, the fact that only the main ladder is rerun, or another precise exposure mismatch.

## Smallest population test after a passing canary

Use the **113 current class-4 rows** already nominated by the corrected current residual intersected with the frozen referee-valid global gain set. Do not go back to all 954 portal levels for the first allocation test.

Why 113 is legitimate: it is the current residual capability-memory population for which the historical treatment has direct referee-valid gain evidence; freshness has already been established on a prespecified sample. The allocation question is now how many of those current misses can be recovered safely by a dead-last retry.

Freeze the exact 113-ID file and hashes before dispatch. If the current production residual changes materially before the test, regenerate the intersection and record the new population rather than carrying stale class membership forward.

## Work/displacement accounting

Because the retry is truly dead-last and owns fresh additive capacity, it is not allowed to displace earlier production capability in this first allocation test. That is the safety property being tested.

Required accounting:

- count of 113 that enter the retry;
- count with nonzero retry nodes/work;
- retry-attributable solves and referee validity;
- incremental `workSpent` and wall time versus control;
- distribution of retry work among wins vs failures;
- whole-solve node/work stop reasons;
- explicit proof that all control-side earlier attempts through the former end of ladder are unchanged on paired rows, modulo deterministic telemetry fields such as timestamps.

A later promotion/fixed-work question must price this new capability against something else under a true aggregate budget. Do **not** smuggle that displacement into the first exposure test: first establish marginal yield/cost with the safety-preserving dead-last form.

## Population advancement rule

A larger/general promotion test is justified only if the 113-row allocation test has:

- positive retry-attributable solve gain;
- zero earlier-capability losses by construction/telemetry;
- referee-valid gains;
- informative participation on a substantial fraction of the 113;
- bounded, reportable incremental `workSpent` and wall cost.

If yield is zero or negligible under real participation, close the dead-last exposure form. If yield is material but expensive, keep it default-off and use the measured responder/non-responder evidence to ask a narrower legal allocation question. Do not promote simply because the historical global treatment was +146 net.

---

# Shared experimental validity rules

For both lines:

1. **Eligibility != participation.** Decision-bearing rows require nonzero target-stage work/nodes.
2. **Population identity is immutable.** Commit/pin IDs, corpus hash, selection provenance and config before outcomes.
3. **`workSpent` is the cross-technique currency.** Nodes are diagnostic and stage-dose checks.
4. **Losses are first-class.** Report exact gain/loss IDs and downstream work displacement, not just net solves.
5. **Dead-last means dead-last.** Any later tier added before class-4 dispatch must force the class-4 retry to move after it or invalidate the canary.
6. **No dynamic retuning after outcomes.** Dose, participation threshold and advancement/stop rules above are frozen before the next expensive run.
7. **Historical IDs are evidence, not runtime routing.** None of these selections may become production ID logic.

## Next actions

### Class 2

1. materialize the 60-row participant-aware cohort from current control-side lifecycle evidence;
2. commit IDs + manifest/hash before running;
3. run matched targeted control/treatment arms using the existing candidate flag;
4. analyze paired gains/losses, downstream displacement, incremental `workSpent`, wall cost and censoring against the frozen rule above.

### Class 4

1. implement the dedicated default-off dead-last retry exactly as specified above;
2. run unit/parity tests, then the 8-row freshness canary + `R01273` + non-portal no-op controls;
3. only if that passes, run the frozen current 113-row class-4 nomination population;
4. measure marginal yield/cost before any fixed-work allocation or promotion discussion.
