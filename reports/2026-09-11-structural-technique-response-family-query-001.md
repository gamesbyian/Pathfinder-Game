# Structural technique-response family query 001 (stage 3 attempt)

> **Status:** inconclusive
> **Last evidence:** 2026-09-11 — queried the existing variant-family dataset (`claude/variant-levels-solver-insights-tpk4qg` via worktree, per `variant-level-research.md`) for the two escalated pairs from `2026-09-11-structural-technique-response-temporal-difficulty-confirmation-001.md`.
> **Decision:** the existing family-census evidence cannot directly answer stage 3 for these two pairs as recorded. It stores only the single production-ladder **winning** config per variant (from `portfolio-solve-sweep.mjs`-style whole-ladder solves), not per-technique isolated outcomes — so there is no way to tell from stored evidence alone whether `beam:objectiveFirst@5000/plain` specifically succeeded where `beam:objectiveFirst@5000/mechanic-buckets` specifically failed (or vice versa) on a given variant unless one of those two exact configs happened to be the ladder's overall winner. Do not infer a null result from this; it is a data-shape gap, not evidence against a family boundary.
> **Remaining gate:** a bounded isolated-technique resolve of the two exact configs (not new variant generation) against the already-existing variants of one parent per pair, sized below.
> **Evidence role:** discovery — data-availability triage only. No solver dispatch in this step.

## What was queried

Built the disposable family index against the fetched worktree (`npm run family:index -- --variant-family-dataset-root=../pathfinder-variant-research`: 9,864 families, 97,154 variants, 1,962 parents). Extracted the `leftOnly`/`rightOnly` disagreement level-ID populations for the two escalated pairs directly from `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `solvingActions` field (counts matched the frozen summary's `leftOnly` exactly: 63 for `objectiveFirst`, 41 for `intersectionHarvest` — confirms correct extraction).

Checked family coverage (`npm run family:coverage`) for these disagreement IDs: the large majority (e.g. 9/10 and 9/10 of a first sample from each pair) have full family coverage (5 families / 47 variants, or 3 families / 30 variants, each corpus2 parent).

## Why stage 3 cannot proceed as originally framed

Each parent's families use one of the existing generator modes: `symmetry`, `swap`, `constrained-shuffle`, `group-reshuffle`, `local-mutant`, `re-embed`, `density-sweep`. None of these is a direct portal-count or intersection-count transform (`docs/solver-future-work.md`'s "Mechanic-composition transfer / generator expansion" entry already flags that the topology generator omits portals entirely — this extends that finding to intersection-count specifically: no mode is documented as adding/removing a required-intersection crossing either). `local-mutant`/`swap` move or exchange existing objects (blocks, mustPass, library, falseGoals, statue) without a stated portal/intersection-count contract.

More fundamentally, inspecting the raw evidence (`logs/family-census/solve-*.json` behind the index) shows each variant record carries exactly one `winningConfig` — the config that won the **whole production ladder** on that variant, not a per-config isolated census. For the two pairs in question, this means: unless `beam:objectiveFirst@5000/plain` or `.../mechanic-buckets` happens to be the recorded ladder winner on a given variant, the stored evidence says nothing about how either of those two specific configs individually fared there. This is a fundamentally different evidence shape from the frozen `level-capability.json`'s `solvingActions` (an isolated per-technique census over the *parent* stress corpus), which is what made the original pair contrast possible in the first place.

## What would answer it

A bounded isolated-technique resolve: run exactly `beam:objectiveFirst@5000/plain`, `beam:objectiveFirst@5000/mechanic-buckets`, `beam:intersectionHarvest@5000/plain`, and `beam:intersectionHarvest@5000/mechanic-buckets` (four fixed configs, matching the frozen census's own action identities) against the already-existing family variants of one parent per pair — no new variant generation, reusing the family manifests already present in the fetched worktree. A natural pilot-sized choice is one parent per pair with intermediate coverage (avoiding a 0/N or N/N ceiling that cannot show a flip), e.g. from the sampled coverage: `R02052` (solved 2/47) or `R02687` (30/47) for the `objectiveFirst` pair, and `R02094` (23/47) or `R02390` (36/47) for the `intersectionHarvest` pair — all corpus2, 5 families / 47 variants each.

This was not run in this pass: it is genuine new solver compute (bounded to ~47 variants x 2 configs x 1 parent x 2 pairs = a few hundred solves at most), and this session's remaining budget was better spent documenting the gap precisely so a future pass does not re-discover it, per the standing instruction to reconcile before spending compute.

## Disposition

- Do not treat the absence of a portal/intersection-specific family mode, or the lack of a winning-config match, as evidence against either escalated pair's mediator hypothesis. Both are data-availability gaps, not null results.
- The next earned action for stage 3 is the bounded isolated-technique resolve above, not a broader family campaign and not new variant generation.
- `docs/solver-future-work.md`'s "Mechanic-composition transfer / generator expansion" entry already correctly scopes the portal-topology gap; this report additionally establishes that the *evidence shape* (winning-config-only) is the more immediate blocker for this specific stage-3 use, independent of generator coverage.
