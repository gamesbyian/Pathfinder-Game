# portfolio-18-tranche-v2 cross-generator transfer 001: preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — GHA runs [`33718270281`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33718270281) (dispatch A) and [`33718272194`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33718272194) (dispatch B), both complete.
> **Decision:** on Corpus 1, `portfolio-18-tranche-v2` **ties** `full-menu` on coverage (93/102 each) while spending 7.12% less work, and still **beats** `portfolio-18-flat-2m` on coverage (93 vs. 91) at more work than the flat cap. No regression against either baseline transfers — but the *stronger* Corpus-2 result (tranche-v2 strictly beating full-menu's own coverage, +4 and +6 on the two Corpus-2 confirmations) does not replicate here; Corpus 1 shows a tie, not a win. Report this honestly as a weaker-magnitude, same-direction result on a genuinely different generator, not a repeat of the Corpus-2 finding's full strength.
> **Remaining gate:** none for this transfer check itself. Per its own stop condition, no v3 cap map or repeat dispatch is warranted from a tie — this is not a regression to chase.
> **Evidence role:** cross-generator transfer/challenge — `docs/solver-scheduling-policy.md`'s promotion-path step 8 ("sample-independent confirmation and cross-distribution transfer/challenge evidence appropriate to the policy's selection pressure and claim scope"), not yet exercised for this candidate.

## Why this dispatch

`portfolio-18-tranche-v2` has now cleared several of `solver-scheduling-policy.md`'s promotion-path steps: two independent confirmations (both on Corpus 2, `stress-levels-random.json` — 1,700 uniform-random/solver-blind levels) found it beats both the flat cap and the uncapped 34-technique menu (62/150 and 68/150 respectively), and a production-entrypoint parity check confirmed the result would hold through the real `solveLevel()` entrypoint, not just the research harness. Every population used so far, though, has come from the same generator (Corpus 2's uniform-random construction) — per `docs/solver-evaluation-evidence.md`, confirmation on "the same random generator" is not cross-generator transfer, and a candidate this selected (a specific 18-technique menu, curated; a specific p75-derived cap map, tuned) earns proportionally more scrutiny before being treated as broadly validated.

Corpus 1 (`data/stress/stress-levels.json`, 102 hypothesis-driven/generated levels — a genuinely different construction method from Corpus 2's uniform-random generation, per `data/stress/README.md`'s own corpus map) has never been used by any dispatch in this research line, making it a clean, disjoint, differently-generated population for exactly this purpose.

## Protocol

1. **Population:** all 102 Corpus 1 levels (`data/stress/portfolio-18-tranche-v2-cross-generator-001-population.json`) — the entire corpus, not a sample (small population, maximize power; nothing in this line has touched Corpus 1 before, so no exclusion is needed).
2. **Dispatch A — flat-cap/full-menu baseline** (`data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-a.json`): arms `full-menu` (34, control) and `portfolio-18-flat-2m` (18) — identical protocol to every prior confirmation, on Corpus 1.
3. **Dispatch B — tranche cap v2** (`data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-b.json`): single arm `portfolio-18-tranche-v2`, same menu/order, same `per_technique_work_cap_map`. Separate dispatch for the same structural reason every prior tranche-cap dispatch used two: the shared plan-level cap-map application would otherwise corrupt `full-menu`/`portfolio-18-flat-2m`'s own flat caps.
4. **Envelope:** `work_budget=67000000`, `per_technique_work_cap=2000000` — unchanged from every prior confirmation in this line, so results are directly comparable in currency (not just direction) to the Corpus-2 confirmations.
5. **Execution:** both via `static-portfolio-confirmation.yml`, `shards=5` (102 cells is far smaller than the 150-cell/15-shard confirmations; scaled down proportionally), `workers=4`.

## Accept/reject framing

Report coverage and `solvedWorkStats` for all three arms. Corpus 1's small size (102 levels, roughly a third of a Corpus-2 confirmation's population) means this is inherently lower-powered than the two Corpus-2 confirmations — a good outcome here strengthens the existing conclusion across generators; a poor one is real signal the candidate doesn't transfer, not dismissible as noise, but should be read alongside its own population size rather than granted the same weight as a same-generator confirmation.

## Stop condition

One dispatch pair at this population. This is a transfer check for an already-twice-confirmed candidate, not a new tuning loop — if `portfolio-18-tranche-v2` underperforms here, report the disagreement honestly (candidate may be Corpus-2-specific) rather than iterating on a v3 cap map to chase a win on this specific small population.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels.json --corpus-label=corpus1 \
  --sample=200 --seed=portfolio-18-tranche-v2-cross-generator-001 \
  --out=data/stress/portfolio-18-tranche-v2-cross-generator-001-population.json
```
(sample size exceeds the population, so every level is included — 102/102.)

Dispatch A: `static-portfolio-confirmation.yml`, `cohort_id=portfolio-18-tranche-v2-cross-generator-001-a`, `population_file=data/stress/portfolio-18-tranche-v2-cross-generator-001-population.json`, `arms_file=data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-a.json`, `control_arm=full-menu`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `shards=5`, `workers=4`.

Dispatch B: same workflow, `cohort_id=portfolio-18-tranche-v2-cross-generator-001-b`, `arms_file=data/stress/portfolio-18-tranche-v2-cross-generator-001-arms-b.json`, `control_arm=portfolio-18-tranche-v2`, `work_budget=67000000`, `per_technique_work_cap=2000000`, `per_technique_work_cap_map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json`, `shards=5`, `workers=4`.

## Result

Both dispatches completed successfully — total wall time ~2 hours each (05:17 to ~07:20/07:38 UTC), most of it runner-queue wait behind the concurrently-running technique-census refresh's own 120 shards competing for the same account-level concurrent-job pool; actual shard/combine execution was a few minutes each, matching every prior confirmation's scale. Recovered from each combine job's own console log (raw artifact blob storage remains blocked by this environment's egress policy, same limitation as every prior confirmation in this line).

### Dispatch A (flat-cap baseline) — run [`33718270281`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33718270281)

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `full-menu` | 102 | 93 | 1,028,900,578 |
| `portfolio-18-flat-2m` | 102 | 91 | 760,747,395 |

`workSpent` among solved cells: `full-menu` min 169, median 964,560, mean 4,964,984, p75 6,375,030, p90 18,068,048, max 37,488,536; `portfolio-18-flat-2m` min 169, median 883,663, mean 4,527,077, p75 4,255,122, p90 15,820,639, max 32,678,327.

`portfolio-18-flat-2m` vs. `full-menu`: gained (0): none. Lost (2): `R00087`, `R01189`. Work delta: -268,153,183 (-26.06%) — reproduces the same flat-cap pattern (small coverage loss, large work saving) this session has now seen on Corpus 1, Corpus 2, and every population tested.

### Dispatch B (tranche cap v2) — run [`33718272194`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33718272194)

| arm | cells | solved | work (aggregate) |
|---|---:|---:|---:|
| `portfolio-18-tranche-v2` | 102 | **93** | 955,670,541 |

`workSpent` among solved cells: min 169, median 964,560, mean 4,338,973, p75 5,665,163, p90 8,821,038, max 38,700,112.

### Cross-dispatch comparison (same population, same 67,000,000 envelope, same 18-technique menu/order except `full-menu`)

| arm | solved / 102 | aggregate work |
|---|---:|---:|
| `full-menu` (34 techniques) | 93 | 1,028,900,578 |
| `portfolio-18-flat-2m` (flat 2M cap) | 91 | 760,747,395 |
| `portfolio-18-tranche-v2` (p75-scaled cap map) | 93 | 955,670,541 |

`portfolio-18-tranche-v2` **ties** `full-menu` on coverage (93 = 93, not the +4/+6 win seen on both Corpus-2 confirmations) while spending 73,230,037 less work (-7.12%). It still **beats** `portfolio-18-flat-2m` on coverage (+2) at 194,923,146 more work (+25.63%) — consistent in direction with the flat-cap-vs-tranche-cap tradeoff this whole research line has found everywhere else. Without per-level attribution (the raw combined artifact is blob-blocked in this environment, same limitation as every prior confirmation) it isn't possible to confirm whether `full-menu` and `portfolio-18-tranche-v2` solved the *identical* 93 levels or two different 93-level sets — a real gap in this specific report, not something to guess past.

### Decision

The core, weaker claim — `portfolio-18-tranche-v2` is no worse than the uncapped 34-technique menu on coverage, still beats the flat cap, and does both at real work savings relative to `full-menu` — transfers cleanly to a genuinely different generator. The *stronger* claim from the two Corpus-2 confirmations — that the tranche cap map actively **beats** `full-menu`'s own coverage, not just matches it — does not clearly replicate here: a tie on a 102-level population (roughly two-thirds of a single Corpus-2 confirmation's own 150-level population) is real but low-powered evidence, and could easily reflect a couple of individual hard levels landing either way rather than a systematic Corpus-2-specific effect. Read together with the two same-generator confirmations, `portfolio-18-tranche-v2` remains the strongest characterized `static-portfolio` treatment in this research line — its no-regression/work-saving property is now transfer-tested, not just same-generator-tested — but its magnitude of advantage over `full-menu` specifically should be treated as Corpus-2-calibrated until a larger cross-generator population says otherwise. Per this report's own stop condition, this is not grounds for a v3 cap map or a repeat dispatch: a tie is not a regression to chase.
