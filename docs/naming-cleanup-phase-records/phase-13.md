# Phase 13 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 13 — normalized level metric fields |
| Current batch | 13A boundary preparation |
| Status | entry-mapped |
| Base `main` SHA | `efe94db31469f903a42b3921535beb32e1b785fb` |
| Branch | `chatgpt/phase13a-boundary-prep-2026-08-31` |
| PR | pending |
| Selected ledger row IDs | NC-P13-001 through NC-P13-004 |
| Reconciliation mode | full level-metric ownership census, because Phase 13 is high-risk and broad |
| Highest risk | high |
| Compatibility owner | raw/wire parser-writer boundary; raw `reqLen`/`reqInt` never retire |
| Canonical normalized fields | `requiredLength`, `requiredIntersections` |
| Implementation agent/session | ChatGPT GitHub session, 2026-08-31 |
| Closeout auditor | 13C distinct merged-tree pass required |

### Branch/PR authority preflight

- [x] current main is `efe94db31469f903a42b3921535beb32e1b785fb`;
- [x] Phase 12 is structurally closed and `lastCompletedPhase` is 12;
- [x] no open Phase-13 naming-cleanup PR was found;
- [x] no Phase-13 branch was found;
- [x] ledger `activeExecution` was idle;
- [x] this branch starts from the recorded current-main SHA.

## 1. Scope, change envelope, and stop conditions

Phase 13 changes only the **normalized/in-memory** challenge-metric field names. The historical wire
format is deliberately unchanged.

### Intended observable deltas

- NC-P13-001: normalized `reqLen` becomes `requiredLength`.
- NC-P13-002: normalized `reqInt` becomes `requiredIntersections`.
- NC-P13-003/004: raw serialized `reqLen`/`reqInt` remain the permanent wire spellings.
- 13A does not perform the rename. It makes raw-vs-normalized ownership executable and closes
  ambiguous classification before 13B.
- 13B performs the two normalized renames atomically.
- 13C audits the merged tree and proves raw compatibility/fingerprint parity.

### Invariants

- raw JSON, Firestore/editor export, corpus files, fixtures, and persisted fingerprints retain their
  existing wire semantics;
- raw input still accepts `reqLen`/`reqInt`;
- wire output still emits exactly `reqLen`/`reqInt`;
- canonical fingerprint bytes are unchanged for semantically identical levels;
- solver behavior, winning-path validity, budgets, scoring, and attempt ordering are unchanged;
- both metric fields travel together. No mixed normalized shape is allowed between batches.

### Stop conditions

- any second unowned raw-to-normalized compatibility boundary survives 13B;
- fingerprint bytes change for unchanged semantic input;
- a persisted/report schema would need renaming merely to make the normalized migration compile;
- a raw-vs-normalized script hit cannot be classified by dataflow;
- a behavior/resource-policy change appears necessary.

## 2. 13A current-main reconciliation

The preparation inventory already enrolled `check:level-metric-boundaries`, codec round-trip tests,
fingerprint parity, and representative maintained-corpus parsing. Current main still has:

- 6 explicitly raw/wire files;
- 87 files classified as normalized-runtime consumers;
- 94 files left ambiguous by the preparation census.

The 94-file set was re-read by dataflow. It contains raw corpus/report tooling, normalized solver
probes, current prose, retained report schemas, and a small genuinely mixed set. 13A replaces the
single ambiguous bucket with explicit ownership classes rather than guessing from directory names.

A critical current architecture detail is also recorded for 13B: `modules/solver/normalization.ts`
currently reads raw `reqLen`/`reqInt` directly while producing `NormalizedLevel`. That is a
second field-reading normalization boundary in addition to `modules/domain/level-codec.ts`.
13B must eliminate that duplicate metric boundary, preferably by delegating the metric read to the
canonical domain parser/projection while preserving solver normalization behavior. Do not simply
rename the raw reads.

## 3. 13A validation topology

| Surface | Existing proof | 13A requirement |
| --- | --- | --- |
| raw -> runtime -> wire metrics | `level-codec-roundtrip.test.ts` | retain and make future-name assertions explicit |
| fingerprint semantics | codec golden | retain byte/semantic parity |
| representative shipped/stress data | codec real-sample test + data smoke | retain |
| worker/manual transport | portfolio worker/race Node tests | record and preserve |
| raw-access ownership | `audit-level-metric-boundaries.mjs` | zero ambiguous files; explicit retained/mixed classes |
| negative architecture gate | none strong enough | make post-migration mode reject both normalized and mixed legacy classes |

## 4. Compatibility ownership

| Row | Legacy/raw form | Canonical runtime form | Owner | Retirement |
| --- | --- | --- | --- | --- |
| NC-P13-001 | `reqLen` | `requiredLength` | raw parser/wire writer only | raw form never retires |
| NC-P13-002 | `reqInt` | `requiredIntersections` | raw parser/wire writer only | raw form never retires |
| NC-P13-003 | `reqLen` wire | same | serialized data boundary | never |
| NC-P13-004 | `reqInt` wire | same | serialized data boundary | never |

## 5. Before-change parity baseline

- `parseRawLevel` carries raw `reqLen`/`reqInt` into the current runtime fields.
- `canonicalCloneLevel` preserves both values.
- `buildWireLevelData` emits exactly wire `reqLen`/`reqInt`.
- representative published/corpus1/corpus2 samples preserve both values and fingerprint source.
- portfolio worker tests prove changing only transported raw length/intersection requirements changes
  solve validity as expected.
- full CI on the Phase-12 final evidence main was green before Phase 13 entry.

## 6. 13A implementation log

The current-main ambiguous inventory was resolved file-by-file by dataflow rather than directory:

- 57 files are explicit raw/wire owners or raw-corpus tooling;
- 111 files are normalized-runtime/current-doc consumers that must lose legacy spellings in 13B;
- 4 files are explicitly mixed and require selective migration/reclassification:
  - `scripts/req-length-sweep-lib-node-test.mjs`
  - `scripts/req-length-sweep-lib.mjs`
  - `scripts/stress/query-mustcross-flipper-eligibility.mjs`
  - `scripts/stress/repair-plateau-rollout-classifier.mjs`
- 14 files are retained non-normalized uses such as naming authorities or independent report/analysis
  schemas, where `reqLen`/`reqInt` do not denote a `NormalizedLevel` property;
- `docs/history/**` is now treated as frozen history by the checker, matching `docs/archive/**`.

`docs/naming-cleanup-level-metric-boundaries.json` moved to schema version 2 and has zero
`ambiguousUnclassified` entries. The checker now understands all four live ownership classes and
`--require-normalized-clean` fails unless both normalized-runtime and mixed lists are empty.

No runtime field has been renamed in 13A.

## 7. 13A validation

Pending.

## 8. 13B atomic normalized migration

Not started. Must begin from merged 13A main, not this branch.

## 9. 13C merged-tree closeout

Not started. Must begin from merged 13B main.

## 10. Final closure

Phase 13 remains incomplete until 13C is merged, structured closure evidence is backfilled, and
`lastCompletedPhase` advances to 13.
