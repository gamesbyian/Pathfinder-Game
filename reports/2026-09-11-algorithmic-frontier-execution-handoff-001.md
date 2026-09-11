# Algorithmic frontier execution handoff 001

> **Status:** ready-for-execution
> **Last evidence:** 2026-09-11 — post-1,029 residual atlas, class-4/class-5 coarse contrast, and closure of portal coarse-state salvage as negative.
> **Decision:** exhaust the already-available static, provenance/profile, family, and bounded replay evidence before proposing a new algorithm family or broad solve campaign.
> **Owner:** WS1 parallel offline frontier characterization; bounded WS2 admissible-order repricing and the 26-level WS1 menu-expansion candidate are the current production-facing neighbors after portal salvage closed negative.

## Question

What important differences distinguish the current class-5 algorithmic-frontier candidate cohort (388/671 current Corpus-2 misses with no known rescuer after reconciliation) from the nearby class-4 control (200/671 misses with zero isolated T1 winners but a historical strict cold-capability Pathfinder rescuer)?

Class 4 is the primary control because both groups already sit beyond the frozen isolated-T1 capability matrix. Classes 1-4 combined are only a secondary operational comparator.

## What is already done

- The residual atlas and five-class membership are checked in under `reports/stress/residual-atlas/2026-09-11-post-1029-671/`.
- The first coarse class-5/class-4 comparison is recorded in `reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md`.
- `scripts/stress/analyze-post-1029-residual-atlas.mjs` now rebuilds the atlas with a `frontierContrast` section using the existing `scripts/stress/features.mjs` vocabulary plus production work/attempt telemetry.
- The contrast math lives in `scripts/stress/frontier-contrast-lib.mjs` with a focused unit test.
- Coarse evidence already rejects a simple “frontier = more portal/mechanic complexity” story: class 5 is less portal-bearing and has less portal+must-cross+intersection-heavy overlap than class 4, while being modestly more intersection-heavy.
- Portal coarse-state salvage has independently closed negative after exact `R01273` localization and bounded salvage attempts. Do not make frontier characterization wait on that line or reopen its tested subkey/retention shapes.

## Execute first: full static + production-response contrast

Run the extended atlas analyzer on the current branch:

```bash
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/34531412380/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/post-1029-residual-atlas.json
```

Inspect `frontierContrast.primaryClass5VsClass4` first. Rank static numeric effects, mechanic-presence effects, routing effects, production work/attempt effects, lifecycle buckets, and best-badness technique. Repeat the most material contrasts inside the large portal-bearing and intersection-heavy strata where sample size permits. Do not threshold-mine a long tail of weak effects.

If the rerun disagrees with the checked coarse counts, stop and reconcile the class membership/data inputs before proceeding.

## Existing source-controlled profile tool: execute, do not reinvent

The source/facet-stratified profile generator already exists:

```bash
node scripts/run-bundled.mjs scripts/stress/source-stratified-solution-profile.mjs -- \
  --corpus=stress2 \
  --out=reports/stress/solution-profile-corpus2-granular.json
```

At handoff time there is no checked-in `reports/stress/solution-profile-corpus2-granular.json`, so this stage needs repository execution rather than another planning pass.

Do not compare combined profiles naively. Class 4 contains Pathfinder cold-capability provenance by definition and class 5 does not. Use origins/facets with useful coverage on both sides, such as witness/external/variant-replay strata, and report coverage before interpreting a profile axis.

Priority solution-space axes are portal use/order, must-cross order/rigidity, objective-satisfaction depth, turn/path-shape summaries, prefix diversity, basin distinctiveness, discovery saturation, and depth-wise known-live decision support where available.

## Existing variant families: query them, do not generate replacements

The large historical family resource is intentionally off `main` on branch `claude/variant-levels-solver-insights-tpk4qg`. Corpus-2 families are keyed by the same `Rxxxxx` parent IDs used by the current residual. Use current code against that branch as read-only data, following `docs/variant-level-research.md`.

Recommended setup/query path:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
npm run family:index -- --variant-family-dataset-root=../pathfinder-variant-research
npm run family:coverage -- --variant-family-dataset-root=../pathfinder-variant-research --corpus=corpus2
```

Look for class-5 parents with controlled relatives that historical evidence says were solved, or whose transform materially changed technique response. Treat historical outcomes as nomination evidence and recheck only the small decision-bearing boundary set on current code. Preserve parent as the independent unit. Do not launch new bulk variant generation unless the existing resource demonstrably cannot answer a specific question.

## Representative-basin extinction: implement only the missing minimum

The hint/provenance program already specifies all-known-basins first-loss analysis, but no obvious dedicated representative-basin selector is checked into `main` at handoff time. Reuse existing hint/path, known-prefix-survival, divergence, replay, and observer primitives. Add only the smallest shared representative-path/basin selection needed for this cohort rather than a general framework.

For a bounded, provenance-diverse sample from class 4 and class 5, locate the earliest point where **all known-live basins** disappear and classify it as:

- hard prune / false reject;
- state-key alias or merge;
- score/rank/beam-width cull;
- action/gate exposure;
- budget/participation;
- other representation/reasoning failure.

This is the mechanism gate. Do not infer that an unsupported alternative is dead merely because a stored known-live basin disappeared.

## Stop / promotion rules

- If static effects mostly disappear after composition stratification, record the null and move to solution-space/trajectory evidence rather than feature mining.
- If source-controlled solution structure separates classes strongly, translate the strongest repeatable difference into a legal current-state/current-level mechanism hypothesis.
- If controlled family transforms repeatedly flip frontier behavior, use those boundaries for causal localization and current-code rechecks.
- If class 5 disproportionately falsely rejects or aliases known-live prefixes, prioritize representation/reasoning repair.
- If viable basins survive but are repeatedly rank/beam-culled, prioritize scoring/retention/search-policy work.
- If there is no coherent frontier-wide distinction, subdivide class 5 by extinction/failure phenotype instead of forcing one mechanism.
- Do not start a broad new census, giant solve campaign, new variant harvest, or heavyweight algorithm framework until a concrete unresolved mechanism justifies it.

## Expected durable output

Update `reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md` with executed results and update `docs/solver-optimization-workstreams.md` only when the evidence changes the live next gate or nominates a concrete mechanism/intervention. Keep raw/generated analysis under the existing `reports/stress/` families rather than creating a parallel evidence system.
