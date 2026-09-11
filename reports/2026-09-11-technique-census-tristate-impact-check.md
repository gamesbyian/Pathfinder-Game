# Technique census tri-state baseline impact check — 2026-09-11

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — inspection of the retained canonical census's committed run summary (`reports/stress/technique-census/33717910218/`) and its 1,074/888 production-solved/unsolved split.
> **Decision:** the retained canonical census population is unaffected by the tri-state baseline fix; no artifact regeneration is justified.
> **Remaining gate:** none — reopen only if another decision-bearing census artifact is found whose generation provenance lacks a successfully loaded frozen baseline.
> **Audit area:** 18 — Technique census methodology
> **Question:** Did preserving unknown production-baseline state change any retained decision-bearing census/frontier population, requiring artifact regeneration?

## Retained canonical census

The current research asset registry points the canonical technique census at `reports/stress/technique-census/33717910218/`, especially `combined-cells.json` and `level-technique-coverage.json`, with the later technique-niches capability map as a downstream research asset.

The retained census was not generated under the broken no-baseline fallback. Its committed run summary records `Plan: plan/technique-census-plan.json` and classifies **1,074** T1 levels as production-solved and **888** as production-unsolved. The technique summary repeats exactly those two frozen-baseline populations and reports the 888-row capability-gap population explicitly.

That population split is decisive evidence that a frozen production baseline loaded when the retained derived outputs were built. Under the pre-fix fallback with no readable baseline, only the published corpus was intrinsically known solved while stress rows were coerced to unsolved; the retained 1,074/888 split therefore could not have arisen from that fallback.

## Downstream impact

The Audit 18 defect affected runs where `--plan` was absent or its baseline provenance could not be read: unknown stress rows were then coerced through negation into the production-unsolved population. The canonical retained census does not have that provenance condition.

Accordingly:

- the 888-row production-unsolved census population remains valid under the new tri-state semantics;
- the 1,074-row production-solved regression population remains valid;
- the retained `level-technique-coverage.json` does not require regeneration solely for this fix;
- downstream technique-niches/frontier work derived from this retained census is not reclassified by the tri-state correction;
- no broad census rerun or 48.7 MB `combined-cells.json` rewrite is justified.

Future re-derivations without a readable frozen baseline will now expose the affected stress population as unknown instead of manufacturing capability-gap rows. That is the intended behavioral change.

## Disposition

Close the post-closeout Audit 18 impact item with no retained-artifact rebuild. Reopen only if another decision-bearing census artifact is discovered whose generation provenance lacks a successfully loaded frozen baseline, or if a downstream consumer independently converts `null` baseline state back into `false`/unsolved.
