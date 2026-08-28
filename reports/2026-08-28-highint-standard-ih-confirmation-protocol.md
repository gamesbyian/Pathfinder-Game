# Standard-width intersection-harvest exposure confirmation protocol

> **Status:** NOT EXECUTED / CLOSED. Prespecified before the broader result; append-last development failed 56/120 control vs 55/120 treatment (0 gains, 1 loss), so this protocol was correctly never spent.
> **Date frozen:** 2026-08-28, before the broader 120-level development A/B result was opened.
> **Candidate:** `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE`.
> **Primary claim scope:** narrow routing improvement for very-high-intersection levels under a fixed whole-solve work envelope.
> **Evidence role if executed:** sample-independent same-generator confirmation, residual-conditioned.

## Candidate frozen before confirmation

The treatment is exactly the branch implementation already used by the selected replay and broader
development A/B:

- add `beam:intersectionHarvest@beam2000`;
- only in the two very-high-intersection rules where production lacks that exact action;
- append it after the existing rule-local actions;
- no other order, profile, beam width, prune, seed, eligibility, or budget change.

No threshold or feature refinement is permitted between the broader development verdict and this
confirmation. If development fails its gate, this protocol is not executed.

## Why residual-conditioned confirmation

The candidate is an additive rescue action. Its intended value is on levels the existing fixed-work
control ladder does not solve. A fresh unconditioned pool can spend most of its statistical power on
rows where both arms already solve before the added beam is relevant.

The confirmation therefore uses the evaluation framework's two-phase residual design:

1. run **control only** on a fresh, untouched witness-first random-generator pool;
2. freeze the exact control-failure residual;
3. run both arms on that frozen residual.

The residual is selected by control failure only, before treatment outcomes exist. It supports a
conditional tail claim, not an unconditional population solve-rate claim.

## Frozen source and materialization

- generator family: `scripts/stress/generate-random.mjs`;
- source role: same-generator sample-independent confirmation, not cross-generator transfer;
- pool count: **1,200**;
- master seed: **2026082804**;
- id prefix: **M**;
- generator revision: use the generator source revision pinned by the repository's managed
  evaluation tooling at execution time; record exact commit and pool SHA-256 before search;
- no candidate-specific post-generation filtering.

These values were chosen before the broader development A/B result was inspected.

## Frozen search envelope

Both phases use the same deterministic envelope as development:

- `nodeBudget = 50,000,000` as the local/base node guard;
- `workBudget = 67,000,000`;
- **`strictTotalWorkBudget = true`**;
- wall deadline 86,400,000 ms as a non-binding safety deadline;
- workers = 4;
- attempt-budget telemetry on for participation/accounting.

The whole-solve work cap is the decision-bearing envelope. A treatment gain cannot be purchased by
an additive tier escaping the declared 67M work budget.

## Phase 1

Run the control ladder across all 1,200 generated levels. Persist and hash:

- exact pool content;
- complete control result;
- exact control-failure residual content;
- residual SHA-256;
- original pool denominator and residual denominator.

If control solves every row, confirmation is inconclusive because no residual exists.

## Phase 2

Run both arms on the sealed residual.

Control:
- production/default candidate flag state (candidate OFF).

Treatment:
- `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE=true`.

Persist per-shard arm/flag provenance and fail fast if the treatment resolves no requested flag or a
control shard resolves any treatment flag.

Also report treatment participation: number of residual rows where the new
`beam:intersectionHarvest@beam2000` attempt was actually reached.

## Frozen verdict

Confirmation **passes** only if all are true:

1. complete paired residual coverage;
2. no referee-invalid/error/deadline-truncated evidence affecting the comparison;
3. at least **one treatment-only solve**;
4. **zero control-only solves**;
5. the treatment was actually reached on at least one eligible residual row.

A 0/0 result with verified participation is a confirmation null and closes this exact candidate for
default-on promotion. A 0/0 result with zero participation is inconclusive instrumentation/population
evidence, not a negative. Any loss fails confirmation even if aggregate solve count rises.

Aggregate `workSpent` is secondary here because both arms share the same hard envelope; still report
it and the work-to-win of every changed row.

## Promotion consequence

If confirmation passes, the candidate has:

- selected replay evidence showing the exact added action can directly rescue a current residual row;
- a broader feature-defined matched-work development result;
- sample-independent residual confirmation under the same fixed work envelope.

That is sufficient under `docs/solver-evaluation-evidence.md` for a **narrow default-on promotion**
without claiming cross-generator generalization. A topology/envelope challenge may still be useful
afterward, but it is not required to assert the narrower confirmed routing claim.

If confirmation fails, do not tune the candidate from the confirmation rows. Close this exact form;
any descendant must have a materially new premise and fresh independent evidence.
