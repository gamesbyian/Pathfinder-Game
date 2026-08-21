# Level properties and solver node cost

> **Status:** concluded-negative
> **Last evidence:** 2026-08-21 — technique census run `32240161854` and capability baseline run `32419836654`
> **Decision:** static level descriptors identify broad risk strata, especially portal and constraint load, but do not predict solution node cost reliably enough for production allocation
> **Remaining gate:** use censored/repeated matched runs and held-out family interventions before treating any descriptor as causal or routing on it

## Question and populations

This analysis asks whether properties visible in the level definition predict nodes expanded before a
successful cold solve. It joins Corpus 2's 1,700 level definitions to two recent sources:

- the most recent unflagged capability baseline, run `32419836654` at commit
  `a519dcc56baa09974545e3784523a342097cfce9` (863 successful levels); and
- the isolated-technique census, run `32240161854` (66,698 Corpus-2 T1 cells). For each of the 1,055
  levels with at least one isolated success, the response is the lowest successful T1 node count.

The response is `log10(nodesExpanded)`. Descriptors include grid area, required path length
(`reqLen`), required intersections (`reqInt`), navigable/path density, total object and constrained
object density, every top-level mechanic count, landmark-role counts, and landmark-type counts.
Associations below are Spearman rank correlations, so they describe monotone ordering rather than
assuming a linear raw-node relationship.

## Results

### The clearest recurring signal is constraint load, not grid size

Among the 863 production-baseline successes, constrained-object count has the largest observed
association with node cost (`rho = +0.233`). Must-turn count (`+0.202`), constraint density
(`+0.200`), overall object density (`+0.199`), landmark count (`+0.199`), and portal count (`+0.171`)
all point toward more nodes.

The census minimum-success view agrees on the broad direction. Portal count is strongest there
(`rho = +0.338`), followed by constrained-object count (`+0.312`), required length (`+0.243`), total
object count (`+0.235`), and must-turn count (`+0.232`). This cross-run agreement makes “more
interacting constraints, especially portals” a useful risk description, although none of these is a
strong individual predictor.

Overall object density is directionally consistent but weak (`+0.199` in the production successes,
`+0.101` in the census minima). Production median successful node counts rise from about 3.0M in
the lowest object-density quartile to 4.9M, 6.8M, and 7.2M in the successive quartiles. Constraint
density shows a similar coarse split: about 3.1M in the lowest quartile and 6.4M–7.3M in the upper
three.

### Win metrics and grid size do not rise cleanly with successful node count

Required path length is effectively unrelated to node count among the latest production successes
(`rho = +0.004`), while it is modestly positive in the census-minimum view (`+0.243`). Required
intersections actually run negative among production successes (`-0.149`) but positive in the census
minima (`+0.154`). Grid area is similarly inconsistent (`-0.029` production, `+0.193` census).

Those sign changes are important: there is no reliable claim here that larger grids, longer required
paths, or more required intersections monotonically cost more nodes. The likely explanation is
selection and search-policy interaction. A hard configuration can disappear from the
successful-only production sample entirely, while some high-intersection levels are strongly
constrained and therefore easier once the right technique reaches them.

Individual ordinary object types are weaker still. In the production successes, the largest
type-specific associations are fountain (`+0.177`), statue (`+0.161`), and lamppost (`+0.140`). The
landmark role is more informative than its artwork type: must-turn count reaches `+0.202`, compared
with surround `+0.103` and adjacent-turn `+0.071`. Must-cross count by itself is approximately null
there (`-0.012`), even though the combined constrained-object load is the strongest feature.

### Static descriptors predict difficulty strata better than exact node cost

The same static properties separate solved from unsolved levels more clearly than they estimate the
cost of a successful solve. Across all 1,700 baseline rows, solve outcome has rank associations of
`-0.413` with constrained-object count, `-0.355` with portals, `-0.324` with total objects, `-0.310`
with landmarks, and `-0.299` with constraint density. Required length is weaker (`-0.206`) and grid
area weaker again (`-0.107`). In plain language, constraint-heavy levels are much less likely to be
solved, but among the levels that are solved, their exact node total remains noisy.

A 10-fold level-held-out ridge check makes that limit concrete. A model using all static descriptors
explains only 14.7% of held-out variance in production successful log-node count, and 25.9% of the
census minimum-success variance. Single-feature models are much poorer: object density explains
4.1% and 3.6%, portal count 1.8% and 9.5%, and required length approximately 0% in both views.
Accordingly, these fields are useful for population stratification and hypothesis nomination, not
for dependable per-level node forecasts.

## Interpretation and limitations

This is observational, not causal. It deliberately excludes failed runs from the node-count response
because a budget-capped failure does not reveal its eventual solution cost. That creates right-censoring
and survivorship bias; the separate solve-outcome associations expose some of it. The census minimum
also means “best measured technique for this level,” not the behavior of one fixed search method.
Technique choice, attempt order, randomness, and score/prune interactions can dominate the static
features.

The strongest defensible conclusion is therefore:

1. portal load and combined constraint/landmark load repeatedly mark harder, costlier strata;
2. density has a real coarse association, but not a precise forecast;
3. no individual object type, grid size, required length, or required-intersection count reliably
   predicts solution nodes on its own; and
4. static level properties explain a minority of node-cost variation, so production routing should
   not be based on this exploratory fit without matched, level-blind validation.

The next decision-bearing analysis should model failures as censored observations, use repeated
deterministic runs or fixed isolated techniques, and test candidate interactions (especially portals
with must-turn/constraint density) on held-out parent families. That would distinguish genuine
structural cost from the current solver portfolio's routing and retention behavior.
