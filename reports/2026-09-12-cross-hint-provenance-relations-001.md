# Cross-hint provenance relations 001

> **Status:** active / tooling landed; corpus execution pending
> **Last evidence:** 2026-09-12 — post-merge `main` after PRs #1751 and #1753; current canonical provenance identity, September 11 evidence audit, and the class-5 freshness reconciliation.
> **Decision:** add a same-level cross-hint provenance relation audit before broader near-collision/path-distance work. The existing semantic duplicate audit is intra-hint only and therefore cannot detect one canonical event identity attached to multiple distinct accepted paths.
> **Next gate:** run the upgraded all-corpus evidence report, classify every cross-hint collision by producer contract, then decide whether any surviving cases justify provenance-schema repair, determinism replay, or a second-stage near-collision analysis.

## Why this is distinct from the existing duplicate audit

`provenanceEventIdentity()` is the canonical persistence identity for one stored discovery event. It deliberately ignores recording/host timing noise while retaining solver version, technique/configuration, forcing, seed, deterministic work/search result, termination, and context.

The September 11 audit checked semantic duplicates **inside each hint**. `mergeHints()` and `reconcileHints()` likewise deduplicate provenance only after grouping by exact path. Therefore this relation remained unmeasured:

> one canonical provenance event identity -> two or more different accepted paths on the same level

That relation may be legitimate. A producer can have one-to-many semantics, enumeration can emit several solutions, or inherited/replayed attribution can intentionally span paths. It can also expose copied attribution, hidden nondeterminism, or an event identity that is too coarse for its claimed semantics. The audit reports the relation without presuming which explanation applies.

## Why the September 12 class-5 work raises the priority

The class-5 freshness reconciliation found a concrete provenance-resolution failure: successful technique-census cells were recorded with `isolatedTechnique: true` but without source-cell identity. Reconstructing the original census showed the suspicious same-revision cases were T1-variant successes rather than base-T1 successes. The evidence was real, but its stored provenance lacked a causal dimension needed for the research question.

Cross-hint relational analysis is a systematic way to find analogous under-resolution. Rather than inspecting one field after a surprising result, it asks whether the relationship between provenance identity and path identity behaves as producer semantics predict.

## Implemented first-stage audit

`scripts/stress/hint-provenance-relations.mjs` adds `auditCrossHintEventCollisions(levels)`.

For each level it:

1. indexes every stored provenance entry by canonical `provenanceEventIdentity`;
2. records the distinct accepted path signatures carrying that identity;
3. reports identities spanning more than one path;
4. stratifies collision identities by provenance origin and overlapping facets;
5. emits a bounded set of examples with level, version, technique, facets and the involved paths.

`scripts/stress/hint-provenance-evidence-report.mjs` now includes this result per corpus and in the combined total. Report schema is bumped from 2 to 3. Existing `--fail-on-duplicates` semantics remain unchanged because cross-hint collisions are not automatically integrity failures.

Regression tests cover the semantic boundary:

- timing/bookkeeping differences that canonicalize to one event identity **do** produce a cross-hint collision when attached to distinct paths;
- repeated recording on one path is **not** a cross-hint collision;
- genuinely different canonical event identities remain separate.

Run:

```bash
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- \
  --corpus=all \
  --out=tmp/hint-provenance-evidence.json
```

Inspect `crossHintEventCollisionAudit` before interpreting the cases.

## Interpretation ladder

Classify exact collisions before inventing a new experiment:

1. **Known one-to-many producer semantics** — expected; document the contract if it is not already explicit.
2. **Replay/inheritance attribution semantics** — likely expected dependence; do not mistake for independent discovery.
3. **Producer identity too coarse** — add the smallest missing causal field at the producer boundary. The census-cell omission is the current precedent.
4. **Same deterministic invocation, genuinely different outputs** — candidate hidden nondeterminism; replay only the bounded affected cases.
5. **Copied or propagated discovery attribution without a legitimate producer contract** — persistence/provenance bug.

Only after exact collisions are explained should the analysis widen to near-collisions.

## Second-stage opportunity, not yet implemented

If exact collisions or other evidence justify it, compare **provenance distance** against **solution distance** within levels. Useful controlled contrasts include:

- same setup except seed -> basin sensitivity;
- same setup except solver revision -> behavioral drift;
- same setup except retry/census cell -> treatment-specific basin ownership;
- very small provenance distance with very large path/basin distance -> hidden variable or unstable search;
- very large provenance distance with the same basin -> convergence / likely structural constraint.

This should reuse existing structural solution-profile/basin machinery rather than invent a second path taxonomy. It is a hypothesis-generating offline analysis, never a runtime selector input.

## Boundary

This work does not claim that a cross-hint collision is a determinism defect. The first research question is more basic: **what entity does a provenance event identity promise to identify for each producer, and does observed path multiplicity respect that contract?**

That question is now cheap and executable from the existing hint store. No broad solver campaign is warranted to answer it.
