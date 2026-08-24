# External solver/code census

Date: 2026-08-24

## Purpose

Identify mature external solver implementations or algorithm families that can contribute capability or speed to Pathfinder without duplicating work already present in the repository. Classify each candidate as **use directly**, **port/adapt**, **reimplement from the algorithm**, **study only**, or **low priority**.

This is not a proposal to replace the current solver wholesale. The current solver already has iterative DFS, beam search, LDS, connectivity/parity/lower-bound pruning, repair search, admissible-order search, portfolio routing, and a substantial exact CP-SAT research oracle. The useful external targets are therefore machinery with materially different representations, inference, or pruning.

## Existing Pathfinder work that changes the search

The repository already contains `scripts/stress/cpsat-full-probe.py`, a whole-level OR-Tools CP-SAT model used as an exact research oracle. It has support for the stress-corpus mechanics including portals, must-cross, landmarks, and flipping filters (static filters remain outside the stress corpora and deliberately unencoded). It validates emitted paths through the native referee. Earlier versions solved native-unsolved levels, so "try CP-SAT" is not a fresh direction.

The current optimization queue also already uses CP-SAT feasibility labels for repair-retreat research. Therefore the highest-value external-code work should either:

1. provide a substantially different exact representation from the current time-expanded CP-SAT model;
2. expose pruning/inference that can be transplanted into native search; or
3. provide a fast independent oracle whose failure modes are weakly correlated with current DFS/beam/repair.

## Ranked candidates

### 1. Frontier-based search / ZDDs — highest-priority new family

**Sources**

- `kunisura/algorithms2012` — MIT. Source programs for Numberlink and Slitherlink from *Finding All Solutions and Instances of Numberlink and Slitherlink by ZDDs* (Algorithms 2012).
- `kunisura/TdZdd` — MIT. Header-only C++ framework for direct construction/evaluation of BDDs/ZDDs; supports parallel construction.
- `junkawahara/frontier_basic_tdzdd` — MIT. Small example implementation of frontier-based search with `s-t` path and Hamiltonian `s-t` path modes.
- `junkawahara/frontier` — MIT. General frontier method implementation for path/cycle/tree/cut families.

**Why it differs from Pathfinder**

Pathfinder DFS/beam and the CP-SAT probe represent a path primarily along the time/step dimension. Frontier-based search instead chooses graph edges in a geometric sweep and stores only the state intersecting the current frontier: typically vertex degree plus connectivity-component/mate information. States with identical frontier signatures merge exactly.

For grid graphs the frontier can be much smaller than the full board. This is especially attractive for narrow boards and near-Hamiltonian/high-density levels, where the current solver already has a distinct archetype and where many cells are forced into degree-2 path structure.

**Pathfinder adaptation questions**

A prototype would need to augment the ordinary `s-t` path frontier state with at least:

- exact used-edge/path-length count;
- exact self-intersection count;
- per-cell horizontal/vertical axis use where revisits are allowed;
- must-pass/must-cross obligations;
- gate/goal endpoint semantics;
- portal state;
- turn-landmark state;
- flipping-filter ordering/parity where present.

The promising property is that these additions are mostly finite frontier/local counters rather than full prefixes. A prototype should initially target a mechanic subset, not attempt all mechanics at once.

**Recommendation:** **USE FRAMEWORK / PORT-ADAPT.** Highest-value first experiment. Do not begin with production integration. Build an offline exact pilot on a mechanic-supported subset and compare capability/work against both native search and CP-SAT.

**First gate:** choose 20–50 currently-unsolved or expensive levels with no portals/flippers/complex turn landmarks, stratified by grid width and navDensity. Encode gate→goal path, reqLen, reqInt, must-pass and must-cross if feasible. Record solved/timeout/state-count/peak-frontier-state count. The experiment is interesting even if it loses badly, because state-count by frontier width will tell us whether this representation has a viable Pathfinder regime.

### 2. Numberlink ZDD solver from the 2012 paper — direct source of domain-specific frontier state

`kunisura/algorithms2012` is more valuable than a generic ZDD tutorial because it contains actual Numberlink source code and is MIT licensed. Numberlink is not Pathfinder, but both problems ask a grid graph to realize constrained orthogonal path structure under severe connectivity restrictions.

**Recommendation:** **PORT IDEAS FIRST, COPY PERMITTED WITH ATTRIBUTION/LICENSE.** Inspect the exact state representation, frontier ordering, connectivity/mate canonicalization, and rejection rules before writing a Pathfinder ZDD prototype. The likely reusable asset is the state transition/canonicalization design, not the puzzle rules verbatim.

### 3. `thomasahle/numberlink` — alternate backtracking representation and pruning

AGPL-3.0 Go solver. It reports very high performance and uses a systematic diagonal board sweep rather than growing links from endpoints. Its documented techniques include:

- partial links;
- a dual representation based on link corners;
- optimistic validation;
- a fixed SW-diagonal fill order that makes connectivity information local to an active diagonal.

This is conceptually related to frontier search but independently engineered as a highly pruned backtracker.

**Recommendation:** **STUDY / REIMPLEMENT ALGORITHMIC IDEAS; DO NOT COPY SOURCE INTO THE CURRENT PROJECT WITHOUT INTENTIONALLY ACCEPTING AGPL OBLIGATIONS.** The most interesting question is whether its partial-link and dual/corner representation reveals a cheaper Pathfinder frontier signature or local impossibility test.

### 4. SAT Numberlink implementations — useful encoding laboratory, not a new solver backend

**Sources**

- `semiexp/numlin-sat` — MIT, C++ SAT-based Numberlink solver.
- `tuneerroy/numberlink` — exposes path-based SAT, edge-based SAT, and constraint-programming solvers for the same puzzle family.
- `uguryavuz/numberlink-solver` — MIT, OR-Tools-based Boolean/SAT formulation.
- `obijywk/grilops` — MIT, Python/Z3 grid-puzzle library with reusable open/closed path constraints.

Pathfinder already has a time-expanded CP-SAT model. The opportunity is therefore not "use SAT" generically. It is to compare **edge-based** and **path/connectivity-based** formulations against the current step-indexed model.

An edge formulation may be dramatically smaller for long paths on compact boards, while a time-expanded formulation handles order-dependent mechanics naturally. This suggests a hybrid research question: can static path structure be solved edge-first, with order introduced only where Pathfinder mechanics require it?

**Recommendation:** **STUDY/PORT ENCODINGS.** Build only if model-size analysis suggests a real advantage over `cpsat-full-probe.py`. Prefer MIT sources.

### 5. Grilops / Z3 — constraint idioms and model diagnostics

Grilops is MIT licensed and specifically abstracts paths, loops, lattices, regions, and grid constraints over Z3. It is Python and not a natural production dependency for Pathfinder, but it is useful as a readable collection of mature grid-constraint idioms.

**Recommendation:** **STUDY ONLY unless a Z3 prototype has a specific hypothesis.** Current CP-SAT already supplies an industrial exact engine. A second generic SMT backend is lower priority than trying a different representation.

### 6. Generic Hamiltonian path / graph libraries

Generic A*, BFS, DFS, beam, priority-queue, and graph packages are unlikely to improve the hot path by direct substitution. Pathfinder's current search is already highly specialized and packed around its mechanics. Hamiltonian-path literature remains useful for prune ideas (degree forcing, articulation/cut separation, parity, sealed regions), but code should be adopted only when it demonstrates a stronger or cheaper invariant than the existing native implementation.

**Recommendation:** **ALGORITHM MINING, NOT LIBRARY REPLACEMENT.** Compare invariants first; avoid importing abstraction overhead into the production inner loop.

## Candidate disposition table

| Candidate | License | Distinct representation? | Action |
|---|---|---:|---|
| TdZdd + frontier examples | MIT | **Yes** | **Prototype first** |
| algorithms2012 Numberlink ZDD | MIT | **Yes** | Inspect/port state machinery |
| Thomas Ahle Numberlink | AGPL-3.0 | **Yes** | Study; independently reimplement useful ideas |
| semiexp/numlin-sat | MIT | Some | Mine edge-SAT encoding |
| tuneerroy/numberlink | check before copying | Some | Compare path vs edge SAT formulations |
| uguryavuz/numberlink-solver | MIT | Some | Encoding reference |
| Grilops | MIT | Mostly same exact-solver family | Constraint-idiom reference |
| Generic graph/search packages | varies | Usually no | Low priority |

## Concrete next experiment

The highest-information next step is a **frontier/ZDD feasibility pilot**, not production code.

1. Read the MIT Numberlink ZDD source and `frontier_basic_tdzdd` implementation closely enough to specify the minimal Pathfinder state.
2. Start with levels whose mechanics can be represented without order-dependent portal/flipper complexity.
3. Encode one gate→goal trail/path with exact `reqLen`; decide explicitly how intersection cells are represented as two orthogonal edge uses.
4. Add `reqInt` as an exact count of cells using both axes.
5. Add must-pass and must-cross as local degree/axis obligations where possible.
6. Emit a candidate and validate it only with `validateCandidatePath`; never trust the experimental encoder as referee.
7. Benchmark by deterministic work proxies: created DD states, peak live frontier states, and wall time. Compare against current CP-SAT and native solver on exactly the same population.
8. Abort early if frontier width/state explosion is obviously dominant. If results are width-conditioned, test a level-blind routing rule based on geometry only after held-out validation.

## Why this is worth doing even if it fails

The current project has repeatedly gained solves by finding stranded capability and by exposing where representations discard viable material. A frontier/ZDD pilot measures an entirely different state equivalence relation. If it succeeds, it may supply a new exact rescue family. If it fails selectively, the failure boundary may identify which Pathfinder mechanics or board geometries create the true combinatorial difficulty. If its frontier equivalence rules are strong but the full ZDD is too costly, those rules may still become native pruning or deduplication ideas.

The key constraint for future work is therefore: **do not add another vaguely different search attempt merely because external code exists. Import a representation or inference mechanism that the current solver does not already have.**

## External references checked

- https://github.com/kunisura/algorithms2012
- https://github.com/kunisura/TdZdd
- https://github.com/junkawahara/frontier_basic_tdzdd
- https://github.com/junkawahara/frontier
- https://github.com/thomasahle/numberlink
- https://github.com/semiexp/numlin-sat
- https://github.com/tuneerroy/numberlink
- https://github.com/uguryavuz/numberlink-solver
- https://github.com/obijywk/grilops
