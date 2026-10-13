# Mechanic-first code archaeology: crossing, order, propagation (2026-10-13)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-13 — primary-source Icebarn/Icelom, Noqx ASP, Japanese PuLP, Nikoli/Z3, CP-SAT regional-quota and independent test/validator investigation
> **Decision:** external code now supplies multiple concrete *proof patterns* for separated crossing-lane reachability, edge-assumption propagation, local cell-shape domains, ordered-chain constraints and region-border cardinality. They do NOT establish a new Pathfinder theorem, solve, prune or justification for reopening the cancelled frontier/ZDD pilot.
> **Remaining gate:** none for source archaeology; any new solver research lane first needs a current-gauntlet-nonredundant exact supported-micro-instance witness with an independent LIVE counterexample, canonical referee and work economics.
> **Evidence role:** discovery
> **Selection:** judgment-selected implementations after broad search by mechanic, language and source-code symbol
> **Population identity:** updated 91 unique external candidates in [the mechanic-indexed catalogue](2026-10-12-algebraic-decoding-code-repo-candidates-001.json); repository source inspected as of 2026-10-13
> **Selection history:** earlier 81-entry census, then Icebarn/Icelom, Pipelink, Japanese term and crossing_route_connected/SingleLoopGrid/checkNumberOrder/code-symbol searches; targeted review favored readable implementations and independent correctness evidence
> **Inference scope:** code/representation evidence only, not proven Pathfinder-equivalent semantics or reproduced external performance
> **Proposal provenance:** user request to continue repository investigation before choosing any algebraic-decoding implementation lane

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-13","decision":"Mechanic-first source review revealed crossing-lane reachability and forced-edge assumption techniques with independent differential testing; no production change or new mathematical Pathfinder inference yet","remainingGate":"none","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"reports/2026-10-12-algebraic-decoding-code-repo-candidates-001.json","selection":"mechanic- and symbol-selected code inspection","inferenceScope":"source capabilities only; no Pathfinder effectiveness"},"claimRefs":[],"sourceArtifacts":["reports/2026-10-12-algebraic-decoding-code-repo-candidates-001.json","reports/2026-10-12-algebraic-decoding-external-code-repo-audit-001.md"],"successors":{"questions":[],"artifacts":["docs/solver-algebraic-decoding-research-plan.md"]},"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

## 1. Reconcile with our prior art before celebrating

The [August external-code census](2026-08-24-external-solver-code-census.md) and [cancelled frontier/ZDD pilot](2026-08-24-frontier-zdd-pilot-spec.md) **already derive** the H/V split lane representation. The [residual-state representation reference](../docs/solver-residual-state-representation.md) already distinguishes exact, relaxed and predictive interfaces. [Current solver architecture](../docs/solver-reasoning-capability-atlas.md) documents native axis-history and BC1/BC1-VX; [full-mechanic CP-SAT](../scripts/stress/cpsat-reference-probe.py) already encodes indexed move order, intersections, mandatory obligations, portals and flipper chronology. Generic graph-connectivity, path shapes, SAT, ZDD, CEGAR and parity are not newly found solver capabilities.

The 91-candidate [JSON catalogue](2026-10-12-algebraic-decoding-code-repo-candidates-001.json) now has curated mechanicIndex facets: crossing-lanes, directed-order, global-connectivity, mandatory-turns, ordered-obligations, region-boundary-counts, exact-resource-vectors, forced-facts, whole-solution-family, abstraction-refinement and soundness-oracles. These are evidence-graded *search affordances*, not 91 verified engines or semantic compatibility certificates.

Repository-name search for Japanese/Chinese terms often returned zero despite many relevant implementations being present. Searching **symbols inside code** such as icebarn, icelom, crossing_route_connected, checkNumberOrder, route_straight, SingleLoopGrid, GraphDivision and BridgeLane uncovered multi-puzzle repositories. Orikusu/Hyperlink terms did **not** yield a primary-source-confirmed implementation in this sweep; do not make confident availability claims for those specific puzzle names.

## 2. Source-confirmed mechanism A: crossings must keep their two strands distinct

- [T0nyX1ang/noqx](https://github.com/T0nyX1ang/noqx), Apache-2.0/GPL-3 dual licensed: its Python noxq/rule code (actual path: [noqx/rule/route.py](https://github.com/T0nyX1ang/noqx/blob/master/noqx/rule/route.py)) generates Answer Set Programming-style crossing route constraints. In directed mode, a crossing has two incoming and two outgoing directions and **every incoming direction continues along its opposite outgoing direction**. The separate crossing_route_connected rule propagates horizontal and vertical reachability tags **without** H/V transfer at a crossing. Its solver/icebarn.py, solver/pipelink.py, solver/turnrun.py and solver/barns.py compose these primitives and turn/straight rules.
- [ProximaCentauri0/Icelom](https://github.com/ProximaCentauri0/Icelom), C++ and Python: icelom_solver.cpp makes a white cell one logical node and a crossing-capable icy cell two nodes (H and V), ensuring an apparent graphical crossing does not create a connected junction. Its algorithms are documented in Chinese in [docs/算法说明.md](https://github.com/ProximaCentauri0/Icelom/blob/main/docs/%E7%AE%97%E6%B3%95%E8%AF%B4%E6%98%8E.md).
- [kevinychen/nikoli-puzzle-solver](https://github.com/kevinychen/nikoli-puzzle-solver), MIT, TypeScript/Z3: [src/solvers/icebarn.ts](https://github.com/kevinychen/nikoli-puzzle-solver/blob/main/src/solvers/icebarn.ts) allows two perpendicular straight segments to share an icy cell; it models route order separately from cell shapes.
- [3892myamya/sdvx](https://github.com/3892myamya/sdvx), MIT, Java: its IcelomSolver.java comment explicitly calls out a **known failure to support crossing at entrance/exit**, and has unresolved Icelom2 semantics. An implementation can look plausible while remaining incomplete for a particularly dangerous endpoint case.

**Pathfinder distinction:** split H/V geometry is NOT a fresh discovery. The potentially novel fact is whether **residual strand-specific reachability** after a real prefix can prove a future obligation impossible earlier and cheaper than existing cell connectivity, BC1 and axis checks. Never convert a cell-graph reachability result into a hard prune without modelling a cell crossed twice via independent lanes.

## 3. Mechanism B: force edges through local-domain intersection and failed assumptions

[ProximaCentauri0/Icelom/tools/deduce.py](https://github.com/ProximaCentauri0/Icelom/blob/main/tools/deduce.py) and its C++ analogue distinguish inference from branching and implement:

1. Enumerate all legal edge configurations for a cell. Edges common to every viable configuration become **mandatory**; edges absent from all become forbidden.
2. If one ice-corridor edge is selected, propagate its forced straight **stem** to other edges. If any required stem edge cannot be used, the entire stem is prohibited.
3. Track already connected path components and reject prematurely closed loops or inaccessible mandatory components **in the lane-expanded graph**.
4. For an undecided edge, hypothetically use it and forbid it separately, close the implied corridor/partial chain, check endpoints and ordered-number obligations. A false assumption forces the other value; iterate to a fixpoint.

Its [tests and validation report](https://github.com/ProximaCentauri0/Icelom/blob/main/docs/%E6%B5%8B%E8%AF%95%E4%B8%8E%E9%AA%8C%E8%AF%81.md) describes independent C++ solver, Python rule verifier, independently coded corridor-compression solver and checks against pzprjs, plus fuzz-differential tests. The author reports **35/65** sample puzzles complete at root without branching and test audits with no incorrectly forced edges; these are **unreplicated external claims**, on IceLom rather than Pathfinder and on a selected puzzle corpus.

Crucial counterexample: the IceLom tests record a former **false UNSAT** from a residual connectivity rule based on the wrong node representation; tests/deduce_test.py also guards a **same-cell IN/OUT** edge case that was previously misclassified. For Pathfinder, a claimed necessary condition must survive exact prefix replay, portal jump/fake entry-axis states, multiple gates and crossing lanes; its original solver's full-corpus tests do not transfer as proofs.

One concrete **resource-saturation argument** is found in IceLom's numbered-visit rules: when the sum of available unknown-cell visit capacities exactly meets a required number of visit slots, all those capacities become forced. The potentially interesting Pathfinder analogue is a **joint** intersection/axis/mandatory-obligation saturation check, not rebranding our existing one-family reqInt/MC capacity. Beware numbered IceLom order has its own semantics and the repository contains explanatory text from different revisions; confirm live code and native referee, not comments alone.

## 4. Mechanism C: factor route geometry and sequence identity

- The Nikoli/Z3 Icebarn source keeps **cell shape** and **edge order** as separate symbolic objects, uses paired directed incidences and predecessor relationships, and imposes arrow obligations and straight travel. This is a concrete alternative encoding idiom for ordered route reconstruction, not proof its path legality is identical to Pathfinder.
- [SaitoTsutomu/OptForPuzzle](https://github.com/SaitoTsutomu/OptForPuzzle) contains Japanese PuLP/ortoolpy [Icebarn notebook](https://github.com/SaitoTsutomu/OptForPuzzle/blob/master/%E3%81%82.%E3%82%A2%E3%82%A4%E3%82%B9%E3%83%90%E3%83%BC%E3%83%B3.ipynb): binary directional horizontal/vertical edges, conserved in/out flow, forced straight icy cells, arrow direction and iterative single-route constraints.
- Noqx uses an independently formulated **directed crossing plus turn/straight** logic route. Its turnrun.py has local counts across straight segments after particular turns.

Pathfinder already has exact order in CP-SAT and a native ordered prefix. What is still a live **question** is whether a bounded **partial** shape/segment-order witness gives a cheap necessary proof or conflict explanation *without* a complete time-expanded model. Porting the Z3 model wholesale would repeat existing work.

## 5. Mechanism D: regional quota logic

Noqx's count_area_pass in noqx/rule/route.py counts boundary transitions (incoming directed or doubled undirected counts). [vavavr00m/PuzzleSolver](https://github.com/vavavr00m/PuzzleSolver) has OR-Tools [EntryExit](https://github.com/vavavr00m/PuzzleSolver/blob/main/src/puzzlekit/solvers/entry_exit.py) and [DoubleBack](https://github.com/vavavr00m/PuzzleSolver/blob/main/src/puzzlekit/solvers/double_back.py) models with cardinalities **2 or 4** across regional boundaries. These are code-confirmed examples of quota encoding, not claims they handle intersections or Pathfinder's dynamic reuse.

The meaningful Pathfinder idea combines endpoint-side cut parity, region obligations, **scarce independent axis transitions**, exact remaining intersections/length, and any free portal side changes. All are already *proposed* in [small exact projections](../docs/solver-small-exact-projections-program.md); to become new evidence a tiny mathematical contradiction must be missed by BC1/BC1-VX, parity, scalar bounds, [existing separator-resource and joint-obligation probes](../docs/solver-reasoning-capability-atlas.md). A region count alone is redundant when current connectivity already detects the obstruction.

## 6. Mechanics-to-algorithms comparison and proof gaps

| Pathfinder feature | Representative source idiom | Internal prior owner | Missing discriminator |
|---|---|---|---|
| Crossing, two non-joining strands | Noqx H/V reachability; IceLom dual-axis nodes; Z3 shapes | 2026-08-24 H/V frontier derivation; native axis-use | Does *prefix-conditioned* lane reachability find a genuinely new impossible state? |
| Single ordered gate-to-goal route | Z3 edge-order variables; ASP directed transitions; IceLom chain checks | Native referee; full-mechanic CP-SAT | Cheap partial order/forced-chain consequences without full solving |
| Exact intersection and visit capacities | IceLom 1/2 visit shape domains and saturated unknown slots | reqInt and MC ceiling/neighbor/bounds | Joint capacity allocation across **several** requirements |
| Exact movement length with zero-cost portals | ZDD cardinality/linear set operators only in simpler models | Full CP-SAT portal transitions | Proof-preserving resource projection involving forced nonlocal jumps |
| Mandatory and adjacent turns | Noqx route_turning, route_straight; Z3/Masyu | MustTurn/AdjacentTurn/native flipper state | Joint directional feasibility beyond current narrow checks |
| Flipper global-use-order polarity | **No close analogue identified** | Native chronological state; full CP-SAT | Safe finite-state/global parity projection, not reducible to graph-only equations |
| Cut / region side obligations | Noqx area passage count; CP-SAT EntryExit/DoubleBack | BC1, cut/flow and separator/joint-obligation probes | Multiple competing lanes / resource Hall-type contradiction |
| Facts forced in every completion | IceLom try-use/try-forbid and cell-config intersection; cspuz graph reasons | Local native forcedness; exact reference/replay | A *small* nonredundant conflict certificate, economical at a real consumer |
| Negative soundness guarantees | IceLom independent Python oracle and pzprjs fuzz differential | Canonical referee, reference CP-SAT, mechanic perturbation | Special counterexamples covering endpoint crossing, false gates, portals, flippers |

The IceLom rules are **not** a safe over-approximation of general Pathfinder merely by applying them unmodified: crossings are restricted to ice and ice forbids turning, white cells are often all mandatory, and its numbered visits must obey a different sequence law. Applying the full rule set would reject valid Pathfinder walks. A new model must document which constraints are exact, omitted to obtain a superset (only useful for a sound negative proof), or deliberately restricted (only constructive witnesses may count). A negative from an unsupported model means **UNKNOWN**, not no solution.

## 7. Theory and parameterized-complexity caution

Transition systems are a more apt vocabulary than plain vertex visits: a permitted pair of consecutive incident edges describes legal local direction. See [Szeider 2003](https://doi.org/10.1016/S0166-218X(02)00251-2) and [Bellitto, Li, Okrasa, Pilipczuk and Sorge 2023](https://doi.org/10.1007/s00453-022-01064-1), which discuss compatible paths in forbidden-transition graphs and substantial hardness even under graph-width restrictions. This motivates searching *specific bounded constraints and proof consequences*, not claiming a turn-aware graph transformation makes Pathfinder tractable.

Additional high-signal search strings: crossing_route_connected, line_io, checkNumberOrder, ruleProbe, tryUse, tryForbid, GraphDivision, sub-tour, forbidden transitions, edge order, exact region-border quotas, Pzpr check(), and corresponding Japanese/Chinese terms. No primary-source-confirmed independent Orikusu or Hyperlink solver was found; continue only when a specific missing mechanism demands it.

## 8. Research stopping line and cheapest discriminating question

**Do not open a new engine/queue lane on this report.** Instead seek one real Pathfinder prefix with same static geometry and existing native scalar/BC1 checks passing, but where a **directed-lane local-shape/resource projection** proves it impossible to satisfy *joint* outstanding obligations. Couple that DEAD witness with a referee-valid LIVE counterexample differing in one controllable feature. A root forced-edge test can supplement it but does not earn hot-loop adoption absent reproducible opportunity and canonical work savings.

Reuse existing exact/reference and offline replay machinery. Probe one tiny mechanics-supported question at a time; no broad new GHA campaign, no historical claims rewritten, and no exact-solver backend adoption by default.

**Bottom line:** the novel contribution from this archaeology is less the existence of crossing-friendly solvers than the **design of sound inference and adversarial crossing/endpoint tests** found alongside them. Preserve that logic for the next properly earned projection and otherwise close the search stage.
