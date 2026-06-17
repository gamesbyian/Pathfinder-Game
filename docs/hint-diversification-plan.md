# Hint Diversification Plan (Ablative Hint Discovery)

## Goal

Expand each level's saved `hints` array in `data/levels.json` with as many
genuinely distinct, valid solution paths as the solver can be coaxed into
finding. We do this by deliberately forcing the solver away from whatever
technique/gate/direction it would normally pick, so it's pushed toward
alternative paths through the same level rather than re-finding the path it
already found.

This is offline tooling only. It does not change runtime/play behavior.

## Mechanisms

Three independent levers, used in combination (full cross product):

1. **Start-gate enforcement** — for multi-gate levels, force the solver to
   start from one specific gate. Implemented with zero core solver changes:
   clone the normalized level object with `gateKeys` restricted to a single
   element (level objects from `normalizeRawLevelV2` are plain, unfrozen
   objects, so this is a safe shallow clone).

2. **Start-direction enforcement** — force the very first move out of the
   gate to a specific neighbor cell. Implemented via a new, additive,
   opt-in-only field: `prep._forcedFirstStepKey`, set through
   `opts.forcedFirstStepKey` on `solveLevelV2`. It's read only when the
   solver is standing on the literal start gate (`pos === startKey`), and
   simply filters the candidate neighbor list down to the one forced key.
   Gate cells can never be re-entered after leaving them, so this can only
   ever affect the first move of a search call — never a later revisit.
   Default is `null` (no effect), so normal play/hint-button solving is
   byte-for-byte unaffected.

3. **Technique disabling** — using the existing ablation framework
   (`scripts/ablation-config.mjs`), disable specific solver techniques and
   see what (if anything) still solves the level. Scoped to:
   - 12 `PROFILE_*` flags (policy profiles)
   - 8 `TEMPLATE_*` flags (structural templates)
   - 5 `STRATEGY_*` flags (LDS, diverse beam, state dedup, gate
     interleaving, parity gate filter)

   Explicitly **excluded**: the 13 `SCORE_*` scoring-term flags and the 9
   `PRUNE_*` pruning-rule flags. Disabling scoring terms or pruning rules
   mostly just makes the *same* path slower or unreachable in budget — it
   doesn't reliably produce a *structurally different* path the way
   swapping out a whole profile/template/strategy does, and 45-flag full
   cross product per (gate, direction) pair would be far too expensive for
   the approved runtime budget.

## Technique-disable algorithm: cascade, not blind sweep

A blind "disable each of the 25 flags one at a time" sweep is wasteful:
`solveLevelV2`'s attempt loop already tries every non-disabled config in
priority order per call, so disabling a technique that the search would
never have reached anyway (because a higher-priority technique already won)
produces an identical result to the run before it — pure waste.

Instead, for each (gate, forced-direction) combination we run a **cascade**:

1. Run the solver with no profile/template disables. If it fails, stop —
   nothing solves this combo.
2. If it succeeds, check the winning attempt's `profile`/`template`. Record
   the path (if novel). Disable just that one technique (template-level
   disable if a template was used for that attempt, otherwise profile-level
   disable).
3. Re-run with the accumulated disables. Repeat step 2.
4. Continue until a run fails to find any solution — this naturally and
   efficiently enumerates the full stack of techniques capable of solving
   that particular (gate, direction) combo, with no wasted no-op runs.

Strategy flags (`STRATEGY_*`) are not chained into the cascade — they're
tested as independent single-flag disables on top of the baseline (gated on
the baseline succeeding first), since `STRATEGY_GATE_INTERLEAVING` and
`STRATEGY_PARITY_GATE_FILTER` are structural no-ops once a single gate is
already forced.

## Per-level sweep structure

For each level:

- **Phase 0 — baseline.** Unconstrained solve (no gate/direction forcing,
  no disables). Establishes "what wins by default" and seeds the dedup set
  with whatever's already in `hints`.
- **Phase A — gate × direction × cascade.** For every gate in
  `level.gateKeys`, enumerate every legal first-step neighbor of that gate
  (via `createState` + `getNeighbors` against the real `prep`, so it
  automatically respects blocks/portals/filters — no manual geometry).
  For each (gate, direction) pair, run the profile/template cascade
  described above.
- **Phase B — strategy flags.** For each (gate, direction) pair whose Phase
  A baseline run succeeded, additionally try each of the 5 `STRATEGY_*`
  flags disabled independently (not chained).
- **Novelty filter.** A candidate path is kept only if its exact sequence
  signature (`path.join(',')`) doesn't match any existing hint or any path
  already discovered earlier in the same run.
- **Double validation.** Every novel candidate is re-validated with
  `SolverV2.validateCandidatePath()` (the same check
  `scripts/hint-path-oracle.mjs` uses as the CI gate) before being appended
  to `hints`.

## Checkpointing

This is a long (~1-3 hour) background job in a remote container that can be
reclaimed after inactivity, so partial progress must survive an interruption:

- After each level's sweep completes, `data/levels.json` is rewritten
  (atomic write: temp file + rename) with that level's newly discovered
  hints appended.
- A parallel JSON report file records per-level stats (baseline winner,
  combos tried, novel hints found, time spent) and is updated after each
  level too.
- An overall wall-clock safety-abort threshold (~150 minutes) stops the
  sweep gracefully (saving whatever's done) even if a level is mid-sweep.
- The script is re-runnable: it loads existing hints first, so re-running it
  (e.g., after a restart) just continues finding incrementally novel paths
  rather than duplicating work in the output, though it does currently
  re-run the search itself from scratch (no resume-mid-level checkpoint —
  resuming happens at level granularity).

## On-disk format

`hints` paths are arrays of dozens of packed integer keys, and across all 5
batches they grew to make up ~91% of `data/levels.json`'s size. Both writers
(`scripts/import-published-levels.mjs` and this script) serialize through
`scripts/level-json-format.mjs#stringifyLevelsJson` instead of
`JSON.stringify(data, null, 2)` — it pretty-prints objects/arrays-of-objects
normally (so grid/gates/blocks/etc. stay human-readable) but keeps any array
of plain primitives (i.e. every hint path) on a single line. This shrank the
committed file from ~1.56MB to ~744KB with zero change to the parsed content
(verified via deep-equality against the pre-reformat JSON). Plain
`JSON.stringify(..., null, 2)` would print one integer per line per hint —
avoid reintroducing that if `data/levels.json` is ever rewritten by hand or
by a new script.

## Batching

Levels are split into batches of ~33 levels to bound each run's wall-clock
time and keep commits reviewable:

| Batch | Levels  | Status |
|---|---|---|
| 1 | 1-33    | **Done** — 378 novel hints |
| 2 | 34-66   | **Done** — 481 novel hints |
| 3 | 67-99   | **Done** — 504 novel hints |
| 4 | 100-132 | **Done** — 469 novel hints |
| 5 | 133-154 | **Done** — 176 novel hints |

`data/levels.json` grew from 150 to 154 levels after running
`npm run levels:import-published` to pull newly published levels from
Firestore (levels 151-154; public-read collection, no
`FIREBASE_BEARER_TOKEN` needed). Batch 5's range was extended to 133-154
to cover them in the same run, at the user's request — they were swept
together rather than as a separate batch 6.

Batch 5 took ~7.8 minutes wall-clock (vs. ~1 minute for batch 1) because
it covers the historically slowest levels (L133, L136, L138-142, L145-147,
L154) — each failed/exhausted cascade round burns its full
`--attempt-budget-ms` ceiling, and these levels have more gates and more
legal first-step directions to cross-product over. No wall-clock halts
occurred; the run completed all 22 levels within the 150-minute cap.

Two test files asserted an exact, hardcoded "150 levels" count
(`scripts/data-assets-unit-tests.mjs`, `scripts/data-asset-runtime-smoke-test.mjs`).
Both were relaxed to `>= 150` so the suite tracks future level growth
instead of pinning a stale constant.

Batch 2 took ~81 seconds wall-clock across all 33 levels, finding 481 novel
hints — the highest yield density of any batch so far (L51 alone yielded 43
novel hints from 8 combos). No wall-clock halts occurred.

Batch 4 was run before batch 3, at the user's request (out of numeric
order). It took ~5.9 minutes wall-clock across all 33 levels, finding 469
novel hints (L131 alone took 65.8s — the slowest single-level combo
encountered in batches 1/2/4/5). No wall-clock halts occurred.

Before running batch 3, the one pre-existing duplicate hint signature
(L31, two byte-for-byte identical 39-step paths) was removed.

Batch 3 took ~2.1 minutes wall-clock across all 33 levels, finding 504
novel hints (L79 alone yielded 55 novel hints from 8 combos). No
wall-clock halts occurred.

All 5 batches are now complete, covering all 154 levels. Total hints
across the full level set: 2481, with zero duplicate signatures anywhere.

Each batch is run, validated (`npm run test:hint-path-oracle`, plus a
relevant slice of `npm run ci`), and committed separately before moving to
the next batch.

## Validation before commit

After any batch:

```bash
npm run test:hint-path-oracle    # validates all hint paths against level constraints
npm run test:bundled-levels      # schema + solver validation for all 150 levels
```

## Usage

```bash
node scripts/hint-diversification.mjs --levels=1-33 --output=audits/hint-discovery/batch1.json
```

See `scripts/hint-diversification.mjs` flags for budget tuning
(`--attempt-budget-ms`, `--max-wall-ms`).
