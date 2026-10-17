# PG-I: independent-parent fragile/robust technique response census 001

> **Status:** active
> **Last evidence:** 2026-10-17 — recovered full 715-cell equal-work pilot from GHA 37712397687; parent-grouped census computation authored, hosted arithmetic/integrity rerun pending.
> **Decision:** test whether per-level successful-technique *counts* conceal changes to technique identity under controlled transformations, and whether the selected pilot can even contain method-robustly-hard variants.
> **Remaining gate:** rerun the maintained 715-cell analyzer against the retained artifact, then reproduce and retain six-parent response census; decide whether the observed swaps earn a smallest current-input policy/representation microscope.
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Evidence role:** discovery
> **Selection:** already-inspected six-parent, 18-family-mode controlled technique-response pilot, deliberately repair/symmetry response-enriched; this is retrospective exploratory analysis, not prespecified confirmation.
> **Population identity:** 715 unique equal-work cells and 125 controlled variant edges, source GHA 37712397687 artifact `controlled-technique-response-analysis` (ID 11523005793, ZIP SHA256 4a8c6a6c048bb1c214d609c32ef0d5006981fdd0c4e4337dbc015872f33ea28e).
> **Inference scope:** six selected independent parents × three transformation families × five isolated techniques at 10M canonical work each; no unlabeled generality or native cold solve.
> **Production effect:** none.

## Why this rejoin is different

The existing [October 15 response-pilot recovery](2026-10-15-controlled-technique-response-pilot-recovery-result-001.md) correctly reports 39/125 edges with an actual technique solve-state flip, across six selected parents. It does not separately report whether the **number** of techniques that solve a level changes, or the successful-technique identity alone changes while its cardinality stays fixed. A scalar "hardness" measure based only on how many techniques solve the level cannot distinguish the latter.

The new parent-grouped census uses the **maintained** `scripts/analyze-family-technique-response.mjs` output, rather than inventing another cell/evaluation identity dialect. It requires complete per-variant technique rosters and asserts that the same parent's repeated observations in different transformation blocks agree exactly on solved state, status, canonical work and nodes. If a shard/technique is missing or the parent baseline drifts, the report aborts. Each variant edge contributes within one `parentId` cluster, never as independent evidence for population prevalence.

Measured channels are separate: changed technique-success vector, changed successful-technique count, unchanged-count/changed-identity technique swaps, and observed zero/one-technique coverage. Counts cannot establish deep algorithmic inability because methods have a fixed 10M work ceiling.

## Work protocol

1. Read the original 715-cell `combined-cells.json` from GHA run `37712397687`, artifact `controlled-technique-response-analysis`.
2. Run `node scripts/analyze-family-technique-response.mjs --input=.../combined-cells.json --out=.../canonical-analysis.json`. This is the existing identity/transition owner.
3. Run `node scripts/parent-response-hardness-census.mjs --analysis=.../canonical-analysis.json --out=.../parent-verdict.json`. It verifies agreement on 6 parents, 125 variants and 39 actual response-flip edges, groups the repeated family-mode blocks by parent and emits the richer parent response.
4. Inspect counts, every parent and mode, selection bias and test-invariant alarms; retain an exact, small machine verdict and update `docs/solver-optimization-workstreams.md` and `WS2-VARIANT-RESPONSE-HARDNESS`.
5. Retire branch-local one-shot workflow before merge; no solver rerun, no generated variants and no production changes.

This is a diagnostic, not a scheduler rule. A next consumer would need a **solve-local** descriptor that predicts which technique has marginal value, its cost at the existing scheduler and matched-work cold A/B, plus independent whole-parent confirmation. Parent identity/label, stored success vectors and transformation ancestry are explicitly forbidden at runtime.
