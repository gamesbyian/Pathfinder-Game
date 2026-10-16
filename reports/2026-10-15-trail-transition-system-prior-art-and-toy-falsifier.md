# Trail and transition-system search: source-level follow-up and tiny exhaustive falsifier

> **Status:** inconclusive
> **Last evidence:** 2026-10-15 — verified external source code, repository source mechanics and independent tiny-grid exhaust
> **Decision:** Promote *trail with constrained local transitions* to the leading external **research description** of the ordinary Pathfinder route skeleton; preserve source-level and toy-model agreement, but authorize no solver treatment or general soundness result
> **Remaining gate:** Diff the toy transition system against the canonical Pathfinder referee across mechanic-bearing states, then find a novel decision-changing necessary fact beyond current prunes with a demonstrated participation ceiling
> **Research question:** none
> **Premise refs:** none
> **Measurement opportunity:** none
> **Evidence role:** discovery
> **Selection:** selected after inspecting multilingual repository search hits and their code
> **Population identity:** all 72 ordered distinct gate/goal endpoint pairs on 3×3 orthogonal grids, and six specified ordered endpoint pairs on 4×3 orthogonal grids; edge subsets exhaustively considered for each
> **Selection history:** toy models selected for structural falsification after a source search; no production-level or independent-parent sampling
> **Inference scope:** the explicitly restricted independent toy model, not actual Pathfinder production correctness, prevalence or economics
> **Proposal provenance:** external prior-art search expanded from Hamiltonian/simple paths to edge-simple walks/trails and forbidden transitions

## Executive conclusion

The earlier [multilingual scout](../docs/solver-external-repository-scout-2026-10-12.md) and [source inspection](2026-10-12-external-pathfinding-source-inspection-001.md) identified frontier/ZDD simple-path solvers and the ASP crossing-channel implementation in `noqx`. A third search under **trail**, **Eulerian trail**, **transition systems**, and **forbidden transitions** located a much closer bridge: [Hiroyuki Hanada's graphillion-trails](https://github.com/hana-hiro/graphillion-trails). It transforms *edge-simple walks* (trails, which may revisit a vertex) into constrained simple paths of a **line graph**, then uses Graphillion/ZDD for compact enumeration. This specifically addresses the revisit problem that defeated a naïve Hamiltonian-path transfer.

A source audit of [Pathfinder's canonical move checker](https://github.com/gamesbyian/Pathfinder-Game/blob/9f6b90729d62069e3d0c88696965069b74e33e73/modules/domain/move-rules.ts) and [canonical path validator](https://github.com/gamesbyian/Pathfinder-Game/blob/9f6b90729d62069e3d0c88696965069b74e33e73/modules/domain/path-validator.ts) exposes a useful reduced **trail-with-switches** model. No full production theorem is yet established because portals, filters, flipper order, landmarks, prescribed obligations and several subtleties must be included or soundly relaxed.

This is materially more specific than the prior [frontier/ZDD deep research](frontier-zdd-decision-diagrams-deep-research.md), which already documented simple graph-set/frontier methods and warned against prematurely building a full new DD engine. The current contribution is the concrete *trail-to-line-graph reduction* plus *vertex transition constraints* and a small independent executable falsifier. It does not reopen the closed C2 region/AND-OR interface result by itself.

## 1. What the Pathfinder source actually says

For an ordinary (non-portal) orthogonal step from vertex `u` to `v`, let `a` be H or V depending on horizontal/vertical motion. In `move-rules.ts`, if `v` has previously used axis `a`, the move is rejected (the `invalid-edge-reuse-target` rule). After each step `path-validator.ts` marks that axis at **both** endpoints. Thus in the reduced model, traversing the same ordinary **edge** twice would require re-entering its target on an already-used axis: it is forbidden. This proves an *edge-simple* property for ordinary transitions, stronger than just the heuristic "not much reuse."

The origin check has a subtle exception: if the exit axis equals the immediately preceding entry axis, straight continuation remains legal even if that axis is marked used at the current vertex. This is necessary for a straight pass. On a second visit, the entering axis must be orthogonal to any previously used axis; the two visits then force separated H and V strands at a degree-four crossing. A first-visit turn commits two axes, precluding a later crossing through that cell. Source code also forbids gate re-entry and departing after reaching the goal.

Consequently, ignoring exceptional mechanics, the **set of ordinary traversed edges** of a successful path has the following necessary incidence structure:

- Gate and goal have degree 1 each; other used vertices have degree 2 (one visit) or degree 4 (two visits), except unused vertices of degree 0.
- A degree-4 cell pairs its two H incident edges and its two V incident edges as **separate straight passages**. It must never behave as a junction connecting H to V.
- Following these local paired transitions from the gate must reach the goal and consume *all* selected edges. A disconnected secondary closed loop or an isolated strand is not one gate-to-goal walk.
- For the ordinary-only stripped game, counted length equals selected-edge count, and the ordinary revisit/intersection count equals the number of degree-4 nonterminal vertices. *These identities are not globally valid without separately incorporating portals and other special mechanics.*

These conditions define a **transition system** on incident half-edges rather than generic graph connectivity. They are analogous to [noqx's `crossing_route_connected`](https://github.com/T0nyX1ang/noqx/blob/706540dfb4c7d67919bb5029e4741838c5981501/noqx/rule/route.py), but derived here from Pathfinder's actual reduced move restrictions.

## 2. The most relevant new repository and its actual reduction

**[hana-hiro/graphillion-trails](https://github.com/hana-hiro/graphillion-trails)**, inspected tree `b19d7f1ffc300fee3f0b11e3cc4227b9fd5d9661`, MIT, Japanese and English README. Source paths:

- [`gt_linegraph.py`](https://github.com/hana-hiro/graphillion-trails/blob/b19d7f1ffc300fee3f0b11e3cc4227b9fd5d9661/gt_linegraph.py): each original edge becomes a **vertex** of a line graph; incident original edges create line-graph connections labelled by the shared original vertex.
- [`gt_enumerate.py`](https://github.com/hana-hiro/graphillion-trails/blob/b19d7f1ffc300fee3f0b11e3cc4227b9fd5d9661/gt_enumerate.py): adds dummy start/goal vertices, prohibits particular adjacent pairs of line-graph edges that bear the same transition label, invokes `GraphSet.paths` with the resulting constraints, and reconstructs an original-graph trail.
- [English README](https://github.com/hana-hiro/graphillion-trails/blob/b19d7f1ffc300fee3f0b11e3cc4227b9fd5d9661/README.md) and [Japanese README](https://github.com/hana-hiro/graphillion-trails/blob/b19d7f1ffc300fee3f0b11e3cc4227b9fd5d9661/README.ja.md): the example graph has **nine B-to-C trails**, six of which use every edge, explicitly showing ordered edge-simple walks rather than vertex-simple paths.

The paper lineage linked in the repository is an additional investigation route, not proof that the current Python source runs correctly in today's environment. Code uses Python-2-era forms including `print "..."`, `StandardError`, and `time.clock()`; running it unmodified with modern Python 3 will fail. Do not invest in a port until this representation has shown useful new Pathfinder information under canonical testing.

The reason this is attractive: a grid of maximum ordinary degree 4 yields a line graph whose local connections remain bounded; transition constraints can exclude invalid turns at required crossings *without imposing global no-revisit*. The reason it could still disappoint: line graph + transition labels may enlarge the frontier and introduce many states before any fact differs from existing Pathfinder connectedness/BC1 pruning.

## 3. Independent exhaustive micro-model experiment

The repo now includes the fully self-contained `node scripts/research-trail-switch-toy.mjs` falsifier. It **does not import the canonical referee**. It implements, independently and explicitly, only the following reduced semantics: rectangular orthogonal grid, one start/goal, normal step; prohibit edge reuse, target-axis reuse, gate re-entry and post-goal continuation; permit revisiting other vertices only by an unused axis; preserve the origin straight-continuation exception.

The script enumerates every legal toy walk and independently enumerates **every possible subset** of the grid's edges, accepting a subset exactly when its degree/straight-pairing "switch graph" gives one gate-to-goal route consuming all chosen edges. It checks two directions: every walk's edge-set is accepted, and every statically accepted edge-set has a legal enumerated walk. It also checks for multiple walks sharing one edge-set (edge-set ambiguity).

| Small geometry, selected endpoints | Actual toy walks | Distinct edge-sets | Statically accepted subsets | Collisions | Directional disagreements |
|---|---:|---:|---:|---:|---:|
| 3×3, **all 72 ordered distinct start/goal pairs** | 708 | 708 | 708 | 0 | 0 |
| 4×3, six fixed ordered pairs: (0,11), (0,1), (1,10), (4,7), (5,11), (2,9) | 195 | 195 | 195 | 0 | 0 |
| **Total, restricted toy model** | **903** | **903** | **903** | **0** | **0** |

For corner-to-corner 3×3 alone, there are 14 valid toy walks, including two with one revisited vertex. For corner-to-corner 4×3, there are 51, including walks with one and two revisited vertices. These show that this experiment isn't silently reducing everything to Hamiltonian paths. All subset checks include UNSAT counterparts; exhaustive enumeration is possible because the grids have 12 and 17 edges respectively.

**Interpretation:** The data fail to falsify the claim that an edge-set plus mandatory local crossing pairing is an *exact representation* of the reduced toy route. This is evidence for a small-graph equivalence and a plausible proof sketch, **not a statistically representative finding** and not an assertion about Pathfinder's full production mechanics.

**Next proof obligations:** (1) formalize the per-axis transition invariant by induction on legal moves; (2) prove the pairing traversal uniquely determines the walk when there is a single source-to-target route; (3) run canonical referee differential tests with converted raw/normalized boards and states; (4) apply the mechanic perturbation matrix and distinguish sound over-approximations from exact equivalences; (5) establish a novel current-production decision opportunity before proposing a new solver architecture.

### A concrete nontrivial witness against ordinary connectivity

A follow-up exhaustive subset search on the same 4×3 grid discovered an **11-edge configuration** that satisfies normal selected-edge degrees and ordinary graph connectedness, but fails the single switch-route constraint. Row-major cell numbering is:

```text
 0 - 1 - 2 - 3
 |   |   |   |
 4 - 5 - 6 - 7
 |   |   |   |
 8 - 9 -10 -11
```

Only these edges are **selected** (the sketch labels coordinates, not selection):

`(0,4), (1,2), (1,5), (2,6), (4,5), (5,6), (5,9), (6,7), (6,10), (7,11), (9,10)`.

With gate 0 and goal 11, the undirected selected-edge graph is connected and has degree 1 at 0 and 11, degree 4 at 5 and 6, and degree 2 elsewhere among its used vertices. Degree-4 cells 5 and 6 both offer two horizontal and two vertical incident edges. Nonetheless, their **straight-through transition pairings** split the configuration into:

- Open route `0 → 4 → 5 → 6 → 7 → 11` (5 selected edges);
- A separate closed route `5 → 1 → 2 → 6 → 10 → 9 → 5` (6 selected edges).

The closed route shares vertices 5 and 6 with the open route **as an ordinary graph**, but the orthogonal crossing strands cannot transfer between them without an illegal turn at a twice-used axis. The static switch traversal correctly rejects this edge subset; ordinary graph connectedness and local degree validation would accept it. The self-contained script now asserts this witness by explicit edge coordinates.

**Exactly what this establishes:** an *incremental relation beyond plain graph connectedness* in the simplified selected-edge formulation. It does not establish novelty over production Pathfinder connectivity, BC1, exact projection or current search-state checks. It also does not prove that production regularly constructs this fully committed topology or encounters an earlier usable partial-state proof. The next value gate must locate a real **prefix** whose sound relaxed impossibility is visible early enough to matter.

### Proof sketch for the explicitly restricted toy semantics

- **Legal walk → accepted static switch-route.** A normal move marks its H/V axis at both endpoints, and a future move cannot enter a used target axis. Thus no edge repeats. A visited internal vertex contributes one arrival and departure (degree 2), or two arrivals and departures on distinct axes (degree 4); a first-visit turn blocks future orthogonal re-entry. At degree 4, the two passages are straight H and straight V. Gate and goal occur only at the ends. The actual walk consumes precisely its selected edges, so the switch-graph traversal from gate reaches goal and covers the set.
- **Accepted static switch-route → legal toy walk.** A selected edge subset with the specified 0/2/4 internal degrees, degree-1 endpoints, H/V pairing at degree 4, and a single switch-compatible gate-to-goal traversal induces one ordered route. Each selected edge is consumed once. At degree 2, entering and leaving the cell is legal on its sole visit; at degree 4, the first passage reserves only one axis and the second uses the other; the two passages cannot turn. No move re-enters a used target axis or the gate, and the route ends at the goal.
- Therefore, for this **unmechanized toy model only**, the chosen-edge switch condition and valid normal walks correspond bijectively. Exact ordinary length is the number of selected edges, and intersections are the number of degree-4 internal vertices. The exhaustive enumerator supplies independent bounded falsification of this proof outline; it cannot substitute for a mechanized canonical-source proof, particularly at portal transitions or filter/flipper history.

## 4. Mathematical-literature branch: forbidden transitions

This discovery also changes the academic search language. In [*Finding paths in graphs avoiding forbidden transitions* (2003)](https://www.sciencedirect.com/science/article/pii/S0166218X02002512), an incident-edge transition graph `T(v)` describes which pairs of edges may consecutively pass through vertex `v`; a path is compatible when it respects those local pairs. This abstract framework matches Pathfinder's cell-axis/turn restrictions more naturally than generic vertex paths.

Related literature on **A-trails** and Eulerian circuits with local transitions is useful, but the term **A-trail** normally concerns consecutive *adjacent* edges in the cyclic planar order. A required Pathfinder crossing involves **opposite** (straight-through) directions, so A-trails are not automatically the matching problem. See [the 1998 A-trail algorithms abstract](https://www.sciencedirect.com/science/article/pii/S0166218X97001418) for its different local convention. These are scientific analogy/sourcing references, not borrowed proofs.

A highly targeted newer result is **Hortensia Galeana-Sánchez, Rocío Rojas-Monroy, Rocío Sánchez-López and Juana Imelda Villarreal-Valdés, *Generating all Eulerian trails avoiding forbidden transitions*, Bulletin of the Institute of Combinatorics and its Applications 106 (2026), pp. 43–58** ([publisher's volume index](https://bica.the-ica.org/Volumes/), [bibliographic abstract](https://produccion.siia.unam.mx/Publicaciones/ProdCientif/PublicacionFrw.aspx?id=703050&scopus=0)). It studies `H`-colored multigraphs in which a trail's sequence of edge colors must itself form a walk in a prescribed compatibility graph, together with transformations relating valid Eulerian trails. This is **much closer in vocabulary to edge-simple Pathfinder routes with forbidden local transitions** than shortest-path algorithms. The paper's condition concerns a fixed graph whose entire edge set is traversed, and its published abstract provides sufficient conditions for transforming/enumerating trails, not a general bounded exact solver for choosing an edge subset under arbitrary Pathfinder mechanics. Moreover, Pathfinder's transition compatibility is **vertex/axis-conditioned** and includes history-dependent flippers, whereas a single global edge-color compatibility graph may be insufficient without a state-expanded encoding. Treat this as a key bibliography lead, **not** an adopted theorem or measured engine.

A second executable [2026 directed Eulerian trail enumeration project](https://github.com/Jeroenodb/Optimal-Enumeration-of-Euler-Trails) (tree `57294da3e0652a63865aaabc313bd7d0cef4a169`) has a brute-force-comparison stress harness and a script claiming to generate a counterexample to an algorithm in its paper lineage. This supplies a **methodological example** of adversarial enumeration, but its full-Eulerian-on-a-fixed-directed-graph task is not our "select a subset and satisfy exact obligations" problem.

Other second-wave GitHub leads: [AndreVRibeiro/zdd_graph_enumeration](https://github.com/AndreVRibeiro/zdd_graph_enumeration) (frontier ZDD implementation for simple s-t paths), [brooksandrew/postman_problems](https://github.com/brooksandrew/postman_problems) (route inspection, usually allowing repeated edges rather than forbidding them), and [semiexp/numlin-sat](https://github.com/semiexp/numlin-sat) (SAT Numberlink formulation). The repository [hareball95/graphillion-trails](https://github.com/hareball95/graphillion-trails) is an actual GitHub fork of Hanada's upstream and **not an independent algorithm**.

## 5. Concrete research route with stopping conditions

**A. Differential gate.** Re-run the toy projection after explicitly adding one mechanic at a time. First convert its traversals into valid `NormalizedLevel` objects and pass all solutions through `validateCanonicalPath`. Include one normal route with a straight degree-four revisit, one with a degree-two turn, an impossible strand-separated edge subset, and an edge-use-axis near miss. A vanilla toy success does not earn a Pathfinder correctness conclusion.

**B. Necessary-condition relaxation gate.** Fix a candidate subset/length/intersection constraint and ask whether the abstract switch graph can prove **UNSAT** when production's existing scalar length/parity, connectivity, must-cross local bounds and BC1 cannot. The test's only promising hard-prune direction is: every real completion is represented by the abstraction, so *abstract UNSAT implies real UNSAT*. Do not mistake abstract SAT for a real witness.

**C. Information / opportunity gate.** In PG-G/exact LIVE-DEAD candidate states, identify a specific already reached decision where the new relaxed route fact distinguishes candidates that production treats alike. Name the independent parent, exact source/trace, decision exposure and current-input-only proposition before any breadth. Zero novel consequences, zero participation or existing stronger proof closes this candidate consumer.

**D. Economics gate.** Estimate construction and query work for (i) explicit switch-route traversal, (ii) bounded graph-set/ZDD over selected edges, and (iii) line-graph simple-path reduction. Compare against current exact observer and existing source-side work. Building a large ZDD infrastructure from a toy-equivalence result alone is explicitly prohibited by the [small exact projections program](../docs/solver-small-exact-projections-program.md).

**E. Research-class decision.** The reduction itself is a search-object/representation hypothesis. A safe operator returning **UNKNOWN** on unsupported mechanic classes is possible in principle, but assigning an unsupported class a false **NO** is never permitted. New questions must be contextualized under the existing intake, archaeology and current workstream authority first. No new scheduled factory, new queue treatment or production flag follows directly from this research.

## 6. Concrete handoff

1. Retain this report and its deterministic micro-falsifier as discovery evidence.
2. Compare against the source-level `noqx` crossing channel and the older frontier/ZDD report, avoiding duplicate implementation.
3. Look for the first smallest **real Pathfinder** exact-DEAD state where ordinary connectivity says possible but legal switch-route completion is impossible.
4. If found, price it under the existing research ladder (correctness → independent novelty → opportunity → work → transfer). If not found, close the imported mechanism as understood/redundant without re-opening the treatment queue.

**Provenance and limits:** Exact Pathfinder source inspected at main commit `9f6b90729d62069e3d0c88696965069b74e33e73`. The tiny exhaustive test is an independent hand-derived implementation, not a canonical module-import check. No imported Graphillion, Python2 code, Clingo or industrial SAT engine was installed or run. No solver-production changes made.
