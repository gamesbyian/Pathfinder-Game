# Hint evidence consolidation — hostile completion audit — 001

> **Status:** active
> **Last evidence:** 2026-09-24 — Fresh-context maintained-surface audit after the schema-v4 bulk migration; real Firestore emulator proves corrected same-event occurrence retention.
> **Decision:** The prior "all phases complete" claim was premature. Treat the program as complete only after the corrections in this report are green on one exact remote CI head and the hostile maintained-surface guards report no unreviewed bypass.
> **Remaining gate:** Exact-head CI, hostile full-checkout audit, closeout canary, solver-evidence integrity guard, and Firestore emulator must all complete successfully after the final corrections; then this report may conclude positive.

## Why this audit existed

PR #2071 provided strong evidence that the **files selected for the v4 bulk migration** were migrated
losslessly: per-file semantic hashes matched, aggregate Hint/provenance counts were unchanged, the
immediate second migration was a no-op, runtime build projection still worked, and path/referee /
occurrence checks were green.

That is not the same claim as "every producer and consumer touched by the consolidation plan is now
semantically correct."

This audit therefore reconstructed current `main` after the real v4 migration and treated completion
as a hypothesis. The audit used:

- the plan's producer/consumer and definition-of-done checklists;
- the machine workflow-ingestion inventory and workflow lifecycle;
- maintained-reachability census from package/workflow entrypoints;
- physical Hint reader / writer / provenance mutation census;
- actual current workflow YAML, not PR prose;
- git Hint stores and Firestore as separate persistence systems;
- browser, Node, research-query, family/witness and submission/review surfaces;
- current migrated schema-v4 data;
- real PR CI / full-checkout GitHub Actions, including the Firestore emulator.

## Findings that falsified the prior completion claim

### 1. The consolidation census itself was v4-blind

`scripts/hint-evidence-consolidation-audit.mjs` parsed a physical Hint JSON document and then treated
`parsed.hints` as semantic `Hint[]`.

That is correct for schema v3 and happens to look correct for v4 `sparse-inline`, but is wrong for
v4 `interned`: provenance rows contain table references such as `solverRef` / `contextRef`, not
expanded semantic fields.

The defect was empirically visible in the first hostile-audit artifact: the census reported hundreds
of thousands of provenance rows with solver/context fields apparently absent even though the migrated
semantic data was intact.

**Correction:** the census now calls `decodeHintArtifact()` before every semantic count, missingness
measurement, Firestore-size projection and path-only projection.

**Standing guard:** `scripts/hint-provenance-surface-audit.mjs` plus
`docs/hint-physical-reader-audit.json` review every maintained broad physical-reader suspect and fail
closed on an unreviewed raw physical reader.

### 2. CP-SAT still had an independent canonical Hint writer

The source workflow still ran its sweep with `--save-hints`, staged changed
`data/stress/hints*` files, transported them, and had combine-side direct canonical persistence,
while the central harvester independently reconstructed the same discoveries from specialist reports.

That violated the plan's single workflow-ingestion authority and "source workflows do not understand
physical Hint storage" exits.

**Correction:** CP-SAT shard execution is report-only. Its partial-failure discovery reports remain
durable; `harvest-solver-evidence.yml` is the sole canonical writer.

### 3. Solver diagnostics still had an independent canonical Hint writer

`solver-diagnostics.yml` still invoked diagnostics with `--save-hints`, staged `data/hints`, and
committed Hint files even though its self-describing report already had a central adapter.

A secondary dependency had hidden this route: the source workflow computed published hint-cost drift
only after directly mutating the Hint store.

**Correction:** diagnostics is report-only. Hint-cost drift moved to the central harvester immediately
after semantic diagnostics ingestion, preserving the signal without preserving the second writer.

### 4. Technique census still had an independent canonical Hint writer

`technique-census.yml` still passed `--save-hints` to
`combine-technique-census-shards.mjs`. That combine path used `createHintCapture()` to write
isolated-technique discoveries directly.

The central isolated harvester already understands the combined technique-census row schema
(`cellId`, corpus/level identity, exact solution, attempts and technique identity).

**Correction:** technique census combine is report-only; the central isolated harvester is the sole
canonical writer.

### 5. Three already-migrated solver workflows still carried physical-store staging plumbing

Stress refresh, production replay and high-budget sweeps no longer invoked `--save-hints`, but their
artifact steps still created Hint directories and scanned/copied changed physical Hint files.

The code was functionally dead today, but it left source workflows coupled to canonical store layout
and made restoring a direct writer easy.

**Correction:** removed the stale Hint directory creation / git-status / artifact-copy plumbing. Source
artifacts now contain only report/log evidence needed for central reconstruction and recovery.

**Standing guard:** `scripts/central-hint-persistence-guard.mjs`, in normal `test:node`, derives
the maintained centrally harvested workflow set from repository authorities and fails on executable
`--save-hints`, Hint-path `git add`, or changed-Hint staging.

### 6. Family parent replay batch bypassed the shared physical decoder

`scripts/family-parent-hint-replay-batch.mjs` opened a variant Hint artifact with `JSON.parse()`
and iterated `hintDoc.hints` directly.

After the bulk interned-v4 migration, that is a physical row, not a semantic Hint record.

**Correction:** batch replay now calls `decodeHintArtifact()` before consuming paths/provenance.
The single-parent replay already used hydrated corpus state.

Tests that inspected generated family Hint files directly were also changed to decode through the
shared codec so small fixtures cannot accidentally make the test suite depend on
`sparse-inline` representation selection.

### 7. Firestore lost a physical occurrence when the semantic event already existed

Phase-3 closeout correctly fixed **distinct semantic discovery events on one path**, but it did not
exercise the different requirement "same semantic event, new physical acquisition."

The local supplemental store used a document identity derived from
`(path, provenanceEventIdentity)`. `provenanceEventIdentity()` deliberately excludes physical
occurrence lineage. Therefore a later run/attempt of the same semantic event was classified as
`duplicate-provenance-not-recorded`, while git storage correctly merged that new occurrence.

That made the two persistence backends semantically inconsistent.

**Correction:**

- `hintOccurrenceKey()` owns canonical `runId + runAttempt` physical identity;
- `provenanceOccurrenceKey()` explicitly composes physical acquisition identity with semantic event
  identity without changing `provenanceEventIdentity()`;
- `provenanceEvidenceKeys()` exposes the semantic-event key plus atomic occurrence keys;
- local Firestore persistence filters incoming occurrences to only the novel run/attempt keys;
- occurrence-bearing observations receive immutable sibling document identities;
- reads still use `mergeHints()`, collapsing siblings back into one semantic provenance event and
  unioning occurrence lineage;
- no Firestore update permission was introduced.

**Empirical proof:** the real Firestore emulator now saves run A, saves run B for the same semantic
event, round-trips one semantic event containing both occurrences, and treats a repeat of run B as an
idempotent duplicate.

### 8. Control-plane documents still described retired transition states

The workflow-ingestion inventory still said several families used "direct Hint files + reports" or
were in shadow parity after those routes had already been retired. PSC rows 001/025/027/028/030/031/032
were also left `in-progress` after their implementation gates had been met, while PSC-029's completed
description encoded the incomplete Firestore occurrence claim.

**Correction:** the ingestion inventory now describes central-only current persistence and the PSC
rows record the actual post-audit closure state. PSC-029 explicitly records this audit's same-event
occurrence correction.

### 9. Local review persistence dropped earlier provenance events and mishandled capacity refusal

The local review path persisted only the last provenance event attached to a submitted Hint. That could
silently discard earlier discovery events already present on the same submitted path. It also deleted
the review submission after partial persistence even when the local Hint store reported capacity
refusal.

**Correction:** review persistence now iterates every provenance event, tracks semantic-event and
occurrence evidence keys, reports path/event counts explicitly, and leaves the submission queued when
any event hits capacity so retry is safe and idempotent.

### 10. Family replay mutated a semantic identity field after merge

Batch family-parent replay initially merged provenance with `context.levelRevision = null` and filled
the revision afterward. Because level revision participates in semantic event identity, a repeated
batch could fail to dedupe before mutating two entries into the same final identity.

**Correction:** the parent fingerprint is computed once before replay merges and stamped into
provenance before `mergeHints()`.

### 11. Published-level import discarded provenance-only enrichment

The published-level importer deduplicated incoming Hints by path and skipped already-known paths.
That preserved path coverage but dropped new provenance events and occurrence lineage on those paths;
provenance-only changes also did not trigger persistence.

**Correction:** import now uses `mergeHints()`, detects semantic change independently of path-count
growth, and persists same-path provenance enrichment idempotently.

### 12. Two additional research consumers were v4-blind

`guidance-distance-first-divergence.mjs` and `stress/hint-cost-drift.mjs` parsed physical Hint
artifacts and iterated `.hints` directly. Interned v4 rows are not semantic Hint records.

**Correction:** both now decode through `decodeHintArtifact()` before semantic analysis.

### 13. Browser variety-search provenance omitted real discovery evidence

Browser variety-search projection recorded only newly-added paths. Independent rediscoveries of an
already-known path were discarded, `scoringProfileId` was omitted, and submission mode could compute
`usedExistingHints` after adding newly discovered paths, incorrectly describing a cold search as
history-aware.

**Correction:** the canonical projection now records new paths plus independent rediscoveries,
preserves scoring-profile/seed/anchor identity, and derives pre-search Hint context before mutation.

### 14. The permanent physical-reader guard had a refactor-shaped blind spot

The first hostile guard only recognized raw readers when `JSON.parse(readFile...)` appeared in one
expression and when the semantic rows used a small set of variable names. A harmless refactor such as
reading bytes into one variable, parsing them in another statement, then iterating `parsed.hints`
could evade enforcement.

**Correction:** the detector now classifies physical Hint read surfaces from independent file-read,
JSON-parse, Hint-source, and `.hints` signals; decoder presence is checked separately. A permanent
self-test covers inline raw reads, staged raw reads, staged reads through the shared decoder, and an
unrelated JSON negative control.

### 15. Direct physical writer ownership was not fail-closed

The plan requires a repository guard against maintained code writing canonical Hint files outside
approved store/migration owners. Existing checks covered obsolete facades and workflow-level
persistence, but a maintained script could still introduce a direct filesystem writer without a
reviewed ownership decision.

**Correction:** the hostile surface audit now detects direct physical Hint writers and requires every
maintained suspect to appear in `docs/hint-physical-writer-audit.json`. The shared
`level-data-io.mjs` store and the dedicated v4 migration are the explicit current owners; new
suspects fail closed pending classification.

### 16. Scoped CI did not declare the ownership guards' real input surfaces

The physical-reader/writer guard scans maintained source and workflow files, while the central
persistence guard derives authority from the workflow lifecycle ledger. Those filesystem
dependencies were not explicit in the scoped-validation contract, leaving room for a targeted CI
selection to omit a guard after changing exactly the files it governs.

**Correction:** validation routing now declares repo-input dependencies for both guards, including
source modules/scripts, workflows, the reader/writer ledgers, package entrypoints, and workflow
lifecycle authority.

### 17. Editor coordinate transforms cleared only the derived bare-path projection

The hostile mutable-alias census found that editor coordinate transforms assigned
`level.hints = []` directly after shifting/reflection while leaving canonical
`level.hintRecords` untouched. Since `hintRecords` is the persisted authority, a transformed
level could retain stale provenance-rich paths and later write them back despite the UI-facing
bare-path list having been cleared.

**Correction:** coordinate transforms now clear through `setLevelHintRecords(level, [])`, so both
canonical records and the derived path projection are invalidated together.

**Standing guard:** maintained direct `.hints` / `.hintRecords` assignments are now fail-closed
through `docs/hint-bare-mutation-audit.json`. The only reviewed maintained assignments are the
canonical synchronization owner in `hint-runtime.mjs` and ephemeral wire/clone projection in
`level-codec.ts`.

### 18. The planned lightweight freshness-bound Hint index did not exist

The plan's top-level outcomes and Phase-4 hardening called for a compact derived per-artifact/store
index so routine research questions do not require repeatedly opening multi-megabyte canonical Hint
files. The implementation had strong query and reconstructability libraries but no generated Hint
index or freshness contract anywhere in the repository tree.

**Correction:** `scripts/hint-store-index.mjs` now builds a deterministic derived index over all
three canonical Hint stores. Each row binds the physical artifact content hash and expanded semantic
hash and exposes compact counts for paths/events, solver/technique/retry coverage,
effective-input reconstructability, occurrence lineage and missing dimensions. The whole index has a
deterministic `sourceSetSha256`, and `--verify=<index>` fails when any canonical artifact changes.
The index reuses the shared decoder, hint-query summaries and reconstructability classifier; it is
explicitly marked derived rather than authoritative.

### 19. Schema-contraction control plane still marked provenance generations unfinished

`PSC-015` remained `in-progress` after the exact conditions in its retirement gate had already
been satisfied: historical absence/unknown semantics are preserved at shared ingress, current
writers emit one canonical nested provenance shape, retained historical generations remain readable,
and the real v4 bulk migration preserved expanded semantic hashes/counts without converting unknown
history into modern defaults. `PSC-030` already recorded the same missingness contract as complete.

**Correction:** PSC-015 is reclosed with the post-v4 evidence, and PSC-001's retirement text now
reflects the editor coordinate-transform fix plus the new fail-closed bare-mutation ledger.

### 20. Declared future Hint schema versions could fall through as legacy

The shared decoder handled v4 explicitly but then accepted any remaining object with a `hints`
array through legacy shape inference. A future `{schemaVersion: 5, hints: ...}` artifact could
therefore be silently interpreted under v2/v3/legacy semantics instead of failing closed. This left
PSC-024 correctly open despite the completed physical migration.

**Correction:** schema dispatch is now authoritative: unversioned legacy array/transitional objects
remain explicit compatibility paths, declared v2/v3 wrappers use retained historical adapters, v4
uses the current codec, and every other declared schema version throws. Regression tests cover v2,
v3 and unsupported v5. PSC-024 is now reclosed.

### 21. Phase 8 omitted the tracked envelope Hint corpus

The hostile audit found a fourth tracked first-class Hint store,
`data/stress/hints-envelope/`, paired with `data/stress/stress-levels-envelope.json`.
A mechanical repository-tree census found six tracked canonical Hint directories, not the three
assumed by the original Phase-8 tooling. The omitted stores are:

- `data/stress/hints-envelope/`: 124 artifacts;
- `data/families/hints/`: 788 artifacts;
- `data/families/phaseB/hints/`: 477 artifacts.

All 1,389 omitted artifacts were still schema v3 when discovered. The family stores are written
through the same canonical `level-data-io` / `hintsDirFor` boundary, so they are not a separate
archive format.

This falsifies PR #2071's claim that its 1,962-file migration covered the "full tracked corpus".

**Correction in progress:** whole-store migration, codec benchmark, consolidation census,
determinism audit, formatting check and derived index now discover tracked Hint stores mechanically
instead of enumerating them. A permanent census guard currently asserts the six-store topology.
A temporary PR-scoped workflow runs the tested v4 migration over all discovered stores, proves
immediate idempotency and whole-store referee validity, uploads the reversible evidence, and commits
only the previously omitted stores.

### 22. The Phase-8 migration manifest did not contain referee-validation evidence

The plan requires the reversible migration evidence to include a referee-validation disposition.
The original migration tool proved decode/encode semantic equality and cross-resource join identity,
but its report contains no referee field or path-validity result. PR #2071's validation narrative
relied on separate partial validators, which did not cover the omitted family stores.

**Correction:** `scripts/validate-all-hint-stores.mjs` now mechanically discovers every tracked
Hint store, resolves each artifact to its owning sibling level document, fails on ambiguous/orphan
ownership, decodes through the shared codec, and runs every stored path through the real PLAY
referee. The hostile audit and omitted-store migration transaction both require this whole-store
proof, and the migration workflow uploads its result beside the before/after migration manifests.

## Producer audit result

The maintained GHA discovery families currently eligible for canonical Hint persistence are:

- level-blind stress refresh / targeted / routing A/B families;
- history-aware portfolio production replay / high-budget families;
- isolated method probes;
- technique census;
- CP-SAT specialist discovery;
- solver diagnostics.

After this audit, none of those source workflows has an executable direct canonical Hint persistence
route. Source workflows retain self-describing / partial-failure artifacts; central
`harvest-solver-evidence.yml` owns canonical persistence.

Experiment-only confirmation and reconciliation workflows remain intentionally non-ingesting and
retain their scientific artifacts without being reattributed as fresh discoveries.

Offline/manual/family producers remain valid exceptions to *workflow centralization*: they operate on
hydrated semantic Hint records, construct provenance through shared owners, mutate through
`mergeHints()` / `setLevelHintRecords()`, and persist through the shared corpus writer rather than
creating a second physical schema.

## Consumer audit result

The following consumer classes were reconstructed from current maintained code rather than the
implementation diff:

- browser published/stress Hint loading;
- Node corpus readers/writers;
- referee/path validators and heatmap consumers;
- determinism / replayability / reconstructability / chronology / cost-drift queries;
- provenance taxonomy, coverage, solution-profile and process/failure joins;
- runtime path-only projection;
- artifact merge/recovery and v4 migration;
- family generation and parent replay;
- submission/review/import paths;
- Firestore local supplemental and published-level persistence.

Browser and Node physical Hint ingestion terminate at the same `decodeHintArtifact()` boundary.
Current direct physical-reader suspects are recorded in `docs/hint-physical-reader-audit.json`;
new suspects fail the audit until classified.

## Definition-of-done review

### Effective execution dimensions persist

Satisfied through canonical solver-request identity, execution capsule, protocol/source-run binding,
event/occurrence model and reconstructability queries.

### #1996 collisions no longer require timestamp/source-commit archaeology

Satisfied where source authority survives. Historical unknowns remain explicit; the determinism oracle
distinguishes canonical modern request comparisons from legacy approximations.

### Maintained GHA solver workflows share one canonical evidence-ingestion path

Satisfied **only after this hostile audit's CP-SAT, diagnostics and technique-census retirements**.
Enforced by `central-hint-persistence-guard.mjs`.

### No maintained workflow needs physical Hint-store schema knowledge

Satisfied after removing stale Hint artifact staging from migrated families and specialist direct
transport. Central persistence owns physical layout.

### Browser and Node consumers use one artifact decoder

Satisfied after fixing the family batch and the v4-blind empirical census, with a reviewed physical
reader ledger and fail-closed decode guard.

### Canonical Hint storage is materially smaller without semantic loss

Satisfied by PR #2071's v4 migration evidence transaction: semantic hashes/counts preserved and raw
tracked bytes materially reduced. Runtime path-only projection remains a separate untracked
derivative.

### Historical v1-v3 evidence remains readable and honestly incomplete

Satisfied through the shared decoder/upgrader, explicit historical missingness handling and regression
fixtures. V4 interning stores exact semantic objects rather than laundering absent historical fields.

### Query/research infrastructure exposes identities and missingness

Satisfied by the Hint query, determinism, reconstructability, replayability, chronology, taxonomy,
cost-drift, process/failure join and resource-contract surfaces.

### Repo checks make parallel persistence/identity dialects difficult to reintroduce

Satisfied materially after this audit by:

- maintained I/O facade/reachability guard;
- solver identity/semantics guards;
- workflow ingestion completeness guard;
- central Hint persistence guard;
- physical reader/decode review ledger;
- v4 migration semantic-equivalence/idempotency checks;
- Firestore emulator boundary;
- occurrence acceptance audit.

### Referee, level-blindness, semantic identity, applicability and determinism remain green

Final exact-head remote CI remains the closing evidence gate for this audit report.

## Residual boundaries that are intentional

- Historical v1-v3 readers remain supported; the plan explicitly says not to remove them.
- Firestore and git retain different physical layouts. They now share semantic merge/event/occurrence
  behavior rather than pretending to be one storage engine.
- Runtime path-only Hint artifacts are generated, untracked delivery projections, not a second
  research authority.
- Manual/offline corpus research tools may write Hints directly when explicitly invoked; they use
  canonical semantic mutation and shared physical I/O and are not GHA ingestion authorities.
- Phase-10 level sparse serialization remains narrowly bounded to already-safe empty optional array
  omission; it does not introduce provenance sidecars or a competing Hint codec.

## Completion verdict

The pre-audit state should **not** be described as complete: the audit found multiple maintained
workflow writers, two v4-blind consumers/tests, and a real Firestore occurrence-lineage inconsistency.

If the final exact-head remote validation is green, the corrected state is suitable to call the
consolidation program **operationally complete** against its stated definition of done. Future work
would then be ordinary maintenance or newly-earned optimization, not unfinished execution of this
plan.
