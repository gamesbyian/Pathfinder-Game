# Solver archaeology: intersection-commitment lineage

Status: historical-evidence follow-up. This report separates the future-crossing premise from several bundled implementations and does not recommend restoring old production mechanisms.

## First forced-crossing bundle

April's first intersection-first implementation combined two materially different ideas:

1. a hard `interactionDeficit + goalDist > rSteps` prune;
2. synthetic must-cross anchor attempts that forced one unconstrained self-intersection to occur at a selected cell.

The hard prune was not actually sound: its own source comment admitted false positives when an intersection can be made on the route to the goal. The forced-crossing mechanism was therefore bundled with an invalid inference. The whole change was reverted shortly after merge. That revert cannot be treated as a clean verdict on future-crossing commitments.

## Multi-anchor IOG successor

A second implementation replaced the crude anchor set with an Intersection Opportunity Graph-like construction:

- filtered candidate crossing cells;
- single-anchor probes;
- pair probes ranked by geometric spread;
- one triplet probe for larger free-intersection demand;
- multi-anchor synthetic must-cross injection;
- a plan supervisor recording probe status/progress and the best anchor set.

This version also changed the intersection lower bound, so it was still not a pure premise test. It too was reverted. Commit history preserves the mechanism and revert but no clean isolated outcome showing that candidate crossing commitments themselves lacked value.

## Blueprint-planning descendant

The core premise then reappeared under different vocabulary as **intersection blueprint planning**. Instead of ad hoc IOG probes, the solver selected candidate crossing cells from ranked knot zones, generated blueprint permutations, augmented a temporary level with those cells as virtual must-cross commitments, rebuilt the must-cross-derived structures, and ran ordinary policy search on each blueprint.

This is a direct conceptual descendant of the IOG premise: choose future free-intersection commitments first, then search under them.

However, the execution history shows that this mechanism was not cleanly tested:

- `enableBlueprintPlanning` was extracted by solve preparation but omitted from the downstream solve-context flags, leaving blueprint planning silently disabled.
- On 2026-04-29 a broader propagation fix restored four missing fields at once, including `enableBlueprintPlanning`.
- Once actually enabled, blueprint planning added full `runBaselinePolicySweep` calls for levels with blueprint variants and contributed to a 30-minute audit timeout.
- The immediate mitigation explicitly removed blueprint propagation again, restoring the previously-disabled behavior rather than producing a matched effectiveness test.
- A later emergency revert reset the entire troubled stack to the last green audit baseline.
- By 2026-05-30 the remaining `enableBlueprintPlanning` field was deleted as dead residue from a blueprint system already removed.

### Archaeological verdict

The old production formulations are dead and should not be restored. But the premise **"states with equal intersection deficit can differ in which future crossing commitments remain realizable"** has not received a clean observer-only falsification.

The historical evidence is instead dominated by:

- an unsound bound bundled with the first probe;
- large extra-search cost in the blueprint implementation;
- silent non-participation caused by missing flag transport;
- multi-change audit timeouts and emergency rollback.

This is exactly the class of history where `implementation/formulation falsified` must not be promoted to `premise falsified`.

## Modern smallest question

Do not synthesize must-cross constraints or run extra blueprint ladders.

Use current exact-labelled LIVE/DEAD sibling states and ask whether a small offline representation of future crossing possibilities separates them. Candidate observations could include:

- whether any future self-crossing remains realizable in a coarse region/interface;
- which residual corridors can still support a second traversal;
- whether multiple required free intersections can still be assigned compatibly to distinct/compatible structural regions;
- whether the known-live sibling preserves a crossing-plan class absent from the preferred dead sibling.

This should be evaluated against committed exact-labelled states/reference-model queries first. Only if a recurring differential exists should a cheap runtime approximation or retention/commitment mechanism be considered.