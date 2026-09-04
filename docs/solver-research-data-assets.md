# Solver research data assets and evidence topology

> **Status:** current solver-research evidence-discovery authority.
> **Execution priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) still owns what research runs next.
> **Research method:** [`solver-research-operating-model.md`](solver-research-operating-model.md) owns evidence roles, stop rules, and promotion discipline.
> **Machine registry:** [`solver-research-data-assets.json`](solver-research-data-assets.json) records the durable asset IDs, authorities, join keys, relationships, and validation metadata described here.

This document answers a different question from the workstream queue and the tooling catalog:

> **What information does the repository already contain that could falsify, stratify, contextualize, explain, or independently challenge the premise I am investigating?**

The workstream queue maps current questions to their known evidence. [`tooling-catalog.md`](tooling-catalog.md) maps tasks to commands and workflows. This catalogue maps **evidence to evidence** so an agent can discover useful joins that were not already anticipated by a workstream narrative.

It is deliberately broader than "datasets." Some durable research assets are queryable interfaces over many artifacts, such as lifecycle telemetry, exact/reference labels, experiment manifests, the family index, or the research-status index. Generated output files remain owned by their producer/report conventions; this catalogue records the stable evidence family and how it can relate to other evidence.

## Required research-data preflight

Before buying broad compute or treating an experimental premise as fully formed:

1. Read the current workstream/gate first. This catalogue does not reprioritize the queue.
2. Find the relevant asset families below and in the machine registry.
3. Ask which assets could **falsify**, **stratify**, **contextualize**, or **independently validate** the premise.
4. Name the useful join keys and the independent unit before writing an ad hoc join. Normalize historical solver/stage/routing identities through their owning compatibility boundaries.
5. Prefer existing evidence over generation. If an existing join can answer the gate, do that before a new census, variant campaign, trace campaign, or exact-label batch.
6. Record materially relevant assets that were considered and rejected, especially when another agent would otherwise rediscover the same dead end.

The preflight is not permission to mine every asset for every question. Selection pressure still counts. A pattern discovered by trying many joins is discovery evidence, and a high-dimensional offline label can easily become a family/level identifier. Use the smallest join that can decide the next gate.

## Evidence topology at a glance

| Evidence family | Natural grain | Best used to ask | Strong joins |
|---|---|---|---|
| Published/stress levels | level, generator/source | What puzzle/population is this? What construction context produced it? | hints, static descriptors, benchmark results, census |
| Hint provenance | independent path discovery | Who/what found this path, under what config/work/context? | solution profiles, benchmark drift, fingerprints, census |
| Structural fingerprint | level structure | Is this the same structural revision/duplicate puzzle? | provenance, persisted evidence, family/level identity |
| Solution-space profile | level x provenance source | What do known solutions look like and how diverse are they? | census, variants, static descriptors, provenance |
| Technique census | level x configuration | What can isolated techniques/configurations do? | lifecycle telemetry, solution profiles, variants, descriptors |
| Production benchmark | run x level | What did the real solver actually accomplish and spend? | lifecycle, census, manifests, historical baselines |
| Lifecycle telemetry | level x action/stage/tranche | What did production reach, skip, starve, exhaust, or continue? | census, benchmark, traces |
| Known-prefix survival | level x beam boundary | Where did labelled viable support disappear? | traces, exact labels, variants |
| Operational traces | encountered decision | How did two searches actually differ? | variants, exact labels, lifecycle, determinism |
| Exact/reference labels | level x prefix/state | Is this selected state/prefix feasible when supported? | known-prefix survival, replay atlas, traces |
| Offline replay atlas | labelled state x probe | Can a candidate reasoner explain/use existing exact labels? | exact labels, trace-localized states |
| Variant families | parent x controlled transform | What controlled structural change flips behavior? | census, traces, profiles, exact labels |
| Experiment manifests | run/arm/shard | What code/data/protocol produced this result, and are arms comparable? | every decision-bearing run family |
| Raw logs/baselines | raw run/snapshot | What actually happened historically before interpretation? | reports, benchmarks, manifests |
| Research-status index | report/workstream/experiment | Has this already been tested or named differently? | reports, raw artifacts, current authorities |
| Static descriptors | level x legal descriptor | Which geometry/mechanics stratify the effect? | benchmark, census, profiles, variants |
| Failure triage | selected level/cohort | What has already been inspected and why was it selected? | lifecycle, trace, exact, family follow-up |

## The three different "fingerprints"

The repository contains three concepts that can all be called fingerprints. Do not collapse them:

1. **Structural level fingerprint** from `modules/domain/level-fingerprint.ts`: stable structure identity/deduplication and revision joins.
2. **Solution-space fingerprint/profile** from [`solver-solution-profile.md`](solver-solution-profile.md): offline known-solution behavior and diversity summaries.
3. **Solver determinism fingerprint** from `scripts/solver-fingerprint.mjs`: a fingerprint of solver execution/search behavior used for regression/determinism comparison.

A structural fingerprint answers "same puzzle structure?" A solution-space profile answers "what do known accepted paths look like?" A solver fingerprint answers "did solver behavior/search execution change?" Only the first is an identity primitive, and none is permission to perform level-specific runtime lookup.

## Asset catalogue

### `published-levels`

**What it is.** `data/levels.json` plus `data/hints/` is the shipped-level corpus and its canonical split hint sidecars. [`scripts/level-data-io.mjs`](../scripts/level-data-io.mjs) attaches bare `.hints` and canonical `.hintRecords` at read time while level JSON remains hint-free at rest.

**Useful joins.** Persistent `level.id` joins to current solver results, solution profiles, provenance, and static features. `hintPathSignature(path)` joins rediscoveries of the same accepted path. `provenance.context.levelRevision` can join to the structural fingerprint when revision identity matters.

**Research affordances.** Published levels provide an independently authored/product-relevant population, accepted-path material, and a source for solution-space profiling. They are especially useful when a stress-only finding may be generator-specific.

**Boundary.** Known paths and hints are offline labels. Published levels have also been repeatedly inspected, so they are not automatically untouched confirmation material.

### `stress-corpora`

**What it is.** [`../data/stress/README.md`](../data/stress/README.md) defines the current corpus contract:

- `data/stress/stress-levels.json`: Corpus 1, including solver-aware and solver-blind generation batches;
- `data/stress/stress-levels-random.json`: Corpus 2, the large solver-blind development/capability laboratory;
- `data/stress/stress-levels-envelope.json`: the in-envelope stratum;
- sibling `hints/`, `hints-random/`, and `hints-envelope/` sidecars;
- per-level construction witnesses and generation/authorship provenance.

**Useful joins.** Always retain corpus/source and generator/batch provenance when joining to solver outcomes. `level.id` joins to benchmark, census, hint, trace, and feature data. Construction witnesses can anchor divergence/validity diagnosis without entering the cold solver.

**Research affordances.** These corpora let an investigation distinguish puzzle difficulty from generator/source effects and compare solver-aware adversarial material, solver-blind random material, and ordinary game-envelope material.

**Boundary.** Construction witnesses prove solvability, not solver capability. Corpus 2 is heavily mined development evidence. A fresh sample from its generator can be sample-independent confirmation, but not automatically cross-generator transfer.

### `hint-provenance`

**What it is.** Every canonical hint can retain multiple independent discovery records. [`modules/domain/hint-types.ts`](../modules/domain/hint-types.ts) records three provenance axes:

- solver/configuration: solver id/version, technique, scoring profile, ordering bias, width, retention mode, gate choice, forcing overrides, attempt index;
- search: nodes, elapsed time, budget, `workSpent`, cumulative costs, termination, random seed, repair salt;
- context: whether existing hints were available/used, whether the run was isolated, and the structural level revision.

Use `npx tsx scripts/hint-query.mjs --id=<ID>` as the first human-facing query. Use `--full` only when exact path/provenance detail is needed.

**Research affordances.** Hint provenance can answer questions that the hint path alone cannot: whether solution-space diversity is source-specific, whether an apparent cold solve was hint-guided, which exact configuration rediscovered a path, whether historical same-config search cost drifted, and whether a technique association is confounded by the mechanism that generated the known solutions.

**Strong joins.** Solution-space profiles already bucket by provenance source. Benchmark results can be compared with historical same-config provenance using `workSpent`. Census response can be stratified by source-specific solution structure. `levelRevision` guards stale-structure joins.

**Boundary.** Coverage is uneven and legacy provenance may contain unknown fields. A rediscovered path can belong to several source classes. Provenance remains offline evidence and cannot become per-level runtime steering.

### `level-structure-fingerprint`

**What it is.** `modules/domain/level-fingerprint.ts` computes the canonical versioned structural identity from grid, objectives, mechanics, portals, landmarks, and related level structure while excluding hints and field insertion order. Legacy calculators exist for read/migration compatibility.

**Research affordances.** Use it to ask whether two persisted observations refer to the same level revision, to detect same-structure duplicates, and to reconnect evidence when mutable presentation fields or hint stores changed.

**Strong joins.** Hint provenance stores `context.levelRevision`. Other persisted systems may use structural fingerprint keys. It is also useful when a family/variant investigation needs to distinguish a true transformation from accidental duplicate structure.

**Boundary.** It is an identity primitive, not a legal nearest-neighbor production feature. Do not compare historical raw fingerprint strings without respecting fingerprint version ownership.

### `solution-space-profiles`

**What it is.** [`solver-solution-profile.md`](solver-solution-profile.md) defines the offline profile libraries:

- `reports/stress/solution-profile-published.json`;
- `reports/stress/solution-profile-corpus1.json`.

Each level has a combined profile and provenance-source buckets containing path footprint, intersections, portal signatures, must-cross order/rigidity, objective satisfaction depths, turns, prefix diversity, pairwise distinctiveness, and discovery-saturation summaries.

**Research affordances.** This is the repo's view of **known solution-space structure**, not merely level geometry. It can test whether a stable census niche corresponds to narrow solution basins, rigid must-cross ordering, early/late objective completion, portal/turn structure, or discovery diversity.

**Strong joins.** `corpus + levelId` joins directly to census, production results, variants, and static features. Provenance buckets make it possible to ask whether the profile itself is a discovery-source artifact.

**Boundary.** Known-solution-derived data is forbidden direct production input. Saturation is not proof of completeness. A profile-selected descriptor becomes tuning/development evidence and must be translated into a simpler legal descriptor plus independent confirmation.

### `solver-determinism-fingerprints`

**What it is.** `npm run solver:fingerprint` and `npm run solver:fingerprint:compare` capture/compare solver execution fingerprints for deterministic regression analysis.

**Research affordances.** This can detect search/semantic drift that aggregate solve counts miss, and can help separate an implementation latency change from an actual search-order/behavior change.

**Strong joins.** Pair solver fingerprints with before/after benchmark outcomes and, where necessary, bounded operational traces to localize the first changed decision.

**Boundary.** Solver fingerprints are not structural puzzle fingerprints or solution profiles. Parity proves neither performance nor generalization value.

### `technique-census`

**What it is.** [`technique-census-analysis.md`](technique-census-analysis.md) currently points at `reports/stress/technique-census/33717910218/`, including the large `combined-cells.json` matrix and coverage products. Current niche/capability interpretation uses `reports/stress/technique-niches/2026-09-03/level-capability.json`.

**Research affordances.** Treat the census as a **technique-response matrix**, not merely a winner table. It exposes rare/exclusive capability, multiplicity, substitution, inversions, cap/tranche economics, and an oracle frontier. A response vector can become a cohort label for cross-evidence analysis.

**Strong joins.** The most valuable joins are often sideways:

- census x lifecycle: isolated rescuer versus actual production reach/work;
- census x solution profile: response niche versus known solution-space structure;
- census x static descriptors: response niche versus legal level features;
- census x variant families: response flips under controlled transformations;
- census x operational traces: whether two outcome-distinct techniques are also behaviorally distinct.

**Boundary.** The census is heavily mined development evidence. Isolated success does not grant production-ladder entitlement. Normalize mixed-era technique identities. Use raw nodes within techniques and `workSpent` for cross-technique allocation.

### `production-benchmarks`

**What it is.** Current and historical real-solver outcome reports, including convenience pointers such as `reports/stress/solver-corpus1-latest.json` and `reports/stress/solver-corpus2-latest.json`.

**Research affordances.** This is the eventual ground truth for product-objective research: did the real cold solver solve the level, at what comparable work, with what gains/losses and termination behavior? Offline diagnostics should eventually explain or improve this layer rather than optimize proxies indefinitely.

**Strong joins.** Benchmark results anchor census, profile, feature, provenance, variant, lifecycle, and determinism findings to current behavior.

**Boundary.** Inspect embedded commit/protocol metadata. `latest` is a convenience pointer, not independent authority. Historical results may use older budget semantics, identities, or code.

### `lifecycle-telemetry`

**What it is.** Production solver stage/action/attempt reach and work telemetry produced by the stress refresh/lifecycle machinery, including `scripts/stress/lifecycle-failure-map.mjs` and `.github/workflows/solver-stress-refresh.yml`.

**Research affordances.** Lifecycle evidence tells you **what production actually tried**. It separates:

- never reached;
- reached but received zero/negligible work;
- meaningfully attempted and exhausted/failed;
- continued across useful work tranches;
- solved by a particular action/stage.

This distinction is essential before calling something "starvation" or prescribing more budget.

**Strong joins.** Join to census capability and cap/tranche data using normalized level/action identities. Join to production outcomes to estimate the population that actually reaches a decision. Use traces only after lifecycle narrows the mechanism.

**Boundary.** Historical stage/action names require the owning normalizers. Sequence and predecessor state can confound observational joins.

### `known-solution-prefix-survival`

**What it is.** [`solver-known-solution-prefix-survival.md`](solver-known-solution-prefix-survival.md) defines the beam observer that tracks whether any generated/retained prefix still belongs to a known-valid solution family through generation, hard prune, dedup, scoring/width cull, and diversity selection.

**Research affordances.** It can distinguish "the solver never generated labelled viable material" from "it generated it and later removed it," and can name the exact extinction depth/cause for follow-up.

**Strong joins.** Pair an extinction with exact-prefix/reference labels when support permits. Use bounded traces to compare the culled material and retained competitors. Variants can test whether the same boundary recurs after a controlled transformation.

**Boundary.** Known-solution support is incomplete. Losing every known path is not proof that the remaining state is dead. Observer parity is mandatory.

### `operational-traces`

**What it is.** Bounded encountered-state evidence from `method-probe.mjs`, paired deterministic traces, beam traces, and related operational-similarity tools described in [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).

**Research affordances.** Outcome similarity and code ancestry do not tell you whether two configurations behave similarly. Operational traces can locate first divergence in legality, prune, score, ordering, dedup, retention, or branch choice.

**Strong joins.** Variants nominate close causal pairs; lifecycle shows which live production decision matters; census identifies response inversions; exact labels tell whether one side retained live material; solver fingerprints tell whether a code change altered deterministic execution.

**Boundary.** Traces are commonly bounded/censored and selected for diagnosis. No observed divergence inside the trace limit is not proof of equivalence.

### `exact-reference-labels`

**What it is.** CP-SAT/reference probes such as `scripts/stress/cpsat-reference-probe.py` can label selected levels/prefixes/states when supported and decisive. The canonical referee remains the final validity authority for emitted/pinned paths.

**Research affordances.** Exact/reference labels can turn "this path material looks promising" into a stronger question: does a feasible continuation still exist here? They are especially valuable after a known-prefix extinction, a solved/unsolved variant boundary, or a recurring trace divergence has already narrowed the state.

**Strong joins.** Known-prefix survival, operational traces, reduced instances, family boundaries, and the offline replay atlas.

**Boundary.** Timeout or unsupported mechanics are abstentions, not dead/UNSAT. Model support is incomplete. Validate witnesses against the canonical referee.

### `offline-replay-atlas`

**What it is.** [`solver-offline-replay-harness.md`](solver-offline-replay-harness.md) consumes already-labelled branch/state material under `reports/stress/` and evaluates candidate reasoners through real solver-state primitives without changing production search.

**Research affordances.** The atlas reuses expensive labels to test whether a proposed prune/descriptor/reasoner can distinguish dead/live states, adds unique catches, abstains appropriately, and fires early enough to be interesting.

**Strong joins.** Exact labels provide the labels; traces and known-prefix survival nominate which states matter; a surviving replay hypothesis can then earn a narrow live A/B.

**Boundary.** The atlas is selected research material. Good classification does not imply live solve/work value, and zero observed false rejects is not a proof outside supported coverage.

### `variant-family-data`

**What it is.** [`variant-level-research.md`](variant-level-research.md) owns the family research contract. `data/families/` on `main` retains compact evidence/fixtures, while the large roughly 2.5 GB resource remains on branch `claude/variant-levels-solver-insights-tpk4qg` under `data/families/`, `logs/family-census/`, and `reports/families/`. Mount it separately and use current code/tools.

The disposable `.cache/family-index.json` reconciles mixed-era evidence by logical `(corpus, parentId, mode, variantId)` plus normalized evidence payload rather than filename precedence.

**Research affordances.** Variants are strongest when used as controlled interventions: rotate, reflect, mutate, re-embed, alter density/mechanics, or otherwise change one family dimension and ask what solver response changes.

**Strong joins.** Census response can identify a technique-value flip; traces can locate first divergence; profiles can show whether solution-space structure changed; exact labels can bracket a local feasibility boundary; lifecycle can reveal whether production routing changed as well.

**Boundary.** Siblings are correlated. The parent family is the independent unit for broad claims. Historical outcomes require current-code revalidation before promotion. Existing data has a presumption against more bulk generation.

### `experiment-manifests`

**What it is.** `scripts/experiment-manifest-lib.mjs` and `solver:experiment-preflight` record run/arm provenance and validate comparability, including solver ref, level selection hash, flags, workflow inputs, budgets, seeds, instrumentation, and outputs. Family evaluation manifests additionally capture dataset identity, shard identity, source generation artifacts, and solver git state.

**Research affordances.** Manifests are the join spine for answering "what exactly produced this result?" They also prevent a nominal A/B from silently differing in non-treatment dimensions.

**Strong joins.** Any benchmark/lifecycle/family/raw output used for a decision should retain or recover its run identity through a manifest or equally explicit provenance.

**Boundary.** A valid manifest proves provenance/comparability, not efficacy or independence. Older artifacts may lack fields that cannot be reconstructed safely.

### `raw-logs-and-baselines`

**What it is.** [`../logs/README.md`](../logs/README.md) owns raw run evidence policy. [`../logs/artifact-metadata.json`](../logs/artifact-metadata.json) classifies important tracked exceptions as current pointers, compatibility baselines, historical snapshots, or source evidence, with generators/consumers and regeneration rules.

**Research affordances.** Raw evidence is where to go when a dated report's aggregate is insufficient, when a regression needs level/attempt attribution, or when a historical claim needs its actual source run reconstructed.

**Strong joins.** Reports and research-status index route to logs. Manifests/embedded run IDs reconnect raw artifacts to code/protocol. Baselines can be diffed against current production outputs.

**Boundary.** `logs/Solver/` is a frozen legacy attic. Do not treat `latest` as independent evidence or silently regenerate irreplaceable historical snapshots.

### `research-status-index`

**What it is.** `node scripts/research-status-index.mjs --compact --query=<term>` builds a machine-readable view of active workstreams, default-off experiment dispositions, structured dated reports, legacy reports, and linked artifacts. Queries expand historical stage/routing/attempt identities through current owning normalizers.

**Research affordances.** Use it before inventing or rerunning a premise. It can expose an older experiment under obsolete vocabulary, a concluded report whose lesson is not repeated in the queue, or the raw artifact behind a current decision.

**Strong joins.** This is a discovery layer over reports, queue/ledger state, raw artifacts, and historical naming eras.

**Boundary.** The index is a router. Read the decisive report/artifact before acting, especially for legacy evidence with weaker structured status metadata.

### `static-level-descriptors`

**What it is.** Legal puzzle descriptors from `scripts/stress/features.mjs`, feature-solvability/corpus-query tooling, and retained assets such as `data/level-heatmaps.json`.

**Research affordances.** Static descriptors help explain whether a solver-response cohort is really stratifying on geometry/mechanics/generator envelope. They are also the bridge for translating a useful offline profile/census association into a simpler level-blind feature that could eventually be tested legally in production.

**Strong joins.** Production outcomes, census response, solution profiles, stress provenance, and variants.

**Boundary.** Outcome correlation is not causal. High-dimensional descriptors can become practical identity/family proxies and require independent confirmation after feature/threshold selection.

### `failure-triage`

**What it is.** `data/stress/failure-inbox.json` plus explicitly curated population/id artifacts used to retain triage and selection context for bounded investigations.

**Research affordances.** Triage artifacts help prevent repeated rediscovery of the same failure cases and preserve why a cohort was selected. They can route a recurring class toward the cheapest next instrument: lifecycle, trace, exact label, reducer, or variant family.

**Strong joins.** Use selected `corpus + levelId` values to retrieve current benchmark/lifecycle evidence and the report that justified selection.

**Boundary.** A hand-picked cohort is selected evidence. Do not later treat it as a prevalence sample merely because it contains many rows.

## High-value join recipes

These are not mandatory experiments. They are recurring ways existing evidence can make a premise substantially more informative before new compute is purchased.

### Capability census x lifecycle telemetry

Question: **Does production lack the capability, or fail to deploy it?**

1. Start with a stable census rescuer/rare-capability cohort.
2. Join current production reach/work for the same level and normalized action/configuration.
3. Separate never-reached, zero-work, shallow/censored, exhausted, and meaningful-work failures.
4. Only then decide whether the next gate is allocation/routing or search-quality diagnosis.

This avoids calling every failed production action "starved" and avoids allocating more work to a technique that already fails deeply in isolation.

### Capability census x solution-space profiles x hint provenance

Question: **What independent property of the known solution space distinguishes a technique-response cohort?**

1. Define the response cohort from the census before inspecting profile axes where possible.
2. Join profile scalars/source buckets by `corpus + levelId`.
3. Check whether the profile distinction survives provenance-source stratification.
4. Translate any surviving association into a simpler legal static/current-state descriptor.
5. Confirm that descriptor away from discovery units before production use.

This is a natural place for hint provenance to reveal that an apparent "rigid solution space" is actually a narrow discovery-source sample.

### Capability census x variant families

Question: **Which controlled puzzle change flips action value?**

Use existing family data only after a cheaper cross-sectional join identifies a compact distinction worth causal follow-up. Analyze by parent, not sibling row count. Re-run selected historical cliffs on current code before using them as a decision-bearing result.

### Variant family x operational trace

Question: **Where does a solved/unsolved close relative first diverge?**

Align the pair through its transformation when appropriate and locate the first difference in legal successors, prune decisions, ranking/order, dedup, retention, or randomness. Then ask whether the same mechanism appears across unrelated parents.

### Known-prefix survival x exact prefix label

Question: **Did the beam kill material that was still genuinely viable?**

Known-path extinction nominates a decision depth. Exact/reference evidence can label the selected prefix/state where supported. This is much stronger than assuming every known-path extinction is a scoring failure.

### Exact labels x offline replay atlas

Question: **Can the proposed reasoner explain labelled states before it touches production search?**

Reuse existing labels first. Expand the exact atlas only when an unanswered support/independence question earns additional oracle calls.

### Production benchmark x hint provenance cost drift

Question: **Did a configuration become materially more expensive, or is the historical comparison invalid?**

Use provenance rediscoveries with matching normalized config and prefer `workSpent`. Inspect code/protocol/revision metadata before calling drift a regression.

### Production benchmark x solver determinism fingerprint

Question: **Did search semantics change, or only implementation latency?**

A benchmark regression plus a deterministic fingerprint change points toward search/semantic drift. Similar fingerprints with different wall time point toward implementation/runtime effects. Use a bounded trace when the fingerprint says "different" but not where.

### Research-status index x raw evidence

Question: **Has this already been tried under a different name?**

Search the index first, then follow the dated report to raw artifacts/manifests. This is especially important after the naming cleanup because old evidence can remain scientifically relevant while using historical stage/routing/configuration vocabulary.

## Evidence-role and leakage reminders

A useful join does not automatically make its inputs legal production features.

- Known solutions, hint provenance, historical winners/costs, family identities/outcomes, and solution profiles are offline labels.
- A level-blind production rule can still be overfit if it was selected from repeatedly mined corpus evidence.
- Variant siblings share a parent and must not become fake independent rows.
- High-dimensional fingerprints/profiles/descriptors can act as identity proxies.
- Historical stage/routing/attempt strings must normalize through current owners before aggregation.
- A selected cohort or threshold remains development evidence even when the underlying source data was originally collected independently.
- `workSpent` is the cross-technique allocation currency; raw nodes retain within-technique diagnostic meaning.

Use [`solver-level-blindness.md`](solver-level-blindness.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), and [`solver-research-operating-model.md`](solver-research-operating-model.md) for the full boundaries.

## How to add a new durable research asset

Register a new evidence family when it has repeated research value beyond one dated investigation and another agent would benefit from knowing it exists. Do **not** register every temporary output.

For a new registry entry, record:

1. a stable asset ID and human-readable name;
2. natural grain and independent-unit implications;
3. tracked/current/generated/off-main locations;
4. owning schema/methodology/tool authorities;
5. the supported query entry points;
6. reliable join keys;
7. legitimate evidence roles;
8. related asset IDs;
9. concrete research affordances;
10. caveats, leakage risks, sampling limits, and freshness constraints.

Also add or update cross-asset relationships when the useful scientific connection is not obvious from either asset alone.

The machine registry is checked by `npm run check:documentation-links`. Its validator requires unique IDs, valid related-asset/relationship references, existing tracked authorities/locations, and a matching `### \`asset-id\`` section in this document. Generated patterns and the off-main family branch are intentionally not treated as files that must exist on the current branch.

## Where this sits in the research documentation stack

Use these surfaces for different jobs:

- [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md): **what runs next**;
- [`solver-research-operating-model.md`](solver-research-operating-model.md): **how evidence earns decisions**;
- **this catalogue:** **what evidence already exists and how it can be related**;
- [`tooling-catalog.md`](tooling-catalog.md): **how to query/run it**;
- [`investigation-report-conventions.md`](investigation-report-conventions.md): **how one investigation records its result/status**;
- `reports/` and `logs/`: **dated interpretation and raw run evidence**.

The goal is not to make every agent read every dataset. The goal is to make it difficult for a useful evidence dimension to remain invisible merely because the current workstream did not already know to name it.
