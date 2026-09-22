# WS1 legal-signal continuation-value decomposition and temporal challenge 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — exact frozen-model replay against retained pre-promotion run `35043165547`, plus mechanism decomposition of development run `35066677597`.
> **Decision:** the retained WS1 signal is not broad action selection. It is overwhelmingly repeated late-stage continuation after censored/exhausted work, and the exact frozen rule survives a materially different pre-promotion production regime. Keep the model frozen and advance only to sample-independent/current-production confirmation.
> **Remaining gate:** confirm the exact frozen 15-signature model on sample-independent/current production evidence. Do not refit membership, work bands, support floor, or stage set on challenge data.
> **Evidence role:** development / temporal robustness
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Frozen model:** `reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`
> **Machine challenge:** `reports/stress/action-selection-legal-signal-temporal-challenge-2026-09-21.json`

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-21","decision":"The frozen WS1 legal-signal rule is predominantly a late same-stage continuation-value signal and survives a separate pre-promotion production execution with 6.99% C2 pre-winner-work capture and 0/318 recorded winner losses. This is temporal/portfolio robustness, not independent-population confirmation.","remainingGate":"Apply the exact frozen 15-signature model unchanged to sample-independent/current-production evidence before any live scheduler treatment.","joins":{"researchQuestion":"WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"same C1/C2 level population across post-promotion run 35066677597 and pre-promotion run 35043165547","selection":"frozen 15-signature model learned only from run 35066677597 development split; replayed unchanged on run 35043165547 validation split","inferenceScope":"temporal/portfolio robustness and mechanism decomposition; not independent-level confirmation or live scheduler causality"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md","reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json","reports/stress/action-selection-legal-signal-temporal-challenge-2026-09-21.json","scripts/apply-action-selection-legal-signal-model.mjs"],"successors":{"questions":["WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE"],"artifacts":[]},"prospective":{"expectation":"if the selected contextual signal reflects a stable continuation-value seam rather than one execution artifact, the exact frozen signatures should retain non-trivial capture across an adjacent production regime without refitting","surprise":"the rule survives the pre-promotion regime at 6.99% with 0/318 observed winner losses and remains >95% same-stage continuation work","anomaly":"C1 remains 0% capture; the result is still C2-specific and cannot support cross-corpus generalization"}} -->

## Why this follow-up

The first retained-evidence pass found a conservative C2 rule with:

- 9.91% validation pre-winner-work capture;
- 0/356 recorded validation winner losses;
- 0% C1 capture.

The result report already noted that the largest signatures looked like repeated late retries. This pass asks two narrower questions without new solver compute:

1. **What mechanism does the selected rule actually describe?**
2. **Does the exact frozen membership survive a different production execution without refitting?**

## Frozen model

The development rule is now persisted explicitly rather than reconstructed from prose.

It contains exactly 15 signatures from the `prior-response+work+next-stage` family satisfying, on run `35066677597` development data:

- minimum development support: 100;
- development wins: 0.

The model records the exact work-band vocabulary and signature membership.

A new frozen-model challenge CLI applies those signatures unchanged to another retained sweep. It does not recompute support, wins, thresholds, membership, or bins on the challenge population.

## Mechanism decomposition on the development run

On C2 validation from run `35066677597`:

- validation pre-winner work: **21.174B**;
- nominated work: **2.098B**;
- capture: **9.91%**;
- observed winner endangerment: **0/356**.

But the composition is much narrower than “dynamic scheduler opportunity.”

### Same-stage continuation dominates

**96.48%** of nominated work is an attempt in the **same stage** as the immediately preceding attempt.

For comparison, same-stage continuation is **67.30%** of all C2 validation pre-winner work.

So the selected signal is materially enriched for repeated continuation rather than merely reflecting the base action ladder.

### Censoring dominates

**85.94%** of nominated work follows a prior attempt classified as censored/budget-limited.

The corresponding baseline among all validation pre-winner work is **61.22%**.

**82.42%** of all nominated work is both:

- same-stage continuation; and
- after a censored prior attempt.

The remaining material share is mostly same-stage continuation after an exhausted prior attempt.

### Four late retry stages own the non-zero work

Non-zero nominated work is distributed:

| next stage | nominated work | share |
|---|---:|---:|
| guidance-goal-distance-retry | 1.109B | 52.85% |
| connectivity-axis-prune-disabled-retry | 532.8M | 25.39% |
| must-cross-neighbor-prune-disabled-retry | 292.3M | 13.94% |
| coarse-state-near-tie-retention-disabled-retry | 164.0M | 7.82% |

The goal-attraction-disabled signatures in the frozen model nominate many recorded boundaries but zero canonical pre-winner work in this result.

This is therefore best interpreted as a **late continuation-value seam**, not a generic “which action should run next?” signal.

That distinction matters for future experimental design. A broad learned scheduler would be premature; a confirmation analysis should first ask whether repeated continuation in these late retry families remains low-value under the frozen rule.

## Temporal / portfolio challenge

The repository still retains a full main-branch stress refresh from earlier on September 16:

- run: `35043165547`;
- solver ref: `4421bd8fcf0f4a948a901082accfab0d151c6369`.

This run predates the promotion of the Class-4 portal coarse-state dead-last retry.

Between this challenge run and the development run, the production portfolio changed materially: PR #1815 promoted that retry to default-ON and fixed its no-ablation orchestration read so the promotion actually applied to normal production callers.

The exact 15 frozen signatures from the later development run were applied to the earlier validation action boundaries with **no refitting**.

### Challenge result

Earlier C2 validation:

- solved validation levels: **318**;
- pre-winner work: **10.991B**;
- nominated work: **768.6M**;
- capture: **6.99%**;
- recorded winners endangered: **0/318**.

C1 remains:

- **0% capture**;
- **0 observed winner losses**.

The mechanism also reproduces:

- same-stage continuation share of nominated work: **95.26%**;
- censored-prior share: **90.09%**;
- same-stage + censored share: **85.35%**.

Thus the signal weakens from 9.91% to 6.99% but does not disappear, invert, or suddenly expose rare winners when replayed across a materially different production portfolio.

## Historical duplicate check

A September 12 full refresh, run `34683011115`, was also inspected.

Its normalized C2 attempt sequence is byte-for-byte equivalent under the retained action fields to run `35043165547`:

- normalized attempt digest for both: `sha256:2a861c7ed7f45b1253a9f7ca92939ebd7bf43a7795dbb7d07551cab59e6a88b1`.

It therefore does **not** count as an additional replication.

The post-promotion development run has a different normalized attempt digest:

- `sha256:393c58d75161d54a4242558c105d144226b6499f33fda04d627a74dd2e8fe6ef`.

This preserves the correct evidence count: two distinct execution regimes, not three.

## Interpretation

The evidence now supports a narrower statement than the original WS1 framing:

> A small set of runtime-legal late-continuation contexts repeatedly marks substantial pre-winner work in C2, and that association survives a material production-portfolio change.

It still does **not** establish:

- that those continuations can be skipped live;
- that the downstream winner would remain reachable after skipping them;
- that the rule generalizes to C1;
- that same-level temporal robustness equals independent-population confirmation;
- that a generic dynamic scheduler is warranted.

## Next gate

Do not invent another feature family.

Use the frozen model exactly as committed:

`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`

Apply it unchanged to sample-independent/current-production evidence.

Confirmation must report:

- C1/C2/source separately;
- captured canonical pre-winner work;
- winner endangerment;
- same-stage continuation share;
- prior-outcome composition;
- next-stage concentration;
- comparison with the pre-promotion 6.99% and post-promotion 9.91% bands.

Only after sample-independent confirmation should a live matched-work consumer be designed, and that consumer should begin at the **late continuation seam**, not with a broad scheduler architecture.
