# Solver research operating model

> **Status:** current research-method/evidence-routing contract.
> **Priority:** [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
> **ASAP programs:** evidence-driven scheduling/allocation ([`solver-scheduling-policy.md`](solver-scheduling-policy.md)) and architectural solver speed ([`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md)) are both **HIGH PRIORITY**.
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

## Scheduling and allocation research

The active scheduling program is [`solver-scheduling-policy.md`](solver-scheduling-policy.md). Treat it as an evidence-integration problem, not permission to replace one fixed ladder with another.

For ordering/allocation work:

- optimize **marginal value on the population that actually reaches the decision point**, not total historical solve rate;
- use stable action/config identities and explicit budget bands where budget depth changes value;
- prefer conditional success after observed predecessor failure over unconditional winner counts;
- compare actions inside a fixed shared work envelope by default; a new action expands the candidate menu rather than silently increasing total work;
- audit whole-ladder retries and additive tail stages for current unique residual wins and substitutability before adding more;
- keep known solutions, variant outcomes, regression history, and exact-level winners offline as labels; distill them into generic level/state descriptors before runtime use;
- use parent-family splits for variant-trained/tuned routing rules;
- begin with offline oracle/frontier analysis and shadow planning before a live scheduler changes production order.

A scheduler policy can be simple and deterministic. Statistical or ML models may discover candidate rules offline, but promotion evidence must still identify the legal runtime features and matched-work behavior being changed.

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

For the scheduling program specifically, extend the existing technique-census second-order/lifecycle/family query substrate before creating a new store. Historical portfolio code may be reused as plumbing only after checking its closed decision record; the old broad cold-start portfolio result is not an active hypothesis.

## Shadow first

For scoring, retention, routing, scheduling, or information-sharing hypotheses, observe before changing search. Ask whether a descriptor separates exact-live/dead siblings, a reasoner catches extra dead branches without false rejects, a producer emits novel useful information, a routing feature predicts isolated capability rather than historical winners, or a proposed scheduler chooses higher-value residual work than the live ladder at the same envelope.

Unless parity is the experiment, shadow instrumentation must preserve OFF/ON solution, work, ordering, and randomness. A scheduler shadow mode must not alter execution merely by recording its counterfactual next action.

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

For scheduling/classifier rules, split by parent family. A rule that separates siblings it was trained on but fails on held-out families is family memorization, not a production routing result.

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

Scheduling/allocation treatments additionally require the total-work envelope to be explicit. If the treatment can spend more total work than control, either enforce `strictTotalWorkBudget` or report the increased envelope as part of the treatment; do not count additive tail budget as a free solve gain. Report action reach/selection and residual unique wins so a scheduler improvement can be distinguished from simply buying more search.

"Complete intended population or explicit sample" does not default to a full 1700-level `solver-stress-refresh.yml` sweep. For an archetype-gated `ATTEMPT_POLICY` routing change, `solver-archetype-sample-ab.yml`'s deterministic stratified sample (the affected archetype(s) plus a small cross-archetype control) is the explicit sample that answers this contract for that class of change, at a fraction of the wall time — see [`tooling-catalog.md`](tooling-catalog.md) and [`../.github/workflows/README.md`](../.github/workflows/README.md).

A direct small negative may close an unchanged mechanism. A promising small result normally nominates a broader gate rather than promotion.

## Documentation handoff

- measurements/chronology -> dated report;
- ranked state -> [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- durable scheduler policy/program contract -> [`solver-scheduling-policy.md`](solver-scheduling-policy.md);
- retained/default-off disposition -> [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md);
- durable behavior/interpretation -> topic/tool contract;
- concluded plans -> archive.
