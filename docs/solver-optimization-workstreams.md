<!-- agent-context-budget: warn=10500 max=14000 -->
# Solver optimization workstreams

> **Status:** canonical live authority for solver research priority, state, and next gates.
> **Reconciled:** 2026-09-16.
> **Scope:** improve cold level-blind solve count and/or machine-independent work while protecting correctness/generalization.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md). Scheduling: [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Evidence: [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md). Capability memory: [`solver-capability-memory.md`](solver-capability-memory.md). Human/editor contrasts: [`human-parent-contrast-research.md`](human-parent-contrast-research.md). Architectural speed: [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md).

Program lens: **capability composition** exposes/selects/allocates demonstrated capability; **capability acquisition** creates generic capability where no known action succeeds.

## Data-audit guardrail

The 2026-09-13 audits change evidence interpretation, not execution order. Corpus 1 is not cross-generator transfer (79/102 rows descend from success-selected random levels); Corpus 2 is a mixed development laboratory. Residual/participant claims are population-conditional. Solution profiles describe sampled known solutions: use schema-v3 supported axes, do not equate sampled agreement or exhaustive events with structural/whole-space proof, and treat sparse nearest matches as exploratory. Live Class-2/Class-4 gates do not depend on the invalid transfer/profile premises and must not wait for family generation. Human/editor contrasts are supporting instruments only when they can change a ranked decision. See [`corpus provenance`](solver-corpus-selection-provenance.md), [`profile authority`](solver-solution-profile.md), and the [`re-evaluation ledger`](../reports/2026-09-13-historical-evidence-reevaluation-ledger.md).

## Current execution priority

### 1. Workstream 2: residual capability + fixed-work allocation

**State:** ACTIVE / FIRST PRIORITY.

**Production boundary:** run `34683011115` (**100/102 C1 + 1,048/1,700 C2**, 652 C2 misses) is now **STALE**: the 2026-09-16 class-4 promotion (below) adds capability the atlas/residual do not yet reflect (86 rows newly solved via the promoted dead-last retry, drawn from the 113-row allocation population). Corrected atlas prior to that promotion (refreshed 2026-09-16 against current `hints-random`; classes 1-3 unchanged): 22 not-offered, 39 offered-but-unreached/starved, 37 exact-dispatched/reached with target-action dose not established by the atlas, 159 no-T1-winner-but-historical-candidate, 395 no known admissible/T1 candidate. **Next required action:** a fresh full-corpus control refresh under current (post-promotion) HEAD, then rejoin/rebuild the residual atlas and capability-memory views before drawing further class-4/class-5 conclusions from old counts, per the standing freshness-reconciliation rule. [`atlas`](../reports/2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md), [`observability audit`](../reports/2026-09-14-capability-observability-attribution-audit-001.md), [`atlas refresh`](../reports/2026-09-16-class4-residual-atlas-refresh-and-113-freeze-001.md)

**Class 1-3 rejoin:** class 1 has no free menu headroom; class 3 is exposed/dispatched but is not, from atlas evidence alone, a comparable-work negative. The must-turn-biased late-repair seam is **closed** on economics: the frozen 60-row participant-aware cohort (43 control-unsolved + 17 control-downstream-solved, since only 17 genuine collateral rows existed against the nominal 20) reproduced the SAME 17/60 solved set in both arms — treatment's 4 target-stage solves are exactly the ids a later stage (`late-repair-multiseed-retry`/`guidance-goal-distance-retry`) already solves, zero of 43 gain-stratum rows rescued, and aggregate `workSpent` rose ~6.5%. Per the preflight's stop rule (zero gains after informative participation on >=30 gain rows), this closes the unconditional-exposure form; `R02768`/`R02180` remain valid capability/placement evidence, not economics evidence, and stay excluded as development rows. A reopening needs a materially different placement/selector, not a retry of this form. [`pilot`](../reports/2026-09-13-must-turn-biased-repair-dose-pilot-001.md), [`preflight`](../reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md), [`economics result`](../reports/2026-09-16-class2-must-turn-economics-result-001.md)

**Class 4: PROMOTED.** The default-off true-dead-last additive whole-ladder retry passed its frozen canary (7/8 freshness rows, `R01273` byte-identical, zero non-portal participation), then reproduced **86 referee-valid gains / 0 losses** on the full earned 113-row allocation population, with every non-target stage's reach/attempts/nodesExpanded byte-identical between arms and net *lower* aggregate `workSpent` in treatment despite the extra solves. `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY` and its `_TREATMENT` selector are now production default-ON; the closed-negative global `STRATEGY_PORTAL_COARSE_STATE_MERGE` form is untouched and stays closed. Promotion required fixing a latent read-site gap (`cfg?.FLAG === true` silently no-ops a newly-promoted flag whenever a caller omits `ablation` entirely, which every real production caller does) so the promotion actually takes effect outside test harnesses. Published-corpus regression gate: 160/160, no regressions. `R03365` remains a genuine dose miss at this budget — a future higher-dose/different-mechanism premise, not pursued here. Human/editor portal parents remain a useful future transfer source since topology-composition v0.1 omits portals, now unblocked by this gate's closure. [`freshness`](../reports/2026-09-13-class4-portal-coarse-freshness-replay-001.md), [`canary result`](../reports/2026-09-16-class4-dead-last-frozen-canary-001.md), [`113-row allocation + promotion`](../reports/2026-09-16-class4-113-allocation-promotion-001.md)

**Class 5:** prior generic capability forms and fixed-endpoint homotopy are closed as documented. The research-only lifted open-path observer passes its implementation fixtures, but its offline join to existing exact-labelled material found 28 rows in 26 endpoint/geometry/reference-controlled strata and **zero natural LIVE/DEAD contrasts**. This gate stops on contrast starvation; there is no separation claim and no runtime routing. Any tiny human-parent intervention needs a separately justified question and new exact labels. [`bounded closeout`](../reports/2026-09-15-ws2-bounded-preparation-closeout-001.md)

**Next WS2 gates:**

1. **Production-boundary refresh:** run a fresh full-corpus control refresh under current (post-class-4-promotion) HEAD and rejoin the residual atlas/capability-memory views before any further class-4/class-5 decision reuses old counts.
2. **Class-5 acquisition:** existing exact labels are contrast-starved under endpoint/geometry/reference controls. Keep the observer offline; only a separately justified tiny human-parent exact-label intervention can reopen the gate.
3. **Class 1-3 reopen:** needs a materially different must-turn placement/selector premise, or a changed allocation contract for class 1; not an automatic next action.

**Dispositions:** must-cross neighbour-budget propagation, connectivity-volume portal check, `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`, goal-attraction-disabled retry, and portal coarse-state **dead-last additive retry** (2026-09-16) are **PROMOTED**. Portal coarse-state **global merge**, repair late-probe `7->6` seeds, and late must-turn-biased repair (**economics form**, 2026-09-16) are **CLOSED NEGATIVE**. Solve-local connectivity reason reuse is **CLOSED IN CURRENT POPULATION**. Fixed-endpoint homotopy winding is **CLOSED COVERAGE-NULL**. Admissible-order retry repricing is **DEFERRED**. [`ledger`](solver-opt-in-experiment-ledger.md)

### 2. Workstream 1: automatic solver action selection

**State:** SUPPORTING / NO ACTIVE SELECTOR GATE.

Use capability, lifecycle, provenance, profile, family, census, trace, accepted-path, and capability-memory evidence to distinguish not-exposed from exposed-and-failed, and technique-relative response from shared failure. Production selectors require legal current-level/current-solve signals and confirmation proportional to selection pressure.

For a new structural selector premise, query controlled families first. Family flips nominate; they do not license a selector. Existing variant families are the cheap first pass; when a nominated relation needs human-origin causal replication or a broader selector claim, use whole-parent human/editor contrasts with held-out parents before strong/global promotion. Any profile-derived premise must use current support-aware semantics; legacy nearest-neighbour identity, sampled rigidity, incomplete-chronology saturation, and exhaustive-event markers are not selector features or structural truth. [`provenance`](../reports/2026-09-12-cross-hint-provenance-relations-001.md), [`stage 5`](../reports/2026-09-12-ws1-stage5-first-divergence-result-001.md)

## Workstream state

| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Residual capability + allocation | **ACTIVE / FIRST** | Class-4 dead-last retry PROMOTED (2026-09-16); Class-2 must-turn economics CLOSED NEGATIVE (2026-09-16); next is a post-promotion production-boundary refresh, then Class-5 open-path topological-signature gate. |
| 1 | Automatic action selection | **SUPPORTING** | Reopen for a new legal signal/relation; existing families first, human-parent contrasts when source transfer/clean intervention can change promotion. |
| 6/7 | Repair reachability / architectural speed | **SUPPORTING** | No implementation-speed candidate is earned. When speed becomes active, algorithmic efficiency uses WS1/WS2/WS6/WS7 to preserve a retained solve boundary while reducing `workSpent`; implementation efficiency starts only from a fresh current-head profile. [`speed audit`](../reports/2026-09-15-solver-performance-evidence-lineage-audit-001.md) |
| 3 | Generalization | **METHOD COMPLETE** | Preserve independent units; scale confirmation with selection pressure; treat parents, not descendants, as independent human-family units. |
| 8 | Isolated capability | **SUBSUMED BY WS1** | Isolated winners are selection evidence, not tail entitlement. |
| 0/4 | Restart/randomization / beam retention | **CLOSED IN TESTED FORMS** | Reopen only for a changed recurring mechanism premise; controlled human-parent cliffs may supply recurrence/held-out prediction evidence. |
| 5 | Exact/reference model | **ON DEMAND** | Offline truth for acquisition questions and controlled descendant boundaries. |

## Standing research rules

- Use `workSpent` across techniques; nodes are within-technique diagnostics. New actions/configs normally compete inside total work.
- Level-blindness is not generalization. IDs, historical outcomes, hints, family labels, and capability-memory membership never become runtime routing inputs.
- Corpus/container names are not evidence roles. Preserve generation ancestry, later selection history, prior decision use, and exact population identity.
- Selected residuals/participant cohorts support their conditional question, not unconditional mechanic prevalence.
- Separate observed result from inferential entitlement; narrowing an evidence role does not erase row-level solve/work facts.
- Profile evidence requires supported axes and honest chronology; missing stays unknown, sampled agreement is not rigidity, and exhaustive events are not whole-space proof.
- Preserve **disposition** separately from **capability signature**. Historical gains intersecting current residual are nominations until reconciled.
- A historical null/revert is not a premise verdict until participation, measurement integrity, and formulation are established.
- Clear negatives close tested forms absent a materially new premise; no-op/behavior-identical retries buy nothing.
- For performance evidence distinguish **SUPPORTED_EXACT_FORM**, **FALSIFIED_EXACT_FORM**, **DEFERRED_LOW_VALUE**, **ARCHITECTURALLY_DEFERRED**, **STALE_REPROFILE**, **EVIDENCE_INCOMPLETE**, and **BEHAVIOR_CHANGE_NOT_PURE_SPEED**. Opportunity sizing can terminate work without inventing a treatment result. [`speed authority`](solver-architectural-speed-opportunities.md)
- When speed becomes active, freeze the retained solve boundary and report total `workSpent`, total wall/CPU, pre-winner work/cost, winning action, redundant earlier action cost, displaced capability, DFS/beam/repair contribution, participation/dose, current hotspot shares, representative short/hard latency, and total retained-population compute.
- Hold out independent units and scale confirmation with tuning/selection pressure. For generated human/editor descendants, the parent family is the usual independent unit.
- Reusable rows require matching protocol identity; nominal stage reach or dispatch is not participation. A comparable-work negative requires exact-action work/dose evidence. Timeout/errors are indeterminate, not ordinary failures.
- Refresh residual-derived views after material promotion or provenance reinterpretation before reusing class counts.
- A validated hint prefix proves that prefix live, not alternatives dead. A preserved construction witness proves solvability, not solution-space rigidity or DEAD alternatives. Exact labels are offline truth, never runtime steering.
- A single-level microscope may generate a premise, never a production exception.
- Compact signatures/fingerprints may nominate recurring states/responses; they do not prove semantic equivalence without a sufficiency argument.
- Scheduler fairness/participation is diagnostic, not an objective. Measure marginal value and displaced capability before reallocating.
- Use explicit provenance/config fields for decision-bearing joins, not convenience labels/summary booleans.
- Reconcile old questions before new compute. Prefer the smallest information-value test.
- For controlled structural response, query existing variant families before new generation/broad compute when they can change the decision. If natural/existing families lack the needed source or clean contrast, use the question-first human/editor-parent apparatus rather than bulk generation. [`variant resource`](variant-level-research.md), [`human contrasts`](human-parent-contrast-research.md)

## Cheap evidence routing

Use `research-status-index --compact`, `tooling-census --compact`, `research-asset-query`, `corpus-query`, capability-memory/provenance helpers, and audited family tooling before bespoke work. For earned human-origin contrasts, use `node scripts/human-parent-contrast-pilot.mjs`; it delegates mutation/validation to `family-generate.mjs` and defaults output to `tmp/`. Chronology belongs in dated reports.
