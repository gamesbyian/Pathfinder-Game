# Research queryability audit 001

> **Status:** active
> **Last evidence:** 2026-09-21 — typed-edge query implementation, reverse-traversal benchmark, experiment/question source hardening, provenance diagnostics, and current neighboring PR reconciliation.
> **Decision:** treat queryability as a joint interface-and-source-shape problem. Preserve existing authorities, add a derived typed-edge read model, and use unresolved or weak edges to identify structures that deserve hardening at their source.
> **Remaining gate:** validate the current-head query substrate in CI, reconcile it with the moving retained-evidence work, then decide whether a separately structured answerability/next-evidence dimension is earned.
> **Scope:** current solver-research control plane and derived research relations; no solver behavior or scientific disposition changes.

## Why this audit exists

The research system now owns stable identities for questions, premises, measurement opportunities, assets, evidence reports, workstream gates, experiment state, promotions, research blocks, durable evidence and capability-demand rows. Existing tools query each family well and research:dossier performs a rich known-question join.

The remaining friction appears when an agent asks a cross-family or reverse-direction question. The system can often answer it, but only after the agent knows which specialist surfaces to compose.

The audit therefore uses a stricter definition of queryable:

> a stable relationship is queryable when both endpoints have explicit identities, the relationship has a type and source provenance, and the relationship can be traversed mechanically from either endpoint without prose interpretation.

Grepability and lexical discovery are useful fallbacks, not this bar.

## Current findings

### 1. The substrate is already graph-shaped

research-relations-lib.mjs exposes structured question, asset, measurement, evidence, queue, experiment, premise, durable-evidence, block and capability-demand relations. research:dossier proves that useful cross-family composition can remain derived/read-only without creating another authority.

This means a new database or duplicated registry is not currently earned.

### 2. Reverse traversal is the largest interface gap

Authored links usually point in the direction convenient for the source owner: workstream to question, report to successor, question to answered report, measurement opportunity to premise, premise to premise, bundle to question. Agents repeatedly need the reverse questions.

The first implementation therefore normalizes authored relationships into a derived typed-edge layer and supports inbound, outbound and bounded multi-hop traversal.

### 3. Source shape and query interface must be audited together

A query layer cannot honestly repair a relationship that exists only as prose. When an important edge requires lexical matching or parsing a sentence, the right long-term repair is normally to add a stable ID or ref at the owning source, not to make the query layer more magical.

The derived graph intentionally records provenance and does not manufacture semantic edges from lexical similarity.

### 4. Existing heterogeneity is manageable but visible

Several structures encode equivalent graph concepts differently:

- question-to-question relationships use named arrays such as implies, triggeredBy and constrainedBy;
- reports use structured closeout fields for question, premises, measurement opportunity, source artifacts and successors;
- workstreams use questionRef;
- durable bundles use questionId, measurementOpportunity and blockId;
- data-asset relationships use an assets member array;
- premise relations are already first-class edge records.

This is acceptable at authority boundaries. The read model should normalize it. Repeated ambiguity about the meaning of an edge, however, is a source-contract smell.

### 5. Lexical-only joins are the principal queryability debt

Known examples include experiment discovery in the question dossier and several historical or report discovery paths. These should remain labelled discovery-only until the owning artifacts have stable relationship IDs. The query layer must not silently upgrade lexical similarity into authority.

## Implementation started

This branch adds:

- scripts/research-query-lib.mjs: derived graph construction and bounded traversal;
- scripts/research-query.mjs: one agent-facing query surface for entity search, reverse lookup and multi-hop traversal;
- scripts/research-query-node-test.mjs: coverage for question, report/path and premise traversal;
- npm and documentation routing.

The graph is deliberately rebuildable from current owners. It creates no mutable truth store.

## Structural hardening rubric

As further query benchmarks expose friction, prefer source changes in this order:

1. add a missing stable endpoint ID or ref to the existing owner;
2. replace ambiguous overloaded fields with typed fields only where real consumers need the distinction;
3. preserve authored provenance for every cross-owner edge;
4. make successor, invalidation and dependency links symmetric through the derived read model, not duplicated writes;
5. keep lexical similarity as candidate discovery only;
6. avoid universal schemas for scientific semantics that legitimately differ by artifact family.

A useful test for any proposed source change is:

> Does this make an already-real scientific relationship explicit, or merely make the query engine easier to write?

Only the first is normally worth changing an authority for.

## Benchmark questions

The next audit passes should exercise concrete questions rather than adding generic machinery speculatively:

- What depends on premise P204?
- What questions would lose support if a named report were withdrawn?
- Which active questions already have retained evidence and no acquisition need for their next discriminator?
- Which evidence reports created successors that are still live?
- Which closed questions constrain active descendants?
- Which measurement opportunities are shared by multiple current questions?
- Which capability-demand rows cite evidence that no current question consumes?
- Which research blocks have been consumed by more than one question or evidence role?
- Which relationships in dossiers are still lexical-discovery-only?
- Which recent structured closeouts changed lifecycle truth without a corresponding current-authority update?
- Which research-system findings have successors but no durable owner?
- What became newly answerable after a specific asset, observer or capability was added?

The result of those benchmarks should decide whether additional work belongs in research:query, a specialist derived view, or the source authority itself.

## First benchmark pass

The initial benchmark separates into three materially different failure classes.

### Directly solved by typed traversal

These are now ordinary graph lookups rather than manual multi-tool reconstruction:

- what depends on a premise such as P204;
- which questions cite a named report as answered-by or constraint evidence;
- which evidence row owns a canonical report path;
- which closed question constrains or triggers another question;
- which queue row owns a stable question;
- which measurement opportunity, premise, durable bundle or capability-demand row attaches to a known question;
- reverse successor and source-artifact lookup from structured closeouts;
- research-block consumption question and decision links where the block already records consumption events.

The important implementation detail is that reverse traversal is derived. Authorities continue writing one relationship in their natural direction.

### Query-composition gaps, not source gaps

Several benchmark questions have adequate identities and edges but need modest filtering or aggregation:

- active versus closed neighbors;
- nodes with multiple incoming or outgoing edges of a selected type;
- shared measurement opportunities or evidence sources;
- questions with multiple authored evidence refs.

The query surface now supports type/status filtering and relation-specific minimum degree. More specialized anti-joins or answerability views should be added only when repeated real questions require them.

### Genuine source-shape debt

Other questions cannot be made authoritative merely by adding query syntax:

- opt-in experiment rows currently expose no stable question identity through the experiment relation and dossier experiment matching remains lexical-discovery-only;
- legacy evidence without structured research-question metadata cannot safely acquire a question edge from text similarity;
- any scientifically important relationship that survives only in remaining-gate prose, disposition prose or narrative report text is discoverable but not an authored edge.

These are candidates for source hardening when there is a repeated consumer. The graph diagnostics now surface queue rows and evidence rows without stable question refs and the current experiment relation's lack of stable question refs. They are diagnostics, not automatic defects: some artifacts legitimately have no single owning question.

### Source hardening already paid off

The first concrete source-hardening change added an optional stable question ref to the opt-in experiment ledger. The dossier already had a real consumer for this relationship but previously had to use lexical discovery.

Only unambiguous rows were linked:

- `STRATEGY_PORTAL_COARSE_STATE_MERGE` -> `WS2-PORTAL-COARSE-GLOBAL-MERGE`;
- `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY` -> `WS2-MUST-TURN-LATE-ADDITIVE`;
- `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT` -> `WS2-ADMISSIBLE-ORDER-RETRY-REPRICING`.

The third link is not name matching: the experiment disposition explicitly says the seam exists to make the deferred `1.0 -> 0.18` repricing experiment valid, and it cites the exact methodology report already owned by that question.

That second edge immediately exposed stale control-plane truth: the question had already closed negative after the September 16 promotion-economics A/B, while the opt-in ledger still described the experiment as open and awaiting that test. The ledger is now reconciled to closed-negative and the query diagnostics flag any future open experiment whose stable owning question is terminal.

This is the intended feedback loop:

> make a real relationship explicit -> traverse it -> discover contradictory state -> repair the owning authority -> add the smallest guard against recurrence.

The same pass also hardened generic research Markdown-table parsing so inline-code identities containing `|` are not silently split into extra columns and truncated in derived status views.

### Live-question routing is unevenly structured

A registry pass over active, mixed and deferred questions found that several current questions still lack an explicit `acquisitionNeed`. That is not automatically a scientific defect: active/mixed questions may legitimately rely on fallback inference. It does mean acquisition preflight is using lexical inference from question/result/reopen prose rather than an authored acquisition field, so the query surface should expose that provenance difference.

The query graph now exposes `acquisitionNeedLexicalFallbackQuestions` as shape debt rather than guessing a population-acquisition route.

This matters for acquisition queries, but it is not sufficient for answerability queries. A future “what can advance from retained evidence?” view needs a distinct authored answerability/next-evidence classification or must abstain; it must not silently treat `acquisitionNeed` as that classification.

### Answerability and acquisition are different dimensions

PR #1969 independently demonstrated the retained-evidence route on `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`: the retained production-boundary analysis is already complete and narrowed the question to a frozen rule needing sample-independent confirmation.

That exposed a useful contract distinction. `acquisitionNeed` is not a universal next-evidence-state field. It primarily classifies what kind of **level/population acquisition** is required when acquisition is needed; for example, `telemetry-or-economics` maps deliberately to `NO_LEVEL_GENERATION`. The same value can remain correct across different scientific gates.

Therefore a future answerability view must not reinterpret `acquisitionNeed` as `answered | existing-data | instrument-only | bounded-compute | blocked`. The latter classification already exists in the intake method, but has no durable machine owner after promotion.

The likely structural seam is the current workstream gate, because workstreams own execution state and next gate. However, several immediate gates are implementation/design steps rather than evidence acquisition, and the moving WS1 work is changing the exact gate now. Do not add a new workstream enum until the benchmark defines how non-evidence gates are represented without guessing.

A question moved to `deferred-reopen`, by contrast, **does** still need the registry-required `acquisitionNeed` because that is an existing question-contract invariant.

### Research-system questions remain a separate case

research:system-inventory already owns architecture/lifecycle findings, many of which are derived observations rather than durable scientific entities. They should not be forced into the solver-science graph merely for uniformity. If repeated research-system findings acquire stable IDs and successor relationships, those can be exposed later through an adapter. Until then, the inventory remains the better query surface for that domain.

## Non-goals

- no SQL or graph database;
- no natural-language inference promoted to machine authority;
- no duplicate queue, question or evidence registry;
- no attempt to infer freshness, admissibility, causality or confidence merely because two nodes are connected;
- no solver compute.

## Immediate next gates

1. validate the typed-edge query surface against CI and keep unresolved authored references at zero;
2. continue the benchmark with anti-join and answerability questions before adding broader operators;
3. harden only the source relationships that have repeated real consumers, beginning with stable experiment/question ownership if a real consumer needs it;
4. decide whether a higher-level composed answerability view is earned from the benchmark rather than adding generic query syntax preemptively.
