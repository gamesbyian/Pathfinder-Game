<!-- agent-context-budget: warn=60000 max=72000 -->
# Search-loss evidence implementation plan

> **Status:** implementation plan; no production solver behavior is authorized by this document.
> **Purpose:** make ordinary unsuccessful solver runs leave a small, durable, provenance-bearing set of reusable search-process observations without creating a second research warehouse or laundering observations into causal failure claims.
> **Priority authority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Method authorities:** [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), and [`solver-research-resource-contract.md`](solver-research-resource-contract.md).
> **Causal vocabulary:** [`solver-first-loss-causal-taxonomy.md`](solver-first-loss-causal-taxonomy.md).
> **Data topology:** [`solver-research-data-assets.json`](solver-research-data-assets.json), [`solver-research-data-assets.md`](solver-research-data-assets.md), and [`scripts/research-relations-lib.mjs`](../scripts/research-relations-lib.mjs).
> **Existing reusable seams:** [`scripts/solver-decision-observation-lib.mjs`](../scripts/solver-decision-observation-lib.mjs), [`scripts/solver-research-block-lineage.mjs`](../scripts/solver-research-block-lineage.mjs), [`scripts/stress/production-search-frontier-sampler-lib.mjs`](../scripts/stress/production-search-frontier-sampler-lib.mjs), lifecycle telemetry, exact/reference labels, known-solution-prefix survival, experiment manifests, and capability memory.

## 1. Problem statement

Pathfinder preserves successful search unusually well. A referee-valid solved path can be stored as a hint and carry solver/configuration, work, termination, seed, run-context, structural-revision, and rediscovery provenance. Those successful artifacts later support positive-oracle work, solution-space analysis, capability nomination, longitudinal history, and forensic comparison.

Unsuccessful production search produces a large amount of potentially useful evidence but usually preserves only coarser outputs:

- solved/unsolved status;
- aggregate work and node totals;
- attempt/stage lifecycle telemetry when enabled;
- best-badness/progress summaries;
- investigation-specific operational traces;
- investigation-specific frontier captures;
- selected exact LIVE/DEAD labels;
- selected decision observations;
- selected known-path extinction records.

The missing layer is not another solver trace format and not a universal evidence database. It is a bounded durable resource that preserves a few scientifically useful **observations of search loss** from unsuccessful ordinary search so later research can reuse the original search event rather than recreating it.

The resource must answer:

> What did the solver actually reach, choose, discard, merge, starve, or leave unresolved during a failed invocation, under exactly which solver/protocol/work context?

It must **not** answer by itself:

> Why was the level unsolved?

The second question is causal. It belongs to the first-loss taxonomy plus exact/reference, counterfactual, witness, routing, work-response, and other downstream evidence.

## 2. Design principles

### 2.1 Observation before interpretation

The base durable unit is a **search-loss observation capsule**.

A capsule records an observed search event or selected state and the mechanical reason it was retained for research. It does not intrinsically claim that the state is LIVE, DEAD, good, bad, causal, representative, or the first irreversible loss.

Use explicit later annotations for stronger evidence.

Bad:

```json
{ "dead": true, "failureCause": "beam-width" }
```

Good:

```json
{
  "disposition": "score-width-culled",
  "captureReason": "near-cutoff-culled",
  "exactLabel": null
}
```

A later exact annotation may establish `LIVE`; a later first-loss study may then establish F5/F6 significance.

### 2.2 Reuse existing authorities

Do not create:

- a new research database;
- a second experiment manifest system;
- a second population-lineage system;
- a second decision-observation schema;
- a second exact-label store;
- a second first-loss taxonomy;
- a new capability-memory authority.

The search-loss resource is one additional registered asset family whose rows join to those systems.

### 2.3 Bounded persistence, broad denominator awareness

A failed run may contain thousands or millions of candidate events. Persisting complete traces would be counterproductive.

The producer may observe broadly enough to know denominators while retaining only a bounded number of capsules under fixed selectors.

Every selector therefore needs:

- `observed`;
- `retained`;
- `truncated`;
- selection/capture rule identity;
- selector limit;
- deterministic tie/sampling semantics where selection is not first-N.

Absence of a retained row is interpretable only when the corresponding selector summary proves complete observation with zero qualifying events.

### 2.4 Parent-level independence

Multiple capsules from one level improve within-parent resolution. They do not create independent support for prevalence/generalization claims.

The ordinary independent unit for population-level search-loss questions is the parent level unless a specialist method document states a different unit.

### 2.5 Historical observation remains historical truth

A capsule produced by solver revision X remains valid evidence of what X did under its recorded protocol even after production changes.

It does not establish current capability or current failure behavior without a compatible replay or explicitly justified equivalence.

### 2.6 Production-inert by default

Search-loss capture must be opt-in research instrumentation until parity is established and cost is characterized.

Enabling capture must not alter:

- solve outcome;
- candidate legality;
- scoring/order/ties;
- retention;
- randomness;
- cache/memo lifetime;
- scheduler/routing;
- work accounting;
- aggregate work budget.

Observation cost is implementation cost, not solver `workSpent`.

### 2.7 Preserve UNKNOWN

Missing exact labels, incomplete ancestry, unsupported mechanics, timeout, truncated selection, and unavailable historical fields remain unknown.

### 2.8 Use solved runs as controls where the phenomenon is not failure-exclusive

A cull, prune, repeated state, expensive failed attempt, or temporary loss of one branch can occur inside a run that ultimately solves.

Therefore:

- compact attempt/failure-response telemetry should cover **all attempts**, including failed attempts inside solved parent runs;
- aggregate search-process telemetry should be collectible on solved and unsolved runs under the same observer contract;
- rich failure capsules may remain failure-focused initially, but selected solved-run controls should be available for prevalence/contrast studies;
- a phenomenon should not be called failure-specific merely because it was first observed on terminally-unsolved parents.

The technique census already provides a strong solved/unsolved control frame because T1 covers solved and unsolved levels. Production rows also preserve failed attempts preceding a later winner.

### 2.9 Do not invent one universal basin identity

The repo already has several valid but different identity layers: structural level fingerprints, exact path/prefix identity, specialist exact-state fingerprints, beam frontier ancestry keys, attempt/action identity, coarse-state/merge keys, connectivity reached-set/boundary fingerprints, and witness-path identity for replay-bound exact evidence.

These answer different questions. The search-loss resource must preserve typed identities rather than collapse them into one `basinId`. A later derived basin/signature must declare exactly which identity/feature basis it uses and for which purpose.

Do not convert:

- no exact label -> DEAD;
- no capsule -> no event;
- timeout -> infeasible;
- absent annotation -> negative;
- historical missing field -> modern false;
- one sampled frontier state -> frontier homogeneity.

## 3. Scope and non-goals

### In scope

1. Define a compact versioned capsule and run-summary contract.
2. Add shared validation/identity/dedup helpers.
3. Register the new durable resource in the existing data-asset topology.
4. Integrate it with existing research-relations discovery.
5. Add one production-inert producer path using already-observable search events.
6. Preserve a small bounded set of failed-run observations.
7. Allow later append-only annotations from existing exact/reference and research tools.
8. Provide query/reduction tooling for parent-level studies.
9. Use the resource in one bounded first-loss-oriented scientific consumer.
10. Audit the resource under the Resource Contract once it becomes a recurring decision-bearing input.
11. Add a shared compact failure-response projection for solver-running workflows so unsuccessful attempts preserve comparable work/progress/censoring data even when rich capsules are disabled.
12. Treat the technique census, equal-work census, production refresh, benchmark tooling, and selected family-evaluation workflows as prospective producers where they already compute useful failure-side data.

### Explicit non-goals

The implementation does **not** initially authorize:

- storing full beam pools or full solver traces;
- collecting every prune/reject event;
- CP-SAT calls during ordinary capture;
- causal F0-F14 assignment at capture time;
- runtime learning from persisted historical capsules;
- per-level lookup or production steering;
- online failure-mode routing;
- a learned classifier;
- automatic restart/scheduler changes;
- proof-store/nogood/CDCL infrastructure;
- generic LNS;
- automatic level generation from failure labels;
- bulk historical backfill;
- rewriting old reports/artifacts into the new shape;
- using capsule counts as unconditional prevalence estimates.

## 4. Conceptual data model

The durable artifact has three separable layers:

1. **run envelope** - execution/protocol/population identity and capture configuration;
2. **selector summaries** - denominators and truncation semantics;
3. **capsules** - bounded selected search observations.

Annotations are separate derived/enrichment artifacts that reference capsule identities.

### 4.1 Run envelope

Required fields should reuse existing canonical producers where practical.

Proposed shape:

```json
{
  "schemaVersion": 1,
  "kind": "pathfinder-search-loss-capture",
  "researchEnrichmentKind": "observation",
  "run": {
    "runId": "...",
    "solverRef": "...",
    "resolvedSha": "...",
    "producer": "...",
    "protocolHash": "sha256:...",
    "configurationHash": "sha256:...",
    "levelBlind": true
  },
  "population": {
    "source": "...",
    "populationIdentity": "sha256:...",
    "parentCount": 20
  },
  "capture": {
    "captureProfileId": "search-loss-v1",
    "observerParityVerified": true,
    "selectorSummaries": {}
  },
  "capsules": []
}
```

Do not hand-roll configuration/protocol semantics if an experiment/result/manifest helper already supplies the relevant identity.

### 4.2 Capsule identity

Each capsule needs a stable identity derived from semantic source identity, not array position.

Minimum identity inputs:

- structural level identity/revision;
- solver/run identity;
- parent level ID;
- attempt/stage identity;
- event kind;
- event-local stable identity or state/path identity;
- capture reason;
- event ordinal/depth only where the producing seam defines those values stably.

Prefer a canonical stable hash helper.

A repeated export of the same observation under the same run should deduplicate semantically.

### 4.3 Base capsule fields

Required common fields:

```text
capsuleId
parentId
levelRevision
runId / solverRef / protocol identity
attemptIndex or null
stageId
eventKind
captureReason
workSpent
nodeProgress or null
depth or null
stateIdentity/pathIdentity
disposition
selection
stateSummary
context
```

`workSpent` is canonical comparable solver work. Nodes remain diagnostics.

`selection` records why this event entered the retained sample.

`stateSummary` may carry cheap current-search facts that already exist at the producer boundary, for example:

- endpoint;
- path/prefix length;
- intersections used/remaining;
- must-pass/must-cross masks or counts;
- filter/flipper/portal state where already available;
- badness/progress;
- score/rank;
- beam width/cutoff;
- insertion/stable-order metadata;
- coarse-state identity if the producing decision already computes it.

Do not add expensive new hot-loop feature computation merely to make capsules rich.

### 4.4 Event kinds

Version 1 should support only event kinds backed by current instrumentation and clear semantics.

Initial candidates:

- `budget-terminal`
- `stage-terminal`
- `best-progress-transition`
- `score-width-cull`
- `mechanic-bucket-cull`
- `ints-bucket-cull`
- `frontier-representative`

Do not implement every kind automatically. Phase 3 below chooses the smallest producer set after implementation inspection.

Future event kinds may include hard rejection, merge loser, dedup loser, handoff disposal, repeated reason, terminal/referee reject, but only when the owning producer can expose them without semantic guesswork.

### 4.5 Capture reasons

Event kind says what happened. Capture reason says why this row was retained.

Suggested v1 vocabulary:

- `best-progress`
- `late-best-progress`
- `near-cutoff-retained`
- `near-cutoff-culled`
- `terminal-best`
- `frontier-sample`
- `progress-transition`

Do not use labels such as `bad-route`, `dead-branch`, `first-loss`, or `causal` in the base selector vocabulary.

### 4.6 Annotation envelope

Annotations must reference immutable capsule identity and retain their own provenance.

Proposed generic envelope:

```json
{
  "schemaVersion": 1,
  "kind": "pathfinder-search-loss-annotation",
  "researchEnrichmentKind": "exact",
  "sourceCapture": "...",
  "populationIdentity": "sha256:...",
  "researchBlock": {},
  "annotations": [
    {
      "capsuleId": "sha256:...",
      "annotationKind": "exact-feasibility",
      "support": "SUPPORTED",
      "value": "LIVE",
      "producer": "...",
      "modelVersion": "...",
      "cost": {},
      "evidenceRefs": []
    }
  ]
}
```

Initial annotation kinds should be adapters to existing evidence, not new solvers:

- `exact-feasibility`: LIVE / DEAD / UNKNOWN / UNSUPPORTED;
- `known-support`: known accepted-path support present/lost/unknown when legitimately reconstructable;
- `decision-counterfactual`: later controlled replay result;
- `first-loss-classification`: only from an explicit first-loss study and with unresolved-earlier-class state.

Do not force all annotation kinds into one scalar confidence field.

## 5. Storage topology

### 5.1 Primary captured artifacts

Do not commit every ordinary failed run to `main`.

Use the same retention doctrine as other decision-bearing experiment evidence:

- transient captures may live in workflow artifacts during exploratory work;
- decision-bearing captures must preserve the minimal reconstructable bundle before ephemeral artifacts expire;
- tracked examples/pilots belong under a clearly named `reports/stress/search-loss-evidence/` directory only when they support a durable conclusion or reusable research block.

The resource registry should describe the pattern, not imply every runtime invocation is persisted forever.

### 5.2 Derived views

Loss signatures, aggregate histograms, cluster labels, first-loss summaries, and parent-level reducers are rebuildable derived artifacts.

They are not additional authorities.

### 5.3 No historical backfill by fabrication

Existing lifecycle maps, D1 captures, frontier captures, and operational traces can be adapters or historical source evidence where their fields suffice.

Do not manufacture missing capsule fields or pretend old artifacts were produced under the new capture contract.

## 6. Integration with existing research resources

### 6.1 Lifecycle telemetry

Join:

`levelId + solver/run ref + stage/attempt identity`

Questions:

- Did a failed level receive work at the stage where the capsule was observed?
- Was the stage starved, capped, exhausted, or routing-skipped?
- Is a promising capsule merely a side effect of a stage that received negligible work?
- Does additional work move the best-progress/loss signature?

Boundary:

Lifecycle describes allocation/reach. Search-loss capsules describe selected within-search observations. Neither alone establishes causal first loss.

### 6.2 Decision observation

For cull-shaped observations, adapt the shared `DecisionObservation` seam.

Do not duplicate:

- candidate ordering semantics;
- retained candidate semantics;
- canonical work boundaries;
- rank/cutoff vocabulary.

The D1 240 MB -> 187 KB correction is a hard design lesson: persist only the selected local neighborhood and aggregate counts needed by future consumers, not full pools by default.

### 6.3 Production frontier sampler

Frontier sampling remains the tool for deliberately expanding within-parent state coverage.

Search-loss capsules can nominate:

- parent;
- stage/depth;
- ancestry regime;
- interesting terminal/cull neighborhood.

A later study may sample multiple distinct frontier states around that neighborhood.

One sampled state never proves frontier homogeneity.

### 6.4 Exact/reference labels

Exact/reference tooling is a downstream annotator.

Rules:

- no exact query in the ordinary capture hot path;
- timeout/unsupported -> UNKNOWN/UNSUPPORTED;
- exact witness must pass canonical referee reconciliation;
- annotation keeps model/config/cost provenance;
- exact state identity must bind to the exact captured prefix/state.

### 6.5 Known-solution-prefix survival

Join where path/state/decision identity permits.

Use it to ask:

- Did a generic cull coincide with loss of known positive support?
- Was the captured state related to a known accepted family?
- Did known support disappear earlier/later than the generic observed loss?

Known-support extinction remains conditional on the accepted path set.

### 6.6 Operational traces

Capsules nominate concrete states/decisions for richer replay.

A trace can later answer why two policies diverged around a recurring capsule phenotype.

Trace-selected examples remain development/forensic evidence unless separately sampled.

### 6.7 Capability memory

Add a derived **loss-signature comparison** only after the base resource exists.

Use cases:

- two policies both fail a level but fail in different observable basins;
- a net-zero treatment moves failures from early source/generation loss toward late retention/budget loss;
- accepted changes displace one failure phenotype for another;
- repeated historical policies converge on the same state/reason family.

Exact level identities remain offline research labels and may not steer production.

### 6.8 Variant families

Join by parent/variant identity and solver protocol.

Questions:

- Does a controlled transformation move the observed loss earlier/later?
- Does a mechanic change convert a cull-dominated failure into source absence or budget starvation?
- Does the same capsule phenotype recur across unrelated parents?

Family siblings remain dependent. Independent unit is parent family for cross-family claims.

### 6.9 Technique census

The technique census is both a **consumer** and a **primary prospective producer** of search-loss evidence.

Its experimental framing is unusually valuable:

- explicit technique/configuration identity;
- explicit level;
- explicit cell identity;
- fixed node or work ceiling;
- complete attempted denominator;
- clear terminal status;
- isolated technique execution rather than mixed production routing.

That makes a failed technique-census cell more informative than a generic "solver failed this level" row.

#### Current producer gap

`scripts/technique-census-cell.mjs` already computes rich attempt-side data, including canonical technique identity, outcome, nodes, work where work-mode is active, allocated ceilings, `bestBadness`, `finalBadness`, and censoring/termination state.

However, failed cells normally persist `attempts[]` only when `cell.collectAttemptTelemetry === true`; successful cells retain enough attempt information for hint provenance. The normal plan does not currently make failure-side attempt retention a standard property.

Do not solve this by blindly persisting full attempts or full search traces in every cell.

Instead add two evidence tiers.

##### Tier A - compact failure-response telemetry for every completed cell

Every completed census cell should expose a shared compact failure-response projection with, as applicable:

- cell/technique/action identity;
- success/failure/indeterminate status;
- attempt outcome;
- node ceiling and nodes consumed;
- work ceiling and canonical `workSpent`;
- per-technique allocated ceiling where relevant;
- `bestBadness`;
- `finalBadness`;
- exhausted vs node-budget-reached vs work-budget-reached;
- deadline truncation;
- referee-invalid/error;
- participation/reach facts already known by the cell runner.

This is not a rich capsule. It is the durable response vector for the cell.

It should be small enough to preserve for the full census matrix.

##### Tier B - bounded rich search-loss capsules for selected cells

Only an explicitly selected research subset should retain path/state/decision-bearing capsules such as:

- near-cutoff retained/culled states;
- terminal-best partials;
- bounded frontier samples;
- progress-transition states.

Selection must be frozen independently of the later exact/counterfactual outcome being studied.

#### Technique-census joins

Join by level plus normalized action/config and protocol.

Questions include:

> Does isolated capability exist for a level whose production search never reaches, under-retains, or underdoses the corresponding regime?

> When an isolated technique fails, is it exhausted, still improving at the cap, stagnant, or merely deadline-truncated?

> Do two techniques both fail the same level while ending in materially different search-loss basins?

> Does equal work buy different progress/loss behavior even when neither arm solves?

These distinctions separate capability acquisition from exposure, routing, retention, and dose hypotheses.

#### Equal-work census

EW-style cells are the strongest census substrate for cross-technique failure-response comparisons because `workBudget`/`workSpent` are already the machine-independent comparison currency.

Use T1 node-depth failures primarily for within-technique depth/capability characterization.

Use equal-work cells for claims comparing the value or response shape of different techniques under comparable compute.

#### Matrix interpretation

The useful matrix becomes:

`level × technique × budget -> success | exhausted | censored | error + work + progress + optional loss observations`

rather than:

`level × technique × budget -> solved?`

That permits distinctions such as:

- production miss + isolated solve -> routing/exposure/placement candidate;
- production low dose + isolated high-dose solve -> allocation/underdose candidate;
- production miss + isolated capped progress -> acquisition may exist but needs deeper work;
- production miss + isolated clean exhaustion -> tested isolated form lacks capability;
- multiple failed techniques + different terminal basins -> complementary latent capability;
- multiple failed techniques + same recurring basin -> shared representation/source/architecture candidate.

Do not convert any of these patterns directly into a causal F-class without downstream evidence.

### 6.10 Production refresh and ordinary capability sweeps

`solver-stress-refresh.yml` / `level-blind-capability-sweep.mjs` are the main production-search producer family.

They already retain substantially more failure-side information than the technique census:

- production ladder outcome;
- full persisted attempt projection through `buildRow()`;
- failed action/config identities;
- nodes and canonical `workSpent`;
- lifecycle telemetry by default for ordinary refreshes;
- best/final badness where attempts expose it;
- deadline/error semantics.

Therefore the first integration should **reuse and normalize existing fields**, not duplicate them in a parallel payload.

The production refresh should eventually emit:

1. the shared compact failure-response view for every completed unsolved row;
2. bounded rich search-loss capsules only when an explicit capture profile is enabled.

The compact view may become standard after parity/storage validation because most of its source fields are already produced and persisted.

The rich capture remains opt-in until its overhead is characterized.

The highest-value downstream join is:

`production refresh × technique census × search-loss evidence`

because it can distinguish actual production exposure from isolated capability.

### 6.11 Benchmark tooling

`scripts/stress/benchmark.mjs` already persists attempts, failed strategies, nodes, work, deadline truncation, and best/final badness through the shared attempt projection.

It should consume the same compact failure-response helper rather than inventing benchmark-specific negative semantics.

Default behavior:

- compact failure-response: yes once schema is stable;
- rich capsules: opt-in only;
- no exact/reference work during benchmark execution.

### 6.12 Variant/family evaluation

Family evaluation should eventually preserve the same compact response shape when solver outcomes are materialized.

This enables analysis where parent and child are both unsolved but the failure locus/search basin changes materially.

Rules:

- parent family remains the independent unit;
- child count is not independent support;
- rich capsules only for selected family studies;
- generated family metadata remains selection/generation provenance, not a runtime feature.

### 6.13 Capability memory as consumer

Capability memory should eventually consume derived failure-response/loss-signature comparisons in addition to solved-set gain/loss churn.

A zero-solve treatment may still be valuable mechanism evidence if it reproducibly changes:

- progress depth;
- terminal basin;
- earliest observed loss locus;
- retention/routing exposure;
- work-response shape.

This does not earn promotion. It preserves latent capability information for later composition/acquisition research.

### 6.14 Residual atlas as consumer

Residual/capability atlas views may add observational failure dimensions such as:

- source/reach unresolved;
- live material observed late;
- retention-boundary opportunity observed;
- dose-censored with progress;
- isolated rescuer exists;
- same-basin recurrence.

These are descriptors, not causal F-class assignments.

### 6.15 Hint provenance and solution profiles

Offline-only joins.

Questions:

- Are observed failure basins associated with independently discovered accepted-solution regimes?
- Does one solver repeatedly lose support for a solution mode seen across multiple provenance strata?
- Is a first-loss story sensitive to accepted-path representative choice?

Never route production by stored hints/profile similarity.

### 6.16 Research blocks and consumption lineage

Do not put every ordinary capture into a special confirmation/tuning regime.

When a scientific study selects capsules, create or inherit a normal research block with:

- stable question ID;
- parent IDs/content identities;
- source capture artifact refs;
- parent-level independent unit;
- evidence role;
- selection/conditioning;
- consumption events.

A selected cohort becomes development evidence for descendants once outcomes/annotations are opened.

### 6.17 Research relations

Extend the read-only relation layer so `research:relations` can discover search-loss captures/annotations and connect them to:

- questions;
- assets;
- research blocks;
- parents;
- exact labels/derived evidence where referenced.

Do not move scientific admissibility logic into the relation layer. It remains a discovery/join substrate.

### 6.18 Premise map and question registry

The resource is particularly relevant to current premises/questions including:

- P024: source absent vs unreachable vs reached-and-lost;
- P041: reranking only when failure locus is rank/budget;
- P063: observable symptoms of current failure mode;
- P080/P081: explicit failure explanation and reusable causes;
- P122: continuation/frontier disposal;
- P133: interaction work only where mechanisms repair consecutive losses;
- P135: first irreversible loss;
- P145: near phase transition vs outside capability;
- P147: contradiction -> earlier causal decision.

Do not mark any of these premise-positive merely because the resource exists.

## 7. Resource Contract for `search-loss-evidence`

The asset should begin catalogue-grade and be promoted to audited-resource grade before recurring broad decision-bearing use.

Expected audit semantics:

### Natural grain

- solver run;
- parent level;
- attempt/stage;
- selected search event/state;
- annotation event.

### Independent unit

Usually parent level for prevalence/generalization.

Within-parent capsules are repeated measures.

### Identity layers

At minimum:

- level ID;
- structural level content identity;
- solver/run/protocol identity;
- attempt;
- stage/action;
- decision/event;
- state/path;
- ancestry/basin where available;
- annotation.

### Conditioning

Common conditioning includes:

- production outcome = unsolved;
- stage reach;
- event occurrence;
- selector predicate;
- cull proximity;
- terminal/budget censoring;
- later manual/scientific cohort selection.

These must remain explicit.

### Admissible evidence purposes

Expected purposes:

- forensic;
- mechanism nomination;
- first-loss candidate localization;
- longitudinal process;
- capability-basin comparison;
- population prevalence only under an explicit parent sampling design and complete denominator semantics.

### Dependence

- multiple capsules from one parent are clustered;
- repeated runs under nearby configs may share ancestry;
- frontier siblings are dependent;
- same decision's retained/culled candidates are paired observations.

### Missingness

- no annotation = unknown;
- no retained capsule with truncated selector = unknown;
- no event with complete selector observation = observed zero for that selector only;
- timeout = unknown;
- unsupported model = unsupported, not DEAD;
- missing old fields remain unknown.

### Freshness

Historical observation is valid for its historical solver/protocol. Current-behavior claims require current or justified-comparable execution.

### Irreversible loss

A bounded capture intentionally drops most frontier/event material. Store enough denominator/selection metadata to make that loss explicit.

### Consumer classes

- first-loss survey;
- decision/rejection counterfactuals;
- exact-label studies;
- capability memory;
- family research;
- lifecycle/allocation analysis;
- repair/LNS candidate research;
- premise-map acquisition.

## 8. Phased implementation

## 8.1 Producer integration matrix

Before rich capture scales, every major solver-running workflow should have an explicit failure-data disposition.

| Producer family | Compact failure response | Rich capsules | Expected default | Notes |
|---|---|---|---|---|
| production refresh / level-blind capability sweep | required | bounded, opt-in initially | compact yes | primary production-search view; lifecycle already standard |
| technique census T1/T3/T4 | required | selected cells only | compact yes | complete cell denominator; node-depth semantics |
| technique census EW1/equal-work | required | selected cells only | compact yes | strongest cross-technique failure-response comparison |
| stress benchmark | required/derived | opt-in | compact yes | reuse shared attempt projection |
| variant/family evaluation | required when solver-evaluated | selected families | compact yes where evaluation is durable | parent family is independent unit |
| decision-observation studies | native rich source | native | question-specific | do not down-convert away decision semantics |
| production-frontier sampler | not ordinary outcome producer | native rich source | question-specific | deliberate within-parent expansion |
| exact/reference workflows | annotation only | annotation only | never ordinary capture | expensive, downstream |
| known-prefix survival | specialist observation/annotation | native | question-specific | known-path-conditioned |
| failure inbox | link/consumer only | no | no | workflow triage, not evidence store |

### Shared producer rule

Every producer does **not** need to emit the same physical artifact.

They do need common semantics for the overlapping cheap response fields.

Prefer:

- one shared projection;
- producer-native primary rows;
- read-time adapters where durability is already sufficient;
- explicit side-effect/artifact declarations when a workflow emits additional search-loss material.

Avoid duplicating the same attempt response in multiple nested payloads merely for schema uniformity.

### Experiment/result side effects

When a workflow deliberately emits failure-response/search-loss telemetry, update its experiment/result contract rather than leaving `sideEffects.telemetry: "none"`.

The declaration should distinguish at least:

- compact observational telemetry;
- rich search-loss capture;
- exact/reference annotation;
- report-only derived summaries.

This is provenance/reconstructability metadata. It does not make the telemetry decision-bearing by itself.


Each phase is independently reviewable. Do not skip ahead because later steps look straightforward.

### Phase 0 - impact map and contract freeze

**Goal:** prove the proposed resource is additive and identify exact producer/consumer seams before code.

Read/inspect:

- `scripts/solver-decision-observation-lib.mjs`;
- beam research record producer;
- lifecycle telemetry producer and projection;
- stress-refresh artifact publisher;
- production frontier sampler;
- experiment contract/result helpers;
- research-block lineage;
- research-relations artifact discovery;
- data-asset registry/query tooling;
- exact/reference prefix identity helpers;
- hint provenance identity/dedup patterns.

Produce a short implementation record or plan amendment that freezes:

1. v1 capsule fields;
2. v1 event kinds;
3. v1 selector reasons;
4. producer path selected for Phase 3;
5. exact run/protocol identity helpers to reuse;
6. storage path pattern;
7. consumer/query path;
8. compatibility policy: no historical backfill;
9. parity observable.

**Exit gate:** no unresolved duplicate authority/schema and one clear low-cost producer exists.

**Stop:** if the current decision-observation or another existing generic artifact already carries every required field and durable denominator semantics, reduce this plan to registry/query integration rather than introducing a new capsule wrapper.

### Phase 1 - shared capsule contract and tests

**Goal:** implement pure data semantics with no solver wiring.

Recommended files:

- `scripts/solver-search-loss-evidence-lib.mjs`;
- `scripts/solver-search-loss-evidence-lib-node-test.mjs`.

Functions should include:

- `validateSearchLossCapture(document)`;
- `validateSearchLossCapsule(row)`;
- `searchLossCapsuleIdentity(row)`;
- `createSearchLossCollector(profile)`;
- `summarizeSearchLossCapture(...)`;
- semantic dedup helper;
- optional adapter from shared decision observation for supported cull events.

Collector requirements:

- bounded per-selector storage;
- observed/retained/truncated counts;
- deterministic behavior;
- JSON-safe cloning;
- duplicate identity rejection or semantic dedup with explicit rule;
- no wall time masquerading as work;
- canonical `workSpent` required when the event claims comparable solver work.

Tests:

- valid minimal capture;
- malformed required identity;
- duplicate semantic row;
- deterministic selector cap;
- truncation semantics;
- UNKNOWN-preserving annotation absence;
- decision-observation adapter;
- workSpent/node separation;
- serialization round trip.

**Exit gate:** plain Node tests prove the schema/collector without importing solver TypeScript directly.

### Phase 2 - asset registry and relation discovery

**Goal:** make the resource discoverable before generating material.

Update `docs/solver-research-data-assets.json` with `search-loss-evidence`.

Required registry content:

- grain;
- locations;
- authorities;
- query entry points;
- join keys;
- evidence roles;
- related assets;
- affordances;
- caveats.

Add relationships at minimum:

- search-loss-to-lifecycle;
- search-loss-to-exact-labels;
- search-loss-to-operational-traces;
- search-loss-to-capability-memory;
- search-loss-to-variants;
- search-loss-to-technique-census.

Update `docs/solver-research-data-assets.md` only with cross-asset guidance that cannot live cleanly in the registry. Prefer one concise evidence-topology row and one scientific-boundary note over a second full description.

Extend `scripts/research-relations-lib.mjs` artifact discovery/enrichment if needed so captures with research blocks can appear as research artifacts/parents.

Do not add semantic admissibility logic to the relation layer.

Tests:

- registry schema/check;
- relationship reference integrity;
- relation discovery on a synthetic capture fixture;
- source provenance retained by query output.

**Exit gate:** a fresh agent can discover the resource through normal asset/relation tooling before any real capture exists.

### Phase 3 - shared compact failure-response projection

**Goal:** stop major solver-running workflows from discarding cheap failure-side information before adding rich path/state capture.

Add one shared projection/helper for unsuccessful attempt/cell response semantics.

Recommended home:

- a new small plain-Node helper beside existing solver result/research projection tooling, or;
- an extension of an existing shared result projection only if ownership remains clear.

The helper should normalize, as available:

- action/config/stage identity;
- outcome/status;
- node ceiling / nodes consumed;
- work ceiling / canonical work consumed;
- best/final badness;
- exhausted/capped/deadline-truncated/error/referee-invalid;
- participation/reach;
- producer/run/cell identity.

It must preserve unknown fields rather than synthesize false/zero.

#### Technique census first

Update `technique-census-cell.mjs`, result canonicalization, combine tooling, plan/workflow contracts, and tests so every completed cell retains the compact response vector.

Do not require `collectAttemptTelemetry=true` merely to obtain the compact failure summary.

Keep full `attempts[]` opt-in unless a specific consumer requires them.

Update census summaries/reducers so failure rows can be stratified by:

- exhausted;
- node-budget reached;
- work-budget reached;
- deadline-truncated;
- error/referee-invalid;
- progress bands;
- work bands.

Ensure EW1 preserves canonical work semantics and T1 remains clearly node-depth evidence.

#### Production refresh and benchmark adapters

Project the same compact semantics from existing production-sweep and benchmark rows without duplicating source fields.

Where the underlying row already contains the canonical data, the adapter should be derived/read-time rather than write a second copy unless durable reconstructability requires it.

#### Producer contract audit

Inspect at least:

- technique census;
- level-blind capability sweep / solver-stress-refresh;
- stress benchmark;
- variant/family evaluation producer(s);
- generic experiment-result publisher.

Record for each:

- which compact fields are already computed;
- which are currently persisted;
- which are lost;
- whether adding retention changes artifact size materially;
- whether the workflow contract's telemetry side-effect declaration must change.

**Exit gate:** technique-census failed cells no longer collapse to solve/no-solve when richer attempt response was already computed, and all major solver-running producer families have an explicit disposition.

### Phase 4 - first production-inert rich capsule producer

**Goal:** prove cheap path/state observation against real solver execution while preserving exact behavior.

Choose the narrowest existing seam from Phase 0. Preference order:

1. existing beam research records + shared decision adapter for cull observations;
2. existing lifecycle/best-progress events;
3. production frontier observer only if the above cannot provide a useful v1 population.

Do not wire every solver subsystem.

Initial producer should support a maximum of 3-5 selector classes, for example:

- best progress;
- terminal best;
- near-cutoff culled;
- near-cutoff retained;
- bounded frontier sample.

Capture only on unsolved invocations for the first pilot unless solved controls are required for parity.

Producer must emit:

- run envelope;
- selector summaries;
- capsules;
- source attempt/stage identity;
- canonical work;
- structural level revision;
- capture profile/version.

#### Parity canary

Run observer OFF/ON on a small deterministic multi-level sample.

Require equality of:

- solved/unsolved;
- returned solution;
- workSpent;
- nodes where deterministic;
- attempt/stage sequence;
- ordering/retention at observed decisions;
- randomness/seed behavior;
- cache/memo lifetime observables where relevant.

Measure:

- wall overhead;
- bytes per failed parent;
- capsules per parent;
- observed vs retained counts;
- selector truncation frequency.

**Hard storage gate:** if ordinary v1 capture approaches full-trace scale, narrow selectors/context before proceeding. Treat the D1 240 MB capture as the explicit anti-pattern.

**Exit gate:** parity clean, bounded size, useful rows on more than one parent.

### Phase 5 - capture CLI/publisher and durable bundle

**Goal:** make captures reproducible and safe to retain when decision-bearing.

Add a CLI, preferably under existing solver/stress conventions, such as:

`scripts/stress/capture-search-loss-evidence.mjs`

or integrate into an existing stress command if that yields a cleaner single authority.

Required CLI behavior:

- explicit corpus/level selection;
- explicit capture profile;
- explicit budget/protocol inputs;
- explicit output path;
- optional research-block inheritance/creation for frozen studies;
- fail closed on missing structural identity;
- capture summary on stdout;
- deterministic output ordering.

If using GHA, reuse an existing workflow family where practical. Do not create a new workflow solely for a cheap local producer unless sharding/hosted execution is actually required.

For decision-bearing workflow outputs, reuse the existing durable evidence closeout pattern so captures do not disappear with Actions retention.

Tests:

- CLI synthetic/fixture smoke;
- invalid level/population identity;
- output schema;
- stable ordering;
- research block validation;
- source manifest/run identity.

### Phase 6 - annotation adapters

**Goal:** allow existing evidence systems to enrich capsules without mutating the original observation.

Implement adapters, not new reasoners.

First adapter: exact/reference.

Inputs:

- capture artifact;
- selected capsule IDs;
- exact/reference result artifact.

Output:

- annotation artifact retaining inherited population/research block identity;
- LIVE/DEAD/UNKNOWN/UNSUPPORTED;
- model/probe identity;
- per-query or aggregate cost;
- canonical referee validation status where witness returned.

Second adapter: known-support/prefix survival, only where identities match legitimately.

Third adapter: controlled counterfactual result, only after a real study needs it.

Tests:

- exact LIVE;
- exact DEAD;
- timeout -> UNKNOWN;
- unsupported -> UNSUPPORTED;
- mismatched prefix/state identity fails closed;
- inherited research block/population identity;
- no mutation of source capture.

**Exit gate:** one historical search capsule can be exact-annotated after the fact with auditable provenance.

### Phase 7 - query/reducer surface

**Goal:** answer common research questions without bespoke JSON surgery.

Add a compact query/reducer command, either:

- extend `research:relations` for discovery plus add a specialist reducer; or
- add `scripts/search-loss-query.mjs` if row-level filtering would overload relations.

Support filters such as:

- parent ID;
- event kind;
- capture reason;
- stage;
- disposition;
- exact annotation;
- solver/protocol;
- work range;
- depth;
- selector truncation state;
- research block/question ID.

Provide parent-level summaries:

- parents observed;
- capsules/event;
- selector opportunity rate;
- annotation support rate;
- event-kind prevalence conditional on sampled parent population;
- within-parent repeated phenotype count;
- policy/config overlap where two captures are compared.

Never default to raw capsule count as prevalence.

### Phase 8 - resource audit

**Goal:** promote from catalogue-grade to audited-resource grade before broad recurring decision use.

Create a focused dated audit report following Resource Contract conventions.

Audit:

- producer;
- selection/conditioning;
- independent unit;
- identity layers;
- missingness;
- dependence;
- freshness;
- irreversible information loss;
- consumer inventory;
- durability;
- query discoverability;
- historical blast radius.

Add the audit declaration to `docs/solver-research-resource-contract-audits.json`.

Exercise normal discovery:

- `research-asset-query`;
- `research:relations`;
- relevant dossier path.

Add mechanical checks where practical.

**Exit gate:** a fresh researcher sees the conditioning/dependence/missingness caveats before using the rows.

### Phase 9 - first scientific consumer: bounded first-loss survey

**Goal:** prove that the resource changes research decisions.

This phase is **not automatically next in solver priority**. Execute only when `solver-optimization-workstreams.md` authorizes the first-loss/operational-divergence lane.

#### Population

Freeze a parent-level sample from the current residual before opening new exact/counterfactual outcomes.

Prefer stratification by already-authoritative residual/lifecycle categories rather than selecting visually interesting capsules.

Record:

- current production boundary;
- population identity;
- parent selection;
- evidence role;
- source conditioning;
- independent unit.

#### Survey procedure

For each parent, use the cheapest evidence first.

1. lifecycle/reach/allocation;
2. search-loss capsules;
3. source/action coverage if relevant;
4. existing known-prefix/trace evidence;
5. exact labels only on the smallest discriminating capsule set;
6. counterfactual replay only when needed to separate adjacent plausible classes.

Output per parent:

- earliest observed search-loss locus;
- classes excluded;
- earliest unresolved class;
- any exact LIVE->loss boundary;
- work censoring/exhaustion state;
- route/action exposure;
- counterfactual intervention if established;
- final classification or `UNRESOLVED_EARLIER_CLASS`.

Do not force a class.

#### Decision output

Report parent-level fractions such as:

- source/reachability ambiguity remains;
- exact LIVE material reaches search;
- ranking/retention loss confirmed;
- work starvation/dose implicated;
- routing/deployment implicated;
- causal class unresolved.

The primary result is a **distribution of causal uncertainty**, not an artificially complete F0-F14 histogram.

#### Advancement

Only if the survey finds a recurring class at useful parent-level prevalence should it nominate the corresponding narrow research lane.

Examples:

- F2-heavy -> candidate/source/action acquisition;
- F5/F6-heavy -> ranking/retention;
- F7-heavy -> dose/allocation/continuation;
- F8-heavy -> routing/placement;
- F9/F10-heavy -> solve-local failure learning;
- F11-heavy -> repair/revision;
- F12-heavy -> typed handoff/persistence.

Then follow the ordinary premise -> observer/shadow -> matched-work treatment -> confirmation path.

## 9. Derived loss signatures

Do not implement these in v1 capture.

After enough data exist, a reducer may generate descriptive signatures such as:

- early-source-limited;
- hard-rejection-heavy;
- rank-extinction;
- retention/merge-extinction;
- repeated-basin;
- progress-then-budget-censored;
- stagnant-budget-censored;
- routing-starved;
- terminal-near-miss.

Rules:

1. signatures are derived/rebuildable;
2. descriptive signatures are not F-class assignments;
3. thresholds selected from outcomes create development evidence;
4. raw level identity/signature membership cannot become production routing;
5. compare parent-level distributions, not raw event counts.

Potential capability-memory extension:

For policies A and B on the same failed parent, compare:

- same/different terminal basin;
- same/different earliest observed loss locus;
- progress depth/work;
- event signature;
- exact labels on matched capsules when available.

This can preserve useful latent movement from zero-solve-delta treatments without implying production value.

## 10. Longitudinal recurrence

A later consumer may identify repeated failure across solver revisions/configs.

Keep separate:

### State/basin recurrence

Did search repeatedly reach materially similar current puzzle/search states?

Possible identity inputs must be current-input/search-derived and should avoid accidental exact-level lookup semantics if later reused as a generic descriptor.

### Reason recurrence

Did independent states hit the same typed reject/conflict/reason?

Do not conflate geometric/state recurrence with causal-reason recurrence.

The latter may eventually support P067/P080/P081 style solve-local knowledge reuse, but only after recurrence and economic value are measured.

## 11. Performance and storage budget

Before broad capture, establish explicit budgets.

Suggested initial targets, to be validated rather than treated as law:

- <= 20 retained capsules per failed parent under the default v1 profile;
- <= a few tens of KB median per parent;
- no full ranked beam pool persistence;
- no full path duplication when a stable compact identity plus selected path payload suffices;
- <5% observer wall overhead on the canary unless the capture is explicitly offline/research-only;
- zero change in canonical work/outcome.

If path replay requires the full prefix, store it only for selected capsules. Avoid repeating the same parent-level structure or giant candidate context on every row.

## 12. Schema evolution

Use `schemaVersion`.

Rules:

- write only current canonical v1 shape;
- no mandatory migration of old specialist artifacts;
- adapters may read supported older specialist artifacts when semantics are genuinely reconstructable;
- unknown historical fields stay unknown;
- schema evolution should be additive where possible;
- semantic changes require explicit versioning and tests.

Do not promise indefinite compatibility for every dated research artifact. Follow the repository rule that frozen evidence is not a permanent current-analyzer API.

## 13. Testing and validation matrix

### Pure contract

- validator accepts canonical fixtures;
- rejects malformed identity;
- rejects invalid work;
- preserves UNKNOWN;
- semantic dedup stable;
- serialization round trip.

### Selector behavior

- fixed limit;
- deterministic retained set;
- observed/retained/truncated exact;
- zero-opportunity selector;
- cap reached;
- multiple selectors do not silently share one cap.

### Decision adapter

- score-width cull;
- mechanic-bucket cull;
- ints-bucket cull;
- legacy missing `workSpent` refuses conversion;
- selected neighborhood preserves retained/culled truth.

### Producer parity

OFF vs ON:

- result;
- solution;
- workSpent;
- nodes;
- attempt/stage order;
- observed decision order;
- RNG/seed;
- cache lifetime where measurable.

### Lineage

- structural revision;
- solver SHA;
- protocol/config hash;
- research block;
- population identity;
- source artifact refs.

### Annotation

- exact LIVE;
- exact DEAD;
- timeout;
- unsupported;
- mismatch fails closed.

### Registry/relation

- asset registry validation;
- relationship references;
- research relation discovery;
- no duplicate authority.

### Finish line

For documentation-only Phase 0 plan work:

`npm run check:documentation-links`

For ordinary scripts/schema/tooling phases:

`npm run ci:fast && npm run build`

If solver hot-path instrumentation is changed:

targeted parity tests, then `npm run ci && npm run build`.

## 14. Documentation updates during implementation

Do not front-load speculative authority edits.

Update only when the corresponding implementation exists.

Expected eventual updates:

- `docs/solver-research-data-assets.json` - resource and relationships;
- `docs/solver-research-data-assets.md` - concise cross-asset topology;
- `docs/solver-research-resource-contract-audits.json` - after audit;
- `docs/solver-first-loss-causal-taxonomy.md` - link to implemented observation source, not duplicate schema;
- `docs/tooling-catalog.md` or normal tooling discovery surfaces if a new durable CLI family is added;
- `docs/solver-research-question-relations.json` only when a specific question is actually answered/advanced;
- `docs/solver-optimization-workstreams.md` only when implementation/evidence changes a live gate.

Do not mark the existence of the resource as solver progress.

## 15. Rollout sequence and merge boundaries

Recommended PR boundaries:

### PR A - contract + registry + synthetic query integration

- Phase 1;
- Phase 2;
- no solver execution changes.

### PR B - compact failure-response producers

- Phase 3;
- technique census first;
- production refresh/benchmark adapters;
- workflow/experiment side-effect semantics;
- no rich path/state capture required yet.

### PR C - production-inert rich capsule producer + parity tests

- Phase 4;
- selected capture profile only.

### PR D - CLI/durable capture + annotation adapter

- Phase 5;
- Phase 6;
- small real canary artifact only if needed for contract evidence.

### PR E - reducer/query + resource audit

- Phase 7;
- Phase 8.

### Scientific run/report

- Phase 9 only when live queue authorizes it.

Avoid one giant PR that simultaneously changes solver instrumentation, persistence, exact annotation, research relations, resource semantics, and a scientific conclusion.

## 16. Agent checklist

Before implementing any phase:

1. read `AGENTS.md`;
2. read current `solver-optimization-workstreams.md`;
3. read this plan;
4. read the phase's owning authorities/files;
5. run tooling/research discovery before adding a new CLI/helper;
6. verify current `main` has not added an equivalent resource;
7. keep production behavior unchanged unless a later separately authorized experiment says otherwise.

Before completing a phase:

1. verify the phase exit gate;
2. inspect consumers, not only definitions;
3. run targeted tests;
4. run the applicable CI finish line;
5. update only current authorities invalidated by the actual work;
6. record unresolved gaps instead of filling them with guesses.

## 17. Stop and simplification conditions

Simplify or stop the program if any of these occur.

### Existing-resource collapse

If an existing generic artifact already provides capsule identity, bounded retention, denominators, lineage, queryability, and durable semantics, register/reuse it instead of adding a wrapper.

### No useful opportunity

If a parity-clean pilot across a representative failed sample produces almost no discriminating observations beyond lifecycle/best-badness already retained, stop. Do not build storage for its own sake.

### Storage explosion

If useful capture requires full pools/full traces, return to question-specific capture rather than making ordinary runs enormous.

### Causal ambiguity not reduced

If the first scientific consumer still needs bespoke reruns for nearly every parent and the captured observations do not reduce the number/cost of discriminating queries, the resource has failed its main purpose. Narrow or retire it.

### Selection semantics too opaque

If selectors cannot expose understandable denominators/conditioning, do not use the resource for prevalence claims.

### Production perturbation

Any unexplained OFF/ON behavior/work difference blocks rollout.

## 18. Success criteria

The implementation is successful when all of the following are true:

1. a failed solver run can optionally emit a compact, bounded, versioned search-loss capture;
2. every retained capsule has structural, execution, stage, work, state/event, and selection provenance;
3. every selector reports observed/retained/truncated denominator semantics;
4. capture is production-inert under tested parity;
5. the resource is discoverable through normal research asset/relation tooling;
6. a later exact/reference run can annotate a historical capsule without rerunning the original search;
7. selected studies inherit normal research-block/consumption lineage;
8. parent-level dependence and failure-conditioning are visible through the Resource Contract;
9. technique-census failed cells preserve compact work/progress/censoring response instead of collapsing to solve/no-solve;
10. production refresh, benchmark, and solver-evaluated family workflows have an explicit compact-failure-data disposition and reuse common semantics;
11. one authorized first-loss study can reuse the resource and spend fewer bespoke search reruns to localize causal uncertainty;
12. no production policy consumes stored historical capsule identity or annotations.

## 19. Intended end state

The intended architecture is:

```text
ordinary solver run
    |
    +--> production outcome / benchmark
    |
    +--> lifecycle telemetry
    |
    +--> bounded search-loss capture
              |
              +--> research asset registry / relations
              |
              +--> selected research block
                       |
                       +--> exact/reference annotation
                       +--> known-prefix join
                       +--> operational replay
                       +--> frontier sibling expansion
                       +--> capability-memory comparison
                       +--> variant-family contrast
                       |
                       +--> first-loss causal study
                                  |
                                  +--> premise nomination
                                  +--> smallest falsifier
                                  +--> matched-work treatment
                                  +--> confirmation/transfer
```

The search-loss layer should stay deliberately thin.

Lifecycle owns where work went. Decision observation owns decision shape. Exact/reference owns feasibility labels. First-loss taxonomy owns causal classification. Research blocks own selection/consumption lineage. Resource Contract owns evidentiary semantics. Research relations own read-time integration. Capability memory owns cross-policy capability history. Workstreams own priority.

Search-loss evidence contributes one missing thing:

> durable observations of what unsuccessful search actually did, selected cheaply enough that future research can start from evidence instead of reconstructing every failure from scratch.
