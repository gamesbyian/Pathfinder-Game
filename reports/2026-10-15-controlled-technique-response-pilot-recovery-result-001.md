# Controlled technique-response pilot recovery result (2026-10-15)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-15 — recovered the complete 715-cell matrix from GitHub Actions run 37712397687, repaired the failed post-processing identity join offline, and verified all 36 retained family inputs byte-for-byte against pinned dataset commit `32132d6ba60f1203ee013ed0d475f46061eddd49`.
> **Decision:** PG-G's first bounded discovery pilot is scientifically usable and positive: controlled perturbations do change technique-specific solve state and work, with whole-level symmetry exposing especially clean orientation/search-order sensitivity.
> **Remaining gate:** inspect a small preregistered set of symmetry and local-mutation cliffs with the existing pair-divergence microscope, then confirm any generalized mechanism on untouched whole-parent families.
> **Evidence role:** discovery.
> **Owner:** `docs/solver-optimization-workstreams.md`.

## Recovery

PR #2146's one-shot pilot did run on 2026-10-08. Its plan/canary job succeeded, all 12 solve shards succeeded, and the combine job alone failed.

The failure was post-processing, not solver execution. The sealed plan expected cell identities such as `FTR1::family-P00146-w0-local-mutant::parent::t01`. The generic integrity validator selected each raw row's `levelId` before its `cellId`, so it compared cell IDs against level IDs and reported the complete population as missing/unexpected. The later maintained workflow from #2147 avoids this by projecting `cellId` into the standard row identity.

The failed combine still uploaded all useful evidence:

- source run: `37712397687`;
- execution SHA reported by the standard publisher: `76455450f06f03139b415bc0f699d2c54530784a`;
- 12/12 shard artifacts present and successful;
- `controlled-technique-response-analysis` artifact id `11523005793`, uploaded ZIP SHA-256 `4a8c6a6c048bb1c214d609c32ef0d5006981fdd0c4e4337dbc015872f33ea28e`;
- `solver-sweep-result` artifact id `11522885927`, uploaded ZIP SHA-256 `40c72c68daaf2bb5dbe6c814908221d80e35e1957a5520268886de7fdffad6cd`;
- the recovered analysis artifact contains the full `combined-cells.json` with 715 rows.

The one-shot workflow checked out its historical family dataset by branch name, not immutable SHA. That provenance gap is recoverable: the plan-input artifact preserved exactly the 36 selected family corpora/manifests, and every preserved Git blob SHA matches the corresponding file at the later pinned dataset commit `32132d6ba60f1203ee013ed0d475f46061eddd49`. The sealed manifests also report all 18 current-parent content identities verified.

## Population and validity

The frozen plan contains:

| unit | count |
|---|---:|
| independent parents | 6 |
| family-mode blocks | 18 |
| parent→variant edges | 125 |
| isolated techniques | 5 |
| planned cells | 715 |
| observed unique cells | 715 |

Observed cell outcomes:

| outcome | cells |
|---|---:|
| referee-valid solve | 548 |
| work-budget reached | 145 |
| exhausted | 22 |
| deadline-truncated | 0 |
| referee-invalid | 0 |
| harness error | 0 |

Every planned `cellId` occurs exactly once and there are no extras. The same parent × technique was re-observed in local-mutant, swap and symmetry blocks; all repeated parent outcomes, work and node counts agree exactly. That gives a useful internal determinism check in addition to exact plan coverage.

## Important metric correction

The original analyzer's `solveResponseHeterogeneous` is a broad screening statistic. It is true whenever techniques have different parent→variant transition labels. That includes edges where one technique is unsolved on both parent and variant (`neither`) while another solves both, even though the mutation changed neither technique's solve state.

That distinction matters here:

- **108 / 125** edges are transition-heterogeneous;
- only **39 / 125** edges contain at least one actual parent→variant **solve-state flip**;
- those 39 edges contain **26 gain cells and 26 loss cells**.

The analyzer is therefore being hardened alongside this report with a separate `solveStateFlip` edge field and `edgesWithSolveStateFlip` / `edgesWithBaselineOnlyHeterogeneity` summaries. Broad heterogeneity remains useful for screening; gain/loss is the stricter mutation-response evidence.

## Solve-state flips

By transformation family:

| transformation | edges | edges with a flip | gain cells | loss cells |
|---|---:|---:|---:|---:|
| local one-object move | 42 | 19 | 13 | 14 |
| pair swap | 41 | 4 | 1 | 3 |
| whole-level symmetry | 42 | 16 | 12 | 9 |

By independent parent:

| parent | edges | flip edges |
|---|---:|---:|
| P00136 | 20 | 0 |
| P00144 | 21 | 4 |
| P00146 | 21 | 13 |
| R00631 | 21 | 7 |
| R00792 | 21 | 4 |
| R02976 | 21 | 11 |

The six-parent cohort was deliberately selected-on and repair-response-enriched. These rates are mechanism-discovery frequencies, not prevalence estimates.

Technique-direction counts are also selection-conditioned because a technique cannot gain on a parent it already solves or lose on a parent it already fails:

| technique | gains | losses |
|---|---:|---:|
| repair | 0 | 9 |
| objective-first 5k beam | 0 | 1 |
| intersection-harvest 5k beam | 3 | 0 |
| default DFS | 12 | 0 |
| admissible-order, no tie-break | 11 | 16 |

## Cleanest finding: symmetry sensitivity

The symmetry families are the strongest causal instrument in this pilot. Their rotation/reflection transforms preserve puzzle semantics and carry transformed witnesses, while the technique, work envelope and parent ancestry remain fixed. A solve-state change on a symmetry sibling therefore points directly at search representation/order sensitivity rather than a genuinely different puzzle obligation.

Sixteen of 42 symmetry edges flip at least one technique's solve state.

Notable replicated patterns:

- **P00146:** DFS fails on the parent but solves six of seven symmetry siblings; admissible-order solves the parent but loses six of seven. Several rotations/reflections therefore reverse the relative value of these two techniques on a semantically equivalent puzzle.
- **R02976:** admissible-order fails on the parent but solves symmetry variants 1, 2, 5 and 7.
- **R00631:** repair loses on symmetry variants 2 and 4.
- **R00792:** DFS gains on symmetry variants 1 and 6; repair loses on variant 3.
- **P00144:** no symmetry solve-state flips, but large work cliffs remain.

The two 5k beams are notably symmetry-stable in solve state on this cohort. Among symmetry edges where parent and variant both solve, neither beam has a 2× work-severity crossing; by contrast repair has 26/39 both-solved symmetry cells at ≥2× work severity, 16 at ≥4× and 9 at ≥10×. Admissible-order has 19/22 at ≥2×, 9 at ≥4× and 9 at ≥10×.

That makes **coordinate/search-order sensitivity** the best-earned premise from this pilot. It is technique-specific rather than generic level difficulty.

## Local mutations

Local one-object moves produce 19/42 flip edges. The small samples break down as:

| moved object | edges | flip edges |
|---|---:|---:|
| blocks | 20 | 12 |
| flipping filters | 5 | 3 |
| geese | 8 | 3 |
| must-pass | 5 | 1 |
| decorative park | 2 | 0 |
| lamppost | 1 | 0 |
| statue | 1 | 0 |

The counts are too selected and small for prevalence claims, but several edges are excellent microscopes because different techniques flip in opposite directions on the same tiny edit.

## Preregistered microscope shortlist

The next step should not be another bulk run. Use the existing pair-divergence microscope on a small frozen shortlist:

1. **P00146 → F00146-sym-01**: DFS gain + admissible loss under a rotation. This is the cleanest opposite-sign symmetry edge.
2. **P00146 → F00146-sym-05**: DFS gain + admissible loss under a reflection, providing a second transform class on the same parent.
3. **R02976 → F02976-sym-01**: admissible gain under rotation on a different parent.
4. **R00631 → F00631-sym-02**: repair loss under rotation on a different parent/technique.
5. **P00144 → F00144-sym-02**: all five techniques still solve, but repair work falls by about 69.8×; a pure work-cliff control.
6. **P00146 → F00146-lm-02**: one goose relocation yields intersection-beam + DFS gains while admissible loses.
7. **P00146 → F00146-lm-03**: one block relocation yields an objective-beam loss and intersection-beam gain.
8. **R00631 → F00631-lm-04**: one flipping-filter relocation/axis change loses repair while admissible remains solved with roughly a 1,021× work increase.

For the symmetry cases, the microscope question should be explicit: identify the first non-equivariant choice or score/tie-break divergence after mapping coordinates through the known symmetry. Do not merely compare final work.

For local mutations, ask which structural/ordering observable changes before the techniques separate. Do not infer a general object-class rule from one selected parent.

## Candidate premises

The pilot earns premise candidates, not treatments:

1. **D4-equivalent board orientations are not compute-equivalent for several search families.** The strongest suspects are coordinate-dependent successor ordering, tie-breaks, or non-equivariant scoring/retention details.
2. **Technique sensitivity is sharply different.** The tested beams are much more symmetry-stable than repair, DFS and admissible-order under the same equal-work protocol.
3. **Tiny local edits can reverse relative technique value rather than merely make every technique easier/harder.** P00146 supplies multiple opposite-sign examples.
4. **Work cliffs are a distinct response channel from solve-state flips.** Some transformations change work by one to three orders of magnitude while preserving solved state.

The smallest plausible consumer, if the microscope confirms an arbitrary orientation/order mechanism, is a local symmetry/order normalization or orientation-aware tie-break experiment. A multi-orientation portfolio is not earned yet because it spends extra work and the pilot has not established a cheap selector.

## Next gate

1. Run the eight microscopes above, or a smaller subset if the first cases identify one common non-equivariant mechanism.
2. Convert any repeated mechanism into an explicit premise and smallest consumer.
3. Before treatment promotion, confirm on untouched whole-parent families. Symmetry is especially attractive for confirmation because it supplies paired semantically equivalent descendants without inventing new puzzle obligations.
4. Keep solve-state flips and work-only cliffs as separate claims.
5. Do not rerun the 715-cell pilot solely to repair the failed combine badge; its solver evidence is complete and recoverable.

The original selected-on pilot has done its job: it found real interaction structure and, more specifically, a clean orientation-sensitivity seam worth mechanistic investigation.
