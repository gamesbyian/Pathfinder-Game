# Solver future work

Unranked solver ideas outside the live optimization queue.

| Question | Authority |
|---|---|
| What work is next? | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Does retained/default-off code await promotion? | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| How should research run? | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| How can variants help? | [`variant-level-research.md`](variant-level-research.md) |
| What did an experiment measure? | [`../reports/README.md`](../reports/README.md) + dated report |
| Historical contents | [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md) |

Before implementing an idea below, check current code, the queue, ledger, reports, and [`tooling-catalog.md`](tooling-catalog.md) for existing capability or a concluded experiment.

## Deferred opportunities

### Queryable research evidence

If joins among level structure, run identity, attempt telemetry, hints/provenance, families, oracle labels, and experiment arms keep spawning one-off scripts, add a derived analytical layer. Require comparability rather than a particular database: reuse `scripts/experiment-manifest-lib.mjs`, keep JSON/JSONL canonical where useful, reject incomparable runs, and keep analytical data out of production policy.

### Distance-guidance/pruning split for scoring

`6f00baf` (2026-08-21) tightened `buildDistMap`'s treatment of gates/geese/false-goals, which is safety-monotonic for `lower-bounds.ts`'s admissible pruning but not for `scoring.ts`'s move-ordering guidance — a more accurate distance can misdirect a budget-limited, non-optimal search on a per-instance basis. Bisection ([`../reports/2026-08-22-corpus2-node-budget-losses.md`](../reports/2026-08-22-corpus2-node-budget-losses.md)) traced 73 Corpus-2 node-budget losses to exactly this commit, net +17 against 90 gains — accepted, not reverted. Reopen only with a concrete proposal for how `scoring.ts` should consume distance information differently from `lower-bounds.ts` (e.g. a separate, unmodified distance map for guidance, or a secondary tie-break/diversification when the primary heuristic's top-ranked branch stalls) and matched-work evidence that it recovers solves without new losses elsewhere.

### must-cross-heavy diverse-beam gaps blocked on reserve-slot budget (RESOLVED 2026-08-22)

2026-08-22 routing-gap mining (docs/solver-optimization-current-queue.md Priority 7) found two remaining must-cross-heavy census gaps needing a diverse WIDE beam (`beam:objectiveFirst@beam5000(diverse)` for R02299 via the must-pass-heavy rule; `beam:intersectionHarvest@beam5000(diverse)` for R02159 via the default catch-all) that neither rule offers at all — not gated by `POLICY.HIGHINT_MC_DIVERSE`/`mcDiverseThread` (that helper isn't used by either rule), just genuinely absent. Originally left open because both rules' `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`-4 trailing reserve slots were already fully occupied by the just-added, already-validated perimeter fix (R02131/R02515/R02788 confirmed solved at 50M production budget locally), and appending a 5th trailing config would have pushed one of those out of the protected-reserve window.

**Resolved same day:** raised `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` from 4 to 5 (`stage-budget.ts`) after confirming it's a strict no-op on the published corpus with no rule content changed — the reserve is a FRACTION of `earlyTierNodeBudget`, not a fixed per-config amount, so widening the protected window spreads the same pool one slot thinner rather than growing the total reserved budget (160/160 identical solved set, byte-identical `nodesExpanded` per level, count=4 vs 5, both at node-budget 50,000,000). Added both missing diverse beam configs in the newly-available 5th slot. Both levels confirmed solved at production 50M node budget; a 30-level regression sample of already-solving levels in the same two sub-rules found zero collateral loss. See docs/solver-optimization-current-queue.md Priority 7 for full validation detail.

### repair-fallback gate widening (portal-heavy / high-intersection-burden sub-rules)

2026-08-22 routing-gap mining (a follow-up pass, docs/solver-optimization-current-queue.md Priority 7) found `attempts.ts`'s `needsRepairFallback` gate (`mustCross >= 2 && mustPass >= 3`, OR `isHighInt && reqInt >= 7`) excludes several archetype sub-rules entirely: `portal-heavy` (18 of its 22 census-gap-population rows want a repair config as the cheapest genuinely-never-offered technique) and most of `high-intersection-burden`'s medium-reqInt/near-Hamiltonian sub-rules (37 more rows across both) — 55 rows total where an isolated repair attempt solves within budget but production never even offers it. Unlike a beam/DFS trailing-config addition, this can't be scoped to one rule's own reserved slot: `needsRepairFallback` is a single global predicate gating a completely separate budget mechanism (the early repair probe plus the `REPAIR_EXTRA_BUDGET_FRACTION` fallback loop), not one more `build()` entry a rule's own `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` window protects. `stage-budget.ts`'s own comment on `REPAIR_PROBE_ORDINARY_NODE_BUDGET` documents that the CURRENT (narrower) gate already taxes far more levels than it helps — a full-corpus scan found 48 levels matching the gate that solve fast via the ordinary main loop (repair probe cost paid for nothing) against only 13 that actually needed repair — so widening the gate to cover two more whole archetype sub-rules risks a much larger version of the same tax on a population that hasn't been measured at all. Reopen with a population-scale (or at minimum a large stratified-sample) wall-time check on both the newly-gated population's tax and the published corpus, not the `solver:bench --check`-only bar a trailing-config addition gets. Not pursued in the 2026-08-22 pass.

### Cross-technique cooperation

Use named **producer -> receptor** hypotheses with a measured receptor failure, producer information the receptor cannot cheaply rediscover, timely/bounded consumption, protected independent search, positive shadow evidence, and a level-blind matched-work verdict. Method: [`solver-research-operating-model.md`](solver-research-operating-model.md#producer--receptor-cooperation). Historical design: [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

### Broader scaling research

Controlled variants can test navigable area, required length, intersection pressure, mechanic density, portal load, and related structure. Existing exact-length work: [`solver-required-length-sweep.md`](solver-required-length-sweep.md). Methods: [`variant-level-research.md`](variant-level-research.md). Treat parent families as statistical units.

### Recipe cousins / generated families

Use recipe cousins to transfer-test exact-witness sibling findings across newly generated witnesses with controlled feature recipes. Do not mix them with sibling counterfactual-effect estimates. Query the existing off-main trove before generating another large one.

### AI/manual accepted-path diagnosis

Treat a valid missed path as evidence, not its narrator's explanation. Referee-validate, record provenance, then locate where unchanged search generated, ranked, pruned, or lost compatible material. Repeated divergence can nominate generic heuristic/representation work. See [`solver-research-operating-model.md`](solver-research-operating-model.md#accepted-path-differential-diagnosis).

### Learned/fitted routing

Consider fitted routing only with a stable target and enough family-balanced evidence. Split by parent family, preserve level-blindness, and compare with simpler mechanics-conditioned rules and production at matched work. Never split siblings across train/test.

### Deferred 2026 solver-aware measurements

Historical campaign: [`archive/snapshots/solver-aware-game-architecture-2026-08-20.md`](archive/snapshots/solver-aware-game-architecture-2026-08-20.md).

- **Contrastive failure-directed activity:** needs per-branch sibling-outcome telemetry; build only for a live retention question.
- **Hazard-based adaptive capping / participation floors:** needs censored per-attempt hazard telemetry; reconcile with current census/routing evidence first.
- **Multi-abstraction CEGAR:** substantial standalone refinement machinery.
- **Detour-gadget discovery / slack allocation:** first mine stored solutions for interface-equivalent subpaths with different length/intersection deltas.
- **Interface-preserving repair surgery:** requires stronger causal-window evidence before a live operator.
- **Partial-order / commuting-segment analysis:** mine stored solutions first.
- **Eulerian/local-transition relaxation:** shadow the smallest E0 relaxation first.
- **Topology-signature diversity:** first test whether the signature separates useful frontier modes.
- **Topology-first skeleton compilation / automatic rule synthesis:** defer pending abstraction/counterexample/proof machinery and cost evidence.
- **Shared compiled puzzle graph:** reopen only for a concrete consumer that removes duplicate semantics without weakening the independent oracle. See [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md).

These remain unranked until current evidence makes one relevant.

## Reopening closed ideas

Reopen only when the mechanism or receptor materially changes, new information alters the decision, new evidence falsifies the closure reason, or a former cost can now be avoided. A small constant/sample/workflow change does not reopen an unchanged negative unless that parameter was the unresolved gate.

## Closed forms not to rediscover

See the current queue for definitive dispositions. Repeatedly closed forms include universal beam widening, unconditional must-cross attraction, broad cold-start portfolio scheduling, plain extra repair budget for plateaued repair, static repair-fallback reserve, blind late-tier carve-outs, repair plateau penalties, soft recombination, exact relinking, repair turn bias, admissible-order LDS, and rejected admissible-order density/profile reserves.

Also closed/deprioritized from solver-aware work: measured fully-sound DFS/beam transposition caching, exact whole-level symmetry canonicalization as a meaningful stress lever, static forced-sequence macros on measured populations, and the three narrow Tier-2 hard-prune/shadow reasoners already scored at atlas scale.

For retained switches use [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md); code presence does not imply open status.

## History

The pre-consolidation ledger, including 2026-08-07 triage, capability figures, numbered investigations, chronologies, and old ordering, is frozen at [`archive/snapshots/future-work-2026-08-20.md`](archive/snapshots/future-work-2026-08-20.md).
