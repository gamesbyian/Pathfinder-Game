# Forced-work prevalence result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — frozen 64-parent current-residual census, GitHub Actions corrected rerun `35659746572` (artifact `10666891944`).
> **Decision:** the current solver spends a material share of canonical beam parent-expansion work at post-prune one-successor states; the prevalence gate is decisively positive. Do not implement chain contraction yet.
> **Remaining gate:** measure capture fraction and semantic safety: which portions of one-successor work are actually avoidable while preserving transition semantics, work accounting, solution recognition, mechanics, and observer behavior.
> **Evidence role:** discovery
> **Selection:** prespecified 64-parent sample frozen from the exact 531-level C2 residual before forced-work telemetry was inspected.
> **Population identity:** `data/stress/forced-work-prevalence-sample-2026-09-21.json`
> **Selection history:** current production-boundary residual, then stage-signature/work-rank stratified sampling; no forced-work outcomes used for selection.
> **Inference scope:** prevalence/oracle-ceiling sizing for current width-5000 objectiveFirst beam search on this residual sample; not expected production savings and not a DFS claim.

## Result

The preregistered headroom gate clears by a wide margin.

Across 64 independent residual parents:

- 19,260,501 retained beam parents were expanded;
- 7,617,557 had exactly one candidate survive ordinary hard pruning;
- one-successor parents were **39.55%** of expanded parents;
- total measured parent-expansion canonical work was 90,572,067;
- one-successor parents consumed 22,944,663 work units, **25.33%** of the measured parent-expansion work.

The parent-level distribution is broad rather than driven by one outlier:

- minimum: **11.68%**;
- median: **24.81%**;
- mean: **25.14%**;
- 90th percentile: **33.69%**;
- maximum: **46.65%**;
- all 64/64 parents exceed the preregistered 5% headroom-positive threshold;
- 47/64 exceed 20%.

Coverage is clean: 63 runs exhausted and one stopped at the existing work-budget phase boundary; none hit the wall deadline.

Machine summary: [`reports/stress/forced-work-prevalence-census-summary-2026-09-21.json`](stress/forced-work-prevalence-census-summary-2026-09-21.json).

## Chain shape

The initial successful census used a generated-stage diagnostic path list to reconstruct unique-child identity. That list includes candidates later removed by hard pruning, so its prevalence/work totals were valid but its chain anatomy was not. Corrected rerun `35659746572` reconstructs child identity after hard pruning.

The corrected reducer observes **4,932,517** chain starts. Across parent runs, median chain length is usually 1 or 2 and p90 is usually 2 or 3; the maximum observed consecutive one-successor length is **19**, with maximum measured chain work **196**.

Corrected termination counts:

- branch: **2,363,307**;
- forced child not retained: **1,700,586**;
- dead end: **868,624**.

This strengthens the qualitative conclusion: the reservoir is dominated by extremely common short forced segments rather than a few spectacular corridors. The cheapest consumer may therefore target ordinary one-successor transitions or short runs, not only long-chain compression.

## What the result means

The original question was deliberately an oracle-ceiling test:

> If recognition/contraction were perfect and free, how much current measured parent-expansion work could disappear?

For this population the answer is at most **25.33%** of the measured parent-expansion work.

That is large enough to justify the next investigation.

It is **not** a claim that 25.33% of whole-solve work is removable. The denominator excludes work outside the measured parent-expansion seam, and a real consumer must still execute any semantics required to advance the state safely.

## Next gate: capture fraction, not implementation

The next investigation should decompose one-successor expansion work into:

1. work that must still execute to advance the canonical state correctly;
2. work incurred only because the ordinary branching/search machinery treats the step as a decision;
3. work that can be amortized across a certified forced run;
4. score/sort/retention bookkeeping that disappears when no choice exists;
5. mechanics or observer semantics that force ordinary processing despite one surviving successor.

The decisive quantity is:

> Of the 25.33% oracle ceiling, what fraction is plausibly removable by a sound bounded mechanism?

A first capture-fraction study should remain production-inert. Instrument representative one-successor expansions and compare the work decomposition against branching controls. Only after a material removable numerator exists should a forced-future consumer be implemented.

## Safety questions

Before any behavior-changing consumer:

- prove that chaining preserves all state-transition semantics, including portals, filters/flippers, geese, false goals, must-pass/must-cross, turns/surround constraints, intersections, and exact length;
- preserve solution recognition at intermediate forced states;
- preserve canonical work accounting or explicitly redefine the comparison metric;
- preserve research observer semantics or document intentional changes;
- verify that a candidate being the sole survivor after current hard pruning is sufficient for the proposed contraction seam;
- separately assess DFS/general-search applicability rather than transporting the beam result.

## Disposition

The historical forced-chain positive is now relevant again, but only as motivation. Current evidence independently establishes a large present-day reservoir.

The premise therefore advances from **prevalence unresolved** to **headroom positive / capture fraction unresolved**.

No production feature is earned yet.
