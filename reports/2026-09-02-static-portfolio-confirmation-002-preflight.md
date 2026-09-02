# static-portfolio-confirmation-002: specialist add-back candidate preflight

> **Status:** concluded-negative
> **Last evidence:** 2026-09-02 — run [33667663151](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33667663151) completed; see "Result" below
> **Decision:** `portfolio-18-specialists` is **not** coverage-safe by the prespecified zero-loss bar (1 loss, `R03132`), but it is a materially better trade point than `portfolio-11`: 65/66 (98.5%) of `full-menu`'s solves preserved for a 44.38% work saving, versus `portfolio-11`'s 63/74 (85.1%) for 61.8%. Per the prespecified acceptance rule this still blocks a "coverage-safe" recommendation for this exact 18-technique menu.
> **Remaining gate:** none for this exact candidate/population. The single loss's own winning technique (`dfs|score=portalCommitted|bias=none`, rank 21) is identified below; naively adding it and re-testing on a third population would very likely repeat this same pattern (a different, still-untested rank finds a different singleton) rather than converge — see "Disposition" for why the next gate should reframe the question instead of iterating once more.
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

Run [33667663151](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33667663151) completed in ~9 minutes (18:30:53–18:39:30 UTC) with all 15 shards and the combine job succeeding (`Combined 15 shard file(s), 300 cells, 2 arms.` in the combine job's own log — the generic `publish-solver-sweep-result.mjs` wrapper step's own "Shards: 0/15 INCOMPLETE" line is a stale `find`-glob check unrelated to the real combine step, which had already reported full success two steps earlier; not a real incompleteness). Recovered from the combine job's own console log, the same way `confirmation-001`'s combined result was recovered, since the raw artifact blob-storage host remains blocked by this session's egress policy:

| arm | cells | solved | work |
|---|---:|---:|---:|
| `full-menu` (34 techniques) | 150 | 66 | 5,968,029,708 |
| `portfolio-18-specialists` (18 techniques) | 150 | 65 | 3,319,289,291 |

**Gained: 0** (expected — same reasoning as `confirmation-001`, every included technique keeps its relative order).
**Lost: 1** (`R03132`, 1.5% of `full-menu`'s own 66 solves).
**Work delta: −2,648,740,417 (−44.38%)**.

**Per the prespecified acceptance rule: lost levels ≠ 0, so `portfolio-18-specialists` is rejected as strictly coverage-safe on this population.** This is nonetheless a real, decisive, non-circular result (this population was never seen while designing the candidate): **98.5% of `full-menu`'s coverage preserved for a 44.4% work saving**, a substantially better trade point than `portfolio-11`'s 85.1% coverage / 61.8% work saving on `confirmation-001`.

**Attribution of the one loss** (recovered the same way as `confirmation-001`'s own attribution — a local `full-menu` reproduction against just this one level, same commit/envelope): `R03132` (`corpus2`, `levelPos=1463`) is solved by **`dfs\|score=portalCommitted\|bias=none`** (production rank 21), which `portfolio-18-specialists` does not include. Every technique ranked above it in `full-menu`'s own attempt order (including all 18 of `portfolio-18-specialists`' own members) times out or exhausts without a solution first (`workSpent=39,511,667` total, solved only after 20 prior failed attempts).

## Disposition

Do not promote `portfolio-18-specialists` as unconditionally coverage-safe — it fails the prespecified zero-loss bar. But do not read this as symmetric with `confirmation-001`'s outcome either: this candidate recovers 11/11 of the specific losses it was designed for (development, not evidence) **and** 65/66 (98.5%) on a population that had no influence on its design (real confirmation evidence) — a materially stronger result than `portfolio-11`'s 85.1%.

**Do not simply add `dfs|score=portalCommitted|bias=none` (making `portfolio-19`) and re-test on a fourth population.** That would repeat the same move that produced this report (add the one rescuer identified after seeing a population's own loss, then hope a fresh population validates it) — and the coverage-ranking curve already characterized in [`the construction pilot`](2026-09-02-static-portfolio-construction-pilot.md) (top-11 covers 88.3%, top-26 covers 100.0% of *production* wins) says a long tail of individually-rare specialists is exactly what should be expected to keep surfacing one-at-a-time on successive fresh samples, each time costing another full confirmation-population dispatch to chase. Iterating this way converges only by asymptotically rebuilding `full-menu` itself, never demonstrating a genuinely smaller zero-loss menu — it would not be a materially different question each time, just the same move repeated until luck (or corpus exhaustion) stops producing a new singleton loss.

**If gate-sequence (C) rung 2 continues, the next gate should reframe the question** from "does some cardinality N reach exactly zero losses" (a bar the tail's own long-run structure makes unlikely for any N well below 34) to **characterizing the coverage/work Pareto frontier itself** across a small number of prespecified cardinalities (e.g. `portfolio-11`, `portfolio-18-specialists`, and one meaningfully larger curated set, or the plain top-K prefixes at K=15/20/26 from the construction pilot's own curve) on one shared fresh population big enough to compare all of them at once — reporting the coverage/work trade-off as the actual deliverable, rather than a pass/fail zero-loss gate that a strictly-smaller-than-full menu is structurally unlikely to ever clear. That is a fresh design decision, not implemented here.

Both `static-portfolio-confirmation-001` and `-002`'s populations (300 Corpus-2 levels total) are now spent for this exact line of development; any further candidate needs its own fresh, disjoint cohort per this workstream's confirmation-pool convention.
