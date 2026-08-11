# Winning-lineage survival analysis

> **Status:** core diagnostic instrumentation implemented and unit-validated 2026-08-11; first bounded 8-level real-beam pilot and 4+4 stratified solved-control follow-up complete; larger population run pending; no production solver behavior is proposed here
> **Written:** 2026-08-11
> **Purpose:** measure where known-valid solution families disappear from the solver's real search, especially beam search, without allowing those solutions to guide the search.
>
> **Parent methodology:** [`solver-research-operating-model.md`](solver-research-operating-model.md)
> **Related evidence:** winning-path archaeology / witness-divergence tooling, [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md), [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md), and the beam-retention findings summarized in [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md).

## 1. Why this is a distinct unanswered question

Existing Pathfinder tooling can replay a referee-valid solution through the real search state and ask how the scorer ranks the correct next move. That is useful but local.

It does **not** answer the global finite-frontier question:

> **During the actual unchanged search, does the solver continue to retain any prefix belonging to any known-valid solution? If not, exactly where and why is the final known-winning lineage lost?**

Beam search is the clearest first target because every width cull is irreversible. A locally well-ranked winning move can still belong to a prefix that ranks just below the global beam cutoff once thousands of other parents contribute candidates.

The current `_BEAM_DEBUG` instrumentation measures cost anatomy, not solution-lineage survival. This proposed instrumentation therefore fills a real gap rather than duplicating existing debug counters.

## 2. Non-negotiable experimental rule

Known solutions are **labels only**.

The search must run with exactly the same candidate generation, scoring, pruning, deduplication, ordering, beam width, budgets, and random behavior it would have used without the known solutions.

Instrumentation may ask after the fact whether a generated/retained node matches a prefix in the known-solution index. It may not:

- boost that node;
- reserve a slot for it;
- suppress another node;
- alter tie-breaking;
- change a budget;
- change a random stream;
- stop early because the final known lineage vanished.

This is diagnostic fluorescence, not guidance.

## 3. Input solution set

Use all referee-valid solutions available for the level, subject to provenance and deduplication.

Potential sources:

- stress-corpus witness solutions;
- stored hints;
- enumerated additional hints;
- variant-parent replay solutions that validate on the canonical parent.

Do not count byte-identical paths multiple times merely because provenance differs.

Where the known set is incomplete, report that explicitly. “All known solution families disappeared” is not the same claim as “no solution remained in the beam.”

## 4. Prefix index

Build a trie or equivalent compact prefix index for the known valid paths.

At any real search node, instrumentation should be able to determine cheaply:

- whether the node's full path is a prefix of at least one known solution;
- how many known solutions remain compatible with that prefix;
- optionally, which coarse solution-family IDs remain compatible after solution-family clustering.

The implementation should avoid repeatedly reconstructing every known path per candidate. Beam already uses parent-pointer nodes; the diagnostic can either maintain a lineage-label set/hash alongside debug-only nodes or reconstruct only when the observation hook is enabled.

Because this is instrumentation, choose the implementation with the lowest risk of perturbing production behavior, even if it is slower than an eventual permanent telemetry path.

## 5. Observe the beam at each decision boundary

The useful unit is not merely “was a known prefix somewhere in the phase?” The instrumentation should distinguish the stage at which it disappeared.

For each depth/phase, record known-winning support at these boundaries where practical:

1. **Incoming frontier**: known-winning prefixes retained from the previous phase.
2. **Generated candidates**: known-winning children that were actually generated from those or other parents.
3. **Post-hard-prune candidates**: known-winning children surviving the shared prune gauntlet.
4. **Post-dedup pool**: known-winning children surviving coarse beam dedup.
5. **Post-score/width cull frontier**: known-winning children actually retained for the next phase.
6. **Post-diverse-selection frontier**, when diverse beam is active.

If distinguishing steps 4-6 requires tiny debug-only hooks around existing branches, add those hooks rather than infer the cause later from final frontier contents.

## 6. Core metrics

### 6.1 Winning-support coverage by depth

Primary metric:

> **At each depth, what fraction of the known solution set/families still has at least one represented prefix?**

Report both raw-path coverage and, where meaningful, diversity-family coverage so a level with hundreds of near-identical hints does not dominate the interpretation.

### 6.2 Last-known-winning depth

For each level/attempt:

- depth of first known-winning prefix loss;
- depth of final known-winning path loss;
- depth of final known-winning family loss;
- normalized depth fraction relative to `reqLen`.

### 6.3 Loss cause

Classify the decisive loss where possible:

- known child never generated because it was not legal according to the search state;
- hard prune rejected the known-valid lineage;
- dedup displaced it;
- score/width cull displaced it;
- diversity selection displaced it;
- budget/deadline ended before the next phase;
- known path prefix simply was never reached from the retained parent population.

A hard prune rejecting a truly valid known prefix is a correctness alarm and should not be treated as an ordinary heuristic result.

### 6.4 Work after support extinction

Measure canonical work spent after the final known-winning family disappears.

This is diagnostic only because the known solution set is incomplete. A large value means “the solver spent substantial work after losing every solution family we know about,” not “all later work was mathematically wasted.”

### 6.5 Margin at cull

When a winning candidate is score-culled, record:

- its global candidate rank;
- beam width;
- score difference from the final retained candidate;
- how many candidates with equal score straddled the cutoff;
- whether a fixed directional/stable-order tie decided admission.

This separates a profound heuristic miss from “candidate ranked 5003rd in a width-5000 beam.”

### 6.6 Dedup collision context

When a winning candidate is displaced by production coarse dedup, record the retained competing candidate's:

- position;
- production `sc` tuple;
- score;
- neutral metric projection where available;
- exact/sound-state equivalence if an existing debug oracle can compute it cheaply.

Do not interpret production dedup as logical equivalence; existing evidence says its value is width/diversity management rather than exact-state identity.

## 7. Population comparisons

At minimum, compare:

- cold-solved versus cold-unsolved levels with known solutions;
- robust family failures versus fragile family failures;
- beam-winning versus DFS/repair/admissible-order-winning levels;
- must-cross/turn-load/density strata already used by capability-gap analysis;
- symmetry relatives after applying the controls in [`../reports/2026-08-11-symmetry-control-audit.md`](../reports/2026-08-11-symmetry-control-audit.md).

The strongest evidence is a repeated loss mechanism across independent level families, not one dramatic level.

## 8. Interpretation matrix

### Known-winning prefixes are not generated

Investigate candidate legality, predecessor retention, forced-order/tie effects, or an earlier frontier loss. If a directly reachable known-valid child is rejected as illegal, treat as correctness work.

### Generated and hard-pruned

Correctness alarm unless the known path/provenance is stale or malformed. Validate with the canonical referee and independent reference machinery.

### Generated, live, then score-culled

Strong evidence for a heuristic/representation or retention problem. Use score-component ablations and neutral dynamic facts before tuning weights blindly.

### Dedup-displaced

Strong evidence that the coarse beam state abstraction is merging opportunity classes that matter on this population. Do not jump directly to exact dedup: existing evidence says exact duplicates are too rare and coarse dedup has real diversity value. Look for a better retention/diversity descriptor.

### Several known families survive deep but beam still fails

Beam width may not be the immediate problem. Investigate later dynamic completion-interface collapse, exact-length/intersection closure, or budget.

### All known families disappear together near the same dynamic event

This is especially useful evidence for missing future-opportunity/resource reasoning. Compare crossing slack, landmark completion interfaces, separator state, or other neutral semantic facts around the extinction event.

## 9. Extension: contrastive winning-prefix branch atlas

Once solution-prefix replay is available, use selected prefixes to create a cleaner offline dataset for heuristic-gap research.

For a known-valid prefix:

1. reconstruct the exact real solver state;
2. enumerate all legal next siblings;
3. the known continuation is live by construction;
4. where tractable and supported, ask CP-SAT/reference search whether each other sibling admits any completion;
5. record live/dead labels plus neutral state facts after each sibling.

The resulting dataset compares **live and dead siblings from the identical parent history**, removing much of the confounding present when arbitrary dead atlas branches are compared with arbitrary live paths.

Candidate analyses:

- crossing slack;
- pending landmark completion-interface counts;
- residual reachable volume;
- portal/flipper state;
- intersection/revisit commitments;
- separator/interface capacity;
- score terms and admissible slack;
- family/symmetry stability.

This should precede any ambitious online failure-learning or CEGAR machinery. First establish that recurring contrastive structure exists.

## 10. Relationship to interoperability

Winning-lineage survival is useful before any live handoff.

Examples:

- if beam repeatedly retains solution-like structural families that repair never independently reaches, that supports beam -> repair producer value;
- if beam itself destroys those families early, exporting its survivors to repair is less promising;
- if repair elites overlap heavily with the beam's retained populations, the proposed handoff may be redundant;
- if an external artifact predicts which equal-score beam candidates preserve winning support, that is a concrete beam retention receptor.

Therefore this diagnostic can kill or strengthen interoperability ideas before consumer code is written.

## 11. Relationship to family/variant research

For a solve-status symmetry cliff, compare **where** winning support disappears, not just whether one orientation solves.

After controlling semantic equivariance, directional templates, fixed tie order, and repair PRNG streams:

- same extinction depth/cause suggests the final solve difference is later finite-budget noise/control;
- one orientation loses support immediately on equal-score ties suggests deterministic ordering sensitivity;
- one orientation keeps several winning families while the other score-culls all of them suggests a genuine heuristic/retention asymmetry;
- corresponding dynamic-resource collapses at different transformed states suggest a semantic or metric equivariance problem.

## 12. Implementation boundaries

Prefer an env-gated or explicit tooling-only observation hook with zero production behavior when disabled.

Do not add known-solution data to `NormalizedLevel`, `PrepLevel`, scoring profiles, or production attempt configuration merely to support this analysis if a tooling/debug boundary can carry it separately.

Reuse:

- canonical solution validation;
- `SOLVER_TESTING_API` where analysis can stay outside the hot loop;
- existing beam parent pointers and phase/cull boundaries;
- family/solution provenance;
- canonical work accounting.

Avoid:

- a parallel beam implementation;
- a second move generator;
- a second geometry transform implementation;
- bespoke hint parsing if existing level/hint I/O already provides validated solutions.

## 13. Acceptance criterion for the instrumentation itself

Before using the data scientifically:

1. with instrumentation disabled, solver behavior is unchanged;
2. with instrumentation enabled, returned solutions and deterministic node/work outcomes remain unchanged on a representative sample, allowing only wall-clock slowdown from observation;
3. every known solution used for labels passes the canonical referee on the exact analyzed level;
4. a synthetic fixture demonstrates each loss-cause bucket the hook claims to distinguish, where practical;
5. the report records known-solution-set completeness/provenance so “support extinction” is not overclaimed.

## 14. What this work is allowed to produce next

A completed survival report may justify a **specific** next experiment such as:

- a neutral beam diversity descriptor;
- a tie-break diagnostic;
- a corrected dedup/retention representation;
- a dynamic-resource metric study;
- a beam -> repair shadow handoff;
- a targeted correctness investigation.

It should not automatically produce a new production score term. The point is to identify the actual failure stage before engineering the remedy.

## 15. Implementation update (2026-08-11)

The default-OFF real-beam observer, compact prefix index, provenance/family support accounting, and loss/cull/dedup context are implemented. See [`reports/2026-08-11-solver-research-observation-tooling-pilot.md`](../reports/2026-08-11-solver-research-observation-tooling-pilot.md). The original small pilots are historical; the 30-level same-configuration cohort supersedes them for active routing.

## 16. Label aggregation hardening (2026-08-11)

Exact duplicate paths now retain the union of every provenance and solution-family label rather than
silently keeping only the first family. This matters when canonical hints and variant-parent replay
produce the same canonical path through independent sources.

## 17. Bounded removal-context retention (2026-08-11)

The observer keeps complete stage counts but, by default, retains detailed hard-prune/dedup/cull rows
only for candidates that carry known-winning support. This keeps larger evidence runs bounded without
losing the rank, cutoff, competitor, or prune context needed to explain known-support extinction.
Callers may explicitly request all removal details for a small diagnostic fixture.

## 2026-08-11 review follow-up: structural families and same-config control

The pilot's accidental raw-path `family` identity is fixed. Lineage schema v2 uses the established hint-diversity structural axes (directed portal usage, crossing placement, and must-cross first-entry/completion order), while exact paths and provenance remain separate. This equivalence intentionally ignores local edge detours and is not a homotopy proof.

A 30-level, identical width-100/default-profile/100,000-node Corpus-1 cohort yielded 13 solves and 17 failures with observation OFF/ON parity on all runs. Mean normalized last-known-support depth was 0.505 for solves versus 0.239 for failures. Final observed failure losses were score/width on 15/17 and dedup on 2/17; solved runs had seven dedup, four score/width, and two with no observed extinction. See [`../reports/2026-08-11-pr1356-review-follow-up.md`](../reports/2026-08-11-pr1356-review-follow-up.md). This strengthens the retention-stage diagnosis but still does not prove true solution extinction or justify a score/width change.


## 2026-08-11 score/width forensic follow-up

The clean-commit rerun reproduced every headline result and recorded ranked pre-cull context. The 15 failed final score/width losses classify as ten clearly mis-ranked, three weak-margin, two narrowly width-saturated, zero exact-score-tie/stable-order, and zero ambiguous. Four solved controls also finally lost stored-label support at score/width with material margins and nevertheless solved, emphasizing label incompleteness. The strongest explanation is score representation under frontier saturation, not stable tie asymmetry. Remote contrastive labels are required before freezing a narrow family-reservoir counterfactual; production score, width, and dedup remain unchanged. See [`../reports/2026-08-11-winning-lineage-score-width-forensics.md`](../reports/2026-08-11-winning-lineage-score-width-forensics.md).
