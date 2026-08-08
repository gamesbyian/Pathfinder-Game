# Main-loop profile-order starvation: a real but smaller instance of the admissible-order bug shape (2026-08-08)

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

## What this does and does not claim

- **Not** a corpus-wide prevalence claim. 11 levels is the full `dfs`-attributed "under cap,
  unforced" bucket as of this baseline — real, but small; whether the same ~36%-starved /
  ~64%-drifted split holds at scale (e.g., across the wider corpus-2 population that doesn't
  happen to carry a stored cheap `dfs` hint) is not measured here.
- **Not** a claim that fixing Shape A would recover all 4 of those solves. Reallocation is
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

1. **Reproduce at scale first**, exactly as the admissible-order playbook did: measure how many
   corpus-2 levels show Shape A specifically (winning `dfs` config present in the attempt list,
   correct gate, exactly 0 nodes) — not gated on carrying a stored hint at all, since the
   mechanism doesn't require one; a level could show this pattern and simply never have been found
   any other way.
2. **Do not conflate Shape A and Shape B.** Any future fix attempt or A/B must isolate Shape A's
   population specifically (Shape B levels would be pure noise in that measurement — they were
   never starved, so a starvation fix can't help them).
3. **If Shape A reproduces at meaningful scale**, the admissible-order fix's own template applies
   directly: a small *reserve*, not a *reorder* — e.g., guaranteeing the main loop's late
   configs (or specifically the level's feature-appropriate profile/template, if that can be
   identified before the fact) some non-zero floor of the node budget, the same shape as
   `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`. A full reorder (trying feature-matched profiles
   first) is the higher-risk alternative this codebase has already measured to be unreliable.

## Reproducing

```bash
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
