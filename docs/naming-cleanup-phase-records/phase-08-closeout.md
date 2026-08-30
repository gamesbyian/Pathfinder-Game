# Naming-cleanup Phase 8 closeout record

## 0. Closeout identity

| Field | Value |
| --- | --- |
| Phase | 8 |
| Status | complete pending PR merge |
| Closeout branch | `chatgpt/naming-cleanup-phase8-closeout-2026-08-30` |
| Closeout PR | #1596 |
| Post-8H implementation merge | PR #1595, `d41204e42cbc99d779dd6fbc60483ea36a84a562` |
| Current-main audit-output follow-up included by PR merge tree | `b3541afd2f143ee639a652a6f079d8dd6eec41bb` |
| Batches | 8A through 8H, all recorded merged |
| Closeout audit | `npm run check:naming-cleanup-phase8-closeout` |
| Ledger transition | `lastCompletedPhase: 7 -> 8` in this closeout PR |

This record is the separate post-merge Phase-8-wide consumer-inward audit required by
`docs/naming-cleanup-phase-records/phase-08.md`. It does not replace the eight batch records.
Each batch record remains the evidence authority for its own implementation and behavioral-parity
proofs.

## 1. Merge completion

All eight Phase-8 implementation batches are durably merged:

| Batch | PR | Merge commit |
| --- | ---: | --- |
| 8A | #1586 | `417da078cd80be52ed0f152bdeb8fe707e1e9c35` |
| 8B | #1587 | `4a79b6950ee0747562326ca02d93862598ece056` |
| 8C | #1588 | `e6a385a554ff176c90265f479559562afd9852fd` |
| 8D | #1589 | `00640674ad1013c871456e5c94991045a8baef2f` |
| 8E | #1590 | `30cff381a969b6c6ce4d77c8e04691825381d3af` |
| 8F | #1593 | `031defe35abf90e3929632b939c5cce10d8ae913` |
| 8G | #1594 | `becf26b75418c42c9ee34499662c9d9c4ed9e2f4` |
| 8H | #1595 | `d41204e42cbc99d779dd6fbc60483ea36a84a562` |

The closeout branch explicitly records 8H's merge barrier in
`docs/naming-cleanup-ledger.json` before advancing the phase.

## 2. Consumer-inward audit method

The closeout adds `scripts/naming-cleanup-phase8-closeout.mjs`, enrolled in the permanent
`test:node` aggregate as `check:naming-cleanup-phase8-closeout`.

The checker walks maintained live code, scripts, current documentation, package metadata, and
workflow YAML. It fails on Phase-8 legacy filenames, package aliases, symbols, and terminology
unless the hit belongs to an explicitly classified frozen/history or compatibility owner.

The audit deliberately excludes the naming authorities and historical batch records themselves.
Those documents necessarily contain old -> new mappings and therefore cannot be treated as live
consumer residue.

For the broad 8H rows (naked `profile`, `fingerprint`, `family`, and `residual`), the checker
uses targeted migrated-contract assertions rather than banning ordinary English/local variables
repo-wide. The 8H batch record remains authoritative for the intentionally retained typed
`profile: ScoringProfile` hot-path parameters, the separate persisted application/Firestore
`fingerprint` identity cluster, and `KnownSolutionLabel.family`'s distinct structural-solution
family concept.

## 3. Findings and classification

The first execution of the new checker intentionally used a strict, under-classified baseline. It
reported 35 hits. Reviewing them consumer-inward found no new Phase-8 runtime regression. They
resolved into these classes:

1. **Frozen/historical identifiers still referenced by a live reader or workflow.**
   - The CP-SAT explicit-prefix reference workflow still defaults to the dated
     `reports/stress/winning-prefix-atlas-pilot-2026-08-11.json` artifact.
   - `modules/solver/repair-search.ts` cites a dated producer-population experiment/report in
     explanatory history.
   These are explicitly preserved by the 8B/8C batch records.

2. **Behavior-sensitive deterministic seed strings.**
   - `producer-population-pilot` in
     `scripts/stress/compare-search-producer-populations.mjs`.
   - `repair-rollback-census-pilot` in
     `scripts/stress/census-repair-rollback-windows.mjs`.
   Batch 8C deliberately preserved these because they seed deterministic sample selection; renaming
   them would change behavior.

3. **Owned compatibility reads.**
   - `PATHFINDER_VARIANT_TROVE` remains a fallback only in the variant-family dataset root
     compatibility owner (plus its contract test), with the canonical environment variable
     preferred and retirement deferred to Phase 15.
   - `knownHardCluster` and `recommendedGating` remain accepted only by the solver-diagnostics
     historical-report compatibility owner.

4. **Naming-program meta references.**
   Ledger/status/surface-inventory tests legitimately refer to legacy row names while validating
   the migration machinery. The live-consumer checker excludes those authorities/meta-tools rather
   than misclassifying its own search patterns as product residue.

5. **Explicitly retained `trove` interfaces from batch 8F.**
   A deliberately broader final `trove` sweep found three additional files beyond the initial
   allowlist. All were already documented 8F exclusions:
   - current `--trove-root` CLI spelling in `scripts/family-index.mjs` and its
     `docs/tooling-catalog.md` documentation;
   - the persisted family-run manifest field `trove` emitted by
     `scripts/collect-variant-family-dataset-shard.mjs`.
   The shared CLI and generated-schema identities are separate compatibility/persistence migrations,
   not authorization to rewrite them under NC-P08-019.

The checker also covers the 8F dated `wide-trove-*` report paths/schema consumers that remain live
only because current readers must continue to read historical data. These are explicitly owned
retentions, not unclassified current terminology.

## 4. Closeout tooling correction

The audit exposed one stale assertion in
`scripts/naming-cleanup-ledger-node-test.mjs`: after 8H merges but before
`lastCompletedPhase` advances, `naming:status --json` correctly reports:

- `nextPhase: 8`;
- `nextBatch: null`;
- `nextAction: "phase-closeout"`.

The old test assumed every incomplete Phase-8 state must name a batch. It is now generalized to
cover ordinary batch execution, the all-batches-merged phase-closeout state, and post-Phase-8
phases. This changes only the naming-program self-test, not application or solver behavior.

## 5. Validation evidence

Pre-finalization CI on PR #1596 established the closeout infrastructure against the actual PR merge
tree, including the current-main audit-output follow-up after #1595.

- CI run #3358: all six jobs passed after classifying the initial audit findings and fixing the stale
  status-test assumption: build, checks, checks-lint, node-tests, deep-proofs, deep-verification.
- CI run #3359: the intentionally expanded broad-term sweep found only the three additional
  documented 8F `trove` exclusions listed above; all non-node-test jobs that completed before the
  audit failure remained green.
- The final PR head after recording those exclusions and advancing `lastCompletedPhase` must pass
  the complete CI suite before #1596 merges.

Batch-level real-execution evidence remains in the 8A-8H records. In particular, the two
surface-inventory entries labelled `uncovered-by-known-ci` are not untested Phase-8 behavior:
8C directly exercised the repair race worker path and the symmetry-repair comparison against real
fixtures. The inventory label describes automatic topology discovery, while the batch record
contains the durable manual/real-execution proof.

## 6. Phase completion decision

The Phase-8 completion conditions are satisfied subject to the final closeout PR's required green CI:

- all 8A-8H batches are durably merged;
- every Phase-8 ledger row is `done` with its required verification record;
- the post-merge consumer-inward census has no unclassified live legacy surface;
- current package aliases, workflows, scripts, and current documentation use canonical Phase-8
  identities except for explicitly owned retained compatibility/persisted/historical interfaces;
- frozen historical evidence and behavior-sensitive seed identities remain unchanged;
- compatibility ownership is preserved for later retirement/review rather than prematurely deleted;
- the closeout audit is retained as a regression guard in `test:node`.

Accordingly this PR advances `lastCompletedPhase` to **8**. Phase 9 becomes the next incomplete
phase after #1596 merges.
