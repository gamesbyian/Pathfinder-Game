# PG-G independent-parent symmetry confirmation plan (2026-10-16)

> **Status:** active
> **Last evidence:** 2026-10-16 — the selected-pair causal factorial restored 6/6 solve-state cliffs by changing only candidate order; the retained-family tree audit then established 54 direct `symmetry` families / 48 eligible untouched parents after excluding the six PG-G discovery parents.
> **Decision:** run an outcome-blind independent-parent confirmation of the ordering mechanism before any cold production consumer is designed.
> **Remaining gate:** complete Stage A control mapping and Stage B treatment on the frozen 12-parent cohort; apply the preregistered parent-level opportunity and restoration thresholds.
> **Evidence role:** confirmation
> **Selection:** deterministic SHA-256 rank over all 48 eligible direct root-level `symmetry` families in the pinned dataset; no current or historical solver outcomes were inspected to choose parents.
> **Population identity:** exact 48-parent reservoir, selection hashes, and frozen 12 parents in `reports/2026-10-16-pg-g-independent-symmetry-confirmation-spec-001.json`; family data pinned to `32132d6ba60f1203ee013ed0d475f46061eddd49`.
> **Selection history:** the eligible pool is defined only by generator-family identity and exclusion of the six already-consumed PG-G discovery parents. The earlier draft's 22-parent count came from a truncated directory listing and was corrected before any confirmation outcomes were collected.
> **Inference scope:** independent-parent confirmation of symmetry-order causality under the frozen three-technique, 10M-work protocol; no prevalence estimate outside this reservoir and no production-policy authority.

## Why this is the next gate

The selected-pair factorial established a mechanism on cases chosen because they already exhibited symmetry response cliffs. That is causal attribution, not generalization. The next useful question is whether the same intervention restores parent behavior on independently selected parent families whose current outcomes were not used for selection.

The treatment remains deliberately illegal for production: a generated sibling is told which orientation maps it back to its known family parent. That isolates the mechanism. A cold current-input canonicalizer is a later consumer and should not be designed until this confirmation survives.

## Frozen cohort

The complete pinned root directory contains **54** `family-<parent>-symmetry-manifest.json` families using the seven-sibling D4 `symmetry` form. Excluding the six PG-G discovery parents leaves **48** eligible parents. Older `-sym-` families and the separate `corpus1/` / `corpus2/` family trees are not mixed into this confirmation pool.

Selection is mechanical:

```text
hash = sha256("pg-g-independent-symmetry-confirmation-v1" + NUL + parentId)
sort ascending by hash, then parentId
take first 12
```

Selected parents, frozen before current solve outcomes are collected:

`R00392, R03180, R02962, R02208, R00082, R00727, R00789, R02841, R00050, R01075, P00010, R00920`.

Each selected manifest has already been checked structurally to contain exactly seven siblings with orientations 1..7. At execution time its historical `parentContentHash` must also match current main. A mismatch fails closed; do not replace a parent after seeing outcomes.

## Stage A: opportunity mapping

For each parent, run:
- the parent control;
- all seven symmetry siblings under current ordering;
- three isolated techniques: default DFS, no-tie admissible-order, and standard repair;
- 10,000,000 canonical work per row;
- 600,000 ms only as a non-binding safety deadline.

This is 12 × 8 × 3 = **288** control rows. Parent controls may be physically cached/reused but remain one semantic control per parent × technique.

A Stage-A opportunity is a sibling/technique whose solved/unsolved state differs from its own parent under that same technique. Siblings are correlated observations; the independent unit is the parent.

## Stage B: causal treatment

Only Stage-A opportunity rows advance. Re-run each discordant sibling under the identical technique and work cap with one intervention: `PrepLevel._candidateOrderResearchKey` maps legal candidates into the known parent coordinate frame before stable ties are consumed.

Do **not** normalize repair seed. The selected-pair factorial showed seed identity alone did not rescue the repair cliff; this confirmation asks whether ordering itself transfers.

Every treatment path must pass the canonical referee. Deadline-truncated equal-work rows are invalid, not failures.

## Preregistered decision rule

Confirmation is **positive** when:
- at least **4 independent parents** contain at least one Stage-A solve-state discordance;
- at least **6 discordant sibling × technique rows** exist;
- Stage B restores the parent solve state on at least **70%** of discordant rows; and
- restored rows occur on at least **4 independent parents**.

It is **negative** when both eligibility minima are met but restoration is below **40%**. Results between 40% and 70%, or a cohort with fewer than four eligible parents / six discordant rows, are **inconclusive** rather than threshold-tuned after inspection.

Secondary outcome: among rows where parent and treated sibling both solve, measure whether treatment contracts the sibling's work distance toward its parent control. This is descriptive and cannot rescue a failed primary gate.

## Guardrails and definition of done

- Population selection is sealed before Stage A.
- No historical solver outcomes from the retained family branch are read.
- Current parent fingerprints must match pinned manifests.
- Stage A must finish before the Stage-B opportunity set is constructed.
- Stage B must contain all and only Stage-A solve-state discordances.
- Work accounting must use the maintained equal-work technique-census contract, including both `_workCap` and `_strictWorkCap`; >1% atomic-work overshoot fails closed.
- Every solve is referee-valid.
- Results are grouped by parent and report raw row counts separately from independent-parent counts.
- A positive result advances only to design of a **cold-legal current-input** D4 tie-order key. It does not authorize parent-frame provenance, an eight-orientation portfolio, or any production default change.
