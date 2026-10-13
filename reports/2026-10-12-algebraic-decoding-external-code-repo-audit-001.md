# External code repository discovery for algebraic Pathfinder decoding (2026-10-12)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-12 — multilingual GitHub repository search, representative README/source audits and reconciliation against Pathfinder's 2026-08-24 external-code census
> **Decision:** external-code search **does broaden the viable representation and propagation vocabulary**, but it does not earn any new production technique or override the existing research queue. Distinguish old frontier/ZDD prior art from newly reviewed trail-oriented DDs, SAT-native graph propagators, loop-elimination workflows, and complete-path/Z3 modeling examples. Search breadth is substantial but **not exhaustively proved**, especially outside GitHub.
> **Remaining gate:** none for this discovery pass; before selecting any implementation lane, compare one exact Pathfinder residual question with the supported model and novel reasoning of the relevant source(s), versus existing native/CP-SAT/BC1/region-resource machinery.
> **Evidence role:** discovery
> **Selection:** observational lexical repository search followed by judgment-selected source inspection (not independent performance comparison)
> **Population identity:** 81 unique repository candidates in [the structured catalogue](2026-10-12-algebraic-decoding-code-repo-candidates-001.json), captured 2026-10-12; main prior-art reconciliation at `3cdbb1fc169827b1efb411e190fd7c76096bf02d`
> **Selection history:** search terms broadened iteratively after inspecting hits and searching cross-repo implementation symbols; deeper inspection favored distinct technique families and code with named path/graph implementations
> **Inference scope:** source discovery and architectural comparison, not validated solve performance or legal Pathfinder support
> **Proposal provenance:** user request to exhaust repository prior art before choosing a cryptanalytic/constraint-decoding research lane

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-12","decision":"Catalogued 81 external candidate repos, separating pre-existing frontier work from new trail, SAT-native graph, loop-refinement and code-family examples; no production treatment earned","remainingGate":"none","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"reports/2026-10-12-algebraic-decoding-code-repo-candidates-001.json","selection":"iterative multilingual name/description search plus selected primary-source inspection","inferenceScope":"code-repo discovery only; no performance/correctness verdict"},"claimRefs":[],"sourceArtifacts":["reports/2026-08-24-external-solver-code-census.md","reports/2026-08-24-frontier-zdd-pilot-spec.md","reports/2026-10-12-algebraic-decoding-code-repo-candidates-001.json"],"successors":{"questions":[],"artifacts":["docs/solver-algebraic-decoding-research-plan.md"]},"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

## 1. Executive reconciliation: we already looked for repos

**Do not rediscover ZDDs as a fresh solver proposal.** The existing [August external-code census](2026-08-24-external-solver-code-census.md) already studied `kunisura/TdZdd`, `kunisura/algorithms2012`, `junkawahara/frontier*`, `thomasahle/numberlink`, `semiexp/numlin-sat` and `obijywk/grilops`. It identified frontier/ZDD path representations as distinct from Pathfinder's ordered-prefix / time-indexed-CP-SAT approaches. The follow-on [frontier pilot spec](2026-08-24-frontier-zdd-pilot-spec.md) already derives an **expanded H/V lane graph** to avoid false connectivity at Pathfinder self-intersections, with exact length/intersection constraints, referee contract, unsupported mechanic list, and frontier-width cap. That implementation was subsequently **cancelled/deferred** pending a real compact interface/opportunity witness, and the [14-literature synthesis](2026-08-24-external-research-pathfinder-synthesis.md) rejects a generic ZDD/CDCL/CEGAR rewrite without local evidence.

Therefore the new question is: **which newly discovered implementation actually offers a semantic ingredient, sound inference, or practical comparison missing from that prior census?** The existence of an interesting repo is insufficient.

## 2. Search coverage, provenance and caveats

The search used GitHub repository-name/description discovery (not the local Pathfinder repo's unindexed code search), supplemented by general public-web queries and primary-source README/implementation reads through the connected GitHub interface.

**Families queried**: Numberlink/Arukone/Flow Free; Slitherlink/Loop/Masyu/Yajilin/Hashi; The Witness and LinkedIn Zip; line drawing/one-stroke/Hamiltonian/trail/ordered waypoint puzzles; SAT/SMT/Z3/CP-SAT/ILP/MiniZinc; XOR-SAT/GF(2)/CryptoMiniSat; native graph connectivity and graph division; ZDD/TdZdd/Graphillion/frontier BDD; exact cover/Algorithm X/DLX; resource-constrained paths and automaton/regular constraints; model counting/knowledge compilation.

**Language probes** included English, Japanese (`一筆書き`, `ナンバーリンク`, `スリザーリンク`), Chinese (`一笔画`, `数回`, `求解器`), French, German and Spanish names. Japanese/Chinese probes found genuine additional one-line/Numberlink implementations including `asSqr/puzz_sqr`, `asSqr/numberlink_page`, `YasuhikoKiuchi/OneStroke`, `xzf/OneLineSolver` and `F-mM7/hamiltonian-path-puzzle`. Several literal non-English terms returned zero. That is a **search-index limitation**, not proof that no implementations exist. Search results contain many sliding-puzzle/A* false positives.

**Code-symbol search**: `FrontierSTPathSpec`, `active_edges_single_cycle`, `GraphSet.paths`, and Numberlink/Z3 references revealed hidden F#, C#, TypeScript and Japanese sources not obvious from repo names. The code-query search results also contained substantial false positives.

**Hosts**: GitHub had direct code access. Web search found `gitlab.com/jgremmen/zbdd` (Java ZBDD) and `gitlab.com/scce/add-lib` (Java BDD/ZDD/ADD backed by CUDD/Sylvan). These were web-verified but not independently fetched/benchmarked from GitLab. Codeberg and source-archive coverage remain incomplete; no claim of all-world-web completeness. No external solver was installed, executed, benchmarked, or copied into Pathfinder by this audit.

**Coverage artifact**: the companion [81-entry JSON catalogue](2026-10-12-algebraic-decoding-code-repo-candidates-001.json) preserves exact URL, research family, verification grade, and rationale. `source+readme+metadata` means named implementation source really was read; `discovered-only` means name/search hit only. A discovered repo **must not** be reported as code-verified. The JSON is a *candidate list*, not a second research-question/queue/priority registry.

## 3. Repositories worth inspecting for distinct mechanisms

### A. Trail / repeated-vertex decision diagrams: promising *addition* to old frontier census

**[hana-hiro/graphillion-trails](https://github.com/hana-hiro/graphillion-trails)** (Python; README read; MIT per GitHub repo metadata) is an especially useful new find. It explicitly enumerates all *trails* and Eulerian trails, unlike the more usual *simple paths*. Its README describes a conversion using a **line graph** (original edges become vertices) and a Graphillion/ZDD backend. Thus it admits walks through the same *vertex* multiple times while constraining *edges*. It is conceptually nearer Pathfinder's visit-on-both-axes phenomenon than a conventional no-revisit Hamiltonian solver. However, **trail constraints are not proven equivalent to Pathfinder's axis-entry history**, and a line-graph path may still omit the exact ordering/directional/portal/flipper semantics. Next cheap comparison: on tiny referee-validated Pathfinder crossings, map legal paths into the repo's trail domain and count both false rejections and spurious completions; no whole-solver fork.

**[graphillion/graphillion](https://github.com/graphillion/graphillion)** (C++ core/Python; README inspected) already supports large graph families, simple paths and set operations; version 2 also advertises directed graph sets and **cost-bounded extraction**. Its graph-family operators could support abstract path-set intersections and exact-resource filtering, but a `GraphSet.paths` call is *not* a Pathfinder decoder and may exclude revisits. Graphillion was generally covered by the August DD literature, but `graphillion-trails` supplies a more specific constructive source.

**[kunisura/TdZdd](https://github.com/kunisura/TdZdd)** and **[junkawahara/frontier_basic_tdzdd](https://github.com/junkawahara/frontier_basic_tdzdd)** remain the strongest prior **small exact frontier construction** references. `frontier_basic_tdzdd` implements s–t paths, Hamiltonian s–t paths, and cycles, all with explicit example commands and edge-order effects. The existing Pathfinder pilot already owns the H/V lane-graph strategy; copying these architectures now would ignore a closed priority decision. **[AndreVRibeiro/zdd_graph_enumeration](https://github.com/AndreVRibeiro/zdd_graph_enumeration)** offers an additional educational Python from-scratch frontier/ZDD example for source tracing, not superior performance evidence.

**[thomasahle/numberlink](https://github.com/thomasahle/numberlink)** (Go, AGPL-3.0; old lead reverified): geometric diagonal sweep / partial links and a dual corner representation. The project explicitly assumes full-grid coverage and cannot generally determine uniqueness; published speed claims are **its own Numberlink workload**, not comparable Pathfinder results. Study the algorithm, do not copy AGPL code into Pathfinder without licensing review.

### A2. Code-search discoveries missed by repository-name searching

Searching **code symbols across repositories** (not just repo names) exposed two further independent path-encoding examples:

**[wix-diesel/ZDD.Net](https://github.com/wix-diesel/ZDD.Net)** (Japanese README, C#, Apache-2.0, updated 2026-09-28; README and comparison source inspected) is unusually useful as a comparison instrument. It offers native .NET ZDD set-family algebra, graph path/Hamiltonian/degree/connected-subgraph and linear/cardinality specifications, `CountBySize`, weighted/count/sample operations, and **`Graph.EstimateMaxFrontierSize`**. Its tree includes comparison fixtures against **both TdZdd PathZdd and Graphillion paths**, which can help measure how much an apparent gain is from implementation details rather than representation. The author claims tests/large examples in README; **no benchmark was reproduced**, and .NET 10/C# is not a direct browser integration route.

**[leymbda/numberlink](https://github.com/leymbda/numberlink)** (F# plus Microsoft.Z3, updated 2026-04) contains a particularly Pathfinder-adjacent source snippet in `Numberlink.Solver/SmtSolver.fs`: `PuzzleEdge.BridgeLane` groupings force both halves of a lane to carry the same line identity while requiring distinct identities across crossing lanes. This independently illustrates **separate strands through one visual crossing point**, complementing Pathfinder's already-derived August H/V lane graph. **Critical source audit caveat:** the same solver has a `TODO` to prevent shadow cycles and, upon SAT, currently returns `Ok Flow.empty` instead of constructing a real flow. It is an **incomplete model fragment**, not a proven working solver; no direct plug-in or correctness claim is warranted.

Additional code-search finds: **[logic-pad/grilops](https://github.com/logic-pad/grilops)** is a TypeScript port of Python Grilops with Z3 and browser examples, but its *own README explicitly calls the paths module buggy*; the `numberlink.ts` example is not evidence of robust Pathfinder use. **[hakank/hakank](https://github.com/hakank/hakank)** exposes `picat/flow_game.pi` and broader multi-paradigm constraint models. `newtomsoft/HumanTalkPuzzleSolver` and `MewMew0000/EnumeratingGraphOrientation` are code-discovered only. This branch of search demonstrates why repository names alone were insufficient.

### B. Native graph constraints and conflict-explaining propagation: most important *new code audit*

**[semiexp/cspuz_core](https://github.com/semiexp/cspuz_core)** (Rust/C++; source + README examined; pushed 2026-10-11) has a **native graph division propagator** in `cspuz_core/src/propagators/graph_division.rs`. Its implementation contains graph-edge states, domain lower/upper-bound state, propagation reasons, and rollback. It also includes `cspuz_rs_puzzles/src/puzzles/cross_border_parity_loop.rs`, demonstrating parity-sensitive grid-loop constraints. The presence of reasons is significant for our missing *joint obligation conflict / reusable proof* vocabulary, though those reasons are tied to the solver's specific graph-division predicate. A new Pathfinder theorem does **not** follow merely from finding a sophisticated propagator.

**[semiexp/cspuz](https://github.com/semiexp/cspuz)** (Python; source/README inspected) exposes `active_vertices_connected`, `division_connected`, `active_edges_single_cycle`, and related high-level constraints. Its README lists backends including cspuz_core, csugar, Z3 and Sugar; `cspuz/graph.py` implements the connectivity contracts. It is excellent *reference infrastructure for modelling and distinguishing graph relaxations*, not proof of a cheap online Pathfinder component. The existence of this code was partly known in the August corpus; the native reason-producing propagator and newer puzzle sources are the meaningful update.

**[obijywk/grilops](https://github.com/obijywk/grilops)** (Python, MIT; old lead reverified) provides `grilops/paths.py` and explicit `examples/numberlink.py`. It represents paths through cell symbols and Z3 constraints, with configurable open/closed paths and loop exclusion. This is a suitable **human-readable alternative encoding** comparator to our time-expanded CP-SAT oracle, especially for demonstrating how relaxing revisits changes the admissible family.

### C. Incremental SAT/CSP + exclusion constraints

**[xzy06/slitherlink_solver](https://github.com/xzy06/slitherlink_solver)** (Chinese README, Python; implementation inspected) uses `sat_solver.py` with Glucose3, cardinality/degree constraints, and **iterative loop elimination**: solve a cheap relaxation, identify invalid disconnected loops, add blocking clauses, repeat. This is a concrete instance of abstract-plan → counterexample → refinement. Published timings belong to the author's Slitherlink puzzles and were not reproduced. It may inspire a *restricted* Pathfinder exact-oracle refinement if a supported loop/crossing error is shown to recur; current CEGAR/CP-SAT literature in Pathfinder already covers the general concept.

**[praveenkulkarni1996/slitherlinky](https://github.com/praveenkulkarni1996/slitherlinky)** (MIT; Python/pycosat; source verified) also distinguishes local edge-degree feasibility from the **global single-loop** property. This is good code for testing local-versus-global model errors; a degree-2 subgraph can contain multiple disconnected cycles. It is a reminder that graph-incidence or local degree satisfaction alone never proves a path.

**[semiexp/numlin-sat](https://github.com/semiexp/numlin-sat)** (MIT, C++; old lead) and `nguacon90/numberlinkSatSolver`, `Rohlik148/Numberlink-SAT-Solver`, `ArtShp/numberlink-SAT-solver`, `khoivn/numberlink-sat-solver`, and `anhpham197/SAT-Encoding-for-Numberlink` supply alternate numberlink SAT-encoding candidates. These last items remain *discovery-only* until a specific source feature merits inspection; many appear to solve the same smaller no-revisit problem. No false claim of five independent algorithm breakthroughs.

### D. Exact constraint engines and cryptanalytic vocabulary

**[msoos/cryptominisat](https://github.com/msoos/cryptominisat)** (source README inspected; active in Oct 2026) natively accepts **XOR clauses**, performs Gauss–Jordan reasoning and supports incremental assumptions / multiple solves via CLI, Python and C++ interfaces. It is the most literal bridge between a GF(2) “syndrome” and general SAT constraints. Test its effect only if our *actual* Pathfinder encoding produces enough linearly interacting XOR information that preprocessing is nontrivial; replacing OR-Tools with CryptoMiniSat for incidence-only equations would almost certainly buy little.

**[pysathq/pysat](https://github.com/pysathq/pysat)** provides SAT prototyping / cardinality machinery; **[Z3Prover/z3](https://github.com/Z3Prover/z3)** and **[google/or-tools](https://github.com/google/or-tools)** are general exact/SMT backends, with OR-Tools already used in Pathfinder. Their presence does not count as a new technique. `PelleWhitebear/Flow-Free-Z3` and `MusadiqPasha/FlowFree-Solver` supply smaller runnable Z3 examples; `taylorjg/FlowFreeDlx` offers a possible exact-cover/dancing-links alternative. These are useful for *encoding parity/direction/resource contracts on tiny levels*, not direct production candidates.

The **coding-theory analogy** also led to additional XOR-SAT and approximate model-counting names (`j-danner/2xnf_sat_solving`, `vardigroup/FourierSAT`, `meelgroup/approxmc`). All remain exploratory. Formula/model counts from a **relaxed encoding are upper bounds or unrelated estimators**, never exact Pathfinder solution multiplicities unless every mechanic is encoded and validated.

### E. Ordered paths and partial-region reasoning

**[Overv/TheWitnessSolver](https://github.com/Overv/TheWitnessSolver)** (MIT, JS; verified) checks sealed regions incrementally and derives auxiliary required nodes from symbol separation; **[RainbowwPhoenixx/witness-solver](https://github.com/RainbowwPhoenixx/witness-solver)** (Rust; verified) pre-checks partial regions and documents dramatic state-count reductions on its sample boards. Both are valuable for thinking about *progressive necessary-condition propagation*, but Witness paths are normally self-avoiding. Pathfinder's revisit/crossing and other mechanics can invalidate a direct transfer.

**[chi-feng/zip-solver](https://github.com/chi-feng/zip-solver)** (MIT, JavaScript; verified) uses Hamiltonian paths with ordered waypoints, forced degree, connectivity and checkerboard-capacity pruning, with a uniqueness check and tests. All of these are **weaker/no-revisit relatives** of Pathfinder; the sample's speed claims are not transfer evidence. `CWSwastik/zip-solver` provides multiple historical DFS/prune variants. `youarer1ght/TheWitnessPuzzle` offers a Chinese-language BFS/backtracking reference. Japanese/Chinese one-stroke repos extend the nomenclature coverage but are not yet verified as novel mechanisms.

## 4. Relative value after comparing with the existing Pathfinder repo

| External family | Prior audit status | Distinctive audited ingredient | Likely role today | Why not immediately implement |
|---|---|---|---|---|
| Frontier/TdZdd | **Already deeply covered**, dedicated cancelled pilot | Geometric frontier exact equivalence and H/V lane graph | Frozen reference / proof vocabulary | Needs real compact-interface opportunity; state explosion and crossing semantics already studied |
| Graphillion trails | Newly source-verified variant | **Repeated vertices / edge-disjoint trail encoding** | Tiny counterexample/reference model | Edge constraints may misrepresent Pathfinder axis and reuse history |
| cspuz_core native propagator | Newly source-verified internals | **Graph division with reason/rollback** | Mine a bounded propagator/reason technique | Native predicate is different; no identified incremental Pathfinder contradiction yet |
| cspuz/grilops | Existing family, newly traced implementations | Grid path/global-connectivity encoding | Offline comparator | Generic exact solve has cost and semantics gaps |
| Slitherlink SAT iterative elimination | Newly source-verified | Cheap local model, global counterexample-driven clause addition | CEGAR/abstraction proof lab | Ordinary loops forbid Pathfinder intersections; model bridge unproven |
| CryptoMiniSat XOR | Source reverified | XOR+CNF and incremental Gaussian reasoning | GF(2)×SAT reference backend | Raw incidence is mostly redundant; no richer XOR facts earned |
| Numberlink/Zip/Witness | Existing/new mix | Alternative sweep; degree/partial-region/waypoint constraints | Cheap theorem and negative-case mining | Different no-revisit/full-grid/region rules; transfer not automatic |
| Generic SAT/SMT/DP/RCSP | Existing exact model class | Alternative encodings / resource spectra | Comparator only | Another engine without new representation/semantic inference is not a capability |

**Most important difference from the earlier external census:** this search increases *method diversity inside already-known algorithm families*, especially trail-versus-simple-path semantics and reason-producing native graph propagation. It **does not** change the queue's requirement for a novel, sound decision fact and realistic opportunity/economics. In particular, do not auto-reopen the cancelled frontier pilot merely because there are more ZDD repositories.

## 5. Concrete no-lane-yet comparison protocol

Before choosing which codebase to adapt:

1. **Mechanics row**: for each candidate explicitly classify gate selection, endpoint, length, intersections, used-axis/straight-on-used-axis, MustPass/MustCross, portals, filters/flippers, turn/surround/adjacent-turn as exact, provably relaxed (superset), restricted/under-approximate, or unsupported. No unclassified mechanic in a solver-claiming experiment.
2. **Knowledge type**: identify whether source yields a legal witness, a relaxation-UNSAT proof, forced decision/backbone, exact resource vector, an explanation/core, or only a heuristic ranking. Validate witnesses with Pathfinder's referee; prove relaxation direction for negative claims.
3. **Existing comparator**: replay against canonical parity, distance/MC/MP bounds, connectivity, BC1/BC1-VX, `separator-resource` and `joint-obligation-mc-portal` in the existing harness, plus retained CP-SAT labels. A novel syntax for an already-implemented theorem is not new inference.
4. **Smallest discriminating level**: prefer exhaustive 3–5-cell micrographs or one real prefix state over creating hundreds of levels. For trail/DD ideas, find legal crossing paths missing from the external abstraction and spurious external paths admitted by it.
5. **Cost, not branding**: after *independent* proof witnesses, compare construction cost, workSaved/opportunity and supported population. Hold out whole parent families, not sibling variants counted as independent trials. Stronger offline exact model does not automatically belong in a browser hot loop.
6. **Copying/licensing**: explicit SPDX/licenses only where verified. Existing graphillion/old frontier and MIT code may be studied under their terms; `thomasahle/numberlink` is AGPL-3.0; `cspuz_core` and `graphillion` report nonstandard/unresolved license metadata in GitHub, so inspect source license files before reuse.

A *useful inverse* to every proposed decoder is to measure false algebraic determinism: does a forced external edge-set survive as a forced **ordered** Pathfinder move when a legal path revisits an axis or uses a portal? The constraint-space inclusion direction matters more than whether the output looks like a path.

## 6. Follow-on discovery limits and anti-boondoggle rule

The 81-entry catalogue is **deliberately heterogeneous**: deep source-verified, README-verified, metadata-only, historical and search-only entries are labeled, not presented as 81 fully audited tools. Its 81 names are not 81 distinct algorithms. We also did not exhaust all forks, GitLab/Codeberg/SourceHut hosts, non-indexed code in Japanese/Chinese, or published non-code research implementations. Further repository sweeps are justified by a **specific missing mechanism class or semantic discriminator**, not by a round target of 200 or 500 repo URLs.

Useful search expansions *if* a live discriminator requires them:
- author/organization/fork snowballing from Graphillion/TdZdd/cspuz_core and puzzle archives;
- code-level symbol search for `active_edges_single_cycle`, `FrontierSTPathSpec`, `GraphDivision`, `line graph`, `regular`, `MUS`, `incremental loop elimination` and language equivalents;
- GitLab and university mirrors for graph-frontier algorithms;
- compare commits across research/code variants rather than treating one fork per concept as independent evidence;
- test new source against **current** Pathfinder code and exact witness/referee, not an August interpretation.

**Disposition:** repository reconnaissance completed for this stage, no solver lane selected, no new production/search code or GHA job earned. Preserve this report and [candidate catalogue](2026-10-12-algebraic-decoding-code-repo-candidates-001.json) as a reusable, evidence-graded prior-art inventory. Active solver-science priorities remain in [the workstream authority](../docs/solver-optimization-workstreams.md), and the [algebraic-decoding research plan](../docs/solver-algebraic-decoding-research-plan.md) remains premise-only.
