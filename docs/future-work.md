# Solver future work

Compact index of solver ideas outside the current ranked optimization queue.

| Question | Authority |
|---|---|
| What solver work is next? | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Does retained/default-off code need a promotion decision? | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| How should research be designed and promoted? | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| How can the family/variant dataset help? | [`variant-level-research.md`](variant-level-research.md) |
| What did an experiment measure? | [`../reports/README.md`](../reports/README.md) and its dated report |
| What did this file previously contain? | [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md) |

The old ledger mixed priorities, run summaries, completed experiments, and speculative descendants. Its snapshot preserves that history; do not reconstruct the current queue from it.

## Broader deferred opportunities

These are unranked idea families. Before implementing one, check current code, the queue, opt-in ledger, reports, and [`tooling-catalog.md`](tooling-catalog.md) for an existing capability or concluded experiment.

### Queryable research evidence

Pathfinder often joins level structure, run identity, attempt telemetry, hints/provenance, family relationships, oracle labels, and experiment arms. A derived analytical layer may be useful if these joins keep producing one-off scripts.

The key requirement is a **comparability contract**, not a database product. Reuse `scripts/experiment-manifest-lib.mjs` for run identity; keep JSON/JSONL canonical where appropriate; reject incomparable runs rather than averaging them; keep analytical data offline from production policy. Build only when it replaces recurring analysis work.

### Cross-technique cooperation

Treat cooperation as a named **producer -> receptor** hypothesis, not a universal blackboard. A live handoff needs:

- a measured receptor failure;
- producer information the receptor does not already get cheaply;
- useful timing;
- bounded replay/consumption cost;
- protected independent receptor search;
- positive shadow evidence;
- a level-blind matched-work verdict.

Method: [`solver-research-operating-model.md`](solver-research-operating-model.md#producer--receptor-cooperation). Full 2026 design record: [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

### Broader scaling research

Controlled variants can test navigable area, required length, intersection pressure, mechanic density, portal load, and related structural variables. Existing exact-length work: [`req-length-sweep.md`](req-length-sweep.md). Family/variant methods: [`variant-level-research.md`](variant-level-research.md).

Treat parent families, not tens of thousands of siblings, as the statistical units.

### Recipe cousins and new generated families

Recipe cousins are a weaker population-level family tool. Use them when exact-witness sibling findings need transfer testing across newly generated witnesses with controlled feature recipes. Do not mix them with counterfactual sibling-effect estimates.

Query the existing off-main trove before generating another large one.

### AI/manual accepted-path diagnosis

A human or AI may provide a valid path the production solver missed. The research object is the **accepted path**, not the narrator's explanation.

Validate through the canonical referee, record provenance, then compare the path with what the unchanged solver generated, ranked, pruned, or lost. Repeated divergence can nominate a generic heuristic or representation experiment. See [`solver-research-operating-model.md`](solver-research-operating-model.md#accepted-path-differential-diagnosis).

### Learned or fitted routing

Consider a classifier or fitted routing rule only after there is a stable target and enough family-balanced evidence. Split by parent family, preserve level-blindness, and compare against simpler mechanics-conditioned rules and the production ladder at matched work.

Never randomly split sibling rows across train/test; that leaks family information.

### Deferred 2026 solver-aware measurements

Original campaign: [`archive/snapshots/solver-aware-game-architecture-2026-08-20.md`](archive/snapshots/solver-aware-game-architecture-2026-08-20.md). Completed items belong there, not here.

- **Contrastive failure-directed activity:** needs per-branch sibling-outcome telemetry. Build only for a current representation/retention question.
- **Hazard-based adaptive capping / participation floors:** specialist starvation has precedent, but a general survival model needs censored per-attempt hazard telemetry. Reconcile with current census/routing evidence first.
- **Multi-abstraction CEGAR:** atlas exists; a refinement loop is a substantial standalone research machine.
- **Detour-gadget discovery / slack allocation:** first mine stored solutions for interface-equivalent subpaths with different length/intersection deltas.
- **Interface-preserving repair surgery:** requires causal-window evidence beyond existing residual-interface measurements. Do not build the live operator first.
- **Partial-order / commuting-segment analysis:** mine stored solutions before search integration.
- **Eulerian/local-transition relaxation:** test a smallest E0 relaxation offline/shadow before considering a larger ladder.
- **Topology-signature diversity:** first test whether the signature separates useful frontier modes.
- **Topology-first skeleton compilation / automatic rule synthesis:** moonshots; defer until prerequisite abstraction/counterexample/proof machinery and cost evidence exist.
- **Shared compiled puzzle graph:** reopen only for a concrete consumer that removes duplicated semantics without weakening the independent oracle. See [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md).

These remain unranked. A queue entry, census result, family boundary, or exact/shadow label may make one relevant; age does not.

## Reopen rules for closed ideas

Closed results forbid repetition of the same mechanism, not all descendants. Reopen only if:

- the mechanism materially changes;
- the decision gets new information;
- the receptor/search operator changes;
- new evidence falsifies the closure reason; or
- a former cost can now be avoided rather than merely paid with more budget.

Do not reopen an unchanged negative by changing only a small constant, sample, or workflow wrapper unless that parameter was the earlier unresolved gate.

## Closed forms not to rediscover

The current queue is definitive. Repeatedly closed forms include universal beam widening, unconditional must-cross attraction, broad cold-start portfolio scheduling, plain extra repair budget for plateaued repair, static repair-fallback reserve, blind late-tier carve-outs, repair plateau penalties, soft recombination, exact relinking, repair turn bias, admissible-order LDS, and rejected admissible-order density/profile reserve forms.

Also closed/deprioritized from the solver-aware campaign: measured fully-sound DFS/beam transposition caching, exact whole-level symmetry canonicalization as a meaningful stress-corpus lever, static forced-sequence macros on measured populations, and the three narrow Tier-2 hard-prune/shadow reasoners already scored at atlas scale.

For retained switches, use [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md); an ablation flag does not imply open status.

## Historical compatibility

The full pre-consolidation file, including the 2026-08-07 loose-thread triage, capability figures, numbered investigations, chronologies, and old ordering, is frozen at [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md). It is historical evidence, not current instruction.