# Solver research process critique and reprioritization

> **Status:** concluded-positive
> **Last evidence:** 2026-08-23 — technique-census, scheduler, research-method, correctness, tooling, and architectural-speed review on current branch
> **Decision:** preserve the process lessons below as historical rationale for the current queue and research operating model; act from the live authorities they link to rather than treating this report as a competing roadmap
> **Remaining gate:** none
> **Evidence role:** forensic
> **Selection:** observational — synthesis after inspecting the project's development history, current implementation/docs, experiment ledger, technique census, and external algorithm-selection/configuration/solver-engineering practice

## Purpose

This report preserves *why* the solver research process changed in August 2026.

The project has produced a capable solver, large measured gains, useful research infrastructure, and unusually rich empirical evidence. The criticism is not that the custom solver was a mistake. It is that much of that capability was reached by an unnecessarily expensive route: several mature ideas from empirical algorithmics, portfolio solving, exact/constraint solving, benchmarking, and systems profiling were rediscovered only after local pain made them unavoidable.

The durable corrections now live in:

- [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md)
- [`docs/solver-research-operating-model.md`](../docs/solver-research-operating-model.md)
- [`docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md)
- [`docs/solver-budget-determinism.md`](../docs/solver-budget-determinism.md)
- [`docs/solver-correctness-hardening.md`](../docs/solver-correctness-hardening.md)
- [`docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md)
- [`docs/solver-architectural-speed-opportunities.md`](../docs/solver-architectural-speed-opportunities.md)
- [`docs/investigation-report-conventions.md`](../docs/investigation-report-conventions.md)

This file is intentionally a dated historical synthesis. Do not copy its recommendations into a second live queue.

## Executive assessment

The central process error was allowing the solver to become a **manually configured algorithm portfolio** without recognizing that algorithm selection, configuration, allocation, validation, and portfolio pruning had themselves become the primary engineering problem.

Once the system had multiple DFS scoring profiles, structural templates, beam modes, admissible-order variants, repair, directions, widths, seeds, gates, retries, and budget depths, continuing to add and hand-order attempts was no longer ordinary heuristic tuning. It was a human/LLM implementation of the algorithm-selection and automatic-configuration problem. Established work such as Rice's algorithm-selection framing, SATzilla-style per-instance selection, Hydra-style marginal portfolio construction, and SMAC/irace-style automatic configuration/racing should have been consulted much earlier as design vocabulary and experimental machinery.

The second major process error was **measurement infrastructure arriving after portfolio complexity**. Cross-technique cost was compared using raw node counts before the current `workSpent` currency showed that equal nodes represented roughly an order-of-magnitude spread in actual work. Technique capability was not comprehensively censused until late, so production policy accumulated retries while substantial cheap isolated capability remained unrouted. Provenance/stage identity defects, stale-code comparisons, selected-on populations, and stage-history dependence then forced expensive archaeological work to determine what old experiments had really measured.

The third major process error was **treating a heavily mined stress corpus as if level-blindness also supplied statistical independence**. Runtime level blindness is important, but a policy repeatedly shaped by Corpus 2 remains tuned to Corpus 2. The project also repeatedly selected the best of many profiles, thresholds, seeds, or interventions and then naturally regarded the same population's positive result as stronger evidence than selection permits. That is ordinary exploratory research behavior, but without an explicit discovery/confirmation/transfer split it creates an accidental multiple-comparisons problem.

The fourth major process error was **optimizing symptoms before mechanisms**. A miss often led to a nearby score profile, later retry, wider beam, deeper repair budget, new direction, or additional seed. Those can all be useful, but repeated failure at large isolated budgets is a search-quality signal, not automatically a starvation signal. The current failure taxonomy, exact-prefix diagnostics, lineage/retention work, operational-similarity work, restart questions, and learned-failure questions are a better research language because they ask *why* capability disappears.

Finally, the implementation itself carried avoidable systems debt: million-key address spaces for a grid with at most hundreds of live cells, eager string construction in hot beam paths, fixed-width state identities without enforced cardinality proofs, proliferating one-off tools/flags, and CI sufficiently slow to tax every agent iteration. Recent fixes demonstrate that plain systems engineering still has substantial leverage.

## Criticism-to-correction map

| Criticism | What made it costly | Current correction | Remaining implication |
|---|---|---|---|
| Manual ladder growth after the solver became a portfolio | Each local +N solve retry gained apparent safety by moving late while increasing the hardest-level tail | [`solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md): fixed total work, actions/budget tranches, residual marginal value | Freeze default ladder accretion; price every retained tail action against displaced work |
| Manual configuration of many near-related profiles | Humans/agents searched a large conditional parameter space serially and turned configurations into named “techniques” | [`solver-research-operating-model.md`](../docs/solver-research-operating-model.md): configuration search, racing, selection disclosure | Use bounded automatic/systematic configuration as research machinery; keep production policy compact |
| Technique census arrived late | Production omissions/starvation could masquerade as lack of algorithmic capability | [`technique-census-second-order-analysis.md`](../docs/technique-census-second-order-analysis.md) + current queue | Reprice latent capability before inventing another technique |
| Raw nodes used as portable cost | Equal node budgets could represent radically unequal work between techniques | [`solver-budget-determinism.md`](../docs/solver-budget-determinism.md) | Older cross-technique node-based conclusions are nomination/forensic evidence unless revalidated |
| Repeated use of Corpus 2 for discovery and verdict | Level-blindness prevented lookup, not overfitting to a repeatedly observed distribution | current operating model + queue P2 | Build a renewable confirmation/transfer protocol and scope claims until then |
| Best-of-many experimental selection not always separated from confirmation | Small positive effects could include ordinary winner's-curse/multiple-comparisons optimism | investigation conventions + operating model | +2/+3/+5 selected effects deserve untouched/grouped confirmation before broad claims |
| Provenance/stage attribution too weak | `winningConfig` could be mistaken for winning stage; stale/current artifacts could be compared causally | manifests/lifecycle telemetry/research status + report conventions | Stage/config/run identity must be first-class in every decision-bearing artifact |
| Unexplained cross-stage mutable state | Isolated capability curves can become causally invalid if prior attempts silently change later search | queue P0 + [`2026-08-22-technique-census-reverse-oracle-diagnosis.md`](2026-08-22-technique-census-reverse-oracle-diagnosis.md) | Treat as a correctness/experimental-validity blocker, not useful “cooperation,” until explained |
| Named profile vocabulary overstated diversity | Similar weight vectors could be treated as independent algorithms, bloating portfolio reasoning | [`solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md) | Evaluate source/config, outcome, and operational similarity separately; prune redundant actions by marginal value |
| “More of the same search” was a common prescription | Full-budget search-quality failures received more reserve/depth/nearby scoring before mechanism was understood | failure taxonomy + future-work gates | Prefer first divergence, retention, exact feasibility, restart variance, operators, or learned failure when deep isolated search already fails |
| Additive dead-last retries treated as low-regression gains | Already-solved levels exit early, hiding the total-work tax on the unsolved tail | fixed-envelope scheduler rules | “Zero regressions” is not “zero cost”; every retry competes for residual budget |
| Very large variant generation preceded mature analysis infrastructure | Historical rows later required provenance/family/current-code reconciliation; bulk data depreciated faster than expected | [`variant-level-research.md`](../docs/variant-level-research.md) + adaptive-generation stop rule | Query existing troves first; pilot → analyze → target expansion |
| Large sweeps/static compute before racing discipline | Weak ideas/configs received full population/budget and slow shards held wall time open | smallest-population rule + racing/successive elimination | Kill weak arms early; dynamic work distribution is an execution concern, not solver policy |
| Exact/reference solver treated episodically | Heuristic failure was often diagnosed only through more heuristic runs; independent feasibility truth was underused | queue P5 + existing CP-SAT/prefix tooling | Maintain only the reference forms that repeatedly answer real research questions and validate both directions |
| Restart theory underused outside repair | Deterministic systematic search could have heavy-tail/unlucky-order behavior hidden by one ordering | queue P6 / future-work restart study | Measure across prespecified randomizations before adding seed fan-out |
| Learned conflict/reason reuse largely absent | Search may rediscover structurally equivalent dead regions without retaining why they are dead | queue P6 / learned-failure pilot | Measure repeated-conflict opportunity before implementing SAT-style machinery |
| Hot-path representation was not challenged early enough | `KEY_SPACE`-scale arrays and eager beam string keys spent memory/CPU unrelated to puzzle size | [`solver-architectural-speed-opportunities.md`](../docs/solver-architectural-speed-opportunities.md) | Continue profile-led dense/specialized work; benchmark native/WASM only at a compact proven hotspot |
| Fixed-width state packing lacked a cardinality proof | Identity optimizations could become unsound when mechanic state exceeded assumed bit width | [`solver-correctness-hardening.md`](../docs/solver-correctness-hardening.md) + mechanic contracts | State equivalence/cardinality proof comes before packing optimization |
| Tooling proliferated faster than discoverability | Agents could rebuild an existing observer or leave a useful tool orphaned | [`tooling-catalog.md`](../docs/tooling-catalog.md) + tooling census | A repeated one-off should become a stable primitive; a single-use one should usually disappear |
| Experimental flags accumulated as code archaeology | Closed mechanisms continued imposing branches/tests/docs/resurrection surface | [`solver-opt-in-experiment-ledger.md`](../docs/solver-opt-in-experiment-ledger.md) | Preserve evidence in Git/reports; delete closed implementation that has no reusable role |
| Prose sometimes acted as a research database | Status/selection/provenance/currentness had to be reconstructed from narratives | structured report metadata, manifests, research-status index | Prefer machine-readable identity/status/results, with docs explaining conclusions rather than storing every fact narratively |
| CI became a development tax | Agents paid broad validation cost for every small edit, discouraging tight loops | [`testing.md`](../docs/testing.md) tiered fast/full/deep gates | Keep routine feedback narrow while preserving strong final/core-change validation |
| Interesting proxies occasionally outran the objective | Hint score agreement, badness, lineage survival, similarity, etc. could improve without solve/work value | proxy stop rules in operating model | A proxy earns continued optimization only while it predicts the actual objective |

## Where experienced solver engineering would have intervened earlier

### 1. Recognize algorithm selection/configuration as architecture

The hand-authored `ATTEMPT_POLICY` and its descendants are effectively a classifier/scheduler over a configurable portfolio. Once this was true, the project should have separated:

- candidate action definition;
- per-instance/static features;
- current-solve telemetry;
- budget bands/continuations;
- action value estimation;
- selection/configuration search;
- production scheduling.

That separation would have made “another profile” visibly a configuration candidate instead of an architectural unit. It also would have made marginal portfolio contribution the default question: *what does this action add after cheaper/complementary actions have already run?*

The current scheduler/action-registry direction is therefore not merely an optimization. It is delayed normalization of the architecture around the problem the solver actually became.

### 2. Build evaluation discipline before repeated tuning

The mature experimental sequence should have been:

> development/discovery → candidate freeze → independent confirmation → transfer/challenge

Instead, repeated Corpus-2 mining made it increasingly valuable as a development laboratory while simultaneously reducing its value as evidence of unseen-level generalization. Family-level splitting now prevents obvious sibling leakage, but a broader renewable transfer discipline is still missing.

This does not invalidate Corpus-2 gains. It changes what they prove.

### 3. Establish cost semantics before budget policy

A portfolio cannot be sensibly allocated until “cost” has a cross-technique meaning. The later `workSpent` calibration showing roughly 11× raw-node work-rate spread collapsing to about 1.02× under the new currency means earlier equal-node cross-technique comparisons should not be treated as economic equivalence.

This lesson generalizes: measurement units are architecture. They should be validated before a scheduler, not repaired after it.

### 4. Demand mechanism after repeated local patches

A late retry is often a legitimate safe deployment tactic, but repeated success of late retries should have triggered the question “why is this capability not reachable within the existing budget?” earlier. Similarly, symmetry sensitivity should trigger an equivariance/search-order investigation, not production rotation; beam-width sensitivity should trigger retention analysis, not monotonically wider beams; repair depth should trigger hazard/operator/trajectory analysis, not unconditional reserve growth.

The current research vocabulary is much healthier because it distinguishes routing, allocation, search quality, representation/retention, regression, and correctness.

### 5. Treat the exact solver as a laboratory instrument

CP-SAT does not need to replace the custom solver to justify itself. Its strongest value is independent labels on tractable subquestions: prefix completion, reduced-instance feasibility, repair retreat boundaries, and witnesses that can be fed back through the canonical referee.

The fact that exact-model validation exposed multiple pre-existing encoding bugs is also a warning: the reference model itself must be audited and bidirectionally validated. “Independent” is useful only when model limitations are explicit.

### 6. Profile ordinary software before adding search

The recent dense-neighbor and beam-key changes produced material constant-factor gains without changing search semantics. Those wins came from ordinary representation/allocation scrutiny. A solver executing enormous search volumes magnifies tiny hot-loop costs, so profiling and data-layout review should have been a standing workstream much earlier.

## Experiments whose evidence should be interpreted more narrowly now

This critique does **not** require invalidating historical reports wholesale. It changes their default evidentiary role.

Use extra caution when an older conclusion depended on any of the following:

- equal raw-node comparisons across different search families;
- `winningConfig` rather than canonical lifecycle stage identity;
- a selected threshold/profile/seed evaluated on the same population that selected it;
- broad claims of generalization from a repeatedly mined level-blind corpus;
- wall deadlines that may have bound differently between arms;
- historical variant outcomes without current-code revalidation;
- exact/reference labels from an encoding before its relevant bidirectional validation;
- isolated admissible-order capability while the stage-history dependency remains unexplained;
- additive work described primarily as “zero regression”; or
- proxy improvement without a cold solve/work effect.

Historical evidence remains valuable for nomination, mechanism, regression archaeology, and candidate generation. Re-run only decision-bearing edges; do not spend compute ceremonially reproducing every old result under modern methodology.

## What was *not* a mistake

Several tempting overcorrections should be rejected.

- Building a custom solver was reasonable. The problem has unusual mechanics, the solver has substantial capability, and the custom engine is itself the product/research target.
- Heuristics and scoring profiles are not inherently bad. The mistake is allowing configuration count to substitute for measured portfolio distinctness and allocation discipline.
- Large corpora and variants are not wasted. Their value is highest as development/diagnostic evidence now; the mistake was generating some of them before the analysis/provenance questions were sufficiently mature.
- CP-SAT is not automatically superior because it is mature technology. It is a comparator/oracle where tractable, and its own encoding has required debugging.
- More budget can be rational. The issue is entitlement: late hazard must be measured against alternative uses of the same work.
- JavaScript is not automatically the wrong implementation language. Recent V8 improvements demonstrate substantial headroom; a native/WASM move should be earned by an end-to-end benchmark, not aesthetic preference.

## Reprioritization consequence

The correct order after this review is the current queue:

1. resolve unexplained cross-stage dependence because it can invalidate isolated causal evidence;
2. reprice the existing portfolio under `workSpent` and a fixed envelope before adding more attempts;
3. establish renewable confirmation/transfer discipline before making broad unseen-level claims;
4. use systematic configuration/racing instead of serial profile invention;
5. maintain a bounded exact/reference capability audit and use it on real questions;
6. investigate restart variance and repeated-conflict/learned-failure opportunity before more seed/retry/profile fan-out;
7. continue exact/shadow-guided specialist work only at diagnosed boundaries;
8. keep architectural speed as a parallel supporting program.

This ordering deliberately puts **validity and allocation before novelty**. The project currently has enough latent capability and enough historical experimental ambiguity that learning how to spend and trust existing search is higher leverage than reflexively inventing another search mode.

## External conceptual references

These are vocabulary and comparison points, not authorities that override Pathfinder evidence:

- Rice (1976), *The Algorithm Selection Problem*.
- SATzilla portfolio/per-instance algorithm selection work.
- Hydra automatic portfolio construction, emphasizing marginal contribution of new configurations.
- SMAC sequential model-based algorithm configuration.
- irace iterated racing for configuration selection and early elimination.
- randomized restart/heavy-tail search work by Gomes and collaborators.
- CDCL / Lazy Clause Generation work on learned conflict information and non-chronological search.

The actionable rule is not “copy mature solvers.” It is: when the project has independently recreated a known problem class, learn the established vocabulary and use it to design a cheap Pathfinder-specific test before spending months rediscovering the same experimental lesson.

## Historical characterization

The solver's development can be described fairly as **successful empirical search engineering with delayed methodological normalization**. The system improved dramatically, but a substantial amount of compute, agent attention, and conceptual work went into discovering that:

- a portfolio needs scheduling;
- configurations need systematic selection;
- budgets need a common currency;
- selected winners need confirmation;
- level blindness is not a holdout;
- state identity needs proofs;
- hidden mutable state destroys causal interpretation;
- exact controls are useful even when not production-competitive;
- and hot loops deserve ordinary systems profiling.

Those lessons have now been incorporated into the live research contracts. Their value is preserved here so future agents can understand why the contracts are strict without bloating those contracts with historical narrative.