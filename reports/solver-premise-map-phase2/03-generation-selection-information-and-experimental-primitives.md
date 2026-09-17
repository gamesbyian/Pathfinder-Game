# Phase 2 synthesis: generation versus selection, information value, and missing primitives

Date: 2026-09-17
Phase: 2 only

## S2-C09 — many selector questions presuppose that the useful future was generated

**Phase-1 origins:** M2 P024/P135; M6 generate->retain; M10 derive->generate, generate->reject, prefer->retain; P020, P024, P114, P135, P190, P191, P195.

**Argument.** A selector can only rescue a continuation that exists in its candidate/action set. Phase 1 repeatedly separates source absence from later loss, while the independent function view makes `derive -> generate -> reject -> prefer -> retain` explicit. This creates a recurrent confound: an apparent ranking/retention failure can actually be a generation-grammar failure, and a positive derived fact can be stranded if it never changes the successor grammar.

**Competing interpretations.** Existing candidate generation is broad enough that most current residual failures are later-stage selection/work problems. Alternatively, broad raw coverage can coexist with missing structured macro-actions or revisable operations, so candidate presence at one granularity does not settle generation adequacy.

**Discriminator.** On a bounded exact-labelled failure population, classify first irreversible loss as `needed continuation never generated` versus `generated then lost/deprioritized` at the decision granularity of the proposed consumer. This requires witness-relative lineage, not only final trace absence.

**Smallest primitive.** A candidate-source census that records generation provenance/family for accepted and near-miss continuations, joined to first-loss evidence. No new generator is justified before this distinction is measured.

**If true.** Some selector work should be reinterpreted as grammar/action-space work. If false, generation can be deprioritized for that population and attention shifts to retention/allocation.

**Confidence:** high as a diagnostic distinction; unknown prevalence.

**Type:** relation/scope insight, potentially a candidate premise only after population evidence.

## S2-C10 — derived facts need an explicit path to either evaluation or generation

**Origins:** M6 derive->transfer; M10 encode->derive and derive->generate; M7 positive knowledge; P155, P162, P164, P189, P193, P195.

A derived fact can affect search in at least three semantically different ways: reject/evaluate an existing candidate, generate a new candidate/action, or modify retained state for later decisions. Current premise structure contains all three neighborhoods but does not consistently state which consumer class a derivation is intended to serve.

**Rival readings.** This may be pure graph-documentation debt because solver state already exposes derivations implicitly. Or it may explain why exact/offline observers repeatedly produce interesting facts that have no smallest consumer.

**Discriminator.** For each bounded positive observer in the current queue, state one exact consumer class and verify whether the current architecture can access the required fact at that decision point without recomputation or semantic weakening.

**Smallest primitive.** A producer-consumer capability table, initially documentation/tooling only.

**Confidence:** medium-high.

**Type:** interface/ontology issue.

## S2-C11 — missing primitive: cheapest-consumer economics envelope

Current reports repeatedly stop at `consumer/economics untested`. That phrase hides several distinct quantities: invocation prevalence, per-invocation cost, disagreement rate with current policy, maximum downstream work displaceable, correctness authority, and complementarity under the fixed total-work envelope.

**Proposed discriminating record, not an implementation:**

- population and independent unit;
- eligible decision points;
- signal production cost distribution;
- current decision/action;
- hypothetical consumer decision/action;
- disagreement count;
- downstream work available to displace;
- soundness/abstention conditions;
- retained-set churn if relevant;
- matched-work upper/lower bound before live prototype.

This can often be filled from retained traces plus a bounded observer. Where feedback invalidates replay, the record should say so and escalate to a live prototype rather than pretending an offline estimate is causal.

**Candidate type:** missing experimental primitive. Confidence high that the record would sharpen gates; medium that reusable tooling is economical.

## S2-C12 — missing primitive: decision-state and consumer census

Phase 1 names many potentially decision-bearing facts but no exhaustive current-architecture inventory of where they could legally enter. A minimal census should enumerate existing boundaries such as generation, pruning, ranking, beam/retention insertion, routing, stage allocation, stop/continue, repair/revision, validation, and handoff. For each, record available state, authority, lifetime, total-work accounting, and whether counterfactual replay is possible.

This is deliberately architecture-epoch-specific. It should not be promoted into a timeless premise-map axis.

**Discriminator.** If most orphan positives map cleanly to an existing decision point and all needed state is already present, the `missing interface/state` synthesis weakens and the blocker is local economics. If many cannot be mapped without new state or authority, the synthesis strengthens.

**Type:** missing experimental primitive / architecture audit.

## S2-C13 — information-valued actions require explicit accounting for knowledge that outlives the action

P185/P186/P200 and M1.6 separate action abandonment from artifact abandonment. A probe can be a bad continuing action yet still produce a frontier, causal fact, calibration update, or proof worth carrying forward. This means action value and artifact value have different half-lives.

**Rival interpretations:** carrying artifacts may create enough memory/work/staleness cost that discard-on-stop is optimal; or ordinary search state already preserves the only useful artifacts.

**Discriminator.** For one action family with retained traces, measure whether an artifact from an abandoned attempt predicts or changes a later decision under current-input legality. Charge storage/lookup cost and require a concrete consumer.

**Smallest primitive.** Artifact lifecycle telemetry: produced-at, last-used-at, consumer, invalidation condition, work cost, and whether it changed a decision.

**If true.** Stopping policies should distinguish `stop spending` from `discard knowledge`. If false, simpler stage-local lifetimes remain justified.

**Confidence:** medium.

**Type:** candidate-new-premise / lifecycle interface issue.

## Guard against generated-candidate versus selector confusion

Phase 2 does not infer that current failures are primarily generation failures or primarily selector failures. The point is methodological: any claimed selector limitation should first establish candidate availability at the same semantic granularity, and any proposed generator extension should establish that downstream selection/retention would not erase its output. The two loci form a coupled test contract, not a default diagnosis.
