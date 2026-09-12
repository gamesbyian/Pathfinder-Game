# Cross-hint provenance relations 001

> **Status:** active
> **Last evidence:** 2026-09-12 — post-merge `main` after PRs #1751 and #1753; current canonical provenance identity, September 11 evidence audit, and the class-5 freshness reconciliation.
> **Decision:** audit same-level reuse of one canonical discovery-event identity across distinct accepted paths before broader near-collision/path-distance work.
> **Remaining gate:** run the all-corpus evidence report, classify every exact collision by producer contract, then decide whether any surviving cases justify provenance-schema repair, bounded determinism replay, or second-stage near-collision analysis.

## Why this is distinct

`provenanceEventIdentity()` is the canonical persistence identity for one stored discovery event. The September 11 audit checked semantic duplicates **inside each hint**, while `mergeHints()` and `reconcileHints()` deduplicate provenance only after grouping by exact path. This left one relation unmeasured:

> one canonical provenance event identity -> two or more different accepted paths on the same level

That relation may be legitimate producer multiplicity, enumeration, inheritance/replay attribution, copied attribution, hidden nondeterminism, or an identity that is too coarse. The audit reports the relation without assuming the explanation.

The September 12 class-5 freshness reconciliation raised the priority: technique-census provenance retained `isolatedTechnique: true` but not source-cell identity, so T1-variant success could resemble bare-T1 success. Cross-hint relational analysis looks systematically for analogous under-resolution.

## Implemented first-stage audit

`scripts/stress/hint-provenance-relations.mjs` adds `auditCrossHintEventCollisions(levels)`. Per level it indexes provenance by canonical identity, records distinct path signatures, reports identities spanning multiple paths, stratifies by origin/facets, and emits bounded examples.

`scripts/stress/hint-provenance-evidence-report.mjs` now includes this result per corpus and in the combined total; report schema is 3. Existing `--fail-on-duplicates` semantics remain unchanged because a cross-hint collision is not automatically an integrity failure.

Regression tests distinguish:

- the same canonical event attached to distinct paths -> collision;
- repeated recording on one path -> not a cross-hint collision;
- genuinely different event identities -> separate.

Run:

```bash
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- \
  --corpus=all \
  --out=tmp/hint-provenance-evidence.json
```

Inspect `crossHintEventCollisionAudit` before interpretation.

## Interpretation ladder

1. **Known one-to-many producer semantics** — expected; document the contract if needed.
2. **Replay/inheritance attribution** — likely expected dependence; do not count as independent discovery.
3. **Producer identity too coarse** — add the smallest missing causal field. Census-cell identity is the current precedent.
4. **Same deterministic invocation, genuinely different outputs** — candidate hidden nondeterminism; replay only affected cases.
5. **Copied/propagated attribution without a legitimate producer contract** — persistence/provenance bug.

Only after exact collisions are explained should analysis widen to provenance-distance versus solution-distance. Useful later contrasts include seed-only changes, solver-revision changes, retry/census-cell changes, small provenance distance with large basin distance, and large provenance distance converging on one basin. Reuse existing solution-profile/basin machinery rather than creating a second taxonomy.

## Boundary

This work does not claim that a cross-hint collision is a determinism defect. The immediate question is: **what entity does a provenance event identity promise to identify for each producer, and does observed path multiplicity respect that contract?**

No broad solver campaign is warranted to answer it.
