# Solver research operating model

> **Status:** current research-method/evidence-routing contract.
> **Execution priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) owns current execution order and workstream state.
> **Evidence discovery:** [`solver-research-data-assets.md`](solver-research-data-assets.md) inventories durable research-data/evidence families, join keys, inter-relevance, and leakage/freshness boundaries.
> **Technique/config interpretation:** [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
> **Capability/generalization boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).
> **Evaluation evidence:** [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) owns development/confirmation/transfer roles and proportional evidence gates.
> **Capability evidence:** [`solver-capability-evidence.md`](solver-capability-evidence.md) owns the offline distinction between an experiment's promotion disposition and the complementary capability it demonstrated or displaced.

Measurements belong in dated reports, current workstream decisions in the workstream authority, deferred work in [`solver-future-work.md`](solver-future-work.md), and retained/default-off dispositions in [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). Pre-consolidation notebook: [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

New/unregistered questions enter through [`research-question-intake.md`](research-question-intake.md): contextualize and collapse the ambiguity before minting an ID. Known-ID solver questions start from `research:dossier`; research-system questions do not enter the solver-science registry by default.

## Pipeline

> semantic truth → controlled evidence → failure class → exact/shadow evaluation → narrow intervention → level-blind matched-work verdict → confirmation proportional to selection pressure → cross-distribution challenge when the claim warrants it

Correctness bugs may go directly to fix + regression/soundness validation. Speculative heuristics should test the premise first with existing observers, oracles, family comparisons, reducers, isolated probes, or replay tools.

## Shared research-domain primitives

Reuse the smallest common semantic owners where their meaning genuinely matches:

- `research-semantic-identity-lib.mjs` — semantic hashing; specialists define hash domains.
- `research-population-identity-lib.mjs` — identity sets/hashes/set relations; callers prove basis compatibility.
- `research-observation-integrity-lib.mjs` — generic row outcomes/completeness; specialist verdicts stay separate.
- `research-question-contract-lib.mjs` — live ambiguity, discriminator, outcome interpretation, MO syntax.
- `research-evidence-applicability-lib.mjs` — purpose-local applicability lattice + conservative meet.
- `research-evaluation-evidence-role-lib.mjs` — development/confirmation/transfer roles.
- `research-claim-lib.mjs` — claim identity, material edges, bounded reverse invalidation.
- `research-resolution-envelope-lib.mjs` — observability axes/blockers/readiness.
- `research-independence-vector-lib.mjs` — causal-independence shape, no aggregate score.
- `research-unit-topology-lib.mjs` — observation/opportunity/assignment/dependence/analysis/generalization roles.
- `research-repository-ref-lib.mjs` — repository-reference syntax/existence; consumers own semantics.

Shared ownership applies only to the named invariant, not similar field names. Algebraic/compositional hardening lives in [the research-system algebra audit](solver-research-system-algebra-audit.md); add one semantic law at a time, not a generic framework.

## Research authority ownership

Do not collapse distinct kinds of state merely because they describe the same line of work.

- **Execution priority and next gate:** `solver-optimization-workstreams.md`.
- **Scientific-question lifecycle and reopen condition:** `solver-research-question-relations.json`.
- **New report-local status/decision/remaining gate:** the structured `pathfinder.research-closeout/v1` capsule; the Markdown status block is a human mirror and legacy fallback.
- **Evidence applicability:** the evidence-family classifier for the stated purpose/regime, using the shared applicability lattice; there is no global timeless applicability flag.
- **Claim validity/invalidation:** the claim plus its material derivation dependencies, not a report summary.
- **Production default polarity:** runtime code/config. The opt-in ledger owns promotion disposition for retained default-OFF experiments, and its promoted-history rows may carry a primary decision-evidence ref; that provenance edge does not override runtime truth.

An active workstream may legitimately reference a `deferred-reopen` scientific question when satisfying its reopen trigger is the current execution gate. A live workstream referencing an unknown or terminal question is an authority error. Derived indexes/inventories may expose these relationships but must not silently become a second owner.

At every cross-artifact scientific join (result/integrity, control/treatment, result/contract, reconciliation, durable persistence), prove identity at the consuming boundary. Filenames, labels, step order and separately valid documents are not identity evidence; prefer one identity owner, validate duplicated identity, and fail closed on mixed strong/legacy identity.

### Prose versus machine state

Keep nuanced/open-ended scientific reasoning in prose when no machine consumer can evaluate it. Stable categorical meaning used by software or multiple authorities needs an enum, ID, relation, or structured capsule rather than prose parsing; consumers use the machine owner. See `reports/2026-09-19-research-prose-authority-audit-001.md`.

Likewise, join on stable IDs/edges when available. Lexical similarity is discovery/fallback only and must not silently manufacture authority.

For relationship quality, prefer: validated authored ID/edge > authored one-way path/ID with referential integrity > embedded contract identity discovered from candidate files > explicitly labelled lexical/path discovery. If both endpoints author the same relation, check agreement. Co-location, filenames, hyperlinks and shared vocabulary may discover candidates but do not define membership or scientific ancestry. See `reports/2026-09-19-research-relation-authority-audit-001.md`.

## Concept-family and inversion checkpoint

Before promoting a premise/question, state its claim, mechanic support, novelty witness, opportunity denominator, proof/response value, nearest material siblings, and nearest **useful inverse**. Inverses test directional bias such as add/remove, starvation/overexposure, DEAD/LIVE-slack, universal/per-instance, failure/success, or invention/obsolescence. They create no queue entitlement: reuse an owner or pass the ordinary evidence/discriminator/population gates. See [small exact projections](solver-small-exact-projections-program.md) and the [inversion audit](../reports/2026-09-21-solver-research-question-inversion-audit-001.md).

## Stop rules

These are gates, not aspirations.

1. **No fixed-ladder accretion by default.** A late retry/seed/profile/width/reserve that buys additive work is not free because earlier winners cannot regress. New actions normally compete inside a fixed aggregate `workSpent` envelope or explicitly justify a larger product budget.
2. **Treat knobs as configurations until evidence shows a different mechanism.** Names, weights, templates, widths, directions, tie-breaks, seeds, thresholds, and budget bands do not create new algorithms. Prefer bounded sweeps/racing/configuration search to serial artisanal guesses.
3. **Selection is part of the result.** Data used to discover a pattern, choose a threshold/config/seed/population, or pick the best arm/metric is development data for that decision. Evidence intensity scales with that selection pressure: a trace-preserving speed fix does not need a statistical holdout, while a winner selected from many routing/configuration alternatives normally does. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).
4. **Level-blindness is not generalization.** Runtime may use mechanics/current state, not identity/history/hints/winners. A level-blind policy repeatedly tuned on one corpus can still overfit it. A new seed from the same generator can provide sample-independent confirmation, but broad cross-distribution claims need a materially different source/generator. Group variants by parent.
5. **Unexplained stage-history dependence blocks causal inference.** Identical explicit level/action/config/seed/work should not change capability because unrelated predecessor stages ran unless a typed handoff is part of the contract. Cache warmth may change wall cost, not semantics/search order/randomness/work accounting.
6. **Use the right cost currency.** `workSpent` compares heterogeneous techniques; raw nodes diagnose one technique; wall time measures implementation cost/latency. Do not confuse algorithmic policy with kernel speed.
7. **Use the smallest evidence that can decide the next gate.** Diagnose participation/budget/instrumentation once, stop directly falsified forms, and expand populations only after a narrower pilot earns it. Full-corpus compute does not rescue a weak premise.
8. **Do not generate data by default.** Consult [`solver-research-data-assets.md`](solver-research-data-assets.md) and query existing corpus, provenance, profile, census, lifecycle, family, trace, exact-label, manifest, historical, and capability-evidence evidence first. If level generation is earned, use [`solver-research-generation.md`](solver-research-generation.md) to choose/compose source regimes without collapsing their evidence identities. A new large batch needs an unanswered question, intended analysis, independent unit, pilot, expansion rule, and stop condition. See [`variant-level-research.md`](variant-level-research.md).
9. **Extend existing plumbing before adding another tool/store.** Start at [`tooling-catalog.md`](tooling-catalog.md), current manifests/indexes/telemetry, and reusable helpers. Delete one-offs after use or document them only after repeated value.
10. **Diagnose search-quality failure before prescribing more of the same search.** If a technique already fails with substantial/full isolated work, prefer first-divergence, retention, operator, restart, exact-feasibility, learned-reason, or representation evidence over another nearby reserve/score/budget.
11. **Use exact/reference controls when they can answer the question.** Validate real witnesses in the model and model witnesses with the canonical referee; timeout/unsupported/relaxed models do not manufacture dead/UNSAT truth.
12. **Do not preserve failed code for posterity.** Git/reports are the archive; the opt-in ledger retains code only for current reusable plumbing, counterfactual value, or identified descendants.
13. **Do not optimize proxies after the real objective stops moving.** Badness, lineage survival, shadow catch, similarity, classifier accuracy, and frontier diversity are diagnostics. Promotion requires cold solve/work/correctness value.
14. **Do not hide rare capability in an average.** Report denominators, uncertainty, paired gains/losses, unique residual solves, and Pareto tradeoffs. One spectacular selected level also does not buy broad entitlement.
15. **Frameworks must earn implementation.** Start scheduler/configurator/reference/analytics/shadow/learning infrastructure with a value-of-information pilot and stop condition. Before adding a durable registry, namespace, store, taxonomy, authority, or broad observer, name the inadequate existing primitive, real consumer, why extension/derived view is insufficient, what becomes simpler/removable, and the stop rule. Keep retrieval joins derived, cross-contract translations as adapters, one-current-fact surfaces canonical, and reserve shared primitives/lifecycle objects for repeated correctness-critical semantics demonstrated by at least two materially different live producers/consumers.
16. **Prefer branch/PR evidence.** Merge before decision-bearing validation only when the required execution/data path cannot exercise the branch; record why. Do not use `main` as experiment scratch space.
17. **External best practices are hypotheses, not authority.** Literature can nominate methods; Pathfinder still needs a problem-specific comparable-work/correctness pilot.
18. **State the ambiguity before buying measurement.** When discrimination is the point, record live rivals, the discriminating observable, and outcome interpretations. Preflight may carry this contract; MO IDs confer no queue authority.
19. **Separate promotion disposition from demonstrated capability.** A treatment can be correctly closed while still proving complementary capability, and a promoted treatment can displace old capability. Preserve material gain/loss/cost/mechanism evidence as offline capability evidence without retaining failed code or turning exact historical outcomes into runtime routing. See [`solver-capability-evidence.md`](solver-capability-evidence.md).
20. **Prove observability before interpreting a null as negative evidence.** For the claim at issue, establish the required eligibility/applicability, opportunity/headroom, reach, real participation/exposure, measurement support, execution fidelity/comparability, coverage, and censoring conditions. A missing/unsupported/unreached/non-participating/fidelity-mismatched/censored observation is an observability deficit, not ordinary negative evidence. Classify the blocker and route the smallest acquisition/routing/allocation/instrumentation repair before scaling or closing the premise. See [`2026-09-19-research-observability-envelope-audit-001.md`](../reports/2026-09-19-research-observability-envelope-audit-001.md).
21. **Co-design observability and discrimination.** State the live rivals and smallest discriminating observable, then derive only the observability axes required for that discriminator. Reject discriminators the current population/instrument cannot expose; reject broad data collection that cannot separate the important rivals. A live question is resolution-ready only when the discriminator is decision-changing and its observability envelope is satisfiable. See [`2026-09-19-research-identifiability-and-synchronous-resolution-audit-001.md`](../reports/2026-09-19-research-identifiability-and-synchronous-resolution-audit-001.md).
22. **Rival sets are decision-bounded by default.** Separating named alternatives does not prove they exhaust explanations; record decision-relevant omissions.
23. **Freeze decision-bearing numbers with the contract.** Thresholds, caps, sample sizes, action/config identities and cut points live in the frozen machine artifact; CLI overrides must match.
24. **Calibrate measurement reactivity.** If telemetry can alter search/allocation/work/timing/memory/participation, require parity plus bounded overhead/volume evidence. Under wall-clock termination, a read-only callback can still change observable reach: prove OFF/ON reach/work/opportunity parity, prove wall time non-binding, or label rates/coverage observer-conditioned. Otherwise keep it research-only.
25. **After the first useful abstraction, run a closure pass.** Ask: staleness, co-transitioning authorities, omitted rivals, observer effect, quantitative owner, target scope, useful joins, adaptive selection, invalidation, and semantic-vs-proxy tests. See `reports/2026-09-20-research-session-local-optima-retrospective-001.md`.
26. **Prove joins, not only endpoints.** Two individually valid artifacts do not make a valid scientific join. At every plan/result, control/treatment, result/integrity, contract/result, cross-run, family/corpus or evidence-enrichment boundary, validate the identity dimensions that make the relation meaningful: population, execution/configuration, protocol, solver revision, treatment/arm, partition/shard, run/attempt and independent unit as applicable. Missing identity must remain weak/unknown rather than being silently reconstructed from filenames, row order, directory order or a neighboring document. A mixed modern/legacy join may remain available for explicitly weak reanalysis, but must not silently inherit the stronger side's entitlement.
27. **Test the surface automation actually invokes.** Library/unit tests do not prove a workflow-facing CLI. For scripts called by maintained automation, exercise argument parsing, required inputs and emitted output through the real CLI path when a small fixture can do so; keep static guards for recurring parser/transport mistakes. A passing exported-function test must not be used as evidence that the shell/workflow contract is executable.
28. **Stop required acquisition when a frozen decision is irreversibly locked.** For prospectively declared monotone gates, stop once unseen completions cannot change the disposition. Retain the lock reason, independent support, remaining units and in-flight work. Early-stopped populations keep `coverageComplete` / `decisionValidComplete` false and support only the locked disposition. Never derive the rule retrospectively. See [the decision-latency audit](../reports/2026-09-20-solver-research-batch-decision-latency-audit-001.md).

## Capability and evidence roles

The product case is an unseen editor level. Cold solves may use mechanics, current state/telemetry and generic code/config only. Saved hints/solutions, prior winners/configs/seeds, historical outcomes, persistent exact-level memory, IDs/corpus position and practical identity recognition are forbidden steering. Solve-local facts derived only from legal current inputs are level-blind legal in principle; soundness and economics remain separate gates. See [`solver-level-blindness.md`](solver-level-blindness.md).

Use three renewable roles, defined fully in [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md):

- **development/tuning:** freely inspected evidence used to invent/fit treatments;
- **confirmation:** sample-independent evidence used after the treatment is fixed;
- **transfer/challenge:** evidence from a materially different source/construction distribution for broader claims.

Prefer locked untouched blocks for repeated confirmation. Spend only the block that informs the decision. Once its exact results influence redesign, it becomes development evidence for descendants.

## Failure classes

| Class | Meaning | Typical instrument |
|---|---|---|
| Correctness / soundness | Legal solution rejected, invalid accepted, unsound prune/cache/state identity, or unexplained lifetime dependence | referee, differential test, tiny exact reference, reducer, fresh-vs-preceded replay |
| Regression | Current level/config reproducibly loses prior capability | bisection, exact replay, causal ablation |
| Routing | A technique solves cheaply in isolation but production does not allocate useful work | census, method probe, lifecycle telemetry |
| Search quality | Technique receives substantial/full isolated work and still fails | traces, exact labels, operator/representation/restart diagnosis |
| Representation / retention | Viable material is generated then ranked/deduped/culled away | lineage, pair divergence, exact-prefix oracle, shadow descriptors |
| Allocation | Useful actions compete for finite shared work | lifecycle accounting, explicit caps, matched-work A/B |

Do not call both routing and search-quality failures “starvation.”

## Technique/config comparison

Keep separate:

- **source/config similarity:** shared engine/scorer/scoring-profile weights/ordering bias/prunes/context;
- **outcome similarity:** overlapping solve/fail/work vectors;
- **operational similarity:** similar encountered choices/frontiers/orderings/retention.

Different names do not prove diversity; solve-set overlap does not prove operational redundancy. See [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).

When tuning configurations, define legal ranges, use cheap racing, record the search size/objective, evaluate marginal portfolio value/rare exclusives, and compare complex policies to simple baselines.

## Scheduling/allocation

[`solver-scheduling-policy.md`](solver-scheduling-policy.md) owns the active program. Important evidence rules:

- value actions/continuation tranches on the population that reaches them;
- use stable action/config identity and a shared work envelope;
- historical `P(B solves | A failed)` is observational until reach/sequence/state/work confounds are controlled;
- expose Pareto tradeoffs and rare unique capability;
- use parent-family splits for family-trained rules;
- test simple static/oracle-frontier headroom before dynamic/ML scheduling.

## Evidence hierarchy

1. canonical referee truth;
2. exact/bounded oracle labels with approximation direction explicit;
3. controlled paired evidence;
4. untouched/grouped confirmation after selection;
5. cross-distribution transfer/challenge evidence for broad claims;
6. level-blind population evidence for corpus-scoped production decisions;
7. historical/forensic evidence for nomination after current-code reconciliation.

Row count does not remove dependence; a large selected cohort is still selected.

## Experimental substrate and shadow-first rule

Prefer existing deterministic work accounting, manifests/run identity, stress/lifecycle telemetry, family/provenance tools, shadow probes, known-solution-prefix survival, explicit-prefix/reference labels, reducers/replay, census/method probes, capability-evidence joins, and operational-similarity observers. Use [`solver-research-data-assets.md`](solver-research-data-assets.md) to inventory the evidence substrate and valid joins, then [`tooling-catalog.md`](tooling-catalog.md) to choose the smallest current tool that answers the question.

For cross-run health/trend questions, prefer `reports/stress/solver-health-timeline.jsonl` over re-deriving compatible run snapshots. Its compact records preserve execution/population identity, solve/work/stage summaries and solved-set churn without extra solver compute; exact churn IDs remain offline forensic evidence, never runtime steering.

For scoring, retention, routing, scheduling, or information-sharing hypotheses, observe before changing search where practical. Unless parity itself is the experiment, instrumentation must preserve solution, work, ordering, randomness, and cache/memo lifetime. A shadow-positive selected candidate still needs a live solve/work verdict and independent confirmation.

## Producer → consumer cooperation

A live handoff needs measured consumer limitation, producer information the consumer cannot cheaply rediscover, timely arrival, bounded production/storage/replay/branching cost, an independent consumer control, positive shadow evidence, and a level-blind matched-work verdict. One useful handoff does not justify a general blackboard.

## Family and accepted-path evidence

Use variant families for controlled diagnosis, never production lookup or independent-row bulk statistics; generation follows [`variant-level-research.md`](variant-level-research.md). Referee-validate paths, retain provenance, and keep them out of cold solves. Fixed reusable descriptors need recurrence across unrelated parents; instance-derived proofs/plans need soundness plus useful solve/work behavior across independent levels. One path is a case study, not a population.

## Promotion contract

Production-facing treatments normally require: level-blind execution; identifiable code/protocol; complete intended population or explicit sample; non-binding deadlines when work comparability matters; comparable arms; gains/losses; `workSpent`, nodes, errors/truncation as relevant; no hidden hint/data mutation; and queue/ledger updates when disposition changes.

Selected/tuned treatments normally need sample-independent confirmation proportional to selection pressure. Use cross-generator transfer for broad, heavily tuned/global/learned, or distribution-sensitive claims, and require the transfer population to expose the relevant causal opportunity, not merely compatible mechanics. Report population, coverage, independent unit, exclusions and denominators; scheduling also needs total-work envelope, reach, rare unique wins/losses and a simple-policy comparator. Proxy improvement alone is insufficient. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

At closeout, a production verdict and a capability signature are distinct. Preserve material complementary gains/losses/mechanism evidence through reports or the derived capability-evidence interface when it can nominate future generic premises; do not preserve failed implementation code solely to keep that evidence accessible.

## Before expensive decision-bearing runs

Use [`investigation-report-conventions.md`](investigation-report-conventions.md), `solver:experiment-preflight`, and [`solver-experiment-opportunity-sizing.md`](solver-experiment-opportunity-sizing.md) where applicable. Before dispatch:

1. **Existing evidence:** query the research-data registry/status index and identify evidence that could falsify, stratify, contextualize, independently challenge, or expose complementary historical capability relevant to the premise. Record materially relevant rejected joins when rediscovery would otherwise waste work.
2. **Opportunity/headroom:** state the exact event that can differ, estimate the control-side opportunity rate, and derive N from the number of informative rows needed. Separate benefit-enriched and representative no-harm populations.
3. **Single population source:** resolve the literal ID/position vector once and make plan, execution, combine, and manifest consume or validate that same selection. A count-only/planning path must not implement different sampling semantics from execution.
4. **Execution-family canary:** before large matrices or many shards, run the smallest representative cell/level for each materially different execution family under the exact resolved cap/flags/selector mode. Use `scripts/verify-canary-cell.mjs` on the same entrypoint/row shape as the real fan-out; require a well-formed non-error observation with real attempts/work, and prove any supposedly non-binding wall deadline did not fire. Participation-rate claims belong to full-population integrity, not a one-cell canary. Extend this shared pattern rather than inventing bespoke workflow canaries.
5. **Resolved treatment provenance:** persist the actual arm/config/flags/workflow inputs at the solver invocation boundary, not only a matrix label. Confirm that control and treatment differ only on declared dimensions.
6. **Budget and wall scale:** size enforced solver-side caps from representative production/control evidence. Use existing per-level runtime telemetry for shard packing/timeouts when available; scheduling telemetry is infrastructure metadata and must not steer cold solver policy.
7. **Schema/feature assertions:** use canonical helpers for derived level features and assert required report-row fields before filtering or stratifying. Missing/undefined derived inputs are configuration errors, not false predicates.
8. **Decision contract:** record treatment/control/ref, evidence role, outcome/cost, candidate search, success/stop/escalation and framework gates. If live rivals remain, add ambiguity, discriminator and outcome interpretation; available telemetry alone is not a reason to collect it.
9. **Join proof:** a verdict over separate artifacts must validate the machine identity binding those exact artifacts, not trust prior workflow sequencing.
10. **Executable-surface test:** correctness-bearing workflow CLIs need a real CLI invocation in CI; library-only tests do not prove argument/file wiring.

If a cheap preflight invalidates any of these, fix the design before scaling. A successful large workflow does not repair a non-informative population, a semantically identical A/B, a non-binding treatment, or a mismatched budget contract.

## Documentation handoff

- chronology/measurements → dated report;
- workstream state / current execution priority → [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md);
- durable research-data/evidence inventory and join topology → [`solver-research-data-assets.md`](solver-research-data-assets.md) plus its machine registry;
- capability-signature interpretation / historical-policy complementarity → [`solver-capability-evidence.md`](solver-capability-evidence.md) plus rebuildable derived outputs from `scripts/analyze-solver-capability-evidence.mjs`;
- deferred/reopen work → [`solver-future-work.md`](solver-future-work.md);
- scheduler policy → [`solver-scheduling-policy.md`](solver-scheduling-policy.md);
- retained/default-off disposition → [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- technique operation/similarity → [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md);
- concluded plans/history → archive.