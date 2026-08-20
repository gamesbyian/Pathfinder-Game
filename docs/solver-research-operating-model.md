# Solver research operating model

> **Status:** current research-method and evidence-routing contract.
> **Priority authority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **Capability boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).

This document explains **how** Pathfinder solver research should proceed. It does not contain a second queue and should not accumulate dated run-by-run results. Put measurements in dated reports; put current ranked decisions in the optimization queue; put retained/default-off flag dispositions in the opt-in ledger.

The pre-consolidation operating notebook is preserved at [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

## Research pipeline

Most nontrivial solver work should follow this sequence:

> semantic truth -> controlled evidence -> failure classification -> exact/shadow evaluation -> narrow intervention -> level-blind matched population verdict

A correctness bug can move directly to a fix plus regression/soundness validation. A speculative heuristic generally should not.

Before changing production search, ask whether the premise can be tested by an existing observer, oracle, family comparison, reducer, isolated-technique probe, or replay tool.

## Capability boundary

Pathfinder's product case is an unseen editor level. A cold capability solve may use puzzle mechanics, current search state, current invocation telemetry, and generic code/configuration only.

Exact-level history may be used offline to **label research** but not to guide a capability solve. Forbidden capability inputs include:

- saved solution or hint guidance;
- previous winning config, gate, seed, or attempt order;
- historical solved status, timing, nodes, badness, or family outcome used for exact-level allocation;
- per-level caches or special cases;
- permanent IDs or corpus position as policy signals.

Known solutions are diagnostic fluorescence, not steering instructions.

## Classify the failure before choosing a treatment

Use the narrowest category that explains the measured failure.

| Failure class | Meaning | Typical next instrument |
|---|---|---|
| Correctness / soundness | Legal solution rejected, invalid solution accepted, unsound prune/cache/state identity. | Canonical referee, differential tests, tiny exhaustive reference, reducer. |
| Regression | A reproducible current level/config lost a capability it previously had. | Commit bisection, exact config replay, causal ablation, paired current-code check. |
| Routing | An existing technique solves cheaply when isolated but production policy never offers it enough relevant work. | Technique census, method probe, lifecycle telemetry, bounded tail routing. |
| Search quality | The technique is tried and receives substantial/full isolated budget but still fails. | Trace, repair/DFS/beam-specific diagnostics, exact labels, operator or representation work. |
| Representation / retention | A viable candidate family is generated but ranked, deduped, or width-culled away. | Winning lineage, pair divergence, exact-prefix oracle, shadow descriptors. |
| Allocation | Multiple useful techniques compete for a finite shared pool and the treatment changes who receives work. | Lifecycle accounting, explicit work caps, matched-work population A/B. |

Do not use “starvation” as a catch-all. The technique census demonstrated why: a technique can be starved in the ladder and still fail when given the entire isolated budget.

## Evidence hierarchy

Use the strongest available evidence for the question rather than the largest artifact by default.

1. **Canonical semantic/referee truth** for legality and correctness.
2. **Exact or bounded oracle labels** for feasibility questions where model coverage is supported.
3. **Controlled paired evidence**, especially same-parent family variants or matched A/B arms.
4. **Level-blind population evidence** for promotion/capability decisions.
5. **Historical runs** for nomination and mechanism clues, reconciled against current code before action.

Large row counts do not compensate for dependence. In family research, parents/families are the independent units. See [`variant-level-research.md`](variant-level-research.md).

## Experimental substrate

Prefer existing infrastructure:

- deterministic/canonical work accounting;
- schema-v2 experiment manifests and stable run identity;
- stress corpora and lifecycle telemetry;
- family/variant manifests and provenance;
- hint/solution provenance;
- shadow probe harness;
- winning-lineage observation;
- explicit-prefix CP-SAT/reference labels;
- automatic reduction and real-state replay;
- isolated technique census/method probes.

Start at [`tooling-catalog.md`](tooling-catalog.md). A new research framework should replace repeated one-off work, not merely sit beside it.

## Shadow first

When a hypothesis concerns scoring, retention, routing, or information sharing, prefer read-only observation before live behavior.

A useful shadow result answers a concrete question such as:

- does a neutral descriptor separate exact-live from exact-dead siblings?
- does a candidate reasoner catch dead branches beyond the existing gauntlet without false rejects?
- does a producer emit information the proposed receptor lacks?
- does a proposed routing feature identify actual isolated capability rather than historical winners?

Shadow instrumentation must have OFF/ON parity for solution, work, ordering, and randomness unless the instrument's purpose explicitly changes those things.

## Producer -> receptor cooperation

Cross-technique cooperation is a specific handoff experiment, not a mandate to build a shared blackboard.

Before a live handoff, identify:

1. **Receptor:** a measured limitation in a named technique.
2. **Producer:** information another technique already emits or can emit cheaply.
3. **Novelty:** evidence that the receptor would not cheaply rediscover the same information.
4. **Timing:** the information arrives before the receptor spends the work it could save.
5. **Consumption cost:** replay/storage/branching cost is bounded.
6. **Independence:** ordinary recipient search remains protected as a control path.
7. **Shadow result:** the handoff premise survives without changing search.
8. **Matched verdict:** the final live experiment improves solves or work at a fair total budget.

Useful information can still reduce solve count if consuming it displaces the recipient's own successful work. That failure mode has already occurred in Pathfinder and should be treated as a standing design constraint.

The full original cooperation design is archived at [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

## Family/variant evidence

Use the off-main variant trove as a controlled diagnostic surface, not as production retries or a giant bag of independent examples.

Especially useful routes:

- symmetry cliffs -> orientation/order/representation investigation;
- local solved/unsolved boundaries -> causal scoring/pruning/operator diagnosis;
- isolated-technique changes across relatives -> routing/capability hypotheses;
- re-embedding/density changes -> sensitivity to navigable space;
- held-out parent families -> generalization test for a proposed rule.

The canonical resource and exact research branch are documented in [`variant-level-research.md`](variant-level-research.md).

## Accepted-path differential diagnosis

A valid path constructed by a human, AI assistant, oracle, or variant transformation can be useful when the production solver does not find it.

The method is:

1. validate it through the canonical path referee;
2. record provenance honestly;
3. keep it out of the cold solve;
4. replay/observe where the unchanged solver first diverges from, rejects, or loses compatible prefixes;
5. identify the concrete score, prune, state representation, width decision, or routing boundary involved;
6. require the pattern to recur across unrelated levels or held-out families before changing production behavior.

Do not treat an AI's or human's post-hoc explanation of “why the path works” as causal evidence. The accepted path plus the solver trace is the evidence.

The original worked AI-manual note is archived at [`archive/snapshots/ai-assisted-manual-solving.md`](archive/snapshots/ai-assisted-manual-solving.md).

## Promotion contract

A production-facing solver treatment should normally satisfy all of the following:

- level-blind execution;
- persistent, identifiable code/protocol state;
- complete intended population or explicitly declared sample;
- deterministic/non-binding wall-clock conditions when the question requires work comparability;
- comparable arm inputs with declared treatment variables;
- gains **and** losses reported, not just net count;
- `workSpent`, nodes, errors, and deadline truncation reported where applicable;
- relevant Corpus 1, Corpus 2, and published transfer/cost checks;
- no hidden mutation of hints/data between arms;
- current queue and opt-in ledger updated when the decision changes.

A small negative can close an unchanged mechanism when it directly falsifies the premise. A promising small result usually nominates a broader gate; it does not by itself promote production behavior.

## Documentation handoff

After an investigation:

- put measurements and chronology in a dated report;
- update [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) if ranked priority/state changed;
- update [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) if a retained/default-off mechanism changed disposition;
- update a durable topic/tool contract only when its behavior or reusable interpretation changed;
- archive concluded plans rather than leaving them masquerading as current instructions.
