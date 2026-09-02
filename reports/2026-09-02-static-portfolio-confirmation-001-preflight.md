# static-portfolio-confirmation-001: population-scale rung-2 confirmation preflight

> **Status:** concluded-negative
> **Last evidence:** 2026-09-02 — run [33664473923](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33664473923) completed; see "Result" below
> **Decision:** `portfolio-11` is **not** coverage-safe on this population: it loses 11 of `full-menu`'s 74 solved levels (14.9%) for a 61.8% aggregate work saving. Per the prespecified acceptance rule, this blocks any recommendation to shrink the production technique menu to the top-11 by win-count. The small-scale EW1 demonstration's 0-losses result is now understood as an artifact of severe under-powering (2/60 solved), not a real signal.
> **Remaining gate:** none for this exact candidate/population. If gate-sequence (C) rung 2 continues, the next step is a materially different portfolio (e.g. top-15/top-20, or specialist techniques added back individually) tested fresh, not a re-run of this one.
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

## Result

Run [33664473923](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33664473923) completed in ~7 minutes (17:59:40–18:06:46 UTC) with all 15 shards and the combine job succeeding. Combined result (reconstructed from the combine job's own console log — see the note in [`static-portfolio-confirmation-001-combined.json`](stress/portfolio/static-portfolio-confirmation-001-combined.json), since the raw artifact's blob-storage URL is blocked by this session's own egress policy, not by the workflow):

| arm | cells | solved | work |
|---|---:|---:|---:|
| `full-menu` (34 techniques) | 150 | 74 | 5,548,131,339 |
| `portfolio-11` | 150 | 63 | 2,118,679,297 |

**Gained: 0** (expected — `portfolio-11` is a strict prefix, it cannot gain).
**Lost: 11** (14.9% of `full-menu`'s own 74 solves): `R01215`, `R01554`, `R02055`, `R02186`, `R02214`, `R02306`, `R02450`, `R02492`, `R02783`, `R03071`, `R03112`.
**Work delta: −3,429,452,042 (−61.8%)** — `portfolio-11` costs substantially less aggregate work, as expected for a shorter list that gives up sooner on levels it cannot solve.

**Per the prespecified acceptance rule: lost levels ≠ 0, so `portfolio-11` is rejected as coverage-safe on this population.** This is a decisive, well-powered result (74 solves on the control arm, versus the small-scale demonstration's 2) — the tail (positions 12–34) contributes real, non-trivial coverage on a representative population, not just theoretical/rare-case coverage. This directly explains why the earlier small-scale local demonstration (`reports/2026-09-02-static-portfolio-construction-pilot.md`'s third run) came back 0 losses: at only 2/60 solved, it never had enough solved cells to have a realistic chance of observing a loss at all — a clean illustration of why that run was explicitly labeled "not yet powered enough to confirm," not a real safety signal.

**Correction to the acceptance rule's own text above:** it said each lost level should be "cross-checked against the EW1 oracle-exclusivity table." That table only covers the 60 EW1-sample levels; none of these 11 lost levels are members of that sample (this population was deliberately drawn disjoint from it), so no such cross-check is possible or meaningful here — the EW1 table simply does not apply to a different population's lost levels. The correct generalization of that guardrail, unavailable without extra tooling this run did not need (the primary outcome already gives a clean answer), would be per-level winning-technique attribution within `full-menu`'s own solves — which specific tail technique(s) rescued each of the 11 lost levels. That would matter for design (concentrated in one or two techniques vs. spread across many specialists) but not for this report's own accept/reject question, which the zero-losses threshold already answers unambiguously.

## Disposition

Close the top-11-by-win-count portfolio candidate as tested: it is not coverage-safe on a representative population, contrary to what the underpowered small-scale demonstration suggested. Do not promote this exact candidate. If gate-sequence (C) rung 2 continues, next candidates could include a larger cardinality (top-15/top-20, trading less work-saving for less lost coverage) or per-level winning-technique attribution on this same population's already-collected data to see whether the 11 losses concentrate in a small number of specialist techniques worth adding back individually — both are fresh design questions, not implemented here.

## Addendum (2026-09-02, same day): per-level winning-technique attribution recovered

The raw `static-portfolio-combined`/per-shard artifacts for run `33664473923` remain blocked by this session's own egress proxy policy (the blob-storage download host is denied by organization policy — confirmed again this session, not a new block). Rather than re-dispatch the whole 300-cell confirmation to recover one missing field, this recovers just the missing datum: a local, non-shared, exact-commit reproduction of `full-menu` against only the 11 lost levels (`data/stress/static-portfolio-confirmation-001-population.json` filtered to the loss set), same `work_budget=67,000,000`/`per_technique_work_cap=2,000,000` protocol, run at `203e4bea61198e4602228eb84b346544ea7e7a31` — the exact head the confirmation run used (verified: only `scripts/build-static-portfolio-plan.mjs` changed between that commit and this branch's base, purely additive — a new optional `attemptBudgetMs` parameter defaulting to the prior hardcoded constant — so this reproduction is behavior-preserving, not merely "close enough"). `technique-census-cell.mjs`'s own `winningConfigKey` field (already recorded per cell, just not printed by the combine job's console summary) gives the exact per-level attribution directly, with no new instrumentation.

| production rank | winning technique | levels rescued |
|---:|---|---|
| 14 | `dfs\|score=portalFirstTransfer\|bias=none` | `R02492`, `R02783` |
| 16 | `beam\|score=objectiveFirst\|bias=none\|width=2000\|retention=plain` | `R01215`, `R01554`, `R03112` |
| 17 | `dfs\|score=perimeterSweep\|bias=perimeterCCW` | `R02186` |
| 19 | `beam\|score=mustCrossFirst\|bias=none\|width=2000\|retention=plain` | `R02055`, `R02450` |
| 20 | `dfs\|score=perimeterSweep\|bias=sideCommitment` | `R02214` |
| 28 | `admissible-order\|tieBreak=mustCrossFirst\|lds=off` | `R03071` |
| 30 | `beam\|score=harvestThenFinish\|bias=none\|width=2000\|retention=plain` | `R02306` |

**All 11 losses concentrate in exactly 7 distinct technique-position specialists** (out of the 23 techniques `portfolio-11` drops), each rescuing 1-3 levels, at ranks spread from 14 to 30 — not clustered at either the immediate next positions or the extreme tail. Two techniques (`objectiveFirst`/2000, `mustCrossFirst`/2000) each account for 2-3 levels; the other five are one-level rescues. Every reported `workSpent` is consistent with the technique's own rank (`≈ (rank−1) × 2,000,000` plus its own attempt cost), confirming the per-technique-cap accounting is working as designed, not an artifact of this reproduction.

**One caveat for any future production-wiring step (not for this menu-only research question):** the rank-28 rescuer (`admissible-order|tieBreak=mustCrossFirst`) is one of the three `admissible-order` tie-break profiles that [`the construction pilot's own addendum`](2026-09-02-static-portfolio-construction-pilot.md) found are **architecturally unreachable in today's real production orchestration** — `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` is a closed default-off opt-in gating their real node/work reserve, separate from the unconditional default-on `STRATEGY_ADMISSIBLE_ORDER` tier that runs the `default`/`none` profiles. `technique-census-cell.mjs`'s per-technique-work-cap execution model bypasses that reserve gate entirely (as it already did for `full-menu` in the original run — this is not a new inconsistency introduced by a candidate portfolio), so this finding is valid evidence **for the static-portfolio research question** (which techniques would matter under a redesigned bounded-share scheduler) but is not, by itself, a green light to wire this exact technique into real production without first revisiting that closed opt-in on its own terms.

This closes the exact gap the main report's own "Correction to the acceptance rule's own text above" section flagged as unavailable without extra tooling. See [`static-portfolio-confirmation-002-preflight.md`](2026-09-02-static-portfolio-confirmation-002-preflight.md) for the candidate this attribution motivates and its own fresh confirmation population (this exact 7-specialist selection was chosen after seeing this population's own losses, so re-testing on this same 150-level population would not be independent evidence — see that report for the disjoint cohort used instead).
