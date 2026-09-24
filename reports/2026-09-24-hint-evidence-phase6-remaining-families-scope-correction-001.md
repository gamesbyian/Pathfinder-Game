# Hint evidence consolidation — Phase 6 remaining-families scope correction — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — corrected an inaccurate forward-looking claim in the immediately preceding report after actually inspecting the two remaining dual-path families.
> **Decision:** the two remaining families need a new history-aware harvester, not a simple flag removal; this is real, larger Phase 6 scope, not a quick follow-up.
> **Remaining gate:** design and prove a history-aware portfolio harvester before removing --save-hints from either remaining workflow.
>
> **Date:** 2026-09-24
>
> **Batch:** corrects an inaccurate forward-looking claim in the immediately preceding report
> ([`2026-09-24-hint-evidence-phase6-save-hints-retirement-001.md`](2026-09-24-hint-evidence-phase6-save-hints-retirement-001.md),
> section 5), after actually inspecting the two remaining dual-path families instead of assuming they
> match the one just retired.
>
> **Base commit:** `69642dd`.

## What the prior report got wrong

Section 5 of the prior report said `solver-production-replay-baseline.yml` and
`solver-highbudget-unsolved-sweep.yml` "are both already present" in `harvest-solver-evidence.yml`'s
trigger list and that "the same discovery-then-minimal-retirement pattern likely applies directly."
The trigger-list membership is correct, but the conclusion drawn from it is not, and should not have
been stated without checking the one thing that actually determines whether retirement is simple:
what each workflow's raw report looks like and which harvester (if any) can read it.

Checked both workflows directly:

- Both run `scripts/portfolio-solve-sweep.mjs`, not `level-blind-capability-sweep.mjs`.
- Both declare `execution: { levelBlind: false, historyAware: true, historicalInputs: [...,
  'saved hints', ...] }` in their own experiment-contract specs — meaning these workflows **read**
  existing hints as a solve input (continuity/replay against known state), not just write newly
  discovered ones.
- `harvest-level-blind-report-hints.mjs`'s report walker explicitly skips anything where
  `summary.levelBlind !== true` (`scripts/harvest-level-blind-report-hints.mjs`, the `for (const file
  of walk(stagingDir)...)` loop). Since these two workflows' reports carry `levelBlind: false`, that
  harvester silently ignores them entirely — it was never reconstructing their hints, regardless of
  `--save-hints`.
- For these two families, `harvest-solver-evidence.yml`'s *other* unconditional call —
  `merge-hint-artifacts.mjs`, which structurally merges already-written canonical hint files carried
  in the shard artifacts — is the only mechanism giving `harvest-solver-evidence.yml` anything to
  merge for them. That importer depends entirely on `--save-hints` having already written those files;
  it does not reconstruct evidence from a raw report the way the level-blind harvester does.

**Consequence:** for `solver-production-replay-baseline.yml` and `solver-highbudget-unsolved-sweep.yml`,
`--save-hints` is not redundant today. Removing it without first building and proving an equivalent
report-reconstruction harvester for history-aware/`portfolio-solve-sweep.mjs` reports would delete
evidence outright, not merely deduplicate a redundant writer. This is a materially different, larger
piece of work than the one just completed — plausibly requiring its own new harvester script (a
`levelBlind: false`-aware sibling of `harvest-level-blind-report-hints.mjs`, which must additionally
distinguish a row that *replayed* an already-known hint from one that *discovered* a new path, since
these workflows read hints as an input and the report accordingly mixes both kinds of rows) plus its
own real local dual-path parity proof, following the same discipline as this session's level-blind
work but starting from a different, unproven report shape.

## Why this is being corrected now rather than left

This program's own standing discipline is to never let an inaccurate claim sit uncorrected in the
report trail once found — the same reason a prior batch this session corrected `harvest-cpsat-
discovery-reports-node-test.mjs`'s test contamination rather than quietly work around it. The
prior report's Phase 6 exit estimate was optimistic in a way a reader relying on it (a future
session picking up this plan, or a person reviewing progress) would be misled by if left standing.

## Corrected next-work statement

Migrating `solver-production-replay-baseline.yml` and `solver-highbudget-unsolved-sweep.yml` off
`--save-hints` is real remaining Phase 6 scope, but is sized more like "design and prove a new
harvester family" than "remove a flag now that the harvester already exists." It needs, at minimum:

1. A close read of `portfolio-solve-sweep.mjs`'s actual report row shape, specifically how it
   represents/distinguishes a hint-guided replay success from a newly discovered path.
2. A new harvester (or a generalization of the existing one) that reconstructs only genuinely new
   discoveries from that report shape, never fabricating a discovery event for a row that only
   confirmed pre-existing knowledge.
3. A real local dual-path proof analogous to this session's level-blind work, run against real
   `portfolio-solve-sweep.mjs` output before any `--save-hints` removal.

This is left as future Phase 6 work rather than attempted in this batch. Per the plan's own Phase 6
exit criterion ("no maintained workflow needs physical hint-store knowledge"), Phase 6 is not yet
fully exited; Phase 8/10 remain correctly deferred behind it.
