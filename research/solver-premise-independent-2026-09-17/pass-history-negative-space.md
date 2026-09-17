# Independent premise-space checkpoint: history, evidence scope, and negative space

Written before opening the quarantine on the recent premise-mapping work.

## 1. Historical research repeatedly separates mechanism existence from mechanism value

The repository has several strong examples where a useful conceptual premise passed one gate but not another:

- `beam-resumability-feasibility-pilot-001.md` establishes that one deterministic beam can pause and resume exactly, including canonical work accounting, but explicitly makes **no scheduler-value claim**.
- `joint-obligation-propagation-observer-pilot-001.md` establishes a sound concrete relational deadlock and strong observer signal, but explicitly makes **no solve-count or work-benefit claim** until a pruning A/B is run.
- `restart-continuation-value-audit.md` establishes alternate-seed complementarity but explicitly denies that this implies fresh restart is better than continuation at equal aggregate work.
- `repair-nogood-cache.md` establishes heavy exact-state rediscovery in repair and validates a local cache, but the implementation's own current contract deliberately remains weaker than a logical nogood certificate.

This suggests a recurring premise lineage that should be represented explicitly:

`phenomenon exists -> mechanism can represent it -> mechanism is sound/faithful -> mechanism fires in real search -> mechanism changes useful work -> mechanism adds complementary solves at equal/relevant cost -> scheduler can expose it economically -> production promotion`

A result at one rung does not automatically license claims at later rungs.

## 2. Negative-result scope audit: concrete examples

### 2.1 Restart research

**Broad question:** after a search trajectory has failed through work `t`, is the next unit of work more valuable as continuation or as a fresh trajectory?

**Established before the direct comparison:** alternate repair seeds can have exclusive solves; additive multi-seed retries can gain solves.

**Not established by additive seed gains:** restart superiority at equal work. Historical multi-seed tiers bought extra work for fresh seeds, and a larger seed fan-out once caused about a 14% published-corpus slowdown because hard failures paid every added seed.

**Primary experiment chosen later:** seed 0 continued to `W` versus seed 0 to `W/2` plus seed 1 to `W/2`, equal canonical `workSpent`.

**Critical scope constraint:** even a negative on this fixed 50/50 treatment does not reject unequal restart schedules. The later harness states this explicitly.

**Broader lesson:** an experiment that freezes one schedule for interpretability can close that schedule while intentionally leaving the parent scheduling question open.

### 2.2 Repair failure memory

**Earlier prior:** independent randomized repair restarts probably do not revisit exact states often, based partly on differently scoped DFS/backtracking evidence.

**Direct premise check:** a per-call exact-signature observer on seven real repair-close levels found very high repeat rates, roughly 54% to 98% overall, falsifying the pessimistic prior for this mechanically different population.

**Implementation:** local cache of matching failed repair states, fresh full signature, one instance per `repairSearchFromGate` call.

**Result:** positive local sample, one rescued solve on the 20-level A/B and directional node savings; full 1,700-level corpus-2 refresh had no solved-set change at a generous budget.

**Warranted conclusion:** repair can waste substantial work rediscovering matching states within one call, and local memory can reclaim work.

**Not warranted:** all repeated states are globally dead; state matching constitutes future-equivalence; persistence across calls/stages would help; no stronger learned-failure abstraction is needed; solved-count value is absent at tighter or differently allocated budgets.

The history is especially instructive because a broad pessimistic belief inherited from a neighboring mechanism was overturned once the actual target mechanism was instrumented.

### 2.3 Joint-obligation feasibility

**Broad question:** can residual failures arise because constraints that look feasible independently are infeasible jointly?

**Concrete descendant tested:** pending must-cross axis forces a portal-terminal neighbor that has already been visited and therefore cannot legally be entered again.

**Evidence:** categorical derivation from existing rules, zero false rejects in oracle-labelled branch replay and stored-solution replay, real-search observer firing, stronger class-5 conditional reject signal than class-4 control.

**Current evidential status in the report:** mechanism nominated and sound; observer-only; actual pruning A/B still required.

**Warranted conclusion:** at least one real pairwise relational obstruction is missed by independently applied checks.

**Not warranted:** relational feasibility is a dominant residual cause; arbitrary pairwise propagation will help; higher-order interactions are needed; the mechanism earns production cost; the specific frontier-class association is confirmatory rather than selected/discovery evidence.

### 2.4 Beam resumability

**Broad question:** can already-paid search state be preserved so later work need not replay/restart?

**Rung tested:** same deterministic beam, same policy, pause/resume equivalence.

**Result:** exact outcome/path/work/node equality after carrying the live frontier and mutable working state forward.

**Important hidden-premise discovery:** reconstructing only the frontier looked semantically sufficient but changed canonical work because state replay itself is charged. A state representation adequate for *search semantics* was not adequate for *work-accounting equivalence*.

**Not established:** dynamic scheduling value, cross-policy continuation value, serialization, cross-process transfer, resumability for DFS/repair, or whether preserving a frontier is better than diversified restart at fixed work.

This is a useful example of an implicit premise exposed by demanding a stronger invariant than solved-set equality.

## 3. Historical premises that changed meaning after architecture changes

Several proposition types are architecture-relative:

- **budget results** before canonical work allocation can confound wall deadlines, nodes, and actual cross-technique consumption;
- **retry economics** change when tiers move from additive fresh reserves to strict-total-work or withheld-reserve schemes;
- **continuation-value questions** change once beam state can actually be resumed instead of replayed from root;
- **state-merging results** depend on what fields current search state represents and which retention mechanism follows the merge;
- **routing results** depend on stage order and the set of downstream techniques available when a route is chosen;
- **negative repair results** from append-only/random-walk repair do not automatically transfer to later repair operators capable of prefix edits, relinking, elite reuse, or local memory;
- **historical corpus labels** are not enough to identify the measurement role because selected residual, full corpus, witness-bearing generated, family variants, and published levels support different claims.

Therefore “was tried before” needs at least an architecture/configuration qualifier before it becomes evidence of closure.

## 4. Research functions recovered independently from history and code

The independent passes converge on a set of research functions that cuts across source modules better than a file-based taxonomy:

1. **Encode:** choose what facts about the partial path, board, obligations, and history are represented.
2. **Derive:** infer legality, feasibility, lower bounds, topology, obligation consequences, or other facts from that representation.
3. **Generate:** decide which successor states, repair mutations, alternative seeds/policies, or stage actions are made available.
4. **Reject:** remove alternatives by logical prune, dominance/equivalence, coarse merge, budget exhaustion, or policy eligibility.
5. **Prefer:** score/order/rank candidates or actions.
6. **Retain:** decide which alternatives survive width limits, bucket quotas, near-tie rules, stage boundaries, and continuation boundaries.
7. **Remember:** carry forward state, frontier, failure experience, witnesses, elites, telemetry, or provenance.
8. **Allocate:** distribute canonical work across candidates, attempts, search families, retries, stages, and seeds.
9. **Select:** condition allocation or policy on level shape, failure evidence, stage history, or diagnostics.
10. **Transfer:** move useful information between phases, attempts, search families, processes, or related level instances.
11. **Recognize:** identify solution, exhaustion, deadlock, timeout, natural failure, or other termination states.
12. **Measure:** define work, progress, coverage, solve contribution, exclusivity, support loss, and experimental population.
13. **Infer from evidence:** decide which empirical result closes which proposition and how far it generalizes.

These are not claimed as a final ontology. Their main use is to expose interfaces: for example, a sound fact may be **derived** but never **transferred** to the stage that could use it; an alternative may be **generated** but systematically fail **retention**; a technique may be capable under **allocation** but never chosen by **selection**.

## 5. A second axis: kinds of authority

Different mechanisms can remove or redirect work under very different epistemic authority:

- rule-level legality / referee truth;
- admissible or provable feasibility consequence;
- safe dominance/equivalence;
- heuristic prediction;
- empirical experience from prior failures;
- diagnostic correlation;
- scheduler prior/static routing class;
- historical default inherited without fresh evidence.

The code often protects these distinctions locally, but research prose can accidentally collapse them. For example, a topology measurement may be diagnostic without being safe to prune on; a nogood-cache hit is empirical experience, not impossibility; an observer can identify a provable deadlock without yet demonstrating economic value.

A useful premise representation must therefore preserve both **what function a piece of information serves** and **what authority licenses its use**.

## 6. Dense regions discovered independently

Research is visibly dense around:

- pruning/lower-bound correctness and targeted mechanic constraints;
- score/order and heuristic variations;
- repair variants and repair seed diversity;
- retry tiers and stage orchestration;
- deterministic work accounting and production-budget discipline;
- residual/corpus measurement and regression containment;
- state merging/retention policy variants;
- generated/witness-bearing stress levels and family variants;
- production promotion gates for small isolated mechanisms.

Density here does not imply conceptual completion. In several cases it means many descendants share the same parent assumption.

## 7. Sparse or fragmented regions suggested by the structure

These are classifications after checking code/history encountered so far, but before the final hostile audit.

### 7.1 Cross-stage information transfer

The solver has sophisticated stage scheduling, but many mechanisms intentionally keep learned information local:

- repair nogood memory dies with one repair call;
- fresh restart seed does not inherit the previous seed's near-miss;
- observer-only relational/topology information does not steer production search;
- beam continuation can preserve one frontier in-process, but this is a research primitive rather than general scheduler state.

The sparse question is not “does the solver have memory?” It plainly does. It is:

> which information has positive conditional value outside the local mechanism that produced it, and under what abstraction can it be transferred without misleading the recipient?

### 7.2 Interface premises

Components are heavily researched individually, while the transformations between them are less naturally named. Examples:

- representation -> prune safety;
- prune survivors -> ranking population;
- ranking -> retention extinction;
- retention -> future repair opportunity;
- early-stage work -> downstream eligibility;
- failed attempt telemetry -> next action selection;
- observer signal -> production policy;
- historical evidence -> current queue authority.

Known-solution prefix survival is a rare tool aimed directly at such interfaces because it can attribute where support disappears.

### 7.3 Failure semantics

Many unsolved outcomes can mean different things: natural frontier exhaustion, budget censoring, wall-clock interference, a locally failed randomized continuation, loss of all known-witness support, or genuinely infeasible state. The repo often distinguishes these in careful reports, but the production research question “why did this level remain unsolved?” can still collapse them.

This suggests an underdeveloped parent question:

> what taxonomy of failure *events* is causally useful for selecting the next solver action, rather than merely descriptive after the fact?

### 7.4 Relational inference

There is now at least one concrete joint-obligation observer, but most historically named checks are mechanic- or constraint-specific. The structure raises the possibility that research has been much denser on unary/local feasibility facts than on interactions among obligations, resource demands, topology, and future access.

The gap must not be phrased as “joint reasoning absent.” It is better phrased as incomplete coverage of the relation space and uncertain economic value of relational inference.

### 7.5 Value of retained search state

Resumability proves a frontier can be retained faithfully, while restart work asks whether fresh trajectories are valuable. Their intersection exposes a larger sparse question:

> which parts of already-paid search state have positive future value, and which are liabilities that make restart preferable?

This is broader than “resume or restart.” A scheduler could preserve a frontier but change policy, preserve elites but discard detailed history, preserve failure certificates but rebuild candidates, or transfer only summary statistics.

## 8. Structurally generated new questions

The following questions were generated from missing links/parents/descendants in the independent structure, not from free-form brainstorming. They remain candidates until the hostile completeness pass searches for historical antecedents.

### Q1. What is the solver's **information half-life**?

For every expensive fact or artifact produced during search, how long does it remain useful and how far can it travel? Examples: a failed-state match, a near-miss, a surviving witness prefix, an obligation conflict, an elite repair prefix, a topology coordinate, a frontier, a route classification, or an attempted seed.

The repo has local answers for several objects but no single reason to expect their useful lifetime to coincide with module boundaries.

### Q2. Can failure be converted from a terminal event into an **actionable posterior**?

Current retries often encode a predeclared theory of what a failure means, such as retrying with one prune disabled or an alternate ordering. Can measured failure signatures update which next action is likely to have marginal value, without requiring an unsound hard classification?

This parent question links diagnostics, routing, stage allocation, and failure memory.

### Q3. Where is **known-valid support destroyed**, and does destruction predict the right intervention?

Known-solution prefix survival can localize loss to generation, hard prune, merge, score-width culling, mechanic/ints retention, or non-generation. The next structural question is whether those extinction causes reliably predict which treatment rescues the level, rather than merely explaining one witness's disappearance.

### Q4. What is the right hierarchy of **state relatedness**?

Logical future-equivalence, dominance, safe coarse representation, heuristic similarity, failed-experience matching, and research clustering have different proof obligations. Can the solver make these layers explicit enough that a relation discovered for one purpose is neither over-promoted nor needlessly discarded for another?

### Q5. Are solver difficulties primarily **missing alternatives** or **misallocated survival**?

For residual levels with a known solution, does search usually fail because the right continuation is never generated/inferred, because it is generated but ranked/retained away, or because it survives but never receives enough downstream work? Existing tools can observe pieces of this decomposition, but the decomposition itself appears more fundamental than many technique-specific hypotheses.

### Q6. How much research is measuring **mechanism value** versus **portfolio value**?

A mechanism can be independently useful but redundant with earlier stages; a weak standalone mechanism can be valuable only on residuals created by another stage. Can evidence systematically separate intrinsic action value from conditional marginal portfolio value?

### Q7. Is the unit of generalization a level feature, a failure state, a search trajectory, or an obligation configuration?

Historical level-blindness discipline correctly rejects level IDs, but “feature-conditioned” need not mean static level-shape features. The correct generalizing object may be dynamic and search-dependent.

### Q8. Which historical negatives are really **measurement negatives**?

Examples include equal nodes used where equal canonical work was required, solved-set equality used where work savings were the mechanism's predicted effect, observer correlation treated as if it were intervention value, or additive-budget gains treated as restart evidence. How many closed branches change status when the measured quantity is aligned with the causal proposition?

## 9. Naming-cleanup resilience

The historical pass has deliberately normalized concepts only after retrieval. Examples already encountered:

- legacy millisecond-shaped budget APIs persist only as boundary compatibility while canonical allocation is in work units;
- stage IDs have legacy compatibility projections separate from current canonical stage identity;
- historical `reqLen`/`reqInt` remain raw-level spellings while normalized solver code uses `requiredLength`/`requiredIntersections`;
- “random/randoms” historical corpus terminology maps to current corpus-2 naming;
- state merge, mechanic-bucket retention, and later intersection-bucket retention are separate mechanisms even where historical prose loosely groups “beam diversity/retention.”

The conceptual reconstruction therefore keys ideas by proposition and mechanism, not token spelling.

## 10. Evidence-selection warning

One underlying 2026-09-11 report read during this pass contains a cross-link to a then-current “capability map.” That cross-linked ontology/conclusion was deliberately ignored under the quarantine rule. The mechanism derivation, observer measurements, population, and stated evidential limits were used as primary research evidence; the mapping vocabulary was not imported into this investigation.

## 11. Remaining pre-quarantine work

Before freezing the independent synthesis:

- inspect current routing/retention/budget boundaries for additional implicit premises;
- search specifically for historical ancestors of Q1–Q8 so genuinely old questions are not mislabeled new;
- inspect at least one direct known-solution-prefix-survival research report and one policy-switch/resumability follow-up;
- search abandoned/negative experiments for broad conclusions resting on narrow proxies;
- run the hostile completeness audit, focusing on execution substrate, worker/process boundaries, persistence/serialization, preprocessing, and research tooling because the current passes naturally favor algorithmic code;
- freeze the independent synthesis in a separate commit before reading any quarantined premise-map artifact.