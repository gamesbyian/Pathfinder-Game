# Computational work elimination: multi-query divergence preflight 001

> **Status:** RETAINED-EVIDENCE PREFLIGHT; no new compute and no production behavior change.
> **Date:** 2026-09-21.
> **Parent:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Question:** how much expensive reasoning is shared by real Pathfinder query bundles before those queries materially diverge?

## 1. Why this preflight is needed

"Run related queries together" is only an architecture opportunity if their expensive reasoning overlaps under a sound reusable identity, equivalence, or implication contract.

Literal input similarity is insufficient.

This preflight therefore starts from real maintained workloads and asks what overlap can already be reconstructed from retained artifacts before adding instrumentation.

## 2. Real query bundles inspected

### A. Paired beam width 2K vs 5K

Existing tool:

`scripts/stress/compare-paired-beam-width-frontiers.mjs`

It runs two isolated beam searches per gate with the same scoring profile/checkpoint and compares **exact reconstructed path-prefix identity**.

Already retained:

- width-specific status;
- frontier size;
- nodes expanded;
- work spent;
- exact shared/left-only/right-only prefix identities;
- Jaccard overlap;
- bounded examples.

This is a valid **identity** baseline.

It does not retain:

- repeated lower-bound dependency keys;
- connectivity rejection/certificate identities;
- typed proof occurrences;
- shared exact local-query results;
- proof-equivalent residuals that arrive by different prefixes.

Disposition: useful first bundle for an enriched overlap probe because the paired execution and population contract already exist. Do not infer shared computation beyond exact prefix identity from current artifacts.

### B. Required-length sweeps

Existing authority:

`docs/solver-required-length-sweep.md`

The tool holds geometry, objects, reqInt, gates and goal fixed while varying exact reqLen and records solve/work/attempt telemetry.

This is a particularly clean **query-family** workload because:

- static topology/mechanics are shared;
- the requested challenge metric changes;
- prior batch-digestion audit already established that setup/prep reuse is economically tiny;
- search behavior can still diverge sharply because exact-length feasibility and remaining-length bounds change.

Current retained reports can compare:

- outcomes;
- work spent;
- nodes within techniques;
- winning techniques;
- attempt telemetry;
- feasibility/parity classifications.

They generally do **not** preserve reusable internal proof identities.

Disposition: do not build a shared reqLen search engine from structural similarity. If internal reason overlap is later observed, reqLen sweeps are a good controlled consumer population because the changed query dimension is explicit.

### C. Control vs treatment A/B

Representative maintained workflow:

`.github/workflows/solver-routing-regime-sample-ab.yml`

Its important architecture property is a single sealed sample/shard plan reused by both arms, with exact expected-ID population validation.

Current retained A/B evidence can reconstruct:

- matched parent identity;
- outcome;
- work;
- attempt/config telemetry depending on producer;
- gain/loss and coverage.

It cannot generally reconstruct:

- exact residual states visited in both arms;
- proof-level recurrence;
- lower-bound query overlap;
- connectivity/cut proof overlap.

Disposition: strong real-world paired workload for later proof-overlap measurement, but current artifacts are too coarse to estimate shared combinatorial reasoning honestly.

### D. Parent + controlled variants

Existing family infrastructure preserves parent/variant provenance and known transform/delta classes.

This gives a legal relationship contract for offline analysis but does not imply future-state equivalence.

The batch-digestion audit already showed broad family dependency invariance is heterogeneous and does not earn a generic incremental compiler.

Disposition: use only after a specific proof/query fact demonstrates recurrence across siblings. Family relation alone is not a cache key.

## 3. What current retained evidence can answer

| Bundle | Exact input/query relation | Current overlap observable | Can estimate shared expensive reasoning now? |
|---|---|---|---|
| beam 2K vs 5K | same level/gate/profile, different width | exact path-prefix frontier overlap | **partially**; prefix identity only |
| reqLen sweep | same board/mechanics, changed exact length | outcome/work/attempt response | **no** proof-level overlap |
| control/treatment A/B | same sealed parent population, changed policy/code/flags | outcome/work/attempt response | **no** proof-level overlap |
| family siblings | explicit provenance/delta relation | parent/variant relation and some constructive lineage | **no** search-proof overlap |

No honest historical percentage of reusable mathematical reasoning can be reported from these artifacts.

That absence is itself a useful result: a multi-query architecture should not be justified from input similarity or correlated outcomes.

## 4. Smallest opportunity-sizing extension

Do not invent a shared-computation runtime.

Instead, define one compact **reason-overlap projection** that can be attached to two isolated queries and compared offline.

The projection should contain only already-canonical or provably sound identities:

- exact lower-bound dependency key, where already owned;
- exact local/reference query key;
- exact residual fingerprint as an identity control, not future equivalence;
- exact/safe reason certificate identity where a producer has one;
- canonical typed reason family plus a proof-specific signature;
- exact beam path-prefix identity as existing baseline.

Guidance-only descriptors must be tagged and analyzed separately.

### Per query

Retain bounded counts rather than every search state where possible:

- total derivations by reason family;
- distinct proof signatures;
- repeated signatures within query;
- work span first-to-last occurrence;
- top bounded high-recurrence signatures;
- total `workSpent`.

### Pairwise comparison

For each proof family:

- signatures unique to left;
- unique to right;
- shared;
- left/right coverage;
- Jaccard as a descriptive overlap statistic;
- derivation occurrences represented by shared signatures;
- estimated derivation work associated with shared signatures.

This measures an **upper bound on potential shared reasoning**. It does not prove that a shared runtime can reuse the result economically.

## 5. First paired workload

Prefer the existing beam-width 2K/5K tool for the first enriched preflight because:

- it already executes paired isolated queries;
- exact prefix overlap gives a control surface;
- width divergence is known to be non-monotone in some cohorts;
- no workflow architecture is needed;
- the same frozen checkpoint can compare path identity against proof/reason identity.

Question:

> When exact frontier prefix overlap is low or moderate, do the two widths nevertheless spend substantial work deriving the same exact/safe conclusions?

This directly tests whether "reason reuse" provides a reusable unit smaller/different than the path prefix.

## 6. Second workload only if first is positive

If proof/reason overlap is substantial on paired widths, repeat the same compact projection on one real control/treatment A/B.

This asks whether shared reasoning survives an actual policy treatment rather than only a width parameter change.

Do not jump directly to family siblings or broad budget ladders unless one of these first two populations shows a reservoir.

## 7. Advance gate

A shared-computation experiment is earned only if:

- a sound proof/signature family has substantial overlap on multiple independent parents;
- overlap represents non-trivial derivation work, not cheap reason IDs;
- signature construction cost is below derivation cost;
- reuse semantics survive the query difference;
- a smallest producer/consumer handoff can be isolated.

Then build only that handoff.

## 8. Stop gate

Close general multi-query search sharing for the tested workload if:

- overlap is mostly exact prefixes already handled by the query itself;
- proof signatures diverge rapidly;
- shared signatures are cheap to derive;
- sound identity requires near-full residual serialization;
- work represented by shared signatures is negligible.

A negative on beam-width queries does not semantically close every query family, but it does block a generic shared-search architecture. Reopen only when a different real query bundle independently demonstrates repeated expensive exact reasoning.

## 9. Current disposition

No multi-query shared-computation implementation is earned from retained evidence.

The smallest new measurement, if the successor audit reaches runtime instrumentation, is an enrichment of the existing paired beam-width comparison with one or two selected exact/safe reason families. It should remain two isolated searches plus offline overlap accounting.

This preserves the scientific question without smuggling shared execution into the measurement.
