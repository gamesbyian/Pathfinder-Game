<!-- agent-context-budget: warn=9000 max=12000 -->
# Research infrastructure composition integration 001

> **Status:** implementation complete; no solver-priority or scientific-disposition change.
> **Last evidence:** 2026-09-17 — current main after PRs #1874-#1876 plus this integration branch; active premise snapshot declares 148 propositions / 184 relations.
> **Decision:** compose the recently added research-support systems through derived read-only joins and append-only lineage facts rather than a warehouse, automatic planner, global freshness flag, or new priority authority.
> **Remaining gate:** normal repository validation and merge; the population/family plan's Phase 6 still requires two materially different live-question pilots and is not satisfied by infrastructure integration alone.
> **Evidence role:** research-infrastructure implementation / contract hardening.

## Why this tranche exists

Recent work independently strengthened question tracking, premise mapping, measurement opportunities, research-resource semantics, frozen populations, family/frontier lineage, acquisition routing, full-level generation, experiment contracts, and durable evidence. The interaction audit found that the dominant remaining risk was not missing primitives but semantic facts being difficult to join or silently dropped when moving between layers.

PRs #1874-#1876 first repaired the immediate defects: the stranded research-generation integration reached `main`, question/MO experiment metadata gained canonical referential integrity, and question/block lineage now survives schema-v3 publication and durable evidence retention.

This tranche addresses the remaining high-value composition seams without changing scientific authority.

## Implemented composition

### Question-first read-only dossier

`research:dossier -- --question-id=<id>` derives one compact view from existing owners:

- stable question state and material question relations;
- current queue/evidence/experiment discovery matches;
- authoritative report/path refs already carried by the question record;
- known frozen blocks, question-specific mechanical eligibility, and durable decision-bearing evidence;
- explicit premise/MO context when structured refs exist;
- lexical premise candidates only as clearly marked discovery hints;
- candidate research assets with audit-grade Resource Contract signals when available;
- conservative acquisition route plus generation-source guidance.

The dossier declares itself `derived-read-only`. It cannot set priority, question state, evidence role, premise admission, or production behavior.

### Full active premise-map query surface

The active snapshot now drives `premises` and `premiseEdges` relations. The loader follows the snapshot's declared canonical premise/relation files rather than hard-coding a second premise inventory. The integration audit checks the snapshot's declared 148/184 counts and premise-like edge endpoints.

### Block and durable-evidence discovery

`research:relations -- --discover` and question acquisition/dossier flows can discover:

- research blocks under bounded research-owned temporary roots used by the current generators/population workflows;
- retained decision-bearing experiment manifests and durable `bundle.json` summaries.

This is an ephemeral read-time census, not a persistent block registry. Explicit `--artifact` inputs remain supported for material outside the conventional roots.

### Resource-aware acquisition without automatic entitlement

Acquisition preflight still returns exactly one conservative route and never launches generation. Candidate assets now carry audit-grade Resource Contract facts where those contracts actually exist: independent unit, selection conditioning, admissible purposes, dependence, missingness, freshness/revision requirements, known information loss, and prospective producer fixes.

Generator guidance reuses the existing generation-method registry. Fresh same-source acquisition nominates solver-blind random witness-first material; cross-construction transfer nominates the existing random+topology transfer pair; family/human routes point to their existing owners. These are source-capability hints, not evidence-role authorization.

### Selection / consumption lineage

`research:record-consumption` writes a sidecar carrying the source block plus append-only consumption events. It can record arbitrary named conditioning/scopes or consume a `research-cross-source-matched-selection` artifact directly, deriving the selected parent scopes and recording outcome-blind static-descriptor matching.

The source block remains unchanged. Semantic question ancestry is not treated as evidence-exposure ancestry.

### Cross-system audit

`research:integration-audit` is part of `check:validators`. It mechanically checks:

- question-registry structured references;
- active premise snapshot counts and premise-edge endpoints;
- MO governing/mapped premise references;
- optional question premise/MO references;
- research-asset relationship endpoints and Resource Contract audit asset IDs;
- generator suite method/role references and the cross-construction transfer-pair invariant;
- discovered block question IDs;
- durable bundle/manifest question and block summary parity;
- the dossier's explicit non-authoritative boundary.

It warns rather than fails when a durable experiment question differs from its source-block question, because descendant reuse can be legitimate if evidence ancestry is explicit.

## Boundaries preserved

This work intentionally does **not** add:

- a database, master evidence object, or persistent global block index;
- automatic question ranking, reopen decisions, generation, or solver treatments;
- a global fresh/spent evidence flag;
- inferred evidence contamination from semantic `triggeredBy`/question relations;
- automatic premise admission from lexical dossier matches;
- evidence entitlement merely because a source is named confirmation/transfer by a generation suite.

The next scientific gate remains whatever `solver-optimization-workstreams.md` owns. D1 can naturally exercise the observation/exact/lineage path, while the two Phase-6 population/family pilots remain separately gated by live questions.
