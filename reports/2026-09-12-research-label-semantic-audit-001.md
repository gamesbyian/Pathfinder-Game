# Research-label semantic audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — bounded audit of decision-bearing `variantLabel`, `pairLabel`, `isolatedTechnique`, and origin/arm/source-label consumers after the corrected atlas bug.
> **Decision:** no schema redesign. One remaining decision-bearing `variantLabel` misuse was found and repaired in `reconcile-isolated-hint-census-context.mjs`; the other inspected uses are identity/display/provenance metadata or are guarded by explicit source-cell reconciliation.
> **Remaining gate:** none. Reopen only when a concrete ambiguous semantic join appears after evidence-plumbing changes.

## Finding

The atlas/equal-work/exposure joins had already been repaired to stop treating `variantLabel` as proof of a non-base experimental condition. The same semantic mistake survived in a newer helper written for isolated-hint source reconciliation:

```js
const inferredVariant = row.variantLabel || row.flagExperiment || row.ablation;
...
if (row.tier === 'T1' && inferredVariant) return 't1-variant';
```

That would classify the clean promoted `repair|score=repair|guidance=turn-biased` T1 cell as `t1-variant` solely because its self-referential bookkeeping `variantLabel` is populated, despite `ablation:null`. This is the exact semantic distinction established by the corrected atlas.

The five class-5 provenance rows that motivated this helper remain correctly interpreted because their source cells carry the real `coarse-state-near-tie-retention-off` ablation. The bug therefore does **not** overturn the September 12 freshness conclusion, but it made the helper unsafe for other source cells and future reuse.

## Repair

`classifyCell()` now treats only explicit causal/source structure as semantic:

- T3 / `pairLabel` / multiple `techniqueKeys` => pair;
- T4 / `flagExperiment` => flag experiment;
- T1 + non-null `ablation` => T1 variant;
- T1 + one technique key and no explicit experiment => base T1.

`variantLabel` remains preserved in emitted source context for identity/debugging, but does not decide the classification.

## Other inspected uses

- The three known atlas/equal-work/exposure consumers already carry comments and use `ablation`, not `variantLabel`, as the non-default-condition predicate.
- `technique-census-result-lib.mjs` uses `variantLabel` to canonicalize a cell identity label and persists it alongside tier, pair, flag, ablation and technique keys. It does not use the label alone to establish base/current capability.
- `isolatedTechnique` remains a provenance facet, not bare-T1 proof. `reconcile-isolated-hint-census-context.mjs` and the class-5 freshness path require exact path/attempt/source-cell reconciliation before making the relevant capability interpretation.
- `pairLabel` is producer/result metadata and is semantically reinforced by T3 tier / multiple technique keys in the decision-bearing classifier.
- The inspected origin/arm/source label uses are reporting or experiment identity surfaces, not production routing or current-capability predicates.

## Disposition

The bounded semantic-label audit is closed. The durable rule remains: convenience labels and summary booleans may identify or describe an artifact, but decision-bearing claims about experimental condition/source capability must use explicit provenance/configuration fields. Reopen only when a concrete ambiguous join appears; do not launch a broad schema rewrite from this audit.