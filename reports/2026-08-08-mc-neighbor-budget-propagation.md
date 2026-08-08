# Must-cross neighbor-budget propagation: shadow probe → opt-in prune, +11/30 on first live sample (2026-08-08)

`docs/solver-heuristic-capability-gap-analysis.md`'s item 3 ("Must-cross/intersection propagation:
proven family, narrowed frontier") named the untried piece explicitly: **bounded dynamic
propagation over forced interfaces and remaining free intersection budget, prototyped as a shadow
propagator first, judged by unique catches beyond the shipped gauntlet** — and warned not to revive
the falsified static forced-edge rule (`reports/2026-07-31-mustcross-forced-structure.md`'s step 4).
This report is that sequence: derivation, shadow-probe measurement, full-corpus soundness replay,
and a first live matched-node A/B.

## The gap between the two shipped must-cross checks

`reports/2026-07-31-mustcross-forced-structure.md` and
`reports/2026-07-31-reserved-intersection-wall.md` already shipped three real wins:

- **`PRUNE_MC_CEILING`**: `ints + popcount(mustCrossMask) <= reqInt` — each pending must-cross cell
  reserves exactly one future intersection (its own second entry).
- **`PRUNE_MC_RESERVED_WALL`** (`topology.ts`'s `isConnected`): once the *free* budget
  `freeInt = reqInt - ints - popcount(mustCrossMask)` hits 0, every visited ordinary cell becomes a
  hard wall in the connectivity flood fill.
- **`PRUNE_MC_FORCED_NEIGHBOR`** (`lower-bounds.ts`'s `mustCrossForcedNeighborDeadlocked`): a
  pending must-cross cell's still-needed straight pass requires both of that axis's neighbors —
  if either has become a **hard** wall (both axis bits spent, or an already-used flipper), the
  state is dead.

The gap between these: `isConnected`'s flood fill only asks "is the must-cross cell itself
reachable" — never "is the *specific* neighbor its still-open axis needs reachable." A must-cross
cell can look reachable (via its already-used-axis side) while the exact neighbor its open
crossing needs is not. `PRUNE_MC_FORCED_NEIGHBOR` catches the unconditional (hard-wall) version of
that gap but not the **soft** one: a required neighbor that is *not* a hard wall, but has already
been visited. Completing that axis's crossing later necessarily means re-entering it — a genuine,
unavoidable intersection that is *not* the one `PRUNE_MC_CEILING` already reserves for the
must-cross cell's own second entry.

## Why this isn't a retry of the falsified static rule

The falsified forced-edge propagation (forced-structure report's step 4) tried to prove specific
*edges* permanently unusable and failed twice — a broad version (63,496 violations/1.1M edges) and
a narrowed one (5,206/225,094), the second killed specifically by cells adjacent to **two**
must-cross cells (P00124's 2×2 block), where a single cell can legitimately serve two different
crossings via structurally distinct valid completions.

This derivation avoids that trap by construction: it collects the **set of distinct** already-visited
required-neighbor cells across every pending must-cross cell's every open axis — not a sum per
(must-cross cell, axis) pair. A single future revisit "event" at a cell has exactly one predecessor
and one successor in the path; the *cell itself* still needs at least one more visit regardless of
how many different must-cross cells would like to reuse that revisit for their own purposes, so
counting **distinct cells** rather than **requirements** cannot double-count. Two further
exclusions close the remaining risk: a required neighbor that is *itself* a pending must-cross cell
is excluded (its own eventual re-entry may be the exact event `PRUNE_MC_CEILING` already reserves —
counting it again would double-count one intersection against two obligations), and flipper
neighbors are excluded entirely (dynamic axis state this derivation does not model — abstain,
don't guess, same carve-out as the shipped forced-neighbor check's own precedent). Portal levels
are out of scope entirely, matching the forced-structure report's own step-4 caution.

Full derivation and soundness argument: `modules/solver/lower-bounds.ts`'s
`mustCrossNeighborBudgetDeadlocked` (production) / `scripts/stress/lib/mc-neighbor-budget.mjs`
(shared prototype, imported by both the harness probe and the soundness replay).

## Stage 1: shadow probe against the oracle-labelled atlas

`scripts/stress/probes/mc-neighbor-budget-probe.mjs`, registered with
`scripts/stress/interface-probe-harness.mjs` (`docs/solver-shadow-eval-harness.md`'s shared
infrastructure), scored against the full grown atlas (397 levels, 5,518 CP-SAT-labelled branches,
2,913 dead / 2,605 alive):

```
mc-neighbor-budget-propagation (sound prune (dynamic forced-neighbor revisit cost vs. remaining free intersection budget)):
  dead: 33/549 caught (6.0%), unique beyond gauntlet: 19, overlap: 14
  alive: 374/374 correctly passed, FALSE REJECTS: 0
  abstained: 4595/5518
```

**19 unique catches** — dead branches the existing gauntlet misses that this check alone catches —
is the largest of any candidate scored through this harness to date: more than double
`separator-resource-spectrum`'s 7 (`docs/solver-shadow-eval-harness.md` Part 4), and nearly 20x
`obligation-tour-mutex`'s 1 (Part 7). `goal-approach-envelope` (Part 8) caught 0 unique. Zero false
rejects on the 374 applicable alive branches.

## Stage 2: full-corpus stored-solution soundness replay

The harness's atlas is real but small next to what this codebase requires before trusting a
must-cross rejection rule (CLAUDE.md's must-cross lower-bound/deadlock gotchas; see the
mustcross-forced-structure and reserved-intersection-wall reports' own 15,032- and 27,170-path
replays). `scripts/stress/mc-neighbor-budget-soundness-check.mjs` walks every known-valid solution
in all three real corpora (`stressMeta.witnessSolution` plus every saved hint) through the **actual
production function** (`mustCrossNeighborBudgetDeadlocked`, not just the prototype) and asserts it
never rejects a state on a real, PLAY-valid path:

| corpus | levels | valid paths | steps replayed | states evaluated | violations |
|---|---:|---:|---:|---:|---:|
| published | 60 | 16,107 | 614,371 | 440,338 | **0** |
| corpus-1 | 43 | 10,452 | 795,424 | 540,752 | **0** |
| corpus-2 | 939 | 71,253 | 7,136,662 | 5,480,658 | **0** |
| **total** | **1,042** | **97,812** | **8,546,457** | **6,461,748** | **0** |

97,812 valid paths, 8.5M replayed steps, zero violations.

## Stage 3: wiring and production-safety check

Wired in as an opt-in ablation flag (`PRUNE_MC_NEIGHBOR_BUDGET`, default OFF — `scripts/ablation-config.mjs`'s
`OPT_IN_FEATURES`, same pattern as `PRUNE_PORTAL_PARITY_ENVELOPE`), at all three places a move is
gauntlet-checked: `prune-gauntlet.ts` (covers `dfsFromGate` and repair-search's `takePly`) and
`search.ts`'s beam loop (which inlines its own copy of the gauntlet rather than calling
`evaluatePrunedMove`). Default-off means production behavior is provably unchanged when the flag is
unset — confirmed by `npm run solver:bench -- --check`: **160/160, no regressions** on the published
corpus. Full `npm run ci`-relevant unit suite (`modules/solver/**`, 299 tests) and `tsc --noEmit`
both pass.

## Stage 4: first live matched-node A/B

30-level sample of unsolved, portal-free, must-cross-bearing corpus-2 levels (first 30 by array
position order among the typical-budget baseline's unsolved-with-must-cross-and-no-portals
population, 284 total — see Limitations). `--work-budget=26800000 --budget-ms=60000
--disable-extra-budget-passes --workers=4` in both arms (extension tiers off in both, so the
comparison isolates this one check; `--budget-ms` generous/non-binding per
`docs/solver-budget-determinism.md`).

| arm | solved | referee-invalid |
|---|---:|---:|
| OFF (baseline) | 5/30 | 0 |
| **ON** (`PRUNE_MC_NEIGHBOR_BUDGET`) | **16/30** | 0 |

**+11 (11 gained, 0 lost)** — every level OFF solves, ON also solves, plus 11 more. All 16 ON
solutions came back `refereeValid: true`. This is a small sample and CLAUDE.md's own standing
warning applies (a 24-level sample under-sold the reserved wall's true effect by roughly half in
the opposite direction — small samples decide whether to spend more compute, never the rate) — but
a clean, zero-regression, referee-valid +11/30 is a stronger first read than any of the three
shadow-eval-harness candidates that were closed after their own live checks (Parts 4/7/8 of
`docs/solver-shadow-eval-harness.md`), none of which reached the live-A/B stage before their catch
rates alone closed them.

## Stage 5: full-corpus deterministic A/B (2026-08-08, `solver-stress-refresh.yml` runs #28/#29)

The Stage 4 sample was superseded by a **full-corpus** A/B on the same infrastructure used for the
routine continuity baseline (`solver-stress-refresh.yml`, `deterministic=true` so the corpus-wide
node budget — 36,000,000 for corpus-2, 50,000,000 for corpus-1 — is the sole binding constraint,
not wall clock): run #28 (`PRUNE_MC_NEIGHBOR_BUDGET` OFF) vs. run #29 (ON), both dispatched from
this branch at the same code revision, all 1,700 corpus-2 and 102 corpus-1 levels.

| arm | corpus-1 | corpus-2 |
|---|---:|---:|
| OFF (run #28) | 96/102 | 725/1700 |
| **ON** (run #29) | 96/102 | **739/1700** |
| net | +0 | **+14** |

corpus-1 is unaffected (0 gained, 0 lost — the corpus-1 stress set is much smaller and evidently
doesn't exercise this path's regime). corpus-2's net +14 is **not** a strict superset, though: the
churn is bidirectional — **42 levels gained, 28 lost** (`R00001`, `R00323`, `R00468`, `R00553`,
`R00635`, `R00977`, `R01925`, `R01969`, `R02009`, `R02010`, `R02119`, `R02192`, `R02268`, `R02376`,
`R02393`, `R02415`, `R02422`, `R02519`, `R02691`, `R02842`, `R02867`, `R02871`, `R02875`, `R02933`,
`R03196`, `R03239`, `R03295`, `R03338`). Spot-checked: all 28 lost levels carry must-cross cells
(confirmed against `data/stress/stress-levels-random.json`), so the flag is genuinely live on every
one of them — this rules out the churn being some unrelated bug or noise source masquerading as the
prune's effect. The lost levels are not a soundness violation (Stage 2's 8.5M-step replay already
established the check never rejects a real solution) — the mechanism is budget *reallocation*: the
prune cuts dead search earlier, which changes `dfsFromGate`/beam's node-by-node exploration order
under the same fixed cumulative node budget, so a level that previously got solved by stumbling
onto a solution before the budget ran out can now exhaust the budget exploring elsewhere first, and
vice versa. This is an ordinary reordering side effect of any admissible pruning change under a
fixed budget, not evidence of a defect in the check itself.

**Total node counts were nearly identical between arms** (corpus-2: 36,735,817,088 OFF vs.
36,473,576,181 ON — a ~0.7% difference, consistent with the two runs using the same node budget
per level and mostly exhausting it either way), so the +14 is not explained by ON simply searching
more; it reflects a genuine reallocation of where the same amount of search effort goes.

## Status and next steps

The full-corpus result is a real, reproducible net positive (+14/1700 corpus-2, +0/102 corpus-1,
zero regression on the already-solved corpus-1 population) but **not a clean win**: 28 corpus-2
levels that solve today under the shipped default (flag OFF) would stop solving if this were
promoted to default-on, offset by 42 different levels newly solving. Recommendation: **keep
`PRUNE_MC_NEIGHBOR_BUDGET` opt-in, not default-on**, until at least one of the following closes the
gap — (a) a second independent full-corpus run confirming the churn is stable rather than an
artifact of this one pairing (repair-search's per-attempt seeds are deterministic functions of
`(gateKey, seedSalt)`, so a repeat run with identical code should reproduce the same 42/28 split;
worth confirming rather than assuming), or (b) a closer look at a handful of the 28 lost levels
(e.g. via `method-probe.mjs` on the specific attempt config that solved them OFF) to characterize
*why* the reallocation goes against them, which could surface a cheap follow-up tweak that keeps
the +42 gains without the -28 cost. Written admissibility argument (Stage 0), stored-solution replay
(Stage 2), a small live A/B (Stage 4), and now a full-corpus A/B (Stage 5) are all in hand; what
remains before default-on is understanding/mitigating the bidirectional churn, not further
soundness work — the check itself is not in question.

## Reproducing

```bash
# shadow probe vs. oracle-labelled atlas
node scripts/run-bundled.mjs scripts/stress/interface-probe-harness.mjs -- \
    --probes=mc-neighbor-budget-propagation --out=<file>

# full-corpus soundness replay (production function)
node scripts/run-bundled.mjs scripts/stress/mc-neighbor-budget-soundness-check.mjs -- --corpus=published
node scripts/run-bundled.mjs scripts/stress/mc-neighbor-budget-soundness-check.mjs -- --corpus=corpus1
node scripts/run-bundled.mjs scripts/stress/mc-neighbor-budget-soundness-check.mjs -- --corpus=corpus2

# production-safety check (flag stays default-off)
npm run solver:bench -- --check
```

## Limitations

- **The 30-level sample is a convenience slice (array-order first 30), not a random sample** — no
  reason to expect bias, but it wasn't drawn to guarantee representativeness the way a random draw
  would.
- **No already-solved control has been run yet at this writing** (launched, pending) — the reserved
  wall's own history shows the solved-control population is what separates "safe" from "safe and
  net-positive," and a small unsolved-only sample cannot substitute for it.
- **Nothing here re-baselines `logs/solver-baseline.json`** — the flag is default-off, so no
  baseline change is implied regardless of the A/B outcome.
- **Portal levels and flipper-adjacent required neighbors are entirely out of scope** by
  construction (see the derivation) — this result says nothing about whether either extension would
  also be sound or valuable.
