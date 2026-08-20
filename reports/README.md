# Reports — index

Generated, human-readable analysis output from any tool — as opposed to [`logs/`](../logs/)'s raw
per-run data (see that directory's own `README.md`). This directory exists to orient a reader
(human or AI agent) who lands in the evidence store without prior context.

New or materially revised human-authored investigations follow the
[`Status / Last evidence / Decision / Remaining gate` convention](../docs/investigation-report-conventions.md).
Generated summaries are exempt; their embedded generator/run metadata is authoritative.

## The solver research narrative (loose dated files at this level)

For a repository-wide inventory of investigations that still lack a conclusion, stale active
statuses, and deliberately deferred work, see
[`2026-08-06-documentation-loose-threads-audit.md`](2026-08-06-documentation-loose-threads-audit.md).

The loose `YYYY-MM-DD-<topic>.md` files directly in this directory are individual investigation
writeups from the ongoing solver work. **Do not reconstruct current priorities by reading dated
filenames or reports chronologically.** Start from the authority appropriate to the question:

- [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) is the
  **ranked live entry point for optimizing existing solver techniques**.
- [`docs/future-work.md`](../docs/future-work.md) is the detailed evidence/disposition store and
  broader deferral record; its preserved historical ordering is not a competing optimization queue.
- [`docs/solver-research-operating-model.md`](../docs/solver-research-operating-model.md) coordinates
  the broader research lanes and sequencing model.
- [`docs/solver-development-roadmap.md`](../docs/solver-development-roadmap.md) is the historical
  campaign narrative and reusable workflow, not the current queue.
- [`docs/solver-architecture.md`](../docs/solver-architecture.md) is the durable implementation
  reference that folds in verified current conclusions.

Those synthesis/current-state docs cite the reports that matter at the point in the narrative where
they matter. A report may remain valuable evidence after its implementation or recommendation has
been superseded. Prefer its explicit status/decision block when present, then reconcile with the
current topic reference or queue before acting on it.

### Current reconciliation notes

- [`2026-08-20-technique-census-reconciliation.md`](2026-08-20-technique-census-reconciliation.md)
  records that the population technique census was successfully dispatched as run `32240161854` and
  is now decision-bearing evidence. The older
  [`2026-08-19-technique-census-design.md`](2026-08-19-technique-census-design.md) remains the detailed
  design/calibration record; its opening “not yet dispatched” status is historical pre-run state, not
  current tool status.

The full developer reference's
[`Solver Architecture / Common gotchas`](../DEVELOPER_REFERENCE.md#common-gotchas) section also
cites several reports for specific durable lessons rather than current priority.

The cross-document synthesis
[`2026-08-06-solver-blind-spot-cross-attempt-cooperation.md`](2026-08-06-solver-blind-spot-cross-attempt-cooperation.md)
identifies a recurring assumption in that narrative: search techniques within one cold solve are
usually treated as independent, all-or-nothing attempts, while known trajectories stand in for the
harder-to-measure family of possible completions. It proposes evidence-first tests of typed
within-solve handoffs between repair, beam/DFS, admissible-order search, and external oracles. It
also explicitly excludes stored hints, witnesses, and solved-level paths from production search;
those may be evaluation or separately-provenanced hint-guided inputs, never cold-solver inputs.

## Subdirectories

- [`families/`](families/) — raw per-level backing data for the sibling/cousin research system
  (`docs/sibling-cousin-system.md`). Has its own [`README.md`](families/README.md) indexing the
  parent-level ids and pointing to curated synthesis docs.
- [`portfolio/`](portfolio/) — generated outputs for the fast-portfolio-scheduler experiment
  (`docs/fast-portfolio-scheduler-plan.md`). Has its own [`README.md`](portfolio/README.md), a
  running chronological log of measurements and commands. The verdict lives in
  `portfolio/portfolio-scheduler-decision.md`.
- [`stress/`](stress/) — benchmark/novelty/solution-profile/witness-divergence outputs for the
  stress-test corpora (`data/stress/README.md`). Several files here are live tooling inputs, not
  just historical record — `solution-profile-published.json`/`-corpus1.json` and their
  `-summary.md` pairs are read and auto-refreshed by `scripts/stress/solution-profile-compare.mjs`
  (see `docs/solution-profile.md`); `witness-divergence-corpus1.json` is cited from
  `docs/solver-improvement-research-notes.md`. Treat anything in this subdirectory as
  potentially load-bearing, not pure archive.
- [`solver-determinism/`](solver-determinism/) — `determinism-report.md`, a standalone
  investigation into flaky solve/strategy identity (`runRepairProbe`'s wall-clock-gated race),
  cited from `docs/solver-architecture.md`'s "Wall-clock-gated search probes" section.
- `hint-workbench/` — gitignored local-workflow output from `hints:workbench` runs (see
  `docs/hint-workbench.md`); nothing here should be committed.

## Loose top-level data files

- `solver-winning-attempts.json` — generated by `scripts/analyze-solver-winning-attempts.mjs`
  (its hardcoded default `--output` path).
- `hint-selection.json` — a legacy 160-level selection snapshot whose git history starts at the
  2026-07-30 bulk import. No current generator or consumer uses its schema (`perGate`,
  `displayOrder`, `cappedByLimit`), so it is **quarantined, not authoritative**. Keep it only until a
  comparison with current hint-curation output establishes whether it contains unique evidence;
  then archive or delete it explicitly.
