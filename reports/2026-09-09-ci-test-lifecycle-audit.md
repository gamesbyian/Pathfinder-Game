# CI test lifecycle hostile audit — 2026-09-09

> **Status:** concluded-positive
> **Last evidence:** 2026-09-09 — PR #1693 head CI run 34403154137 passed both lanes; universal `test:node` fell from a 38.7 s migration-dominated tail to 15.9 s.
> **Decision:** retire completed naming/resumption scaffolding from permanent CI while preserving live compatibility contracts under current owner-oriented tests.
> **Remaining gate:** none for this cleanup beyond normal PR review/merge.

This audit reviewed the permanent pull-request CI graph with a hostile lifecycle question: what current failure does each check protect, and does that failure still belong on every unrelated PR?

The main finding was completed-program scaffolding embedded in the universal gate. The repository-wide naming cleanup had finished through Phase 15, but its phase entry, closeout, ledger, inventory, hostile-ratchet, and post-naming resumption checks still ran perpetually. Several current compatibility/domain invariants were tangled into those migration-named tests; those invariants were retained under ordinary owner-oriented tests while the completed-program machinery was removed from the gate.

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
- the legacy latency portfolio report CLI test from the universal `test:node` population.

The historical migration scripts and records may remain in the repository for forensic/history use, but they no longer receive lifetime tenure as package-level CI commands merely because they once proved a migration step.

### Durable invariants retained under current owners

Migration-era tests that still protected live behavior were rewritten/re-homed as ordinary current contracts:

- `variant-family-dataset-root-node-test.mjs`: canonical dataset-root CLI/path semantics and explicit rejection of the retired external argument;
- `merge-variant-family-dataset-shards-node-test.mjs`: current family-dataset merge, stale-chunk cleanup, frozen historical evidence preservation, and standard publication;
- `cpsat-explicit-prefix-reference-pipeline-node-test.mjs`: current schema-v2 reference writer/combiner/publisher contract;
- `prune-gap-contract-node-test.mjs`: current prune-gap CLI/default/report vocabulary contract.

Other current historical-reader behavior remains covered by owner tests such as family-run-manifest normalization, technique-census identity normalization, hint-cost/config normalization, and family-index historical artifact discovery. These are retained because interpreting frozen historical evidence is still current functionality.

## Lifecycle guard

`scripts/check-package-scripts.mjs` now rejects completed/legacy campaign tasks if they are re-added to the permanent `check:validators` or `test:node` graph. It specifically blocks naming-program tasks, the completed solver-resumption bridge, and the legacy latency portfolio report test from universal CI.

The intended rule is: historical tooling may remain available on demand, but a permanent PR-gate test must protect a current invariant under a current owner-oriented name. A new campaign test does not become immortal merely by once being added to `test:node`.

## Measured runtime effect

PR #1693 head run **34403154137** passed both CI lanes. The universal Node/CLI step ran from 20:49:23 to 20:49:39, with `hint-workbench` becoming the tail at 15.9 seconds. Against the baseline 38.7-second naming-ratchet tail, that is about a **59% reduction in `test:node` wall time**.

The generic non-lint validator population also completed in about 13.2 seconds after the migration-specific fan-out was removed. Deep verification remained unchanged and green.

The audit deliberately does **not** remove the remaining current research-analysis tests merely because they are research tooling. Several are active infrastructure or encode still-used evidence/normalization contracts. Further demotion should be owner/dependency-specific rather than another blanket purge.

## Separate performance finding

The total fast gate is now dominated elsewhere. Run 34403154137 again missed the exact runtime-data cache and spent about 37 seconds materializing the data tree before Node setup. Earlier PR runs with the same content key also missed and spent roughly 46–47 seconds there. This is independent of obsolete test retirement and is now the clearest next CI-runtime optimization target.
