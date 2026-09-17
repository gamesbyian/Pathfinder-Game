# Separator / decomposition census preflight

> **Status:** EXECUTED / BOUNDED POSITIVE. See [`result`](../reports/2026-09-17-separator-decomposition-census-result-001.md).
> **Question:** does the current Class-5 residual contain enough low-width structural separation, including path-history-conditioned separation, to justify a decomposition or interface-contract solver descendant?
> **Result summary:** families 1/2 (static, mechanic-aware) are a bounded positive — 121/390 (31.0%) Class-5 residual levels have a non-trivial, board-balanced (>=10% each side), width<=4 interface (54 also mechanic-aware). Family 4 (portal-mediated) is a clean negative (0.06% of interfaces, despite 69% portal-bearing levels). Family 3 (path-history-conditioned) was not computed — it needs a frozen legal prefix population, deferred to the fresh exact LIVE/DEAD sibling harvest. The interface contract-size question (does representing crossing state avoid recreating full path history?) is untested and gates any further descendant.
> **Queue position:** WS2 premise-acquisition; its earned next descendant (local exact residual query — does the smaller side's local infeasibility predict exact-DEAD?) is deferred onto the fresh exact sibling harvest's population rather than a separate campaign.
> **Evidence role:** census / premise falsifier. No solver treatment is authorized by this document.

## Why this is now the next cheap gate

The current post-topology hypothesis ladder is exhausted. The controlled topology fork established that path history can change completion feasibility while matched ordinary mechanic-progress state remains fixed, but the later H1/H3/H2 and naive behavioral-quotient probes did not produce a reusable production descriptor. A decomposition census is therefore the smallest remaining test of whether the residual contains exploitable low-width interfaces rather than requiring another global forward-prefix heuristic.

This is deliberately a census before architecture. Do not implement region DP, AND/OR search, separator contracts, backward interfaces, or topology-aware decomposition until the phenomenon exists at useful prevalence.

## Frozen population

Use the current production boundary recorded in `docs/solver-optimization-workstreams.md`, with the **current Class-5 residual** as the primary population. Record the exact production run / commit and the exact row list before computing decomposition features.

A secondary comparison sample may include current solved rows matched coarsely on board size and mechanic mix, but it must be reported separately. The Class-5 residual remains the decision-bearing population.

Do not select rows using known solution geometry, exact labels, historical capability-memory membership, or whether a proposed separator looks promising.

## Candidate separator families

Measure at least these generic current-input families, keeping them distinct:

1. **Static board separators:** articulation cells, narrow vertex cuts, narrow edge cuts, obstacle-defined necks, and small interfaces between large free-space regions.
2. **Mechanic-aware separators:** small interfaces whose crossing changes or constrains filter/flipper/portal or required-object state.
3. **Path-history-conditioned separators:** interfaces created or tightened by the current prefix occupancy, including enclosure/walling effects and separator-side commitments. These require a frozen legal prefix population and must not be inferred from accepted solution paths alone.
4. **Portal-mediated interfaces:** regions connected materially through portal transitions rather than only local grid adjacency. Keep these separate from ordinary geometric cuts.

Do not collapse all four into one scalar “decomposable” flag.

## Measurements

For each level, and for prefix-conditioned rows when applicable, report:

- smallest useful separator/interface width under each family;
- number and size distribution of induced regions;
- balance of the split, so a one-cell cut isolating a trivial pocket is not treated as useful decomposition;
- mechanic obligations and mutable state crossing each interface;
- whether portal/filter/flipper state makes the interface contract history-sensitive;
- count of distinct entry/exit cells and directions required by the interface;
- whether exact length / intersection accounting can be summarized additively or requires broad cross-region coupling;
- construction cost of the separator analysis itself.

Where a stored referee-valid witness exists, an **auxiliary descriptive view** may record how many times that witness crosses candidate interfaces and how many distinct interface states it realizes. This is not a prevalence or soundness oracle and must be ancestry-scoped as accepted-path evidence.

## Primary advancement bar

The decomposition premise advances only if the census finds a non-trivial recurring population in which all of the following hold:

- an interface is small enough to admit a bounded contract state;
- both sides contain material remaining search space rather than a trivial pocket;
- the mechanic state crossing the interface can be represented without recreating essentially the full path history;
- exact length/intersection obligations do not force an interface state so large that decomposition loses its compression advantage;
- the pattern occurs on enough independent Class-5 rows to justify a bounded prototype.

Do not choose a universal numeric width threshold in advance merely for convenience. Report the empirical width/contract-size distribution and identify the smallest coherent subpopulation that could support a bounded prototype.

## Negative and mixed outcomes

- **Coverage-null:** useful separators are rare or mostly isolate trivial pockets. Deprioritize separator architecture.
- **Contract-explosive:** geometric cuts exist but the necessary mechanic/path-history/interface state is effectively global. Record this as a decomposition negative, not a geometry negative.
- **Topology-only positive:** static cuts are weak but prefix-conditioned cuts or separator-side commitments recur. Route the successor through the topology microscope rather than static preprocessing.
- **Portal-specialized positive:** only portal-bearing rows show compact interfaces. Nominate a portal-specific descendant; do not generalize to all Class 5.

## If the premise advances

Build exactly one smallest bounded descendant first. Candidate descendants, in preferred order, are:

1. a sound interface-feasibility prune on one earned subpopulation;
2. a local exact residual query on one side of a compact interface;
3. a region-contract DP / AND-OR composition prototype;
4. backward completion contracts or a per-level compiled decomposition plan.

The prototype must compare end-to-end solve/work value against the same production boundary. A successful census alone does not authorize production routing.

## Guardrails

- Current-input structural analysis is level-blind legal; historical identities, stored winners and exact labels are not runtime routing inputs.
- Known solution paths may describe sampled crossing complexity but may not define the separator population.
- Parent/family multiplicity does not create independent evidence where generated descendants share ancestry.
- Preserve portal-mediated and purely geometric interfaces separately.
- Stop at census if the useful subpopulation is too small or contracts are too large.
