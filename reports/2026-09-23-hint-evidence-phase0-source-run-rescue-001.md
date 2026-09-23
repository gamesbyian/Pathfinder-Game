# Hint evidence consolidation — Phase 0 source-run evidence rescue — 001

> **Status:** concluded-positive for the high-value determinism-collision authority; broader full-result archival remains optional
>
> **Date:** 2026-09-23
>
> **Batch:** 1 of the dependency-ordered sequence in
> [`docs/hint-evidence-execution-identity-storage-consolidation-plan.md`](../docs/hint-evidence-execution-identity-storage-consolidation-plan.md)
> section 14.4 — "Baseline/evidence rescue".
>
> **Base commit:** `c88461ab669950e4b6d06873431a3704dbe2c4a9` (`main`, unchanged by this batch's semantics — this
> batch adds evidence only, per Phase 0's rule not to rewrite canonical historical Hint provenance yet).
>
> **Machine-readable metadata bundle:** [`docs/hint-evidence-phase0-source-run-rescue-2026-09-09.json`](../docs/hint-evidence-phase0-source-run-rescue-2026-09-09.json)
>
> **Durable collision authority rescue:** [`docs/hint-evidence-phase0-sept9-determinism-collision-authority-rescue.json`](../docs/hint-evidence-phase0-sept9-determinism-collision-authority-rescue.json)

## 1. Why this batch, and why it is first

The plan's dependency-ordered sequence begins with "baseline/rescue" specifically because Phase 0
requires rescuing the minimal authoritative evidence bundle for high-value source runs whose GitHub
Actions artifacts can expire, **before** any semantic implementation begins — "never defer preservation
of expiring authority until after the evidence needed to interpret it may be gone" (plan §14.2).

Reconstructing current `main` against the plan found:

- PR #1996 (the determinism audit and this consolidation plan) is already merged
  (`f76e5a6`, "Merge PR #1996: Audit hint determinism and plan provenance/storage consolidation").
- The pre-implementation empirical audits (missingness census, SolveOpts classification, workflow
  matrix, Firestore sizing, runtime-projection benchmark) are already complete and checked in
  (`docs/hint-evidence-consolidation-inventory.json`, `docs/solver-request-semantics-inventory.json`,
  `reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md`).
- No prior work has rescued the six 2026-09-09 GitHub Actions source runs that the #1996 determinism
  audit used to reconcile its 15 apparent path collisions. The preimplementation audit explicitly
  measured that these runs' artifacts were still unexpired at audit time but noted that "does not
  establish durable reconstructability: these are GHA-retained artifacts, not semantic payload
  preserved inside the canonical hint evidence" (§3, "Source-run durability and reconstructability").

That gap — expiring GHA authority for exactly the runs the plan's own determinism audit depends on —
is the earliest still-open item in the dependency-ordered sequence. No later batch (semantic ingress,
identity, provenance model, etc.) requires this rescue as an input, but the plan is explicit that
rescue must happen first regardless, because it is a race against artifact retention, not against
another phase's semantics.

## 2. Scope

Rescue the six runs named in
[`reports/2026-09-22-hint-provenance-repeat-run-determinism-audit.md`](../reports/2026-09-22-hint-provenance-repeat-run-determinism-audit.md):
`34315398129`, `34315357361`, `34320087947`, `34320103478`, `34337871124`, `34337880617`.

Out of scope for this batch (per Phase 0's own exit criteria): rewriting canonical historical Hint
provenance, choosing the final execution-capsule schema, or backfilling the #1996 collisions. Those are
Phase 3 (provenance/occurrence model) and Phase 7 (authoritative historical enrichment) respectively.

## 3. What was rescued

All six runs' GitHub Actions Actions API metadata was still live at rescue time (checked via the
GitHub MCP server, `2026-09-23`). Current artifact `expiresAt` is `2026-12-08` for every run. For each
run this batch durably captured, into
[`docs/hint-evidence-phase0-source-run-rescue-2026-09-09.json`](../docs/hint-evidence-phase0-source-run-rescue-2026-09-09.json):

- the parameterized workflow display name, which is this workflow family's actual arm/configuration
  identity encoding (`<ids file> · enable=<flag> · disable=<flag>`) — e.g.
  `Targeted sweep · data/stress/mc-neighbor-budget-portal-ab-001-ids.txt · enable=PRUNE_MC_NEIGHBOR_BUDGET_PORTAL · disable=none`;
- the immutable head commit and ref actually checked out for that run (`0201e952f...` for the four
  `-ab-001` runs, `423e4a095...` for the two later `-gapfill-001` runs — confirming the gap-fill runs
  ran against a different commit than the runs whose gaps they filled);
- per-run shard-job conclusion tallies (success/cancelled/failure counts), which distinguish a run that
  completed its assigned population slice from one that was cut short mid-run;
- the combine job's conclusion and, verbatim, the human-readable result-summary markdown that
  `scripts/publish-solver-sweep-result.mjs` prints to the job log immediately before uploading the
  `solver-sweep-result` artifact — this includes solved/total counts, aggregate work/node totals, and
  the full per-stage participation table;
- for the two `-gapfill-001` runs, the exact per-level attempt detail (`ok`, `status`, `workSpent`,
  `reached`, `stageAttempts`, `stageNodesExpanded`, `stageSolved`) for stage
  `connectivity-axis-prune-disabled-retry` across their shared 18-level gap population, which the
  combine job also happens to print to its log;
- artifact locators (id, name, byte size, SHA-256 digest, created/expires timestamps) for each run's
  `solver-sweep-result`, `targeted-shard-plan`, and (where present) `targeted-sweep-combined`
  artifacts. Individual `targeted-shard-NNN` per-shard artifacts are not separately enumerated — their
  content is already folded into the combined `result.json` that the `solver-sweep-result` artifact
  carries — but their counts are recorded.

This also clarified the run lineage the original determinism-audit table only partially named: runs
`34320087947` and `34320103478` were both attempts at the same `mc-neighbor-budget-portal-ab-001`
population; `34320103478` was cut short at 20/53 shards, and its 16 solved levels plus
`34320087947`'s 17 missing levels together form the exact 18-level gap population that the two
`-gapfill-001` runs (`34337871124`, `34337880617`) then re-ran under both arms.

## 4. Follow-up rescue: the collision authority is now durable

A later 2026-09-23 environment exposed a GitHub Actions artifact download API that follows GitHub's
temporary artifact-storage redirect internally. All six `solver-sweep-result` artifacts were still
healthy and unexpired, so the earlier Azure-Blob egress limitation was no longer binding.

The six exact source ZIPs were downloaded and inspected. Rather than commit megabytes of unrelated
failed-attempt rows or opaque ZIP files, the rescue preserves the minimum authority Phase 0 actually
needed for #1996's 15 collision levels in:

`docs/hint-evidence-phase0-sept9-determinism-collision-authority-rescue.json`

That durable bundle contains, for all six runs:

- immutable run/workflow/ref/solver revision and run-attempt identity;
- literal dispatch inputs and shard-completeness disposition;
- SHA-256 of the original `manifest.json` and the complete original `result.json`;
- run-wide corpus, work/node/wall and execution configuration;
- every solved observation among the 15 affected collision levels (41 source observations total);
- SHA-256 of the exact solved path's canonical JSON array, plus path length, so the source observation
  can be joined exactly to the already-tracked canonical Hint path without copying the path bytes again;
- referee disposition, aggregate work/nodes, winning configuration/action/gate and the exact winning
  attempt payload needed to reconstruct the arm/action relationship.

This removes the material Phase-0 retention risk for the determinism-collision cohort: later Phase-7
enrichment no longer needs a live GitHub Actions artifact to prove which arm/configuration/run produced
which affected stored path.

The complete source results contained far more unrelated failed and solved rows. Those full ZIPs are
still not committed to git because they are not needed to satisfy the high-value rescue objective and
would duplicate substantial specialist evidence. Their hashes and artifact identities remain recorded,
so a future archival policy may preserve them elsewhere if warranted.

The original metadata bundle remains useful for broader run/job/artifact context and should not be
replaced by the collision-focused authority bundle.

## 5. Exit evidence

- Machine-readable run metadata bundle: `docs/hint-evidence-phase0-source-run-rescue-2026-09-09.json`.
- Exact collision-authority rescue: `docs/hint-evidence-phase0-sept9-determinism-collision-authority-rescue.json` (six runs, 15 affected levels, 41 exact source observations, original manifest/result hashes and exact path hashes).
- This report, recording scope, method, what was captured, what was not, and why.
- No canonical Hint provenance, hint corpus file, or existing report was modified by this batch —
  verified by `git status`/`git diff` showing only the two new files above added.

Per plan §14.1 exit-evidence discipline: the baseline and currently recoverable high-value source
evidence (arm/configuration identity, source-run binding, and result-summary text) now remain
reconstructable without depending on future GHA artifact retention, for the high-value #1996 collision cohort without depending on future GHA retention. Full unrelated result rows remain intentionally outside this minimal rescue rather than an unresolved authority gap.

## 6. Next batch

Per the plan's default batch topology (§14.4), the next still-open batch is **Batch 2: semantic
ingress + historical missingness** (Phase 1) — migrating maintained readers/writers off the removed
`readLevelsWithHints`/`writeLevelsWithHints` facade, repairing the absent-capability-boolean
laundering in `upgradeProvenanceEntry()`, and making the July-11 synthetic-`foundAt` cohort decode as
unknown discovery time. This batch does not touch that work and leaves it fully open.
