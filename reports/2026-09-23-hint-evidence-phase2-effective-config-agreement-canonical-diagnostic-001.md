# Hint evidence consolidation — Phase 2 canonical diagnostic in effective-config-agreement — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** first legacy-consumer enhancement, following the two producer dual-write batches
> ([level-blind](2026-09-23-hint-evidence-phase2-level-blind-sweep-request-identity-001.md),
> [portfolio](2026-09-23-hint-evidence-phase2-portfolio-sweep-request-identity-001.md)).
>
> **Base commit:** `342efb9`.

## 1. Scope

`scripts/check-effective-config-agreement.mjs` now reads canonical
`solverRequestProjection`/`solverRequestIdentity` (via `solver-request-identity-compat.mjs`'s
`solverRequestIdentityAvailability()`) as an **additional diagnostic dimension**, per the
mechanical-migration-audit's explicit disposition for this file: "Keep as a named legacy-envelope
validator. Add a canonical-reader mode through #2002 rather than replacing the allowed-difference
semantics blindly."

This is deliberately not a pass/fail change. Every existing behavior (which fields must agree, what
throws, what `--allowed-diff` means) is unchanged; the 9 pre-existing tests pass byte-for-byte
unmodified.

## 2. Why diagnostic-only, not a new gate

Legacy `effectiveConfig` and the canonical projection answer genuinely different questions:

- `effectiveConfig` deliberately mixes solver-request semantics with population identity
  (`corpusSha256`) and execution-protocol markers (`levelBlind`, `engine`, `racePoolSize`) — all of
  which this checker's actual purpose ("same-arm shards must have run under literally the same
  everything") legitimately needs to catch drift in. A canonical-identity agreement cannot substitute
  for that: population/protocol drift between same-arm shards is a real bug this tool must keep
  failing on even when canonical solver-request identity is unaffected.
- Legacy compares the raw `solveOpts` **syntactically** (`stableStringify` field-by-field), while the
  canonical projection compares **normalized effective values** (an omitted `nodeBudget` and an
  explicit `Infinity` are the same request, but differ syntactically). A legacy mismatch whose
  canonical identity still agrees is therefore likely — not certainly, but likely — confined to
  population/protocol dimensions or benign syntactic drift rather than a real solver-behavior change.

So the correct role for canonical identity here is triage information attached to an already-reported
mismatch, not a second gate, and not a replacement gate. Building a field-level canonical diff for
`checkCompare`'s `--allowed-diff` semantics was considered and explicitly deferred: canonical's nested
shape (`resourceEnvelope.nodeBudget`, `stagePolicy.repairAdditiveBudgetMultiplier`, ...) does not map
1:1 onto legacy's flat field names, and inventing that mapping is a separate, larger migration than
this coarse pass/fail checker's scope.

## 3. Implementation

- `loadEffectiveConfig()` now also returns `canonical: solverRequestIdentityAvailability(summary)` —
  `'canonical'`, `'legacy-only'`, `'invalid-canonical'`/`'invalid-legacy'`, or `'unavailable'`,
  gracefully handling reports from producers not yet migrated to emit canonical identity.
- `checkAgreement()`: when a legacy mismatch is found and **both** sides have `status === 'canonical'`,
  the thrown error's line for that mismatch now notes whether canonical solver-request identity still
  agrees or also disagrees. When canonical is unavailable on either side, no note is added (silent,
  not a new failure mode).
- `checkCompare()`: the returned result now includes `canonicalDiffers` — `true`/`false` when both
  sides have canonical identity, `null` otherwise — and the CLI's console output for `--mode=compare`
  reports it. Pass/fail behavior is completely unchanged.

## 4. Verification

Four new tests, all exercising the actual reported/returned diagnostic value rather than only that the
tool doesn't crash:

- a legacy mismatch confined to a `corpusSha256`-shaped population field, with matching canonical
  sentinels on both sides → error message says canonical identity "still agrees";
- a legacy mismatch with differing canonical sentinels too → error message says canonical identity
  "also disagrees";
- `checkCompare` with identical canonical sentinels (despite a real `ablation` diff, which the
  projection excludes as observer/non-request scope) → `canonicalDiffers === false`; with differing
  sentinels → `canonicalDiffers === true`;
- `checkCompare` against two purely-legacy reports (no canonical fields at all) → `canonicalDiffers
  === null`, proving graceful degradation for not-yet-migrated producers.

All 9 pre-existing tests plus these 4 new ones pass (13/13). `npm run check:types`,
`check:types:tests`, full `npx vitest run` (145/1550), and full `npm run test:node` (180 packages) all
green.

## 5. What this does not do

- Does not change `combine-solver-sweep-reports.mjs`, the other consumer the mechanical-migration-audit
  names with a similar disposition ("Prefer canonical request identity when present, validate legacy
  when only legacy exists, and reject mixed disagreement") — that file's mixed-era shard-flattening
  logic is a larger, separate migration, reserved for its own batch.
- Does not build a field-level canonical diff for `--allowed-diff` (see section 2).
- Does not change what causes `checkAgreement`/`checkCompare` to pass or fail.

## 6. Next work

Apply the equivalent canonical-aware treatment to `scripts/combine-solver-sweep-reports.mjs`, whose
disposition is stronger than this file's (prefer canonical, not merely note it) since combining is a
write path, not just a validator.
