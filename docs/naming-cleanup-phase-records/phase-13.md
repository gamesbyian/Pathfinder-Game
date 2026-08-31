# Phase 13 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 13 — normalized level metric fields |
| Current batch | 13A boundary preparation |
| Status | 13A validated; merge pending |
| Base `main` SHA | `efe94db31469f903a42b3921535beb32e1b785fb` |
| Branch | `chatgpt/phase13a-boundary-prep-2026-08-31` |
| PR | #1620 |
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

The current-main inventory was resolved file-by-file by dataflow rather than directory. A second
inward pass then challenged the inherited `normalizedRuntimeConsumer` list itself. That caught an
important false premise: several tests appeared in the normalized bucket only because their **raw
wire fixtures** contain `reqLen`/`reqInt` before being passed through a parser. Requiring those
files to become textually clean would have rewritten the permanent wire-format fixtures Phase 13 is
supposed to preserve.

The refined 13A inventory is therefore:

- **79 raw/wire files**, including raw codec/fingerprint owners, raw-corpus tooling, and tests whose
  legacy spellings are deliberately raw fixture/output keys;
- **80 genuinely normalized/current consumers** that must lose legacy spellings in 13B;
- **13 explicitly mixed files** that contain both a normalized access and a separately retained
  raw/report spelling and therefore require selective migration/reclassification:
  - `modules/domain/domain.test.ts`
  - `modules/domain/level-codec-roundtrip.test.ts`
  - `modules/domain/level-codec.ts`
  - `modules/domain/level-schema.ts`
  - `modules/solver/admissible-order-search.test.ts`
  - `modules/solver/lower-bounds-test-support.test.ts`
  - `modules/solver/lower-bounds.test.ts`
  - `modules/solver/normalization.test.ts`
  - `modules/solver/normalization.ts`
  - `scripts/req-length-sweep-lib-node-test.mjs`
  - `scripts/req-length-sweep-lib.mjs`
  - `scripts/stress/query-mustcross-flipper-eligibility.mjs`
  - `scripts/stress/repair-plateau-rollout-classifier.mjs`
- **14 retained non-normalized uses**, such as naming authorities or independent report/analysis
  schemas where `reqLen`/`reqInt` do not denote a `NormalizedLevel` property;
- **0 ambiguous/unclassified files**.
- `docs/history/**` is treated as frozen history, matching `docs/archive/**`.

`docs/naming-cleanup-level-metric-boundaries.json` is schema version 2. The checker understands
all four live ownership classes and `--require-normalized-clean` fails unless both the normalized
and mixed lists are empty.

No runtime field has been renamed in 13A.

## 7. 13A validation

The first CI attempt was intentionally useful and failed on two preparation-contract issues, not
runtime behavior:

1. the new Phase-13 execution record itself contains legacy spellings as migration evidence and had
   not yet been classified as a retained naming authority;
2. `activeExecution.batch` was set to `13A`, but the maintained ledger status self-test reserves
   that machine field for Phase-8 batches. The Phase-13 substep identity now lives in this record and
   execution notes instead.

Both were repaired without touching runtime code.

Final preparation head `2cfc3a985735e1ec3fd1de9b816d7c78dc3f6e74` passed:

- ordinary CI run `33369137153`: checks, Node tests, build, lint, deep proofs and deep verification;
- Chromium orientation safety gate `33369137139`: success;
- `check:level-metric-boundaries`: 79 raw/wire, 80 normalized, 13 mixed, 15 retained,
  **0 ambiguous/unclassified**;
- TypeScript source and test type checks;
- documentation links, ledger contract, corpus/data validators and all prior-phase residue guards.

13A has therefore established the ownership map and stop gate needed for 13B. It does not resolve
any Phase-13 implementation/behavioral/closeout verification dimension other than
`surfaceInventory`.

## 8. 13B atomic normalized migration

Not started. Must begin from merged 13A main, not this branch. Entry gate:

- ownership inventory still has zero ambiguous files;
- `normalizedRuntimeConsumer` is the complete set that should lose legacy spellings;
- `mixedRawAndNormalized` receives selective edits and must be empty/reclassified before 13B
  closeout;
- raw/wire fixtures and independent report schemas are not mechanically rewritten;
- the duplicate raw metric read in `modules/solver/normalization.ts` is centralized into the
  domain codec boundary rather than legitimized as a second compatibility owner.

## 9. 13C merged-tree closeout

Not started. Must begin from merged 13B main.

## 10. Final closure

Phase 13 remains incomplete until 13C is merged, structured closure evidence is backfilled, and
`lastCompletedPhase` advances to 13.


### 7.1 Third-pass boundary correction

While preparing the 13B edit plan, the raw allowlist itself was challenged. Three central files were
found to be intentionally mixed rather than raw-only:

- `modules/domain/level-codec.ts`: raw reads/writes plus normalized EngineLevel projection/clone;
- `modules/domain/level-schema.ts`: RawLevel and EngineLevel declarations in one module;
- `modules/domain/level-codec-roundtrip.test.ts`: raw fixtures/wire assertions plus normalized
  parsed/clone assertions.

They were moved from `rawWireBoundary` to `mixedRawAndNormalized`. This is important because
otherwise their legitimate permanent raw spellings would exempt stale normalized spellings in the
same files after 13B. The final 13A ownership target is therefore 79 raw, 80 normalized, 13 mixed,
15 retained, and zero ambiguous.
