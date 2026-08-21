Pathfinder Sibling and Cousin Research System

## Read-only boundary analysis

`npm run family:boundary-report -- --manifests=<manifest.json[,manifest.json]> --canonical=<baseline.json> --variants=<wide-trove.json> [--parent-levels=<corpus.json>] [--profile-joins=<selected-profile-comparisons.json>] [--relation=<mode>] [--parent=<id>] [--archetype=<name>] [--mechanic=<name[:minCount]>] [--req-int-min=N] [--nav-density-min=N] [--portal-count-min=N] [--turn-load-min=N] [--out=<report.json>] [--markdown=<summary.md>] [--severe-work-ratio=10] [--config-concentration=.75] [--min-fragile-solve-rate=0]`
joins existing family provenance and solve telemetry without invoking the solver. It emits a
deterministically ordered machine-readable relational index plus a short triage summary. The
index covers symmetry consistency/regret, continuous non-symmetry fragility evidence,
mutation-conditioned summaries, bidirectional work cliffs, winner concentration/entropy, missing
joins, and finding types suitable for the existing investigation workflow. The work-spread CLI
value controls ranking only; it is not a universal definition of fragile or robust.
The structural filters use the existing parent corpus metadata supplied through `--parent-levels`;
corresponding `*-max` forms are available for each numeric `*-min` filter.

Winning-attempt reports can add the same family lens with
`npm run solver:winning-attempts -- --inputs=<trove.json> --group-by-family=parentId|mode|parentId+mode [--family-parent=<id>] [--family-mode=<mode>]`.
Family summaries prefer `workSpent`, then `nodesExpanded`, and only then elapsed time. Winner
frequencies are scheduler-censored observations: an earlier winner prevents later configurations
from being observed, so they are not independent success probabilities or routing advice.

The boundary tool deliberately does not replace existing instruments: use
`stress:witness-divergence` / `hint-divergence.mjs` for real-state replay and causal `SCORE_*`
ablation, the existing geometry tests and family generator for transform/referee guarantees,
solution-profile compare for selected non-symmetry cases, and the failure inbox/regression tools
for promotion. Symmetry solution-space profiling is unnecessary because those variants are
isomorphic by construction.

For a selected queue edge, run real-state differential replay with
`npm run stress:family-pair-divergence -- --parent-levels=<corpus.json> --variant-levels=<family.json> --manifest=<manifest.json> --variant-id=<id> (--path=<packed-keys>|--result=<solve.json>) [--profile=default] [--out=<report.json>]`.
It compares ranks, candidate counts, first meaningful divergence, canonical referee validity, and
per-`SCORE_*` causal-ablation deltas. Symmetry paths are inverse-mapped with the shared geometry
primitive; this is diagnosis only and never retries an orientation in production.

To test whether a variant discovery adds parent-valid diagnostic knowledge, run
`npm run family:parent-hint-replay -- --parent-levels=<corpus.json> --manifest=<manifest.json> --variant-id=<id> (--path=<packed-keys>|--result=<solve.json>)`.
The default is dry-run. Add `--save-hints` only after reviewing the referee result; accepted paths
are merged through the canonical hint model with `variant-parent-replay` provenance rather than
overwriting or writing a bare path. Symmetry rejection is reported as an invariant failure;
non-symmetry similarity never implies validity.

Mission

Implement a research system that can:

1. Generate controlled variants of existing Pathfinder levels.
2. Preserve a chosen known witness where required.
3. Solve those variants under reproducible experimental conditions.
4. Compare solver behavior across related levels.
5. Identify level properties that influence:
   - solvability,
   - runtime,
   - nodes expanded,
   - winning solver configuration,
   - scheduler behavior,
   - heuristic effectiveness,
   - and solution-path selection.
6. Produce evidence that can guide solver improvements without overfitting to individual levels or sibling families.

This is a solver research instrument, not merely a procedural level generator.

The central unit of evidence should be:

«Parent level P, transformed by recorded intervention M, produced variant V, changing solver behavior from A to B.»

That relationship is the scientific payload.

---

Key concept: space is a puzzle variable, not scaffolding

A level's difficulty profile is not fully described by its object placements and win metrics
(`reqLen`, `reqInt`) alone. How much open, navigable space exists — and how much of it the witness
never actually visits — is itself a variable the solver's search techniques are sensitive to,
independent of anything the puzzle's own scoring captures. This is easy to miss (a human reading
two levels with the same objects, same witness, same required length, but different amounts of
surrounding open space would likely call them "the same puzzle," and every one of this system's
own preservation guarantees — reqLen, reqInt, object inventory — can hold exactly fixed while that
space changes) — which is exactly why it needs to be stated plainly here rather than left implicit.

This was confirmed empirically, not just argued for: growing a repair-gated level's grid — adding
only empty, completely unused space, zero object or witness changes of any kind — flipped it from
complete solver-technique failure to complete success at every grid size tested, and changed which
technique won for a different level in the same test. See
`reports/families/2026-07-15-re-embedded-cousin-grid-growth.md` and the parallel gotcha in
CLAUDE.md's Solver Architecture "Common gotchas". **Re-embedded-witness cousins (section 1) and
`--mode=density-sweep` (Implementation status) are this system's two purpose-built tools for
varying space in isolation** — re-embedding varies raw grid size/navigable area around unchanged
content, density-sweep varies block count directly — precisely because no strict-inventory sibling
mode (local-mutant, swap, group-reshuffle, constrained-shuffle, symmetry) can move this variable at
all: they hold object counts fixed, and object counts are what space is defined in terms of
(`navDensity` = reqLen / open-cell-area). A generation mode that never touches space cannot be used
to study it, and a report that varies only objects or orientation should not claim to have
characterized a level's full difficulty profile.

---

Implementation status (updated 2026-07-15)

Generation (`scripts/family-generate.mjs`, tested in `scripts/family-generate-node-test.mjs`
— `npm run test:family-generate`) covers 6 of the 7 sibling/cousin relations named in section 1,
plus one experimental mode outside that taxonomy:

- **Identity control** — implicit: every mode's own unmutated parent re-solve is the identity
  baseline; no separate `--mode` needed.
- **Symmetry sibling** (`--mode=symmetry`) — all 7 non-identity rotations/reflections via
  `modules/domain/geometry.ts`'s `transformPoint`/`transformAxis`/`transformTurnDir`, the same
  primitives the play-mode random-orientation display variant and the editor's Rotate/Mirror
  already use. Reuses rather than reimplements those primitives; see the mode's own docstring
  in `family-generate.mjs` for why this still tests something the display variant doesn't (the
  display variant is screen-only and never changes what the solver sees, so symmetry siblings
  are the first thing that actually exercises solver-side orientation bias).
- **Local mutant** (`--mode=local-mutant`, default) — single-object relocation under strict
  inventory, section 8's core tier.
- **Swap mutation** (`--mode=swap`).
- **Mechanic-group reshuffle** (`--mode=group-reshuffle --group=<type>`).
- **Full constrained-shuffle** (`--mode=constrained-shuffle`), most-constrained-first per
  section 9.
- **Re-embedded-witness cousin** (`--mode=re-embed`) — the first cousin tier (section 1);
  grows the grid around the unchanged parent content.
- **Recipe cousin** — deliberately **not implemented**. Section 9 defers it until sibling/cousin
  findings from the tiers above are understood; this scoping decision stands.
- **`--mode=density-sweep`** — not one of this doc's named relations. Adds/removes blocks under
  relaxed (not strict) inventory to vary `navDensity` directly, purpose-built to test
  density-keyed solver thresholds (`prep.ts`'s `DENSE_LEVEL_NAV_DENSITY`,
  `attempts.ts`'s `NEAR_HAMILTONIAN_DENSITY`) that no strict-inventory mode can move. See
  `reports/families/2026-07-15-P00110-density-sweep.md` for the first real finding produced
  with it.

Every mode replays the (inherited or transformed) witness against the canonical validator
before accepting a variant, mints append-safe mode-qualified sibling ids
(`F<parent>-<modeAbbrev>-NN`, never reused, never collides across modes or repeated runs against
the same parent — see the id-collision regression tests), and stamps both `LevelProvenance` and
`Hint`/`HintProvenanceEntry` via the codebase's real provenance systems rather than a parallel
scheme (section 11a; `scripts/stress/witness-provenance.mjs`'s `inheritedWitnessHint`/
`transformedWitnessHint`, `INHERITED_WITNESS_ID`/`TRANSFORMED_WITNESS_ID` in
`modules/domain/hint-types.ts`).

**Experiment operating policy (added 2026-07-15, after a session ran 5 experiments without
following it — see the gap called out below)**:

- **Solve family/cousin variants with `--save-hints`.** `portfolio-solve-sweep.mjs` (or any
  equivalent corpus solver runner) accepts `--save-hints` specifically to merge solve-time
  discoveries into each variant's own hint corpus as real `HintProvenanceEntry` records — section
  11a already specifies the *design* for this (witness-style provenance for the constructed
  witness, solver-style provenance for everything the solver actually finds); this is the
  operational mandate to actually invoke it that way by default, not just when convenient. Without
  it, a variant's hint file only ever contains its constructed witness, and every real experimental
  solve — the actual data this whole system exists to produce — is stranded in a throwaway
  solve-result JSON file instead of becoming part of the level's permanent record.
- **Run hint enumeration on generated family/cousin levels as a normal, default part of generating
  them — not an optional afterthought.** `scripts/hint-workbench.mjs --levels-json=<family corpus>`
  and `scripts/hint-corpus-expand.mjs --levels-json=<family corpus>` both accept an arbitrary
  corpus path (not just `data/levels.json`) and derive their hints directory from it the same way
  the three real corpora do, so they work against family/cousin corpora with no extra plumbing.
  Enumeration matters because a single discovered path only ever tells you whether one technique
  *succeeded* on one attempt — it cannot distinguish "this variant's actual solution space shrank"
  from "the solution space is unchanged and one search technique simply missed it," and those two
  explanations call for completely different follow-up. **It is fine to skip enumeration when a
  specific experiment's scope genuinely doesn't benefit from having multiple hints** (e.g. a quick
  single-config pass/fail check) — defer it to a later, separate task against those same levels if
  they turn out to matter for something else, rather than skipping it silently and never returning
  to it.
- **The gap this policy closes**: the 2026-07-15 five-experiment session
  (`reports/families/2026-07-15-{symmetry-orientation-bias,local-mutant-config-sensitivity,
  swap-sibling-sensitivity,re-embedded-cousin-grid-growth,dose-response-mutation-intensity}.md`)
  ran every solve without `--save-hints` and enumerated hints for none of its ~40 generated
  families. The raw numbers aren't lost (committed in each report's raw solve-result JSON), but
  none of it became part of the levels' own permanent hint/provenance record the way section 11a's
  design intends. Treat that as the gap this policy exists to close, not as a precedent.

Reporting: `scripts/family-analyze.mjs` (tested in `scripts/family-analyze-node-test.mjs` —
`npm run test:family-analyze`) joins a family manifest against `portfolio-solve-sweep.mjs`
solve-result JSON into a per-variant mutation-effect delta table (section 18's mutation-effect
analysis, a first slice of section 22's variant-ledger/local-mutation-report concepts) — solve
status, nodes, ms, winning config, and deltas vs. the parent, with a mode-aware
`describeMutation` covering all 7 generation modes' distinct manifest shapes. The richer
section-22 report set (family summary, boundary report, symmetry/scheduler/generator-bias
reports, the static HTML explorer) is not built yet.

Not yet built: the corpus solver runner beyond direct `portfolio-solve-sweep.mjs` invocation
(section 13), boundary mining (section 19), and the section-21/23 scheduler-analysis and
command-line-workflow conveniences. Treat sections 13, 19, 21-23 as still describing target
state, not current behavior.

Section numbers above refer to [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md),
the original proposal this system implements.

---

1. Terminology and experimental categories

Use these terms consistently throughout the implementation and reports.

Parent

An existing level from which variants are generated.

A parent may be:

- currently solved by the solver,
- currently unsolved by the solver but known to be valid,
- human-authored,
- procedurally generated,
- published,
- held out,
- or part of a stress corpus.

Witness

A known valid solution path for a level.

A witness proves that the level is solvable. It is not assumed to be:

- unique,
- optimal,
- the path the solver will find,
- or representative of all valid solutions.

A level with multiple solutions permits multiple valid witnesses. For sibling generation, choose one specific witness as the preserved control.

If a parent has several known hints or solutions, treat each selected witness as a separate family branch because different witnesses create different legal placement opportunities.

Example:

parent L42
  witness branch A
  witness branch B
  witness branch C

Do not combine these into one undifferentiated family.

Exact-witness sibling

A variant in which the exact original coordinate path remains a valid solution.

The solver may find a different valid solution. That is an experimental result, not a failure of sibling preservation.

Exact-witness siblings are the primary research object because they allow a strong comparison:

«Same known path and same win metrics, different arrangement of compatible level objects.»

Local mutant

An exact-witness sibling produced by one small intervention, such as:

- moving one block,
- moving one must-pass,
- moving one must-cross,
- moving one goose,
- relocating one unused portal pair,
- rotating or moving one filter where legal,
- swapping two eligible objects,
- or changing one intrinsic property under an explicitly permitted mutation mode.

Local mutants provide the strongest causal comparisons because very little changes between parent and variant.

Symmetry sibling

A whole-level rotation or reflection that preserves logical structure.

The level, all objects, axes, and witness are transformed together.

Symmetry siblings primarily test the solver. A symmetry should not materially change the puzzle’s abstract difficulty. Large performance differences expose coordinate, direction, gate-order, or move-order biases.

Constrained-shuffle sibling

A variant produced by broadly re-placing eligible objects while preserving:

- the selected exact witness,
- grid dimensions,
- required path length,
- required intersections,
- object inventory under a defined inventory policy,
- and full level validity.

These reveal how sensitive a witness family is to object arrangement.

Re-embedded-witness cousin

A close cousin in which the witness’s abstract structure is preserved but its coordinates change.

Possible transformations include:

- rotation,
- reflection,
- translation,
- placement within a larger compatible grid,
- or a deliberately constrained geometric re-embedding.

Preserve as much as possible of:

- path length,
- intersection count,
- revisit structure,
- turn sequence,
- objective order,
- crossing events,
- portal-event sequence,
- and endpoint relationship.

This is weaker than an exact-witness sibling because the coordinate path changes, but it remains a controlled relative.

When re-embedding into a larger grid, the newly added surrounding area is left completely open (no
objects placed into it) — but do not read "no objects" as "inert" or "irrelevant to the solver."
See "Key concept: space is a puzzle variable, not scaffolding" above: the added space is itself the
variable this mode exists to isolate, and it has been shown to change solver technique and
outright success/failure on its own, with zero object or witness change. Re-embedding's whole value
as an experimental tool comes from varying space while holding everything else fixed — never treat
the grown grid as a no-op wrapper around an unchanged puzzle.

Recipe cousin

A newly generated level that preserves a declared recipe such as:

- grid dimensions,
- required length,
- required intersections,
- object counts,
- mechanic counts,
- density bucket,
- witness signature,
- or solver archetype.

It may use a completely different witness and object arrangement.

Recipe cousins are useful for population-level generalization and benchmark expansion. They are not strong counterfactual siblings and must never be mixed into sibling-effect statistics.

---

2. Research questions

The system should support at least these questions.

Placement sensitivity

For a fixed witness:

- How often do legal object rearrangements remain solver-solvable?
- How much does runtime vary?
- Which object types cause the largest changes?
- Which placements create sharp solved-to-unsolved transitions?

Witness difficulty versus arrangement difficulty

For a family sharing one witness:

- Is the family consistently easy or hard?
- Is the parent an unusually hostile arrangement?
- Is the parent unusually lucky?
- Does most difficulty come from path geometry or constraint placement?

Technique sensitivity

Across siblings:

- Does the same solver configuration keep winning?
- Do different arrangements favor different strategies?
- Which mechanics predict specialist configurations?
- Which configurations are robust across a family?

Scheduler behavior

Across siblings:

- Which configurations are fast-or-never?
- Which have meaningful late tails?
- Do scheduler tiers generalize across related placements?
- Which level features predict the need for longer specialist slices?

Heuristic and pruning diagnosis

For near-identical solved and unsolved variants:

- What changed in the search trajectory?
- Which heuristic score became misleading?
- Which lower bound became weak?
- Which branch ordering changed?
- Which prune dominated?
- Did the solver fail to reach the relevant region or reach it and abandon it?

Symmetry bias

For logically equivalent rotations and reflections:

- Does runtime change?
- Does node count change?
- Does winning configuration change?
- Does gate or move ordering create systematic directional preferences?

Solution-attractor behavior

Across siblings:

- Does the solver reproduce the preserved witness?
- Does it find a different solution?
- Do many configurations converge on one solution family?
- Do small placement changes create new easy alternative solutions?

---

3. Non-goals

Do not initially:

- replace the production level generator,
- alter puzzle rules,
- change solver heuristics,
- train an ML scheduler,
- create level-ID-specific solver behavior,
- use solver success as a generation-validity test,
- assume a preserved witness is unique,
- claim random sampling is uniform unless it truly is,
- or mix sibling and cousin results into one aggregate.

The first goal is trustworthy experimental infrastructure.

---

4. Audit the current rule and data interfaces

Before implementing generation, inspect the current branch and identify the canonical interfaces for:

- raw-level cloning,
- normalization and denormalization,
- coordinate packing and unpacking,
- symmetry transforms,
- path replay,
- move validation,
- full win validation,
- solver invocation,
- attempt telemetry,
- hint provenance,
- and corpus execution.

The current code already appears to contain useful seams such as:

- canonical level cloning,
- normalization and denormalization,
- coordinate transforms,
- axis transforms,
- move legality checks,
- SolverV2 raw-level preparation,
- and direct solver scripts.

Reuse those rather than creating parallel definitions.

The agent must identify one canonical, solver-independent function equivalent to:

validateWitnessAgainstLevel(level, path)

This validator must replay the complete path under actual game rules and verify:

- legal starting gate,
- legal movement,
- portal transitions,
- block and hazard avoidance,
- filter legality,
- flipping-filter state,
- edge reuse rules,
- false-goal behavior,
- exact path length,
- exact intersection count,
- must-pass completion,
- must-cross completion,
- and goal completion.

If no clean full-path validator exists, extract one from the game engine or referee. Do not implement a simplified sibling-only interpretation of the rules.

The solver itself must not be the validity oracle.

---

5. Witness analysis

Implement a witness analyzer that converts a path into a detailed event model.

For every path step, record:

- step index,
- cell key,
- coordinate,
- visit number for that cell,
- incoming axis,
- outgoing axis,
- whether the step is part of a portal jump,
- whether the cell is an intersection,
- whether a new intersection is created at that step,
- whether the path turns there,
- entry and exit edges,
- current intersection total,
- and any relevant flipping-filter phase.

Also derive:

- visited cells,
- unvisited cells,
- off-path cells,
- cells visited once,
- cells visited multiple times,
- true crossing cells,
- horizontal-compatible cells,
- vertical-compatible cells,
- turn cells,
- straight-through cells,
- endpoint cells,
- portal jump edges,
- path-edge set,
- path-cell sequence,
- objective order,
- and crossing order.

This event model should drive object-placement eligibility.

Do not infer eligibility from visit counts alone where actual rule replay can answer the question more reliably.

---

6. Object-placement eligibility

Implement an extensible object-rule registry.

Each object type should define:

- whether it is movable under each generation mode,
- its eligible cells or placements,
- intrinsic properties that must be preserved,
- compatibility constraints,
- collision constraints,
- and final validation requirements.

Gate and goal

For an exact-coordinate witness:

- the gate used by the witness must remain at the first path cell,
- the goal must remain at the final path cell.

If the level contains additional unused gates, they may be movable only to cells that do not invalidate the witness.

Moving the witness’s actual start or goal belongs in re-embedded-witness cousin generation, not exact-witness sibling generation.

Must-pass

A must-pass may be placed only on a cell visited by the preserved witness.

Preserve object count.

For strict inventory mode, preserve distinct-object count even if multiple placements would be logically redundant.

Must-cross

A must-cross may be placed only where the preserved witness satisfies the actual must-cross rule.

Do not assume that every multiply visited cell qualifies. Use witness replay and the canonical rule interpretation.

Must-cross placement freedom may be very limited. Report the eligible pool size rather than silently relaxing the rule.

Blocks

Blocks must not occupy cells or transitions required by the witness.

They must also satisfy general level schema and collision rules.

Geese or other hazards

Hazards must not occupy cells touched by the preserved witness if touching them would invalidate the solution.

Regular filters

A regular filter may be placed only where every applicable non-portal traversal through that cell is compatible with its axis.

If filter axis is part of the strict inventory, preserve horizontal and vertical filter counts separately.

A relaxed inventory experiment may allow axis reassignment, but it must be a separately named mode and recorded as a mutation.

Flipping filters

Eligibility must be determined by replaying the witness with flipping state.

A placement is legal only if some permitted initial axis, or the preserved intrinsic axis under strict inventory, allows every witness traversal according to actual flip timing.

Do not approximate this using static incoming and outgoing axes.

Portals

Separate used and unused portal pairs.

For exact-witness siblings:

- portal terminals used by the witness are strongly tied to the witness’s explicit jump transitions,
- used jump edges generally cannot be relocated without changing the exact coordinate path,
- unused portal pairs may be movable to off-path cells where they do not force or obstruct witness behavior.

If portal pairing can be changed while preserving the exact replay, allow it only after canonical validation proves the witness remains valid.

Portal color is decorative unless the game assigns it semantics. Preserve pair count and pair identity in strict inventory mode.

False goals

Eligibility must be determined by full witness replay because false-goal effects may depend on order or armed state.

Do not simply classify false goals as “off-path only” unless the canonical rules prove that restriction.

Future mechanics

Design the registry so new mechanics such as must-turn, directional turns, surround obligations, or other constraints can add eligibility logic without rewriting the generator core.

---

7. Inventory policies

Support explicit inventory policies.

Strict inventory

Preserve:

- object counts,
- object types,
- filter-axis counts,
- flipping-filter-axis counts,
- portal-pair count,
- and any other intrinsic mechanical properties.

This should be the default for exact-witness siblings.

Type-count inventory

Preserve base object-type counts but permit compatible reassignment of intrinsic properties, such as changing a filter axis.

This is a weaker intervention and must be reported separately.

Partial mutation inventory

Move only selected object types while leaving all others fixed.

Examples:

- blocks only,
- objectives only,
- filters only,
- hazards only,
- unused portals only.

This is valuable for isolating mechanic-specific effects.

---

8. Generation modes

Implement generation as deterministic, seeded operations.

Identity control

Clone the parent without changing geometry.

Run it through the complete generation, serialization, validation, and solving pipeline.

This detects pipeline-induced changes.

Symmetry generation

Generate all valid rotations and reflections supported by the grid shape.

Transform:

- objects,
- witness,
- axes,
- portals,
- gates,
- goal,
- and all mechanic-specific orientation.

Deduplicate equivalent symmetries using a canonical level hash.

Single-object local mutation

For each eligible object:

1. Enumerate or sample legal alternative placements.
2. Produce variants changing only that object.
3. Preserve the witness.
4. Record exact before and after values.

For paired objects such as portals, treat the pair as one mutation unit.

Swap mutation

Swap compatible object placements while preserving object inventory and witness validity.

Mechanic-group reshuffle

Re-place all objects of one selected type or mechanic group.

Examples:

- all blocks,
- all must-pass objects,
- all must-cross objects,
- all filters,
- all hazards.

Full constrained shuffle

Re-place all legally movable objects while preserving the witness and inventory policy.

Objects that cannot move under the selected witness remain fixed. The manifest must say so explicitly.

Re-embedded-witness cousin generation

After exact sibling infrastructure is reliable, add controlled transformations that move the witness while preserving its abstract structure.

Start with transformations that are easy to verify:

- translation,
- rotation,
- reflection,
- and embedding within compatible grid dimensions.

Do not begin with arbitrary path deformation.

Recipe-cousin generation

Add only after sibling analysis is operational.

Generate a new valid witness and level while preserving a declared feature recipe. Store the recipe explicitly.

Recipe cousins should be used for:

- generalization testing,
- benchmark expansion,
- solver-population studies,
- and checking whether sibling-derived findings transfer to unrelated witnesses.

---

9. Constraint-solving strategy

Use a seeded randomized backtracking generator first.

The generator should:

1. Build eligible placement domains from the witness event model.
2. Apply most-constrained-first ordering.
3. Reject collisions and rule incompatibilities early.
4. backtrack when later objects have no legal placements.
5. replay the witness with the canonical validator before acceptance.

Record:

- generation seed,
- proposal count,
- backtrack count,
- rejection count,
- rejection reasons,
- eligible-domain size for each object,
- placement order,
- and generation time.

If randomized backtracking becomes inadequate, consider a constraint solver later. Do not introduce a large dependency before measuring the actual need.

The generator must never relax constraints silently.

If a witness cannot support the requested strict inventory, return a structured result such as:

unsiblingable under strict inventory:
  required mustCross objects: 3
  eligible mustCross cells: 1

This “family capacity” is itself useful data.

---

10. Sampling integrity

Do not claim that accepted siblings are uniformly random unless the generator mathematically guarantees it.

The accepted distribution may be biased by:

- object placement order,
- domain sizes,
- rejection behavior,
- backtracking strategy,
- or early constraint choices.

Record enough generation telemetry to characterize this selection pressure.

Keep two sibling datasets separate.

Protocol sample

Generated under a fixed, predeclared sampling protocol.

Use this dataset to estimate:

- family solve rates,
- timing distributions,
- robustness,
- and object sensitivity.

Adaptive sample

Generated after observing solver results, concentrating on:

- solved/unsolved boundaries,
- unusually slow variants,
- rare specialist wins,
- or high-variance regions.

Use this dataset for diagnosis and discovery.

Do not mix adaptive samples into unbiased frequency estimates.

---

11. Provenance and manifests

Store witnesses separately from solver-facing level data.

The solver should receive an ordinary level with no hidden witness information unless a specific hint-guided experiment is explicitly requested.

Every family should have a manifest containing:

familyId
parentLevelId
parentRevision or content hash
source corpus
authoring origin
selectedWitnessHash
selectedWitnessLength
selectedWitnessIntersectionCount
family mode
generator version
validator version
created timestamp

Every variant should record:

variantId
familyId
relation:
  identity
  symmetry
  local-mutant
  constrained-shuffle
  re-embedded-cousin
  recipe-cousin

randomSeed
inventoryPolicy
parentContentHash
variantContentHash
hiddenWitnessHash
witnessRelation:
  exact-coordinate
  transformed
  structural
  recipe-only

mutationManifest
eligibleDomainSizes
fixedObjects
movedObjects
generationAttempts
backtracks
rejectionCounts
rejectionReasons
canonicalValidationResult

The mutation manifest should describe exact interventions:

object type
object identity
operation
old position or property
new position or property
reason selected

Use stable content hashes so duplicate variants can be detected across runs.

---

11a. Integrate with the codebase's existing provenance systems — do not build a parallel one

The manifest fields above are the family/generation-run bookkeeping this system needs for its own analysis tooling. They are not a substitute for the two provenance systems the codebase already has, and every generated level and every hint recorded against it must flow through those systems rather than around them.

This section describes the design. For the operational mandate — actually pass `--save-hints`
when solving variants, actually run hint enumeration on generated levels by default — see
"Implementation status"'s "Experiment operating policy" above; that section also records the
2026-07-15 session that built this design without yet following that mandate.

Level provenance

Every accepted variant is a newly created level and therefore falls under the existing invariant that every newly-created level carries provenance, stamped at creation (see CLAUDE.md's Provenance section; type in `modules/domain/level-provenance-types.ts`). Concretely:

- `actor: 'procedural'`.
- `action`: the variant's relation, e.g. `'identity-generated'`, `'symmetry-generated'`, `'local-mutant-generated'`, `'constrained-shuffle-generated'`, `'re-embedded-cousin-generated'`, `'recipe-cousin-generated'`.
- `method`: the generator's own id/version string.
- `detail`: at minimum `familyId`, `parentLevelId`, `parentContentHash`, `relation`, `witnessRelation`, and a short mutation summary — enough for the level to be self-describing on its own, independent of whether the fuller family manifest artifact is still around. The full manifest (eligible-domain sizes, backtrack/rejection telemetry, generation attempts) stays in its own analysis artifact; it is not required to reconstruct what the level *is*, only how it was produced.
- Append via `appendProvenanceEntry`, never hand-constructed — a variant produced from a parent that already carries provenance history gets this entry appended on top of that history, not a fresh one that discards it.

Do not invent a second "family manifest as provenance" concept that lives only in the generator's own output files. If a variant is copied, re-serialized, or fed back through `denormalizeLevel`/`buildWireLevelData` outside the family tooling, its `LevelProvenance` field is what survives — the manifest file may not.

Hint provenance, including re-discovery

This directly answers the "keep provenance updated as solve is re-discovered" requirement:

- A variant's **preserved witness**, when persisted as that variant's hint, is *constructed*, not *found by search* — record it with a witness-style `solver.id` (reuse `WITNESS_GENERATOR_ID` from `modules/domain/hint-types.ts` if the witness coordinates are inherited unchanged from the parent; mint an analogous sibling/cousin-generator id if the generator transformed the coordinates, e.g. re-embedding). Do not stamp it with `SOLVER_ID` as if the production solver discovered it cold.
- Every time the corpus solver runner (production-like or research-portfolio mode) solves a variant — whether it rediscovers the exact preserved witness or lands on a different valid solution — that is a genuine new `HintProvenanceEntry`. Build it through the existing single source, `deriveSolveAttemptInfo`/`provenanceFromSolveResult`/`hintsFromVarietyResult` in `modules/solver/hint-provenance.ts` (the same seam `scripts/hint-workbench.mjs` and the UI solver path already use), then merge it in with `mergeHints` (`modules/domain/hint-types.ts`) — by path signature, a rediscovery of an already-known path appends a new provenance entry to that `Hint`, it is never dropped or treated as a duplicate to discard. This is exactly the "same path independently rediscovered → new entry, not a new hint, never silently lost" guarantee CLAUDE.md documents for the production hint corpus, and the family system should rely on it rather than reimplementing it.
- Set `context.levelRevision` to the **variant's own** canonical fingerprint, not the parent's — they are expected to differ (that is the whole point of a level-fingerprint hash), and a hint whose `levelRevision` points at the wrong level silently stops being trustworthy the moment anyone tries to cross-check it later.
- Classifying a solve result against the hidden witness (section 15's "found preserved witness / found close witness-relative solution / found structurally different solution / found newly opened alternative solution") falls out of this almost for free once witness entries and solver-found entries are both stored as ordinary `HintProvenanceEntry` records on the same `Hint`/variant: the comparison is over entries already carrying `solver.id`, `search.termination`, and path identity, not a separate ad-hoc classification pass.

Storage location

These are solver-research artifacts, not player content and not a fourth real corpus — same status `data/stress/` already has ("NOT player content, never loaded by the app, never shipped"). Hint files for generated variants should use the same on-disk artifact schema (`{schemaVersion: 3, hints: Hint[]}`) read and written exclusively through the existing helpers in `scripts/level-data-io.mjs` (`readLevelHints`/`writeLevelsWithHints`/`parseHintFileContents`/`stringifyHints`, keyed the same way via `hintKeyForLevel`) rather than new bespoke I/O. Give them their own directory (e.g. `data/families/hints/`) rather than folding them into `data/stress/hints/` or `data/stress/hints-random/`, which already belong to two distinct, independently-numbered corpora.

---

12. Variant validation pipeline

Every generated sibling or cousin must pass:

1. Schema validation.
2. Coordinate and bounds validation.
3. Occupancy and collision validation.
4. Normalization and denormalization round-trip validation.
5. Object inventory validation.
6. Hidden witness replay.
7. Exact win-metric validation.
8. Canonical level serialization.
9. Duplicate detection.

For exact-witness siblings, the hidden witness must match the original coordinate sequence exactly.

For symmetry siblings, applying the inverse transform should recover the original level and witness.

For cousins, validate according to their declared witness relation.

Solver success must not be required for acceptance. Unsolved valid variants are often the most valuable output.

---

13. Solver experiment runner

Implement a corpus runner that can operate on parents, siblings, and cousins.

Support at least two solving modes.

Production-like mode

Run the normal scheduler and stop on the first valid solution.

Use this to measure actual user-facing solver behavior.

Research portfolio mode

Run all selected applicable configuration × gate attempts under standardized explicit caps, even if another configuration has already solved the level.

This avoids censoring caused by attempt order.

For every attempt, record:

- complete configuration identity,
- gate,
- scheduler pass,
- allocated budget,
- elapsed time,
- nodes expanded,
- success,
- termination reason,
- timeout status,
- random seed,
- solution path hash,
- and whether a previous configuration had already solved the level.

Use true per-attempt caps. Do not shrink the entire outer solver budget to simulate an attempt cap.

Research mode may be expensive, so allow it to run on selected families or samples rather than every generated variant.

---

14. Experimental reproducibility

For every solver run, record:

- solver version,
- git commit,
- scheduler configuration,
- attempt configuration list,
- machine/runtime information,
- level hash,
- variant manifest,
- solver random seed,
- time budget,
- node budget where available,
- and timestamp.

Reset all solver state between variants.

Do not allow:

- cached hints,
- prior sibling solutions,
- hidden witnesses,
- or family labels

to influence ordinary cold solving.

If the solver includes randomized behavior, run multiple fixed seeds where needed.

Use nodes expanded as the primary stable cost measure and elapsed time as the practical secondary measure.

For timing-sensitive benchmarks:

- avoid parallel CPU contention,
- randomize or interleave run order,
- periodically rerun parent controls,
- and separate level-preparation time from search time.

---

15. Solution comparison

After solving, compare the found solution with the hidden witness.

Record:

- exact path equality,
- path hash,
- cell-set overlap,
- edge-set overlap,
- ordered path similarity,
- crossing-location overlap,
- objective-order similarity,
- portal-event similarity,
- and symmetry-equivalent equality where relevant.

Classify results such as:

found preserved witness
found close witness-relative solution
found structurally different solution
found newly opened alternative solution
unsolved

A sibling remains valid even when the solver finds a different solution.

Alternative-solution emergence is important. A rearrangement may leave the witness intact while creating a much easier route. That should be distinguished from making the preserved witness easier to discover.

---

16. Analysis model

Treat the family, not the individual sibling, as the primary statistical unit.

A thousand siblings from one witness do not constitute a thousand independent examples.

When estimating generalization:

- split train and test data by parent family,
- hold out entire witnesses,
- bootstrap whole families,
- and never place siblings from the same family on both sides of a validation split.

Use within-family paired deltas wherever possible.

Primary comparisons include:

parent outcome versus sibling outcome
before-mutation versus after-mutation
symmetry A versus symmetry B
configuration behavior across one family
same mutation type across many families

---

17. Family-level metrics

Produce, per family:

- sibling count,
- valid-generation rate,
- family capacity,
- solve rate,
- timeout rate,
- median and tail runtime,
- median and tail nodes,
- winning-configuration distribution,
- configuration entropy,
- fallback-only rate,
- late-win rate,
- preserved-witness discovery rate,
- alternative-solution rate,
- sensitivity by object type,
- and symmetry variance.

Useful derived labels include:

Robust family

Most legal siblings solve cheaply under several configurations.

Arrangement-sensitive family

Small placement changes cause large solver-performance differences.

Specialist-dependent family

Most solves come from one narrow configuration.

Witness-hard family

Most exact-witness siblings remain difficult regardless of placement.

Hostile-parent family

The original parent is much harder than most of its siblings.

Lucky-parent family

The original parent is substantially easier than most siblings sharing its witness.

Chaotic family

Small interventions cause large and inconsistent changes in behavior.

---

18. Mutation-effect analysis

For each local mutation, calculate:

- change in solve status,
- elapsed-time delta,
- node delta,
- scheduler-pass delta,
- winning-configuration change,
- solution-path change,
- and provenance-diversity change.

Aggregate effects by:

- object type,
- operation type,
- original relationship to witness,
- new relationship to witness,
- parent archetype,
- grid size,
- density,
- intersection burden,
- and mechanic combination.

Prefer relational features over raw coordinates.

Examples:

- distance to nearest witness intersection,
- progress position along the witness,
- distance from gate,
- distance from goal,
- corridor width,
- nearby obstacle density,
- number of legal approaches,
- location before or after mandatory objectives,
- portal endpoint separation,
- filter phase,
- and proximity to repeated cells.

The desired output is an explanation such as:

«Moving a must-cross late in the witness into a narrow two-approach region strongly increases perimeter-search failures.»

That is more actionable than:

«Cell (7, 4) is difficult.»

---

19. Boundary mining

Build a graph for local sibling families.

- Each node is a variant.
- Each edge is one recorded mutation.
- Node labels include solve result, time, nodes, winning configuration, and solution class.

Identify:

- solved/unsolved adjacent pairs,
- fast/slow adjacent pairs,
- configuration-switch boundaries,
- broad easy plateaus,
- hard basins,
- and isolated pathological arrangements.

Once a boundary is found, allow an adaptive generation mode that explores nearby mutations.

Keep these adaptive variants separate from the protocol sample.

The highest-value diagnostic object is often:

«Two valid levels with the same witness and nearly identical objects, where one solves quickly and the other times out.»

---

20. Symmetry analysis

Generate all nonduplicate logical symmetries for selected parents.

Report:

- solve-status disagreement,
- runtime ratio,
- node ratio,
- winning-configuration disagreement,
- gate-selection differences,
- move-direction preferences,
- and path-selection differences.

Flag large symmetry failures automatically.

A reflected level becoming dramatically harder indicates a solver bias, not a genuinely harder puzzle.

This can reveal:

- fixed directional move ordering,
- coordinate-dependent tiebreakers,
- gate ordering effects,
- perimeter clockwise versus counterclockwise imbalance,
- and asymmetrical hashing or queue behavior.

---

21. Scheduler analysis

Use sibling families to test whether the fast portfolio scheduler generalizes.

For each full configuration, report across families:

- success probability within 100 ms,
- 250 ms,
- 500 ms,
- 1 second,
- 2 seconds,
- and 5 seconds,
- late-win concentration,
- feature-conditioned win curves,
- and family-conditioned win curves.

Distinguish:

- attempt-local elapsed time,
- cumulative scheduler time before the winner,
- and total solve time.

Look for cases where:

- a normally fast-or-never configuration develops a real late tail,
- specialist behavior is family-specific,
- feature buckets predict which configurations deserve escalation,
- or sibling placement changes alter the winning scheduler tier.

Do not train or hard-code scheduler rules from one family and evaluate them on that same family.

---

22. Reports and tools

Produce machine-readable JSON first, plus concise human-readable reports.

Family summary report

One row per parent/witness family containing:

- generation statistics,
- solve statistics,
- robustness,
- performance tails,
- winning configurations,
- and notable anomalies.

Variant ledger

One row per sibling or cousin containing:

- identity,
- relation,
- mutation summary,
- witness relation,
- validation result,
- solve result,
- cost,
- winning configuration,
- and solution comparison.

Local mutation report

Rank mutations by:

- solve-status effect,
- runtime effect,
- node effect,
- and consistency across families.

Boundary report

List the strongest near-identical behavioral contrasts.

Symmetry report

List directional or coordinate biases.

Configuration-transfer report

Show how each solver configuration performs across sibling families and cousins.

Scheduler report

Show pass recovery, late wins, and fallback dependence across families.

Alternative-solution report

Show which mutations create new solution attractors.

Generator-bias report

Show:

- domain sizes,
- rejection rates,
- backtracking,
- unsiblingable parents,
- and accepted-sample skew.

A simple static HTML explorer may be added after the JSON reports are trustworthy. It should allow filtering by family, mechanic, mutation, solve status, and winning configuration.

---

23. Command-line workflow

Add commands equivalent to:

generate sibling families
validate generated corpus
solve generated corpus
run all-config research audit
analyze family results
find boundary pairs
generate adaptive boundary mutations
generate cousins
compare sibling and cousin generalization

Commands should accept:

- parent level selection,
- witness selection,
- generation mode,
- object-type filters,
- inventory policy,
- seeds,
- variants per parent,
- solver mode,
- budgets,
- output directory,
- and resume behavior.

All outputs should be append-safe or content-addressed so interrupted runs can resume without corrupting completed results.

---

24. Initial parent selection

Begin with a stratified pilot rather than the whole corpus.

Include representatives of:

- very fast solved levels,
- slow solved levels,
- late specialist wins,
- single-configuration wins,
- multi-configuration wins,
- high provenance diversity,
- low provenance diversity,
- currently unsolved but known-valid levels,
- portal-heavy levels,
- must-cross-heavy levels,
- high-intersection levels,
- filter and flipping-filter levels,
- open grids,
- dense grids,
- and multiple-gate levels.

For solved parents with several witnesses, include a small number of separate witness branches.

Do not select parents only because they are convenient for the generator.

---

25. Initial experimental matrix

For the pilot, generate:

1. Identity controls for every parent.
2. All unique symmetry siblings.
3. Local one-object mutations where domains are manageable.
4. A modest fixed number of constrained-shuffle siblings per witness family.
5. A smaller set of re-embedded-witness cousins after sibling validation is complete.
6. Recipe cousins only after the initial sibling findings are understood.

Run:

- production-like solving on every generated variant,
- all-config research solving on a representative subset,
- and repeated solver seeds only where behavior is randomized or unstable.

Use the pilot to determine useful scale. Do not generate millions of variants before learning which families contain informative variation.

---

26. Implementation phases

Phase 0: Interface and rule audit

Deliver:

- map of current level, validation, solver, telemetry, and serialization APIs,
- identification of the canonical path-validation route,
- and a short design note describing where the new system will attach.

No behavior changes.

Phase 1: Witness oracle and event analyzer

Implement:

- canonical witness replay,
- event-table extraction,
- path hashing,
- compatibility pools,
- and diagnostic rejection reasons.

Tests must include all existing mechanics.

Phase 2: Identity and symmetry controls

Implement:

- identity generation,
- rotations and reflections,
- axis transformation,
- inverse-transform validation,
- canonical hashing,
- and deduplication.

Run the solver on symmetry controls and produce the first bias report.

Phase 3: Exact-witness local mutations

Implement:

- object registry,
- eligible-domain calculation,
- one-object moves,
- swaps,
- strict inventory,
- manifests,
- and final witness validation.

Phase 4: Constrained shuffling

Implement:

- seeded randomized backtracking,
- most-constrained-first placement,
- rejection telemetry,
- family-capacity reporting,
- and partial mechanic-group reshuffles.

Phase 5: Corpus solver runner

Implement:

- production-like mode,
- research all-config mode,
- cold-state isolation,
- per-attempt telemetry,
- path capture,
- and resumable output.

Phase 6: Core analysis reports

Implement:

- family summary,
- variant ledger,
- mutation effects,
- configuration transfer,
- solution comparison,
- generator bias,
- and scheduler timing reports.

Phase 7: Pilot study

Run the stratified parent sample.

Identify:

- high-variance families,
- symmetry failures,
- solver-sensitive mechanics,
- and useful local boundaries.

Do not tune the solver yet.

Phase 8: Boundary mining

Generate adaptive local variants around the strongest behavioral cliffs.

Add search-trajectory diagnostics where available.

Phase 9: Cousins

Add re-embedded-witness cousins first.

Add recipe cousins only after defining which family features should be preserved.

Use cousins to test whether findings from exact siblings generalize beyond the original witness geometry.

Phase 10: Solver experiments

Use sibling-derived hypotheses to modify:

- scheduling,
- move ordering,
- heuristics,
- pruning,
- or attempt selection.

Evaluate every change on:

1. the discovery families,
2. held-out sibling families,
3. cousin families,
4. the published corpus,
5. stress corpora,
6. and known regression levels.

---

27. Testing requirements

Add automated tests for:

- deterministic generation from identical seeds,
- different outputs from different seeds where domains allow,
- identity round trips,
- exact witness preservation,
- object-count preservation,
- strict filter-axis preservation,
- portal-pair preservation,
- normalization and denormalization,
- symmetry inversion,
- duplicate detection,
- rejection of deliberately corrupted variants,
- no hidden witness in solver-facing input,
- solver independence during generation,
- cold-state solving,
- complete attempt telemetry,
- and family-level train/test separation.

Include property-based or randomized tests where practical:

«Every accepted exact-witness sibling must replay successfully under the canonical validator.»

---

28. Guardrails

The implementation must obey these rules.

1. No level-ID-specific generation or solver behavior.
2. No solver success requirement for generated-level acceptance.
3. No witness leakage into cold solver runs.
4. No mixing siblings and cousins in causal analyses.
5. No random sibling split across training and validation.
6. No silent relaxation of inventory or witness constraints.
7. No claim of uniform sampling without proof.
8. No heuristic change justified only by discovery-family performance.
9. No production solver changes during the infrastructure phases.
10. No large UI project before the command-line and report pipeline is trustworthy.
11. No generated level or recorded hint bypasses the codebase's existing `LevelProvenance` (`modules/domain/level-provenance-types.ts`) and `Hint`/`HintProvenanceEntry` (`modules/domain/hint-types.ts`) systems in favor of a parallel, family-tooling-only bookkeeping scheme — see section 11a.

---

29. Acceptance criteria

The first complete sibling system is successful when:

Generation

- Exact-witness siblings are produced deterministically from seeds.
- Every accepted sibling preserves its declared witness.
- Object inventories match the selected policy.
- Unsiblingable cases return informative diagnostics.
- Mutation manifests describe every change.
- Every accepted variant carries a `LevelProvenance` entry (actor `'procedural'`, generator method, family/parent/relation detail) appended via `appendProvenanceEntry`, on top of any provenance the parent already had.

Solving

- Variants can be solved in both production-like and research modes.
- Solver runs cannot access hidden witnesses.
- Attempt-local and cumulative metrics are both preserved.
- Results are reproducible under fixed configurations and seeds.
- Preserved witnesses and every solver-found solution (including rediscoveries of the same path) are recorded as `Hint`/`HintProvenanceEntry` records merged via `mergeHints`, never dropped or overwritten.

Analysis

- Reports compare parent and sibling behavior within families.
- Local solved/unsolved and fast/slow boundary pairs can be found.
- Symmetry bias can be measured.
- Winning-configuration changes can be traced to mutations.
- Alternative-solution emergence is distinguished from witness discovery.
- Family-level holdouts prevent sibling leakage.

Cousins

- Cousins are clearly labelled and analyzed separately.
- Their preserved recipe or structural relation is explicit.
- They can test whether sibling-derived findings transfer to new witnesses.

Actionability

The system can produce evidence supporting statements such as:

- “This witness is usually easy; the parent’s must-cross arrangement is unusually hostile.”
- “This solver configuration is robust across placements but fails under reflected gate order.”
- “Moving a flipping filter into this temporal phase causes a large beam-search tail.”
- “The 1-second scheduler cap generalizes across most sibling families, except for this feature-defined specialist group.”
- “A heuristic improvement discovered on one family transfers to held-out families and recipe cousins.”

---

30. First milestone

The first end-to-end milestone should be deliberately narrow:

1. Select a small set of solved and unsolved-but-witnessed parents.
2. Extract and validate one chosen witness per family.
3. Generate identity controls, symmetry siblings, local mutants, and a modest constrained-shuffle sample.
4. Run the existing solver cold on every variant.
5. Produce:
   - parent-versus-sibling solve results,
   - runtime and node distributions,
   - winning-configuration changes,
   - symmetry differences,
   - alternative-solution findings,
   - and the strongest near-identical behavioral boundaries.

Only after that report exists should the agent expand generation volume, add recipe cousins, or propose solver changes.

The standard for success is not the number of new levels generated. It is whether the system creates controlled evidence that explains solver behavior.
