<!-- agent-context-budget: warn=14000 max=18000 -->
# Question-state propagation and attention allocation audit 001

> **Status:** concluded-positive-with-navigation-repairs
> **Last evidence:** 2026-09-14 — inference-first reconstruction of the current question registry, workstream/future-work authorities, capability memory, experiment ledger, status/query tooling, the selected transition sample, and upstream Audit 1/2/3 findings from PRs #1795/#1796/#1794.
> **Decision:** Pathfinder's current priority authority is substantially sound, but the sparse question-state layer had three decision-bearing propagation faults: admissible-order repricing was labelled closed despite being scientifically unanswered/deferred; fixed-endpoint homotopy remained marked active after a coverage-null result had already moved the live Class-5 gate to open-path topology; and portal coarse-state global closure/freshness/dead-last allocation lacked separate stable question identities, allowing promotion failure to obscure retained capability and its live allocation successor. Ordinary-language question discovery also failed unnecessarily on punctuation variants. These are repaired without creating a second queue or priority score.
> **Remaining gate:** reconcile PR #1796's canonical workstream narrowing for Class 3 when the parallel audit branches are merged. No new solver compute is earned by this audit.
> **Evidence role:** inference/resource audit of belief propagation into future research attention; no solver-policy change.
> **Audit:** inference-first research Audit 5

## Bottom line

The dangerous path in this audit is:

`good evidence -> wrong remembered question state -> wrong next action`

Pathfinder is already fairly good at preventing that failure in its strongest authorities. `solver-optimization-workstreams.md` remains the sole priority queue, `solver-future-work.md` usually preserves deferred/reopen boundaries, the opt-in ledger separates production disposition, and capability memory explicitly preserves capability after a negative promotion decision. The failures found here were mostly in the sparse navigation layer between those authorities.

Three faults were material enough to change what a competent fresh researcher could do next:

1. **Admissible-order repricing:** the relation registry marked the causal repricing question `closed-tested-form` even though the evidence showed zero target-stage work and the same record said the question remained deferred. The nominal experiment did not answer the repricing question.
2. **Class-5 topology:** the relation registry still marked the fixed-endpoint homotopy question active after the current census had already closed that formulation for coverage and moved the live gate to a distinct open-path signature/reference question.
3. **Portal coarse-state capability:** current authorities correctly remembered the global promotion negative and the live dead-last allocation gate, but the relation graph had only a freshness record. It lacked stable identities separating the closed global form from the live allocation successor. A query could therefore encounter either “closed negative” or “fresh 8/8” without a graph edge explaining how both are simultaneously true.

A fourth propagation repair applies provisional upstream Audit 2 evidence: the cheap-harvest relation no longer calls Class 3 “exposed-and-failed.” It now says the atlas proves exact dispatch/reach but not exact-action nonzero/comparable dose. The canonical workstream implementation of that same correction remains intentionally owned by PR #1796.

No priority order changes. The current WS2 gates remain Class-4 allocation, Class-2 must-turn economics, and Class-5 open-path topology acquisition.

## Current question-state architecture

The current research-state machinery is deliberately layered rather than centralized:

| Surface | Owns | Does not own |
|---|---|---|
| `docs/solver-optimization-workstreams.md` | current priority, ranked workstream state, next gates | historical evidence archive |
| `docs/solver-research-question-relations.json` | sparse stable question identities and material cross-question relations | priority rank or complete research inventory |
| dated reports | observations, experiment scope, interpretation, closeout | current priority after later evidence |
| `docs/solver-opt-in-experiment-ledger.md` | default-OFF mechanism disposition/reopen boundary | retained capability valuation |
| `docs/solver-capability-memory.md` + derived views | demonstrated/complementary capability and nominations | automatic promotion or priority |
| `docs/solver-future-work.md` | deferred/reopen questions and boundaries | second active queue |
| `scripts/research-status-index.mjs` | discovery across current authority, experiments, reports and questions | truth reconciliation or priority |
| research-asset query/tooling census | evidence/tool discovery | question disposition or priority |

The question registry remains intentionally sparse. That is healthy. Its job is to preserve transitions whose loss would cause rediscovery or incorrect closure, not to turn every report sentence into a graph node.

### Structural census

Before this audit the registry contained **13** stable questions:

- 9 `closed-tested-form`;
- 1 `active-candidate`;
- 1 `active-diagnostic`;
- 1 `concluded-positive`;
- 1 `deferred-reopen`.

After the repairs it contains **16**:

- 10 `closed-tested-form`;
- 2 `active-candidate`;
- 1 `active-diagnostic`;
- 1 `concluded-positive`;
- 2 `deferred-reopen`.

The added identities are not new work. They make existing current authority navigable:

- `WS2-PORTAL-COARSE-GLOBAL-MERGE`;
- `WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION`;
- `WS2-OPEN-PATH-TOPOLOGY-SIGNATURE`.

Question relationships currently use `answeredBy`, `triggeredBy`, `implies`, `constrains`, `constrainedBy`, `calibrates`, `calibratedBy`, `negativeControlFor`, and reopen conditions. The documentation also permits `supersedes` and `duplicateOf`; the validator previously did not check those targets. It now does. `constrainedBy` remains intentionally mixed because its values can be question IDs, reports, or current authority documents.

The audit found no reason to add a new relation type or schema version. The existing vocabulary can express every material transition found here.

The graph is not a priority graph. Active question state does not mean “work this first.” Workstreams remain the authority for that decision.

## Frozen transition sample

The sample was frozen around distinct propagation failure modes rather than convenient reports:

| Transition | Failure mode exercised | Expected current state |
|---|---|---|
| portal coarse-state global merge -> retained capability -> freshness -> dead-last allocation | negative promotion erases capability or successor | global form closed; capability retained; allocation successor live |
| class-1/2/3 cheap-harvest -> must-turn late additive | broad negative erases narrower capability | generic harvest closed; concrete rescue retained; economics live |
| categorical full-pool archaeology correction | already-run experiment rediscovered as untried | tested quota forms closed; new categorical premise requires new evidence |
| structural diversity -> scalar feasibility -> dead-cause/categorical -> topology descendants | closed parent hides live descendant or resurrects tested forms | tested descendants stay closed; distinct topology premise remains live |
| capability union correction, roughly “65-ish” -> 179 | stale aggregate steers capability valuation | current authorities use 179 and preserve class-specific interpretation |
| admissible-order retry repricing | plumbing availability mistaken for scientific activation; non-participation mistaken for negative | question deferred; reopen requires residual nomination plus real differentiated work |
| fixed-endpoint homotopy -> open-path topology | coverage null mistaken for premise failure or stale active form | fixed-endpoint form closed for coverage; open-path representation live |
| Class 3 atlas semantics | dispatch/reach mistaken for comparable-work failure | scope narrowed unless exact-action dose is joined |

Portal coarse-state also serves as the required explicit case of **negative production disposition with retained capability**.

## Evidence-to-question reconstruction

### Portal coarse-state chain

**Primary observation.** The frozen 954-level portal A/B produced 158 referee-valid gains and 12 losses, net +146. `R01273` was a hard capability regression that persisted at 10x the frozen envelope. The subsequent deterministic collision forensic showed a real coarse-key blind spot in trailing visited-cell identity. Bounded second-survivor and predecessor-history key extensions delayed but did not eliminate the failure.

**Narrow inference earned.** The globally enabled form fails its own promotion/rare-capability-retention contract. The bounded salvage forms tested in the collision forensic also close.

**What it does not answer.** It does not show that portal coarse-state merge lacks useful capability. The same A/B demonstrated a very large positive basin. The later capability-memory reconstruction intersects 137 historical gains with the current residual, including 113 class-4 rows.

**Successor.** A tiny current freshness sample reproduced 8/8. The live question is therefore allocation: expose the capability only in a true dead-last additive whole-ladder retry, first under a canary that includes the eight freshness rows, `R01273`, and non-portal controls, then on the 113-row nominated population if the canary passes.

**Suppressed work.** Do not re-enable the global form. Do not retry the same predecessor-history/subkey or one-extra-survivor salvage shapes. Do not treat the 158-gain set as a production recommendation.

**Reopen boundary.** The global question reopens only for a materially different global mechanism that removes the demonstrated regression mechanism. A narrower allocation descendant does not reopen the global tested form.

**Capability memory that survives.** The +158 historical gain basin, current residual nominations, and 8/8 freshness result remain legitimate capability evidence. The 179-source union is a derived coverage/complementarity view, not a second independent confirmation of the same portal A/B.

**Propagation finding.** Ledger, workstreams, future-work, and capability memory were scientifically aligned. The question graph was under-specified. The audit adds separate stable global and dead-last identities with the freshness question linking them.

### Cheap-harvest -> must-turn successor

**Primary observation.** The class-1/2/3 rejoin found no broad free batch. Separately, the 7M must-turn-biased late repair pilot and production-ladder replay reproducibly rescue `R02768` and `R02180` after ordinary late repair genuinely participates and fails. `R03049` was correctly removed from the “guidance” shorthand because standard repair already solves it.

**Narrow inference earned.** The broad cheap-harvest form does not justify a direct batch. The must-turn descendant has real current rescue capability and correct late placement.

**What it does not answer.** The two development rescues do not establish eligible-population economics or acceptable collateral.

**Successor.** The existing `WS2-MUST-TURN-LATE-ADDITIVE` question correctly asks for a bounded participant-aware 60-row economics/collateral A/B at the earned 7M treatment.

**Suppressed work.** Do not broaden toward slower historical winners merely to harvest IDs. Do not jump directly to default-on promotion or family generation.

**Propagation finding.** The tested-form/premise distinction already worked well here. The only propagation correction is the upstream Audit 2 Class-3 wording: the cheap-harvest parent no longer describes the 37 Class-3 rows as a comparable-work failure merely from atlas dispatch/reach evidence.

### Categorical/full-pool archaeology correction

**Primary observation.** The August full-pool survivor projection did run over 207 captured ranked pools. Its prespecified low-cardinality fixed-width quota/bucketing keys failed to retain the available exact-LIVE alternatives and showed no recurring advantage over generic reserve/width controls.

**Narrow inference earned.** Those tested quota keys/forms are closed.

**What it does not answer.** It does not close every categorical survivor premise. A materially different categorical key or mechanism independently nominated by new exact-labelled evidence remains possible.

**Suppressed work.** Do not rerun the August experiment merely because a later archaeology summary forgot its closeout. Do not fit more fields to the same four historical parents without an independently motivated discriminator.

**Propagation finding.** The current registry already had the right scientific state and explicitly recorded the archaeology correction. The discovered weakness was navigation: ordinary `full pool` vocabulary could miss the hyphenated record. Search normalization and an explicit alias remove that needless rediscovery risk while preserving the historical report unchanged.

### Generic structural-diversity descendants

The current descendant chain is scientifically coherent:

`generic structural diversity` -> `simple future feasibility` -> `dead-cause recurrence / categorical full-pool` -> `fixed-endpoint homotopy` -> `open-path topology signature`

Generic diversity is closed in its tested forms because preserving coarse progress did not preserve viable future optionality. Six scalar feasibility summaries then failed to separate exact-LIVE from exact-DEAD material. Current-population compact dead-cause extraction closed for insufficient prevalence. The August categorical full-pool quota forms are historically closed. These negatives constrain later work without collectively proving that all representation/topology premises are false.

The propagation defect occurred at the final transition. Workstreams and future-work had already incorporated the 2026-09-13 fixed-endpoint homotopy coverage null. The question graph had not. It still called fixed-endpoint homotopy the active Class-5 gate.

The audit changes that record to `closed-tested-form` with a precise coverage-null result and explicit reopen condition: sufficient future same-level/same-start/same-endpoint LIVE/DEAD groups. It adds `WS2-OPEN-PATH-TOPOLOGY-SIGNATURE` as the active successor, preserving all predecessor negatives as constraints rather than erasing them.

### Capability-union correction

**Primary observation.** A current summary once said the six-source capability union was roughly 65 rows even though portal coarse-state merge alone nominated 137. Mechanical reconstruction produced a 179-row union: 14/28/21/116/0 across Classes 1-5.

**Narrow inference earned.** Known capability remains highly relevant to easier residual classes, especially Class 4, but the bounded source panel reaches none of the 431 Class-5 rows.

**What it does not answer.** The union is not a count of independent causal confirmations and not an additive solve forecast. Several entries are historical signatures/nominations rather than current protocol-compatible capability.

**Propagation finding.** Current workstreams, capability-memory contract, and question registry already use 179 and preserve the class-specific meaning. No current navigation authority found in this pass continues to route from the stale 65 figure. The audit adds an explicit ancestry qualification to the registry so future readers do not count a derived union as independent evidence.

### Admissible-order retry repricing

**Primary observation.** The nominal production A/B recorded target retry attempts but allocated/spent zero useful target-stage work after upstream exhaustion. Ordinary admissible-order search also ignored the soft per-tier work cap, so 1.0 versus 0.18 was not actually a dose comparison. A later default-off enforcement seam makes a valid experiment technically possible.

**Narrow inference earned.** The unchanged production path could not answer repricing. The enforcement seam is an architecture prerequisite, not scientific evidence that the question deserves attention now.

**What it does not answer.** There is no causal negative for repricing from the zero-work experiment.

**Reopen condition.** Current residual evidence must again isolate ordered-systemic loss, and a cheap enforcement-path canary must prove nonzero fraction-differentiated target-stage work under a production-shaped cap.

**Propagation fault.** Future-work and the ledger correctly say DEFERRED. The relation record itself was `closed-tested-form`. Because its stable ID names the causal repricing question rather than the invalid nominal execution form, that state was wrong. It is now `deferred-reopen`.

### Current Class-5 open-topology chain

The live acquisition frontier is not “try more diversity” and not “rerun winding.” Current evidence has constrained:

- generic width/retention/diversity rescue;
- `swap`/`cs` and broad known-capability composition;
- six scalar future-feasibility summaries;
- current-population compact dead-cause reuse;
- low-cardinality full-pool categorical quotas;
- rigorous fixed-endpoint winding, by lack of eligible contrast rather than topology failure.

The live question is whether a mathematically defensible **open-path topological signature/reference system** can encode already-incurred topological commitment without arbitrary endpoint-closure signal. It needs an invariance argument and endpoint-identity controls before new labels or runtime changes are justified.

This is acquisition work because the bounded current capability panel reaches zero Class-5 rows. It remains a premise, not yet a runtime feature nomination.

### Class 3 observability correction

PR #1796 establishes that the current residual atlas's Class-3 predicate proves exact dispatch plus coarse family/stage non-starvation, not exact-action nonzero `workSpent` or comparable dose.

The older propagation phrase “class 3 is exposed-and-failed” was therefore too strong. This branch narrows the question relation immediately, because leaving the old sentence would preserve exactly the kind of stale broad claim this audit targets. It does **not** copy #1796's residual-classification implementation or canonical workstream edit.

The correction does not overturn the current WS2 execution order. It does remove one unsupported reason to suppress future exposure/scheduler investigation on a specific Class-3 row. A comparable-work negative still requires the stronger row-level exact-action dose join.

## Navigation fault injection

The intended empirical question was not precision/recall. It was whether ordinary repo entry points could make a competent fresh agent take a materially wrong or duplicative action.

This environment did not provide a local repository checkout with working network DNS, so the CLIs could not be executed interactively from the audit session. Instead the audit inspected the exact query implementations, current authority inputs, and report graph, then converted the most important fault injections into assertions in the repository's existing `test:research-index` suite. CI therefore exercises them against the real tracked question registry rather than a hand-written audit benchmark.

### “Should we try portal coarse-state merge again?”

**Before repair:** likely first surfaces were the opt-in ledger's strong `PROMOTION CLOSED NEGATIVE` or the freshness record's 8/8 result. Both are individually true, but the question graph did not expose a stable active dead-last successor. Depending on entry point, a researcher could infer “portal merge is dead” or “portal merge should come back.”

**Important hidden qualification:** global placement and retained capability are different claims. The hard regression is a control on the successor, not evidence that the positive basin vanished.

**After repair:** `portal coarse` exposes the closed global question, concluded freshness question, and active dead-last allocation successor. The global record is a negative control for the successor.

### “Has categorical projection been tried?”

**Before repair:** scientific state was already correct, but literal question search could miss `full-pool` when queried as `full pool`.

**Risk:** unnecessary repeat of a finished 207-pool experiment, especially because the September archaeology mistake is part of the history.

**After repair:** punctuation-normalized question lookup and aliases make the closed categorical question discoverable from ordinary vocabulary. The historical report remains untouched.

### “Should admissible-order retry be revived now?”

**Before repair:** ledger/future-work said deferred, but the stable relation record said closed-tested-form. A fresh agent following the question graph could suppress the causal question permanently; one following the existence of the new enforcement seam could make the opposite error and run it immediately.

**After repair:** the stable question is `deferred-reopen`; the record states that plumbing is not scientific activation and carries the exact two-part reopen condition.

### “What is the current Class-5 question?”

**Before repair:** workstreams/future-work said open-path topology; the only active Class-5 relation record still described fixed-endpoint homotopy. This was a direct current-authority contradiction capable of sending a fresh agent back to a finished coverage-null observer.

**After repair:** fixed-endpoint homotopy is closed for coverage, and `topology` with active status routes to `WS2-OPEN-PATH-TOPOLOGY-SIGNATURE`.

### “Did a negative production result eliminate the underlying capability?”

The portal chain is the calibration case. The correct answer is no: +158/-12 fails global promotion while retaining a large positive capability basin, later current freshness evidence, and a narrower allocation question. Capability memory already encoded this distinction well; the question graph now does too.

### “What is the must-turn question?”

The science state was already healthy. The live question is economics/collateral, not capability acquisition. The fault was only lexical: `must turn` need not exactly match `must-turn`. The generalized punctuation normalization repairs this without introducing a solver-specific alias system.

## Reverse propagation from recent decision-bearing evidence

### Audit 1 / PR #1795

Audit 1 strengthens rather than overturns most current state:

- portal global merge remains the clean disposition/capability split calibration;
- admissible-order nominal attempts with zero target work remain non-participating, so the causal repricing question must not be called answered;
- tested-form negatives do not erase descendants;
- clean negatives should not be reopened merely because primary Actions rows will eventually expire.

The only question-state repair directly required here was the admissible-order state label. The Actions-retention weakness is infrastructure/reconstructability work, not a solver priority question and therefore does not belong in this graph merely because it is important.

### Audit 3 / PR #1794

Audit 3 requires caution in how support strength is described, not a new solver gate. Accepted-path representative and observed-set diagnostics can be path/basin conditioned, and family/hint/profile/path surfaces often share replay ancestry.

The current `WS1-CROSS-HINT-EVENT-COLLISIONS` record already warns that repeated paths sharing one discovery-event identity are dependent evidence. No live question in the frozen sample requires a new edge solely because #1794 exists. Reconciliation should preserve the broader ancestry warning without pretending several path-derived reports are independent confirmations.

### Audit 2 / PR #1796

Audit 2 has one direct propagation consequence: Class 3 cannot be remembered as “comparable-work failed” from atlas classification alone. This branch narrows the sparse question record; PR #1796 already owns the corresponding canonical workstream and residual-classifier implementation changes.

No current Class-2, Class-4, or Class-5 gate reverses. Class 5 remains the strongest acquisition frontier; Class 2/must-turn remains an economics/exposure frontier; Class 4 remains allocation work around preserved portal capability.

## Attention-allocation audit

No universal score is needed. The important question is whether the inputs reaching the priority authority are semantically sound.

Current machinery passes most of that test:

- **Live gates expose their important constraints.** Workstreams names the Class-4 canary/regression control, Class-2 participant/economics requirements, and Class-5 invariance/endpoint-control gate.
- **Satisfied gates mostly stop consuming attention.** Global portal promotion, categorical quotas, current-population dead-cause reuse, and fixed-endpoint winding are closed in their tested forms.
- **Deferred work mostly stays deferred.** Future-work and the opt-in ledger were already correct on admissible-order repricing. The graph is now aligned.
- **Tested-form closure mostly preserves surviving premises.** Generic diversity, scalar descriptors, categorical quotas, and fixed-endpoint winding each close a specific form while leaving narrower/distinct descendants possible only under explicit new evidence.
- **Plumbing availability does not create scientific priority.** The admissible-order enforcement seam remains a prerequisite, not a queue entry.
- **Capability memory nominates without ranking.** Portal capability earns a reconciliation/allocation question, but the actual priority comes from WS2, not from the size of the union.
- **Cheap decisive evidence remains ahead of broad compute.** Class-4 uses a canary before 113 rows; Class-5 asks whether a defensible representation exists before buying labels or runtime experimentation; admissible-order requires a cheap participation canary before population compute.

No new opportunity was found that should jump ahead of the existing WS2 gates.

## Independence and repeated evidence

Several apparently numerous support surfaces collapse to fewer causal observations:

- **Portal global A/B -> capability union intersection.** The 137/179 capability-memory numbers reuse the historical portal gain set. They are a useful current-residual join, not independent confirmation of the original capability.
- **Portal freshness replay.** The 8/8 current replay is a distinct current-code observation, but it is deliberately sampled from the historical positive basin. It establishes freshness of that basin, not unbiased population prevalence.
- **Categorical projection + archaeology correction.** These are one historical experiment plus a later correction of whether it had run, not two negative experiments.
- **Class-3 atlas + cheap-harvest prose.** The latter consumes the former classification. Audit 2's correction narrows one ancestry chain rather than adding independent evidence against Class 3.
- **Accepted-path/profile/family agreement.** Per Audit 3, replay-derived hints, profiles, representative-path diagnostics and family results may share one discovery/replay ancestry. Agreement is often coherence rather than replication.
- **Historical complete-solution topology + current fixed-endpoint census.** These are meaningfully distinct observations: the former nominates a topology axis in completed solutions; the latter observes that the current exact-prefix population lacks the paired endpoint coverage needed to test that axis rigorously. The coverage null does not contradict the historical nomination.

## Stale broad-claim attack

Material broad claims found and dispositions:

| Broad claim | Problem | Repair / current interpretation |
|---|---|---|
| “class 3 is exposed-and-failed” | dispatch/reach was broader than exact-action nonzero/comparable dose | narrowed in question graph; PR #1796 owns canonical workstream/code correction |
| admissible-order repricing `closed-tested-form` | intended causal comparison never received target work | state changed to `deferred-reopen`; zero-work execution does not close repricing |
| fixed-endpoint homotopy `active-diagnostic` | current authority already closed it for coverage and moved on | fixed-endpoint form closed; open-path successor active |
| “portal merge negative” | can erase +158 capability and 8/8 freshness | separate closed global and active allocation questions |
| stale capability union around 65 | impossible set aggregate, previously capable of undervaluing Class 4 | current authorities already repaired to 179; no current 65 navigation authority found |
| “categorical projection unfinished/never tried” | archaeology mistake could cause duplicate experiment | current registry/report already correct; discoverability hardened |

No current authority was found making the stronger claims “portal coarse state has no capability,” “topology premise failed,” or “Class 5 should be solved by known capability composition.” Those are important negative findings.

## Discoverability findings

Question-state discovery is the correct layer to improve before inventing new schema.

The existing `research-status-index` already joins questions with reports and experiments. Its report-side search has substantial solver identity aliasing support. The question-side helper, however, was literal JSON substring matching. That made trivial punctuation differences scientifically relevant to navigation.

The repair normalizes hyphens and underscores to spaces for question lookup and preserves raw matching. Thus `must turn`, `full pool`, and `admissible order` discover their canonical records. Optional `aliases` are reserved for genuine vocabulary differences such as `topology` versus `topological`, or for common names such as `portal merge`.

The relation validator now also checks question-ID targets in `supersedes` and `duplicateOf`, matching the documented relation vocabulary. No current record needs those edges yet.

`research-asset-query` and `tooling-census` remain useful lateral discovery surfaces. They should not be made to answer question disposition or priority, because doing so would duplicate the question graph/workstream boundary.

## Duplicate/superseded-work risks

The highest duplicate-work risks before repair were:

1. rerunning the August full-pool categorical projection because an archaeology summary had once called it unfinished;
2. rerunning the fixed-endpoint homotopy observer even though it already closed for coverage and the live question had moved to open-path representation;
3. launching admissible-order repricing merely because the enforcement seam now exists, or permanently suppressing it because the graph called it closed;
4. reopening global portal merge instead of testing the already-defined dead-last allocation descendant;
5. treating a Class-3 atlas label as sufficient reason to avoid exact-action dose/exposure investigation.

The repair targets each risk at the lowest useful layer.

## Missing or incorrect successors/reopen conditions

Repairs made:

- added the missing stable `portal global -> freshness -> dead-last allocation` successor chain;
- changed fixed-endpoint homotopy to closed coverage-null and added its open-path successor;
- preserved a specific fixed-endpoint reopen condition instead of leaving the old form indefinitely active;
- changed admissible-order repricing from false closure to deferred with its already-established two-part reopen condition;
- clarified that a narrower portal allocation descendant does not reopen the closed global form.

No evidence supported adding automatic reopen machinery. Explicit conditions plus workstream reconciliation remain sufficient.

## Negative disposition versus retained capability

Portal coarse-state merge is the strongest current calibration. Production promotion is negative because at least one specialist capability is destroyed. The positive basin is nevertheless large, referee-valid, currently intersecting the residual, and fresh on the bounded replay sample.

This is exactly why disposition and capability memory are separate axes. The repo's capability-memory contract handled this well. The graph repair prevents a future agent from losing that distinction when navigating by question rather than by capability report.

The same principle already works for the negative global goal-attraction swap and its useful dead-last descendant. No repair was needed there in this audit sample.

## Tested-form failure versus premise survival

The current Class-5 chain contains several healthy examples:

- generic diversity machinery can fail while future optionality remains a live concept;
- six scalar descriptors can fail while a mechanism-specific/topological representation premise remains possible;
- low-cardinality categorical quota keys can fail without closing every independently motivated categorical survivor mechanism;
- fixed-endpoint winding can be coverage-null while open-path topology remains scientifically unanswered;
- a portal global merge can fail promotion while a dead-last allocation form remains viable.

The repair makes these boundaries navigable rather than merely inferable from chronology.

## Reconciliation notes for parallel PRs

### PR #1794

Do not copy its accepted-path implementation changes here. When reconciling, preserve its path/oracle conditioning and causal-ancestry caveats as evidence-weight constraints. No current priority reversal follows from Audit 3 alone.

### PR #1795

No file overlap is required. Its lifecycle finding reinforces the admissible-order deferred repair and the portal capability/disposition split. Do not reopen clean negatives because old primary rows become hard to reconstruct. Its durable-retention follow-up remains research infrastructure, not a new solver-priority question.

### PR #1796

This is the only material semantic overlap. PR #1796 changes the canonical workstream and residual-classifier implementation so Class 3 means dispatched/reached with exact-action dose unverified. This branch changes only the sparse question propagation layer. Reconciliation should preserve both. Do not keep the old workstream phrase `exposed-and-failed` after merging the branches.

## Explicit negative findings

Several important parts of the system worked correctly:

- workstreams already owned the correct Class-2/Class-4/Class-5 execution order;
- future-work already had the live open-path topology gate and deferred admissible-order boundary;
- capability memory explicitly separates negative promotion from retained capability;
- the opt-in ledger correctly preserves global portal +158/-12 while closing promotion;
- categorical archaeology had already repaired the “never run” historical mistake in current question state;
- the 179 capability union correction had already propagated into current authority;
- must-turn capability was already separated from economics/promotion;
- no new solver compute was needed to resolve any propagation ambiguity;
- existing relation/state vocabulary was sufficient, so no belief-graph schema expansion was justified.

## Repairs made

1. Added stable portal global and dead-last allocation question identities, linked through the existing freshness record.
2. Changed admissible-order repricing to `deferred-reopen` and made explicit that zero-work nominal execution did not answer the causal question.
3. Closed the fixed-endpoint homotopy form for coverage and added the current open-path topology successor.
4. Narrowed the cheap-harvest Class-3 result to dispatch/reach with exact-action dose unverified, pending parallel #1796 reconciliation.
5. Added ordinary-language aliases only where semantically useful.
6. Made question lookup punctuation-tolerant for hyphen/underscore/space variants.
7. Added `supersedes` and `duplicateOf` target validation to match documented relation vocabulary.
8. Added real-registry navigation regression assertions to `test:research-index` for portal coarse, admissible order, full pool, topology, must turn, and dangling relation edges.

No solver behavior, experiment lifecycle machinery, accepted-path code, residual classifier, opt-in disposition, or priority order is changed on this branch.

## Methodology failures and discarded approaches

**Interactive CLI fault injection was unavailable in-session.** The execution environment could access the repository through the GitHub connector but did not have a local checkout with working GitHub DNS. A direct clone attempt failed with `Could not resolve host github.com`. Rather than report invented command output, the audit inspected the exact CLI/query implementations and encoded the material fault injections as repository-level `test:research-index` assertions for CI.

**No artificial precision/recall benchmark.** Counting query hits would have rewarded noisy search. The test criterion remained whether a fresh competent agent could take a materially wrong next action.

**No workstream edit duplicating PR #1796.** Copying its Class-3 canonical-authority change here would create unnecessary overlap between still-unmerged parallel audit branches. This report records the reconciliation requirement and repairs only the question layer.

**No universal priority score or belief graph.** The failures were expressible with existing states, relations, reopen conditions, aliases, and authority boundaries. A new scoring/schema framework would have added bureaucracy without solving an observed decision failure.

**No solver reruns.** Every decision-bearing ambiguity in the sample was resolvable from retained evidence/current authorities. New compute would have tested science rather than propagation and was therefore out of scope.

## Solver-oriented summary

### Questions currently safe and correctly represented

- Must-turn late additive: current rescue capability and placement are established; economics/collateral is the remaining gate.
- Capability-memory complementarity: 179-row bounded union, zero reach into current Class 5, strong Class-4 nomination, with historical/current evidence distinctions preserved.
- Generic structural diversity, scalar future-feasibility, current-population compact dead-cause reuse, and August categorical quota forms: closed only in their tested forms with sensible reopen boundaries.
- Mechanic-composition causality: current confounding/calibration role remains correctly limited.
- WS6 dependency-conditioned repair: deferred until current evidence implicates an interior/early commitment.

### Questions whose scope needs narrowing

- Class 3: dispatch/reach does not establish exact-action nonzero/comparable dose. PR #1796 owns the canonical workstream/code correction; this branch repairs the relation-layer memory.
- Portal global merge: the negative is a production/global-placement verdict, not a capability-absence verdict.
- Capability union: 179 is coverage/complementarity headroom, not independent causal support from 179 observations.

### Questions that are genuinely live

- Class-4 portal coarse-state **dead-last additive allocation/economics**.
- Class-2/must-turn-biased **eligible-population economics/collateral**.
- Class-5 **open-path topological signature/reference construction**, beginning with representation validity rather than runtime intervention.

Priority among these remains exactly as owned by `solver-optimization-workstreams.md`.

### Questions that are deferred and why

- Admissible-order retry repricing: the previous production comparison had zero useful target-stage work; the new enforcement seam is only plumbing. Reopen after a current ordered-systemic residual nomination plus a canary proving real fraction-differentiated target work.
- WS6 dependency-conditioned repair: reopen only when current exact-labelled/repair evidence points to an earlier interior commitment outside append-only continuation.

### Tested forms that should remain closed

- globally enabled portal coarse-state merge;
- the tested bounded portal predecessor/subkey/extra-survivor salvage shapes;
- August low-cardinality full-pool categorical quotas;
- generic diversity/width/retention rescue in the tested forms;
- six scalar future-feasibility summaries;
- current-population compact connectivity/dead-cause reuse;
- rigorous fixed-endpoint homotopy/winding under the current contrast-starved population.

### Premises that remain alive despite negative tested forms

- portal capability under safer allocation;
- future optionality/representation beyond generic diversity and scalar descriptors;
- topology through a defensible open-path representation after fixed-endpoint coverage failure;
- materially different categorical survivor mechanisms only if independently nominated by new evidence;
- admissible-order repricing if current residual evidence and real participating dose re-earn it.

### Capabilities retained despite negative promotion

- Portal coarse-state merge: +158 referee-valid global-treatment gains, current residual nominations, and 8/8 bounded freshness evidence remain capability memory despite promotion closure and a hard regression.
- More generally, capability-memory policy correctly preserves useful negative-treatment basins without turning them into priority or exact-level runtime steering.

### Duplicate work a fresh agent might otherwise repeat

- August full-pool categorical projection;
- fixed-endpoint winding census;
- unchanged global portal merge or already-failed salvage shapes;
- a nominal admissible-order repricing experiment without proven target work;
- Class-3 exposure conclusions derived solely from dispatch/stage reach.

### Newly exposed opportunities, if any

No new priority opportunity was discovered. The audit instead makes the already-earned live boundary harder to miss: portal dead-last allocation, must-turn economics, and open-path topology. That is the intended success condition for a propagation audit.
