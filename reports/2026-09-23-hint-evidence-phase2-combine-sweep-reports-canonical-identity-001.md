# Hint evidence consolidation — Phase 2 canonical identity in combine-solver-sweep-reports — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** second legacy-consumer enhancement, following
> [`2026-09-23-hint-evidence-phase2-effective-config-agreement-canonical-diagnostic-001.md`](2026-09-23-hint-evidence-phase2-effective-config-agreement-canonical-diagnostic-001.md).
>
> **Base commit:** `b9c42d2`.

## 1. Scope

`scripts/combine-solver-sweep-reports.mjs` now validates and propagates canonical
`solverRequestProjection`/`solverRequestIdentity` across the shards it combines, per the
mechanical-migration-audit's disposition for this file: "Prefer canonical request identity when
present, validate legacy when only legacy exists, and reject mixed disagreement."

## 2. A deliberate departure from the audit's literal wording, and why

The audit's phrase "prefer canonical... when present" could be read as: when canonical identity is
available, let it supersede the legacy `effectiveConfig` syntactic-agreement gate entirely. Building a
test fixture for that reading immediately exposed why it would be unsafe: legacy `effectiveConfig`
carries **population identity** (`corpusSha256`) that the canonical projection deliberately excludes by
design (plan section 3.2's own exclusion list). If canonical agreement could bypass the legacy gate,
two shards that ran against genuinely different corpus content — exactly the wiring bug this combiner
exists to catch, per its own header comment ("refuses to combine shards that disagree on that
configuration... must not erase which treatment actually ran") — would silently combine as long as
their solver-request semantics happened to match.

This batch therefore implements the safer, still-faithful-to-the-audit's-intent reading: canonical
identity is validated and propagated **additionally** to the existing legacy gate, never as a
replacement. When both are present on every shard, **both must agree**; canonical agreement can never
excuse a legacy population/protocol mismatch, and a legacy match provides no exemption from a canonical
mismatch either. This is the "reject mixed disagreement" half of the audit's wording taken literally,
applied conservatively to the "prefer canonical" half.

## 3. Implementation

- New `validatedSolverRequestIdentity(reports)`: for a group of reports already known to share one
  legacy `effectiveConfig`, checks canonical availability via `solverRequestIdentityAvailability()`.
  - Zero reports with canonical → returns nulls (fully backward compatible with un-migrated producers).
  - All reports with canonical, and all identities equal → returns the shared projection/identity for
    propagation into the combined summary.
  - Some but not all have canonical → throws (mixed availability is rejected, matching the existing
    `collectEffectiveConfig`'s own pattern for the legacy pair itself).
  - Any report's canonical fields are self-inconsistent (`status === 'invalid-canonical'`, e.g. a
    recorded `solverRequestIdentity` that doesn't match its own `solverRequestProjection`) → throws
    immediately, never silently treated as "no canonical identity."
  - Canonical identities present but disagreeing → throws.
- `validatedEffectiveConfig()` now calls this after its existing legacy-agreement loop and returns the
  triple `{ effectiveConfig, solverRequestProjection, solverRequestIdentity }`.
- `collectEffectiveConfig()` propagates the triple through both the common (single-corpus) path and the
  single-group case of the `--allow-mixed-corpora` path (`validatedEffectiveConfig` is called per
  corpus-group either way, so intra-group canonical agreement is enforced automatically). The
  genuinely-mixed multi-corpus-group case deliberately does **not** propagate a top-level canonical
  identity — different corpus groups are legitimately different populations/arms with no obligation to
  share any identity, canonical included, and building a `byCorpus`-keyed canonical structure for this
  rarer, opt-in path was judged disproportionate to this batch's scope.
- The combined `summary` now includes `solverRequestProjection`/`solverRequestIdentity` alongside the
  existing `effectiveConfig`/`effectiveConfigDigest` when available.

## 4. Verification

Five new tests added to the existing real-CLI (`execFile`) test suite, using
`solverRequestIdentityFromProjection()` to build genuinely valid canonical fixtures rather than
hand-typed hash strings:

1. two shards with identical legacy `effectiveConfig` **and** identical canonical identity → combine
   succeeds, combined summary carries the canonical projection/identity unchanged;
2. two shards with identical canonical identity but **differing** `corpusSha256` (legacy-only
   population dimension) → still rejected with `Mismatched effectiveConfig`, proving canonical
   agreement cannot excuse legacy population drift (the core safety property section 2 is about);
3. two shards with identical legacy `effectiveConfig` but differing canonical identity → rejected with
   `Mismatched canonical solver-request identity`, proving canonical is a real additional gate, not
   merely inert metadata;
4. one shard with canonical identity, one without (legacy `effectiveConfig` otherwise identical) →
   rejected as mixed availability;
5. a shard whose recorded `solverRequestIdentity` doesn't match its own `solverRequestProjection` →
   rejected as invalid, not silently treated as absent.

All prior tests in this file (44 assertions across the full suite) pass unmodified. `npm run
check:types`/`check:types:tests`, full `npx vitest run` (145/1550), and full `npm run test:node`
(180 packages) all green.

## 5. What this does not do

- Does not propagate canonical identity through the genuinely-mixed multi-corpus-group
  `--allow-mixed-corpora` path (see section 3's last bullet).
- Does not change `scripts/check-effective-config-agreement.mjs` further — its diagnostic-only
  treatment (previous batch) is a deliberately different, weaker integration appropriate to its role as
  a validator rather than a combiner/writer.
- Does not build a field-level canonical diff anywhere; canonical identity is compared only as an
  opaque equal/not-equal value, same scope limitation as the previous batch.

## 6. Next work

Both named legacy consumers (`check-effective-config-agreement.mjs`, `combine-solver-sweep-reports.mjs`)
now integrate canonical solver-request identity, each at the integration strength appropriate to its
role (diagnostic for the validator, enforced-additional-gate for the combiner/writer). Remaining Phase 2
items per the reconciliation report: define the per-level effective-input projection; integrate
raced-backend semantics into the execution-protocol layer; consolidate the source-run envelope
duplicates; resolve the TypeScript-runtime-vs-plain-Node bridge question for producers that are not
already bundled.
