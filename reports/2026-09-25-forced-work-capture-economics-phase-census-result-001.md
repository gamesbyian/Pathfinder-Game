# Forced-work capture-economics phase census result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-25 — local rerun of the frozen 64-parent forced-work-prevalence probe with the existing phase-level singleton/singleton-to-singleton reducer extension, same population/protocol/code path as GHA run `35659746572`.
> **Decision:** global beam-phase collapse is rare (0.25% of resolved phases) and carries negligible already-spent discovery work (1,234 / 90,572,067 canonical work units, 0.0014%). Close the "global singleton-phase compression" batch-speed route per the seam audit's own admission band. The 25.33% per-parent one-successor-work reservoir is confirmed to reflect **local** forcedness inside a still-branching global beam, not global beam collapse.
> **Remaining gate:** none for global-phase compression. Post-recognition bookkeeping/replay overhead at the **per-parent** (not per-phase) seam remains a separate, unaddressed numerator if a future consumer wants to price it; no acquisition is currently queued for that.
> **Evidence role:** confirmation — executes the seam audit's own precommitted "next full frozen-sample rerun" using a reducer extension that already existed in the codebase; no new solver instrumentation or level generation.
> **Research question:** `WS2-FORCED-WORK-CAPTURE-ECONOMICS`
> **Owner:** WS2.
> **Production effect:** none. Research telemetry only, no `--save-hints`, no solver behavior change.

## Why this rerun needed no new acquisition

`reports/2026-09-21-forced-work-capture-economics-seam-audit-001.md` found that the original 25.33%
prevalence figure is a gross reservoir associated with per-parent forcedness, not directly removable
post-prune work, and set the remaining gate as: "rerun the frozen 64-parent probe with global
singleton/singleton-to-singleton phase telemetry... Extend the existing forced-work reducer using
observer stages that already exist. No new solver instrumentation is required."

Checking `scripts/stress/forced-work-prevalence-lib.mjs` before dispatching anything found the
phase-level reducer extension already present (`phaseEconomics` in `summarizeForcedWork`/
`summarizeForcedWorkAcrossRuns`: `resolvedPhases`, `singletonOutcomePhases`,
`singletonToSingletonPhases`, `allParentsForcedPhases`, `singletonOutcomeDiscoveryWork`) — but the
committed 2026-09-21 census summary (`reports/stress/forced-work-prevalence-census-summary-2026-09-21.json`)
does not carry any of those fields, meaning the decision-bearing artifact never actually reflects
them. This is therefore a genuine rerun requirement, not a data-analysis-only task: the existing
frozen population and protocol just needed to be replayed through the current reducer.

This ran entirely locally (`node scripts/run-bundled.mjs scripts/stress/forced-work-prevalence.mjs`),
not via GitHub Actions — the tool is a direct in-process beam-search probe over
`data/stress/stress-levels-random.json`, and per-parent canonical `workSpent` (the quantity this
question is actually about) is unaffected by host contention, unlike wall-clock.

## Protocol (unchanged, reused verbatim)

- Population: `data/stress/forced-work-prevalence-sample-2026-09-21.json` — the same frozen 64
  independent C2 residual parents (production-boundary run `35066677597`, artifact `10439992643`).
- Corpus: `data/stress/stress-levels-random.json`.
- Profile: `objectiveFirst`, beam width `5000`, per-gate work budget `5,000,000`, wall-safety deadline
  `600,000ms`.
- Command:

```bash
node scripts/run-bundled.mjs scripts/stress/forced-work-prevalence.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels-file=data/stress/forced-work-prevalence-sample-2026-09-21.json \
  --profile=objectiveFirst --width=5000 \
  --work-budget=5000000 --budget-ms=600000 \
  --out=reports/stress/forced-work-prevalence-phase-census-2026-09-25.json
```

## Reproduction check

Coverage and prevalence totals are **byte-identical** to the original 2026-09-21 census
(`reports/stress/forced-work-prevalence-census-summary-2026-09-21.json`):

| Metric | 2026-09-21 (GHA `35659746572`) | 2026-09-25 (this rerun) |
|---|---:|---:|
| Coverage | 63 exhausted / 1 work-budget-phase-boundary / 0 timed-out | identical |
| Expanded parents | 19,260,501 | identical |
| One-successor parents | 7,617,557 (39.55%) | identical |
| Total expansion work | 90,572,067 | identical |
| Forced (one-successor) expansion work | 22,944,663 (25.33%) | identical |

This confirms the rerun replayed the same population under the same code path/protocol — the new
phase-level numbers below are directly comparable to, and extend, the frozen result rather than
replacing it.

## New phase-level result

| Metric | Value |
|---|---:|
| Resolved beam phases (postHardPruneCount known) | 5,502 |
| Singleton-outcome phases (post-hard-prune frontier size = 1) | 14 (**0.25%**) |
| Singleton-to-singleton phases (incoming size = 1 AND outcome size = 1) | 11 (**0.20%**) |
| All-parents-forced phases (every expanded parent in the phase has exactly one survivor) | 48 (**0.87%**) |
| Discovery work already spent to reach a singleton-outcome phase | 1,234 canonical work units (**0.0014%** of total expansion work) |

## Interpretation

Per the seam audit's own preregistered admission bands:

> **rare global singleton phases:** close simple semantics-preserving forced-step compression as a
> batch-speed route; the 25.33% per-parent prevalence mostly reflects local forcedness inside a
> still-branching global beam.

0.25% singleton-outcome phases (14/5,502) and 0.20% singleton-to-singleton phases (11/5,502) are
decisively in the "rare" band, not the "common" bands that would have earned a direct-continuation
implementation or even a wall-time micro-optimization. The associated discovery work (1,234 units)
is negligible relative to the 90.6M-unit total — there is no material canonical-work reservoir sitting
behind rare global collapse, so even a perfect free recognizer for global singleton phases could not
plausibly matter at batch scale.

This **confirms** the seam audit's structural argument from a different angle: the beam's global
choice essentially never collapses to one candidate as a whole population; instead, individual
retained parents inside an otherwise still-branching frontier are frequently locked into their own
single successor (39.55% of expanded parents, carrying 25.33% of measured work). That is real,
recurring, broad *local* forcedness — but it is not the same claim as global beam narrowing, and a
consumer built around detecting a collapsed global phase would almost never fire.

## Disposition and next action

**CLOSE NEGATIVE** on global singleton/singleton-to-singleton phase compression as a batch-speed
route, per the seam audit's own preregistered interpretation table. This does not reopen or weaken
the 25.33% per-parent prevalence result (`reports/2026-09-21-forced-work-prevalence-result-001.md`),
which remains valid capability/reservoir evidence — it answers the specific phase-level numerator the
seam audit queued, and that numerator is negative.

Two numerators from the seam audit remain genuinely open if a future session wants to price them,
neither of which this census addresses:

1. **Post-recognition bookkeeping at the per-parent seam**: when an individual expanded parent (not
   a whole phase) has exactly one survivor, how much sorting/retention/materialization work can be
   skipped for *that parent* while preserving exact behavior? This is a per-parent consumer question,
   independent of how rare whole-phase collapse is.
2. **Earlier recognition**: is there a cheaper sound current-input test that establishes a parent's
   unique viable continuation before ordinary candidate expansion/hard pruning? Unresolved and not
   assumed here.

No production-inert or production-changing consumer is earned by this result. `WS2-FORCED-WORK-CAPTURE-ECONOMICS`'s
global-phase sub-question is closed; the per-parent bookkeeping numerator above would need its own
explicit acquisition/consumer-oracle gate before any implementation.

## Artifacts

- `reports/stress/forced-work-prevalence-phase-census-2026-09-25.json` — full per-parent/per-gate
  result with phase economics, this run.
- `data/stress/forced-work-prevalence-sample-2026-09-21.json` — the reused frozen population (no
  new acquisition).
- `scripts/stress/forced-work-prevalence-lib.mjs` — the reducer (already carried the phase-economics
  extension; unmodified by this report).
