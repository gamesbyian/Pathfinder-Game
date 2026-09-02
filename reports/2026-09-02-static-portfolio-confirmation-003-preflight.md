# static-portfolio-confirmation-003: coverage/work Pareto frontier preflight

> **Status:** active
> **Last evidence:** 2026-09-02 — protocol fixed, population drawn, run not yet dispatched
> **Decision:** not yet made; this report fixes the candidates, population, envelope, and reporting frame before any run
> **Remaining gate:** dispatch `static-portfolio-confirmation.yml` with `cohort_id=static-portfolio-confirmation-003` and record the result below
> **Evidence role:** confirmation for each individual cardinality's coverage/work figure on a population none of them were selected from; the frontier comparison itself (which cardinality is the best trade) is a development-level synthesis of these figures, not a fresh independent claim
> **Selection:** `portfolio-11` and `portfolio-18-specialists` were both designed from earlier populations' own outcomes (see `confirmation-001`/`-002`); `top-18-prefix` and `top-26-prefix` are plain rank-order prefixes fixed entirely from the pre-existing production win-count ranking (no outcome from any prior static-portfolio confirmation run informed where to cut them — 18 was chosen to size-match `portfolio-18-specialists` for a same-cardinality curation comparison, and 26 because it is the exact rank where [`the construction pilot's`](2026-09-02-static-portfolio-construction-pilot.md) own production ranking first reaches 100.0% cumulative win coverage). This report's own population is fresh and disjoint from every population any of the five arms' composition depended on.

## Context

Per `docs/solver-scheduling-policy.md`'s own complexity-ladder guidance for gate-sequence (C) rung 2 ("Report coverage versus portfolio cardinality under the same aggregate work envelope, including which rare/exclusive solves disappear as the portfolio shrinks") and this line's own accumulated evidence:

- `static-portfolio-confirmation-001`: `portfolio-11` (11 techniques) — 63/74 (85.1%) coverage, −61.8% work, on its own population.
- `static-portfolio-confirmation-002`: `portfolio-18-specialists` (18 techniques, curated: `portfolio-11` + 7 specialists identified from `-001`'s own losses) — 65/66 (98.5%) coverage, −44.4% work, on a disjoint population.

Rather than continue the ad hoc "identify one loss, add its rescuer, retest" loop (which that report's own disposition argued converges only by asymptotically rebuilding `full-menu`), this report characterizes the coverage/work trade at several **prespecified** cardinalities on **one shared fresh population**, so every point on the curve is measured under identical conditions and none of them needed its own separate confirmation dispatch chasing an ever-receding zero-loss bar.

## Candidates (5 arms, one shared dispatch)

| arm | cardinality | composition |
|---|---:|---|
| `full-menu` | 34 | all techniques, production-rank order (control) |
| `portfolio-11` | 11 | top 11 by real production win-count (from `confirmation-001`) |
| `top-18-prefix` | 18 | **plain** top 18 by production-rank order — no curation |
| `portfolio-18-specialists` | 18 | `portfolio-11` + the 7 specific specialists that rescued `confirmation-001`'s losses (from `confirmation-002`) — same cardinality as `top-18-prefix`, different composition, isolating whether curation beats a naive prefix at equal size |
| `top-26-prefix` | 26 | plain top 26 by production-rank order — the exact rank where the production win-count ranking first reaches 100.0% cumulative coverage (`reports/stress/portfolio/ew1-static-portfolio-construction.json`'s `productionRanking.curve[25]`) |

All five are ordered sub-selections of `full-menu`'s own rank order (prefixes or, for `portfolio-18-specialists`, an order-preserving sub-selection), so by the same reasoning as `confirmation-001`/`-002`, none can ever *gain* relative to `full-menu` on this protocol — only lose or tie.

`data/stress/static-portfolio-confirmation-003-arms.json` holds the exact lists.

## Protocol

1. **Population:** a fresh 150-level uniform random sample of Corpus 2 (`data/stress/static-portfolio-confirmation-003-population.json`), seed `static-portfolio-confirmation-003`, `--exclude-ids-from` covering EW1's 60 + `confirmation-001`'s 150 + `confirmation-002`'s 150 (360 excluded ids total) — verified zero overlap with all three.
2. **Envelope:** identical to `-001`/`-002` — `work_budget=67,000,000`, `per_technique_work_cap=2,000,000` — so all three confirmation runs stay directly comparable.
3. **Execution:** `static-portfolio-confirmation.yml`, `cohort_id=static-portfolio-confirmation-003`, `control_arm=full-menu`, `shards=20` (raised from the prior runs' 15 since this dispatch has 750 cells — 5 arms × 150 levels — versus the prior 300, keeping per-shard cell count and wall time comparable), `workers=4`.

## Reporting frame (not a single pass/fail gate)

Unlike `-001`/`-002`, this report does not commit in advance to accepting or rejecting any one cardinality. The deliverable is the **coverage-vs-work curve itself**:

- For each non-control arm: solved count, lost-level identities (attributed to their `full-menu` winning technique where a fresh attribution is needed, the same local-reproduction method used in `-001`/`-002`, since the raw artifact remains blocked by this session's egress policy), and work delta versus `full-menu`.
- **Same-cardinality curation comparison:** `top-18-prefix` vs. `portfolio-18-specialists` — do the 7 hand-picked specialists actually outperform just taking the next 7 highest-ranked techniques by raw production win-count? This is the one comparison this report is specifically designed to answer that no prior report could (both `-001` and `-002` only ever compared a candidate against `full-menu`, never against another same-size candidate).
- **Frontier shape:** does coverage rise smoothly with cardinality, or is there a cardinality (e.g. `top-26-prefix`, the win-count-saturation point) beyond which additional techniques stop mattering on a general population the way they already were shown to on the aggregate production corpus?

## Stop condition

One well-powered shared population across five prespecified cardinalities, not an escalating series chasing zero losses. If a materially different candidate composition is nominated afterward, it needs its own fresh population per this line's established convention — do not reuse this one. This report's own synthesis (which cardinality/composition looks like the best trade point) is itself development evidence for any future narrower proposal, not a new independent confirmation.

## Reproduction

```
node scripts/stress/select-random-sample.mjs \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=150 --seed=static-portfolio-confirmation-003 \
  --exclude-ids-from=<merged EW1 + confirmation-001 + confirmation-002 id list, 360 total> \
  --out=data/stress/static-portfolio-confirmation-003-population.json
```

Workflow dispatch: `static-portfolio-confirmation.yml`, `cohort_id=static-portfolio-confirmation-003`, `population_file=data/stress/static-portfolio-confirmation-003-population.json`, `arms_file=data/stress/static-portfolio-confirmation-003-arms.json`, `control_arm=full-menu`, `shards=20`.

## Result

[Recorded once the run completes.]
