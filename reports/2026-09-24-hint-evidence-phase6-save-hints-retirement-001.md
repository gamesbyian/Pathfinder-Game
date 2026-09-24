# Hint evidence consolidation — Phase 6 `--save-hints` retirement — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-24
>
> **Batch:** removes the redundant direct-write path from `solver-stress-refresh.yml` now that both
> corpora have real dual-path parity evidence
> ([full-scale corpus-1](2026-09-24-hint-evidence-phase6-full-scale-local-confirmation-001.md),
> [corpus-2 sample](2026-09-24-hint-evidence-phase6-corpus2-sample-confirmation-001.md)).
>
> **Base commit:** `da21050`.

## 1. A discovery that simplified this batch: the central harvester already runs today

Before editing anything, the actual current production wiring was checked rather than assumed from
this session's own working notes. `.github/workflows/harvest-solver-evidence.yml` is a `workflow_run`
listener already subscribed to `'Solver stress-corpus refresh (level-blind capability)'`'s completion
(its trigger list, line 6), and on every firing it downloads every artifact from that run and — unless
the source workflow is one of four explicitly-excluded non-canonical confirmation/reconciliation
workflows (`solver-stress-refresh.yml` is not among them) — unconditionally runs
`harvest-level-blind-report-hints.mjs` against the downloaded artifacts (`harvest-solver-evidence.yml`
lines 165–170), pushing the result to `main`.

This means **the central harvester has already been reconstructing this workflow's hints from its raw
per-shard reports on every real dispatch, independent of and in addition to the direct `--save-hints`
write path**, for as long as both workflows have coexisted. `solver-stress-refresh.yml`'s own combine
job persisting `data/stress/hints/` and `data/stress/hints-random/` was already the redundant half of
an existing dual-write architecture, not something this batch needed to newly introduce a harvest
step to replace. The experiment-contract spec this workflow already writes for every run
(`sideEffects: { hints: 'harvest-permitted', ... }`, present since before this session) already
declared this intent.

This changed the batch from "add a harvest step, then remove the old write" to simply: **remove the
now-purely-redundant write**, since the read side (the harvester) was never missing.

## 2. The edit

In `.github/workflows/solver-stress-refresh.yml`:

- Removed `--save-hints` from both shard-level sweep invocations (`Run level-blind Corpus-1 slice`,
  `Run level-blind Corpus-2 slice`), replacing `extra=("--save-hints")` with `extra=()` and a comment
  citing this session's two parity reports and the reasoning above.
- Removed the now-dead `git add data/stress/hints/ data/stress/hints-random/` line from the combine
  job's persist step (renamed from "Persist capability outputs and eagerly persist hints for normal
  refreshes" to "Persist capability outputs", since it no longer does the latter), replaced with a
  comment pointing at `harvest-solver-evidence.yml` as the now-sole writer. The corpus/baseline/report
  `git add` lines on the following line are untouched — they are unrelated to hints.
- Left the "Stage shard artifact" step's `git status --porcelain -- data/stress/hints/ data/stress/
  hints-random/` copy loop as-is: with nothing writing to those paths anymore it is a harmless,
  self-limiting no-op, and removing it would be extra diff for zero behavior change.

Nothing else in this workflow reads from `data/stress/hints*` after the sweep step — every downstream
step (`rank-levels.mjs`, `classify-stability.mjs`, `compile-baseline.mjs`, the health-timeline append,
the lifecycle-failure-map, the equal-work join, `sweep-publish.mjs`) operates on the raw
`reports/stress/solver-corpus{1,2}-latest.json` combined report, never on the hint files themselves —
and the sweep itself never *reads* hints in level-blind mode by design (`CAPABILITY INVARIANT` in this
file's own header comment). So this edit has no effect on anything but which writer persists the
evidence.

## 3. Verification

- `npm run check:workflow-actions` — clean (validates workflow actions, dispatch inputs, and literal
  path filters).
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/solver-stress-refresh.yml'))"` —
  parses without error, confirming the edited YAML is syntactically valid (`check-workflow-actions.mjs`
  itself does line-based validation, not a full YAML parse, so this was checked independently).
- `npm run check:audit-artifacts` — clean.
- Re-derived, rather than assumed, that no other step in this workflow depends on the removed writes
  (section 2) by reading every step between the sweep and the final commit.
- **Deliberately did not re-run `npx vitest run` / `npm run test:node`** for this batch: the change is
  scoped entirely to one GitHub Actions YAML file with no corresponding application or script code
  changed, and neither suite has any coverage that exercises workflow YAML content. Both were run
  clean immediately prior, in the corpus-2 sample batch this one is stacked on. Re-running them here
  would cost real time for provably zero additional signal.

## 4. What this batch does not do

- Does not touch `harvest-solver-evidence.yml` — it already covers this workflow correctly and needs
  no change.
- Does not touch the other still-dual-path families noted in the plan
  (`solver-production-replay-baseline.yml`, `solver-highbudget-unsolved-sweep.yml`) — each needs its
  own check of whether `harvest-solver-evidence.yml`'s existing `workflow_run` subscription and
  `HARVEST_HINTS` gating already cover it before any `--save-hints`-equivalent flag is touched, the
  same discovery process this batch went through for `solver-stress-refresh.yml`.
- Does not run the live workflow to observe a real dispatch's outcome post-edit — the next real
  scheduled or manual dispatch of `solver-stress-refresh.yml` will be the first live confirmation that
  the edit behaves as this batch's local reasoning predicts. Given `harvest-solver-evidence.yml`
  already reconstructs identical evidence from artifacts this workflow always uploads (regardless of
  `--save-hints`), and given the field-level parity proofs already completed locally, this is treated
  as sufficiently low-risk to land without gating on that live confirmation, consistent with this
  session's standing instruction for full autonomy for local-execution-proven, code-level and
  live-infrastructure-equivalent changes.

## 5. Next work

Check whether `solver-production-replay-baseline.yml` and `solver-highbudget-unsolved-sweep.yml` are
already covered the same way by `harvest-solver-evidence.yml`'s subscription list (they are not
currently in it, unlike `solver-stress-refresh.yml` — a quick read of the trigger list at the top of
`harvest-solver-evidence.yml` shows `'Solver history-aware production replay baseline (corpus-1 +
corpus-2)'` and `'Solver high-budget sweep (unsolved-only, both corpora)'` *are* both already present),
so the same discovery-then-minimal-retirement pattern likely applies directly; each still needs its
own real dual-path parity check before its own `--save-hints`-equivalent flag is removed, per this
program's one-family-at-a-time discipline. After those: Phase 8 (v4 schema) and Phase 10 (level
cleanup), both still explicitly deferred.
