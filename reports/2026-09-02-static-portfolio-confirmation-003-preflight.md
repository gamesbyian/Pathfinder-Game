# static-portfolio-confirmation-003: coverage/work Pareto frontier preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — run [33669749365](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33669749365) completed; see "Result" below
> **Decision:** at equal cardinality (18), the curated `portfolio-18-specialists` Pareto-dominates the plain `top-18-prefix` — fewer losses (1 vs. 3) **and** less work (3,176,947,976 vs. 3,334,348,752). It also Pareto-dominates the much larger `top-26-prefix` — identical coverage (1 loss each) for 49% less work. Across two independent fresh confirmation populations (`-002` and this one), `portfolio-18-specialists` lands at ~98% coverage / ~45-48% work-saving both times, each time missing exactly one level to a *different* single technique outside its curated 18 — direct empirical confirmation of `-002`'s own prediction that a long tail of individually-rare singletons, not a fixable design flaw, is what stands between any sub-34 menu and zero losses.
> **Remaining gate:** none for this exact five-candidate design. If gate-sequence (C) rung 2 continues at all, the open question is no longer "which cardinality/composition" (this report answers that: curated ~18 is the practical frontier) but whether translating a research-vehicle menu like this into real production scheduling policy is itself worth pursuing — a separate, larger decision this offline `technique-census-cell.mjs` harness cannot answer and does not attempt to here.
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

Run [33669749365](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33669749365) completed in ~12 minutes (18:51:06–19:03:21 UTC) with all 20 shards and the combine job succeeding (`Combined 20 shard file(s), 750 cells, 5 arms.`). Recovered from the combine job's own console log, same method as `-001`/`-002` (raw artifact blob-storage host still blocked by this session's egress policy):

| arm | cardinality | cells | solved | work |
|---|---:|---:|---:|---:|
| `full-menu` | 34 | 150 | 59 | 6,054,243,441 |
| `portfolio-11` | 11 | 150 | 56 | 2,091,688,630 |
| `top-18-prefix` | 18 | 150 | 56 | 3,334,348,752 |
| `portfolio-18-specialists` | 18 | 150 | 58 | 3,176,947,976 |
| `top-26-prefix` | 26 | 150 | 58 | 4,736,715,110 |

Pairwise comparisons vs. `full-menu` (all four are gained: 0, as expected for ordered sub-selections):

| arm | lost | lost levels | work delta |
|---|---:|---|---:|
| `portfolio-11` | 3 | `R02971`, `R03261`, `R03338` | −65.45% |
| `top-18-prefix` | 3 | `R02971`, `R03261`, `R03338` | −44.93% |
| `portfolio-18-specialists` | 1 | `R03261` | −47.53% |
| `top-26-prefix` | 1 | `R03261` | −21.76% |

**Attribution of every distinct lost level** (recovered the same way as prior reports — a local `full-menu` reproduction against just these 3 levels, same commit `bf8211db`/envelope):

| level | winning technique | production rank | in `top-18-prefix`? | in `portfolio-18-specialists`? | in `top-26-prefix`? |
|---|---|---:|---|---|---|
| `R02971` | `beam\|score=mustCrossFirst\|bias=none\|width=2000\|retention=plain` | 19 | no | **yes** | yes |
| `R03338` | `beam\|score=mustCrossFirst\|bias=none\|width=2000\|retention=plain` | 19 | no | **yes** | yes |
| `R03261` | `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` | 31 | no | no | no |

`R02971`/`R03338` are both rescued by the same rank-19 technique — present in `portfolio-18-specialists` (one of its 7 curated specialists) and in `top-26-prefix` (a plain prefix reaching rank 26), but absent from `top-18-prefix` (ranks 1-18 only), exactly explaining the observed pattern with no ambiguity. `R03261` is rescued only by a rank-31 technique — a member of the **zero-aggregate-production-win tail** (ranks 27-34, [`the construction pilot's`](2026-09-02-static-portfolio-construction-pilot.md) own closed rung-1 candidate class) — present in none of the four candidate arms, which is exactly why all four lose it despite three of them otherwise reaching much higher coverage. This is a concrete, out-of-sample instance of the scheduling-policy guardrail ("report ... which rare/exclusive solves disappear as the portfolio shrinks"): a technique with **zero wins across the entire 1,802-row aggregate production corpus** is nonetheless the sole rescuer for one specific level in a fresh sample neither the aggregate corpus nor this candidate's own design ever saw.

### Same-cardinality curation comparison: `top-18-prefix` vs. `portfolio-18-specialists`

At equal cardinality (18 techniques each), curation wins decisively and on both axes: `portfolio-18-specialists` loses 1 level where `top-18-prefix` loses 3, **and** costs less work (3,176,947,976 vs. 3,334,348,752 — `top-18-prefix` is not even cheaper). `portfolio-18-specialists` Pareto-dominates `top-18-prefix` outright on this population. The value of choosing techniques by demonstrated rescue capability (from `-001`'s own losses) rather than raw rank order is now directly demonstrated, not merely argued.

### Frontier shape: does the curve keep improving past 18?

`top-26-prefix` (26 techniques, adding 8 more ranks over `top-18-prefix`) matches `portfolio-18-specialists`'s exact coverage (1 loss, same level) but at 49% more work (4,736,715,110 vs. 3,176,947,976). `portfolio-18-specialists` Pareto-dominates `top-26-prefix` too. The 8 additional plain-prefix techniques (ranks 19-26) buy nothing over the curated 18 on this population — consistent with the construction pilot's own finding that raw production rank order and real held-out-population value diverge once curation is available.

### Cross-population consistency for `portfolio-18-specialists`

| population | solved (of control) | lost level | rescuing technique (not in the 18) | coverage | work saving |
|---|---:|---|---|---:|---:|
| `confirmation-002` | 65/66 | `R03132` | rank 21, `dfs\|score=portalCommitted\|bias=none` | 98.5% | −44.4% |
| `confirmation-003` | 58/59 | `R03261` | rank 31, `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` | 98.3% | −47.5% |

Two independent fresh populations, two different single rescuing techniques (rank 21 and rank 31 respectively, both outside the curated 18), both landing at ~98% coverage for roughly half the work. This is exactly the pattern `-002`'s own disposition predicted before this run existed ("a long tail of individually-rare specialists will keep surfacing one at a time on successive fresh samples") — not a coincidence, and not a fixable gap in this specific candidate's curation, but a structural property of any menu smaller than the full 34.

## Disposition

This report answers both questions it was designed to answer: **(1) curation beats a naive same-size prefix** (`portfolio-18-specialists` Pareto-dominates `top-18-prefix`: fewer losses and less work at equal cardinality), and **(2) the coverage/work curve bends around cardinality ~18** (`top-26-prefix`'s extra 8 techniques buy zero additional coverage over `portfolio-18-specialists` for 49% more work). Combined with `confirmation-002`, `portfolio-18-specialists` now has **two independent fresh-population confirmations**, both landing at ~98% coverage for ~45-48% less work than `full-menu`, each time losing exactly one level to a different single rare-tail technique.

**Close gate-sequence (C) rung 2's "which cardinality/composition" question as sufficiently characterized.** A curated ~18-technique menu is the practical frontier point this line of evidence supports; chasing the remaining ~2% coverage gap by adding yet another one-off rescuer is not recommended (per `-002`'s own reasoning, reconfirmed here with a second, different singleton) — it would not converge to zero without approaching `full-menu` itself, since each fresh population surfaces its own distinct rare-tail rescuer.

**What this report does not answer, and is not attempting to:** whether a menu like `portfolio-18-specialists`, evaluated here entirely through `technique-census-cell.mjs`'s bounded-per-technique-share research harness, should ever become real production scheduling policy. That would require: (a) resolving the admissible-order-reserve caveat already flagged in `-001`'s addendum for any candidate using tie-break profiles (not applicable to `portfolio-18-specialists` itself, which contains none), (b) a production-envelope confirmation at real interactive budgets rather than this program's `work_budget=67,000,000`/`per_technique_work_cap=2,000,000` research envelope, (c) explicit rare-capability retention auditing at the scale the scheduling-policy guardrail requires, and (d) a real implementation design for how a fixed ordered-menu-with-per-technique-caps policy would replace or coexist with the current stage/reserve-based scheduler this same workstream's budget-model program (steps 1-5) spent significant effort building. That is a materially larger, separate decision for whoever picks up this workstream next — this report hands them a validated candidate and a clear characterization, not an implementation.
