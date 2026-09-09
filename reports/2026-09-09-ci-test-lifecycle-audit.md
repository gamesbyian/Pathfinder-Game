# CI test lifecycle hostile audit — 2026-09-09

> **Status:** concluded-positive pending final-head CI
> **Last measured evidence:** 2026-09-09 — PR #1693 run 34403154137 passed both lanes after the first cleanup tranche; universal `test:node` fell from a 38.7 s migration-dominated tail to 15.9 s. A second high-confidence lifecycle tranche was then added and must be judged by final-head CI before merge.
> **Decision:** retire completed migration/campaign scaffolding from permanent CI and the maintained workflow surface while preserving live compatibility contracts under current owner-oriented tests.

This audit reviewed the permanent pull-request CI graph and maintained GitHub Actions surface with a hostile lifecycle question: what current failure does each check or workflow protect, and does that failure still belong on every unrelated PR or in the permanent Actions catalogue?

The main finding was completed-program scaffolding embedded in the universal gate. The repository-wide naming cleanup had finished through Phase 15, but its phase entry, closeout, ledger, inventory, hostile-ratchet, and post-naming resumption checks still ran perpetually. Several current compatibility/domain invariants were tangled into those migration-named tests; those invariants were retained under ordinary owner-oriented tests while the completed-program machinery was removed from the gate.

A second pass found the same lifecycle failure outside naming: frozen or explicitly closed research harnesses still rode the universal Node graph, and answered one-off workflows remained dispatchable after their owning reports had closed the question.

## Baseline evidence

Representative successful PR CI run: **34398971505** (2026-09-09).

The fast-gate Node/CLI population was tail-limited by completed naming work:

| Task | Observed duration |
| --- | ---: |
| `check:naming-cleanup-hostile-ratchet` | 38.7 s |
| `test:naming-cleanup-surface-inventory` | 36.3 s |
| `test:solver-research-resumption` | 33.2 s |
| `test:naming-cleanup-phase8-closeout` | 31.2 s |
| `check:naming-cleanup-phase9-closeout` | 30.9 s |
| `test:naming-cleanup-phase10-closeout` | 30.1 s |
| `test:naming-cleanup-phase9-command-smoke` | 29.8 s |
| `test:naming-cleanup-ledger` | 28.1 s |
| `test:naming-cleanup-phase8-cli-smoke` | 25.8 s |

The same PR also ran many naming closeout checks in `check:validators`, including Phase 11–15 closeouts, final-state/ledger/current-authority checks, and consumer-residue checks. Some closeout scripts therefore executed in both validator and Node-test populations.

This contradicted the repository hygiene rule that completed migrations leave a small current-invariant suite rather than replaying every phase closeout forever.

## Permanent-CI changes

### Retired from the universal gate

- all `naming-cleanup-*` phase entry/closeout/ledger/inventory/ratchet tasks;
- naming current-authority and consumer-residue campaign checks;
- the post-naming `solver-research-resumption` bridge;
- the legacy latency portfolio report CLI test;
- `test:elite-prefix-dfs-ab`, a scratch harness from a net-negative elite-prefix operator investigation whose uncontested retry descendant later recovered zero levels at both tested budgets;
- `test:zero-t1-production-calibration`, which explicitly analyzes a small frozen cross-revision population as observational development evidence rather than current-head capability;
- `test:analyze-repair-reconstruction-static-features`, an offline analysis over transcribed classifications from the closed/reopen-only repair-reconstruction recurrence line;
- `test:compare-repair-restart-continuation-population-cli`, whose underlying W-scale research line is closed in its tested forms and retained only for an explicit materially-new-evidence reopen.

The demoted package aliases remain available for intentional reruns. Their execution is no longer charged to every unrelated PR.

### Durable invariants retained under current owners

Migration-era tests that still protected live behavior were rewritten/re-homed as ordinary current contracts:

- `variant-family-dataset-root-node-test.mjs`: canonical dataset-root CLI/path semantics and explicit rejection of the retired external argument;
- `merge-variant-family-dataset-shards-node-test.mjs`: current family-dataset merge, stale-chunk cleanup, frozen historical evidence preservation, and standard publication;
- `cpsat-explicit-prefix-reference-pipeline-node-test.mjs`: current schema-v2 reference writer/combiner/publisher contract;
- `prune-gap-contract-node-test.mjs`: current prune-gap CLI/default/report vocabulary contract.

Other current historical-reader behavior remains covered by owner tests such as family-run-manifest normalization, technique-census identity normalization, hint-cost/config normalization, and family-index historical artifact discovery. These are retained because interpreting frozen historical evidence is still current functionality.

### Research tooling lifecycle classification

Cold/reopen-only tools are now called out in `scripts/tooling-lifecycle.json` instead of being indistinguishable from ordinary maintained research infrastructure. The second pass classifies the frozen zero-T1 calibration, repair-reconstruction static-feature analysis, elite-prefix A/B and retry validator, and the purpose-built repair-fallback-reserve selector as cold research. The executable files remain for provenance/reproduction without implying current priority or permanent CI entitlement.

## Workflow cleanup

The hostile pass also audited maintained Actions rather than limiting scope to PR CI.

Removed from `.github/workflows/`:

- `naming-cleanup-phase11-orientation.yml`: a completed Phase-11 browser characterization gate. Ordinary current orientation/editor behavior remains covered by the regular browser suites when needed; a completed migration phase does not need a permanent dispatch button.
- `solver-elite-prefix-dfs-retry-validate.yml`: explicitly self-described as a one-off fixed-20-level validation workflow. Its owning report records zero recoveries at both retry budgets and closes further investment in that form absent a materially different operator.
- `solver-repair-fallback-reserve-sample-ab.yml`: purpose-built for `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE`, whose authoritative opt-in ledger disposition is **CLOSED, SAFE BUT USELESS FOR TARGET**. The generic routing-regime and targeted-sweep infrastructure remain for future candidates rather than preserving a workflow around a closed flag.

Git history and the dated reports retain the experiment definitions/evidence; the maintained workflow catalogue now describes live entrypoints rather than serving as an executable archive.

## Lifecycle guard

`scripts/check-package-scripts.mjs` rejects completed/legacy campaign tasks if they are re-added to the permanent `check:validators` or `test:node` graph. It specifically blocks the repository-wide naming program, the completed solver-resumption bridge, and the legacy latency portfolio report test from universal CI; `scripts/tooling-lifecycle.json` supplies the broader classification surface for periodic hygiene to identify cold/completed tools before they acquire new permanent consumers.

The intended rule is: historical tooling may remain available on demand, but a permanent PR-gate test must protect a current invariant under a current owner-oriented name. A new campaign test or workflow does not become immortal merely by once being useful.

## Measured runtime effect

PR #1693 run **34403154137** passed both CI lanes after the first cleanup tranche. The universal Node/CLI step ran from 20:49:23 to 20:49:39, with `hint-workbench` becoming the tail at 15.9 seconds. Against the baseline 38.7-second naming-ratchet tail, that is about a **59% reduction in `test:node` wall time** before the additional second-pass demotions above.

The generic non-lint validator population also completed in about 13.2 seconds after the migration-specific fan-out was removed. Deep verification remained unchanged and green. Final-head CI is the authority for the complete two-tranche diff.

The remaining research-analysis tests were not blanket-purged. Active WS1/WS2 evidence tooling, current workflow contracts, historical-reader normalization used by current research, family/hint infrastructure, and static-portfolio tooling still relevant to the resumable-portfolio line retain ordinary coverage. Demotion requires a closed/reopen-only disposition or similarly concrete owner evidence, not merely the word “research.”

## Separate performance finding

The total fast gate is now dominated elsewhere. Run 34403154137 missed the exact runtime-data cache and spent about 37 seconds materializing the data tree before Node setup. Earlier PR runs with the same content key also missed and spent roughly 46–47 seconds there. This is independent of obsolete test retirement and is now the clearest next CI-runtime optimization target.
