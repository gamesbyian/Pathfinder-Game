# Algebraic-incidence decoding: first structural census (2026-10-12)

> **Status:** active
> **Last evidence:** 2026-10-12 — static 160-level portal-free graph-parity census at main `3cdbb1fc169827b1efb411e190fd7c76096bf02d`
> **Decision:** Incidence-only decoding is mathematically sound as a necessary-condition relaxation but is **not a new earned prune or solving method**. Most eligible boards retain substantial cycle freedom; investigate joint resource constraints only after a novelty witness against existing pruning.
> **Remaining gate:** validate the committed preflight CLI/tests under the full repo environment; then exhibit one coupled-resource contradiction on a tiny supported instance which current parity/connectivity/BC1 and existing separator/joint-obligation probes cannot derive, or close that exact form.
> **Research question:** none
> **Premise refs:** none
> **Measurement opportunity:** none
> **Evidence role:** discovery
> **Selection:** observational, all currently published raw levels in canonical order
> **Population identity:** `data/levels.json` at main `3cdbb1fc169827b1efb411e190fd7c76096bf02d`, 160 records
> **Selection history:** published corpus, not randomly sampled, not a holdout; no outcome-dependent filtering before selection; support exclusions then determined by portal presence
> **Inference scope:** graph structure of these published boards under the explicitly stated portal-free relaxation; no statement about exact solves, winner path multiplicity, cold solver gain or unseen-level prevalence

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"active","lastEvidenceDate":"2026-10-12","decision":"Incidence-only parity has no demonstrated incremental solve/prune value; continue a narrow coupled-resource novelty preflight","remainingGate":"Full-checkout CLI/test validation followed by one tiny current-gauntlet-nonredundant coupled-resource witness or negative closure","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"data/levels.json at main 3cdbb1fc169827b1efb411e190fd7c76096bf02d, 160 records","selection":"all published levels in source order, portal-free filtered after inspection","inferenceScope":"structural relaxation only; no solver capability or exact solution counts"},"claimRefs":[],"sourceArtifacts":["data/levels.json","scripts/stress/path-parity-decode-preflight.mjs"],"successors":{"questions":[],"artifacts":["docs/solver-algebraic-decoding-research-plan.md"]},"prospective":{"expectation":null,"surprise":null,"anomaly":null}} -->

## Scientific question and relevant existing machinery

Can the unknown path be decoded from `B x = e_gate + e_goal (mod 2)` plus other level constraints, rather than constructing candidate paths? This report measures **only the binary vertex-edge incidence relaxation**. It does not assert that Pathfinder levels encode secret ciphertext. The broader research program and discriminating gates are in [the research plan](../docs/solver-algebraic-decoding-research-plan.md).

This algebra alone fixes edge-traversal parity only for graph bridges. Every nonbridge edge lies on a cycle and is underdetermined under incidence equations alone. Zero even-parity is **not** zero traversals; a branch can be crossed out and back. Gate-to-goal checkerboard length parity in a portal-free grid is likewise not a newly discovered constraint: it follows from the incidence equations and already has production analogues. See [current solver architecture](../docs/solver-architecture.md), [small exact projections](../docs/solver-small-exact-projections-program.md) and [capability atlas](../docs/solver-reasoning-capability-atlas.md).

## Reproducible method

1. Read `data/levels.json` on the fixed main ref.
2. For each level with **no portals**, construct the orthogonal unweighted graph from all nonblocked grid cells; exclude blocks, geese, false goals and impassable landmark roles. Filters, flippers, intersections, mandatory landmarks, gate-reentry rules, dynamic axes and exact win constraints are **ignored** (relaxed), so no graph walk is asserted to be a legal Pathfinder route. Portal levels are marked `unsupported` rather than silently dropping nonlocal transitions.
3. For each connected component, compute graph incidence rank `|V|-components` and independent cycle dimension `|E|-|V|+components`.
4. For each edge, delete it and test alternate connectivity; bridges are the edges with no alternate route. For each selectable gate connected to the goal, a bridge parity is odd iff deleting it separates gate and goal, even otherwise. Separately label ordinary Manhattan/length parity for this portal-free model. No other candidate path constraints are added.
5. Summarize counts over all published levels. Analysis used an independent in-connection implementation equivalent to the committed plain-Node preflight, **not** a full-repo execution of the committed CLI; the next verification gate explicitly includes full-checkout invocation and local finish-line checks. Tiny equivalents of the source tests were executed under Node 22; this is not a GitHub Actions or build-pass assertion.

Plain-Node invocation from a full checkout:

```bash
node scripts/stress/path-parity-decode-preflight-node-test.mjs
node scripts/stress/path-parity-decode-preflight.mjs --corpus=data/levels.json --limit=160 > /tmp/pathfinder-algebraic-incidence-160.json
npm run plan:quality -- --plan=docs/solver-algebraic-decoding-research-plan.md
```

The preflight emits explicit `relaxation-only` versus `unsupported` rows, per-gate bridge-parity sets, component/rank/nullity, and ignored-mechanic list. It emits **no canonical solve verdict, exact solution count, or claimed unique prune**.

## Observed counts

| Metric | Raw count / statistic | Interpretation |
|---|---:|---|
| Published levels | 160 | fixed main population |
| Portal-free / projection-supported | 93 | graph necessary-condition model only |
| Excluded by portal transitions | 67 | unsupported, not UNSAT or failed |
| Supported with no ignored optional restrictions | 14 | still a graph relaxation of path-history legality |
| Supported with additional restrictions relaxed away | 79 | cannot infer exact full-game consequences |
| Median incidence rank | 80 | rank over GF(2), not number of move decisions |
| Median cycle/nullspace dimension | **56** | algebraic degrees of freedom, **not** number of legal paths |
| Minimum–maximum cycle dimension | 9–161 | none had zero underdetermination |
| Supported levels with any bridge | **21 / 93** | bridge may be forced odd or even |
| Supported levels with any gate-to-goal odd bridge | **10 / 93** | at least one gate requires odd traversal across a bridge |
| Median bridge count | 0 | typical supported boards show no bridge fixings |
| Supported levels with no connected gate | 0 | all had a gate with a graph route to goal |
| Supported levels with no length-parity-compatible gate | 0 | basic parity rejects no published portal-free level by itself |
| Invalid model inputs | 0 | within the observed census |

Examples: `P00052` has one bridge and its two gates differ (one requires the bridge odd, the other does not); `P00057` has two bridges and the single gate requires both odd; `P00073` has three bridges, two odd for the gate. These are **graph necessary conditions**, not verified production improvements.

## Soundness and counterexample details

A four-step walk `(1,1)->(2,1)->(2,2)->(2,1)->(3,1)` on a 3x2 graph with both bottom corners blocked traverses the pendant bridge `(2,1)-(2,2)` twice. Its parity is even although the edge is used. The two gate-to-goal trunk bridges are odd. On a 2x2 square, the cycle dimension is 1 and no edge is parity-fixed by incidence alone. Test fixtures also exercise alternative disconnected gates, unsupported portal transitions, ignored filter/must-cross restrictions, nonedges and exhaustive small graph walks.

This confirms the *mathematical encoding* on the tested relaxation; no new state-pruning theorem has been established. Further proof must explicitly handle portal jumps, visited axes, no-reentry gates, and intersection budgets if it intends to reject real solver states.

## Interpretation and next gate

The median 56-dimensional cycle space establishes significant **algebraic underdetermination**. It neither proves a board has many actual solutions nor proves exact decoding unpromising. It suggests that a useful decoder needs **coupled** constraints: exact length/intersection and axis resources, obligation-to-support matching, finite-state mechanics, or regional cut capacity.

Priority remains with the existing BC1-VX production A/B and PG-G pilot. This work cannot claim a new active treatment lane. Next, use retained exact/reference and the `separator-resource`/`joint-obligation-mc-portal` probes to find a tiny case where a *coupled* invariant rejects a LIVE/DEAD candidate missed by the current gauntlet, or close that exact proposal as redundant. Do not buy a bulk census or write another generic solver/harness without that witness.

**Current limitations:** Published rather than independent-random level population; pure static graph, no legal-route reconstruction, no direct existing-prune overlap measurement, no canonical work or wall-time economics, and the committed CLI has not yet been validated in a full checkout. All counts refer to structural *relaxations*, not to gameplay correctness or observed solver gains.
