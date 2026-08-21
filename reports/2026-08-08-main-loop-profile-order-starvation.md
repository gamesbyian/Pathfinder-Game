# Main-loop profile-order starvation: a real but smaller instance of the admissible-order bug shape (2026-08-08)

> **2026-08-10 terminology correction:** the census's “provably recoverable” label was too strong.
> It proves that a zero-allocated attempt matches a budget-fitting *historical* witness, not that the
> current solver revision will reproduce that witness. A clean same-revision reserve pilot recovered
> only 1 of the 14 deterministic matches. See
> [`2026-08-10-main-loop-late-reserve-mechanism-pilot.md`](2026-08-10-main-loop-late-reserve-mechanism-pilot.md).

Read-only measurement, following a fresh "size the prize" pass over current hint provenance
(see the parallel investigation in this session's conversation — no separate report for that yet).
No solver code changed here; all instrumentation used to derive this was added temporarily and
reverted before writing this up.

**Headline**: of a fresh 11-level sample of currently-unsolved corpus-2 levels whose cheapest cold
`dfs`-technique hint fits comfortably under the routine 36M-node cap, **4 show a clean, decisive,
zero-node starvation signature** — the exact winning `(profile, template, gate)` combination
appears in the ladder's own attempt list, on the identical gate, and receives **exactly 0 nodes**,
because several earlier, generic profiles each cost ~5.1M nodes to fully *exhaust* (not time out —
genuinely prove no solution exists under their own ordering) before the ladder ever reaches the
one that would work. The other **7 of 11 are a different phenomenon**: the winning config *does*
run, on the correct gate, often with far more nodes than it originally needed (one case: 10.8M
nodes given against a historical requirement of 1.16M) — and still fails. That is not a budget
problem; it is the same "solver code has evolved since this hint was found" pattern already
observed and accepted for the `beam`-attributed block (see below).

---

## How this was found

`docs/solver-heuristic-capability-gap-analysis.md`-adjacent provenance mining (not itself part of
that doc): re-ran `2026-07-31-admissible-order-tier-node-starvation.md`'s "cheapest cold technique
per currently-unsolved level" methodology against the *current* baseline
(`logs/stress-corpus2-baseline.json`, 725/1700 solved, refreshed 2026-08-06) instead of the stale
one that report used (505/1700, 2026-07-31). After excluding ~1,100 clearly-stale/buggy `beam`
provenance entries from an old instrumentation era (near-zero `nodesExpanded` with short,
pre-full-hash `solver.version` strings — not real signal), the cheapest-technique split of 96
still-unforced, still-under-cap unsolved levels is:

| technique | levels | median nodes needed |
|---|---:|---:|
| admissible-order | 46 | 2.4M |
| repair | 22 | 7.1M |
| beam | 17 | 213K |
| dfs | 11 | 1.2M |

Admissible-order's 46 (down from the original report's 100) is consistent with the shipped 25%
node reserve (`reports/2026-07-30-admissible-order-node-reserve.md`) recovering roughly half of
its own population, with a documented residual (per-profile starvation inside the reserved slice
itself — the report's own R03148 example). This report is about the **dfs** block specifically.

## Method

For each of the 11 `dfs`-attributed levels, ran the real ladder at the routine budget
(`--budget-ms=86400000 --node-budget=36000000 --work-budget=48240000`, matching
`solver-stress-refresh.yml`'s 2026-08-06 routine shape) via `portfolio-solve-sweep.mjs`, with full
per-attempt logging. Cross-referenced each level's recorded cheapest cold `dfs` hint (profile,
template, gate) against the resulting `attempts` array.

For two levels (`R02296`, `R02488`), the mechanism was confirmed directly with temporary runtime
instrumentation (a few `console.error` lines added to `orchestration.ts`'s
`runGateSerialAttempts`, run once, reverted immediately after — no code changes are part of this
report) and separately with `method-probe.mjs`, which runs one config in isolation, bypassing the
ladder's budget division entirely:

```
node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
    --corpus=data/stress/stress-levels-random.json --levels=R02296 \
    --only=dfs:perimeterSweep/cornerHarvest --budget-ms=60000 --node-budget=40000000
# -> solved=1/1 (the technique is fully capable today, given a real chance)
```

## The two shapes, precisely

### Shape A: clean zero-node starvation (4/11 — `R02296`, `R02488`, `R02816`, `R02876`)

Confirmed via direct instrumentation on `R02296`: the level's first 5-8 generic profiles
(`portalFirstTransfer`, `portalCommitted`, `harvestThenFinish`, `objectiveFirst`, `knotBuilder`,
plain `perimeterSweep`, `mustCrossFirst`, ...) each individually spend **~5.1-5.6M nodes to fully
exhaust** — DFS proves no solution exists reachable under *that profile's own move ordering* and
returns having genuinely run out of tree, not having timed out. On `R02296`, seven of these
generic profiles alone sum to essentially the entire 36M node cap. Every attempt tried afterward —
including `perimeterSweep/cornerHarvest`, the config that historically solved this level in 19.8M
nodes — receives `remainingNodeBudget <= 0` by the time `runGateSerialAttempts` reaches it, and
`dfsFromGateLDS`'s own probe loop (`search.ts`) breaks on its very first iteration before calling
`dfsFromGate` even once. `runAttempt` then reports `nodesExpanded: 0, elapsedMs: 0` — a real
attempt entry, but zero actual search.

**This is not primarily the admissible-order 25% node reserve.** That reserve does shrink the main
loop's own effective ceiling (27M rather than the full 36M) and was the first hypothesis tested —
but disabling it (`--admissible-order-node-reserve-fraction=0`) only pushed the exhaustion point
from attempt 6 to attempt 8 on `R02296` (confirmed: the sum of the first 8 attempts' node counts
under `reserve=0` comes to exactly the level's total, 36,000,255). The reserve is a real
contributing factor, not the root cause: **the root cause is that this level's early generic
profiles are each expensive enough to exhaust that even the FULL 36M budget, undivided, doesn't
reach the profile that actually works.**

### Shape B: not starvation — winning config runs, with ample budget, and still fails (7/11)

`R02716` is the clearest example: the historical hint needed only 1,156,252 nodes via
`objectiveFirst` on gate `393217`. In this run, the same `(objectiveFirst, gate 393217)`
combination ran and was given **10,770,875 nodes — 9.3x more than it needed historically** — and
still did not find a solution. Gate identity was checked explicitly to rule out "different gate,
same profile label" as a confound (recorded and current gate keys match exactly wherever the
historical hint recorded one; single-gate levels are trivially consistent). This is the same shape
already found and accepted for the `beam`-attributed block in the parallel investigation: the
specific greedy path a technique walked has drifted since the hint was recorded, most plausibly
from ordinary, already-validated solver evolution (the diff between one tested beam-block commit
and current HEAD across `scoring.ts`/`search.ts`/`attempts.ts`/`policy.ts`/`prune-gauntlet.ts`/
`lower-bounds.ts`/`topology.ts` is 1,580 lines) — not a bug to chase, and specifically **not**
fixable by any budget-allocation change, since the config already had more than enough budget.

## Corpus-wide census (added same day, closes the "not yet measured at scale" gap below)

`scripts/stress/main-loop-starvation-census.mjs` — pure read-only cross-reference between the
already-committed `logs/stress-corpus{1,2}-baseline.json` attempt logs and the stored hint
corpus's provenance, no new solving, no solver code imported. Defines an attempt as **starved**
when `nodesExpanded === 0 && elapsedMs === 0` (the exact signature hand-validated above) and a
level as **provably recoverable** only when it *also* carries a cold, trustworthy hint whose
`(technique family, profile, template, beamWidth)` signature matches a starved attempt's config
and whose own recorded `nodesExpanded` fits under the run's node budget.

```
=== corpus-2 (node budget 36,000,000) ===
  unsolved: 975 levels, 11572 attempts, 3041 starved (26.3%)
  unsolved: 849 levels (87.1%) have >=1 starved attempt
  unsolved: starved attempts by family: {"dfs":2015,"beam":294,"repair":732}
  unsolved: PROVABLY RECOVERABLE levels: 34 (by family: {"dfs":10,"repair":20,"beam":4})
  unsolved: of those, dfs/beam (hard, deterministic match): 14; repair-only (soft, seed-dependent match): 20
  solved (control): 725 levels, 6 (0.8%) have >=1 starved attempt, 0 recoverable

=== corpus-1 (node budget 50,000,000) ===
  unsolved: 6 levels, 53 attempts, 4 starved (7.5%)
  unsolved: 3 levels (50.0%) have >=1 starved attempt
  unsolved: PROVABLY RECOVERABLE levels: 0
  solved (control): 96 levels, 0 (0.0%) have >=1 starved attempt, 0 recoverable
```

**Reading this honestly, in both directions.** The raw prevalence (87.1% of unsolved corpus-2
levels have *some* zero-node attempt) is not itself evidence of a bug — it is what a fully
budget-exhausted ladder looks like at its tail *by construction*: once the cumulative ceiling is
gone, every attempt tried afterward is starved, whether or not it would ever have solved the
level. The solved-population control confirms this framing rather than undermining it: only 0.8%
of solved levels show any starved attempt at all, and **zero** show a recoverable one — exactly
what you'd expect if starvation mostly means "genuinely out of budget," with the interesting
exception being levels where the *specific* config that was starved is independently *known*, via
its own stored provenance, to be capable.

That narrower, decisive number is **34 of 975 unsolved corpus-2 levels (3.5%)** — real, validated,
currently zero-allocated in the committed baseline. Split by match confidence: **14 have a
dfs-or-beam match** (deterministic search, no randomness — an exact `(profile, template,
beamWidth, gate)` match is as close to proof as this method gets) and **20 are repair-only**
(structurally softer: repair uses a per-attempt randomized seed, so matching the *technique*
doesn't guarantee the *same seed* would reproduce the *same* solution — see the script's own doc
comment). Corpus-1 shows the same shape at its own much smaller scale (3 of 6 unsolved levels have
a starved attempt) with 0 provably recoverable, consistent with corpus-1's near-saturated 96/102
solved rate leaving little room for this pattern to matter there.

**34 is a lower bound, not an upper bound**, for two structural reasons: (1) it only counts levels
that happen to carry a *stored hint* recording the exact starved config — a level could show the
identical starvation pattern and simply never have been solved by any other means, which this
method cannot see; (2) the repair-family match is deliberately conservative (any repair vs. any
repair), so tightening it to also match `seedSalt`/`randomSeed` would likely *increase*, not
decrease, confidence in a subset of the 20.

## What this does and does not claim

- **Corpus-wide prevalence is now measured** (see above) — 34/975 (3.5%) of unsolved corpus-2
  levels provably recoverable, split 14 hard (dfs/beam) + 20 soft (repair). The original 11-level
  `dfs`-only sample's ~36% Shape-A rate does not directly generalize to "36% of all starvation is
  recoverable" — the corpus-wide denominator (975 unsolved levels, not just the 11 carrying a
  cheap `dfs` hint) puts the real, provable fraction much lower, which is the more honest number
  to act on.
- **Not** a claim that fixing the starved cases would recover all 34 of those solves. Reallocation is
  zero-sum against a fixed cap, and this codebase has measured reordering a budget-limited search
  to be a coin flip three times already (MST tightening −12, archetype routing −4/−8, dead-flipper
  move-gen exclusion −1) — the same caution `2026-07-31-admissible-order-tier-node-starvation.md`
  itself applied to its own, larger finding.
- **Not** a fix, and not a recommendation to build one yet. Per this codebase's own standing
  discipline ("reproduce the ceiling before changing any scheduling," the admissible-order fix's
  own first step), 4 levels is a demonstration that the mechanism is real, not a validated sample
  to design a fix against.
- **Is** a genuinely distinct instance of the "earlier tiers eat the whole ceiling" bug family
  (`2026-07-17-repair-probe-node-budget-starvation.md`, `2026-07-31-admissible-order-tier-node-
  starvation.md`) — this time inside the *ordinary main loop's own profile ordering*, not a
  separate last-resort tier, which is a larger blast radius if a fix is ever pursued.

## Recommended next steps, if pursued

1. ~~Reproduce at scale first~~ **Done** (see the census above): 34/975 unsolved corpus-2 levels
   provably recoverable, 14 of them by the hard dfs/beam signal.
2. **Do not conflate the dfs/beam (hard) and repair (soft) matches**, and do not conflate either
   with "any level with a starved attempt" (849 levels — mostly just genuinely exhausted, not a
   bug). Any future fix attempt or A/B must be scoped to the 14-level hard-match population first;
   the 20 repair-only levels need the seed-matching refinement noted above before they're trusted
   at the same confidence.
3. **If a fix is pursued**, the admissible-order fix's own template applies directly: a small
   *reserve*, not a *reorder* — e.g., guaranteeing the main loop's late configs (or specifically
   the level's feature-appropriate profile/template, if that can be identified before the fact)
   some non-zero floor of the node budget, the same shape as
   `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`. A full reorder (trying feature-matched profiles
   first) is the higher-risk alternative this codebase has already measured to be unreliable.
4. **14 (or even 34) is a small population to A/B on its own** — smaller than the admissible-order
   fix's own 141-level target, which still needed the full population (not a 24-level sample) to
   get a trustworthy number, and whose own 24-level pilot pointed the wrong way twice. Any fix
   attempt here should expect the same and budget for a full-population A/B, not a spot check,
   before drawing a conclusion.

## Reproducing

```bash
# corpus-wide census (fast -- pure read-only JSON cross-reference, no solving)
node scripts/stress/main-loop-starvation-census.mjs --out=reports/stress/main-loop-starvation-census.json

# per-level starvation check (Shape A vs B classification)
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
    --corpus=data/stress/stress-levels-random.json \
    --levels=pos:306,pos:627,pos:635,pos:795,pos:819,pos:838,pos:968,pos:1047,pos:1066,pos:1147,pos:1207 \
    --scheduler-mode=legacy --budget-ms=86400000 --node-budget=36000000 --work-budget=48240000 \
    --workers=4 --out=<file>
# then cross-reference each level's attempts[] against its cheapest cold dfs hint's (profile, template, gateKey)

# isolation test (rules out simple technique-capability loss)
node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
    --corpus=data/stress/stress-levels-random.json --levels=<id> \
    --only=dfs:<profile>[/<template>] --budget-ms=60000 --node-budget=40000000
```
