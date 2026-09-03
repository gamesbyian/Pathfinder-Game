# Solver future work

Deferred/reopen ideas that are **not current execution priority**. Current execution priority lives in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); research rules in [`solver-research-operating-model.md`](solver-research-operating-model.md); retained default-OFF dispositions in [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md).

Historical ledger: [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md). Prior evidence: [`../reports/README.md`](../reports/README.md) or `node scripts/research-status-index.mjs --compact --query=<term>`.

## Active elsewhere, not backlog

Do not recreate these programs here; the workstream authority owns their execution priority.

| Topic | Current authority |
|---|---|
| Generalization / confirmation blocks / cross-generator challenge | [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md); [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); historical [`cohort reservation`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md) |
| Automatic solver action selection | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`solver-scheduling-policy.md`](solver-scheduling-policy.md) |
| Beam retention at exact extinction boundaries | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`beam descriptor audit`](../reports/2026-08-24-beam-extinction-descriptor-sanity-check.md) |
| Exact/reference-model program | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`reference-model audit`](../reports/2026-08-23-solver-reference-model-capability-audit.md) |
| Restart allocation / learned failure | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`restart audit`](../reports/2026-08-24-restart-continuation-value-audit.md), [`learned-failure audit`](../reports/2026-08-24-learned-failure-certificate-audit.md) |
| Repair reachability / reconstructability | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`repair audit`](../reports/2026-08-24-repair-reachability-reconstructability-audit.md) |
| Architectural speed | [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) |

## Entry contract

An item here is a question, not authorization to build a framework. Before substantial implementation, name:

1. the limitation/evidence that motivates it;
2. the cheapest pilot that could falsify it;
3. the comparator and shared-work contract where search policy changes;
4. success and stop gates;
5. how any positive offline result could become legal level-blind production behavior.

Check current code, queue, ledger, [`tooling-catalog.md`](tooling-catalog.md), and prior evidence first. If an idea becomes active workstream work, move its live gate to the queue/current topic doc and leave chronology in reports.

## Deferred representation / search-quality questions

### Residual interfaces and bounded future models

Durable vocabulary lives in [`solver-residual-state-representation.md`](solver-residual-state-representation.md). The deferred question is whether any bounded residual family admits a compact representation that adds information beyond current prunes/search state without approaching full state.

Candidate forms include exact boundary/interface state, restricted representative future sets, safe relaxed future models, and counterexample-guided refinement of coarse signatures.

**Pilot:** on a small exact-labelled population, show one recurring compact structure that answers a current decision better than existing descriptors.

**Stop:** if interface width/state explodes, exact counterexamples require idiosyncratic history, or a relaxation merely duplicates current prunes, do not build DD/ZDD/CEGAR/backdoor infrastructure.

### Residual opportunity beyond current prunes

Among states already passing the hard-prune pipeline, can a cheap safe quantity separate exact-live from exact-dead earlier?

Prespecified families worth considering only when a ranked question needs them:

- upper residual capacity complementing lower bounds;
- parity/congruence or small attainable-value summaries for exact resources;
- component/cut/bridge/corridor capacity;
- joint obligation/topology summaries;
- finite-state/resource propagation for a genuinely compact mechanic subset.

A proved one-sided condition may become a prune; a safe relaxation a bound; an unsound predictor only ranking/retention guidance; an expensive exact computation only an offline oracle. For exact targets, “less resource used” is not automatically dominant.

**Pilot:** reproducible early live/dead separation beyond current prunes across unrelated parents with plausible check cost.

**Stop:** if summaries mostly duplicate current checks or require near-exact residual solving, close the generic direction.

### State-conditioned must-cross policy

Unconditional must-cross attraction is closed. A future form must use legal live state to distinguish target/defer/reserve-second-approach decisions and recur across unrelated parents.

**Pilot:** a compact state descriptor separates exact-live/dead or successful/failing choices better than current local heuristics on held-out parents.

**Stop:** reject family identifiers, selected-case-only effects, or runtime dependence on known solutions.

### Promoted search-quality gates

Orientation/symmetry first-divergence and guidance-distance first-divergence now have live gates in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). Keep chronology there only as short gate state; detailed evidence belongs in reports.

## Deferred interoperability / infrastructure

### Typed producer → consumer artifacts

One stage may sometimes discover information another cannot cheaply reproduce, such as proven dead interfaces, exact-live descriptors, scarcity signals, or structural certificates. Do not build a general blackboard.

A handoff must demonstrate consumer limitation, novel timely information, bounded production/storage/replay cost, independent control, positive shadow evidence, and matched-work benefit. Charge artifact production and consumption.

**Stop:** if the consumer can cheaply rediscover the information, it arrives too late, or consumption displaces better search, keep stages independent.

### Queryable analytical layer

Build a new analytical store only if joins among run identity, attempt telemetry, static features, families, oracle labels, and experiment arms continue spawning bespoke scripts after existing census/lifecycle helpers are extended.

Any generated views must be rebuildable from canonical evidence/manifests and must not become a second production-policy truth source.

**Stop:** if a few reusable join helpers solve the repeated queries, use them instead of a database/schema project.

## Explicitly demoted patterns

Do not reopen unchanged without materially new evidence:

- generic dead-last whole-ladder retries or global seed fan-out that merely buy more total work;
- another hand-authored scoring profile whose novelty is only weights/name;
- nearby-threshold widening of a coarse repair gate or broad extra repair budget after full-budget failure;
- generic ALNS/adaptive-operator machinery before complementary operators earn it;
- universal beam-width increases or large novelty/MAP-Elites/DPP machinery before a simple descriptor-aware treatment earns it;
- production ZDD/DD/frontier, representative-set, `REGULAR`/resource-automaton, CEGAR/interpolation, or backdoor frameworks before a bounded residual question demonstrates value;
- exact DFS transposition caching or approximate-interface equivalence caching without new sound recurrence/sufficiency evidence;
- broad CDCL/LCG learning without a recurring compact sound reason family;
- generic RCSP/label-setting or exact-resource dominance without a sound completion-subsumption proof;
- broad symmetry canonicalization/rotate-mirror retries instead of causal first-divergence diagnosis;
- hazard/bandit/ML scheduler machinery before the queue's simpler dynamic tranche-value pilot shows held-out incremental value;
- giant variant generation without an unanswered question and analysis plan;
- full-corpus A/Bs for ideas already falsified causally;
- retaining closed experiment code solely as archive;
- optimizing a proxy after cold solve/work/correctness fails to improve;
- framework-building before the smallest value-of-information pilot succeeds.

This file should remain short. If chronology or detailed evidence starts accumulating here, move it to a dated report.