# static-portfolio-confirmation-002: specialist add-back candidate preflight

> **Status:** active
> **Last evidence:** 2026-09-02 — local development sanity check (11/11 solved); population-scale confirmation run not yet dispatched
> **Decision:** not yet made; this report fixes the candidate, population, envelope, and acceptance rule before any run
> **Remaining gate:** dispatch `static-portfolio-confirmation.yml` with `cohort_id=static-portfolio-confirmation-002` and record the result below
> **Evidence role:** confirmation (the candidate itself is development evidence — see "Selection" below — but this specific test is on a cohort disjoint from every population that influenced its design)
> **Selection:** the 7 added specialists were chosen *after* seeing `static-portfolio-confirmation-001`'s own 11 losses (see [`that report's attribution addendum`](2026-09-02-static-portfolio-confirmation-001-preflight.md)) — high selection pressure. This report's own confirmation population is therefore a fresh, disjoint 150-level cohort, never used by any prior step in this line (EW1's 60, or confirmation-001's own 150).

## Context

[`docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) Workstream 2 gate-sequence (C) rung 2: `static-portfolio-confirmation-001` closed the naive top-11-by-production-win-count candidate negative (11/74 losses, 61.8% work saving) and nominated, as its own next gate, "per-level winning-technique attribution ... to see whether the 11 losses concentrate in a small number of specialist techniques worth adding back individually." That attribution is now done (see the linked addendum): **all 11 losses concentrate in exactly 7 distinct techniques**, at production ranks 14, 16, 17, 19, 20, 28, and 30.

## Candidate: `portfolio-18-specialists`

`portfolio-11` (production ranks 1-11) plus the 7 rescuing specialists, all in the same rank order (an ordered sub-selection of `full-menu`, not a strict prefix — the same "same relative order" convention `build-static-portfolio-plan.mjs`'s arms already use, just not contiguous past position 11):

| rank | technique | rescues (from confirmation-001) |
|---:|---|---|
| 1-11 | (same as `portfolio-11`) | — |
| 14 | `dfs\|score=portalFirstTransfer\|bias=none` | `R02492`, `R02783` |
| 16 | `beam\|score=objectiveFirst\|bias=none\|width=2000\|retention=plain` | `R01215`, `R01554`, `R03112` |
| 17 | `dfs\|score=perimeterSweep\|bias=perimeterCCW` | `R02186` |
| 19 | `beam\|score=mustCrossFirst\|bias=none\|width=2000\|retention=plain` | `R02055`, `R02450` |
| 20 | `dfs\|score=perimeterSweep\|bias=sideCommitment` | `R02214` |
| 28 | `admissible-order\|tieBreak=mustCrossFirst\|lds=off` | `R03071` |
| 30 | `beam\|score=harvestThenFinish\|bias=none\|width=2000\|retention=plain` | `R02306` |

18 techniques total (`data/stress/static-portfolio-confirmation-002-arms.json`), versus `portfolio-11`'s 11 and `full-menu`'s 34.

**Why this candidate does not need re-verifying against confirmation-001's own population as evidence:** by construction, each of the 7 additions is the exact technique that solved one or more of the 11 lost levels in that run. Cumulative per-technique-work-cap usage for an 18-item list is at most `18 × 2,000,000 = 36,000,000`, comfortably under the `67,000,000` envelope, so every added technique still gets its full nominal 2M share regardless of list position — no starvation risk the way the naive full-length list had for `repair` in the construction pilot. A local reproduction against just the 11 previously-lost levels (same commit, same envelope) is being run as a mechanical sanity check of the plan/execution path, not as confirmation evidence (see "Development sanity check" below) — the real question this report answers is whether an 18-technique menu built this way generalizes to unrelated levels, not whether it reproduces the exact population that motivated it.

## Development sanity check (not evidence, mechanism verification only)

Ran `portfolio-18-specialists` locally against just the 11 `confirmation-001` loss levels, same commit/envelope. **Result: 11/11 solved**, each by the same technique that rescued it in the `full-menu` attribution (`R01215`/`R01554`/`R03112` → `objectiveFirst`/2000; `R02186` → `perimeterSweep`/CCW; `R02055`/`R02450` → `mustCrossFirst`/2000; `R02214` → `perimeterSweep`/sideCommitment; `R02492`/`R02783` → `portalFirstTransfer`; `R03071` → `admissible-order` tie-break `mustCrossFirst`; `R02306` → `harvestThenFinish`/2000), confirming the mechanism as expected — every `workSpent` value is lower than the corresponding `full-menu` reproduction's own (e.g. `R02492`: 22,430,029 here vs. 26,430,246 under `full-menu` — reaching rank 14 after only 11 preceding positions instead of 13), exactly the cheaper-arrival effect the budget-headroom argument predicted. This is mechanism verification, not the confirmation question itself — the real test is the fresh disjoint population below.

## Protocol

1. **Treatment:** `portfolio-18-specialists` (18 techniques, above).
2. **Control:** `full-menu` (all 34 techniques, same rank order as `confirmation-001`'s own control).
3. **Population:** a fresh 150-level uniform random sample of Corpus 2 (`data/stress/static-portfolio-confirmation-002-population.json`), seed `static-portfolio-confirmation-002`, drawn by `select-random-sample.mjs` with `--exclude-ids-from` covering **both** the EW1 60-level sample and `confirmation-001`'s own 150-level population (210 excluded ids total) — verified zero overlap with either.
4. **Envelope:** identical to `confirmation-001` — `work_budget=67,000,000`, `per_technique_work_cap=2,000,000` — so results are directly comparable across the two confirmation runs.
5. **Execution:** `static-portfolio-confirmation.yml`, `cohort_id=static-portfolio-confirmation-002`, `shards=15`, `workers=4` (300 cells total).

## Primary outcome and acceptance rule

Unlike `confirmation-001`, `portfolio-18-specialists` is **not** a strict prefix of `full-menu` in the technique-census-cell sense that matters here (it omits some techniques ranked above its own tail members, e.g. ranks 12-13, 15, 18, 21-27, 29, 31-34) — but every technique it does include appears in the same relative order as in `full-menu`, so it can still only lose relative to `full-menu`, never gain (identical reasoning: nothing in `portfolio-18-specialists` is absent from `full-menu`, and gate/cap allocation only ever helps a shorter list reach a given included technique sooner or with equal budget, never later).

- **Primary outcome:** count and identity of levels `full-menu` solves that `portfolio-18-specialists` does not.
- **Accept as coverage-safe on this population** if lost levels = 0.
- **Any lost level** is itself informative here (unlike confirmation-001, a loss would mean the 7-specialist selection under-generalizes — some other technique outside both `portfolio-11` and the 7 specialists rescues a level on this fresh population that none of the 18 chosen techniques can) — cross-check any loss's `winningConfigKey` from the `full-menu` arm's own cell result before concluding whether a further specialist add-back would be warranted.
- **Secondary outcome:** aggregate work delta (`full-menu` − `portfolio-18-specialists`), expected positive but smaller in magnitude than `confirmation-001`'s 61.8% (a longer list costs more, by design, in exchange for the coverage this report is testing).

## Stop condition

One well-powered population, not an escalating series. Zero losses here would be real, non-circular confirmation that this specific 7-specialist selection generalizes beyond the population that produced it — a materially stronger and more decision-relevant result than the construction pilot's earlier degenerate/underpowered runs. A nonzero loss count closes this exact 18-technique candidate as tested on this population without ruling out a still-larger add-back; it would not, by itself, indicate the whole "add back rescuing specialists" approach is wrong, only that 7 specialists is not yet enough for full generalization at this scale.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=150 --seed=static-portfolio-confirmation-002 \
  --exclude-ids-from=<merged EW1 + confirmation-001 id list> \
  --out=data/stress/static-portfolio-confirmation-002-population.json
```

Workflow dispatch: `static-portfolio-confirmation.yml`, `cohort_id=static-portfolio-confirmation-002`, `population_file=data/stress/static-portfolio-confirmation-002-population.json`, `arms_file=data/stress/static-portfolio-confirmation-002-arms.json`, `control_arm=full-menu`, all other inputs at their defaults (already matching this protocol).

## Result

[Recorded once the run completes.]
