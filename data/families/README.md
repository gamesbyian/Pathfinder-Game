# Family data on `main`

This directory contains a small retained set of family/variant artifacts used as examples, fixtures, or compact research evidence. It is **not** the large canonical variant trove.

The large generated resource remains on branch `claude/variant-levels-solver-insights-tpk4qg` and should be mounted separately while current `main` supplies the code and instructions. See [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md).


## Retained artifact roles

The tracked collection has three concrete roles; none is a production runtime input or a general solver benchmark:

- Top-level `family-*.json` plus companion manifests are **compact historical research evidence and reproducible example inputs**. Dated `reports/families/` analyses consume them, and the technique-tuning campaign indexes their manifests. Tools accept them when passed explicitly; ordinary tests generate temporary fixtures instead.
- `phaseB/` corpora and manifests are **compact campaign evidence** used by the Phase-B/Phase-C family-boundary reports. `phaseB/R02248-symmetry.json` and its manifest are also the explicit defaults for the symmetry-repair-seed diagnostic pilot; that default does not make the whole directory a current benchmark.
- `hints/` and `phaseB/hints/` are **generated provenance sidecars** for retained variants. They support the dated family reports and replay/research tools; they are not published-game hints.

A consumer search found no safe orphan deletion: the retained manifests are selected by the structured technique-tuning evidence, family corpora are named by dated reports, and sidecars preserve the solve provenance those reports describe. This is retention justification, not a claim that every artifact is an active default.

## Rules

- Do not infer global family/variant counts from this directory.
- Do not bulk-delete or regenerate these files without checking current consumers and research references.
- New large family campaigns belong off `main`; promote reusable tooling and compact evidence back here only when there is a specific reason.
- Companion `*-manifest.json` files record generation metadata for their family artifact. Historical manifests may lack fields added by newer generators.
- Treat generated variants as correlated siblings of their parent family, not independent benchmark samples.

Use `docs/tooling-catalog.md` and `docs/variant-level-research.md` before adding another family tool or dataset.
