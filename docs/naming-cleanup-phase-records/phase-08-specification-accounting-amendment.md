# Phase 8 specification-accounting amendment

## 0. Identity and change envelope

| Field | Value |
| --- | --- |
| Phase | 8 post-completion specification amendment |
| Base | `542947e1` (PR #1596 merge, current repository main tip supplied to this branch) |
| Historical implementation records | unchanged; 8A through 8H remain evidence of what ran |
| Behavior envelope | plan/ledger/vocabulary/checker/test changes only; no solver, application, schema, CLI, workflow, seed, budget, corpus, or persisted identity rename |
| Completion decision | Phase 8 remains complete after explicit reclassification |

The review began with `npm run naming:status`, `npm run check:naming-cleanup-ledger`, and a fresh
`npm run naming:surface-inventory -- --compact --phase=8`. Consumer-inward searches then compared
all 68 Phase-8 rows with every `out of scope`/`separate authorization` statement in 8A-8H and with
current writers, readers, workflows, documentation, and tests. This amendment follows the
specification-amendment protocol: it changes the plan, permanent vocabulary authority, ledger, phase
authority, and closeout authority together before authorizing any implementation migration. It
authorizes none in this pass.

## 1. Classification decisions

| Finding | Classification and durable owner | Reason/lifecycle |
| --- | --- | --- |
| shared `--trove-root`, `troveRootArg`, and current command documentation | deferred compatibility migration, NC-P15-001 | shared CLI/API across family tools; Phase 15 must design a legacy alias before changing it |
| family-run manifest `trove` key and index/test readers | persisted generated-schema migration, NC-P15-002 | high risk; writer, normalizer, historical fixtures, and all readers must move consumer-inward |
| dated `wide-trove-*` output/discovery conventions still used by current workflow/index code | retained historical path plus deferred new-write migration, NC-P15-003 | old paths remain readable permanently unless evidence authorizes otherwise |
| `PATHFINDER_VARIANT_TROVE` | existing owned compatibility read, NC-P08-053 | canonical env wins; resolver/test are allowlisted; retirement remains Phase-15 review |
| application `fingerprint` cluster | persisted level-identity boundary, NC-P15-004 | includes typed locals/ports, `LevelRatingState.fingerprint`, duplicate-check shapes, Firestore document IDs, and existing `levelFingerprint` fields; no mass rename is safe |
| `KnownSolutionLabel.family`, `families`, `familyIds` | legitimate **solution-path family** concept; bounded retained short members | distinct from level/attempt/search families; permanent vocabulary authority now names the concept instead of inventing an implementation rename |
| hot-path `profile: ScoringProfile` parameters | type-disambiguated local/positional exemption | caller API and behavior are unaffected by parameter spelling; generated/exported ambiguous fields remain required to qualify |
| CP-SAT `oracle-shards`, `oracleLabel`, `oracleReason`, `oracle-abstain`/`oracle-unknown` and related historical result consumers | generated/workflow compatibility boundary, NC-P15-005 | current tool/workflow display is `reference`; schema/job migration requires normalization and historical fixtures |
| `atlas-abstain` input/default discovered by 8B | retained functional historical enum pending the same CP-SAT boundary design (NC-P15-005) | not the renamed atlas collector identity; changing it alone would break workflow input compatibility |
| deterministic `producer-population-pilot` and `repair-rollback-census-pilot` seed strings | permanent behavior-sensitive exemption | spelling participates in deterministic sample selection; renaming would violate Phase-8 behavior preservation |
| `second-order-analysis.*` generated title/path and `renderTechniqueCensusSecondOrder` | retained methodological/persisted report identity | live default reader and committed run directories own it; “second-order” remains valid methodology vocabulary |
| `structuralWinningFamilies`/`structuralFamiliesAroundCutoff` | outside the `winning lineage` migration and semantically valid historical generated fields | these describe winning structural families, not the renamed observer/tool concept; no unsupported migration is inferred |
| frozen reports, archived snapshots, old workflow runs, dated filenames | frozen history | remain excluded from live vocabulary bans as required by the standing authority |
| `atlas-eligibility.mjs` and `selectEligibleAtlasLevels` shared by prune-gap collection and CP-SAT hint harvest | deferred shared-library migration, NC-P15-006 | batch 8E explicitly excluded it; rename consumers together after fixing the canonical target |
| shared `--atlas-dir`, `ATLAS_DIR`, `atlasDir`, and `atlasFiles` CLI/report boundary | deferred compatibility migration, NC-P15-007 | dual-read CLI/schema design is required across offline replay and must-crossing analysis |
| Batch-8E pre-rename `atlas-sweep-shard-*` workflow artifacts | frozen old workflow-run identity | backfill remains a manual historical-run exception; new runs use canonical artifacts |
| Batch-8F `wide-shard-*` logs | outside the targeted vocabulary mapping | contains neither `trove` nor an ambiguous lifecycle label; no migration is justified |
| Batch-8G future-phase preparation/boundary snapshots | retained point-in-time authorities | their own scopes require implementation-time delta reconciliation; Phase 8 must not rewrite their evidence base |
| Batch-8G `.solver-tools` bundles | outside tracked source | ignored rebuildable cache, regenerated from current entrypoints |
| `logs/local-direct/.audit-export-tmp.json` | unrelated retained scratch artifact | not a writer path, workflow artifact, or live interface; do not manufacture a migration solely from its orphaned filename |

The application audit confirmed that naked `fingerprint` is not one uniform contract: some occurrences
are locals, some are exported callback/state/return-shape fields, some are Firestore document IDs,
and `levelFingerprint` is already a distinct stored query field. NC-P15-004 intentionally owns the
whole boundary so a future pass cannot rename only its cosmetic half. The CP-SAT audit likewise
traced workflow `needs`, writer fields, combine-step counts, label values, and historical inputs;
NC-P15-005 owns them as one compatibility design.

## 2. Ledger-complete closeout coverage

`phaseCloseoutCoverage["8"]` now has exactly one entry for every Phase-8 ledger ID. Literal rows
derive their forbidden search directly from the row's immutable `old` value. Broad semantic rows use
a named targeted contract or retained/compatibility exemption instead of banning common English
words. `check-naming-cleanup-ledger.mjs` rejects a missing/extra classification, a coverage legacy
value that drifts from its ledger row, an invalid classification, or an unnamed semantic contract.
The closeout checker rejects unsupported contract names and pins representative retained boundaries.

The permanent literal coverage now includes the previously missed NC-P08-001, NC-P08-002, and
NC-P08-045 legacy identities (`solver-winning-lineage-survival-analysis.md`,
`analyze-lineage-mechanics.mjs`, and `.github/workflows/cpsat-explicit-prefix-oracle.yml`) without
adding another manually curated mapping list. The negative-fixture test proves missing metadata,
ledger/coverage drift, and an injected NC-P08-002 legacy string all fail.

## 3. Why Phase 8 remains complete

NC-P08-007 through NC-P08-009 and NC-P08-019 are now read narrowly: they completed the current
surfaced/ambiguous contracts authorized in 8H/8F, while precise retained boundaries are exceptions
or later rows. NC-P08-046 completed the workflow/tool display migration, while NC-P15-005 owns the
separate generated schema/job contract. No genuine unimplemented requirement remains silently under
a `done` row. The implementation history is therefore unchanged, and Phase 8 remains complete with
a stronger meaning: all 68 rows have machine-visible closeout coverage and every live exclusion has
a semantic, compatibility, frozen, behavior-sensitive, out-of-program, or future-row owner.

## 4. Validation evidence

The final validation section is updated only with commands actually run on this branch. Required
finish-line commands and the final adversarial census are recorded after execution; failures are not
converted to `not-applicable`. Dedicated compatibility checks include the variant-family dataset
root resolver, experiment-manifest/family-index readers, known-solution-prefix survival tests, and
the new closeout negative fixtures.

### Executed validation (final)

- `npm run check` — pass, including types, documentation links, workflow structure, ledger contract,
  corpus formatting/validity, and all validators.
- `npm run test:node` — pass, including the closeout checker and its three negative fixtures.
- `npm run test:coverage` — pass: 108 files / 1,336 tests; 86.98% statements, 79.14% branches,
  94.12% functions, and 92.42% lines.
- `npm run check:naming-cleanup-ledger` — pass with 68/68 Phase-8 closeout classifications.
- `npm run naming:surface-inventory -- --compact --phase=8` — pass; 68 rows inventoried.
- `npm run check:naming-cleanup-phase8-closeout` — pass across 678 maintained text surfaces.
- `node scripts/validate-variant-family-dataset-worktree-node-test.mjs`,
  `node scripts/experiment-manifest-lib-check.mjs`, `node scripts/family-index-lib-check.mjs`, and
  `npx vitest run modules/solver/known-solution-prefix-survival.test.ts` — pass.

The final adversarial search rechecked trove, CP-SAT oracle fields/values/job IDs, atlas-abstain,
second-order analysis identities, and structural winning-family fields. Every current hit falls under
NC-P15-001/002/003/005, NC-P08-053, the behavior-sensitive/methodological/generated-field
retentions in Section 1, or naming-checker self-description. No unclassified live hit remained.

## 5. Review follow-up hardening

The follow-up review tightened three parts of the first amendment implementation:

1. NC-P08-044 and NC-P08-046 no longer use ineffective literal searches for descriptive ledger
   prose. They are row-bound semantic contracts that assert the canonical prune-gap workflow
   name/concurrency identity and CP-SAT reference workflow/run/job display while separately
   preserving the `oracle-shards` compatibility job ID.
2. The closeout checker binds every semantic contract ID to its authorized ledger row(s), so moving
   a valid contract name onto an unrelated row fails instead of receiving accidental coverage.
3. Phase-15 deferred rows now carry exact `inventoryTerms`; the surface inventory consumes and
   validates them, and its permanent range test covers Phases 8–15. All five deferred boundaries
   resolve to `old-live` with concrete current files; the artifact row includes a workflow category
   and the fingerprint row includes an application category. This replaces description-only future
   rows that the inventory could not connect to live surfaces.

The injected-legacy negative fixture now supplies every targeted contract file and asserts that no
missing-contract noise occurs, proving NC-P08-002 fails for the intended ledger-derived reason alone.
`npm run check`, the ledger check, closeout check, closeout negative fixtures, and the Phase 8–15
surface-inventory test all pass after these corrections.

## 6. Semantic-exemption expansion guard

A further adversarial review found that merely asserting representative retained fields existed did
not prevent the exemptions from expanding silently. The closeout checker now fixes the complete
16-file application/Firestore fingerprint cluster and fails both an unapproved new file and a stale
file entry. It also checks source TypeScript declarations so a new naked `profile?: string`,
`family?: string`, or `residual` field cannot hide behind the broad Phase-8 semantic rows. Typed
`profile: ScoringProfile` declarations remain allowed by rule; the sole naked string profile is the
documented read-only historical-attempt adapter in `hint-provenance.ts`; solution-path family fields
remain bounded to `known-solution-prefix-survival.ts`.

The negative-fixture suite now independently injects an out-of-cluster application fingerprint, an
unclassified naked profile field, and an unclassified naked family field and verifies each fails for
its intended reason. This makes the exemption definitions enforceable against accidental future
growth rather than merely documenting today's examples.

## 7. Remove duplicate migration knowledge

The exact legacy checks originally added alongside the ledger-derived loop duplicated most of the
same Phase-8 mappings. They have now been removed. Literal legacy identities come only from each
ledger row's `old` value; the small remaining manual patterns are broader semantic residue sweeps
whose live exceptions need path-level classification (trove, behavior-sensitive seed strings,
dated winning-prefix artifacts, and receptor terminology). The fingerprint cluster's 16 paths also
moved from checker source into NC-P08-008's `phaseCloseoutCoverage` metadata. The ledger validator
requires those retained-boundary paths to be unique and present, and the closeout checker consumes
that list directly. This leaves the ledger as the migration-coverage authority rather than keeping a
second exact-name catalog in JavaScript.

The same single-source rule now covers the three compatibility exceptions. NC-P08-024,
NC-P08-025, and NC-P08-053 enumerate their owning files in ledger coverage metadata; the checker
derives both token patterns and allowed locations from those rows. The ledger validator requires
every compatibility exemption to have a non-empty, unique, existing file list. Consequently the
solver-diagnostics historical fields and legacy dataset-root environment variable no longer depend
on a separate JavaScript compatibility allowlist.

Finally, the other live exclusions discovered across 8A–8H now live in
`phaseRetainedSurfaces["8"]`, each with an immutable retained-surface ID, exact terms/files, owner,
and lifecycle. This registry covers the trove family, dated winning-prefix input, deterministic
producer/rollback seed strings, persisted second-order report identity, structural winning-family
fields, CP-SAT oracle result/job fields and values, and the `atlas-abstain` workflow enum. The
closeout checker derives scoped residue checks from this registry, while the ledger checker rejects
missing paths, duplicate IDs/term-file ownership, or absent owner/lifecycle text. A negative fixture
also proves that adding `oracleLabel` outside NC-RET-P08-007's files fails.

Each retained registry entry is now linked back to one or more owning Phase-8 coverage rows through
`retainedSurfaceIds`. Both validators enforce the relationship in both directions: an unknown
reference fails, and a registry entry with no Phase-8 owner fails. The negative fixtures remove the
CP-SAT retained entry while leaving its row reference in place and confirm the standalone closeout
checker rejects that accounting hole. Thus deleting a retained classification can no longer make
its scan disappear silently while leaving the ledger structurally valid.

The retained registry is term-specific rather than a term/file Cartesian product. Each `matches`
entry binds one legacy term to exactly the files that currently own that term; for example the
CP-SAT workflow may retain `oracleLabel` and `oracle-shards`, but not `oracleReason`. The negative
fixtures inject `oracleReason` into that otherwise-approved workflow and confirm it fails. This
prevents a broad multi-term registry entry from accidentally authorizing every retained term in
every file associated with the same compatibility boundary.

Retained ownership is also structured rather than discoverable only by parsing prose. Every
registry entry carries an `ownerClass` and `ownerRowIds`; validators require those IDs to exist and
to include at least one Phase-8 row, while deferred compatibility entries may additionally name
their Phase-15 owner. A negative fixture injects a nonexistent future owner and confirms the
standalone closeout checker fails. The human `owner` and `lifecycle` explanations remain for
readability, but machine validation no longer depends on interpreting them.

## 8. Genuine case-sensitive path omission

Re-reading every batch's out-of-scope section exposed one genuine live defect rather than a retained
vocabulary contract. Batch 8C had recorded one `modules/Solver.ts` import as unrelated, while the
current tree actually contained five such imports across the repair dump, CP-SAT explicit-prefix,
CP-SAT hint harvest, MiniZinc, and must-crossing analysis tools. The uppercase file does not exist;
the live TypeScript facade is `modules/solver.ts`. All five imports now use that exact casing. This
is the narrow safe correction already required by the plan's case-sensitive path completion rule,
not a solver rename or behavior change. The closeout checker now rejects `modules/Solver.ts`
anywhere in maintained surfaces, and a negative fixture proves the regression fails.

All five corrected entrypoints were passed through `buildBundle` from
`scripts/run-bundled.mjs`; esbuild resolved and produced each bundle successfully without executing
the expensive research command. The closeout checker, its negative fixtures, and lint also pass
after the correction.

The same batch-record reread found the two Batch-8E exclusions that the first accounting pass had
still missed. NC-P15-006 now owns the shared CP-SAT eligibility library/symbol migration, and
NC-P15-007 owns the persisted/shared atlas-directory CLI and generated-report fields. Their current
terms are registered as NC-RET-P08-009/010 with exact term/file ownership until Phase 15. This closes
the last execution-record `out of scope` items that represented live interfaces rather than frozen
history, behavior-sensitive seeds, methodology, or genuinely unrelated debris.
