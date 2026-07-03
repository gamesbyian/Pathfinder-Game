# Hint Corpus Expansion — Heatmap-Novelty Plan

## Goal

Expand the saved hint corpus only where it improves player-visible variety. The desired output is not
"as many valid paths as possible"; it is a bounded set of additional validated hints that make a level's
solution space look broader in the hint heatmap and give the display curator more genuinely distinct
paths to choose from.

This plan builds on [`hint-discovery-design.md`](hint-discovery-design.md), but adds three product
constraints:

1. Do not spend generation or storage budget on levels tagged `garbage`.
2. Do not let any one level exceed `1,000` saved hints.
3. Accept newly discovered hints only when they add coverage, curation novelty, or heatmap novelty
   relative to both the existing hints and the other newly accepted hints for that level.

## Definitions

- **Saved corpus:** each level's full `hints` array in `data/levels.json`.
- **Candidate:** a generated path that still must pass the PLAY referee before it can be saved.
- **Coverage novelty:** a candidate introduces a missing curator coverage cell, such as a new
  `(gate, portal-usage-signature)` pair, must-cross order, or near-Hamiltonian self-crossing pattern.
- **Heatmap novelty:** a candidate changes the full-hint heatmap in a visible way by visiting currently
  unused cells, cold cells, or underrepresented drawn edges.
- **Capacity:** `maxHintsPerLevel - existingHints.length`, with `maxHintsPerLevel = 1000` by default.
- **Garbage level:** any level whose Dev Mode rating tags or custom tags include `garbage`.

## Non-goals

- Do not change runtime hint display behavior in this project slice.
- Do not append generated hints without an audit summary.
- Do not relax path validity. Every saved hint must still be accepted by `validateCandidatePath` in PLAY
  context.
- Do not fill every level to 1,000 hints. The cap is a hard ceiling, not a target.

## Phase 0 — Eligibility and readiness audit

Add a read-only script that reports which levels are worth expanding before any generator runs.

Inputs:

- `data/levels.json` for level definitions and existing hints.
- Optional ratings JSON produced by `npm run levels:ratings-report -- --json`, used to skip levels with
  `garbage` in `tags` or `customTags`.
- CLI knobs:
  - `--max-hints=1000`
  - `--skip-tags=garbage`
  - `--ratings=<path>`
  - `--json`
  - `--limit=<n>` for the human-readable recommendation list.

Per-level output:

- level number;
- status: `eligible`, `skipped-tag`, or `at-cap`;
- existing hint count;
- remaining capacity before the hard cap;
- duplicate path count;
- `(gate, portal-usage-signature)` coverage-cell count;
- grid cells touched by at least one saved hint;
- non-object cells that no saved hint currently touches;
- cold-cell count using the lowest quartile of nonzero cell visit counts;
- heatmap entropy and top-cell dominance as concentration indicators.

Repository value:

- Gives a safe first command to run before generating anything.
- Makes the garbage-skip and 1,000-hint ceiling explicit and testable.
- Identifies levels where heatmap novelty is likely still available.

## Phase 1 — Shared scoring primitives

Status: in progress in `modules/domain/hint-novelty.ts`. The repo now has reusable audit and
candidate-evaluation primitives for exact dedupe, gate/portal coverage novelty, nearest drawn-edge
distance, and heatmap novelty scoring. Remaining generator work should call these primitives instead
of reimplementing acceptance logic.

Create shared pure functions for candidate acceptance so discovery and display curation do not drift.
The first extraction should cover:

- `pathSignature(path)` for exact dedupe;
- drawn edge set extraction, excluding portal jumps;
- cell visit set extraction;
- portal-usage signature extraction;
- self-crossing set extraction;
- must-cross first-entry and full-crossing order extraction;
- nearest-neighbor edge Jaccard distance;
- heatmap novelty scoring against existing accepted paths.

The existing display curation metric should remain the authority for what counts as a visually distinct
shown hint. Heatmap-specific scoring should be additive: it decides which extra hints are worth storing
for the full heatmap, not which hints are shown in the short play-mode cycle.

## Phase 2 — Acceptance policy

Status: in progress. `evaluateCandidateNovelty()` computes duplicate, coverage, distance, and
heatmap signals, and `decideCandidateAcceptance()` applies the reusable non-PLAY acceptance gate. The
future generator harness still needs to run PLAY validation first and apply ratings eligibility before
calling the shared gate.

Every generator should stream candidates into the same acceptance gate:

1. Validate with `validateCandidatePath` in PLAY context.
2. Reject exact duplicates against existing hints and same-run accepted hints.
3. Reject if the level is tagged with any skipped tag.
4. Reject if the level has no remaining capacity under `maxHintsPerLevel`.
5. Always accept coverage novelty, subject to capacity.
6. Otherwise require heatmap novelty at or above the calibrated floor, plus either:
   - distance to nearest saved/accepted path at or above the curation floor; or
   - direct heatmap expansion via at least one newly warmed cell or newly drawn edge.
7. Stop a level when either capacity is exhausted or the generator sees a configured number of valid but
   rejected candidates without adding meaningful novelty.

Initial defaults:

```text
maxHintsPerLevel = 1000
diversityFloor = 0.65
stagnationLimit = 2000 valid non-novel candidates
softTargetNewPerLevel = 50-200
```

## Phase 3 — Generator A: randomized-restart enumeration

Status: first candidate production exists in `scripts/hint-candidate-search.mjs`. It is not the full
randomized-restart enumerator yet; it is a read-only bridge that combines corner-flip mutations of
existing hints with baseline/forced-first-step solver calls, validates every candidate, and emits
accepted new hints to an audit JSON file by default. With `--write-levels`, it can append accepted
hints; committed writes have added 39 PLAY-valid heatmap-novel hints across levels 1, 22, 34, 40, 60, 100, 104, 112, 116, 124, 125, 127, 142, 145, and 147 and regenerated heatmaps.

Implement the full open-level generator from `hint-discovery-design.md` next:

- reuse solver move machinery rather than raw grid movement;
- randomize child order;
- continue after finding a solution;
- keep sound pruning only;
- shard by level and RNG seed;
- stream each valid candidate through Phase 2 acceptance immediately.

Expected role:

- High yield on open or lightly constrained levels.
- Must be throttled by heatmap novelty to avoid saving thousands of hot-corridor variants.

## Phase 4 — Generator B: seeded mutation

Implement prefix-anchored completion, then windowed segment resampling:

- use existing hints as hard-constraint scaffolding;
- replay a prefix or preserve prefix and suffix state;
- randomized-complete the remaining suffix/window;
- validate the completed candidate;
- stream into the same acceptance gate.

Expected role:

- Primary source of new candidates for must-cross-heavy, portal-heavy, and exact-intersection-heavy
  levels where blind enumeration rarely succeeds.

## Phase 5 — Optional targeted top-ups

Add cheap or targeted generators only after A/B audits expose remaining gaps:

- symmetry maps for invariant levels;
- crossover between compatible known hints;
- waypoint/order construction for specific missing must-pass or must-cross orders.

These should be driven by explicit gap reports, not enabled globally by default.

## Write path

A successful write run should:

1. produce a per-level audit file before touching `data/levels.json`;
2. append accepted hints without reordering levels;
3. format via the existing level JSON formatter path;
4. regenerate `data/level-heatmaps.json`;
5. run `npm run check:hint-validity` and `npm run test:hint-path-oracle`.

## Review criteria

A generated-hint batch is good if the report can say things like:

- skipped all `garbage` levels;
- no level exceeded 1,000 saved hints;
- accepted hints were a small fraction of valid candidates;
- accepted hints increased coverage-cell counts or must-cross order variety;
- accepted hints changed heatmap cells, especially untouched or cold cells;
- rejected candidates were mostly duplicates, near-duplicates, or low-heatmap-novelty variants.

A batch is bad if its main achievement is only a large raw candidate count.
