# External solver/code census

> **Status:** concluded-positive
> **Last evidence:** 2026-08-24 — external implementation census reconciled with Pathfinder's current native solver, CP-SAT reference stack, and final literature synthesis
> **Decision:** the strongest genuinely different external implementation family is frontier/ZDD search, especially MIT-licensed Numberlink/frontier code, because it uses geometric frontier-state equivalence rather than Pathfinder's prefix/time representation. Treat those repositories as representation/source references, not immediate production dependencies. SAT/Z3/grid libraries are secondary encoding laboratories; generic search libraries are low priority.
> **Remaining gate:** none for the census; any frontier implementation must satisfy the current queue's bounded-interface/value gate before the deferred pilot is reopened
> **Evidence role:** discovery
> **Selection:** observational

## Purpose

This census asked a specific question:

> Is there mature external code Pathfinder can use, port, reimplement, or study that contributes a representation/inference mechanism materially different from what the repo already contains?

Pathfinder already has specialized DFS, beam, LDS, connectivity/parity/lower-bound pruning, repair, admissible-order search, portfolio routing, and a substantial time-expanded OR-Tools CP-SAT research model. Another generic DFS/A*/SAT package is therefore not automatically new capability.

## Ranked external families

| Candidate | License / copying note | Distinct representation? | Disposition |
|---|---|---:|---|
| `kunisura/TdZdd` + `junkawahara/frontier*` | MIT | **yes** | study/port frontier machinery if a bounded pilot is later reopened |
| `kunisura/algorithms2012` Numberlink ZDD | MIT | **yes** | inspect state transitions/canonicalization; copying permitted with attribution/license |
| `thomasahle/numberlink` | AGPL-3.0 | **yes** | study algorithm; independently reimplement useful ideas unless intentionally accepting AGPL obligations |
| `semiexp/numlin-sat` | MIT | somewhat | mine edge-SAT formulation ideas |
| `tuneerroy/numberlink` | verify before copying | somewhat | compare path/edge formulations |
| `uguryavuz/numberlink-solver` | MIT | somewhat | encoding reference |
| Grilops / Z3 | MIT | mostly same exact-solver family | constraint-idiom reference |
| generic graph/search libraries | varies | usually no | low priority |

## Why frontier/ZDD is the distinctive lead

Pathfinder's native search grows an ordered path prefix. The CP-SAT probe largely represents path positions across time.

Frontier-based search instead sweeps graph decisions geometrically and merges histories whose **frontier state** is identical. Classical path/Hamiltonian frontier states keep only information that can still affect the unprocessed graph, typically partial degree and connectivity labels plus counters.

For grid graphs, complexity depends heavily on frontier/interface width rather than total path length. That is a genuinely different equivalence relation and therefore worth understanding even if it never becomes a production engine.

The most relevant MIT sources found were:

- `kunisura/algorithms2012`
- `kunisura/TdZdd`
- `junkawahara/frontier_basic_tdzdd`
- `junkawahara/frontier`

## Pathfinder-specific adaptation issue: crossings

A Pathfinder crossing cannot be represented as an ordinary degree-4 graph vertex because the horizontal and vertical strands share a physical cell but do **not** connect through each other.

A useful exact graph construction is to split each physical cell into two lane vertices:

- `c:H`
- `c:V`

Horizontal movement connects H lanes, vertical movement connects V lanes, and an internal zero-length `H–V` edge represents a **turn** at the cell. A crossing uses both straight lanes while omitting the turn edge.

This representation also captures MustCross naturally as “both straight lanes used.”

That derivation is preserved in the deferred [`2026-08-24-frontier-zdd-pilot-spec.md`](2026-08-24-frontier-zdd-pilot-spec.md).

## Numberlink code as a source of state machinery

The Numberlink sources are more interesting than generic BDD/ZDD tutorials because they encode real grid path connectivity with frontier-state merging.

Potentially reusable ideas include:

- frontier order construction;
- degree tracking;
- component/mate canonicalization;
- premature-component closure rejection;
- compact state hashing/merging.

The puzzle-specific rules should not be copied blindly.

## Alternate Numberlink backtracker

`thomasahle/numberlink` uses a diagonal sweep and local partial-link representation rather than endpoint-growing search. It is interesting as an independently engineered example of making connectivity local to an active sweep boundary.

Because it is AGPL-3.0, study/reimplementation is the default disposition. Do not copy its source into Pathfinder unless the project intentionally accepts the license consequences.

## SAT/SMT implementations

Several Numberlink SAT/Z3 projects are useful as encoding laboratories, especially for comparing:

- time/path-position formulations;
- edge-selection formulations;
- explicit connectivity formulations.

This matters because Pathfinder's current CP-SAT model is time-expanded. A compact edge-based formulation might be useful for a restricted static-mechanic subset.

That is not the same as “add another SAT backend.” Any prototype would first need a model-size/inference reason to expect an advantage over the maintained CP-SAT probe.

## Generic libraries

Generic A*, BFS, DFS, beam, graph packages, and ordinary Hamiltonian-path implementations are unlikely to beat the current specialized hot loop by substitution.

They remain useful sources for **invariants** such as degree forcing, articulation/cut reasoning, parity, and sealed-region checks. Import code only when the invariant is stronger or cheaper than what Pathfinder already computes.

## Why the original implementation recommendation is now deferred

The census originally promoted a concrete Frontier/ZDD pilot as the next external-code experiment.

The broader August 24 research reconciliation changed that priority without invalidating the census:

- the final literature synthesis says frontier/DD machinery is a framework, not a default next implementation;
- beam/reference work should first establish a compact, recurrent residual/interface question;
- queue #1/#0 evidence blockers and existing exact labels have higher value of information;
- a framework should not be built merely because it is mathematically elegant and available under a permissive license.

Therefore the census conclusion is now:

> Frontier/ZDD is the strongest external **representation lead**, but the implementation pilot is deferred until a Pathfinder-specific interface question earns it.

## External references checked

- `https://github.com/kunisura/algorithms2012`
- `https://github.com/kunisura/TdZdd`
- `https://github.com/junkawahara/frontier_basic_tdzdd`
- `https://github.com/junkawahara/frontier`
- `https://github.com/thomasahle/numberlink`
- `https://github.com/semiexp/numlin-sat`
- `https://github.com/tuneerroy/numberlink`
- `https://github.com/uguryavuz/numberlink-solver`
- `https://github.com/obijywk/grilops`

## Disposition

The census found one genuinely different mature implementation family worth keeping on the shelf: frontier-based path/ZDD search.

That is enough. Do not continue collecting libraries until a ranked Pathfinder question requires a mechanism not represented here.
