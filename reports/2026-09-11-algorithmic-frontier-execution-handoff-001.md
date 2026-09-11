# Algorithmic frontier execution handoff 001

> **Status:** active
> **Last evidence:** 2026-09-11 — post-1,029 residual atlas, class-4/class-5 coarse contrast, portal coarse-state salvage closed negative, admissible-order repricing deferred, and observer-only joint-obligation propagation promoted as the next frontier mechanism gate.
> **Decision:** characterize class 5 against class 4 while executing the joint-obligation observer. Exhaust existing static, provenance/profile, family, and bounded replay evidence before proposing a new algorithm family or broad solve campaign.
> **Remaining gate:** execute the static contrast, class-4-controlled observer, source-controlled profile/family joins, and bounded all-known-basin extinction sequence below.
> **Owner:** WS1 offline frontier characterization supporting the active WS2/WS1 joint-obligation observer gate.

## Execute first: static + production-response contrast

Run:

```bash
node scripts/stress/analyze-frontier-contrast.mjs \
  --atlas=reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json \
  --out=tmp/post-1029-frontier-contrast.json
```

Inspect `primaryClass5VsClass4` first, then the prespecified `compositionControlled` portal-bearing/intersection-heavy strata. Rank static numeric effects, mechanic-presence/routing effects, production work/attempt effects, lifecycle buckets, and best-badness technique. Do not threshold-mine a long tail of weak effects.

Important caveat: `bestBadnessTechnique` is not cross-technique-comparable enough to support a repair-dominance claim; main has already rejected that shortcut. Treat it as descriptive only.

## Joint-obligation observer: add the near-control requirement

The active gate is the observer-only joint-obligation propagation pilot from `2026-09-09-joint-obligation-propagation-and-residual-lane-handoff-001.md`.

Do **not** evaluate it on class 5 alone. Class 4 is more portal-bearing (86.5% vs 69.3%) and has more portal+must-cross+intersection-heavy overlap (43.5% vs 33.5%) than class 5. Therefore frequent observer firing on frontier levels does not establish a frontier mechanism.

Include a class-4 near-control, preferably composition-matched where practical, and ask whether observer signatures distinguish class 5 through safe dead-work capture, rejection/abstention patterns, known-live-prefix behavior, or another mechanism-level outcome. Preserve the pilot's existing zero-false-rejection/material-dead-work promotion gates.

## Existing source-controlled profile tool: execute, do not reinvent

The source/facet-stratified profile generator already exists:

```bash
node scripts/run-bundled.mjs scripts/stress/source-stratified-solution-profile.mjs -- \
  --corpus=stress2 \
  --out=reports/stress/solution-profile-corpus2-granular.json
```

At handoff there is no checked-in `reports/stress/solution-profile-corpus2-granular.json`, so this stage genuinely requires repository execution.

Do not compare combined profiles naively. Class 4 contains Pathfinder cold-capability provenance by definition and class 5 does not. Use origins/facets with useful coverage on both sides, such as witness/external/variant-replay strata, and report coverage before interpreting a profile axis.

## Existing variant families: query them, do not regenerate

The historical family resource is intentionally off `main` on branch `claude/variant-levels-solver-insights-tpk4qg`. Corpus-2 families are keyed by the same `Rxxxxx` parent IDs. Follow `docs/variant-level-research.md` and use current code against that branch as read-only data:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
npm run family:index -- --variant-family-dataset-root=../pathfinder-variant-research
npm run family:coverage -- --variant-family-dataset-root=../pathfinder-variant-research --corpus=corpus2
```

Look for class-5 parents with controlled relatives that historical evidence says became solvable or changed technique response. Treat historical outcomes as nomination evidence and recheck only the small decision-bearing boundary set on current code. Preserve parent as the independent unit. Do not generate a new bulk family corpus unless the existing resource cannot answer a concrete question.

## Representative-basin extinction: implement the missing minimum

The hint/provenance program already specifies all-known-basins first-loss analysis, but no obvious dedicated representative-basin selector is checked into `main` at handoff. Reuse existing hint/path, known-prefix-survival, divergence, replay, and observer primitives. Add only the smallest shared representative-path/basin selection needed for this cohort.

For a bounded provenance-diverse class-4/class-5 sample, locate the earliest point where **all known-live basins** disappear and classify:

- hard prune / false reject;
- state-key alias or merge;
- score/rank/beam-width cull;
- action/gate exposure;
- budget/participation;
- other representation/reasoning failure.

Do not infer unsupported alternatives dead merely because a stored basin vanished.

## Stop / promotion rules

- Static effects vanish after composition control -> record the null and move on.
- Joint-obligation observer fires similarly in matched class 4 and class 5 -> do not interpret mechanic concentration as frontier-specific evidence.
- Source-controlled solution structure separates strongly -> translate the strongest repeatable difference into a legal state/level mechanism hypothesis.
- Controlled family transforms repeatedly flip frontier behavior -> use those boundaries for causal localization/current-code rechecks.
- Class 5 disproportionately rejects/aliases known-live prefixes -> prioritize representation/reasoning repair.
- Viable basins survive but are rank/beam-culled -> prioritize scoring/retention/search policy.
- No coherent frontier-wide distinction -> subdivide class 5 by extinction/failure phenotype.
- No broad new census, giant solve campaign, new variant harvest, or heavyweight framework until a concrete unresolved mechanism warrants it.

## Durable output

Update `reports/2026-09-11-algorithmic-frontier-class4-vs5-contrast-001.md` with executed findings and the joint-obligation report with its controlled observer results. Update the live queue only when evidence changes priority or nominates a concrete intervention.
