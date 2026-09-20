# Research prose-authority audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — Current research authorities, derived indexes, lifecycle inventories, question registry, future-work surfaces, production-default contracts, and report closeouts were reviewed specifically for facts whose operational meaning exists only in prose.
> **Decision:** structure prose when software or multiple authorities depend on its categorical meaning; keep genuinely open-ended scientific predicates and explanatory rationale as prose until a real machine consumer earns a stronger contract.
> **Remaining gate:** repeat this audit when a new parser infers control-plane state from free text, or when two consumers independently need the same prose predicate in machine form.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-19","decision":"convert prose to structure only when categorical operational meaning already has a machine or multi-authority consumer","remainingGate":"repeat on any new prose-to-control-state parser or repeated machine consumer of the same prose predicate","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"targeted current research-system prose-authority audit","inferenceScope":"research control-plane and scientific metadata representation; not solver-efficacy evidence"},"claimRefs":[],"sourceArtifacts":["scripts/research-status-index-lib.mjs","scripts/research-system-inventory-lib.mjs","docs/solver-opt-in-experiment-ledger.md","docs/solver-research-question-relations.json","docs/solver-future-work.md","docs/solver-workflow-lifecycle.json","docs/solver-research-data-assets.json","reports/2026-09-19-research-authority-ownership-audit-001.md"],"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

## Lens

"Only recorded in prose" is not automatically a defect.

The decisive question is:

> **Does any machine, join, authority boundary, or repeated workflow need the categorical meaning of this prose to be stable?**

If yes, prose is carrying hidden machine state and should usually be given an explicit enum, ID, relation, or structured capsule.

If no, prose may be the correct representation.

## Findings

### 1. Opt-in promotion state — real prose-authority defect, fixed

The default-OFF experiment ledger owns whether a retained mechanism still has an open promotion decision.

Before this audit, the ledger had only a rich `Disposition / reopen condition` prose column. `research-status-index` inferred lifecycle state with keyword matching:

- text containing "closed" or "negative" -> rejected;
- text containing "active" or "promotion gate" -> active;
- otherwise -> pending.

That already collapsed materially different states:

- `OPEN, DEFAULT-OFF INTEGRATION PROVEN` fell through to `pending`;
- `RETAINED, NO CURRENT PROMOTION GATE` also fell through to `pending`;
- an architecture prerequisite that is explicitly "not itself a promotion candidate" also fell through to `pending`.

The ledger now carries an explicit `Promotion state` column with:

- `closed`;
- `open`;
- `no-current-gate`;
- `not-promotion-candidate`.

The rich disposition prose remains. Software consumes the explicit state.

This is the canonical example of prose that should become structure.

### 2. Report-local disposition — same defect, already fixed in the authority pass

New reports already had a structured `pathfinder.research-closeout/v1` owner, but `research-status-index` continued to parse the visible Markdown status block.

That has been corrected:

- the capsule owns machine status/decision/gate;
- visible prose is presentation and legacy compatibility;
- stable mirrored categorical fields are checked for disagreement;
- richer human paraphrases are allowed without becoming a second authority.

### 3. Workstream state — structured enough today

The live workstream authority uses a dedicated table column for state and another for the stable scientific-question reference.

Its state text is human-readable, but the fact is not hidden inside narrative prose.

The derived index still normalizes display variants for convenience. That is acceptable because:

- the workstream document itself is the explicit owner;
- the state is isolated in a dedicated field;
- stable question identity is separate;
- no parser is trying to infer the state from an arbitrary paragraph.

If machine scheduling ever requires a stricter state algebra, add an explicit workstream state token then. Do not create one merely to make Markdown look more database-like.

### 4. Question lifecycle — properly structured

`docs/solver-research-question-relations.json` already gives each question:

- stable ID;
- owner;
- state;
- typed question-to-question relations;
- evidence refs;
- premise/MO refs where relevant.

The scientific result, constraints, and reopen condition are still prose. That is mostly correct.

### 5. `reopensOn` — prose, but not yet a defect

Eight current questions are `deferred-reopen`. Their reopen predicates include materially different scientific conditions:

- a maintained producer emits a compatible population;
- an independent shared-budget population reproduces a signal;
- a production-derived frontier can be converted into a fair candidate;
- exact-labelled evidence nominates an interior commitment;
- a frozen prospective canary/probe clears.

A universal trigger enum would currently encode these badly.

No automation presently decides that a `reopensOn` predicate has become true. The workstream authority makes that decision explicitly.

Therefore:

- keep `reopensOn` as prose;
- keep stable artifact/question/MO refs structured around it;
- structure a trigger only when a real consumer needs to evaluate or join it mechanically.

### 6. Future-work reopen conditions — intentionally prose

`solver-future-work.md` is a human planning surface, not the live queue.

Its reopen predicates are often hypothesis-shaped rather than event-shaped. Converting them to a trigger registry would create false precision.

Stable current questions that need machine joins already live in the question registry.

Future-work prose should remain prose unless a deferred item graduates into a stable tracked question or machine consumer.

### 7. Plan/preflight/handoff lifecycle — soft prose metadata, acceptable but watch-listed

The inventory currently reads `> **Status:** ...` and maps phrases such as "completed", "blocked", "active", "implementation", or "deferred" into broad lifecycle classes.

This is heuristic prose interpretation.

However, it is currently used only for:

- derived inventory/front-door diagnostics;
- identifying stale current references;
- documentation hygiene.

It does not authorize execution or scientific conclusions.

Therefore it is a **watch-list smell**, not an earned schema migration.

Trigger for structure: if plan lifecycle starts driving queue admission, automation, archival mutation, or another decision-bearing consumer, add an explicit lifecycle enum rather than extending the keyword parser.

### 8. Documentation "current authority" claims — derived diagnostic only

The inventory notices status lines containing phrases such as "canonical", "current authority", or "live authority" and compares them with the docs index.

That is intentionally a hostile diagnostic for contradictory prose claims, not a source of authority.

The docs index owns current-reference membership. No migration is needed.

### 9. Production default polarity — prose is only a mirror

Feature descriptions contain "Production default-ON/OFF", but runtime truth is `OPT_IN_FEATURES` / default configuration and read-site behavior.

Tests already verify:

- prose polarity agrees with runtime registry where declared;
- empty and null production configurations are behaviorally equivalent.

This is the healthy pattern: prose explains machine truth and is mechanically checked.

### 10. Workflow retirement triggers — prose is appropriate

`solver-workflow-lifecycle.json` structurally owns workflow identity, role, and maintained/retired status.

`retirementTrigger` is prose because it describes a future contextual judgment. No machine currently retires workflows automatically from that sentence.

Keep it prose.

### 11. Data-asset affordances/caveats — prose is the payload

The asset registry structurally owns identity, status, grain, locations, authorities, query entry points, join keys, evidence roles, and relationships.

Affordances and caveats are scientific interpretation. Their purpose is to preserve nuance that should not be reduced to a flag matrix.

Keep them prose unless a specific caveat becomes a repeated enforcement rule with a real consumer.

## Standing rule

Use this order when encountering a prose-only fact:

1. **Is the prose itself the scientific reasoning or open-ended predicate?** Keep it prose.
2. **Is there already a structured owner and the prose merely mirrors it?** Make consumers use the owner; validate the mirror if useful.
3. **Is software classifying arbitrary prose into operational categories?** Add an explicit structured category and stop parsing rhetoric.
4. **Do multiple systems independently need the same exact predicate?** Extract the smallest shared field/relation that preserves its meaning.
5. **Would structure merely make an elegant ontology with no consumer?** Do not build it.

The goal is not to eliminate prose. It is to stop prose from accidentally becoming an undocumented API.
