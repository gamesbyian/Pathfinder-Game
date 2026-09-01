# Phase 15 post-completion hostile-audit repair

Status: **repair implementation on PR #1649; original Phase-15 execution record remains frozen**

This record is a post-seal correction to the completed naming program, not Phase 16 and not a new
rename batch. The original Phase-15 execution/closeout record remains immutable historical evidence
for what was believed complete at seal time. This document records defects discovered only by a
fresh hostile audit of the sealed `main` tree and the additional proof machinery added in response.

## 1. Repair identity

| Field | Value |
| --- | --- |
| Audited/sealed base `main` | `221dda339968612af1ceb340a210ce3b35e28a06` |
| Repair branch | `chatgpt/post-phase15-audit-repairs-2026-08-31` |
| Repair PR | **#1649** |
| Scope | post-completion correctness/proof repair only; no solver-policy change |
| Original Phase-15 authority | `docs/naming-cleanup-phase-records/phase-15.md` (frozen) |

A narrow post-merge evidence seal should record PR #1649's immutable final head, successful CI and
specialized proof runs, and merge commit after this repair actually merges. That second step avoids
making this implementation PR describe its own not-yet-known merge commit.

## 2. Hostile-audit findings repaired here

### F15P-001 — Phase-8 dataset-root transition survived its Phase-15 retirement gate

`NC-P08-053` still accepted the retired dataset-root environment spelling after
`retireWhen: phase-15-review` had elapsed. Worse, Phase 15J's retained-surface authority already
described that input as retired/rejection-only while the production resolver and its test still
accepted it.

Repair:

- remove the legacy environment fallback from
  `scripts/validate-variant-family-dataset-worktree.mjs`;
- keep only explicit `--root`, canonical
  `PATHFINDER_VARIANT_FAMILY_DATASET_ROOT`, then the ordinary default;
- change NC-P08-053 to `persistence: none` with no compatibility object;
- remove NC-P08-053 from the retained historical-family-data owner set;
- retain the old spelling only as immutable ledger history and drive the rejection fixture from that
  ledger row rather than embedding the retired token in current source.

### F15P-002 — terminal compatibility retirement was not machine-enforced

The ledger checker knew what `phase-15-review` meant syntactically but did not fail a completed
program that still carried such a dual-read. Consequently an elapsed transition could survive while
all terminal checks remained green.

Repair:

- terminal ledger validation now rejects every Phase-8+ `dual-read` whose
  `compatibility.retireWhen` is `phase-15-review` once Phase 15 is complete;
- the ledger self-test mutates NC-P08-053 back into that invalid terminal state and proves rejection;
- `check:naming-cleanup-final-state` independently pins NC-P08-053 as canonical-only and checks the
  current resolver contains no retired environment literal.

### F15P-003 — NC-P15-004 had never met its required Firestore proof topology

Phase 15 explicitly required identity parity through the real repository/Firestore boundary. The
sealed implementation had strong byte/path/unit assertions but no emulator-backed execution of the
actual repositories and rules.

Repair:

- add `scripts/firestore-level-fingerprint-boundary-test.mjs`;
- add the path-scoped `firestore-level-fingerprint-boundary.yml` workflow;
- execute real Firebase Firestore repositories against the local emulator with mock authenticated
  admin/player contexts and the repository's real security rules;
- prove:
  - rating document ID equals the exact computed level fingerprint;
  - a legacy fingerprint-keyed rating remains readable;
  - submission writes keep `levelFingerprint` and `fingerprintVersion` canonical with no generic
    `fingerprint` field;
  - legacy-fingerprint submission evidence remains discoverable through structural duplicate
    fallback while the returned identity is the current fingerprint;
  - local-level-hint collection paths use the exact current fingerprint and round-trip through the
    real repository;
- keep `scripts/firestore-rules-test.mjs` as the cheap structural authorization layer rather than
  representing it as the persistence-boundary proof.

The emulator workflow pins Node 20 and Java 21 because the current Firebase emulator CLI requires a
modern Java runtime.

### F15P-004 — the strongest hostile closeout check stopped being executable after completion

The dedicated 15I script had found seventeen implementation/control-plane defects, but its lifecycle
assertions allowed it to run only while batch 15I was active. 15J then removed the dedicated
workflow, leaving narrower permanent guards.

Repair:

- make `scripts/naming-cleanup-phase15i-closeout.mjs` support both historical active-15I mode and
  terminal-complete mode;
- in terminal mode expect only permanent historical readers NC-P15-002/003/012 to remain mixed;
- require the former transition aliases NC-P15-001/011 to be fully retired;
- keep the complete Phase-1-15 reconciliation, executable-surface scan, authority audit, frozen-blob
  check, and compatibility-owner proof;
- expose `check:naming-cleanup-hostile-ratchet` and run it permanently in `test:node`.

### F15P-005 — Phase-15H had not executed both renamed report producers

The Phase-15H smoke executed `offline-replay-harness.mjs` but only source-inspected
`mc-crossing-slack-analysis.mjs`.

Repair:

- make the crossing producer avoid an unnecessary Corpus-2 load when its selected prune-gap
  directory is empty;
- execute the real crossing producer from the Phase-15H Node smoke with an empty temporary
  prune-gap directory and a zero-level published prefix population;
- assert its emitted metadata uses `pruneGapDir` / `pruneGapFiles` and emits no retired report
  field names.

This changes no ordinary non-empty analysis behavior; it removes a needless data dependency from the
empty-input wiring smoke.

### F15P-006 — workflow-owned 15E/15G contracts had stronger source checks than executable wiring proof

The implementation had executable underlying tools plus structural workflow checks, but Phase 15's
hardened standard required the workflow argument/result path to be exercised through a representative
workflow or faithful executable harness.

Repair:

- 15E's real merger fixture now continues through the exact canonical standard-result publication
  arguments used by `collect-variant-family-dataset.yml`, proving
  `variant-family-dataset-summary.md` -> canonical source-run provenance -> standard
  `solver-sweep-result` publication;
- extract the CP-SAT explicit-prefix inline workflow combiner into
  `scripts/combine-cpsat-explicit-prefix-reference-shards.mjs`;
- keep the production workflow's actual `reference-shards` job and
  `needs: [plan, reference-shards]` dependency, but delegate result combination to that tested owner;
- extend the real one-case 15G writer smoke through writer -> shard artifact -> production combiner
  -> standard result publisher, preserving schema-v2/reference-only output and alarm semantics.

These harnesses deliberately do not launch the expensive full research campaigns.

## 3. Residual semantic risk deliberately not rewritten

NC-P15-003's family-index discovery uses canonical-per-corpus precedence: once canonical
`variant-family-dataset-attempts-*` files exist for a corpus, historical
`wide-trove-attempts-*` aggregates for that corpus are not also parsed. The implementation/test
contract treats canonical aggregates as whole-corpus replacements, preventing double counting.

The retained research branch currently contains historical `wide-trove-attempts-*` aggregates but
no post-rename canonical attempt aggregates, so there is no authentic mixed-era production
population on which to prove that a future canonical aggregate subsumes every relevant historical
row. This repair does **not** invent a union/deduplication rewrite in the absence of evidence.
Before the first canonical aggregate is relied on for decision-bearing mixed-era family analysis,
verify the whole-corpus supersession invariant or amend discovery to a proven logical-row dedupe.

## 4. Validation topology

The repair must be considered complete only when the final PR head passes:

- ordinary six-job PR CI;
- the permanent `check:naming-cleanup-hostile-ratchet` inside `test:node`;
- `check:naming-cleanup-final-state` and ledger negative fixtures;
- Phase-8 and Phase-15B-H closeout guards;
- the dedicated Firestore level-fingerprint emulator workflow;
- the existing Phase-11 browser characterization workflow;
- documentation/workflow-path validation.

Earlier red runs on this PR are part of the audit trail, not hidden failures. The first emulator run
failed before repository execution because the runner's default Java was too old; the workflow was
hardened with Java 21. A later CI run correctly rejected a retired-token fixture, an unclassified
raw-wire test, and an uncatalogued workflow; those were repaired without weakening the corresponding
guards.
