# Solver confirmation/transfer cohort reservation

> **Status:** active
> **Last evidence:** 2026-08-26 — reserved `confirm-broad-004` (unmaterialized), a costed larger-N successor to `confirm-broad-003` sized from the post-976 rejoin's own measured 1.76% repair-resistant-eligible rate
> **Decision:** broad confirmation has now completed three real one-use lifecycles, but `confirm-broad-003` surfaced a methodology gap the first two didn't hit: a plain fresh/broad uniform-random cohort cannot exercise a candidate whose eligible population is a strict superset of `needsRepairFallback`'s gate, because the early repair probe solves almost all such levels before the candidate's own new configs ever run. `confirm-broad-001` and `confirm-broad-002` are spent with real (if negative) verdicts; `confirm-broad-003` is spent but **inconclusive**, not negative. `confirm-broad-004` is reserved to retest `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` at a size the measured base rate says should actually participate. `transfer-envelope-001` remains locked and untouched.
> **Remaining gate:** materialize `confirm-broad-004` via `.github/workflows/solver-broad-confirmation.yml` and run the frozen `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` candidate against it; materialize `transfer-envelope-001` only after a candidate actually passes broad confirmation.
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

### `confirm-broad-003` — SPENT, INCONCLUSIVE (not a negative)

Reserved fresh before materialization because `confirm-broad-001`/`002` were already spent:

- 256 uniform-random raised-cap generated levels;
- generator revision `36c0744a3eaa6cd2ff787e8221032062ebd85f9d` (current, not the older pinned `4f2b2b14...` revision `confirm-broad-001`/`002` used — the generator itself was unchanged in between, verified by diffing `scripts/stress/generate-random.mjs` and `modules/domain` across the two revisions before reuse);
- master seed `2026082601`, IDs `G00001` onward;
- candidate: append plain `beam:intersectionHarvest@beam5000` + `beam:objectiveFirst@beam5000` to `attempts.ts`'s must-cross+flipper-heavy rule only (`STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`);
- final run [`32940910715`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/32940910715);
- result: **159/256 → 159/256**, **0 gains / 0 losses**, aggregate `workSpent` **byte-identical** (`29,676,406,171` both arms) — not merely a null, but zero measurable execution of the new configs anywhere in the cohort;
- verdict: **inconclusive / non-participating**, not confirmation-fail.

See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md)'s "Confirmation attempt" section for the full diagnosis.

#### Repair-saturation gap

`isMustCrossFlipperHeavy`'s eligibility gate (`mustCross≥2`, `mustPass≥3`) is a strict superset of `needsRepairFallback`'s gate (`REPAIR_MC_MIN=2`, `REPAIR_MP_MIN=3`), so every level eligible for this candidate's new configs is also eligible for the early repair probe that runs before the main loop. That rule's own code comment already documents that repair "now solves nearly everything in this archetype via its own early probe." The development population that produced `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`'s +3/-0 result was mined from Corpus 2's *current production misses* — levels the whole ladder, repair included, already fails on — so every development-eligible row was, by construction, repair-resistant. A fresh uniform-random cohort's eligible rows overwhelmingly are not: the early repair probe solves them first, and this candidate's new trailing configs never run.

This generalizes: **any candidate mined from a residual-miss analysis (the dominant source of Priority 1's candidates) risks the identical wall in confirmation**, because "helps solve levels that survive the whole current ladder" is exactly the premise that makes a candidate invisible to a plain fresh cohort. Two candidate fixes, neither built yet:

1. a much larger fresh cohort, sized so the *repair-resistant* eligible tail (not just the archetype-eligible population) is expected to appear in adequate numbers — the post-976 rejoin already measures this rate directly for `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` (30/1,700 ≈ 1.76% of Corpus 2 are current-production misses matching its rule), so `count≈1,200` (expected ≈21 participating rows, the same order as development's own 30-row population) is now a costed, specific estimate rather than an open question — see `confirm-broad-004` below;
2. a two-phase "control-failure residual" cohort: generate a large fresh pool, run the *control* ladder alone across it, freeze the subset it fails to solve, then run both arms only on that frozen residual. This mirrors exactly how Corpus 2's own 724-level residual population is defined (mining current misses), just applied to fresh generated levels instead of the existing corpus. Filtering by whether *control* solves a fresh level, decided before the real A/B ever runs, is a pre-outcome-neutral selection rule, not the same as selecting by whether *treatment* succeeds — but this needs a fresh committed cohort per candidate (the control-failure step still can't be reused across candidates once its exact composition has influenced a decision), and roughly doubles the compute cost of a confirmation run.

Neither option is implemented. Until one is, a `confirm-broad-*`-style plain broad cohort is the wrong instrument for any candidate this narrowly repair-gated, and a byte-identical-work result like this one should read as "wrong instrument," not "no effect."

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

`confirm-broad-004` is reserved for a retest of `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` — not a repeat of `confirm-broad-003`'s same shape hoping for better luck, but a specifically costed larger cohort:

- 1,200 uniform-random raised-cap generated levels (same generator mode as `confirm-broad-001`/`002`/`003`);
- master seed `2026082602`, IDs `H00001` onward — both values never used by a prior cohort;
- candidate: identical to `confirm-broad-003`'s (append plain `beam:intersectionHarvest@beam5000` + `beam:objectiveFirst@beam5000` to `attempts.ts`'s must-cross+flipper-heavy rule only);
- sizing rationale: the post-976 rejoin measures this rule's true repair-resistant-eligible rate directly at 30/1,700 ≈ 1.76% of Corpus 2 (not the coarser ~5.5% archetype-only prevalence `confirm-broad-003`'s report used) — at `count=1,200` the expected participating-row count is ≈21, the same order as the 30-row development population that produced the original +3/-0 result;
- acceptance rule unchanged: zero lost solves AND (≥1 gained solve OR ≥10% aggregate-work reduction);
- materialize via `.github/workflows/solver-broad-confirmation.yml`, `cohort_id=confirm-broad-004`, `count=1200`, `shard_count` raised proportionally (e.g. 60/arm, matching the density used elsewhere) so wall time doesn't scale linearly with the larger population, `enable_flags=STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE`, `node_budget=50000000` (same envelope as before).

If `confirm-broad-004` also comes back with implausibly low participation given this sizing, treat that as evidence the true rate is lower than the mined 1.76% figure (development's own population may itself be a slightly favorable draw) and move to the two-phase control-failure-residual design instead of scaling `count` further. `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` is closed negative in development and does not need a confirmation cohort at all.

The workflow that materializes these cohorts, `.github/workflows/solver-broad-confirmation.yml`, remains durable, checked-in plumbing (documented in `.github/workflows/README.md`) rather than bespoke one-shot YAML deleted after use — a third confirmation was enough repeated value to keep it (see that workflow's own header comment).
