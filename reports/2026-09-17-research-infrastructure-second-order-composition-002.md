<!-- agent-context-budget: warn=9500 max=12500 -->
# Research infrastructure second-order composition 002

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — second-order combinatorial audit of the merged #1877 research-integration layer against current workstreams, question registry, premise map, measurement opportunities, resource contracts, asset relationships, experiment evidence, capability memory, archaeology, generation, family/frontier workflows, and opportunity sizing.
> **Decision:** keep the #1877 architecture, but exploit several additional seams. Land the low-risk exact joins and accounting fixes in this tranche; preserve the remaining semantic joins as explicit follow-on work rather than creating a planner or warehouse.
> **Remaining gate:** after this tranche, use D1 as the next scientific gate. Implement deeper semantic joins only where a live research question can consume them or where they repair a general evidence-integrity defect.
> **Research question:** none
> **Premise refs:** `P123`, `P133`, `P190`, `P191`, `P201`, `P204`, `P206`
> **Measurement opportunity:** `MO-003`, `MO-004`, `MO-006`, `MO-007`
> **Evidence role:** forensic
> **Selection:** systematic architecture/composition audit
> **Population identity:** current repository research architecture after merge of PR #1877
> **Selection history:** prompted by a deliberate second pass over pairwise and higher-order interactions after the first integration tranche
> **Inference scope:** research-infrastructure composition and observability; no solver mechanism or production policy claim

## Why a second pass found more

The first composition pass mainly connected the major vertical spines:

`question -> population/block -> experiment -> durable evidence`

and

`question -> assets -> acquisition -> generation/family`.

That was necessary but not sufficient. The second pass treated research subsystems as composable objects and asked a different question:

> Where do two or three mature systems already contain complementary information, but a human still has to notice, reconcile, or re-key the relationship before it can affect the next research action?

That framing exposed several seams that are small in code but large in epistemic effect.

## Landed in this tranche

### 1. Workstream authority -> status index -> relations/dossier

The current workstream authority renamed its table heading to `## Workstream state`, while the research-status parser still looked only for `## Active workstreams`. The queue relation could therefore be empty even though the authority was healthy.

The parser now reads the current heading with a legacy fallback, repository tests require the current queue to be non-empty and to expose WS2, and composite workstream identities such as `6/7` and `0/4` are preserved instead of being coerced through `Number(...)`.

This is a general lesson: a read-only integration layer needs consumer-side sentinels against authority-shape drift, not only source-schema validation.

### 2. Question -> report -> premise / measurement opportunity

Decision-bearing reports already had to state evidence role, selection, population identity, selection history, and inference scope, but the status index discarded those fields. Reports also had no stable prospective join to the question/premise/MO registries.

The status index now preserves optional exact metadata:

- stable research question ID;
- premise refs;
- measurement-opportunity refs;
- evidence role;
- selection;
- population identity;
- selection history;
- inference scope.

The report convention now permits those stable refs when the semantic relationship is deliberate. They are join metadata, not authority. Old reports are not mass-migrated.

The question dossier prefers stable question-tagged evidence when it exists and falls back to lexical discovery otherwise.

### 3. Question -> premise map -> measurement opportunity

The 27-row question registry previously contained no structured premise or MO references at all. That meant the dossier could show a strong premise map and a strong question graph while the bridge between them remained mostly lexical.

This tranche adds only mappings that are already sufficiently explicit for current live/deferred gates:

- `WS2-D1-PRODUCTION-INERT-OBSERVATION` -> P091/P065/P206, MO-002;
- `WS2-SEPARATOR-DYNAMIC-INTERFACE` -> P014/P074/P093;
- `WS2-G1-COMPLETE-PATH-LNS` -> P073/P143, MO-005;
- `WS1-REMAINING-LENGTH-ALLOCATION` -> P065/P123, MO-004;
- `WS2-CLASS3-DOSE-EXPOSURE` -> P123/P206, MO-004.

No other question is inferred from textual similarity. The integration audit validates the new refs against the active registries.

This makes a useful future distinction possible: **semantic question ancestry** can be inspected through the premise graph while **evidence exposure ancestry** remains independently represented by block consumption.

### 4. Question -> individual assets -> authored multi-asset joins

The asset registry already contains 16 carefully authored relationship recipes, many spanning three to six resources, but #1877's dossier/preflight ranked only individual assets.

`research:relations` now exposes `assetRelationships`. Dossier and acquisition preflight now rank both candidate assets and the registry's authored multi-asset joins, retaining each join's scientific boundary.

Examples that can now surface as first-class recipes include:

- census × lifecycle × production benchmarks;
- known-prefix survival × exact labels × operational traces;
- capability memory × traces × families × descriptors × census;
- experiment manifests × benchmarks × lifecycle × families × raw evidence × capability memory;
- failure triage × lifecycle × traces × exact labels × families × capability memory.

This is not an automatic query planner. It makes existing human-authored A×B×C knowledge discoverable at the point a question is being planned.

### 5. Opportunity population -> clustered observations -> independent units

The opportunity audit previously sized from rows only. That is correct for ordinary one-row-per-level experiments but wrong for the newer research workflows that deliberately create multiple states/decisions/variants per parent.

The audit can now accept an explicit independent-unit field and separately report:

- opportunity rows;
- independent opportunity units;
- rows per unit;
- row-level and unit-level opportunity rates;
- unit-level Wilson interval;
- a pseudoreplication warning when rows collapse to fewer units.

Sizing can use either rows or independent units. The default remains rows for compatibility. Family/frontier/multi-pick research can now say, for example, “25 informative states from one parent improve within-parent detection but count as one parent for between-parent support.”

This turns P206 from a methodological slogan into executable accounting.


### 6. Question/block lineage -> off-main family resource

Prospective `family-generate` runs already recorded stable question ID, evidence role, parent exposure, independent unit, and optional origin research-block identity inside each generation run. The disposable family index discarded that context.

The index now preserves generation-run research context at family and variant granularity and supports `--question-id`, `--evidence-role`, and `--origin-block-id` filters. A question can therefore ask what controlled descendants already exist in the off-main family resource without scanning that multi-gigabyte dataset from the main research-relations layer.

This is deliberately an index-boundary join. The large dataset remains off-main and the recorded evidence role remains provenance, not automatic inferential entitlement.

## Second-order seams worth exploiting next

The items below are deliberately **not** all implemented here. They vary in semantic risk and should be earned by a live consumer or a general evidence-integrity need.

### Decision observations × non-solve capability memory

The capability-memory doctrine explicitly says a no-solve treatment can still preserve useful trajectory, retention, representation, or survivor-identity information. The current capability-memory implementation is much more outcome-shaped: its durable joins primarily encode solved-set gains/losses and historical gain/loss signatures.

That creates a gap exactly where P003/P004 say solve count is too sparse. A future extension should allow a bounded, typed **mechanism signature** from decision-observation/exact/replay evidence to be preserved as a nomination without pretending it is a solve capability. Examples include repeated cutoff-crossing LIVE retention failures, a stable exact-discriminator disagreement, or a reproducible frontier-survival phenotype.

Such signatures should remain separate from solve-set union/headroom calculations and require an explicit path to an actionable consumer.

### Question registry × future-work reopen authority

Deferred questions are structured in the question registry, while future-work entries are mostly prose/table concepts. The current authority audit checks discoverability through IDs/aliases, which is useful but still lexical.

A stronger prospective link could give deferred rows a stable question reference or anchor without duplicating the reopen condition itself. That would make “this changed condition reopens exactly this deferred question” mechanically navigable while leaving `solver-future-work.md` as the deferred-work authority.

Do not retrofit every historical idea or manufacture one-to-one mappings where the future-work entry is intentionally broader than a question.

### Capability memory × operational taxonomy × evidence integrity

Capability memory preserves gains/losses and complementary solve sets, but candidate diversity can still be overstated when many named candidates are configurations of one operational family. Historical signatures also do not automatically inherit the reliability/reconstructability grade of their source evidence.

A stronger derived view would attach:

- canonical operational family/action identity;
- evidence-integrity record/reference when available;
- current/historical/reconciled grade;
- within-family versus cross-family complementary capability.

Then MO-006 covariance or “policy diversity” analysis can distinguish genuinely different mechanisms from configuration clouds and weak historical evidence.

Do not use this to delete actions or route production automatically.

### Durable experiments × research blocks × MO-006 response covariance

The MO-006 reducer already rejects pairs sharing one manually supplied ancestry key, but constructing its input is manual.

A derived response-landscape builder could consume durable experiment bundles, research-block ancestry, protocol/config identity, and independent units to produce eligible gain/loss vectors. Covariance nominations would then be ancestry- and protocol-aware by construction.

This is especially useful before interpreting a latent response cluster as a latent solver capability.

### Selection/consumption events × confirmation eligibility

Current block eligibility is intentionally conservative: any matching consumption can make non-development use ineligible. That is safe but increasingly too coarse.

Outcome-blind, prespecified selection (for example static-descriptor matching) is not epistemically identical to opening treatment outcomes and redesigning a treatment. The consumption schema already records conditioning and opened outcome kinds, but eligibility does not distinguish their effect.

A prospective event-impact taxonomy should separate at least:

- identity/administrative handling;
- outcome-blind prespecified selection;
- control-only conditioning;
- diagnostic outcome inspection;
- treatment-design influence;
- decision-bearing outcome use.

Historical/untyped events should remain conservative. Semantic question relations still must not be converted into contamination automatically.

### Generation lineage × transfer evidence role

The generation registry knows source family and construction class; research blocks know source regime/revision and evidence role. Those facts are not yet joined strongly enough to prove that a block labelled `transfer` is materially distributionally independent from development.

Prospective generated blocks should carry structured source-family/construction-class provenance. Transfer checks can then reject “different seed, same witness-first family” mechanically while still respecting mechanic-support scope.

Human/editor origin should remain a distinct source class rather than another procedural generator label.

### Generator adequacy × P190/P191 × human/editor contrasts × profile/structure coverage

Source choice should eventually answer more than “is this a different generator?”

P190/P191 make two stronger points:

1. a source should cover the solver-relevant structure/state relation needed by the claim;
2. construction-witness solvability itself induces a selection distribution.

A derived source-coverage view could combine generator support, static structural coverage, origin-recognizability diagnostics, solution-profile support, human/editor contrasts, and mechanic envelopes **without** using treatment outcomes.

That would let acquisition say “topology is independent but cannot represent the mechanic that activates this question” or “another witness-first seed adds sample independence but not the missing solution-topology regime.”

### Premise graph × question states × MO-003 interaction tests

The premise graph already encodes typed relations such as `ENABLES` and `COMPLEMENTS`. Future-work policy says mechanism interactions should be tested only when one mechanism plausibly creates another's opportunity.

Once more questions have earned premise refs, a derived interaction-nomination view can surface A/B/A+B experiments only when:

- two live/evidence-backed premises are connected by an interaction-relevant edge;
- their current questions remain unresolved in the relevant form;
- MO-003 is a legitimate discriminator;
- the opportunity populations actually overlap.

That is a principled route to interaction research without broad flag matrices.

### Premise neighborhoods × tested forms × archaeology

Stable question-to-premise refs make it possible to show a premise neighborhood beside a question:

- semantic parents;
- tested forms;
- narrowed/falsified scopes;
- complements/enablers;
- archaeology/future-work descendants;
- current MOs.

This is stronger than keyword archaeology. A new proposal can be checked against the local conceptual neighborhood before it becomes another renamed treatment of a closed form.

The premise graph remains semantic; historical evidence reliability still comes from the evidence/archaeology layers.

### Archaeology × evidence integrity × reopen conditions

The archaeology register explains whether old forms were clean negatives, dirty reverts, participation-invalid, population-limited, or unresolved. The evidence-integrity index separately grades reconstructability/reliability for surviving artifacts.

A question-centric reopen view could combine those with `reopensOn` to answer:

- is the old negative scientifically portable to the current gate?
- was treatment participation ever established?
- can the claim still be reconstructed?
- did the changed condition named by the reopen gate actually occur?
- is a rerun needed, or is the historical evidence already sufficient?

This should remain explanatory, not an automatic reopen engine.

### Exact/reference support × question mechanics × enrichment planning

Exact/reference resources abstain on unsupported mechanics and model boundaries. Enrichment is currently attached generically as `exact`.

Before dispatching expensive exact labeling, planning should be able to cross:

`question population mechanics × reference-model support envelope × expected abstention × independent units`.

That would prevent a large exact-label campaign from discovering late that the chosen oracle cannot answer the states that make the question interesting.

### Selection pressure × confirmation intensity

The evaluation authority says confirmation intensity should scale with how much candidate/threshold/configuration selection occurred, but that selection pressure is mainly described in prose.

Prospective experiment/question metadata could preserve a compact **selection provenance summary**, not a universal numeric score:

- prespecified versus mined;
- candidate/configuration count;
- threshold/seed sweep exposure;
- residual/cohort selection;
- whether exact labels informed treatment design.

Then confirmation planning can explain *why* a candidate needs modest confirmation versus grouped confirmation plus transfer. Avoid collapsing this into one pseudo-statistical “selection pressure score.”

### MO registry × tooling/assets/consumers

The MO overlay describes what should be measured, while tooling and asset registries describe how evidence is available. The bridge is still mostly prose.

A derived implementation-coverage view could state, without changing MO authority:

- implemented measurement primitive(s);
- input resource(s);
- known live consumers;
- support/abstention boundary;
- whether the missing piece is measurement, population construction, or representation.

For example MO-004 has a work-ladder reducer; MO-006 has covariance analysis; MO-005 has frontier acquisition but no earned universal progress representation; MO-007 remains process metrology rather than a scalar score.

### MO-007 × research process history

After stable question/report tags become more common, MO-007 can be made concrete with several diagnostics rather than one “research productivity” number:

- experiments/reports per question-state change;
- generated blocks created before existing evidence was reused;
- decisions delayed by missing discriminator telemetry;
- clustered-row/independent-unit inflation caught by preflight;
- stale authority/index seams caught by integration audits;
- premise regions receiving repeated work without uncertainty reduction;
- fraction of new decision-bearing reports carrying stable question/premise/MO joins.

The point is to reveal process bottlenecks, not rank researchers or optimize a vanity metric.

## High-value higher-order research compositions

Several combinations now look especially potent.

### Capability memory × asset relationships × family microscope × transfer source

1. Capability memory nominates a recurring complementary basin.
2. Operational/resource joins localize the likely mechanism.
3. A family perturbation tests causal sensitivity without pretending siblings are independent.
4. A prespecified structural claim is instantiated on an independent source chosen for the relevant dimension.
5. Confirmation/transfer remains parent/block independent.

This turns “old policy solved these levels” into a mechanism test rather than a policy resurrection.

### MO-006 covariance × source-origin recognizability × matched generation × families

1. Cross-experiment covariance nominates a latent response cluster.
2. Generator-origin recognizability asks whether the cluster is really source ancestry.
3. Outcome-blind cross-construction matching holds ordinary descriptors near-constant.
4. Family perturbation tests which structural relation actually changes the response.
5. Independent-source confirmation tests the extracted mechanism.

This is a strong defense against mistaking dataset provenance for solver capability structure.

### Frontier sampling × MO-005 × exact labels × work ladder

1. Freeze real production frontier states before labels.
2. Obtain supported exact/reference viability where possible.
3. Evaluate a prespecified progress/distance representation offline.
4. Separate viable-but-misranked states from superficial progress in dead basins.
5. Only if the representation discriminates, use a bounded work ladder to ask whether acting on it changes fixed-work value.

This avoids fitting a progress score directly to solved outcomes.

### D1 decision observations × MO-002 × independent-unit sizing × durable evidence

D1 is now an unusually complete architecture canary:

`stable question -> premise refs -> MO-002 -> frozen parent block -> production-inert decisions -> clustered opportunities -> parent-level sizing -> exact annotation -> work ancestry -> durable experiment evidence -> question closeout`.

It should remain an observation/economics gate, not be distorted to exercise generation or family tooling unnecessarily.

## What still should not be built

The second pass does not change the architectural conclusion that a central research database/planner would be harmful.

Do not add:

- a global research priority score;
- automatic semantic premise mappings from embeddings/keywords;
- automatic reopen/close decisions;
- automatic generation based on dossier output;
- one global evidence freshness/contamination bit;
- a single research-yield score;
- a requirement that every historical report be retrofitted with modern IDs;
- a universal operational-distance metric.

The useful pattern is smaller: stable IDs where semantics are earned, derived joins where authorities already exist, and audits where silent information loss is dangerous.
