# Hint evidence consolidation — hostile completion audit — 001

> **Status:** active
> **Last evidence:** 2026-09-24 — A fresh implementation critique after the six-store repair found additional fail-open population/guard defects: physical reader/writer and workflow-persistence guards still encoded the old published/stress store topology, whole-store referee validation did not require the complete store population, two closeout reports still omitted family stores, the determinism oracle printed modern collisions without failing, and workflow-ingestion completeness was circular over its own hand-maintained inventory. Those defects are now corrected on PR #2072; exact-head remote validation of the new corrections is still pending.
> **Decision:** The prior "all phases complete" claim was premature. Treat the program as complete only after the corrections in this report are green on one exact remote CI head and the hostile maintained-surface guards report no unreviewed bypass.
> **Remaining gate:** Re-run exact-head CI / hostile audit / closeout canary after the latest guard/population corrections; solver-evidence integrity, CI topology, six-store referee/occurrence/reconstructability validation and Firestore-emulator evidence must all be green on that same head. Do not treat connector-authored commits without Actions runs as validation evidence.

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

**Correction applied:** whole-store migration, codec benchmark, consolidation census, determinism
audit, formatting check and derived index now discover tracked Hint stores mechanically instead of
enumerating them. A full Actions checkout found **six stores / 3,351 artifacts**. The repair
transaction changed exactly the **1,389 omitted schema-v3 files**, preserved expanded semantic and
cross-resource join hashes, and an immediate second pass found **0 changes**. The temporary migration
workflow was then retired. Durable repair evidence is in
`reports/2026-09-24-hint-evidence-phase8-six-store-repair-001.{md,json}`.

Across all six stores before any Phase-8 bulk migration versus the final all-v4 state, raw storage
fell **734,618,282 → 574,394,797 bytes (21.81%)** and gzip fell
**23,131,040 → 21,364,458 bytes (7.64%)**. The repair batch alone grew slightly because the omitted
small artifacts do not share the large-store compression economics; corpus-wide material reduction,
not per-file shrinkage, is the exit criterion.

### 22. The Phase-8 migration manifest did not contain referee-validation evidence

The plan requires the reversible migration evidence to include a referee-validation disposition.
The original migration tool proved decode/encode semantic equality and cross-resource join identity,
but its report contains no referee field or path-validity result. PR #2071's validation narrative
relied on separate partial validators, which did not cover the omitted family stores.

**Correction:** `scripts/validate-all-hint-stores.mjs` now mechanically discovers every tracked
Hint store, resolves each artifact to its owning sibling level document, fails on ambiguous/orphan
ownership, decodes through the shared codec, and runs every stored path through the real PLAY
referee. The temporary repair workflow attempted this proof but used a shell pipeline that could
mask the validator exit and produced an empty log, so that step is explicitly **not** accepted as
evidence. The permanent hostile audit and closeout canary now run the six-store census and referee
validator directly; their exact-head success is the closing proof.

### 23. Parallel diagnostics harvest test mutated shared canonical data

`harvest-solver-diagnostics-reports-node-test.mjs` exercised a real solved-row persistence path by
rewriting tracked `data/hints/P00001.json` and restoring it afterward. The normal Node harness runs
tests concurrently, so another reader could observe that file between truncate/write completion.
CI produced exactly that failure: `Unexpected end of JSON input` while another bundled consumer
read the same artifact.

**Correction:** the production diagnostics harvester now accepts an explicit `--root` for isolated
fixtures. The canary copies the real P00001 level/Hint evidence into a temporary root, runs the real
harvester there, and never mutates shared repository data. This removes a hidden serialization
requirement from the Hint validation suite.

### 24. Whole-store referee validation applied the player/editor size ceiling to research-family levels

The first exact-head run of the mechanically complete six-store referee validator found 65 failures,
all in family Hint stores. The owning levels were structurally rejected because `grid.w` or
`grid.h` exceeded 15 before their stored paths reached the path referee. These family-generation
corpora intentionally contain research levels beyond the ordinary player/editor 15x15 schema ceiling;
the canonical family Hint stores are still valid research evidence and use the same Hint codec.

This was a validator-domain mismatch, not evidence that the 65 Hint artifacts were corrupt. It also
demonstrates why "run the real topology before closure" is necessary: the new exhaustive validator
itself had only been tested on ordinary small levels.

**Correction:** whole-store validation keeps the normal detailed structural parser for ordinary
published/stress stores. For the two canonical family stores it relaxes only the known
`grid.w/grid.h <= 15` player/editor constraint, parses through the shared raw-level parser, and then
runs the same candidate-path referee. All other structural parse failures remain fatal. The node
regression suite now includes an oversized family level whose path must be referee-validated
successfully.

### 25. Physical Hint reader/writer guards still encoded the pre-six-store path topology

The hostile surface detector had been strengthened against staged read/parse refactors, but its notion of
a canonical physical Hint path still matched only `data/hints` and `data/stress/hints*`. The two
canonical family stores discovered by Finding 21 were absent. A raw reader or writer under
`data/families/hints` or `data/families/phaseB/hints` could therefore bypass the supposedly
fail-closed guard.

**Correction:** the detector now consumes `CANONICAL_TRACKED_HINT_STORE_DIRS` from
`hint-store-roots.mjs`, recognizes shared path helpers, tracks simple helper-derived path variables,
and has adversarial family-store reader/writer fixtures. Physical path knowledge no longer has a
second hand-maintained store regex.

The same pass made reader/writer/bare-mutation review ledgers bidirectional: a new suspect still fails
without review, and a stale ledger entry now also fails so obsolete classifications cannot silently
survive code drift.

### 26. Whole-store referee validation could pass after an entire canonical store disappeared

`validate-all-hint-stores.mjs` mechanically discovered whatever Hint stores happened to exist and
validated those stores, but unlike migration/index/determinism tooling it did not call
`assertCompleteHintStoreDirs()`. Deleting, renaming, or emptying one canonical store could therefore
turn a six-store proof into a five-store proof without making the command fail.

**Correction:** whole-store referee validation now requires the complete canonical population by
default. Its small fixture test must explicitly request partial-population mode, and the test proves
the default fails closed when canonical stores are absent.

### 27. The closeout determinism "oracle" was observational rather than blocking

The closeout workflow ran `hint-determinism-audit.mjs`, printed
`repeatRunRecordedInputCollisionGroups`, and always continued. That was appropriate for unresolved
legacy recorded-input collisions, but not for modern entries carrying canonical
`execution.solverRequestIdentity`: a same-canonical-request/different-path repeat is precisely the
modern determinism regression the new identity contract exists to expose.

**Correction:** the audit now separates canonical-request collisions from legacy recorded-input
collisions. The closeout canary hard-fails on any canonical same-effective-input/different-path group
while retaining legacy collisions and broad cross-path semantic-event groups as diagnostic/reconciliation
populations. A regression fixture covers both identity bases.

### 28. Occurrence acceptance and reconstructability still covered only four of six canonical stores

After the Phase-8 repair, migration, codec, determinism, index and referee tooling used the six-store
authority. `hint-occurrence-acceptance-audit.mjs` and `hint-reconstructability-report.mjs` still
hard-coded published, stress1, stress2 and envelope corpus files, omitting both family Hint stores.
The closeout workflow nevertheless presented their totals as durable corpus-wide evidence.

**Correction:** both reports now derive and assert the complete canonical Hint-store population and
decode every physical artifact through the shared decoder. Family stores participate in the same
occurrence/deduplication and reconstructability measurements as every other canonical store.

### 29. Workflow-ingestion completeness was circular and hid a real maintained GHA Hint writer

`hint-ingestion-workflow-completeness-node-test.mjs` began with the hand-maintained
`workflowIngestion` inventory and checked only rows already labelled for central ingestion. It could
not detect a producer omitted from the inventory.

A lifecycle-derived comparison immediately found four maintained evidence-producing workflows missing
from that inventory. Three are legitimate non-Hint research producers. The fourth,
`collect-variant-family-dataset.yml`, directly persists canonical `data/families/hints/` evidence
from GitHub Actions and can stage the broader `data/families/` ancestor. The old central-persistence
guard missed it because its store regex omitted family stores and because it reasoned about literal
store paths rather than staging scopes.

This does **not** mean family generation should be forced through `harvest-solver-evidence.yml`.
Family levels and sibling Hint artifacts are one research-dataset transaction and already use shared
semantic/physical I/O. It means the exception must be explicit rather than accidental.

**Correction:** every maintained evidence-producing workflow, plus operational workflows that publish
the standard solver-sweep envelope, is now mechanically required to have exactly one reviewed
`hintIngestionDisposition`. The four previously invisible workflows are classified explicitly.
A new `docs/hint-workflow-persistence-audit.json` records the single family-research direct-persistence
exception and limits it to `data/families/`. The central persistence guard now analyzes staging
scopes, catches ancestor-directory staging, consumes the six-store authority, and adversarially proves
that the family exception cannot authorize stress/published persistence.

### 30. Solver diagnostics' partial-failure exception was stale control-plane debt

The plan says partial-failure artifact upload is a hard requirement. The completeness test nevertheless
special-cased `solver-diagnostics.yml`, while the inventory claimed
`partialFailureUpload: false`.

Current workflow truth already contradicts that exception: diagnostics uploads its full-or-partial
artifact and standard solver-sweep result under `if: always()`.

**Correction:** the inventory now records the actual partial-failure behavior and the one-off test
exception is removed. Central-ingestion dispositions uniformly require partial-failure upload.

### 31. Scoped CI did not own the newly mechanical workflow-guard inputs

Once workflow persistence and ingestion completeness were made mechanical, their dynamic inputs
expanded beyond their old metadata. Without routing metadata, a scoped validation plan could still
skip exactly the guards whose populations had changed.

**Correction:** validation-group contract dependencies now bind central persistence to the workflow
lifecycle, workflow-persistence exception ledger, canonical store authority and all workflow files;
ingestion completeness is bound to lifecycle, ingestion inventory and all workflow files.

### 32. Workflow-ingestion candidate discovery confused trigger dependencies with execution

The first lifecycle-derived completeness pass searched the whole workflow YAML for standard solver
publisher script names. That made a validation-only workflow, `solver-evidence-integrity-guard.yml`,
look like a solver publisher solely because its `pull_request.paths` invalidation list mentions
`publish-solver-sweep-result.mjs`.

That is the same class of authority error this program is trying to eliminate: dependency metadata
was being interpreted as behavior.

**Correction:** operational publisher detection now inspects executable `run:` content only, including
multiline shell blocks. Trigger/watch paths no longer classify a workflow as an evidence producer.
The temporary compensating inventory row for the integrity guard was removed rather than preserving a
false classification.

### 33. Writer review ledgers checked membership but not the recorded disposition

The hostile audit had been strengthened to fail on missing and stale physical-writer ledger entries,
but a still-detected file could drift away from the semantics claimed by its existing disposition and
continue to pass. In particular, a `temporary-test-fixture-writer` entry did not mechanically prove
that the writer still creates an isolated temporary root, and the canonical I/O/migration/compatibility
owner dispositions were not checked against their defining shared-codec/referee/merge boundaries.

**Correction:** writer dispositions are now executable contracts. Canonical I/O owners must still
delegate through the shared encoder; migration owners must retain visible decode/encode semantic
preservation; compatibility importers must retain shared parsing, referee validation and semantic
merge; temporary fixture writers must still construct an isolated temporary root; and the
audit-fixture false-positive disposition is reserved to the detector self-test itself.

### 34. The family workflow persistence exception escaped upward to ancestor scopes

The reviewed exception for `collect-variant-family-dataset.yml` was intended to authorize only
`data/families/`, because family levels and their sibling Hints are one research-dataset
transaction. The implementation checked allowed scopes symmetrically: a scope was accepted when it
was either below the allowed prefix **or an ancestor containing it**.

That meant `git add data/` in the family workflow would have passed the exception check even though
that scope also contains published and stress canonical Hint stores. The ledger said “family only”,
but the executable contract meant “any ancestor containing family”.

**Correction:** an exception now authorizes only the exact declared prefix or a descendant of it.
Ancestor staging is forbidden. The adversarial self-test now proves `data/families/` is accepted
for the reviewed workflow while both `data/stress/` and `data/` are rejected.

### 35. Reviewed workflow exceptions/dispositions could outlive the behavior they reviewed

After making workflow persistence and ingestion review explicit, both control planes still enforced only
one half of freshness:

- a persistence exception had to name a maintained workflow and a canonical-store-containing prefix,
  but could remain indefinitely after the workflow stopped using that exception;
- an ingestion row had to name a maintained workflow, but could remain indefinitely after the workflow
  stopped satisfying the mechanically derived review-candidate contract.

Dormant approvals are dangerous because later code can accidentally inherit them without a fresh review.

**Correction:** persistence exceptions must now be exercised by the current workflow at their reviewed
scope, otherwise the guard fails them as stale. Workflow-ingestion rows must correspond to the current
mechanically derived candidate population, otherwise they also fail as stale. The control plane is now
bidirectional: current behavior needs a reviewed disposition, and every reviewed disposition must still
be justified by current behavior.

## Exact-head validation fallout after Findings 25-33

The first remote PR validation on head `06294be...` was valuable precisely because it did not stay
green:

- **Hint/provenance hostile audit failed immediately** because a stalled-session edit left
  `central-hint-persistence-guard.mjs` syntactically malformed. The file has been reconstructed
  cleanly from its intended semantics rather than patched around the parse error.
- **Fast-gate / Node validation exposed control-plane fallout from the widened detectors**:
  several temporary harvester tests became newly visible physical-writer suspects; obsolete reader
  classifications became stale; and `validate-all-hint-stores.mjs` itself became a newly reviewed
  shared-decoder reader. The ledgers are reconciled to the current detector population.
- **The whole-store referee node fixture was invalid**, using packed path keys for different raw
  coordinates than its synthetic gate/goal. The production validator had already passed remotely;
  the fixture now uses the actual packed keys for its own level.
- **The ingestion-completeness test falsely classified the solver-evidence integrity workflow**
  because of the trigger-path bug described in Finding 32.

On that same exact head, the consolidation closeout canary, solver-evidence integrity guard, CI
testability topology audit and deep verification were green. Those successes remain useful evidence,
but they do not close the program because the hostile/fast floor was red and subsequent corrections
have moved the branch head. Final closure still requires one later exact remote head where the full
named gate set is green together.

## Planning-contract defects exposed by implementation

The hostile findings do not imply that the original architecture was directionless; most of the
eventual corrections were already conceptually anticipated. They do show that several plan
requirements were too weakly specified to serve as falsifiable completion gates.

- **Scope words lacked mechanical population ownership.** "All producers/consumers", "maintained
  workflows", and "tracked corpus" could be satisfied against a hand-maintained list. This is how
  Phase 8 migrated 1,962 artifacts losslessly while omitting 1,389 equally canonical tracked
  artifacts.
- **Definition-of-Done statements were not uniformly bound to one named executable proof.** A report
  could state that a phase was complete while the proof exercised only a subset or a substitute
  topology.
- **Persistence acceptance was under-factored.** Distinct events on one path were tested, but the
  equally important same-event/new-occurrence case was not, allowing Firestore and git to disagree.
- **Guard existence was treated too readily as guard completeness.** The first physical-reader guard
  could be bypassed by a harmless staged read/parse refactor, direct physical writers lacked their own
  fail-closed ledger, and scoped CI did not initially own all guard inputs.
- **Topology-specific validation could be deferred past a phase-complete claim.** Firestore emulator
  evidence and remote exact-head evidence must be phase closure requirements when those boundaries are
  touched, not later confirmation.
- **Fresh-context closeout was described as methodology rather than an unavoidable blocking phase.**
  PR #2072 demonstrated that reconstructing the current producer/consumer/store surface independently
  from implementation reports is what actually falsified the premature completion claim.

The plan now records these as section 0 completion-contract requirements. This report is the first
closeout conducted under that stronger contract.

The plan's acceptance gates, per-phase method and final Definition of Done have also been tightened so
the correction is executable rather than merely retrospective prose: populations must be mechanically
derived, persistence closes against an explicit state-transition matrix, topology-specific boundaries
must run before phase closure, and final completion items are bound to concrete proof classes on one
exact head.

Historical implementation reports whose broad completion claims were falsified are now explicitly
reconciled rather than silently rewritten:

- Phase 3 closeout is retained as the first semantic-event retention closure but is superseded for the
  same-event/new-occurrence case;
- Phase 6 portfolio retirement remains valid for that family but no longer claims it exhausted every
  GHA Hint writer;
- the September 23 mechanical migration audit is marked historical/reconciled;
- the original Phase 8 bulk-migration report already records that its 1,962-artifact "full corpus"
  claim was incomplete and points to the six-store repair.

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

Satisfied by the corrected two-stage Phase-8 evidence transaction. PR #2071 migrated the original
three-store population; the hostile repair then discovered and migrated the omitted envelope and
family stores. Across the true six-store pre-v4 population, raw bytes fell 21.81% and gzip bytes
fell 7.64%, with semantic/join equivalence and migration idempotency preserved. Runtime path-only
projection remains a separate untracked derivative. Final all-store referee validity remains part
of the exact-head closing gate.

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
- mechanically discovered Hint-store census;
- all-store PLAY-referee validation;
- v4 migration semantic-equivalence/idempotency checks;
- freshness-bound derived Hint-store index;
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