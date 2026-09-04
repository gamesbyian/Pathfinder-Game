# static-portfolio vs production ladder: a real matched-work A/B through the production entrypoint

> **Status:** concluded-negative
> **Last evidence:** 2026-09-04 — both arms complete, 40/40 levels each
> **Decision:** `portfolio-18-tranche-v2` (`static-portfolio` scheduler mode) does **not** beat the real production ladder at equal work on this population — 4 fewer levels solved (14/40 vs. 18/40), **zero exclusive wins**, a strict coverage loss — despite 86% less aggregate `workSpent` when run alone; composing it as a cheap first pass before a `production` fallback does not recover that saving here (0 exclusive wins means the fallback still runs `production` on every miss, so combined cost is 9.82% *more* than `production` alone, with no resumable-search primitive to reuse work across the two passes). This closes the "flip a production caller onto `static-portfolio` mode with this cap map" question as tested: not for coverage, and the naive fallback composition is not a work win either — see Interpretation for what the 86% figure remains useful for.
> **Remaining gate:** none queued by this report — if this result is worth pursuing further, the next step is a GHA-scale replication (150 levels, matching this line's own confirmation size) before treating the 4-loss/0-gain pattern as more than a single-population signal; see Stop condition below for why this report does not escalate on its own.
> **Evidence role:** confirmation
> **Selection:** prespecified — treatment, control, population-draw rule, and accept/reject framing were all fixed before either arm was dispatched or inspected

## Question

`docs/solver-optimization-workstreams.md`'s Immediate execution priority states, as of 2026-09-03: "The next real gate is a production-wiring decision (whether to flip a production caller onto
`static-portfolio` mode with this cap map), not another cap-sizing, entrypoint-verification, or transfer-check iteration." Every prior `static-portfolio-confirmation-00N`/`portfolio-18-*`
result compared `static-portfolio` treatments only against each other or against a flat sequential `full-menu` arm, both measured through `technique-census-cell.mjs`'s research harness — never
against the real default production scheduler (`solveLevel()`'s ordinary stage/reserve-based ladder, `schedulerMode: 'production'`) through the real entrypoint. `2026-09-03-static-portfolio-
entrypoint-parity-check.md` proved the entrypoint reproduces the harness exactly (15/15), and this session wired `schedulerMode: 'static-portfolio'` into `scripts/portfolio-solve-sweep.mjs` (a
real batch-solving tool, not a one-off script) so this comparison is finally possible directly. This is the smallest value-of-information pilot for that missing question: at equal work, through
the same tool and the same entrypoint, does `portfolio-18-tranche-v2` (the strongest characterized `static-portfolio` treatment, two independent confirmations) beat, match, or lose to today's
real production ladder?

## Protocol (fixed before dispatch)

1. **Treatment:** `schedulerMode: 'static-portfolio'`, arm `portfolio-18-specialists` from `data/stress/static-portfolio-confirmation-003-arms.json` (18 ordered technique keys), `workBudget:
   67,000,000`, `perTechniqueWorkCap: 2,000,000` flat fallback, `perTechniqueWorkCapByKey` = `data/stress/portfolio-18-specialists-tranche-cap-map-v2.json` (the confirmed `portfolio-18-tranche-
   v2` cap map).
2. **Control:** `schedulerMode: 'production'` (today's real default ladder — every additive tier, reserves, admissible-order-fallback, repair-fallback, etc.), `workBudget: 67,000,000` (same
   envelope as the treatment; `disableExtraBudgetPasses` NOT set, matching this whole research line's own "offline/batch" scoping — see `2026-09-03-fixed-cap-portfolio-scheduler-implementation-
   design.md`'s "Scoping" section — not the interactive-UI configuration).
3. **Code/ref identity:** current HEAD at dispatch time, commit `1b7353955cf67df93cd35a8083546adfc670ad94` plus this session's uncommitted-then-committed `portfolio-solve-sweep.mjs` static-
   portfolio CLI wiring (`eddbde1c`) — the wiring is additive/zero-effect-on-default per its own commit message and is independently unit/node-tested; it does not touch `orchestration.ts`'s
   production ladder at all.
4. **Population:** a fresh 40-level uniform random sample of Corpus 2 (`data/stress/static-portfolio-entrypoint-production-ab-001-population.json`), seed
   `static-portfolio-entrypoint-production-ab-001`, `--exclude-ids-from` the union of every corpus-2 population this research line has drawn on so far (EW1's 60-level pricing snapshot,
   `static-portfolio-confirmation-001/002/003`'s three 150-level populations, `admissible-order-profile-cost-probe-001`'s 80, `portfolio-18-specialists-production-envelope-confirmation-001`'s
   150, `portfolio-18-specialists-production-envelope-confirmation-003`'s 150, `portfolio-18-tail-percentile-cost-probe-001`'s 120 — 1,010 unique ids total), verified disjoint (0 overlap).
   Sized smaller than the standard 150-level confirmation scale because this run is local (4 cores, not GHA's ~60-way shard parallelism); see "Stop condition" below for what would justify a
   larger follow-up.
5. **Dispatch:** two independent `portfolio-solve-sweep.mjs` runs against the same 40-level id list, `--workers=4` each, both artifact-only (no `--save-hints`, no commit to baselines/heatmaps).
6. **Primary outcome:** solved count (of 40) per arm, gained/lost ids (production solves but static-portfolio doesn't, and vice versa), aggregate `workSpent`, per-arm winning-technique
   distribution for static-portfolio's solves.
7. **Accept/reject framing:** this is real-data evidence for the production-wiring decision, not the decision itself — even a clean win only nominates `static-portfolio` as viable for a specific
   offline/batch caller; actually flipping a caller's default is a separate, later decision per `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md`. Report both directions
   honestly: a static-portfolio loss on this population is real (if small-sample) evidence that the flat-menu policy does not simply dominate the ladder's own adaptive/reserve machinery, not a
   reason to retune the cap map from this one population's outcome.
8. **Stop condition:** one 40-level local pilot settles whether there is a large, obvious effect in either direction. Do not chase population size locally; if the result is close, directionally
   interesting, or motivates an actual caller flip, the next step is a GHA-scale confirmation (150 levels, matching this line's own established confirmation size) — a separate, explicitly gated
   follow-up, not an automatic escalation from this report.

## Reproduction

```
node scripts/run-bundled.mjs scripts/stress/select-random-sample.mjs -- \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=40 --seed=static-portfolio-entrypoint-production-ab-001 \
  --exclude-ids-from=<union of EW1 + confirmation-001/002/003 + admissible-order-profile-cost-probe-001 +
    portfolio-18-specialists-production-envelope-confirmation-001/003 + portfolio-18-tail-percentile-cost-probe-001 populations, 1,010 ids> \
  --out=data/stress/static-portfolio-entrypoint-production-ab-001-population.json

node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=<the 40 positions above> \
  --scheduler-mode=production --work-budget=67000000 --workers=4 \
  --out=reports/portfolio/static-portfolio-entrypoint-production-ab-001/production-arm.json

node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=<the 40 positions above> \
  --scheduler-mode=static-portfolio \
  --static-portfolio-arms=data/stress/static-portfolio-confirmation-003-arms.json \
  --static-portfolio-arm=portfolio-18-specialists --work-budget=67000000 \
  --per-technique-work-cap=2000000 \
  --per-technique-work-cap-map=data/stress/portfolio-18-specialists-tranche-cap-map-v2.json \
  --workers=4 \
  --out=reports/portfolio/static-portfolio-entrypoint-production-ab-001/static-portfolio-arm.json
```

## Result

Both arms ran the identical 40-level population to completion (`reports/portfolio/static-portfolio-entrypoint-production-ab-001/{production,static-portfolio}-arm.json`).

| Arm | Solved | workSpent (aggregate) |
|---|---:|---:|
| `production` (control) | 18/40 | 12,395,204,792 |
| `static-portfolio` (`portfolio-18-tranche-v2`) | 14/40 | 1,691,709,873 (−86.35%) |

- **Gained (static-portfolio solves, production doesn't): 0.**
- **Lost (production solves, static-portfolio doesn't): 4** — `R00153`, `R02126`, `R02675`, `R02873`.
- **Both solved: 14.** **Neither solved: 22.**

Every one of the 4 losses is a real, non-marginal miss, not a near-tie:

| id | production winner | production workSpent | static-portfolio workSpent (unsolved, work-budget-reached) |
|---|---|---:|---:|
| `R00153` | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain` | 50,423,804 | 62,543,043 |
| `R02126` | `beam\|score=intersectionHarvest\|bias=none\|width=2000\|retention=plain` | 17,969,448 | 58,577,329 |
| `R02675` | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain` | 31,154,242 | 66,762,967 |
| `R02873` | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` | 35,497,957 | 66,936,867 |

Notably, the exact winning technique in 3/4 losses (`intersectionHarvest`, width 5000/2000, `retention=plain`) **is itself in the `portfolio-18-specialists` menu** — `static-portfolio` didn't
lack the capability, it ran out of that technique's own protected share (`perTechniqueWorkCapByKey`'s 2,000,000–4,424,574-ish caps, sized from isolated cost-probe p75s) before finding what
`production`'s own reserve/ordering machinery (a materially different scheduling shape — per-gate reserves, additive fallback tiers, and a different technique roster/order entirely) affords the
same technique. This is a real-data instance of exactly the starvation mechanism this research line already characterized in the abstract (see `2026-09-03-admissible-order-reserve-caveat-
resolved-by-construction.md`), now observed against the real ladder rather than only within the static-portfolio harness itself.

Of the 14 `static-portfolio` solves, winning techniques: 5 `repair|score=repair|guidance=standard`, 2 `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain`, 2
`beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets`, 1 each of `admissible-order|tieBreak=none|lds=off`, `admissible-order|tieBreak=default|lds=off`,
`beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets`, `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain`,
`beam|score=intersectionHarvest|bias=none|width=5000|retention=plain`.

**Naive fallback composition check** (static-portfolio first, production only on what it misses): since static-portfolio has 0 exclusive wins on this population, this composition would solve the
same 18/40 as production alone — but at `1,691,709,873 + 11,920,460,276` (production's own workSpent restricted to the 26 ids static-portfolio didn't solve) `= 13,612,170,149`, **9.82% more work
than running production alone**, because the two passes don't share any search state (this codebase has no resumable-search primitive — see the Interpretation section of
`2026-09-03-dynamic-tranche-value-pilot-001.md` for the same "unused work funds zero restarts" finding in a different context). A cheap-first-pass composition is not a coverage or work win here.

## Interpretation

Every prior `static-portfolio` result in this research line beat something — `full-menu` (the same 18-or-34 techniques run flat, sequentially, through the research harness), `portfolio-18-flat-2m`,
or an earlier tranche map. None of those baselines is what a real production caller would actually run instead. This report is the first to compare against that real alternative, and the verdict
flips: `production`'s much richer machinery (every additive/fallback tier, per-gate reserves, and — concretely observed above — more generous effective allocation for the same winning technique in
3/4 loss cases) is not dominated by an 18-technique flat menu with fixed per-technique caps, even a twice-confirmed one. The 86% work reduction is real and not nothing — it just isn't, by itself,
evidence for replacing or gating a production caller with this treatment, because the coverage it gives up isn't recoverable for free by falling back to `production` afterward.

The most promising forward-looking reading is **not** "retune the cap map" (this program's own rule against indefinitely rescuing a null result with nearby thresholds/budgets/seeds — see
`docs/solver-optimization-workstreams.md`'s workstream-wide rules) but the same one the beam-resumability/dynamic-tranche threads already reached from a different angle: without a way to
**resume** a censored `static-portfolio` search into `production`'s own continuation (or vice versa) rather than restarting cold, a cheap-first-pass composition cannot be a free win — it can only
trade wall-clock-shaped convenience for strictly more total work, at a real coverage cost if used alone. `2026-09-03-beam-to-dfs-handoff-pilot-001.md` already found single-state cross-method
handoff closed negative for a different pairing (beam→DFS); this result is a second, independent data point for the same underlying limitation (state handoff across differently-shaped searches is
hard), not a new mechanism to chase on its own.

## Decision

**Do not flip any offline/batch production caller onto `schedulerMode: 'static-portfolio'` with `portfolio-18-tranche-v2`** — neither as an outright replacement (real coverage loss, 4/40, 0
compensating gains) nor as a cheap-first-pass-with-fallback (no work saving once the fallback's cost is counted, on this population). This closes docs/solver-optimization-workstreams.md's
"production-wiring decision" gate as tested: negative for this exact treatment and composition. The `static-portfolio` scheduler mode itself, the CLI wiring landed this session, and the
`portfolio-18-tranche-v2` cap map all remain valid, tested, reusable infrastructure — this result is about the specific "wire it into a real caller" decision, not a defect in any of them. See
`docs/solver-optimization-workstreams.md` for the corresponding workstream-doc update recording this outcome and its precise scope (one 40-level population; not yet GHA-scale replicated).
