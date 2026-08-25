# Selective diverse-IH broad-confirmation freeze

> **Status:** active confirmation contract
> **Last evidence:** 2026-08-25 — development A/B run `32911007113`: 262 feature-defined Corpus-2 levels, control 122 solved, treatment 131 solved, +9/-0, aggregate canonical work 11,846,980,349 -> 11,795,480,124 (-0.43%)
> **Decision:** freeze the exact selective diverse-IH exposure treatment and test it once on fresh successor broad cohort `confirm-broad-002`; do not tune from confirmation rows before the aggregate verdict is recorded
> **Remaining gate:** run sealed `confirm-broad-002` control/treatment comparison under the frozen 67M canonical-work envelope and apply the prespecified no-loss acceptance rule
> **Evidence role:** confirmation freeze / preregistration

## Frozen candidate

- Solver revision: `fc696bac37bffea9ca8b8dbc7616639224fbf4dc`.
- Treatment: append exactly one existing action, `beam:intersectionHarvest@beam5000(diverse)`, to the same two very-high-intersection policy bundles when `mustCross < 2`.
- No beam-width, score, ordering, retry, repair, DFS, admissible-search, or total-budget change.
- The appended action gets no bespoke minimum-budget floor.
- Strict total canonical-work budget: 67,000,000 per level.
- Node ceiling: 50,000,000 per level.
- Wall deadline: 24h, intended non-binding.
- Objective: paired solve capability first; aggregate canonical work second.
- Correctness/validity: no deadline-truncated or attempt-error rows; every shard must use the identical sealed cohort and frozen solver/treatment patch.
- Development alternatives in this step: one prespecified selective exposure treatment derived from the post-976 portfolio rejoin; the broader global DFS-suppression candidate was a separate earlier experiment and is already closed.

## Frozen acceptance rule

Confirmation passes only if:

1. treatment loses **zero** control solves; and
2. treatment either gains at least **one** solve or reduces aggregate canonical work by at least **10%**.

Otherwise the exact treatment fails confirmation and closes. A net-positive solve count with any lost solves is a failure.

## Fresh reserved cohort: `confirm-broad-002`

`confirm-broad-001` was spent by the earlier scheduler candidate and is not reusable. This successor is reserved before materialization or outcome inspection.

- role: broad independent confirmation;
- exposure: `LOCKED` until the aggregate verdict is recorded;
- size: 256 independent generated levels;
- generator source revision: `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- generator: `scripts/stress/generate-random.mjs` v1.1.0 at that revision;
- mode: ordinary uniform-random raised-caps mode, matching Corpus-2 generation philosophy;
- master seed: `2026082517`;
- id prefix: `D` (`D00001` onward);
- outcome conditioning: none;
- selection: every generated row, no baseline-failure filtering or candidate-specific exclusion.

Materialize only from the pinned generator checkout:

```bash
node scripts/run-bundled.mjs scripts/stress/generate-random.mjs \
  --count=256 \
  --master-seed=2026082517 \
  --id-prefix=D \
  --out=tmp/managed-evaluation/confirm-broad-002.json
```

The Actions workflow must generate this cohort exactly once, seal the generated `levels` array hash, and make every control/treatment shard download and verify that same artifact before search.

## Exposure lifecycle

1. Candidate and acceptance contract frozen here.
2. Materialize `confirm-broad-002` once from the pinned generator revision.
3. Run frozen paired control/treatment arms.
4. Record aggregate pass/fail verdict before exact changed-row IDs are inspected.
5. Only after verdict may changed IDs be unsealed for diagnosis.
6. If confirmation rows influence redesign, this cohort becomes development evidence and a future redesigned candidate requires another fresh successor.

`transfer-envelope-001` remains untouched. It is not used unless this exact candidate first survives broad confirmation.
