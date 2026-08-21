# Family data on `main`

This directory contains a small retained set of family/variant artifacts used as examples, fixtures, or compact research evidence. It is **not** the large canonical variant trove.

The large generated resource remains on branch `claude/variant-levels-solver-insights-tpk4qg` and should be mounted separately while current `main` supplies the code and instructions. See [`../../docs/variant-level-research.md`](../../docs/variant-level-research.md).

## Rules

- Do not infer global family/variant counts from this directory.
- Do not bulk-delete or regenerate these files without checking current consumers and research references.
- New large family campaigns belong off `main`; promote reusable tooling and compact evidence back here only when there is a specific reason.
- Companion `*-manifest.json` files record generation metadata for their family artifact. Historical manifests may lack fields added by newer generators.
- Treat generated variants as correlated siblings of their parent family, not independent benchmark samples.

Use `docs/tooling-catalog.md` and `docs/variant-level-research.md` before adding another family tool or dataset.
