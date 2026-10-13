# External source inspection: crossing routes, graph-set search and exact constraint models

**Date:** 2026-10-12. **Status:** source-level reconnaissance, not independently executed or validated solver experiments. Companion to [the 70-repository multilingual scout](../docs/solver-external-repository-scout-2026-10-12.md). All **70 original GitHub repository URLs resolved** in a fresh public repository-metadata verification; their implementations, independence, licenses and claims are not thereby proven.

**Authority:** Current [solver workstreams](../docs/solver-optimization-workstreams.md) own priority, [research question intake](../docs/research-question-intake.md) owns whether a newly framed question deserves registration, and the [invention program](../docs/solver-capability-invention-program.md) owns capability gates. This document changes none of those. Source links below resolve to files at inspected revisions.

## 1. Highest-value new find: noqx has an explicit crossing-route constraint model

[T0nyX1ang/noqx](https://github.com/T0nyX1ang/noqx), repository tree revision 706540dfb4c7d67919bb5029e4741838c5981501, is a Python/clingo answer-set-programming (ASP) puzzle solver, derived from [mstang107/noq](https://github.com/mstang107/noq). Its directly relevant source:

- [noqx/rule/route.py](https://github.com/T0nyX1ang/noqx/blob/706540dfb4c7d67919bb5029e4741838c5981501/noqx/rule/route.py): functions single_route, directed_route, crossing_route_connected, count_area_pass, route_sign and route_segment. The directed crossing rule requires **two incoming and two outgoing directions** at crossing cells, and an entry to continue straight to the opposite exit. Connectivity propagates separate horizontal/vertical reachability channels; they interconnect only at eligible non-crossing cells. This guards against falsely treating orthogonal strands at a crossover as a direct graph connection.
- [solver/turnrun.py](https://github.com/T0nyX1ang/noqx/blob/706540dfb4c7d67919bb5029e4741838c5981501/solver/turnrun.py): composes the directed crossing and reachability rules with turn/straight constraints, optional visit-all, and exact straight-run counts from named clues.
- [solver/portal.py](https://github.com/T0nyX1ang/noqx/blob/706540dfb4c7d67919bb5029e4741838c5981501/solver/portal.py): pairs remote portals with virtual adjacency and enforces a momentum-preserving direction rule.
- [solver/shingoki.py](https://github.com/T0nyX1ang/noqx/blob/706540dfb4c7d67919bb5029e4741838c5981501/solver/shingoki.py): constraints on turn-vs-straight and lengths of straight segments.
- [noqx/rule/reachable.py](https://github.com/T0nyX1ang/noqx/blob/706540dfb4c7d67919bb5029e4741838c5981501/noqx/rule/reachable.py): explicitly decomposes connectivity into initialization, propagation and assertion, plus scoped reachability queries.

**Novelty relative to ordinary graph pathfinding:** The two-channel crossing representation directly concerns a Pathfinder mechanic most Hamiltonian, Numberlink, Zip and Witness solvers prohibit. It is the strongest *new* formalization lead discovered here, and ASP/clingo deserves its own search vocabulary.

**Critical incompatibilities:** noxq's static route configuration does not automatically encode Pathfinder's temporal visitation sequence, first/second crossing events, global flipper parity, exact counted length or used-axis semantics. Its portal puzzle imposes momentum preservation that cannot be presumed in Pathfinder. A static legal-looking graph could fail Pathfinder's canonical move referee and vice versa. Never use its rules as a hard prune without an explicit one-directional soundness proof.

## 2. Source-checked method matrix

| Source and revision | Directly inspected code | Useful idea | Soundness / provenance boundary |
|---|---|---|---|
| [thomasahle/numberlink](https://github.com/thomasahle/numberlink/tree/541c30cf23db90d6c1b874c8ab6d1b8d8054a401) | README.md; gen/mitm.py | Process grid by southwest diagonals, maintain partial-link frontier, exploit dual-corner implications | Requires Numberlink's simple, non-self-touching, complete-coverage paths; AGPL-3.0 |
| [junkawahara/frontier_basic_tdzdd](https://github.com/junkawahara/frontier_basic_tdzdd/tree/660e798cd242f06d1196eaed8b3044bb6d9e30a1) | README.md; program.cpp | ZDD counts/represents all simple source-to-target graph paths without enumerating each one | Undirected edge sets discard ordered revisits and portal/flipper chronology |
| [junkawahara/frontier](https://github.com/junkawahara/frontier) | README.md | ZDD graph-set algebra, s-t paths, forests and cuts | Same author's related project: not independent evidence of novelty |
| [graphillion/graphillion](https://github.com/graphillion/graphillion/tree/e21b0928fcacd955154032928044ea3ce2efee3c) | graphillion/graphset.py; README.md | GraphSet.paths and filtering families of undirected edge-set subgraphs | GraphSet explicitly has no edge labels; a static graph set cannot express repeated edges or time |
| [chi-feng/zip-solver](https://github.com/chi-feng/zip-solver/tree/1110841913eec0efb1044297e533e528ff1d09de) | solver.js; README.md | Manhattan bound, flood fill, effective degree, parity, ordered waypoints, Warnsdorff ordering and uniqueness limit | Assumes all cells once; degree/parity conditions are not universal for Pathfinder |
| [Overv/TheWitnessSolver](https://github.com/Overv/TheWitnessSolver) | README.md | Incrementally update sealed regions and derive mandatory path hits from edge clues | Self-avoiding path; source-level implementation not fully reviewed here |
| [RainbowwPhoenixx/witness-solver](https://github.com/RainbowwPhoenixx/witness-solver/tree/fc2f9b00063ed9f0c970de1a06e53b5d63bf7eab) | src/solver.rs | Incremental partial area and edge-stone tests | Some configured branches contain todo! and are not completed; no full-coverage claim |
| [idea-idsia/pathwyse](https://github.com/idea-idsia/pathwyse/tree/e3bf8477de8ff7a9a777a8c980b81330f5d1ec6f) | README.md; src/core/algorithms/labels/label.cpp; src/core/algorithms/dynamic_programming/PW_default/LM_default.cpp | Bidirectional resource labels, dominance, joins, ng-path/DSSR relaxation and optional visited resources | Works with monotone resources; Pathfinder equal snapshots may have different legal futures. README gives GPLv3 for open-source edition |
| [torressa/cspy](https://github.com/torressa/cspy/tree/dd83e885b6a5c99f993c9f88c35599a6919dcc66) | README and tree | Additional RCSP labeling algorithms and benchmark ecosystem | No tested comparison on Pathfinder; no independent performance conclusions |
| [tuneerroy/numberlink](https://github.com/tuneerroy/numberlink/tree/9597a3210770b345d7f651550c4cf6f4036762d0) | backend/solvers/pyco_solver_edge.py; pyco_solver_path.py; constraint_solver_path.py | Contrasting edge SAT, path-indexed SAT, time-indexed CP-SAT models | Edge SAT model calls fix_cycles *after* its SAT answer, so SAT assignment alone does not certify global connectivity; CP-SAT constrains cell occupancy exactly once |
| [SmilingWayne/puzzlekit](https://github.com/SmilingWayne/puzzlekit/tree/9ef8ebbb262039401d72e37af0d23f9c9b46a5b0) | scripts/connectivity_benchmark.py | CP-SAT connected-subgraph encodings (tree vs height) and puzzle datasets | Contains monkey-patched experimental harness; validate actual model substitution before citing benchmark effects |
| [praveenkulkarni1996/slitherlinky](https://github.com/praveenkulkarni1996/slitherlinky/tree/267a60377c1970ee369ca4db95ced02edf525947) | README.md, slitherlinky.py | SAT degree constraints PLUS global transitive connectivity, illustrating why degree alone permits multiple cycles | Single non-crossing loop is a different search object |
| [sen-ltd/slitherlink](https://github.com/sen-ltd/slitherlink/tree/147db28776fcf81fc34853bff5c3c8340b016508) | src/slitherlink.ts | Local propagation fixpoint and pruning prematurely closed cycles; independent pure TypeScript test surface | Every vertex has degree 0 or 2; required crossings break this theorem |
| [sosga/simon-tathams-portable-puzzle-collection](https://github.com/sosga/simon-tathams-portable-puzzle-collection/tree/ecb576fb2a0a47df6486919c1ebb945f7f252234) | pearl.c and source tree | Masyu turns, Loopy global connectivity, Signpost ordered successors, Inertia temporal movement | Different games; study individual primitives, not transplants of whole solver |
| [Huy1711/Numberlink-solver-SAT-approach](https://github.com/Huy1711/Numberlink-solver-SAT-approach) and [kieuvantuyen01/propagationAlgorithm](https://github.com/kieuvantuyen01/propagationAlgorithm) | Numberlink SAT README, linked Java continuation and retained benchmark log filenames | Vietnamese source trail for degree/connectivity SAT propagation | Benchmark provenance and independence not yet established |
| [TGStarGuardian/Hamiltonian-paths-in-grid-graphs](https://github.com/TGStarGuardian/Hamiltonian-paths-in-grid-graphs) | README and Serbian thesis link | Explicit Hamiltonian constructions for restricted rectangle/L/C/F/E shapes | A geometry-only simple-path family, not arbitrary Pathfinder mechanics |
| [dumchevdev/voronoi-grid-prototype](https://github.com/dumchevdev/voronoi-grid-prototype) | README | Backbite/reptation moves preserving Hamiltonian path structure, path-first generator | Exact Pathfinder obligations could be broken by the transformation |

Two additional verified research resources: [mstang107/noq](https://github.com/mstang107/noq) is noqx's upstream and should not be counted as independent implementation. [d-krupke/cpsat-primer](https://github.com/d-krupke/cpsat-primer) documents propagator reasons, nogoods and conflict analysis; relevant method education, not a direct puzzle solver. A further Flow project surfaced in web indexing as ksavill/universal-flow-game-solver but returned GitHub API 404: **exclude pending re-verification**, not an extant concrete candidate.

## 3. Three different mathematical objects that should not be conflated

**Time-expanded directed walk:** ordered positions/transitions and per-event resources, with counted-length cost zero on a portal transfer; potentially exact on bounded small boards, but potentially combinatorially expensive. Sound reference labeling requires all Pathfinder mechanics and a referee cross-check. Time-indexed Numberlink models are a guide to the technique but usually enforce one visit per cell.

**Undirected frontier/edge set:** select an edge subset while storing connectivity summaries on a moving boundary. ZDDs can compress enormous numbers of simple paths and answer inclusion/exclusion. They generally cannot distinguish two different traversals of the same edges, visiting a vertex twice, or using flippers in a different order. Most plausible first application is an *optimistic necessary projection* whose UNSAT rules out completion, not an exact Pathfinder solver.

**Directed crossing route:** associate separate incoming/outgoing channels at crosses and conditional strand connectivity. It can preserve distinctions ordinary simple-path graphs erase, but graph incidence still does not establish an ordered feasible walk with correct portal length, global crossing count and flipper state. Need a temporal reconstruction check.

## 4. Proposed bounded falsification packets

These are **experiment candidates and preregistration sketches**, not authorized new workstreams.

### XR-1. Directed crossing semantics projection (first choice)

Question: Can directed crossing, opposite-side continuation, and two-strand connectivity yield a *sound Pathfinder necessary condition* not already derivable by must-cross/BC1/phase checks? Use the existing exact/reference enumerator on very small boards, portal-free and flipper-free first. For each possible candidate predicate: (a) enumerate every referee-valid completion and assert zero false rejections; (b) require at least one otherwise-allowed but exact-DEAD prefix newly rejected; (c) compare production seam exposure to existing checks. Counterexample or zero incremental opportunity stops any hard-prune proposal. Importantly, a Pathfinder crossed vertex may be visited in two temporal orders; neither channel may assume an unsupported ordering.

### XR-2. Frontier-state sufficient-statistic collisions

Group independently enumerated prefixes by a proposed interface signature (boundary connectivity; length/intersection slack; remaining obligations; edge axes; relevant portal/flipper state). Check whether identical signatures can have different possible completions. Any such pair is a counterexample to exact merging. Count distinct signatures versus distinct prefixes at fixed grid widths and constrained state populations. If nearly every history remains distinguishable, a new frontier engine has no demonstrated compression. Existing closed region/AND-OR decomposition stays closed absent genuinely different, witnessed interface economics.

### XR-3. Independent exact-oracle encoding ladder

Compare bounded reference formulations: time-indexed walk, directed crossings plus necessary temporal order, and graph-set optimistic relaxation. Mechanic expansion order: plain gate/goal -> exact length -> exact intersections -> must-pass -> must-cross -> directional filters -> portals -> flippers -> other landmarks. On each tiny board enumerate or prove all solutions and compare SAT/UNSAT/UNKNOWN with canonical Pathfinder validation; separately count false rejections and unsupported claims of UNSAT. An encoding that rules out a valid walk cannot hard-prune even if it is fast. No hints, winners or historical level IDs in cold strategy.

### XR-4. Forced local shape/degree and connectivity propagation

Take fixed-edge, forced-turn, region-sealing implications from the source examples; compare each with the exact current production inference vocabulary before claiming novelty. Test on retained causal decision states with sufficient opportunity and identical work envelope. If every fact is redundant with BC1/connectivity or assumes one-visit vertices, preserve a negative transfer without building another search stage.

### XR-5. Resource-label dominance and bidirectional joins

On small exact states, construct pairs equal under a proposed label (head position, cumulative length, intersection count, obligation masks and compressed history), then search for differing legal future sets. Every future-inequivalent collision forbids equality-as-equivalence or unsafe dominance. A safe but too-specific label may destroy economical joining. Measure prospective effect on reachable production choices before building a full bidirectional engine.

### XR-6. Pathfinder-safe transformations as PG-G inputs

Backbite/reptation and path-reconstruction moves offer a source of paired graph variations. They preserve simple Hamiltonian paths under their own conditions; every proposed Pathfinder transformed solution must be validated afresh against exact length, intersections, used-axis/portal/flipper rules and obligations. Feed only mechanically sound independent-parent perturbations to existing PG-G; avoid adding a second uncontrolled family generator.

## 5. Priority, economics and the next search vocabulary

The **most novel** outside idea is noqx's crossing-specific directed channels, followed by the possibility of representing an *over-approximate* obligation graph with frontier/ZDDs. The **most immediately useful research artifact** would be small, independently validated exact state labels proving or refuting imported implications. Generic DFS/Zip connectivity and RCSP scalar dominance are much likelier to be redundant or unsound than a genuinely new reasoning operation.

The meaningful next search words now include: **ASP, answer-set programming, clingo, clasp, Noq, noqx, directed_route, crossing_route_connected, crossing paths, crossing trails, portal loop, turn and run, Shingoki, route_segment, exact straight run, temporal path encoding, subtour elimination, cutset connectivity, finite automaton constrained walks, disjoint path channels, edge-use history**.

**Validation record:** inspected repository metadata, named source files and public documentation. Did NOT install or execute external code, run Pathfinder fixtures, produce successful exact oracle proofs, run CI or change any solver configuration. This is *pre-experiment source evidence*. Any positive research result requires local witness/certificate, canonical referee agreement, independent-parent evidence where applicable and matched machine-independent work before production consideration.
