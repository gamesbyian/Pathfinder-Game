# Solver optimization: current priority queue

> **Status:** canonical live entry point for solver capability and efficiency research.
> **Reconciled:** 2026-08-24 after the P0/artifact reconciliation, scheduler/configuration audit, locked-cohort reservation, beam-descriptor projection/full-pool capture readiness, closed reference-model matrix, restart execution-readiness audit, staged learned-failure audit, repair reconstructability reconciliation, and execution-substrate audit.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness and generalization. Historical exact-level evidence may nominate research; it may not steer production solves.

Use this file for **rank and next gate**, not as a second notebook. Detailed reasoning belongs in the linked topic docs/reports.

Primary authorities:

- method: [`solver-research-operating-model.md`](solver-research-operating-model.md)
- scheduler/allocation: [`solver-scheduling-policy.md`](solver-scheduling-policy.md)
- residual representation: [`solver-residual-state-representation.md`](solver-residual-state-representation.md)
- deterministic cost: [`solver-budget-determinism.md`](solver-budget-determinism.md)
- level-blindness: [`solver-level-blindness.md`](solver-level-blindness.md)
- retained opt-ins: [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)
- deferred/reopen ideas: [`solver-future-work.md`](solver-future-work.md)

## Queue-wide rules

Every active item follows:

> **premise -> smallest value-of-information pilot -> explicit success/stop gate -> bounded implementation -> confirmation -> broader integration**

Additional rules:

- A high-priority item may correctly begin with analysis/diagnosis rather than code.
- Do not let an easy lower-ranked implementation displace a higher-ranked evidence blocker.
- Use `workSpent` for cross-technique cost; raw nodes remain within-technique diagnostics.
- A new action expands the menu, not the default total work budget.
- Additive dead-last placement can prove non-interference with earlier winners; it does **not** make the added work free.
- Selection/tuning evidence requires independent confirmation before broad promotion claims.
- Level-blindness is not statistical generalization.
- Proxy wins such as badness, lineage survival, similarity, exact-live retention, or model fit do not substitute for cold solve/work/correctness.
- Timeout/censoring, natural exhaustion, unsupported/UNKNOWN, and proof of infeasibility remain distinct.
- A clear negative closes the tested form. Do not indefinitely rescue it with adjacent thresholds/seeds/budgets.
- Keep exact/proof interfaces, safe relaxations, restricted representations, and predictive abstractions in their proper logical roles.

## Ranked queue

| # | Opportunity | State | Next gate |
|---:|---|---|---|
| 0 | Unexplained cross-stage dependence | **P0 BLOCKER** | Reproduce one fresh-vs-preceded admissible-order case under an identical action/resource contract. Compare resource/accounting/config context, then initial admissible child ordering as a semantic checksum. If ordering differs, clear MP/MC lower-bound memos first; if it agrees, trace the first later tree divergence. See [`../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md). |
| 1 | Evidence-driven scheduler and fixed-work portfolio repricing | **ASAP / DATA MATERIALIZATION GATE** | Current code exposes canonical action identity, per-attempt `workSpent`, ceilings, and explicit termination outcomes, but the latest inspected full-refresh artifacts predate that rich attempt projection. Materialize one current fixed-work attempt-row dataset with the existing schema, then build the action/tranche risk-set join to frozen census cap data and test a simple static policy before dynamic/survival/bandit machinery. See [`../reports/2026-08-24-queue-readiness-artifact-reconciliation.md`](../reports/2026-08-24-queue-readiness-artifact-reconciliation.md) and [`../reports/2026-08-24-scheduler-evidence-contract-audit.md`](../reports/2026-08-24-scheduler-evidence-contract-audit.md). |
| 2 | Generalization and holdout discipline | **ASAP / FIRST COHORTS RESERVED + LOCKED** | `confirm-broad-001` and `transfer-envelope-001` are reserved by exact repository source revision, count, mode, and fresh master seed without materializing/inspecting rows. Materialize only from the pinned revision. The next selected treatment must freeze candidate/work/acceptance before `confirm-broad-001`; use `transfer-envelope-001` only after confirmation succeeds. See [`../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md). |
| 3 | Automatic configuration / portfolio construction | **HIGH PRIORITY RESEARCH** | Stable config/action identities already exist in `attempt-identity.mjs`; do not rebuild them. First determine how much fixed-envelope headroom exists in the **existing action grammar**. Race/prune existing actions first; refine raw weights/widths/thresholds only inside families that survive the portfolio screen, then confirm selected survivors independently. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md) and the scheduler evidence audit above. |
| 4 | Beam score/retention at proven extinction boundaries | **ACTIVE RESEARCH / FULL-POOL CAPTURE READY** | Existing exact A/D pairs falsify simple scalar progress/resource rules. The required full sorted pool already exists transiently in beam research records; bounded lineage tooling now has an explicit opt-in to retain it without changing search. Capture the selected extinction-boundary pools with stages + ranked-pool details, then run the prespecified read-only survivor projection and report bucket cardinality/singletons and fixed-width exact-live retention. Do not test a production quota/crowding rule unless a compact descriptor adds recurring information beyond current score/prunes. See [`../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md) and [`../reports/2026-08-24-beam-full-pool-capture-readiness.md`](../reports/2026-08-24-beam-full-pool-capture-readiness.md). |
| 5 | Exact/reference-model program | **BOUNDED INFRASTRUCTURE / MATRIX CLOSED** | Broad support/validation reconciliation is complete. Portals/flippers have strong two-way evidence; core resource mechanics have substantial mixed evidence; landmark turn/surround encodings have targeted known-witness validation but shallower model→referee coverage; static filters remain deliberately unsupported. Do **not** run generic validation expansion. Buy a small landmark under-constraint/referee fixture set only if a ranked exact query depends on those semantics; otherwise use CP-SAT only for a concrete ranked label/counterexample/certificate. See [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md). |
| 6 | Restart/randomization and learned-failure search | **HIGH PRIORITY / EXECUTION + SHADOW GATES** | Restart: current late-repair override is node-based, so first expose/reuse a narrow arm-level canonical-`workSpent` cap; then run one prespecified comparison only, seed 0 continued to `W` versus seed 0 to `W/2` + fresh seed 1 to `W/2`. Learned failure: Stage A logs already-known connectivity rejection subtype + existing context at scheduled failures, with no second flood fill; only a positive Stage A earns boundary/component sketches. See the restart and learned-failure audits. |
| 7 | Repair reachability/reconstructability | **ACTIVE, SECONDARY / ONE HARD-LIVE CASE CONFIRMED** | Do not repeat `R00648`: a CP-SAT-live prefix already defeated direct `closeLengthGap` with unrestricted backtracking and 2M nodes, and 2,000 randomized native rollouts produced 0 solves. Classify the **remaining** exact-live retreat cases with named existing operators under canonical `workSpent` for new comparisons. Treat `R03176` whole-repair success as contrast, not yet direct frozen-prefix success. Large destroy/core-guided work still requires recurrent deep-retreat evidence. See [`../reports/2026-08-24-repair-reachability-reconstructability-audit.md`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md). |
| 8 | Architectural speed and execution substrate | **ACTIVE SUPPORTING PROGRAM** | Re-profile current HEAD after the August 23 speed stack. Native/WASM is closed for the current broad per-candidate boundary because crossing it requires migrating too much mutable state. If scoring/candidate generation remains dominant, run one bounded true specialized-JS scorer pilot. See [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md). |
| 9 | Remaining cheap isolated capability missed by production | **SUBSUMED BY SCHEDULER** | Keep mining only as action/scheduler evidence. Do not append another permanent tail merely because an isolated winner exists. |

## #0 P0: cross-stage dependence

Historical admissible-order wins can require preceding ladder activity despite fresh direct controls at the exact production commit. Current static audit narrows the likely classes:

- reusable DFS/beam state buffers are not the likely cause for admissible-order, which creates a fresh logical state;
- admissible-order has no PRNG input;
- current config override paths examined restore their state;
- the architecture has real historical budget/cumulative-node sequence hazards, so resource context must still be controlled;
- lower-bound memo/value state remains a leading visible semantic suspect if initial child ordering differs under otherwise identical context.

Required diagnosis order:

1. reproduce the historical/current winner under its preserved full-ladder protocol;
2. compare fresh vs controlled-predecessor resource vector: work meter/caps, cumulative nodes, supplied budgets, effective config/forced-step state, gate and action identity;
3. compare **initial admissible child order**;
4. if ordering differs under equal context, clear MP/MC lower-bound memos before broad state diffing;
5. if ordering agrees, locate the first later search-tree divergence;
6. either eliminate accidental leakage or formalize an intentional typed producer→receptor contract and charge producer work;
7. add a regression fixture for the actual lifetime contract.

Do not “fix” experiments by always priming the predecessor ladder. That hides the dependency.

## #1/#3 scheduler and configuration

The old problem statement has changed materially.

Current **code** already provides:

- canonical config identity;
- canonical action identity including stage and repair seed;
- per-attempt `workSpent`, node/work ceilings and termination outcome;
- row-level deadline truncation and technique lifecycle telemetry;
- census cap/tranche evidence across a broad action matrix.

The latest inspected full-refresh **dataset** does not materialize that complete per-attempt contract. Its raw attempts predate the current `actionKey`/work-ceiling/`workSpent` projection, while its combined artifact drops the full attempt array. Therefore the immediate gate is one current rich attempt-row materialization using the existing schema. This is evidence production, not another telemetry-design project.

After that materialization, the remaining problem is the **join and valuation**, not inventing an identity schema or another general telemetry pass.

The existing `portfolio-historical-replay.mjs` is winner/elapsed-time archaeology only. It does not charge failed work, build right-censored risk sets, or model current action overlap, and must not be treated as the continuation-value analyzer.

The first decision-bearing outputs are:

- current additive/retry tail economics;
- action/tranche risk sets with natural exhaustion removed from later continuation sets;
- incremental solves and incremental `workSpent`;
- rare/exclusive capability;
- portfolio-cardinality curve;
- fixed-work current-vs-oracle/Pareto frontier;
- a simple deterministic static baseline;
- sensitivity excluding P0/sequence-ambiguous cells.

Existing frozen census evidence already warns against both extremes. Plain repair alone covers a large hard-gap share, but the fully sampled gap union needs many techniques for complete coverage: three selected techniques cover about 70% of that union, eight about 87%, and full coverage requires 22. That is not a fixed-work production result, but it makes the portfolio-cardinality tradeoff real.

Only if comparable fixed-work oracle headroom remains material after a simple static policy should dynamic/learned scheduling or broad automatic configuration proceed.

## #2 generalization

Corpus 2, existing census cells, regressions and variant families are development evidence because they have been repeatedly inspected/mined.

Use renewable evidence roles:

- **development/tuning:** freely inspectable;
- **confirmation:** candidate fixed before exact outcomes are inspected;
- **transfer/challenge:** fresh/locked evidence for broader claims.

The first two managed cohorts are reserved in [`../reports/stress/managed-evaluation-populations-2026-08-24.json`](../reports/stress/managed-evaluation-populations-2026-08-24.json):

- `confirm-broad-001`: 256 fresh uniform-random raised-cap levels, master seed `2026082417`;
- `transfer-envelope-001`: 256 fresh uniform-random envelope-cap levels, master seed `2026082429`.

Both remain `LOCKED`: their level files and solver outcomes have not been materialized or inspected. Their identity is pinned to **repository revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`**, not merely the seed or nominal generator version. Materialization must run from that checkout/worktree so imported helpers/build inputs cannot drift while the reserved population id remains unchanged.

Do not generate either cohort for exploratory candidate selection. Freeze treatment + work + acceptance criteria first, then materialize and use `confirm-broad-001` once. Use `transfer-envelope-001` only after broad confirmation succeeds. If the pinned source revision cannot be reproduced, reserve a new population id rather than silently regenerating different rows under the old id. If exact failures later influence redesign, reclassify and replenish rather than repeatedly querying the same population.

Keep broad fresh samples separate from baseline-failure-conditioned residual samples. The latter are excellent for tail/scheduler questions but do not establish unconditional unseen-level improvement. No residual cohort is reserved yet because its membership requires a future frozen baseline commit/work contract.

Track exposure state such as `LOCKED`, `AGGREGATE_SEEN`, `EXPOSED`, `DEVELOPMENT`. Once exact failures influence redesign, reclassify/replenish.

Group siblings by parent/family ancestor. Record generator/source/version/seeds and selection rules. Do not repeatedly query one hidden cohort until it becomes a covert tuning service.

## #4 beam retention

Exact A/D evidence shows cases where score-preferred material is dead while a near-cutoff/discarded alternative is live. B-class live/live near-ties remain a distinct regime.

Cheap scalar “progress” rules are already refuted. Across exact dead/live pairs, closer-to-goal, fewer intersections used, objective completion and aggregate consumed axis topology point in contradictory directions.

`S00030` remains a useful representation counterexample: dead and live candidates share position, remaining length, remaining intersection budget, goal distance and current coarse `(flipperUsedMask, mustCrossMask)` diversity bucket. The live candidate has already made the first pass through a still-pending MustCross; the dead candidate has not. `crossCounts` captures the difference and scoring already uses it, but coarse diversity does not.

However, projecting that hypothesis across the other confirmed A/D dead-top/live-alternative pairs does **not** show recurrence. MustCross first-pass state distinguishes `S00030` but not `S00001`, `S00048`, or `R00104`. A stricter cheap local test asking whether the still-required H/V crossing corridor is currently available is identical on both sides of all four pairs. Other separating state is heterogeneous: must-pass progress differs on some pairs, adjacent-turn state on another, and intersection consumption on another.

Therefore MustCross completion phase remains a case-specific clue, not a justified production retention key. Likewise, concatenating every state field that happens to separate these four selected pairs would be overfitting and could fragment diversity into mostly singleton buckets.

The next bounded test is a **read-only full-pool survivor projection**. The beam research record already constructs the complete sorted pool at score-width culls; compact lineage observation historically reduced it to supported summaries. Bounded tooling now has an explicit `--retain-ranked-pool-details` option so selected runs can preserve the paths/ranks/scores/insertion orders needed for offline state replay without changing search.

On existing exact extinction parents, compare a small prespecified family of cheap keys built only from state already maintained by beam, for example:

- current `(flipperUsedMask, mustCrossMask)` control;
- current key plus a bounded MustCross first-pass summary;
- one or two compact interface-state combinations using already-maintained obligation masks/count summaries;
- already-paid connectivity summaries only when a connectivity pass has already run.

For every candidate key, report bucket count, singleton share, guaranteed slots under the existing quota rule, whether the exact-live alternative would survive at unchanged width, and whether the key adds information beyond current score/prunes. Reject keys that “work” only by making nearly every candidate its own bucket.

Connectivity-derived descriptors must reuse an already-paid connectivity pass where possible. Connectivity is a hot throttled kernel; do not add another flood fill per beam candidate merely to manufacture diversity metadata.

Only if a compact key shows recurring incremental survivor value across unrelated parents should the simplest production retention expression be tested at unchanged width, with random-reserve and width-only controls and matched `workSpent`. Exact-live retention remains a proxy until cold solve/work improves.

## #5 reference model

The maintained CP-SAT/prefix stack is bounded research infrastructure, not a second production solver. The broad support/validation matrix is now **closed**.

Current proof boundary:

- base grid, exact length/intersections, portals, multiple gates and flipping filters have the strongest two-way validation history;
- MustPass/MustCross and other core resource mechanics have substantial mixed two-way validation in real whole-level/prefix workloads;
- surround, must-turn and adjacent-turn have current exact encodings plus targeted known-witness/over-constraint checks, but comparatively shallow deliberately isolated cold-emitted/referee validation;
- static regular filters remain deliberately unsupported because neither stress corpus provides a decision-bearing need for that encoding.

Keep the two validation directions distinct:

- known-valid Pathfinder witness pinned into CP-SAT must remain feasible;
- model-emitted witness must pass the canonical Pathfinder referee.

Timeout/UNKNOWN/unsupported never become dead/UNSAT truth.

Do not launch a generic validation campaign to make the matrix cosmetically complete. If a ranked exact query depends materially on landmark turn/surround semantics, buy a small targeted cold/prefix emitted-path referee suite for those semantics first. Otherwise use the oracle only as a microscope/counterexample source for a concrete ranked beam, repair, abstraction, attainability, or certificate question.

## #6 restarts and learned failure

Extra repair seeds clearly buy capability, including the promoted August 23 late-probe multi-seed tier. Those experiments were additive. They prove seed diversity, not that restarting beats continuing under a fixed total envelope.

### Restart side: execution gate before A/B

The intended comparison remains canonical fixed work:

- continuation: seed 0 continuously to total work `W`;
- restart: seed 0 to `W/2`, then fresh seed 1 to `W/2` if still unsolved.

But the current convenient late-repair research override is a **node** cap, while the tier's work cap is a separate generous additive cap derived from the solve's time budget. Equal node caps therefore do not establish equal `workSpent`. `strictTotalWorkBudget` is also not a clean substitute because it includes all earlier ladder work before the repair arm.

Before running the A/B, expose or reuse one narrow research path that can cap the isolated repair arm in canonical `workSpent`, preserve the seed-0 trajectory for continuation, create a genuinely fresh seed-1 restart, and charge failed arm work. The accounting fixture, not solve count, is the acceptance test for this prerequisite.

Freeze the first treatment to the single 50/50 two-seed split above. Do not optimize seed count and split in the same first pass. Define any baseline-failure-conditioned residual population only after freezing its baseline solver commit/work contract.

### Learned-failure side: cheap Stage A first

Keep three concepts separate:

- repair-local **experience memory**: incomplete stochastic failure reuse;
- exact-state memoization: only safe with future-complete state and already measured weak for broad DFS/beam use;
- structural learned reasons: sound smaller predicates that recur across distinct exact states or fire materially earlier.

Connectivity remains the only compelling first structural family because it is expensive and throttled. But the pilot is now staged more cheaply.

`isConnected()` already knows, at the existing rejection return site, whether the completed flood fill failed because of:

- goal unreachable;
- pending MustPass unreachable;
- pending MustCross unreachable; or
- portal-free residual-volume shortage.

Stage A should log that already-known subtype plus the rejected objective where applicable, existing length/intersection/pending-mask context, exact-state fingerprint, stage/action identity and work point. It must not rerun connectivity or alter search. This is observational triage, **not** a reusable proof certificate.

Only if Stage A shows enough cross-state/cross-parent recurrence or useful gaps between scheduled connectivity checks should Stage B pay to read/canonicalize the already-materialized reached set and boundary blockers. A negative Stage A cheaply closes learned logical failure without building graph-certificate machinery.

## #7 repair

Exact retreat evidence contains both shallow and deep liveness-return regimes. Therefore “retreat farther” is not a universal answer, and one proposed reconstruction experiment has already been partially answered.

Use the diagnostic matrix with an explicit operator:

| exact prefix | bounded named native reconstruction | interpretation |
|---|---|---|
| dead | fails | control |
| dead | succeeds | correctness/reference alarm |
| live | succeeds | this operator can exploit the live commitment; retreat/selection may be the bottleneck |
| live | fails | this operator cannot exploit an existing completion at the tested envelope |

`R00648` already occupies the final quadrant for both current repair technique classes. A CP-SAT-verified live prefix at depth 30 was replayed into native state; direct `closeLengthGap` still failed with `floor=0` and a 2,000,000-node allowance, about 500x its production budget. From that same live state, 2,000 independent randomized native rollouts produced **0 solves**, averaged about 4.3 moves before death, and reached at best depth 60 of required length 141. Do not rerun nearby budget variants as though this premise remains open.

`R03176` supplies useful contrast: an isolated full repair run eventually solves around 1.86M nodes with `closeLengthGap` succeeding on restart 914. That is **not yet equivalent** to handing its exact `D_live` prefix directly to the operator, so it remains classifiable if that exact question matters.

For new comparisons, classify the remaining exact-live cases with one prespecified named existing operator and canonical `workSpent`; use known-dead points as cheap correctness controls where practical. Do not buy more CP-SAT time merely to narrow existing UNKNOWN intervals.

MustCross first-pass state is no longer a lead repair descriptor. It separated only `S00030` among the exact beam A/D pairs, and a local required-axis corridor check separated none. Record it only as a cheap optional diagnostic if already available.

Only recurrent shallow-live/operator-success cases justify a reversible retreat treatment. Repeated live/operator-fail cases may justify stronger bounded reconstruction. Large destroy/core-guided work still requires a recurrent genuinely deep-retreat population; `R00630` is a nomination, not enough by itself.

## #8 speed

Recent V8 optimization remains productive. Do not jump to a language rewrite merely because the solver is compute-heavy.

The current candidate-generation/apply/undo/scoring region is not a compact native boundary: it mutates broad path/resource/mechanic state and reads a large prepared collection of distance maps and metadata. A per-candidate crossing would be poor; moving enough state native to avoid crossing costs becomes a search-core migration and fails the bounded-prototype premise.

Reopen native/WASM only if a later architecture naturally creates a compact shared-memory kernel or a different isolated hotspot emerges.

A real generated/specialized JS scorer remains plausible if fresh profiling still shows scoring dominant. The opportunity is static **mechanic/template structure**, not sparse weights. Nearby “obvious” optimizations such as pre-resolving ordinary ablation gates and hoisting one cheap distance lookup have already measured null/negative.

## Completed/deprioritized forms

Do not reopen unchanged merely because code/report names survive:

- broad “give repair more budget” as a generic fix;
- broad repair-fallback gate widening on existing coarse features;
- generic elite-pool/relink/diversification work without a newly diagnosed conditional failure;
- universal beam-width increases;
- broad DPP/MAP-Elites/novelty-archive machinery before a cheap future-coverage descriptor earns it;
- production ZDD/DD/frontier frameworks before a bounded interface question earns them;
- generic `REGULAR`/resource-automaton infrastructure before a compact residual subproblem earns it;
- exact global DFS/beam transposition caching as a major opportunity;
- context-equivalent caching from an approximate interface without a future-sufficiency proof;
- broad CDCL/LCG/MUS machinery before one recurring sound reason class demonstrates value;
- a generic RCSP/label-setting engine or ordinary “less resource used is better” dominance for exact targets;
- broad symmetry canonicalization/retries as a substitute for diagnosing representation bias;
- survival/hazard/bandit/value-of-computation scheduler machinery before simple tranche repricing shows residual headroom;
- bulk variant generation without a specific unanswered question;
- framework-building for its own sake.

## Evidence anchors

- [`solver-research-operating-model.md`](solver-research-operating-model.md)
- [`solver-scheduling-policy.md`](solver-scheduling-policy.md)
- [`solver-residual-state-representation.md`](solver-residual-state-representation.md)
- [`solver-budget-determinism.md`](solver-budget-determinism.md)
- [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md)
- [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md)
- [`solver-correctness-hardening.md`](solver-correctness-hardening.md)
- [`architecture-unification-debt.md`](architecture-unification-debt.md)
- [`variant-level-research.md`](variant-level-research.md)
- [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md)
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)
- [`../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md`](../reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md)
- [`../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md`](../reports/2026-08-23-solver-confirmation-transfer-protocol-design.md)
- [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md)
- [`../reports/2026-08-24-queue-readiness-artifact-reconciliation.md`](../reports/2026-08-24-queue-readiness-artifact-reconciliation.md)
- [`../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md)
- [`../reports/2026-08-24-scheduler-evidence-contract-audit.md`](../reports/2026-08-24-scheduler-evidence-contract-audit.md)
- [`../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md)
- [`../reports/2026-08-24-beam-full-pool-capture-readiness.md`](../reports/2026-08-24-beam-full-pool-capture-readiness.md)
- [`../reports/2026-08-24-restart-continuation-value-audit.md`](../reports/2026-08-24-restart-continuation-value-audit.md)
- [`../reports/2026-08-24-learned-failure-certificate-audit.md`](../reports/2026-08-24-learned-failure-certificate-audit.md)
- [`../reports/2026-08-24-repair-reachability-reconstructability-audit.md`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md)
- [`../reports/2026-08-24-speed-substrate-static-audit.md`](../reports/2026-08-24-speed-substrate-static-audit.md)
- [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md)