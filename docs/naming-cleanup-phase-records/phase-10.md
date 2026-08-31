# Phase 10 implementation record: repair, hard-prune, and additive-budget terminology

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 10 |
| Status | merged-tree closeout state prepared in PR #1608; exact-head CI/merge are the remaining barrier |
| Base `main` SHA | `c7fcc35d3079ccbc511c92b1255e010adba2c35a` |
| Branch | `codex/implement-phase-10-of-naming-cleanup-process` |
| PR | `#1607` |
| Selected ledger rows | `NC-P10-001` through `NC-P10-008` |
| Highest risk | high (`NC-P10-006`) |
| Compatibility owner | stage-policy/report historical reader (`NC-P10-008`) |

The required preflight reported Phase 9 complete, Phase 10 next, and `activeExecution` idle. PR #1607 now carries this implementation branch. The first exact-head CI run exposed two sparse-checkout assumptions in the newly added completion evidence: the ledger checker used working-tree existence for registered current artifacts, and the Phase-10 negative fixture copied those artifacts directly from an intentionally sparse worktree. Both checks now use the repository/Git-object view already established for current-artifact scanning, so tracked live artifacts remain verifiable without forcing historical log trees into every CI checkout.

## 0.1 Combined-batch exception

The plan normally serializes live Phase-10 work as 10A then 10B with a merge barrier. This branch had already implemented both families together before PR review, so PR #1607 records the explicit one-time execution exception now documented in the plan rather than inventing two nonexistent merge barriers. The evidence remains separated by family:

- **10A repair/prune:** NC-P10-001 through NC-P10-004; completion-helper symbol/test seam, hard-prune module/import graph, current prose, and bound/reconstruction/pruning-order parity.
- **10B budget/time:** NC-P10-005 through NC-P10-008; multiplier constant, SolveOpts/local/worker/race transport, retained CLI/report-schema boundaries, and the already-canonical stage-policy historical-reader audit.

The exception does not close the phase. Exact-head CI is complete; a separate merged-tree consumer-inward closeout remains mandatory before Phase 10 can advance.

## 1. Latest-main reconciliation and change envelope

The live graph still matches the ledger. `closeLengthGap`, the `prune-gauntlet.ts` module, the repair additive-budget constant, the `SolveOpts` override, and the resolved multiplier all remained current. The canonical stage-policy value `additive-wall-multiplier` was already occupied by the same concept; no runtime legacy value or historical reader that parses it was found, so NC-P10-008 is verification-only and the old definition was not recreated.

The Section 4.9 time-unit rule was also reconciled rather than silently ignored: its concrete `timeLimit` -> `timeLimitMs` migration is ledger row NC-P07-012 and was already completed in Phase 7. The Phase-10 ledger contains no additional unsuffixed time-valued option/field migration, so this batch does not recreate or duplicate that earlier rename.

Intended deltas are names only. Solver eligibility, attempt order, random seeds, pruning decisions, wall/work allocation formulae, result ordering, errors, and persisted meanings remain invariant. Frozen dated reports, archived snapshots, logs, and historical result schemas were not rewritten.

## 2. Consumer-inward impact map

| Surface | Disposition | Evidence |
| --- | --- | --- |
| repair producer/test export | migrated to `searchCompletionFromPartialPath` | focused repair tests and current diagnostic importer |
| hard-prune owner/import graph | physical module and every current import migrated | TypeScript/lint plus direct solver tests and bundled probe imports |
| budget definition/resolution | constant, `SolveOpts`, stage plan, orchestration local migrated | stage-budget/orchestration tests |
| parent/worker/race transport | canonical field forwarded through both reconstruction hops | real portfolio worker -> nested race repair-allocation fixture |
| CLI/report schema | retained distinct compatibility surface | `--repair-budget-fraction` and persisted `repairBudgetFraction` remain input/report identities; they translate into the canonical internal option and are not NC-P10-006/007 |
| stage-policy historical read | permanent obligation, no live reader found | repository census; canonical runtime definition remains unchanged; targeted validation and behavioral parity are `not-applicable` rather than fabricated |
| current docs/comments | migrated | documentation-link check pending aggregate gate |
| frozen evidence | retained | `reports/`, `logs/`, and `docs/archive/` preserve historical spellings |

## 3. Validation topology and parity

- `npx vitest run modules/solver/stage-budget.test.ts modules/solver/orchestration.test.ts --reporter=dot`: 142 tests passed; allocation resolution and behavior-sensitive orchestration remained green.
- `npm run test:portfolio-solve-sweep-worker`: 5 tests passed, including explicit canonical override through parent -> forked worker -> nested race and real repair allocation without sibling substitution.
- `npm run test:race-stage-parity`: 3 tests passed; canonical constant ownership and stage subset parity remain intact.
- `npm run check:types` and `npm run check:lint`: passed.
- `npm run test:naming-cleanup-phase10-closeout` and `npm run check:naming-cleanup-phase10-closeout`: passed. Negative fixtures reject stale legacy transport, missing propagation, sibling substitution, unowned resolved-local residue, and an unowned legacy stage-policy spelling.
- Exact-head GitHub `CI` run #3397 (`33352943695`) completed successfully on `5c269519144cdf297d63707e4530495367ff820c` before the review-hardening follow-up commits.

Before/after parity is semantic rather than a changed fixture: only identifiers/import paths changed, while the existing executable assertions still prove the same numeric multiplier, zero-override suppression, worker/race allocation, stage eligibility, and 142 orchestration/budget outcomes.

## 4. Residue and lifecycle classification

The closeout guard scans maintained source, scripts, tests, workflows, and current docs without blanket-excluding mixed current/history roots. It rejects the five direct retired live spellings and requires the canonical repair, prune, constant, parent-worker, and race surfaces. It also treats `repairBudgetFraction` and `additive-fraction` as semantic legacy spellings: the former is permitted only in the ledger-owned persisted report-schema files, while the latter has no live retained file allowance. Remaining legacy hits are restricted to naming authorities, frozen reports/logs/archives, and the explicitly owned compatibility boundaries described above.

## 5. Open merge barrier

- [x] implementation and targeted runtime validation completed locally;
- [x] durable negative closeout fixtures added;
- [x] PR #1607 created and bound to this implementation branch;
- [x] latest implementation head `31487748f987d63d335e783f7eb5045b3412c402` completed CI run #3403 / `33353826968` successfully;
- [x] implementation merged using expected head SHA as `4a03350967fcfe4d0d2e649d9c460a45e0085544`;
- [x] fresh merged-tree closeout branch/PR #1608 created directly from implementation merge `4a03350967fcfe4d0d2e649d9c460a45e0085544`;
- [x] closeout branch advances `lastCompletedPhase` to 10 and returns `activeExecution` to idle; this becomes authoritative only when PR #1608 merges green.

Until every unchecked item is complete, Phase 10 is not closed and Phase 11 must not begin.

## 6. Review follow-up

A clean `npm run ci:fast` review run found two gaps that the earlier interrupted aggregate run had
hidden. The solver-budget debt ratchet still allowlisted the retired resolved-local spelling, so the
rename looked like a new wall-derived allocation site; its allowlist now follows the canonical local.
The real worker/race sentinel also assumed at least 1.5 seconds of the 3-second repair allocation
would remain after dispatch. Parallel CI can legitimately spend more than that before repair starts,
so the assertion now requires a positive remainder no greater than the supplied allocation. The
structural assertions in the same test still separately reject missing propagation, while the
closeout negative fixtures reject stale and sibling-substituted fields.

## 7. Current-artifact and sibling-surface review

The follow-up consumer audit found that the first closeout guard excluded all of `logs/` and
`reports/` by directory. That was too coarse: the two maintained stress baselines are current
artifacts and still taught the retired constant. They are now registered under
`phaseCurrentArtifacts["10"]`, migrated to the canonical constant, and read through the
repository/Git-object helper so sparse CI checks the tested blob. A negative fixture reintroduces the
legacy constant into a registered artifact and proves closeout fails.

The audit also separated NC-P10-007's resolved internal local from two distinct surfaced contracts
that Phase 10 does not authorize changing: `--repair-budget-fraction` is an external CLI input and
`repairBudgetFraction` is a persisted sweep-report field read by the report combiner. Both now have
machine-readable retained-surface ownership and lifecycle records rather than relying on an implicit
allowlist. Current solver authorities no longer use the retired local spelling. The ledger checker
requires all eight Phase-10 closeout coverage entries, both retained boundaries, and a non-empty
current-artifact registry, with negative fixtures for missing coverage and blanket artifact omission.

## 8. PR CI follow-up

The first PR CI run (`CI` run 33352369366) had build, lint, coverage, and heavyweight proofs green. Its two failing jobs shared evidence-layer causes rather than solver behavior: `check:naming-cleanup-ledger` rejected `phaseCurrentArtifacts["10"]` because sparse checkout intentionally did not materialize the baseline JSON files, while `test:naming-cleanup-phase10-closeout` attempted to `cpSync` the same absent worktree paths. The ledger checker now resolves registered paths through `repositoryPathKind()`, and the Phase-10 fixture materializes tracked artifact text through `readRepositoryText()`. This preserves the CI sparse-checkout policy while making current-artifact ownership genuinely repository-aware.

## 9. Independent review hardening follow-up

A post-green review found that NC-P10-007 and NC-P10-008 were documented as semantic contracts but were not mechanically residue-checked by the Phase-10 closeout script. That meant a stray live resolved-local `repairBudgetFraction` or `additive-fraction` spelling could theoretically survive while CI stayed green. The guard now derives allowed `repairBudgetFraction` file ownership from `phaseRetainedSurfaces["10"]`, rejects the spelling everywhere else in maintained/current-artifact surfaces, and rejects live `additive-fraction` outright outside excluded naming/history authorities. Negative fixtures cover both failure modes. Because this hardening changed the PR head after run #3397, the new head requires a fresh exact-head CI run before merge; the merge barrier above should be read against the latest head, not the earlier reviewed SHA.

## 10. Merged-tree closeout

Implementation PR #1607 merged from exact green head `31487748f987d63d335e783f7eb5045b3412c402` as `4a03350967fcfe4d0d2e649d9c460a45e0085544`. The required merged-tree closeout starts directly from that commit on branch `chatgpt/phase10-merged-tree-closeout-2026-08-30`.

This closeout is evidence-only. It must not change solver behavior, resource allocation, canonical names, compatibility policy, or current artifacts. Its job is to rerun the Phase-10 consumer-inward residue/ownership guard, the ledger contract and negative fixtures, the real worker/race transport tests, and aggregate CI against the tree that actually landed on `main`. Once its exact final head is green, the ledger may mark NC-P10-001 through NC-P10-008 done, set every remaining Phase-10 closeout verification dimension to done, record the structured Phase-10 closure, advance `lastCompletedPhase` to 10, and return `activeExecution` to idle. Phase 11 must not begin before this closeout PR itself merges.

### Closeout PR state

PR #1608 is the Phase-10 merged-tree closeout. Its diff is intentionally limited to closure/evidence state. The ledger records Phase 10 as closed on this branch so the contract checker can validate the final intended repository state; that state is not authoritative on `main` until #1608's exact final head completes CI successfully and the PR merges. If CI finds any consumer residue, ownership mismatch, ledger inconsistency, or runtime regression, Phase 10 remains open and this closure state must be repaired before merge.
