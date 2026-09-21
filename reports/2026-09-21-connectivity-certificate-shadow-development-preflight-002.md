# Connectivity cut-certificate shadow development preflight 002

> **Status:** active
> **Last evidence:** 2026-09-21 — run 001 on the same frozen 24-parent block emitted 0 certificates because the producer was narrower than the proved theorem.
> **Decision:** rerun the unchanged population/resource envelope after removing only the accidental no-pending-obligation/reserved-wall source restriction.
> **Remaining gate:** zero false positives plus certificate production and cross-exact-state recurrence on multiple independent parents; otherwise close or diagnose the exact remaining observability/economics blocker.

## Why this is a legitimate rerun

Run 001 was frozen and executed before any result-driven reselection.

Its preflight explicitly said:

> if the block does not expose enough eligible connectivity work, classify that as an observability failure and design a separate acquisition rather than replacing rows post hoc.

The result was even cleaner: **zero source certificates**.

Source review showed the failure came from an implementation gate that was not part of the theorem:

- pending must-pass forbidden;
- pending must-cross forbidden;
- reserved-MC regime forbidden.

The portal-free goal-cut implication remains sound with those states because the complete boundary is constructed under the source state's exact connectivity predicate and revalidated under the later state's exact predicate.

Therefore development run 002 reuses the **same parents**. This is an observability repair, not population tuning.

## Frozen population

Unchanged from run 001:

- corpus: `data/stress/stress-levels-random.json`;
- positions: **81-104**;
- 24 requested independent parents;
- independent unit: level.

No parent is added, removed or reordered based on run-001 behavior.

## Frozen execution

Unchanged:

- `baseWorkBudget=500000`;
- `strictTotalWorkBudget=true`;
- `timeBudgetMs=30000`;
- `maxCertificates=64`;
- ordinary production solve ladder;
- shadow only;
- portal levels cannot produce or consume the certificate;
- ordinary `isConnected()` always verifies every hit.

The only semantic treatment change is:

> certificate production now permits any pending-obligation/reserved-MC state when ordinary portal-free connectivity rejects because the **goal** is unreachable.

## Primary observables

Same as run 001:

- certificates produced/dropped;
- scheduled probe calls;
- certificate scans;
- boundary-cell checks;
- shadow hits;
- cross-exact-state hits;
- confirmed goal-unreachable hits;
- false positives;
- hit parents;
- cross-state-hit parents;
- potentially replaceable scheduled calls;
- total work.

## Safety gate

Any false-positive shadow hit is a hard stop.

Because the scope broadened, tests now explicitly cover a source state with both pending must-pass and pending must-cross obligations in addition to:

- static-cut cross-state reuse;
- reopened dynamic-boundary invalidation;
- portal exclusion.

## Observability gate

The run becomes economically interpretable only if:

- certificates are produced on multiple independent parents;
- shadow hits occur on multiple independent parents;
- at least one cross-exact-state hit occurs.

If certificates are produced but never hit, that is now recurrence evidence rather than an eligibility miss.

If no certificates are still produced, add diagnostic source-rejection counters before changing population again.

## Advance gate

Only if all hold:

1. zero false positives;
2. confirmed cross-exact-state hits on multiple parents;
3. non-trivial scheduled-call replacement opportunity;
4. boundary validation plausibly cheaper than fresh connectivity;
5. results not dominated by one parent;
6. bounded lookup/retention pressure.

Then calibrate observer overhead and design the smallest matched-work behavioral consumer.

## Stop gate

Close scheduled-call replacement for this cut form if the broadened theorem is observable but:

- recurrence is rare/exact-state-only;
- validation/lookup cost approaches connectivity;
- opportunity is negligible at solve scale;
- or safe applicability requires near-full residual identity.

Do not infer anything about BC1 or other exact proof families from that closure.
