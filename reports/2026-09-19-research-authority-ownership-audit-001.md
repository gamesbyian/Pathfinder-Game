# Research authority-ownership audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — Authority reconstruction was traced through the live workstream queue, question registry, report status index, claim semantics, runtime default-polarity contracts, and production-shaped regressions.
> **Decision:** keep execution priority, scientific-question lifecycle, report-local disposition, evidence applicability, claim validity, and runtime polarity as distinct authorities; make their joins explicit instead of creating a new research-state registry.
> **Remaining gate:** reopen only if another repeated authority ambiguity cannot be resolved by an existing owner plus an explicit relation.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"preserve distinct authority owners and make their joins explicit; do not add a research-state registry","remainingGate":"reopen only on another repeated unresolved authority ambiguity","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"targeted current research-authority ownership audit","inferenceScope":"research control-plane authority ownership; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-operating-model.md","docs/solver-optimization-workstreams.md","docs/solver-research-question-relations.json","scripts/research-status-index-lib.mjs","scripts/research-system-inventory-lib.mjs","scripts/research-integration-audit-lib.mjs","modules/solver/ablation-default-polarity.test.ts","modules/solver/production-default-equivalence.test.ts"],"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

> **Question:** where is Pathfinder still reconstructing scientific state or authority from several otherwise-valid artifacts, and where does that reconstruction indicate missing ownership rather than useful connective tissue?

## Bottom line

The post-consolidation research system does **not** currently need a general `ResearchGate`, `ResearchStudy`, or research-state registry.

The stronger problem was narrower:

1. some downstream tools were still reconstructing report-local scientific disposition from human-readable Markdown even after a structured closeout owner existed;
2. execution state and scientific-question lifecycle are distinct authorities, but their relationship was implicit enough that an active workstream pointing at a `deferred-reopen` question could look contradictory;
3. production realization initially looked weaker than the upstream lifecycle, but a deeper pass found substantial existing conformance machinery.

The first two are repaired in this follow-up. The third turned out to need only a narrow provenance edge, not a new realization subsystem; the promoted/default-ON ledger now carries a primary decision-evidence ref where the retained record supports one.

## Authority partition

### Execution priority and next work

**Owner:** `docs/solver-optimization-workstreams.md`

It answers:

- what workstream is live;
- what the next execution gate is;
- what stable scientific question, if any, the gate services.

It does **not** own the scientific lifecycle state of that question.

### Scientific-question lifecycle

**Owner:** `docs/solver-research-question-relations.json`

It answers:

- whether a scientific question is active, concluded, closed in a tested form, mixed, or deferred for reopen;
- what evidence answered it;
- what relations it has to predecessors/successors;
- what event can reopen it.

A live workstream may legitimately service a `deferred-reopen` question when the current execution obligation is to satisfy that question's reopen trigger.

That is the current WS2 shape:

- execution state: active;
- question: `WS2-FAILURE-RESPONSE-RECONNAISSANCE`;
- question lifecycle: `deferred-reopen`;
- execution/question relation: `reopen-trigger-gate`.

This is not contradictory state. It is two orthogonal facts.

The derived inventory now exposes that relation explicitly. The integration audit rejects live workstreams that reference unknown or terminal questions.

### Report-local scientific disposition

**Owner for new reports:** the `pathfinder.research-closeout/v1` capsule produced by `scripts/investigation-report-metadata.mjs`.

The human-readable report status block remains a presentation mirror and legacy compatibility surface.

Before this follow-up, `research-status-index` still reconstructed status, evidence date, decision and remaining gate from Markdown regexes even when a structured closeout existed. That made the old connective tissue behave like a second authority.

The status index now:

- prefers the structured closeout capsule;
- uses the old status block only for reports without a capsule;
- includes structured source-artifact references;
- requires canonical mirrored fields such as status/date and stable IDs to agree when both forms carry them;
- treats human decision/gate prose as presentation only once a capsule exists, so a fuller paraphrase does not become a second machine authority.

This removes a real parallel-authority seam without introducing a new registry.

### Evidence applicability

**Owner:** the evidence-family classifier for a stated research purpose, using the shared applicability lattice.

There is intentionally no single persisted global “current applicability” flag. Applicability is query- and regime-dependent.

This is correctly distributed semantics, not missing authority.

### Claim validity and invalidation

**Owner:** the claim capsule plus its explicit derivation dependencies.

Reports may summarize claims, but they do not independently own whether a claim remains valid after a material dependency changes.

The shared claim primitive now carries identity, material dependency edges and bounded reverse invalidation.

### Production default polarity

**Owner:** runtime code, especially `OPT_IN_FEATURES` and the feature read sites.

The opt-in ledger owns promotion disposition for retained default-OFF experiments, not runtime polarity. Documentation checks already require current default-OFF switches to appear in that ledger.

This separation is correct.

## Production realization: existing organ, narrower provenance gap

A deeper pass found that production realization is already protected by several independent mechanisms:

- `ablation-default-polarity.test.ts` checks explicit feature prose against `OPT_IN_FEATURES` and verifies `defaultConfig()` agrees with normalized defaults;
- `production-default-equivalence.test.ts` proves that ordinary no-ablation/null-config invocation and an empty explicit config produce identical routing/scheduling/allocation defaults across representative paths;
- documentation validation requires every current default-OFF flag to have a disposition in the opt-in ledger;
- the Class-4 portal coarse-state dead-last retry additionally has a production-shaped participation test because that promotion exposed a real read-site/default-path hazard.

That is already a meaningful production-realization organ. A new `ChangeRealization` registry/object would currently duplicate working code/test authority.

The weaker seam is narrower:

`scientific claim / promotion decision -> specific implementation change and regression proof`.

That linkage is now partially machine-readable without creating a new realization registry:

- the promoted/default-ON ledger has a `Decision evidence ref` column;
- the research status/relations model exposes promoted mechanisms and their primary decision-evidence ref;
- documentation validation checks that listed promoted mechanisms are live feature keys, are not still in `OPT_IN_FEATURES`, and that any claimed decision report exists;
- historical rows with no defensible retained primary report remain explicitly unlinked rather than guessed.

The runtime realization itself still belongs to code/tests. This new edge answers only the narrower provenance question: which retained research decision licensed a listed production default?

### Trigger for further structure

Do **not** create a production-realization registry now.

Revisit only if a later consumer also needs implementation-target identity, qualification/invalidation state, or supersession history across multiple promotions.

## What this says about the original “connective tissue versus bones/organs” question

The useful distinction is now:

- **derived join/view:** connective tissue;
- **translation between genuinely different contracts:** adapter connective tissue;
- **same scientific invariant repeatedly reconstructed:** missing bone;
- **same lifecycle state reconstructed from multiple artifacts:** likely missing owner/organ;
- **different authorities describing orthogonal facts:** keep both, but make the relationship explicit.

The original consolidation effort therefore did not leave Pathfinder with an organless research framework wrapped in glue.

It left a mature collection of specialist research organs with:

- several shared scientific bones that needed extraction;
- one report-state owner that existed but was not fully respected;
- an execution/question relationship that needed explicit semantics;
- a narrower, still-conditional provenance seam between promotion decisions and their implementation/regression proofs.

The next architectural work should be triggered by another demonstrated ownership ambiguity or repeated invariant, not by an attempt to complete a theoretical ontology.
