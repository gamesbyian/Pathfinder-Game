# Solver research operating model

> **Status:** current research-method/evidence-routing contract.
> **Priority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **Capability boundary:** [`solver-level-blindness.md`](solver-level-blindness.md).

Measurements belong in dated reports, ranked decisions in the optimization queue, and retained/default-off dispositions in the opt-in ledger. Pre-consolidation notebook: [`archive/snapshots/solver-research-operating-model-2026-08-20.md`](archive/snapshots/solver-research-operating-model-2026-08-20.md).

## Research pipeline

> semantic truth -> controlled evidence -> failure class -> exact/shadow evaluation -> narrow intervention -> level-blind matched population verdict

Correctness bugs may go directly to fix + regression/soundness validation. For speculative heuristics, test the premise first with existing observers, oracles, family comparisons, reducers, isolated-technique probes, or replay tools.

Pathfinder generally represents local legality/progress more strongly than future opportunity cost. Use exact/shadow evidence to test future viability rather than inferring it from local progress alone.

## Capability boundary

The product case is an unseen editor level. Cold solves may use mechanics, current search state/telemetry, and generic code/config only. Exact-level history may label offline research but may not steer capability solves.

Forbidden steering includes saved hints/solutions; prior winning config/gate/seed/order; historical solved status, timing, nodes, badness, or family outcome; per-level caches/special cases; and IDs/corpus position. Known solutions are diagnostic evidence only.

## Failure classes

| Class | Meaning | Typical instrument |
|---|---|---|
| Correctness / soundness | Legal solution rejected, invalid accepted, or unsound prune/cache/state identity. | Referee, differential tests, tiny exhaustive reference, reducer. |
| Regression | Reproducible current level/config lost prior capability. | Bisection, exact replay, causal ablation, paired current-code check. |
| Routing | Isolated technique solves cheaply but production gives it too little relevant work. | Technique census, method probe, lifecycle telemetry, bounded tail routing. |
| Search quality | Technique gets substantial/full isolated budget and still fails. | Technique trace/diagnostics, exact labels, operator/representation work. |
| Representation / retention | Viable candidates are generated then ranked, deduped, or width-culled away. | Winning lineage, pair divergence, exact-prefix oracle, shadow descriptors. |
| Allocation | Useful techniques compete for finite shared work. | Lifecycle accounting, explicit work caps, matched-work A/B. |

Do not call both routing and search-quality failures “starvation”: a ladder-starved technique can still fail at full isolated budget.

## Evidence hierarchy

1. **Canonical referee truth** for legality/correctness.
2. **Exact or bounded oracle labels** for supported feasibility questions.
3. **Controlled paired evidence**, especially same-parent variants or matched A/B arms.
4. **Level-blind population evidence** for promotion/capability decisions.
5. **Historical runs** for nomination/mechanism clues, reconciled to current code before action.

Row count does not remove dependence; family research treats parents as independent units. See [`variant-level-research.md`](variant-level-research.md).

## Experimental substrate

Prefer existing infrastructure: deterministic work accounting; schema-v2 manifests/run identity; stress corpora/lifecycle telemetry; family/variant and hint/solution provenance; shadow probes; winning-lineage tools; explicit-prefix CP-SAT/reference labels; reducers/replay; isolated technique census/method probes.

Start at [`tooling-catalog.md`](tooling-catalog.md). Reuse experiment manifests/run identity, require comparability before aggregation, and keep derived analytics rebuildable rather than creating parallel truth. Add frameworks only when they replace repeated one-off work.

## Shadow first

For scoring, retention, routing, or information-sharing hypotheses, observe before changing search. Ask whether a descriptor separates exact-live/dead siblings, a reasoner catches extra dead branches without false rejects, a producer emits novel useful information, or a routing feature predicts isolated capability rather than historical winners.

Unless parity is the experiment, shadow instrumentation must preserve OFF/ON solution, work, ordering, and randomness.

<a id="producer--receptor-cooperation"></a>
## Producer -> receptor cooperation

A live handoff requires:

1. measured receptor limitation;
2. useful producer information the receptor cannot cheaply rediscover;
3. timely arrival;
4. bounded replay/storage/branching cost;
5. an independent receptor control path;
6. positive shadow evidence;
7. a level-blind matched-work verdict.

Useful information can still hurt if consuming it displaces successful receptor work. Evidence for individual handoffs does not imply a universal artifact blackboard. Original design: [`archive/snapshots/solver-interoperability-and-cooperation-plan.md`](archive/snapshots/solver-interoperability-and-cooperation-plan.md).

## Family/variant evidence

Use the off-main trove for controlled diagnosis, not production retries or independent-row bulk statistics. Useful patterns include symmetry cliffs, local solved/unsolved boundaries, technique changes across relatives, re-embedding/density effects, and held-out-parent generalization. See [`variant-level-research.md`](variant-level-research.md).

<a id="accepted-path-differential-diagnosis"></a>
## Accepted-path differential diagnosis

For a valid human/AI/oracle/variant path:

1. referee-validate and record provenance;
2. keep it out of the cold solve;
3. locate where unchanged search first diverges, rejects, or loses compatible prefixes;
4. identify the score/prune/state/width/routing boundary;
5. require recurrence across unrelated levels or held-out families before changing production.

Narrative explanations are not causal evidence; accepted path + trace is. Historical note: [`archive/snapshots/ai-assisted-manual-solving.md`](archive/snapshots/ai-assisted-manual-solving.md).

## Promotion contract

Production-facing treatments normally require level-blind execution; identifiable code/protocol state; complete intended population or explicit sample; non-binding deadlines when work comparability matters; comparable arms with declared treatments; gains and losses; `workSpent`, nodes, errors, and deadline truncation where relevant; Corpus 1/2 and published transfer/cost checks as appropriate; no hidden hint/data mutation; and queue/ledger updates when disposition changes.

A direct small negative may close an unchanged mechanism. A promising small result normally nominates a broader gate rather than promotion.

## Documentation handoff

- measurements/chronology -> dated report;
- ranked state -> [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- retained/default-off disposition -> [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- durable behavior/interpretation -> topic/tool contract;
- concluded plans -> archive.
