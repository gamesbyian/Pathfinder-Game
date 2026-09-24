# Hint evidence consolidation — Phase 3 closeout: PSC-029 retirement + stage-identity decision — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — closed PSC-029 retirement and the durable solver-stage-identity decision, clearing Phase 3's last open handoff item.
> **Decision:** Phase 3 is complete: published_levels/local_level_hints retention is unified and durable solver-stage identity is deliberately not persisted.
> **Remaining gate:** none for Phase 3 itself; this closure unblocks Phase 5/6 live-workflow validation and Phase 7 execution.
>
> **Date:** 2026-09-24
>
> **Batch:** closes the two Phase-3 items the handoff report
> ([`2026-09-23-hint-evidence-claude-handoff-after-phase4-6-table-setting-001.md`](2026-09-23-hint-evidence-claude-handoff-after-phase4-6-table-setting-001.md))
> flagged as "still needs Claude-level decisions": the published_levels/local_level_hints retention
> unification, and durable solver-stage identity vs. exact sibling-evidence join. First batch of a
> broader push to carry the whole plan to completion, per the user's "get the plan fully implemented"
> instruction.
>
> **Base commit:** `6e70bc3`.

## 1. PSC-029 retirement: one semantic Hint retention contract across Firestore backends

Re-examined `modules/persistence/review-repository.ts::approveHintAddition()` (the `published_levels`
backend PSC-029's `forms` list still named as having a "5-hint Firestore published-level merge cap")
and found the cap no longer exists in code: a prior Phase 1 containment batch (predating this session)
already replaced it with an explicit `FIRESTORE_HINT_CAPACITY_BUDGET_BYTES` byte-size check that
**throws** rather than silently truncates when a merge would exceed Firestore's real per-document
budget, leaving the submission queued for retry instead of losing evidence. PSC-029's own `forms` list
had not been updated to reflect this, so the entry was carrying a stale defect description.

Combined with this session's own prior batch (`entryIdFor()`'s composite (path, discovery-event) ID —
[`2026-09-24-hint-evidence-phase3-local-hints-occurrence-lineage-001.md`](2026-09-24-hint-evidence-phase3-local-hints-occurrence-lineage-001.md)),
both of PSC-029's named defects are now closed:

- **Legacy five-path truncation** — replaced with an explicit provenance-aware capacity policy
  (byte-budget throw) rather than silent data loss.
- **A newly accepted Hint cannot lose existing provenance merely because the target uses
  local_level_hints** — closed by the composite entry-doc-ID fix.

And the retirement gate's core requirement — "physical schemas may differ, but semantic
merge/provenance preservation must not" — is satisfied: both backends merge and dedupe through the
exact same `mergeHints()`/`dedupeProvenanceEntries()` function (`published_levels` at write time into
one array-per-level document; `local_level_hints` at read time across sharded per-(path,event)
documents), never a second hand-maintained merge path. Updated PSC-029's `status` to `complete` and its
`retirementGate`/`progress`/`forms` fields to record the closure rationale and correct the stale
"5-hint... cap" description, matching this file's established closure convention (`"Satisfied
<date>: ..."`).

No code change was needed for this half of the batch — it is a decision-and-documentation closure, not
new implementation, once the actual current code was re-verified against the gate's real requirements.

## 2. Durable solver-stage identity: decided against persisting it

The handoff report's other open Phase-3 item asked for a decision on "durable solver-stage identity vs.
exact sibling-evidence join." Investigated whether `effectiveSolverInputIdentityStatus()`'s
`solverStageId` dimension (currently external-join-only, per this session's own earlier work) should
instead become a durably persisted field on `HintProvenanceEntry`, alongside `execution`/`occurrences`.

**Decision: no.** An exact join path already exists and is already implemented:
`scripts/hint-discovery-process-evidence-lib.mjs::joinSolvedRowsToHintDiscoveryProcesses()` binds a
solved row to its stored Hint by exact complete-path-signature equality, and the resulting
`hint-discovery-process` record's `winner.stageId` (via `compactFailureAttempt()`) carries the raw
stage id, ready to be normalized through `normalizeHistoricalSolverStageId()`. Persisting `stageId`
durably on every provenance entry would duplicate this already-exact, already-tested join for a fact
most consumers don't need, and would directly conflict with two principles this program has already
committed to:

- `docs/hint-evidence-consolidation-inventory.json`'s `richEvidenceInversion` conclusion: "keep Hint
  compact; strengthen exact joins to existing richer sibling evidence resources rather than creating a
  universal discovery record."
- The handoff report's own Phase 4 status note: "No derived Hint index was added merely because the
  plan mentioned one; it remains contingent on a demonstrated repeated query that earns another
  persistent projection."

`scripts/stress/hint-reconstructability-report.mjs` deliberately stays join-free by its own existing
doc comment ("No external joins are supplied here by design. This is the durable-hint-store
baseline") — it is not the right place to wire this join speculatively, and no other real consumer
currently needs `solverStageId` reconstructed automatically. A bespoke cross-corpus stage-identity
join-and-report tool is therefore deferred until a real, demonstrated query need earns it, matching how
every other sibling-evidence join in this program was built only once a concrete consumer existed —
never speculatively.

Recorded this decision and its rationale in PSC-015's `progress` field (the entry owning
`hint-runtime.mjs`/`hint-provenance.ts`), so a future session does not re-litigate it without first
reading why.

## 3. Verification

- `node -e "JSON.parse(...)"` against the edited `docs/solver-protocol-schema-contraction.json` —
  valid.
- `npm run check:audit-artifacts` — passes (this file's structure is not schema-validated beyond JSON
  validity; no dedicated test references it).
- No code changed in this batch, so no test/type-check regression surface exists beyond the JSON edit
  itself.

## 4. Phase 3 status after this batch

With PSC-029 closed and the stage-identity question decided (not deferred-as-unresolved, but
deliberately declined with a documented reason), Phase 3's only remaining open item from the handoff
report is the already-tracked need to run the corpus-scale occurrence-acceptance audit and resolve any
real violations — which PR #2011's reconciliation already did
([`2026-09-24-hint-evidence-pr2011-reconciliation-001.md`](2026-09-24-hint-evidence-pr2011-reconciliation-001.md):
`"acceptance": "pass"`, zero violations across all three corpora). Phase 3 is therefore now reasonably
called **complete**, clearing the dependency gate for real Phase 5/6 live-workflow validation and
Phase 7 execution.

## 5. Next work

Per the plan's own dependency ordering and the handoff report's "highest-value next sequence": run a
real bounded CP-SAT dual-path canary and a real bounded solver-diagnostics dual-path canary (Phase 5/6),
comparing captured-artifact vs. specialist-report ingestion receipts and exercising reharvest
idempotency, then choose the first small artifact-sufficient level-blind family for direct-route
retirement once parity holds.
