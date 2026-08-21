# Solver research operating model

> **Status:** current research-method and evidence-routing contract.
> **Priority authority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **Capability boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).

This document defines **how** solver research proceeds. Put measurements in dated reports, ranked decisions in the optimization queue, and retained/default-off dispositions in the opt-in ledger. Pre-consolidation notebook: [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

## Research pipeline

For most nontrivial solver work:

> semantic truth -> controlled evidence -> failure classification -> exact/shadow evaluation -> narrow intervention -> level-blind matched population verdict

Correctness bugs may go directly to a fix plus regression/soundness validation. Before changing production search for a speculative heuristic, test the premise with an existing observer, oracle, family comparison, reducer, isolated-technique probe, or replay tool when possible.

## Capability boundary

The product case is an unseen editor level. A cold solve may use mechanics, current search state, current invocation telemetry, and generic code/configuration only.

Exact-level history may label offline research but may not guide a capability solve. Forbidden inputs include:

- saved solution or hint guidance;
- previous winning config, gate, seed, or attempt order;
- historical solved status, timing, nodes, badness, or family outcome used for exact-level allocation;
- per-level caches or special cases;
- permanent IDs or corpus position as policy signals.

Known solutions are diagnostic fluorescence, not steering instructions.

## Classify the failure first

Use the narrowest measured class.

| Failure class | Meaning | Typical next instrument |
|---|---|---|
| Correctness / soundness | Legal solution rejected, invalid solution accepted, unsound prune/cache/state identity. | Canonical referee, differential tests, tiny exhaustive reference, reducer. |
| Regression | A reproducible current level/config lost a capability it previously had. | Commit bisection, exact config replay, causal ablation, paired current-code check. |
| Routing | An isolated technique solves cheaply but production does not give it enough relevant work. | Technique census, method probe, lifecycle telemetry, bounded tail routing. |
| Search quality | A technique gets substantial/full isolated budget and still fails. | Technique-specific trace/diagnostics, exact labels, operator or representation work. |
| Representation / retention | Viable candidates are generated but ranked, deduped, or width-culled away. | Winning lineage, pair divergence, exact-prefix oracle, shadow descriptors. |
| Allocation | Useful techniques compete for finite shared work and treatment changes the split. | Lifecycle accounting, explicit work caps, matched-work population A/B. |

Do not use “starvation” for routing and search-quality failures interchangeably: a ladder-starved technique can still fail with the full isolated budget.

## Evidence hierarchy

Use the strongest evidence for the question, not the largest artifact.

1. **Canonical semantic/referee truth** for legality and correctness.
2. **Exact or bounded oracle labels** for supported feasibility questions.
3. **Controlled paired evidence**, especially same-parent variants or matched A/B arms.
4. **Level-blind population evidence** for promotion/capability decisions.
5. **Historical runs** for nomination and mechanism clues, reconciled against current code before action.

Row count does not erase dependence. In family research, parent families are the independent units. See [`variant-level-research.md`](variant-level-research.md).

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

Start at [`tooling-catalog.md`](tooling-catalog.md). Add a framework only when it replaces repeated one-off work.

## Shadow first

For scoring, retention, routing, or information-sharing hypotheses, prefer read-only observation before changing search.

Useful shadow questions include:

- does a neutral descriptor separate exact-live from exact-dead siblings?
- does a reasoner catch dead branches beyond the current gauntlet without false rejects?
- does a producer emit information the receptor lacks?
- does a routing feature identify isolated capability rather than historical winners?

Shadow instrumentation must preserve OFF/ON solution, work, ordering, and randomness parity unless changing one is its explicit purpose.

<a id="producer--receptor-cooperation"></a>
## Producer -> receptor cooperation

Cross-technique cooperation is a specific handoff experiment, not a shared-blackboard mandate. Before a live handoff establish:

1. **Receptor:** measured limitation in a named technique.
2. **Producer:** information another technique emits or can emit cheaply.
3. **Novelty:** receptor would not cheaply rediscover it.
4. **Timing:** information arrives before the receptor spends the work it could save.
5. **Consumption cost:** bounded replay/storage/branching cost.
6. **Independence:** normal recipient search remains a control path.
7. **Shadow result:** premise survives without changing search.
8. **Matched verdict:** live treatment improves solves or work at fair total budget.

Useful information can still reduce solve count if its consumption displaces successful recipient work; treat that as a standing constraint.

Original design: [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

## Family/variant evidence

Use the off-main variant trove as a controlled diagnostic surface, not production retries or independent-row bulk data.

Useful routes:

- symmetry cliffs -> orientation/order/representation investigation;
- local solved/unsolved boundaries -> causal scoring/pruning/operator diagnosis;
- isolated-technique changes across relatives -> routing/capability hypotheses;
- re-embedding/density changes -> sensitivity to navigable space;
- held-out parent families -> generalization tests.

See [`variant-level-research.md`](variant-level-research.md).

## Accepted-path differential diagnosis

A valid path supplied by a human, AI, oracle, or variant transformation can diagnose a production miss:

1. validate it through the canonical path referee;
2. record provenance;
3. keep it out of the cold solve;
4. observe where the unchanged solver first diverges from, rejects, or loses compatible prefixes;
5. identify the score, prune, state representation, width decision, or routing boundary;
6. require recurrence across unrelated levels or held-out families before changing production behavior.

Post-hoc human/AI explanations are not causal evidence; the accepted path plus solver trace is.

Worked historical note: [`archive/snapshots/ai-assisted-manual-solving.md`](archive/snapshots/ai-assisted-manual-solving.md).

## Promotion contract

A production-facing treatment should normally have:

- level-blind execution;
- persistent, identifiable code/protocol state;
- the complete intended population or an explicit sample;
- deterministic/non-binding wall-clock conditions when work comparability matters;
- comparable arm inputs with declared treatment variables;
- gains **and** losses, not only net count;
- `workSpent`, nodes, errors, and deadline truncation where applicable;
- relevant Corpus 1, Corpus 2, and published transfer/cost checks;
- no hidden hint/data mutation between arms;
- queue and opt-in ledger updates when disposition changes.

A direct small negative may close an unchanged mechanism. A promising small result usually nominates a broader gate; it does not promote production behavior by itself.

## Documentation handoff

After an investigation:

- measurements and chronology -> dated report;
- ranked priority/state changes -> [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- retained/default-off disposition changes -> [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- durable behavior or reusable interpretation changes -> topic/tool contract;
- concluded plans -> archive.