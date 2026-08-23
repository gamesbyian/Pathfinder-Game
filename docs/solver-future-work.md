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

`6f00baf` (2026-08-21) tightened `buildDistMap`'s treatment of gates/geese/false-goals, which is safety-monotonic for `lower-bounds.ts`'s admissible pruning but not for `scoring.ts`'s move-ordering guidance. Bisection ([`../reports/2026-08-22-corpus2-node-budget-losses.md`](../reports/2026-08-22-corpus2-node-budget-losses.md)) traced 73 Corpus-2 node-budget losses to that commit, against 90 gains. Reopen only with a concrete proposal for how scoring should consume distance differently from pruning and matched-work evidence that it recovers solves without new losses.

### Repair-fallback gate widening

Recent census mining found many isolated repair wins on levels excluded by `attempts.ts`'s `needsRepairFallback` gate, especially `portal-heavy` and medium/near-Hamiltonian `high-intersection-burden` sub-rules. A plain threshold widening is not a fresh quick fix: prior population evidence found no clean single/pair feature separating cheap repair winners from the much larger ineligible population that never wins, which is why `STRATEGY_REPAIR_LATE_PROBE` was built as an unconditional dead-last shot instead. Raising that late probe from 2M to 5M nodes was separately population-validated and promoted on 2026-08-22 (+3 net, zero losses).

The broader gate question remains open only if a materially different level-blind selector can identify levels worth giving repair a protected/full tier, or evidence shows that >5M repair capability is being systematically stranded. Any proposal must measure the tax on newly gated already-solving levels, not only recovery targets. Current evidence/validation: [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) Priority 7.

**2026-08-23 (branch `claude/technique-census-solver-wz49v6`): broad unconditional form measured, CLOSED NEGATIVE.** Wired the broad form this entry describes (`needsRepairFallback` covering all of `isHighInt(f)` plus `f.arch === 'portal-heavy'`, 545 newly-gated levels) behind a default-OFF `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN` flag and measured it with a population-scale GHA A/B (562-level sample): control 417/562, treatment 415/562 — **0 gains, 2 losses (`R01944`, `R02474`), net −2**. None of the newly-gated levels benefited; two regressed from the unconditional early repair probe taxing their formerly-sufficient main-loop budget. Closed negative for this broad form — do not repeat unchanged; a future attempt needs a materially different, narrower selection mechanism. Full detail: `solver-optimization-current-queue.md` Priority 7.

**Reconciliation (2026-08-22, second follow-up):** this entry's "not a quick fix" framing understates the standing evidence against a plain gate-widening specifically — `STRATEGY_REPAIR_LATE_PROBE`'s own promotion comment (`stage-budget.ts`) already recorded, for the whole corpus, that "no single/pair feature cleanly separates 'repair wins cheaply here' from the much larger ineligible population that never wins," which is exactly why that tier was built to try repair unconditionally at the dead-last position instead of selecting levels via a wider feature gate. Re-deriving this on a narrower, current-code, non-stale population (13 confirmed-still-unsolved `hi:medium-high-catchall` levels wanting `dfs:repair:repair*`, see docs/solver-optimization-current-queue.md Priority 7's 2026-08-22 second-follow-up entry) reproduces the same non-separation across `reqInt`/`mustPass`/`mustCross`/`mustTurn`/`portals`/`flippers`. A future attempt at this idea needs a materially different selection mechanism (not a bigger/different threshold on the same feature set already shown not to separate) to be worth testing — otherwise it is re-litigating an already-rejected form.

**Better-scoped lever found instead, RESOLVED same day: `REPAIR_LATE_PROBE_NODE_BUDGET` raised 2,000,000 → 5,000,000 (`stage-budget.ts`), promoted.** Since `STRATEGY_REPAIR_LATE_PROBE` already reaches every `needsRepairFallback`-excluded level unconditionally at the dead-last tier, raising its flat node cap costs nothing on any level that solves earlier (main loop still exits at first success) — architecturally lower-risk than gate-widening, which changes budget-sharing for every newly-gated level including ones that already solve fast. A local 13-level hand-picked sample (`hi:medium-high-catchall` confirmed gaps) found 1/13 newly solved at 5,000,000 — directionally consistent with the shipped tier's own recorded 8.3% (26/314) hit rate but not sufficient evidence alone to promote a corpus-wide constant change. Ran the population-scale A/B this called for instead: added `--repair-late-probe-node-budget` to `level-blind-capability-sweep.mjs` and both GHA capability workflows, then dispatched `solver-archetype-sample-ab.yml` with every archetype listed as eligible (this lever isn't archetype-scoped, so that's a genuine uniform-random 300-level Corpus-2 sample plus the invariant full Corpus-1 + published, 562 levels) twice with identical seed/ref, differing only in the node-cap input. Result: control 421/562, treatment 424/562 — **+3 net gains (`R00477`, `R02271`, `R03045`), zero losses**, +0.54% nodes / +1.46% work. Promoted; `solver:bench --check` 160/160 byte-identical, full `stage-budget.test.ts`/`orchestration.test.ts` and `ci:fast` pass. Full detail: docs/solver-optimization-current-queue.md Priority 7's 2026-08-22 second-follow-up entry.

The broader gate-widening idea above (widening `needsRepairFallback` itself to cover `portal-heavy` and more of `high-intersection-burden`) is a different mechanism from this cap raise — the late-probe tier's higher cap gives every `repairConfigs`-empty level a bigger *unconditional, dead-last* shot, but a level whose real winning repair search needs meaningfully more than 5,000,000 nodes still won't be reached by it; the gate-widening question (giving such levels repair as a *protected, budgeted* tier rather than a capped afterthought) was blocked on the "no clean feature" finding above, and is now empirically closed for its broad form.

**2026-08-23 (branch `claude/technique-census-solver-wz49v6`): broad gate-widening form CLOSED NEGATIVE, population-scale GHA A/B.** Wired the exact broad form this entry describes (`needsRepairFallback` unconditionally covering `isHighInt(f)` — dropping the `VERY_HIGH_REQINT` floor — plus `f.arch === 'portal-heavy'`, 545 newly-gated levels) behind a new default-OFF `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN` flag (`ablation-config.ts`/`attempts.ts`) specifically so the tradeoff this entry called for could be measured directly rather than reasoned about. Dispatched `solver-archetype-sample-ab.yml` twice (`archetypes=portal-heavy,high-intersection-burden`, same seed/ref/commit, differing only in the flag) — a 300-level Corpus-2 archetype-eligible sample plus the invariant full Corpus-1 + published, 562 levels. **Result: control 417/562, treatment 415/562 — 0 gains, 2 losses (`R01944`, `R02474`), net −2.** None of the 545 newly-gated levels in this sample benefited; two regressed, consistent with the unconditional early repair probe taxing/starving their formerly-sufficient main-loop budget. This independently confirms, at population scale rather than a 13-level sample, the "no clean feature separates repair-wins from the ineligible population" finding above. **Closed negative for the broad unconditional-`isHighInt`/`portal-heavy` form** — do not repeat unchanged. The flag stays in the codebase default-OFF (not reverted) as a documented-negative retained opt-in, so a future materially-different (narrower) selection mechanism can reuse the wiring. Full detail: docs/solver-optimization-current-queue.md Priority 7.

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
