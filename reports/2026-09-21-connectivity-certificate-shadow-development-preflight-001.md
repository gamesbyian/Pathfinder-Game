# Connectivity cut-certificate shadow: frozen development run 001

> **Status:** FROZEN BEFORE EXECUTION.
> **Date:** 2026-09-21.
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Mechanism proof:** [connectivity certificate source audit 001](2026-09-21-connectivity-certificate-source-audit-001.md).
> **Runner:** `scripts/connectivity-certificate-shadow-audit.mjs`.
> **Evidence role:** development opportunity sizing; no production efficacy claim.

## Question

Does the proved portal-free connectivity cut implication recur often enough, across distinct exact states, and cheaply enough to replace a material amount of already-scheduled connectivity reasoning?

## Frozen population

- corpus: `data/stress/stress-levels-random.json`;
- positions: **81-104**;
- independent unit: level;
- 24 rows requested;
- selected as the first contiguous block immediately after the historical Stage-A/B positions 1-80 population;
- selection frozen before any successor-shadow result is inspected.

This is deliberately not selected for known connectivity recurrence, mechanism presence, or solve outcome.

If this block does not expose enough eligible connectivity work, classify that as an observability failure and design a separate hard-search acquisition. Do not replace these rows post hoc with levels that produced hits.

## Frozen execution

- `baseWorkBudget=500000`;
- `strictTotalWorkBudget=true`;
- `timeBudgetMs=30000` as wall safety;
- `maxCertificates=64`;
- ordinary production solve ladder;
- shadow observation only;
- portal levels may run but cannot produce/consume the first certificate form;
- ordinary `isConnected()` always executes and verifies every shadow hit.

Command:

```bash
node scripts/run-bundled.mjs scripts/connectivity-certificate-shadow-audit.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels=pos:81-104 \
  --work-budget=500000 \
  --time-budget-ms=30000 \
  --max-certificates=64 \
  --out=reports/stress/connectivity-certificate-shadow-development-001.json \
  --summary-out=reports/stress/connectivity-certificate-shadow-development-001-summary.md
```

## Primary observables

- certificates produced;
- certificate retention drops;
- scheduled connectivity calls with retained candidates;
- certificate scans;
- boundary-cell checks;
- shadow hits;
- cross-exact-state hits;
- ordinary goal-unreachability confirmations;
- false positives;
- parents with any hit;
- parents with a cross-exact-state hit;
- potentially replaceable scheduled connectivity calls;
- whole-solve work.

## Safety gate

Any shadow hit with `confirmedGoalUnreachable=false` is a hard stop for the tested certificate implementation.

A false positive does not imply the underlying cut theorem is false until the reduced fixture identifies whether the bug is:

- incomplete cut construction;
- passability mismatch;
- mechanic-support leak;
- stale-state/lifetime bug;
- instrumentation error.

But no behavioral consumer advances while any unexplained false positive remains.

## Observability gate

The sample is informative for replacement economics only if:

- multiple portal-free parents produce certificates;
- multiple independent parents produce at least one shadow hit;
- at least one cross-exact-state hit occurs.

If those conditions fail, report the block as underexposed rather than as evidence that the certificate has no broader recurrence.

## Development advance gate

Advance to overhead calibration / matched-work behavioral design only if all are true:

1. zero false positives;
2. cross-exact-state confirmed hits on multiple independent parents;
3. non-trivial potentially replaceable scheduled-call share;
4. boundary validation cost proxy is plausibly below the replaced connectivity computation;
5. usefulness is not entirely one parent;
6. retention/lookup pressure is bounded enough that a small solve-local consumer remains plausible.

Do not freeze a universal numeric call-rate threshold before seeing whether the observer's denominator is a good cost proxy. The first result may instead show that wall/operation calibration is required before an economic threshold can be stated.

## Stop gate

Close the tested certificate form as a scheduled-call replacement if:

- recurrence is effectively exact-state-only;
- confirmed hits are concentrated in one parent;
- boundary validation approaches fresh connectivity cost;
- retained-certificate scan cost dominates;
- false positives cannot be removed without near-full-state identity;
- replaceable connectivity work is negligible at whole-solve scale.

A negative here does not close BC1, obligation proofs, or other implication certificates.

## What is not being tested

This run does not test:

- earlier-than-scheduled certificate firing;
- portal-aware cut certificates;
- cross-run persistence;
- cross-level production reuse;
- shared execution between beam widths;
- general residual memoization.

Those are separate questions and remain unlicensed.
