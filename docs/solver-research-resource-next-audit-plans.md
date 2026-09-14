# Next solver research-resource audit plans

> **Status:** planned audit program, refined against current repository authorities.
> **Purpose:** carry the September 2026 research-resource audit method into the next decision-bearing evidence systems without duplicating work the repo already does well.
> **Predecessors:** the hint-provenance, variant-family, solution-profile, stress-corpus, decision-exposure, and cross-resource ancestry audits, plus `solver-research-resource-contract.md`.
> **Goal:** improve solve-directed research reliability and opportunity discovery, not create audit ceremony or parallel authorities.

## Shared operating posture

Treat each target as a scientific instrument or evidence system, not merely a file. The strongest prior audits combined semantic reconstruction, empirical falsification, producer/consumer review, historical-claim disposition, prospective producer repair, cross-resource ancestry, and solve-oriented opportunity discovery.

Every audit should therefore, where material:

1. Start from current authority and existing tooling. First identify what the repo already distinguishes correctly; do not rediscover it under new names.
2. Define the real semantic entities and identity layers before interpreting counts.
3. State the independent unit for each important claim rather than assuming rows/events/runs are independent.
4. Reconstruct generation, selection, conditioning, dependence, missingness, revision/freshness, observability history, and irreversible information loss.
5. Inspect both writers and readers. A definition-site fix is incomplete if consumers retain old semantics.
6. Attack the measurement before interpreting it. Use independent reconciliation targets, negative controls, sensitivity tests, alternate definitions, known counterexamples, or deliberately hostile cases.
7. Distinguish literal observation from inference. Preserve historical runs even when their interpretation narrows.
8. Distinguish resource-internal dependence from cross-resource ancestry. Two assets can agree because they descend from the same intervention or observation.
9. Quantify blast radius where old semantics affected current beliefs, queues, workstreams, or reports.
10. Add durable tooling/checks only where they prevent recurrent mistakes or materially improve discoverability. Prefer extension of existing helpers/indexes to a new store.
11. Fix producers prospectively when useful information was historically discarded. Do not fabricate missing history.
12. End with solver-relevant consequences: beliefs strengthened/weakened, reopen candidates, better experiment designs, and newly exposed opportunities.

Preserve distinctions already central to the repo: premise failure versus tested-form failure, promotion disposition versus demonstrated capability, unavailable versus false, reach versus real participation, derivative evidence versus independent corroboration, historical capability versus current capability, and sample independence versus distributional independence.

### Scope discipline learned from fitting these plans to the repo

Several originally proposed audits were too file-centric or too broad. The corrected targets are:

- **Audit 1:** the experiment **evidence lifecycle**, not merely the opt-in ledger. The ledger is a disposition consumer; v3 experiment results, preflights, manifests, reports, population rules, validators, capability memory, and status/question indexes carry the evidence system.
- **Audit 2:** **capability observability and attribution across census + lifecycle + scheduler + capability memory**, not another technique census. The current census is already a technique-response matrix and the operational taxonomy already rejects name-based technique ontology.
- **Audit 3:** the shared **accepted-path/oracle evidence layer across diagnostics**, not one homogeneous family of exact/reference tools. Exact/reference labels remain a separate truth resource unless a particular diagnostic derives them from an accepted path.
- **Audit 5:** the **question-state propagation and attention-allocation system**, while preserving `solver-research-question-relations.json` as deliberately sparse and `solver-optimization-workstreams.md` as the only priority authority.
- **Audit 6:** a later meta-audit of registry/contract effectiveness after the preceding audits have supplied genuinely new resource classes and counterexamples.

## Audit 1: experiment evidence lifecycle

### Existing authority to preserve

The repo already has a mature experimental contract:

- `solver-research-operating-model.md` owns research method and stop rules;
- `solver-evaluation-evidence.md` separates development, confirmation, and transfer/challenge evidence;
- `solver-experiment-opportunity-sizing.md` owns opportunity/participation-aware sizing;
- `solver-experiment-result.schema.json` v3 already preserves execution identity, population identity, limits, coverage, decision validity, outcomes, side effects, and per-entry evidence;
- `solver-capability-memory.md` already separates production disposition from demonstrated/displaced capability;
- `solver-opt-in-experiment-ledger.md` is only a compact current disposition table for default-OFF mechanisms.

Do not invent a second canonical experiment record unless the audit demonstrates an actual gap in v3 results/manifests or closeout plumbing.

### Core question

Across the full experiment evidence lifecycle, when the repository says a treatment helped, failed, was neutral, is closed, or exported a capability premise, can the underlying observation, participation contract, population role, and descendant inference be reconstructed correctly?

### Semantic layers

Keep separate:

- research question/premise;
- treatment form and implementation revision;
- preflight/design contract;
- population source and conditioning event;
- experiment/run/arm/config identity;
- opportunity/eligibility/reach/real participation;
- per-level attempt and termination state;
- observed outcome/work/wall cost;
- aggregate result;
- promotion disposition;
- capability signature;
- question-state implication/reopen condition;
- descendant treatment/population influenced by the result.

Reuse the repo's existing two-axis disposition/capability model. Add finer failure/disposition vocabulary only where current records cannot distinguish a scientifically important case.

### Audit method

1. **Map the pipeline before sampling history.** Trace current producers and consumers: preflight -> workflow/run -> v3 result/reconciliation -> report -> ledger/capability memory/question relations/workstream update. Identify which experiment families still predate or bypass this path.
2. **Separate current-system audit from legacy archaeology.** Current v3 experiments should first be tested for contract fidelity. Historical experiments should be stratified by evidence era instead of being judged against fields that did not yet exist.
3. **Reconstruct a deliberately hostile sample.** Include promoted results, closed negatives, nulls, low-participation cases, residual-conditioned confirmations, mixed-regime historical results, results with known execution repairs, and results repeatedly cited downstream.
4. **Recompute rather than trust prose.** Where raw rows survive, independently derive gains/losses, coverage, participation, work and censoring. Reconcile to reports/ledger/capability memory.
5. **Test negative-result semantics.** Distinguish premise failure, tested-form failure, non-participation, allocation/starvation, implementation defect, execution failure, measurement blindness, population-role failure, regime-specific result, and genuinely interpretable negative.
6. **Audit descendant use.** A clean historical observation can still be misused later. Trace material conclusions into question relations, workstreams, future work, capability memory, scheduling policy, and later experiment designs.
7. **Audit information loss at aggregation boundaries.** Determine whether combine/reconciliation/report layers discard per-level, per-stage, arm, opportunity, participation, or wall-cost data that later questions plausibly need.

### Repo-specific falsification targets

Use existing known failure cases as calibration, not merely examples:

- nominal attempts with zero target-stage work;
- historical apparent nulls later shown to be non-participating;
- scheduler displacement where additive capability existed but fixed-work economics failed;
- residual/control-outcome conditioning that is valid conditional confirmation but not unconditional effect evidence;
- promoted or negative treatments that retained complementary gain/loss signatures;
- execution plumbing failures that must never become scientific negatives.

The audit should prove that the modern system classifies these correctly before proposing more schema.

### Empirical outputs

Quantify separately for modern and legacy evidence:

- reconstructable exact population/arm/protocol identity;
- complete and decision-valid coverage;
- real treatment opportunity/participation observability;
- matched/comparable `workSpent` semantics;
- per-level gain/loss recoverability;
- wall-cost recoverability where relevant;
- promotion disposition ↔ capability-signature consistency;
- downstream claims that remain valid, narrow, become nominative only, or need bounded recheck;
- irreversible information-loss classes.

Do not use one global "experiment quality" score.

### Prospective improvements

Prefer improving existing v3 producers, reconciliation, status indexing, or report conventions. Candidate improvements must be earned by observed recurring loss, for example:

- explicit link from result to preflight/question ID when missing;
- explicit opportunity/participation summary when currently recoverable only by bespoke join;
- machine-readable tested-form failure reason if current disposition text repeatedly collapses distinct cases;
- stronger preservation of arm-local wall/work/censoring data where combine layers discard it.

### Solve-oriented output

Rank:

- beliefs materially strengthened;
- beliefs weakened or narrowed;
- tested forms correctly closed but premise still alive;
- historical capability worth current reconciliation;
- repeated participation/allocation failures exposing scheduler opportunities;
- experiments believed run but actually absent/incomplete;
- evidence gaps cheap enough to close now.

Do not broadly rerun history. A rerun must be tied to a current residual or live question whose decision can change.

## Audit 2: capability observability and attribution

### Existing authority to preserve

`technique-census-analysis.md` already defines the census as a **technique-response matrix**, not a winner table, and says the current gap is derived materialization/join/valuation rather than another census. `solver-technique-operational-taxonomy.md` already separates source/config similarity, outcome similarity, and operational similarity and warns that profile names are not mechanisms. `solver-research-operating-model.md` and lifecycle/scheduling evidence already distinguish routing, search quality, representation/retention, and allocation failures.

Therefore this audit must not re-prove that names overstate technique diversity or launch another all-technique census by default.

### Core question

When isolated capability, production lifecycle, scheduler exposure, operational behavior, and capability-memory evidence are joined, can the repo distinguish **capability absence** from **capability present but unexposed/misallocated/displaced**, and can it attribute value without winner-only distortion?

### Evidence layers

Treat these as related but non-interchangeable:

1. **isolated response:** level × technique/config census cell;
2. **operational identity:** what search/scorer/retention/prune/retry layer actually differs;
3. **production reach:** whether the real ladder reaches the relevant stage/action;
4. **real participation:** nonzero useful work, not nominal attempts;
5. **allocation/predecessor state:** what opportunity remains after earlier stages;
6. **production outcome:** solve/work/termination;
7. **marginal/complementary capability:** gains/losses/rare exclusives versus named baselines;
8. **historical capability memory:** old complementary capability reconciled only as nomination unless current.

Do not force these into one universal funnel when a stage is undefined for a particular technique family.

### Required audit depth

1. **Regenerate before reinterpretation where current docs already say outputs are stale.** Complete the cheap current second-order census materialization/joins if still outstanding; do not audit obsolete derived artifacts as though current.
2. **Inventory attribution semantics.** For every important analysis/consumer, state whether it measures isolated solve, whole-ladder winner, stage solve, unique rescue, marginal A/B gain, overlap/union nomination, reach, or operational divergence.
3. **Find silent substitutions.** Search for code/reports that use one of those measures as a proxy for another.
4. **Join current census to current lifecycle on only comparable identities.** Ask where isolated capability exists but production does not expose it, versus where production exposes substantial work and the technique still fails.
5. **Audit predecessor conditioning.** Techniques reached after different prior search histories are not directly comparable merely because action labels match.
6. **Audit capability-memory reconciliation.** Historical signatures should nominate current residuals, never silently become current wins or additive portfolio solves.
7. **Audit identity collapse/fragmentation only where still live.** Use the operational taxonomy as authority; investigate remaining cases where tooling groups materially distinct actions or splits one effective mechanism in ways that distort valuation.

### Empirical falsification

Use known current residual classes and production stages as the primary test bed. For each substantial cohort, classify the dominant deficit only when evidence supports it:

- no known isolated capability;
- isolated capability but not offered;
- offered but unreached;
- reached but zero/near-zero real work;
- reached with comparable work and failed;
- capability exists but loses under fixed-work displacement;
- capability evidence is historical/stale only;
- insufficient evidence.

Test whether important technique reputations or scheduler conclusions change when nominal reach/winner counts are replaced with real participation and marginal/complementary evidence.

### Producer review

Do not demand that census cells store scheduler stages they never experienced. Preserve the natural grain of each producer. Improve joinability instead:

- stable action/config identities;
- current protocol/work semantics;
- explicit unavailable states;
- lifecycle stage/action work and termination;
- per-technique cells where future counterfactual use is plausible;
- no winner-only aggregation when the raw response matrix already exists.

### Solve-oriented output

Produce a **capability exposure map**, not a second technique ranking:

- demonstrated capability with poor production exposure;
- expensive exposed capability that should not receive more of the same work;
- complementary capability currently displaced by scheduler placement;
- apparently important actions whose value disappears under marginal attribution;
- genuinely rare capability worth protecting;
- residual regions with no known action capability, which belong to acquisition rather than composition.

Feed only current live WS1/WS2 gates. Do not turn the audit into a generic portfolio redesign unless the evidence earns one.

## Audit 3: accepted-path/oracle evidence across diagnostics

### Existing authority to preserve

The hint-provenance audit already established purpose-specific path/event semantics and repaired several first-path consumers. `solver-known-solution-prefix-survival.md` already has a strong observer contract: known support is incomplete, extinction is not infeasibility, observer parity is mandatory, and selected cases do not establish prevalence. `solver-research-data-assets.md` already treats known-prefix survival, exact/reference labels, operational traces, replay, and solution profiles as distinct asset families.

Do not collapse all exact/reference tools into "known-solution-derived" evidence. Audit only the accepted-path/oracle relationship they actually share.

### Core question

Across diagnostics that consume one or more referee-valid accepted paths, does oracle selection, ancestry, multiplicity, or shared downstream derivation materially alter the inference researchers take from the diagnostic?

### Phase A: inventory and ownership

Build a consumer inventory with explicit categories:

- **path-identity-bound:** upstream labels/results are valid only for the exact selected path;
- **representative-path:** any suitable valid path can instantiate the measurement;
- **multi-path/sample:** the diagnostic is explicitly about variation across known paths;
- **path-seeded but exact-adjudicated:** a known path selects states/prefixes, while separate exact/reference evidence determines feasibility;
- **not actually path-derived:** exact/reference or trace tools that should stay outside this audit except as independent controls.

For each consumer record current selection rule, provenance/identity stored in outputs, solver/config revision, and downstream reports.

### Phase B: oracle-selection sensitivity

For representative-path and path-seeded diagnostics, ask whether the chosen path matters.

On a bounded, information-rich sample with multiple provenance/dependency-distinct paths:

- rerun the same diagnostic over several valid paths;
- compare qualitative verdicts, first divergence/extinction boundaries, measured slack/order/constraint phenotype, and any downstream classification;
- include same-origin and different-origin path controls where possible;
- distinguish path variability from solver/run nondeterminism.

Do not demand invariance. A path-sensitive diagnostic can be valuable if it declares the conditioning and the sensitivity itself reveals distinct basins.

### Phase C: ancestry and corroboration

Use the cross-resource ancestry findings directly. Determine when multiple diagnostic claims are descendants of:

- the same accepted path;
- paths imported by the same family-replay lineage;
- the same exact/reference labelling event;
- the same selected extinction/failure cohort.

Do not count deterministic transformations of one oracle as independent corroboration.

Explicitly distinguish `replay-touched`, `replay-first`, and non-replay-first paths where family transfer is the putative cause.

### Phase D: oracle availability as selected evidence

All referee-valid paths remain legal offline oracles. But ask whether diagnostic phenotype differs systematically among:

- current/historical cold Pathfinder discoveries;
- isolated-technique discoveries;
- variant-parent replay paths;
- external/reference solutions;
- construction witnesses;
- unattributed legacy paths.

Interpret differences as observability/basin-selection evidence, not automatic producer quality rankings.

### Measurement attack

At least one prominent diagnostic signal must face:

- alternate valid oracles;
- lineage filtering;
- same-level multi-path sensitivity;
- easy/already-solved controls;
- matched structural or family controls where they answer the mechanism;
- solver-revision comparison only when revision is part of the claimed phenomenon.

Avoid reflexively adding every possible robustness axis to every diagnostic. Buy the sensitivity test that can change the inference.

### Information loss and producer review

Identify historical diagnostic outputs that omit path identity/hash, provenance purpose, oracle-selection rule, exact-label source, run/config revision, or conditioning cohort. Fix current producers prospectively only where that omission prevents reproducibility or safe cross-resource use.

A useful shared helper/metadata convention is preferable to retrofitting one giant oracle-results schema across heterogeneous tools.

### Solve-oriented output

Use oracle sensitivity to nominate mechanism classes only when recurrence exists, for example:

- all known basins fail at the same represented boundary;
- one path family survives much longer than others;
- imported/replay-first basins expose capability ordinary discovery rarely reaches;
- one obligation ordering repeatedly survives while alternatives collapse;
- diagnostic disagreement shows the original "failure phenotype" was oracle-specific.

Translate any such class into an ordinary runtime-legal mechanism premise before live testing.

## Audit 5: question-state propagation and attention allocation

### Existing authority to preserve

`solver-optimization-workstreams.md` is the sole priority authority. `solver-research-question-relations.json` is deliberately sparse and owns only stable cross-question relations needed to prevent rediscovery. Dated reports own evidence/verdicts; capability memory owns complementary capability; the status index provides discovery. `solver-experiment-opportunity-sizing.md` sizes experiment populations and must not be repurposed into a global research-priority score.

Do not build a second comprehensive opportunity catalogue or force every observation through a heavyweight epistemic-state machine.

### Core question

Does material research evidence propagate correctly through the existing sparse question graph, workstream gates, capability memory, future-work authority, and status index, or do conclusions become lost, overgeneralized, stale, duplicated, or detached from reopen conditions?

### Audit method

1. **Start from current live/deferred questions, not every historical report.** Sample all live gates plus a purposive set of important closed/reopened questions.
2. **Reconstruct decision ancestry only where it matters.** For each sampled question: evidence -> interpretation -> tested form -> disposition -> outgoing implications/constraints/calibrations -> current gate/reopen condition.
3. **Use archaeology as an adversarial external check.** Classify recovered ideas by why they escaped the current system: truly historical/no current owner; question never registered; tested-form closure overgeneralized; experiment believed absent/present incorrectly; regime dependence lost; evidence relation not propagated; or current system already preserved it correctly.
4. **Audit bidirectional closeout.** Check inbound evidence used by a question and outbound effects on other questions. This is already the intended relation-registry contract; the audit should test compliance rather than invent another graph.
5. **Audit discoverability.** Can an agent using `research-status-index`, asset query, workstreams, question relations, capability memory and future work recover the current state without archaeology-scale effort?
6. **Audit resource routing.** For each live/deferred question, identify existing assets that can cheaply falsify/localize it and assets whose use would be dependent or irrelevant. Preserve intentional non-use.

### Failure modes to look for

- a tested implementation form silently treated as premise closure;
- a capability signature lost because promotion was negative;
- a closed result that should constrain/calibrate another question but has no outgoing relation;
- a gate satisfied in evidence but stale in workstream/future-work text;
- duplicate causal questions under new vocabulary;
- current authority contradicted by stale status/report metadata;
- question has no measurement capable of deciding its next gate;
- cheap existing resource repeatedly missed before new compute;
- archaeology finding already correctly represented but rediscovered because discoverability is poor.

### Challenge to the original plan

Do **not** add a dozen mandatory epistemic states to every serious question merely because they are conceptually neat. The current sparse states (`active-candidate`, `active-diagnostic`, `deferred-reopen`, `closed-tested-form`, etc.) may already be enough if relations and reopen conditions are maintained. Add state only when a concrete propagation error cannot be expressed with the existing relation vocabulary.

Likewise, do not retrospectively score historical research priorities against eventual solve impact as a pseudo-objective. Later knowledge makes that comparison strongly hindsight-biased and historical priority metadata is incomplete. Instead ask the tractable question: **given the evidence available at the time, did the repository preserve the option and the condition for revisiting it?**

### Solve-oriented output

Produce a small question-health report, not a new queue:

- live gates whose evidence state is clean;
- stale/contradictory gates needing authority repair;
- premise/tested-form distinctions needing repair;
- reopen conditions now satisfied or invalidated;
- missing material cross-question relations;
- high-value resource preflights for current/deferred questions;
- questions whose next measurement cannot presently decide anything.

Any priority change must be written back to `solver-optimization-workstreams.md`, not owned by the audit artifact.

## Audit 6: evidence registry and Research Resource Contract meta-audit

### Timing

Run after Audits 1-3 and preferably Audit 5 have completed enough work to add genuinely different resource classes. The point is to test generalization, not re-document the four resources that created the contract.

### Existing authority to preserve

`solver-research-data-assets.json` owns the catalogue; `solver-research-resource-contract-audits.json` is an audit-grade overlay, not a second catalogue; `solver-research-data-assets.md` is the human cross-asset topology guide; `check:audit-artifacts` validates structural contract shape but explicitly cannot certify scientific truth or consumer completeness.

### Core question

Does the current catalogue + audited-resource contract + preflight machinery expose the failure modes that matter in real research use, while remaining lightweight enough that agents actually use it?

### Audit the contract against empirical findings

For every major finding from all completed resource audits:

- which existing contract field should have exposed it?
- could a competent pre-audit declaration reasonably have found it without the empirical work?
- was the problem resource-internal or cross-resource?
- was the failure in semantics, producer information loss, consumer misuse, discoverability, or decision exposure?
- would adding a field prevent recurrence, or merely create a checkbox?

Pay special attention to concepts that may deserve stronger explicit treatment only if they recur across new resource classes:

- cross-resource causal ancestry;
- observability history;
- decision/treatment-lineage exposure;
- partial-resource projection states;
- aggregation information loss;
- producer/consumer asymmetry;
- claim-specific independent unit rather than one universal unit.

### Registry-to-reality test

Sample recent decision-bearing reports and trace every durable evidence asset actually consumed. Check registration, authority, query front door, grain, join identity, contract grade, and actual consumer behavior.

Reverse the direction for registered assets: identify dead/obsolete entries, bypassed semantic helpers, recurring shadow resources, or catalogue-grade assets that have become subtle recurring decision inputs and may now deserve focused audit-grade treatment.

### Partial-resource/missingness test

Generalize the distinction only where it actually occurs:

1. resource unavailable/not mounted;
2. resource available but relevant projection/field not loaded;
3. resource loaded with no matching record;
4. matching record with a genuine false/zero/negative value.

The family manifest-only audit showed why 1-4 can differ. Determine which other resource families need the same explicit projection semantics before adding a global contract rule.

### Historical counterexample suite

Use a small set of known research mistakes as regression cases for the contract itself: stale profile semantics, corpus role confusion, replay pseudo-replication, absent-as-false legacy provenance, control-outcome conditioning, nominal participation with zero work, and any new failures found in Audits 1-5.

Ask whether an agent following the current registry/contract/preflight path would now be steered away from the old error. If not, fix the narrowest layer that would help: authority prose, registry relationship, query surface, checker, report convention, or only then the contract schema.

### Avoid bureaucracy

Preserve the layered model:

- catalogue-grade discovery for ordinary assets;
- audited declarations for recurring decision-bearing resources with subtle semantics;
- claim-specific preflight for actual decisions;
- executable checks for mechanical invariants;
- empirical review for scientific truth.

Do not make every transient diagnostic output an audited resource. Do not create a second warehouse to make the registry easier to audit.

### Forward-looking output

Identify repeated bespoke joins or reconstructions that imply either:

- a missing shared semantic helper/query recipe;
- a missing durable resource interface;
- a registry relationship that needs to become machine-visible;
- or merely a one-off analysis that should remain one-off.

The meta-audit succeeds if it makes future research safer **and cheaper**, not if the contract becomes larger.

## Suggested order after repo-fit review

1. **Experiment evidence lifecycle.** Highest leverage and broadest historical-claim blast radius; modern machinery provides strong reconciliation targets.
2. **Accepted-path/oracle evidence across diagnostics.** Likely to expose cross-diagnostic ancestry and selection issues cheaply from existing data, while current live Class-5 work already leans heavily on exact/accepted-path diagnostics.
3. **Capability observability and attribution.** Valuable, but first honor the existing census authority's explicit instruction to regenerate current derived outputs rather than launch another census.
4. **Question-state propagation and attention allocation.** Best after the earlier audits generate fresh examples of good/bad evidence propagation.
5. **Registry/contract meta-audit.** Last, after enough heterogeneous resources have been audited to challenge the contract fairly.

The order is not a hard dependency chain. A live solver gate may justify pulling a later audit forward. None of these audits should interrupt the current WS2 Class-2/Class-4 frozen gates or Class-5 acquisition gate merely because the audit program exists.

## Closeout standard

Each audit should close only after it has, to the extent material:

- updated or created the appropriate resource-contract declaration if the target is truly a durable resource;
- inspected producers and consumers;
- reconciled with existing authorities rather than duplicating them;
- dispositioned known historical claims whose inference changed;
- encoded mechanically testable invariants where worthwhile;
- documented irreversible information loss and partial-resource semantics;
- identified prospective producer improvements;
- reconciled current workstream/question implications without creating a parallel queue;
- stated what the audit does **not** establish;
- ranked solve-oriented follow-up opportunities or explicitly found none.

A large census, new solver campaign, broad replay, or new schema is never required merely to make an audit look substantial. Existing data and current machinery should be exhausted first, and expensive measurement or new infrastructure must be earned by a concrete decision it can change.
