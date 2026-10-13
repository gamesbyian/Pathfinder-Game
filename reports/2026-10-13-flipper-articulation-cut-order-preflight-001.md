# Static flipper articulation/order-parity preflight: closed negative (2026-10-13)

> **Status:** concluded-negative
> **Last evidence:** 2026-10-13 — native flipper semantics and historical pruning reports inspected; exact small-corridor proof model and 5 Node tests; graph-cut opportunity scan of 160 published and 1,700 Corpus-2 random levels
> **Decision:** a sound, bounded root-level flipper order/parity certificate exists for a **portal-free graph with every flipper a mandatory gate-goal cut vertex**, but it has **zero production-population opportunity** in the inspected published/Corpus-2 levels. **Do not promote, build a hot-path implementation, extend this into a new framework or count any synthetic acceptance as a new Pathfinder solve.** Retain only as a documented negative/subcase of the small exact projection research program.
> **Remaining gate:** none for this narrow root-only form; any broader residual/order-set form must be independently nominated by a real opportunity witness and nonredundancy beyond existing flipper, connectivity and BC1/BC1-VX logic.
> **Evidence role:** discovery / opportunity falsification of one restricted proof form; not treatment validation
> **Selection:** prospective structural rule selected from external crossing/ordered-path archaeology before corpus opportunity scan; small fixtures constructed for correctness but not a statistically representative population
> **Population identity:** published data/levels.json on GitHub main (160 levels) and Corpus-2 data/stress/stress-levels-random.json (1,700 levels) as fetched 2026-10-13; exact source SHA must be pinned by any later independent confirmation
> **Inference scope:** static root and portal-free **only**; no claims about partial prefixes or any flipper use-order deduction in general

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-13","decision":"Static root gate-goal articulation parity for all compulsory flippers had no all-compulsory opportunity among published or Corpus-2 portal-free flipping-filter levels","remainingGate":"none","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"data/levels.json and data/stress/stress-levels-random.json at 2026-10-13 GitHub retrieval","selection":"prospectively selected structural proof; exhaustive eligibility count for two available corpora","inferenceScope":"static root-only negative opportunity, not refutation of richer ordering inference"},"claimRefs":[],"sourceArtifacts":["scripts/stress/flipper-cut-order-preflight.mjs","scripts/stress/flipper-cut-order-preflight-node-test.mjs"],"successors":{"questions":[],"artifacts":["docs/solver-algebraic-decoding-research-plan.md"]},"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

## 1. Question from the mechanic-first source search

Could we combine the native **global flipper-use-order parity** with mandatory gate-to-goal topology, forcing an impossibility *before* search, without buying a time-indexed CP-SAT solve?

Earlier source archaeology found ordered-chain reasoning in [IceLom](https://github.com/ProximaCentauri0/Icelom), explicit edge orders in [Nikoli/Z3 Icebarn](https://github.com/kevinychen/nikoli-puzzle-solver/blob/main/src/solvers/icebarn.ts), and H/V lane-specific connectivity in [Noqx](https://github.com/T0nyX1ang/noqx). None of those repos implements Pathfinder's global flipper parity. The native contract in [mechanic-state-contracts](../docs/mechanic-state-contracts.md), [search-state.ts](../modules/solver/search-state.ts), and [the CP-SAT support audit](2026-08-15-cpsat-flipping-filter-support.md) defines it precisely: a flipper is visited at most once, traversed straight, and accepts its declared axis if an even number of *other* flippers has already been used, otherwise the opposite axis.

A path may revisit an ordinary cell or even retraverse an edge; **do not infer an ordinary simple-path graph** from the game rules. The following proof does not rely on global simplicity. It relies only on the one-use exception for flipper cells, graph cuts, and a portal-free over-approximation.

## 2. Sufficient condition and proof

Given gate g, goal t and portal-free physical-cell adjacency graph G:

1. Build a **supergraph** of real legal movement, omitting only certain static walls (blocks/geese/false goals/impassable landmark roles). Ignore dynamic visits, filters, all turn/length/intersection restrictions and other-gate no-entry; that may preserve too many edges but cannot invent a false topological obstruction.
2. For each flipper f, remove its vertex from G. If g and t become disconnected, **every** g-to-t walk must visit f at least once. Native flippers are single-use, hence exactly once in any successful walk.
3. For mandatory f, the first/only entrance comes from f's gate-side component and the exit into f's goal-side component. Since flippers cannot turn, its allowable axis is the set of opposite cardinal gate-side/goal-side neighbor pairs. If neither H nor V works, the gate is impossible.
4. **Only if every flipper on the level is mandatory**, the order of all flipper visits is fixed. For f, the number of other compulsory flippers on the gate side of G minus f is its exact rank (number used previously) in every legal completion. The acceptable axis is declared(f) for even rank, opposite for odd rank. If none of f's permissible straight-through axes equals that required axis, the gate is impossible.
5. If **every** candidate gate is impossible, reject the level in this relaxation. If even one gate is merely unresolved, classify the whole level unresolved. Distinguish a static disconnection (already covered by production connectivity) from a parity-specific contradiction. A non-reject is **not** an existence or solvability claim.

Any portal pair or portal landmark forces **abstention**: a jump may bypass a static cut or shift side/order. Optional flippers force abstention for the rank argument: a detour to one may flip all later orientations. This is intentionally narrower than the dynamic move validator and existing full-mechanic CP-SAT oracle.

## 3. Synthetic discriminators and tests

Files:
- [Research-only preflight](../scripts/stress/flipper-cut-order-preflight.mjs)
- [Focused Node tests](../scripts/stress/flipper-cut-order-preflight-node-test.mjs)

For a 4 × 3 board passable only along middle row, gate (1,2), goal (4,2), reqLen=3, reqInt=0, and flippers (2,2),(3,2):

| Initial axes | Consecutive H-axis route | Research certificate |
|---|---|---|
| H,H | second flipper needs V on its first visit, but corridor forces H | parity contradiction / reject |
| H,V | second flipper flips from V to H, so both passes are H | no contradiction, **not** proved solved by certificate |
| V,H | first flipper needs V, corridor forces H | parity contradiction / reject |
| V,V | first flipper needs V; second would need H | parity contradiction / reject |

The standalone Node test exhausts **all 62 declared-axis patterns across 1–5 flippers**, comparing a separate direct-corridor symbolic oracle to the certificate. In addition, the **exact committed script's pure functions** were extracted and executed in the isolated GitHub-tool JavaScript runtime against both retrieved corpora and all 62 patterns: **0 disagreements**. This does not replace running the Node CLI or canonical gameplay referee. It also verifies optional-flipper abstention, nonlocal portal abstention, and multi-gate non-rejection when another gate remains unresolved. The tests were executed on Node 22 in an isolated temporary environment and passed **5/5**; the exact committed GitHub files await normal checkout execution/CI verification, so this is **not** yet a canonical referee-validated Pathfinder LIVE/DEAD pair.

Reproduce after checkout:

~~~sh
node --test scripts/stress/flipper-cut-order-preflight-node-test.mjs
node scripts/stress/flipper-cut-order-preflight.mjs --corpus=data/levels.json
node scripts/stress/flipper-cut-order-preflight.mjs --corpus=data/stress/stress-levels-random.json
~~~

The preflight uses plain Node only and does not import code into the production solver or duplicate the offline replay harness. It emits explicit unsupported/unresolved categories rather than treating a failure to prove an incompatibility as a solve.

## 4. Exhaustive eligible-population opportunity census

The **exact committed source's pure functions** (with the Node file imports and CLI entrypoint omitted, no algorithmic edits) were executed directly in the connected GitHub JavaScript environment against the retrieved raw corpus documents. The 62 synthetic pattern cases were also rechecked and all agreed with the independent direct-corridor oracle. The full Node CLI was **not** run in a local repository checkout; the commands below are provided to reproduce these observations. The source-level evaluation yielded these denominators:

| Measured structural event | Published | Random Corpus-2 |
|---|---:|---:|
| Total levels | 160 | 1,700 |
| Have flipping filters | 13 | 957 |
| Flipper levels without portal pairs | 8 | 418 |
| Flipper levels excluded for portal pairs | 5 | 539 |
| Eligible gate cases (not necessarily compulsory) | 11 | 418 |
| Gate cases with ≥1 mandatory flipper | 2 (P00157, two gates) | 5 (five levels) |
| Gate cases where **all** flippers are mandatory | **0** | **0** |
| Eligible full forced-order parity contradictions | **0** | **0** |

Examples of merely *partially* mandatory flipper opportunity on Corpus-2: R00093, R00234, R00372, R02043, R02465. Each has one articulation-compulsory flipper, but several other optional flippers, so global rank parity is **underdetermined**. Published P00157 has one compulsory flipper under each gate but three flippers overall. Published P00143 appears cut-constrained in the **ordinary local graph**, but is **portal-bearing** and therefore ineligible: excluding its 3 portal pairs is vital for soundness, not an inconvenient dropped example.

An opportunity-free result applies to this **sufficient condition**, not to all flipper parity, not to *dynamic* prefix states where optional cells can become unavailable, and not to a combined exact CP-SAT solution-count question. It also does not imply that switching this check on in production could never alter search trajectories. There is simply no demonstrated static opportunity, and its build cost is nonzero.

## 5. Scientific decision and downstream accounting

- **Do not promote:** no real eligible parity contradiction, no production-depth firing observation, no avoided-work estimate, no nonredundant consumer case.
- **Do not conflate:** this is not a replacement for the full-mechanic CP-SAT's exact order encoding and doesn't reopen the [cancelled frontier/ZDD pilot](2026-08-24-frontier-zdd-pilot-spec.md).
- **No duplicate solver infrastructure:** code is a tiny offline analyzer/test. Its purpose is an auditable exact rejection theorem with an immediately useful negative opportunity result.
- **Broader question remains open:** after a real prefix has exhausted optional-flipper approaches, could a *local* forced-order/finite-state residue be cheap and useful? That needs a genuinely specific user of the fact and a LIVE/DEAD label, rather than scaling this static theorem blindly. The existing PG-D/small-exact projection authorities own any future nomination.
- **Most useful method lesson:** include the mechanics that *break* an elegant algebraic fact (optional flippers and nonlocal portals) in the proof/test contract from the beginning, rather than retroactively patching false-dead bugs.

This is a **closed negative opportunity on two measured corpora**, not a negative claim about the general algebraic-decoding research program.
