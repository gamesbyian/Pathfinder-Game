# Phase 10 implementation record: repair, hard-prune, and additive-budget terminology

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 10 |
| Status | implementation complete locally; PR/exact-head CI/merged-tree closeout pending |
| Base `main` SHA | `c7fcc35d3079ccbc511c92b1255e010adba2c35a` |
| Branch | `codex/implement-phase-10-of-naming-cleanup-process` |
| PR | `#1607` |
| Selected ledger rows | `NC-P10-001` through `NC-P10-008` |
| Highest risk | high (`NC-P10-006`) |
| Compatibility owner | stage-policy/report historical reader (`NC-P10-008`) |

The required preflight reported Phase 9 complete, Phase 10 next, and `activeExecution` idle. PR #1607 now carries this implementation branch. The first exact-head CI run exposed two sparse-checkout assumptions in the newly added completion evidence: the ledger checker used working-tree existence for registered current artifacts, and the Phase-10 negative fixture copied those artifacts directly from an intentionally sparse worktree. Both checks now use the repository/Git-object view already established for current-artifact scanning, so tracked live artifacts remain verifiable without forcing historical log trees into every CI checkout.

## 1. Latest-main reconciliation and change envelope

The live graph still matches the ledger. `closeLengthGap`, the `prune-gauntlet.ts` module, the repair additive-budget constant, the `SolveOpts` override, and the resolved multiplier all remained current. The canonical stage-policy value `additive-wall-multiplier` was already occupied by the same concept; no runtime legacy value or historical reader that parses it was found, so NC-P10-008 is verification-only and the old definition was not recreated.

Intended deltas are names only. Solver eligibility, attempt order, random seeds, pruning decisions, wall/work allocation formulae, result ordering, errors, and persisted meanings remain invariant. Frozen dated reports, archived snapshots, logs, and historical result schemas were not rewritten.

## 2. Consumer-inward impact map

| Surface | Disposition | Evidence |
| --- | --- | --- |
| repair producer/test export | migrated to `searchCompletionFromPartialPath` | focused repair tests and current diagnostic importer |
| hard-prune owner/import graph | physical module and every current import migrated | TypeScript/lint plus direct solver tests and bundled probe imports |
| budget definition/resolution | constant, `SolveOpts`, stage plan, orchestration local migrated | stage-budget/orchestration tests |
| parent/worker/race transport | canonical field forwarded through both reconstruction hops | real portfolio worker -> nested race repair-allocation fixture |
| CLI/report schema | retained distinct compatibility surface | `--repair-budget-fraction` and persisted `repairBudgetFraction` remain input/report identities; they translate into the canonical internal option and are not NC-P10-006/007 |
| stage-policy historical read | permanent obligation, no reader found | repository census; canonical runtime definition remains unchanged |
| current docs/comments | migrated | documentation-link check pending aggregate gate |
| frozen evidence | retained | `reports/`, `logs/`, and `docs/archive/` preserve historical spellings |

## 3. Validation topology and parity

- `npx vitest run modules/solver/stage-budget.test.ts modules/solver/orchestration.test.ts --reporter=dot`: 142 tests passed; allocation resolution and behavior-sensitive orchestration remained green.
- `npm run test:portfolio-solve-sweep-worker`: 5 tests passed, including explicit canonical override through parent -> forked worker -> nested race and real repair allocation without sibling substitution.
- `npm run test:race-stage-parity`: 3 tests passed; canonical constant ownership and stage subset parity remain intact.
- `npm run check:types` and `npm run check:lint`: passed.
- `npm run test:naming-cleanup-phase10-closeout` and `npm run check:naming-cleanup-phase10-closeout`: passed. Negative fixtures reject stale legacy transport, missing propagation, and sibling substitution.

Before/after parity is semantic rather than a changed fixture: only identifiers/import paths changed, while the existing executable assertions still prove the same numeric multiplier, zero-override suppression, worker/race allocation, stage eligibility, and 142 orchestration/budget outcomes.

## 4. Residue and lifecycle classification

The closeout guard scans maintained source, scripts, tests, workflows, and current docs without blanket-excluding mixed current/history roots. It rejects the five retired live spellings and requires the canonical repair, prune, constant, parent-worker, and race surfaces. Remaining legacy hits are restricted to naming authorities, frozen reports/logs/archives, and the intentionally distinct persisted/CLI `repairBudgetFraction` spelling described above.

## 5. Open merge barrier

- [x] implementation and targeted runtime validation completed locally;
- [x] durable negative closeout fixtures added;
- [x] PR #1607 created and bound to this implementation branch;
- [ ] exact-head GitHub CI completed green;
- [ ] implementation merged using expected head SHA;
- [ ] fresh merged-tree closeout branch/PR completed;
- [ ] `lastCompletedPhase` advanced to 10 and `activeExecution` returned to idle.

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
