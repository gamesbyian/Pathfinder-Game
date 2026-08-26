# Solver confirmation/transfer cohort reservation

> **Status:** active
> **Last evidence:** 2026-08-26 — reserved `confirm-broad-003` (unmaterialized) for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, the first candidate to reach confirmation since `confirm-broad-002`
> **Decision:** broad confirmation has now completed two real one-use lifecycles. `confirm-broad-001` and `confirm-broad-002` are spent; `transfer-envelope-001` remains locked and untouched because neither candidate survived broad confirmation. `confirm-broad-003` is reserved (identity/seed fixed, not yet materialized) for the next tuned candidate.
> **Remaining gate:** materialize `confirm-broad-003` via `.github/workflows/solver-broad-confirmation.yml` and run the frozen `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` candidate against it; materialize `transfer-envelope-001` only after a candidate passes broad confirmation.
> **Evidence role:** discovery
> **Selection:** prespecified cohort lifecycle; each confirmation candidate, work envelope, and acceptance rule was frozen before its cohort was materialized
> **Manifest:** [`stress/managed-evaluation-populations-2026-08-24.json`](stress/managed-evaluation-populations-2026-08-24.json)
> **Protocol:** [`2026-08-23-solver-confirmation-transfer-protocol-design.md`](2026-08-23-solver-confirmation-transfer-protocol-design.md)

## Lifecycle now exercised

The reservation mechanism has moved from paper design to working evidence discipline.

### `confirm-broad-001` — SPENT

- 256 ordinary raised-cap generated levels;
- generator revision `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- master seed `2026082417`, IDs `C00001` onward;
- candidate: global suppression of ordinary-main-loop `dfs:objectiveFirst` and `dfs:intersectionHarvest`;
- final valid run `32908734154`;
- result: **140/256 → 141/256**, **+3/-2**, work -0.22%;
- verdict: failed frozen zero-loss gate.

The first attempts exposed an infrastructure lesson: independently invoking the pinned generator with the same seed did not guarantee byte-identical cohort wrappers, and deeper generation behavior could not safely be assumed reproducible across separate jobs. The valid workflow therefore materialized the cohort **once**, sealed the `levels` hash, and made every arm download and verify the same artifact before search. That single-specimen pattern is now the required confirmation contract.

### `confirm-broad-002` — SPENT

Reserved fresh before materialization because `confirm-broad-001` was already spent:

- 256 ordinary raised-cap generated levels;
- same pinned generator revision;
- master seed `2026082517`, IDs `D00001` onward;
- candidate: selective exposure of `beam:intersectionHarvest@beam5000(diverse)` in the two existing very-high-intersection policy bundles when `mustCross < 2`;
- final run `32912881453`;
- result: **126/256 → 126/256**, **0 gains / 0 losses**, treatment work about +0.01%;
- verdict: failed frozen gate as a clean null.

See [`2026-08-25-diverse-ih-confirm-broad-002-freeze.md`](2026-08-25-diverse-ih-confirm-broad-002-freeze.md).

### `transfer-envelope-001` — LOCKED / UNTOUCHED

- role: transfer/challenge;
- size: 256 independent generated levels;
- generator revision: `4f2b2b143ee2bc194b8e017fcc59a680b9ee8d92`;
- mode: `--envelope-caps`;
- master seed: `2026082429`;
- IDs on materialization: `T00001` onward;
- outcome conditioning: none.

It remains unmaterialized because neither broad-confirmation candidate passed. Do not spend it merely because it exists.

From the pinned generator checkout, its reserved recipe remains:

```bash
node scripts/run-bundled.mjs scripts/stress/generate-random.mjs \
  --envelope-caps \
  --count=256 \
  --master-seed=2026082429 \
  --id-prefix=T \
  --out=tmp/managed-evaluation/transfer-envelope-001.json
```

## Durable confirmation contract

Before any future decision-bearing confirmation:

1. select/tune only on development evidence;
2. freeze solver revision, exact treatment, total work envelope, primary outcome, correctness rule, gains/loss rule, and pass/fail criterion;
3. reserve a fresh cohort identity before materialization or inspection;
4. generate the cohort exactly once from its pinned source revision;
5. seal the generated `levels` content and give every arm that exact artifact;
6. verify cohort seal and treatment provenance before search;
7. record the aggregate verdict before inspecting changed IDs or traces;
8. mark the cohort spent after that one decision-bearing use;
9. if exact failures influence redesign, treat them as development evidence and reserve another successor.

Seeds and recipes may remain public for reproducibility. Freshness comes from non-use and non-inspection for candidate design, not secrecy.

## Relationship to existing corpora

Corpus 2, technique census, variant families, and spent confirmation cohorts are all development evidence for future hypothesis generation once they have influenced design. Level-blindness within those populations does not restore holdout status.

The two failed confirmations are themselves valuable evidence: both treatments looked positive on repeatedly studied development data, and neither survived a fresh broad cohort. Independent confirmation is therefore a demonstrated requirement for broad promotion claims in this project.

## Next reservation

`confirm-broad-003` is now reserved for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` (see [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)), the first candidate to earn confirmation since `confirm-broad-002`:

- 256 uniform-random raised-cap generated levels (same generator mode as `confirm-broad-001`/`002`);
- master seed `2026082601`, IDs `G00001` onward — both values never used by a prior cohort;
- candidate: append plain `beam:intersectionHarvest@beam5000` + `beam:objectiveFirst@beam5000` to `attempts.ts`'s must-cross+flipper-heavy rule only (`STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, default-off);
- acceptance rule fixed before materialization, same shape as the development gate: zero lost solves AND (≥1 gained solve OR ≥10% aggregate-work reduction);
- materialize via `.github/workflows/solver-broad-confirmation.yml`, `cohort_id=confirm-broad-003`, `enable_flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, `node_budget=50000000` (matching the development A/B's envelope).

This reservation supersedes the prior "no third broad cohort reserved" note. Unlike `confirm-broad-001`/`002`, the workflow that materializes this cohort is durable, checked-in plumbing (`.github/workflows/solver-broad-confirmation.yml`, documented in `.github/workflows/README.md`) rather than bespoke one-shot YAML deleted after use — a third confirmation is enough repeated value to keep it (see that workflow's own header comment).
