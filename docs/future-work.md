# Solver future work

This file is the compact index for solver ideas that are **not** the current ranked optimization queue.

Use the repository's research surfaces by role:

| Question | Authority |
|---|---|
| What solver work should be done next? | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Does a retained/default-off mechanism still need a promotion decision? | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| How should solver research be designed and promoted? | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| How can the large family/variant dataset help? | [`variant-level-research.md`](variant-level-research.md) |
| What did a specific experiment actually measure? | [`../reports/README.md`](../reports/README.md) and the dated report |
| What did this file previously contain? | [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md) |

The former long-form future-work ledger mixed current priorities, dated run summaries, completed experiments, and speculative descendants. That history is preserved in the snapshot above. Do not reconstruct today's queue from it.

## Broader deferred opportunities

These are idea families, not ranked work. Before implementing one, check current code, the optimization queue, the opt-in ledger, reports, and [`tooling-catalog.md`](tooling-catalog.md) to make sure the capability or experiment has not already been built or concluded.

### Queryable research evidence

Pathfinder repeatedly joins level structure, run identity, attempt telemetry, hints/provenance, family relationships, oracle labels, and experiment arms. A derived analytical layer could become useful when repeated joins are still forcing new one-off scripts.

The valuable part is the **comparability contract**, not a database product. Reuse `scripts/experiment-manifest-lib.mjs` for run identity, keep existing JSON/JSONL as canonical where appropriate, reject incomparable runs rather than averaging them, and keep analytical data strictly offline from production solver policy. Build this only when it replaces recurring analysis work.

### Cross-technique cooperation

Different techniques produce potentially useful information and have different measured sensitivities. The open form is a named **producer -> receptor** hypothesis, not a universal blackboard.

A handoff is worth a live experiment only when:

- the receptor has a measured failure mode;
- the producer emits information the receptor does not already have cheaply;
- the information arrives early enough to matter;
- replay/consumption cost is bounded;
- the recipient's normal independent search remains protected;
- shadow evidence survives before behavior changes;
- the final verdict is level-blind and matched-work.

See [`solver-research-operating-model.md`](solver-research-operating-model.md#producer--receptor-cooperation) for the current method. The full 2026 design record is preserved at [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

### Broader scaling research

Controlled variants can test scaling with navigable area, required length, intersection pressure, mechanic density, portal load, and related structural variables. Existing exact-length work lives in [`req-length-sweep.md`](req-length-sweep.md); the family/variant dataset and experimental cautions are in [`variant-level-research.md`](variant-level-research.md).

Do not treat tens of thousands of siblings as independent observations. Parent families are the statistical units.

### Recipe cousins and new generated families

Recipe cousins remain a weaker, population-level form of family research. They become useful when a finding from exact-witness siblings needs transfer testing across newly generated witnesses with controlled feature recipes. They should not be mixed with counterfactual sibling-effect estimates.

Do not generate another large trove merely because the machinery exists. The existing off-main research trove should be queried first.

### AI/manual accepted-path diagnosis

A human or AI can occasionally provide a valid path the production solver did not find. The useful research object is the **accepted path**, not the narrator's explanation of why it worked.

Validate the path through the canonical referee, record provenance honestly, then compare its trajectory with what the unchanged solver generated, ranked, pruned, or lost. Repeated divergence patterns may nominate a generic heuristic/representation experiment. See [`solver-research-operating-model.md`](solver-research-operating-model.md#accepted-path-differential-diagnosis).

### Learned or fitted routing

A classifier or fitted routing rule is only interesting after the repository has a stable target and enough family-balanced evidence. Split by parent family, preserve level-blindness, and compare against simpler mechanics-conditioned rules and the current production ladder at matched work.

Do not train on sibling rows and randomly split them across train/test; that is family leakage.

### Deferred architecture/search measurements from the 2026 solver-aware campaign

The original campaign is archived at [`archive/snapshots/solver-aware-game-architecture-2026-08-20.md`](archive/snapshots/solver-aware-game-architecture-2026-08-20.md). Its completed items should not remain mixed with these genuinely deferred descendants.

- **Contrastive failure-directed activity:** would require new per-branch sibling-outcome telemetry during search. Do not build it until a current representation/retention question needs that signal.
- **Hazard-based adaptive capping / participation floors:** specialist starvation has historical precedent, but a general survival model needs censored per-attempt hazard telemetry. Reconcile with the current technique-census/routing evidence before treating this as useful.
- **Multi-abstraction CEGAR:** the labelled atlas exists, but a refinement loop is a substantial standalone research machine rather than a small probe.
- **Detour-gadget discovery / slack allocation:** a relatively cheap first test is to mine existing stored solutions for interface-equivalent subpaths with different length/intersection deltas.
- **Interface-preserving repair surgery:** gated on causal-window evidence in addition to the residual-interface work already measured. Do not build the live operator first.
- **Partial-order / commuting-segment analysis:** another cheap-first mining candidate over stored solutions before any search integration.
- **Eulerian/local-transition relaxation:** a smallest E0 relaxation can be evaluated as a bounded offline/shadow check before a larger ladder is considered.
- **Topology-signature diversity:** diagnostics first; measure whether the proposed signature separates useful frontier modes before adding selection machinery.
- **Topology-first skeleton compilation / automatic rule synthesis:** moonshots. Keep deferred until their prerequisite abstraction/counterexample/proof machinery exists and there is evidence the cost is justified.
- **Shared compiled puzzle graph:** reopen only when a concrete new consumer removes duplicated semantics without weakening the intentionally independent oracle. See [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md).

These items are intentionally unranked. A current queue entry, new census result, family boundary, or exact/shadow label may make one newly relevant; otherwise do not interpret age as priority.

## Reopen rules for closed ideas

A closed result is not a ban on descendants. It is a boundary on repeating the same mechanism.

Reopen only when at least one of these is true:

- the mechanism materially changes;
- the information available to the decision changes;
- the receptor/search operator changes;
- new evidence falsifies the reason it was closed;
- a former cost can now be avoided rather than merely paid with more budget.

Do not reopen an unchanged negative by changing only a small constant, sample, or workflow wrapper unless the earlier result explicitly left that parameter as the unresolved gate.

## Closed forms that should not be rediscovered as fresh ideas

The current queue owns the definitive short list. At this reconciliation, repeatedly closed forms include universal beam widening, unconditional must-cross attraction, broad cold-start portfolio scheduling, plain extra repair budget for plateaued repair, static repair-fallback reserve, blind late-tier carve-outs, repair plateau penalties, soft recombination, exact relinking, repair turn bias, admissible-order LDS, and the rejected admissible-order density/profile reserve forms.

Also closed/deprioritized from the solver-aware architecture campaign: general fully-sound DFS/beam transposition caching in the measured form, exact whole-level symmetry canonicalization as a meaningful stress-corpus lever, static forced-sequence macros on the measured level populations, and the three narrow Tier-2 hard-prune/shadow reasoners already scored at atlas scale.

For retained code switches, consult [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) rather than inferring status from the presence of an ablation flag.

## Historical compatibility

The full pre-consolidation file, including dated capability figures, numbered investigations, experiment chronologies, and old queue ordering, is frozen at [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md). It remains evidence for the commits and protocols it describes, not current instruction.
