<!-- agent-context-budget: warn=30000 max=36000 -->
# Solver failure-evidence research integration plan

> **Status:** implementation plan; subordinate to current solver-research authorities.
> **Created:** 2026-09-19.
> **Purpose:** turn the newly implemented failure-response/search-loss infrastructure into a low-cost discriminator and reusable research input without creating a second queue, causal taxonomy, database, or production steering channel.
> **Priority authority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Method authority:** [`solver-research-operating-model.md`](solver-research-operating-model.md).
> **Evidence authority:** [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).
> **Deferred/reopen authority:** [`solver-future-work.md`](solver-future-work.md).
> **Capability-history authority:** [`solver-capability-memory.md`](solver-capability-memory.md).
> **Search-loss implementation authority:** [`solver-search-loss-evidence-implementation-plan.md`](solver-search-loss-evidence-implementation-plan.md).

## Implementation status (2026-09-19)

- **Phase 0 authority/consumer reconciliation:** substantially complete. The live queue now routes WS2 through bounded failure-response reconnaissance before selecting first-loss/rejection/2x2; Class-3, H3, Lane G, Lane C, future-work closeout, and the reserve-starvation nomination are connected to their existing owners rather than duplicated here.
- **Phase 1 compact diagnostic promotion review:** calibration gate complete. GHA run `35423841173` clears representative semantic parity/overhead/byte-volume for the compact prune/beam-flow/progress bundle. Universal durable promotion remains **not earned** pending incremental-value and producer-scope evidence; see [the promotion review](../reports/2026-09-19-compact-failure-diagnostic-promotion-review-001.md).
- **Phase 2 common reducer/query:** implemented for the automatic compact response layer as `scripts/failure-response-query.mjs` / `npm run research:query-failure-response --`. Producer-supplied `protocolHash` and solver ref are now preserved when present. Diagnostic-field query expansion remains conditional on Phase-1 promotion.
- **Phase 3 WS2 reconnaissance:** Stage A is authorized by the live queue but awaits a protocol-compatible accumulated compact-response population; do not fabricate one from pre-instrumentation history.
- **Phase 4A Class-3:** acquisition path is now explicit; still waits for a prospective producer covering the Class-3 population.
- **Phase 4B reserve starvation:** stable question registered as `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`; recurrence sizing awaits comparable attempt evidence beyond R00044.
- **Phase 4C/4D H3/Lane G:** remain independently executable under their existing designs; failure evidence is secondary/optional.
- **Phases 5-8:** condition-gated as specified below. No synthetic recurring producer or first-loss selection has been created.

## 1. Why this plan exists

The September 18-19 failure-data work changed the research economics.

Before it, many negative solver runs collapsed to solve/no-solve plus scattered specialist telemetry. Research often jumped directly from an aggregate outcome to a bespoke trace, exact query, or new experiment. The repo now has enough common infrastructure to insert a cheaper evidence ladder:

```text
solver outcome
  -> participation / stage exposure
  -> work allocation / censoring
  -> bounded progress response
  -> canonical prune + beam-flow response
  -> selected rich search event
  -> replayable state/prefix
  -> exact/reference annotation
  -> causal counterfactual or matched-work treatment
```

The purpose of this plan is to make those layers cooperate with existing research rather than remain an isolated instrumentation achievement.

The core rule is:

> **Use failure evidence to decide which expensive question is worth asking next. Do not reinterpret intermediate movement as production efficacy.**

A zero-solve treatment can still reveal exposure, starvation, progress, displacement, or a different search basin. Those facts may nominate the next premise. They do not overturn the treatment's primary verdict.

## 2. Current implemented substrate

Do not rebuild these pieces.

### 2.1 Automatic compact failure-response documents

[`solver-failure-response-lib.mjs`](../scripts/solver-failure-response-lib.mjs), the common summarizer/publisher path, and [`solver-failure-evidence-disposition.json`](solver-failure-evidence-disposition.json) already provide a versioned compact response layer across supported solver-running workflows.

The compact attempt projection can retain, when actually produced:

- stage/action/config/gate identity;
- attempt outcome;
- node/work ceilings;
- nodes expanded and `workSpent`;
- best/final badness;
- timeout/deadline/cap state;
- stable mechanism flags;
- failed attempts inside an ultimately solved parent.

Missing fields remain unknown. This layer deliberately excludes giant paths/state.

The workflow migration is already broad. Supported maintained producers include technique census, method probe, stress refresh, targeted/high-budget sweeps, production replay, residual/broad confirmation, routing A/B, diagnostics, static portfolio confirmation, variant-family collection, and combine/reconciliation paths. Exact/reference/oracle workflows remain correctly outside this attempt-shaped contract.

### 2.2 Research-only compact diagnostic observers

The concluded [failure-information seam audit](../reports/2026-09-18-failure-information-instrumentation-seam-audit-001.md) found and reused canonical owners instead of defining another vocabulary:

- `PruneId` / `PruneDiagnostics.reached/rejected` own typed hard-prune reasons;
- BeamResearch owns generated/pruned/merge/cull/retained flow semantics;
- repair already owns real best-ever badness transitions;
- beam/DFS can contribute bounded terminal/progress observations only to the degree they genuinely compute them.

Research-only options already expose:

- attempt-scoped typed prune aggregation;
- counter-only beam flow;
- bounded failure-progress observation.

Do not add a second rejection taxonomy or infer typed reasons for untyped exits.

### 2.3 Rich search-loss capsules

[`solver-search-loss-evidence-lib.mjs`](../scripts/solver-search-loss-evidence-lib.mjs) and [`search-loss-query.mjs`](../scripts/search-loss-query.mjs) already provide bounded selected-event capture with:

- parent/run/protocol/revision identity;
- stage/event kind and work/depth locus;
- selector observed/retained/truncated denominators;
- decision/cull context;
- identity-only or replayable reconstruction contracts;
- later exact/reference annotation;
- parent-level summaries and solved controls.

The rich resource remains **contract-only**, correctly. Phase 8 of the search-loss implementation plan requires a genuine recurring producer before Resource Contract promotion.

### 2.4 Representative real-search evidence

GHA run `35423841173` exercised the same 16-parent real sample under observer-off, compact, and rich modes.

Observed result:

- exact semantic parity across result/solution/nodes/work;
- compact wall overhead vs off: about **0.46%**;
- rich wall overhead vs off: about **10.32%**;
- compact payload: about **35.7 KB**;
- rich payload: about **246 KB**;
- rich decisions observed: **551** across **6** parents;
- compact progress observations covered **beam, DFS, and repair**;
- search-loss resource preflight: `captureGateClear=true`, `empiricalConditioningReady=true`;
- sole audit blocker: `recurringProducerDeclared=false`.

Treat hosted timing as calibration evidence, not a universal constant. The qualitative result is nevertheless important: cheap compact diagnostics and rich selected capture have different deployment economics and should remain separate layers.

## 3. Architectural decisions

### 3.1 Three evidence tiers, not one failure-data blob

Keep these distinct:

1. **automatic compact attempt response**: broad/default workflow output;
2. **compact diagnostic profile**: bounded prune/flow/progress observers, promoted only where justified;
3. **rich search-loss capture**: selective research microscope with replay/exact joins.

Do not make rich capture universal merely because it now works.

### 3.2 Query/join, do not centralize prematurely

Do **not** create a new failure database or permanent monolithic truth store.

Prefer:

- existing published evidence bundles;
- research-asset/relation discovery;
- reducers/query tools;
- dated decision-bearing reports;
- capability-memory derived views where the question concerns cross-policy capability.

Create a durable aggregate store only after multiple real consumers demonstrate that repeated joins cannot be served economically by the existing resource architecture.

### 3.3 Mechanical observations are not causal classes

Raw resources record facts such as:

- action participated;
- stage received X work;
- budget/censor status;
- prune reason counts;
- flow counts;
- progress transition;
- selected/culled event;
- exact LIVE/DEAD annotation.

Derived labels such as `rank-extinction`, `progress-then-censored`, or `repeated-basin` must remain rebuildable analysis products. They are not a new solver-causal taxonomy and never replace the first-loss taxonomy.

### 3.4 Solved controls are mandatory whenever practical

A proposed adverse phenotype is weak evidence if it is also common inside successful runs under the same protocol.

Before a failure signature nominates a mechanism change, compare it to protocol-compatible solved-parent controls when available.

This is especially important because the compact layer intentionally preserves failed attempts inside eventually solved parents.

### 3.5 Specialist tools remain specialists

Generic failure evidence should join, not subsume:

- Lane G's production-frontier sampler/completion tools;
- exact/reference CP-SAT tooling;
- topology/interface microscopes;
- specialist connectivity/joint-obligation observers;
- capability-memory analysis.

Reuse common identities/provenance where practical, but do not force every research object through search-loss capture.

## 4. Dependency, parallelism, and authority routing

The phase numbers describe dependency where it exists; they are **not** a command to serialize unrelated work.

```text
Phase 0 authority integration
    |
    +--> Phase 1 compact-diagnostic disposition --> Phase 2 common reducer/query
    |                                               |
    |                                               +--> Phase 3 WS2 reconnaissance
    |                                               +--> Phase 4A Class-3 dose
    |                                               +--> Phase 4B reserve-starvation sizing
    |                                               +--> Phase 4E capability-memory joins
    |
    +--> Phase 4C H3 transfer (independent; do not wait for Phases 1-3)
    +--> Phase 4D Lane G work (independent; do not wait for Phases 1-3)
    |
    +--> Phase 5 genuine recurring rich producer --> Phase 6 Resource Contract audit
                                                    |
                                                    +--> Phase 7 recurrence reducers
                                                    +--> Phase 8 first-loss only when WS2 authorizes
```

Rules:

- Phase 0 should be small and early because discoverability prevents duplicate instrumentation.
- Phase 1 must first reconcile whether run `35423841173` already clears the seam audit's representative-overhead gate for the proposed scope. Do not rerun equivalent calibration merely for ceremony.
- Phase 2 depends on the Phase-1 durable-support decision only for fields whose persistence is being promoted. Automatic attempt-response reduction can advance independently.
- Phase 3 must use current workstream authority at execution time; this plan cannot activate a discriminator.
- Phase 4C H3 and 4D Lane G already have their own valid designs and should continue independently.
- Phase 5 is condition-driven. Do not invent a recurring rich producer to unblock later phases.
- Phase 6 is owned by the existing search-loss implementation plan once the recurrence condition is real.
- Phase 8 is likewise owned by the existing search-loss Phase-9 procedure if WS2 selects first-loss.

### Consumer/owner matrix

| Consumer/question | Cheapest relevant failure layer | Owning authority | What failure evidence may do |
|---|---|---|---|
| WS2 discriminator choice | automatic response -> compact diagnostics | workstreams/question graph | choose the next expensive instrument |
| Class-3 dose | automatic compact attempts | `WS2-CLASS3-DOSE-EXPOSURE` | distinguish non-exposure, dose, censoring |
| fixed reserve starvation | automatic attempts, then compact progress if needed | new question only if admitted through question relations | size recurrence before A/B |
| H3 transfer | telemetry already emitted by frozen design | H3 question/preflight | secondary explanation only |
| Lane G | specialist frontier data; rich capsule opportunistically | `WS2-G1-COMPLETE-PATH-LNS` | join real-search partials/basin evidence |
| capability memory | protocol-compatible compact/rich joins | capability-memory contract | preserve latent capability movement |
| solve-local/conflict reuse | typed reason recurrence after enough data | Lane C/future-work owners | nominate reopen premise |
| first-loss | full ladder through exact/replay | workstreams + search-loss Phase 9 | localize causal uncertainty |

The existence of a measurement source is not itself a premise. When evidence creates a genuinely new research question or reopen condition, register it through the normal question/premise/measurement-opportunity machinery. Do not let this plan become the only place that question exists.

## 5. Information-cost ladder for new research

For a question plausibly informed by failure evidence, use the cheapest rung that can discriminate the next action.

### Rung A — already-published automatic response

Ask first:

- did the mechanism/action participate?
- what stage(s) were reached?
- how much comparable work did each attempt receive?
- was failure censored, capped, exhausted, errored, or unknown?
- what best/final badness is genuinely available?
- do solved controls show the same failed-attempt pattern?
- are protocol-compatible repeated observations already available?

No new solver run if existing evidence answers the question.

### Rung B — compact diagnostic profile

If Rung A cannot discriminate the next research direction, run a mechanically frozen bounded population with:

- canonical prune counts;
- counter-only beam flow;
- bounded progress observations.

Require observer parity and retain population/protocol identity.

### Rung C — rich selected capsules

Use rich capture only when the question genuinely depends on search-event identity/state:

- retention-boundary viability;
- first observed loss locus;
- basin recurrence;
- replayable frontier/prefix;
- exact annotation candidate selection.

Bound selectors and preserve denominators.

### Rung D — exact/reference annotation

Spend CP-SAT/reference compute on the smallest capsule set that separates adjacent hypotheses. Timeout/unsupported remain abstentions.

### Rung E — causal intervention

Only after the preceding evidence nominates a mechanism:

- rejection counterfactual;
- allocation override;
- matched-work treatment;
- producer × consumer interaction;
- repair/handoff change;
- ranking/retention change.

Follow normal independent confirmation and production-promotion rules.

## 6. Phase plan

### Phase 0 — authority and consumer reconciliation

**Goal:** make the new substrate discoverable from the questions that can already use it without changing live priority.

Tasks:

1. Reconcile current `main` after this plan lands.
2. Use the existing research-question/measurement-opportunity registry for all question-level links. Failure evidence is a measurement source, not a shadow question authority.
3. Explicitly connect the Class-3 dose reopen condition to prospective compact exact-action attempt telemetry rather than an unspecified future instrument.
4. Record failure-response/search-loss as an available measurement source for the relevant H3, Lane G, capability-memory, repair/handoff, and solve-local recurrence questions where this is a discovery aid, without making those lines depend on it.
5. Ensure `solver-future-work.md` retains the existing search-loss Phase 8/9 resume triggers rather than duplicating them here.
6. Do not change WS2 priority merely because an instrument exists.

**Exit:** a fresh agent following the question/queue surfaces can discover the new evidence path without reading this session.

### Phase 1 — compact diagnostic promotion review

**Goal:** decide whether the already-implemented prune/flow/progress profile should become durable standard telemetry for a bounded set of maintained solver producers.

Start from run `35423841173`. First determine whether that completed canary already satisfies the seam audit's representative parity/overhead/byte-volume requirement for the proposed producer scope. Re-run calibration only for a materially different producer/search family or unresolved incremental-value question.

Then answer only what remains necessary:

- parity confidence;
- representative overhead by relevant producer/search family;
- payload/storage cost;
- incremental information over automatic attempt response;
- which workflows have a real recurring consumer.

Prefer a scoped promotion such as residual/diagnostic/census/research workflows over universal enablement if that preserves value with less cost.

If promoted:

- extend the canonical compact failure-response document additively;
- reuse existing `PruneId` and BeamResearch semantics;
- preserve bounded progress-family semantics;
- update publisher/validator/query surfaces;
- unknown remains unknown;
- re-run parity on materially changed hot-path plumbing.

If not promoted, record the reason and keep the observer profile explicitly research-only.

**Exit:** no ambiguity about where compact diagnostic telemetry is durable, queryable, and supported.

### Phase 2 — common failure-response reducer/query surface

**Goal:** make ordinary compact failure evidence answer common research questions without ad-hoc JSON surgery.

Reuse existing research discovery/query conventions. Extend an existing reducer where clean; add one specialist command only if needed.

Support parent-level/protocol-aware summaries for:

- participation/exposure by action/stage;
- work/dose distribution;
- censor/exhaust/error composition;
- solved-parent failed-attempt controls;
- best/final badness support;
- progress-shape composition if Phase 1 promotes it;
- prune/reason composition if promoted;
- beam-flow composition if promoted;
- repeat observations under explicitly comparable protocols;
- missing/unknown support.

Never default raw attempt/event count to prevalence. Parent is the default independent unit unless the consuming resource contract says otherwise.

**Exit:** the next WS2 reconnaissance can be expressed as a frozen query/reduction recipe rather than bespoke parsing.

### Phase 3 — bounded WS2 failure-response reconnaissance

**Goal:** use failure evidence to choose among the remaining expensive WS2 discriminators rather than selecting one from a menu by intuition.

This phase is subordinate to whatever `solver-optimization-workstreams.md` says at execution time.

#### Stage A: zero/new-low-compute existing evidence

Freeze the current boundary and analyze existing protocol-compatible durable rows.

Ask:

- what fraction of parents are dominated by clear work censoring versus natural exhaustion versus non-participation/non-reach?
- which action/stage combinations dominate failed attempts?
- where are later stages visibly starved?
- what apparent pathologies are also common in solved controls?
- do comparable policies/runs produce different failure responses on the same parents?
- is there enough evidence already to favor rejection, divergence/first-loss, or a specific interaction?

Do not inspect treatment outcomes from a future decision-bearing cohort while selecting that same cohort.

#### Stage B: compact diagnostic sample if Stage A is unresolved

Mechanically freeze a representative/stratified parent population before inspecting new compact-diagnostic outcomes.

Use prune/flow/progress only to decide which next scientific instrument has highest information value.

Possible routing:

- recurring retention/prune opportunity -> rejection counterfactual / rich retention capsules;
- materially different operational basins/responses under matched policies -> operational divergence / first-loss;
- coherent producer/consumer intermediate response -> prespecified 2×2;
- repeated allocation starvation -> bounded scheduler/allocation question;
- no discriminating signal -> do not manufacture an expensive lane.

**Exit:** one current queue-authorized discriminator is selected with a dated preflight, or all remain unjustified.

### Phase 4 — immediate existing-question integrations

These are independent consumers; do not block one on another.

#### 4A. Class-3 dose exposure

The 23 Class-3 rows are no longer blocked on inventing telemetry.

At the next suitable prospective, protocol-compatible producer covering that question:

- preserve exact action/technique identity;
- prove participation;
- retain work dose and termination/censor state;
- reuse the existing work-ladder reducer where applicable.

Answer `not exposed` vs `exposed and failed/indeterminate` before proposing new capability work.

Do not launch a large bespoke campaign if the next normal census/targeted run can provide the rows.

#### 4B. Fixed-reserve starvation premise

The expensive-success microscope found two distinct mechanisms among the three 4x recoveries:

- R01000/R02974: genuine primary-search underdose;
- R00044: later `admissible-order-fallback` solved with ~219.8M nodes, within the original 300M total ceiling, but the 25% reserve gave it only 75M at that ceiling.

Treat R00044 as premise nomination only.

If current authority agrees the nomination is worth tracking, admit a narrow stable research question through `solver-research-question-relations.json` (and a measurement opportunity only if it adds a reusable measurement seam rather than restating the question):

> Does fixed stage-reserve allocation recurrently starve later stages that possess sufficient within-total-budget solving capability?

Do not treat this plan text as the durable question record.

First use existing compact response/high-budget evidence to estimate recurrence. Only if recurrence is non-trivial run a matched-total-work reserve-fraction A/B using the existing `admissibleOrderNodeReserveFractionOverride`.

Do not reopen the closed-negative broad 4x work-ladder economics question merely because this narrower allocation mechanism exists.

#### 4C. H3 independent transfer

Do not alter the precommitted primary design.

Retain whatever standard failure telemetry its existing execution path naturally emits and use it only as secondary/explanatory evidence:

- exposure;
- starvation;
- censoring;
- response differences under length ordering.

Failure telemetry must not change the frozen H3 primary decision rule.

#### 4D. Lane G

Keep the existing production-frontier sampler and completion machinery authoritative for Lane G.

Where useful:

- align provenance/path identity with search-loss contracts;
- allow selected rich capsules to feed Lane G as one source of real partials;
- compare completion failure against progress/basin evidence.

Do not replace Lane G's population sampler with generic search-loss selectors.

#### 4E. Capability memory / negative experiments

Extend analysis, not the durable production boundary.

For matched A/B evidence on the same parent, permit derived comparison of:

- outcome;
- exposure;
- work/censoring;
- progress response;
- prune/flow response;
- rich loss locus where available;
- exact annotation where available.

Use this to preserve **latent capability movement** from zero-solve-delta or closed-negative treatments.

Historical IDs/signatures remain offline premise sources, never cold routing inputs.

### Phase 5 — genuine recurring rich producer

**Goal:** satisfy the real resource need behind search-loss Phase 8 without manufacturing recurrence.

Choose one existing research workflow only when it has a continuing scientific reason to retain rich capsules.

Prefer:

- bounded residual diagnostics;
- mechanically sampled recurring research population;
- explicit selector profile;
- artifact/persistence semantics compatible with Resource Contract audit.

Avoid universal stress-refresh rich capture unless measured overhead/value later justifies it.

Run enough real producer instances to observe:

- parent conditioning;
- missingness/truncation;
- selector opportunity;
- solved/failed controls;
- protocol evolution/freshness;
- storage economics.

**Exit:** `recurringProducerDeclared=true` is true because a genuine recurring producer exists, not because a ceremonial run was created to clear a checkbox.

### Phase 6 — search-loss Resource Contract audit

Execute Phase 8 of [`solver-search-loss-evidence-implementation-plan.md`](solver-search-loss-evidence-implementation-plan.md) once Phase 5 creates genuine recurrence.

Audit:

- producer/selection conditioning;
- independent unit/dependence;
- identity layers;
- missingness;
- irreversible information loss;
- freshness;
- consumer inventory;
- durability/query discovery;
- historical blast radius.

Then explicitly choose:

- promote to audited resource grade; or
- remain contract-only/narrowed.

Do not promote merely because the validator permits it.

### Phase 7 — derived recurrence/phenotype reducers

Only after enough repeated real data exist.

Build derived/rebuildable identities at increasing strength, for example:

1. coarse operational phenotype: stage/event/censor/progress band;
2. typed reason phenotype: canonical rejection/reason family where supported;
3. state/basin phenotype: only where current-search-derived identity is meaningful;
4. exact-annotated loss phenotype: selected capsules with reference support.

Keep **reason recurrence** separate from **state/basin recurrence**.

Possible descriptive signatures include:

- source/exposure-limited;
- rejection-heavy;
- rank/retention extinction;
- repeated basin;
- progress-then-censored;
- stagnant-censored;
- routing/starvation;
- terminal near-miss.

Thresholds selected from outcomes create development evidence.

Use recurrence to inform existing owners:

- Lane C / solve-local typed reuse;
- conflict/backjump future work;
- WS6/7 repair/handoff;
- WS4 retention/representation reopen conditions;
- WS1 generic action-selection premises;
- capability-memory mechanism clustering.

No recurrence pattern by itself earns production policy.

### Phase 8 — first-loss scientific consumer when authorized

This is not automatically next.

If and only if `solver-optimization-workstreams.md` selects operational divergence / first-loss, execute Phase 9 of the existing search-loss implementation plan rather than creating a competing procedure here.

Use the full information-cost ladder:

1. lifecycle/reach/allocation;
2. automatic compact response;
3. promoted compact diagnostics;
4. selected rich capsules;
5. existing known-prefix/trace evidence;
6. exact labels on the smallest discriminating set;
7. counterfactual replay only where adjacent hypotheses remain unresolved.

Primary output remains a parent-level distribution of causal uncertainty, not a forced complete taxonomy.

## 7. Experiment interpretation rules

### 7.1 Intermediate movement is secondary evidence

For an A/B whose primary solve/work outcome is negative:

- do not relabel it positive because progress, basin, or prune composition moved;
- record the movement as capability/premise evidence;
- use it to nominate the next smallest experiment.

If an intermediate endpoint will influence a decision-bearing branch, predeclare it before that experiment.

### 7.2 Participation before failure

Configured-but-never-reached is not a negative for the mechanism.

Always distinguish:

- not applicable;
- applicable but not reached;
- reached/participated;
- censored;
- exhausted;
- solved;
- errored/unknown.

### 7.3 Protocol compatibility before longitudinal claims

Do not merge repeated rows merely because they share a level ID.

Require the meaning-changing protocol identity needed by the claim: code/revision, scheduler/config/flags, budget/work semantics, corpus/population identity, deterministic/execution mode, and relevant capture profile.

### 7.4 Parent-level denominators

Multiple attempts, capsules, sibling variants, or repeated states from one parent are dependent observations.

Report parent-level prevalence unless a different independent unit is explicitly justified.

## 8. Explicit non-goals

This plan does **not** authorize:

- a new failure-cause authority or generic causal taxonomy;
- a centralized failure database by default;
- universal rich capture;
- production routing from stored historical failure identity;
- production use of exact/reference annotations;
- reopening closed mechanisms from one interesting failure row;
- replacing specialist frontier/exact/topology tools;
- changing H3's frozen transfer decision rule;
- treating event/capsule count as independent prevalence;
- inventing typed reasons for untyped exits;
- synthetic recurrence merely to close the search-loss plan.

## 9. Validation and merge boundaries

Prefer small merge boundaries.

### PR A — authority integration

Phase 0 only. Documentation/question/reopen references, no solver behavior.

Finish line:

```bash
npm run check:documentation-links
npm run check:validators
```

### PR B — compact diagnostic promotion/query

Phases 1-2. If hot-path observer transport changes:

- targeted parity tests;
- real representative canary;
- `npm run ci && npm run build`.

If only reducers/docs change:

- targeted node tests;
- `npm run ci:fast && npm run build`.

### Scientific reports

Phases 3-4 should normally be dated reports plus minimal authority updates after outcomes, with populations/decision rules frozen before outcome inspection.

### Rich resource

Phases 5-6 should remain distinct from the first scientific consumer. Resource recurrence/audit is infrastructure evidence, not a solver efficacy result.

### Derived phenotypes

Phase 7 must be rebuildable from canonical underlying evidence and have tests proving missing/unknown semantics and parent-level accounting.

## 10. Stop/simplification conditions

Narrow or stop this program if:

- automatic response plus lifecycle already answers most candidate questions and promoted diagnostics add negligible information;
- useful compact diagnostics require unacceptable overhead/storage on recurring producers;
- rich capture routinely requires full pools/full traces or cannot maintain bounded selectors;
- solved controls show proposed adverse phenotypes are ubiquitous/non-discriminating;
- repeated phenotype mining does not reduce the number/cost of bespoke discriminating reruns;
- protocol drift makes longitudinal joins mostly incomparable;
- a new aggregate store would duplicate existing resource/harvest/query machinery without demonstrated consumer need;
- failure data begins creating research activity without changing which next experiment is justified.

## 11. Success criteria

This plan is successful when:

1. Class-3 and other exposure questions discover the standard compact telemetry path instead of requesting new instrumentation.
2. The compact diagnostic profile has an explicit durable-support disposition based on real overhead/value evidence.
3. Common failure questions are answerable through one supported reducer/query path.
4. WS2 can use failure evidence as a cheap discriminator before spending rich/exact/counterfactual compute.
5. Solved controls are routine in failure-phenotype interpretation.
6. R00044-style allocation starvation is tested as its own narrow premise rather than conflated with total-budget escalation.
7. H3 and Lane G gain explanatory joins without being redesigned around this resource.
8. Capability memory can preserve latent operational movement from negative experiments without creating production steering.
9. A genuine recurring rich producer, if scientifically justified, enables an honest Phase-8 Resource Contract audit.
10. Derived recurrence/phenotype work remains rebuildable, parent-aware, and subordinate to existing causal/evidence authorities.
11. The first authorized first-loss study can start from accumulated evidence and spend fewer bespoke reruns/exact queries.
12. No production policy consumes stored historical failure identities or exact annotations.

## 12. Closeout and durable resumption

This document is a temporary integration plan, not a permanent authority.

Close it when:

- Phases 0-4 are completed or explicitly disposed;
- compact diagnostic promotion has a durable decision;
- the recurring-rich path is either audited/promoted, explicitly deferred for lack of a real producer, or stopped;
- any surviving recurrence/first-loss work is represented by the owning queue/question/future-work entries.

At closeout:

- move genuine deferred triggers to [`solver-future-work.md`](solver-future-work.md);
- leave current priority/state in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md);
- leave resource semantics in the Resource Contract/data-asset authorities;
- leave scientific outcomes in dated reports/question relations;
- mark this plan completed/retired so future agents do not mistake it for another live queue.

Do not keep the plan alive merely because more failure data could always be collected.
