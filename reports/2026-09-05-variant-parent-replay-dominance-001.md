# 79.7% of all stored hints are cross-variant replays, not fresh solves — and the variant-family robustness question remains genuinely untestable locally

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `provenance[0].solver.technique` prefix `variant-parent-replay` across all 172,604 hints in `data/stress/hints-random/`, cross-checked against whether variant-child level ids (e.g. `F00001-gr-04`) appear as standalone entries anywhere in the committed corpora, no new dispatch
> **Decision:** 1,687/1,700 (99.2%) of corpus2 levels have at least one `variant-parent-replay`-sourced hint, and 137,646/172,604 (79.7%) of all stored hints are replay-derived — a solution originally found on a generated variant child level, replayed back onto its parent. A dedicated variant-family-dataset tooling pipeline exists (`scripts/collect-variant-family-dataset-shard.mjs` and siblings, plus `.github/workflows/collect-variant-family-dataset.yml`) but has no merged output committed to the repo, and the variant-child ids referenced in hint provenance (e.g. `F00001-gr-04`) do not appear as standalone entries in any committed corpus file. This confirms `solver-future-work.md`'s existing statement that the variant-family robustness clause "remains untested — the current census carries no `familyId`/`parentId` data to join against" is still accurate: the *provenance* of family relationships is abundant in the hint stash, but the *census data* needed to test each variant child's own capability is not present locally.
> **Remaining gate:** running the existing variant-family-dataset collection pipeline (new dispatch) would be needed to actually test the robustness question — this report does not attempt that, per the "not contingent on GHA dispatch" scope of this batch.
> **Evidence role:** forensic — closes a specific avenue this session considered for answering an open future-work item, with a concrete explanation of exactly what is and isn't available locally
> **Selection:** whole hint population (172,604 hints, 1,700 levels), not a sample

## Method

Tabulated the prevalence of `variant-parent-replay`-prefixed technique strings across the full hint stash, then searched the committed repository for any corpus or dataset file containing the variant-child ids these technique strings reference (e.g. `F00001-gr-04`), and confirmed the existence (but absence of output) of the dedicated collection pipeline.

## Result

| | value |
|---|---:|
| levels with ≥1 `variant-parent-replay` hint | 1,687 / 1,700 (99.2%) |
| total replay-derived hints | 137,646 / 172,604 (79.7%) |
| variant-child ids found as standalone corpus entries | 0 |
| merged variant-family dataset artifact found in repo | none |

## Interpretation

This is a striking fact about the hint corpus's own composition — the large majority of stored "alternative solutions" for a given parent level did not originate from solving that parent level directly; they were discovered on a structurally-related variant and replayed back. This is valuable context for any future work using hint-pool richness as a difficulty/robustness signal (e.g. `2026-09-05-hints-per-level-vs-solver-count-001.md`): most of that richness is inherited from variant-family exploration, not independent fresh solves of the parent itself. But it does not unlock the variant-family robustness question the future-work backlog defers, because the actual family/parent *capability* data (does the T1 census solve the variant children the same way it solves the parent) is not present — only the fact that a replay *happened*, not the child's own standalone solvability record. The existing deferred disposition is correct and should not be reopened on this evidence alone.

## What this does not establish

- Does not run the variant-family-dataset pipeline to actually answer the robustness question — that would require new dispatch, outside this batch's scope.
- Does not characterize which specific replay patterns (group-reshuffle vs. local-mutant, per the naming convention observed) are more common — a finer breakdown was not attempted.
- Single hint-stash snapshot, corpus2 only.
