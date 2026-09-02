# static-portfolio-confirmation-001: population-scale rung-2 confirmation preflight

> **Status:** active
> **Last evidence:** 2026-09-02 — this report; dispatch follows immediately after
> **Decision:** Dispatching `static-portfolio-confirmation.yml` with the exact protocol below. This report exists so the acceptance rule is fixed before any outcome is inspected.
> **Remaining gate:** the run's own result — see "Acceptance rule" below.
> **Evidence role:** confirmation
> **Selection:** prespecified — candidate, population, envelope, and acceptance rule are all fixed in this report before dispatch; the population was drawn by a seeded deterministic sampler, not hand-picked

## Context

[`docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) Workstream 2 gate-sequence (C) rung 2's own next gate, per [`2026-09-02-static-portfolio-construction-pilot.md`](2026-09-02-static-portfolio-construction-pilot.md): "a population-scale development A/B using the now-corrected `perTechniqueWorkCap` mechanism, on a population that is not the already-heavily-mined EW1 60-level sample, at an envelope large enough to give the compared portfolio sizes a well-powered chance to differ." This report is that population-scale confirmation, dispatched via a new GHA workflow (`static-portfolio-confirmation.yml`) built for this purpose.

## New infrastructure (built for this run, no solver/production code touched)

- `scripts/stress/select-random-sample.mjs` — deterministic seeded uniform random sample (FNV-1a → mulberry32 → Fisher-Yates, the same convention as `scripts/stress/benchmark.mjs`), with an `--exclude-ids-from` option to keep a confirmation population provably disjoint from an already-mined discovery sample.
- `scripts/combine-static-portfolio-shards.mjs` — purpose-built combiner (per-arm coverage/work, pairwise comparison against a named control arm, and a hard failure on any missing/duplicated cell against the plan) since `combine-technique-census-shards.mjs` is tightly coupled to technique-census's own T1-T4/baseline/hint-capture semantics.
- `.github/workflows/static-portfolio-confirmation.yml` — new workflow, modeled on `solver-level-blind-targeted-sweep.yml`'s artifact-only/no-commit shape. Reuses `technique-census.mjs`'s shard execution exactly as-is (no changes needed — it already runs an arbitrary cell list generically).

All three, plus the underlying `cell.perTechniqueWorkCap` mechanism from the prior commits, are unit-tested and were smoke-tested end-to-end locally (a 3-level/2-arm/2-shard dry run) before this dispatch.

## Protocol

1. **Treatment:** `portfolio-11` — the top 11 techniques by real production win-frequency (from `reports/stress/portfolio/ew1-static-portfolio-construction.json`'s `productionRanking.curve`), in that same rank order.
2. **Control:** `full-menu` — all 34 techniques, same rank order (so the two arms are byte-identical through position 11 by construction; they can only diverge once `portfolio-11`'s list is exhausted).
3. **Population:** a fresh 150-level uniform random sample of Corpus 2 (`data/stress/static-portfolio-confirmation-001-population.json`), seed `static-portfolio-confirmation-001`, drawn by `select-random-sample.mjs` with `--exclude-ids-from` set to the EW1 pricing snapshot — **verified zero overlap** with the 60-level EW1 sample every prior run in this line used. Not filtered by solved/unsolved status (representative, not hard-residual, unlike EW1).
4. **Envelope:** `work_budget=67,000,000` (the envelope this program's own established prior real A/Bs used, e.g. the `finishFirst` concentrated-population A/B — `node_budget=50,000,000` → `work=67,000,000`), `per_technique_work_cap=2,000,000` (chosen so up to 33 of the 34 `full-menu` techniques could each get a full share within the total envelope in the worst case — i.e. the tail has a genuine, not merely nominal, chance to be reached, unlike the pilot's first two local runs).
5. **Execution:** `static-portfolio-confirmation.yml`, `shards=15`, `workers=4`, both arms in the same dispatch (300 cells total).

## Primary outcome and acceptance rule

Because `portfolio-11` is a strict ordered prefix of `full-menu`'s own list, `portfolio-11` can only ever **lose** relative to `full-menu` on this protocol (never gain) — the tail can only add capability, not remove any `full-menu` already has through position 11. The primary outcome is therefore asymmetric:

- **Primary outcome:** the count and identity of levels `full-menu` solves that `portfolio-11` does not ("lost" levels).
- **Accept `portfolio-11` as coverage-safe on this population** if lost levels = 0. This nominates the smaller portfolio as safe to consider for broader rollout discussion — it does **not** by itself authorize any production change.
- **Any lost level blocks that conclusion outright** — per the pilot report's own rare-capability guardrail, each lost level must be individually cross-checked against the EW1 oracle-exclusivity table (does *any* technique solve it, and is the lost technique its sole solver) before any portfolio-shrinking recommendation, not waved through as noise.
- **Secondary outcome:** aggregate work delta (`full-menu` − `portfolio-11`), reported as the tail's own realized price tag on this population — expected positive (full-menu can only spend equal or more), not itself an accept/reject criterion.

## Stop condition

This is one well-powered population, not an escalating series. If the run comes back with a large share of cells never reaching the tail at all (this envelope's own version of the pilot's first-run degeneracy), that is **inconclusive due to under-powering at this envelope**, not a negative result — the fix would be a materially larger envelope or a harder-skewed population, not simply rerunning the same design. If lost levels are nonzero, this closes the "does an 11-technique portfolio never lose anything" form of the question (it does not, on this population) without ruling out other cardinalities or orderings.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=150 --seed=static-portfolio-confirmation-001 \
  --exclude-ids-from=reports/stress/ew1/33156541827-pricing-snapshot.json \
  --out=data/stress/static-portfolio-confirmation-001-population.json
```

Workflow dispatch: `static-portfolio-confirmation.yml`, `cohort_id=static-portfolio-confirmation-001`, all other inputs at their defaults (which already match this protocol).
