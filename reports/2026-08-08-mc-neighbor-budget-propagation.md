# Must-cross neighbor-budget propagation: sound opt-in prune, +14 net full-corpus A/B (2026-08-08)

> **Status:** inconclusive
> **Last evidence:** 2026-08-11 — full A/B reconciliation plus follow-up dynamic-resource analysis
> **Decision:** keep `PRUNE_MC_NEIGHBOR_BUDGET` opt-in/default-off; the rule is sound and net-positive but its 42-gained/28-lost finite-budget churn is not promotion-ready
> **Remaining gate:** repeat or diagnose the full-population 42-gained/28-lost split before promotion

`docs/solver-heuristic-capability-gap-analysis.md`'s item 3 ("Must-cross/intersection propagation:
proven family, narrowed frontier") named the untried piece explicitly: **bounded dynamic
propagation over forced interfaces and remaining free intersection budget, prototyped as a shadow
propagator first, judged by unique catches beyond the shipped gauntlet** — and warned not to revive
the falsified static forced-edge rule (`reports/2026-07-31-mustcross-forced-structure.md`'s step 4).
This report records the full sequence: derivation, shadow-probe measurement, full-corpus soundness
replay, the first live matched-node sample, and the superseding full-corpus deterministic A/B.

The broader 2026-08-11 interpretation and proposed descendants of this result live in
[`2026-08-11-dynamic-resource-frontier-synthesis.md`](2026-08-11-dynamic-resource-frontier-synthesis.md).
Use that synthesis for the current research direction; use this report for the evidence behind this
specific prune.

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
population, 284 total). `--work-budget=26800000 --budget-ms=60000
--disable-extra-budget-passes --workers=4` in both arms (extension tiers off in both, so the
comparison isolates this one check; `--budget-ms` generous/non-binding per
`docs/solver-budget-determinism.md`).

| arm | solved | referee-invalid |
|---|---:|---:|
| OFF (baseline) | 5/30 | 0 |
| **ON** (`PRUNE_MC_NEIGHBOR_BUDGET`) | **16/30** | 0 |

**+11 (11 gained, 0 lost)** — every level OFF solves, ON also solves, plus 11 more. All 16 ON
solutions came back `refereeValid: true`. This sample correctly justified buying the full run but
did **not** predict the final churn shape; it is retained as a methodological reminder that small
samples are triage gates, not population-level effect estimates.

## Stage 5: full-corpus deterministic A/B (2026-08-08, `solver-stress-refresh.yml` runs #28/#29)

The Stage 4 sample was superseded by a **full-corpus** A/B on the same infrastructure used for the
routine continuity baseline (`solver-stress-refresh.yml`, `deterministic=true` so the corpus-wide
node budget — 36,000,000 for corpus-2, 50,000,000 for corpus-1 — is the sole binding constraint,
not wall clock): run #28 (`PRUNE_MC_NEIGHBOR_BUDGET` OFF) vs. run #29 (ON), both dispatched from
the same code revision, all 1,700 corpus-2 and 102 corpus-1 levels.

| arm | corpus-1 | corpus-2 |
|---|---:|---:|
| OFF (run #28) | 96/102 | 725/1700 |
| **ON** (run #29) | 96/102 | **739/1700** |
| net | +0 | **+14** |

Corpus-1 is unaffected (0 gained, 0 lost). Corpus-2's net +14 is **not** a strict superset: the
churn is bidirectional — **42 levels gained, 28 lost** (`R00001`, `R00323`, `R00468`, `R00553`,
`R00635`, `R00977`, `R01925`, `R01969`, `R02009`, `R02010`, `R02119`, `R02192`, `R02268`, `R02376`,
`R02393`, `R02415`, `R02422`, `R02519`, `R02691`, `R02842`, `R02867`, `R02871`, `R02875`, `R02933`,
`R03196`, `R03239`, `R03295`, `R03338`). Spot-checked: all 28 lost levels carry must-cross cells
(confirmed against `data/stress/stress-levels-random.json`), so the flag is genuinely live on every
one of them.

The lost levels are not a soundness violation. Stage 2 established that the check does not reject a
real stored solution. The mechanism is budget *reallocation*: pruning dead search earlier changes
`dfsFromGate`/beam's node-by-node exploration order under the same fixed cumulative budget, so a
level that previously reached one solution before exhaustion can now spend that finite budget in a
different part of the tree, and vice versa.

**Total node counts were nearly identical between arms** (corpus-2: 36,735,817,088 OFF vs.
36,473,576,181 ON — about 0.7% lower ON), consistent with most levels exhausting the same per-level
budget. The +14 therefore reflects altered allocation within the search, not ON simply receiving
more work.

## 2026-08-11 follow-up interpretation

The later cross-corpus analysis in
[`2026-08-11-dynamic-resource-frontier-synthesis.md`](2026-08-11-dynamic-resource-frontier-synthesis.md)
strengthens the case that this result is pointing at a genuine missing representation rather than a
one-off prune trick:

- raw `reqInt` is almost flat between current Corpus-2 solves and failures;
- root `freeInt = reqInt - mustCrossCount` does not predict the hard group (the `freeInt == 0`
  population actually solves more often than the `freeInt > 0` population);
- simple static must-cross layout descriptors add essentially no predictive value beyond the known
  feature set; and
- the strongest remaining signal is therefore **dynamic destruction of future completion
  opportunity**, exactly what neighbor-budget detects in one narrow form.

That synthesis records three concrete descendants worth testing without conflating them with this
already-built rule:

1. a portal-level version that preserves the current proof but abstains **locally** around
   portal-affected required neighbours rather than globally because any portal exists anywhere;
2. instrumentation of `crossingSlack = freeInt - forcedFutureNeighbourRevisits` as a diagnostic
   state variable before using it for scoring/retention; and
3. a bounded compatibility reasoner over multiple remaining must-cross completion interfaces,
   explicitly avoiding the static forced-edge assumption already falsified in July.

These are proposals, not claims that the current prune proves their soundness or value.

## Status and next steps

The full-corpus result is a real net positive (+14/1700 corpus-2, +0/102 corpus-1), but **not a clean
promotion win** because 28 Corpus-2 levels that solve with the shipped default OFF do not solve
within the same fixed budget with the flag ON.

Recommendation remains: **keep `PRUNE_MC_NEIGHBOR_BUDGET` opt-in, not default-on** until at least
one of these decision-bearing checks is complete:

- repeat the deterministic full-corpus A/B to confirm the same gained/lost identity split; or
- inspect a representative subset of the 28 losses with existing method/attempt probes to
  characterize the changed search allocation and identify whether a cheap policy treatment can
  retain more of the +42 without sacrificing the -28.

Further basic soundness replay is not the current blocker. The unresolved question is finite-budget
search behavior.

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

- **The Stage-4 30-level sample was a convenience slice**, not a random sample, and its +11/30
  clean-superset result was superseded by the Stage-5 full-population 42-gained/28-lost result.
- **The full A/B includes already-solved controls by construction.** Older text in this report that
  said an already-solved control was pending is obsolete; Stage 5 is the authoritative promotion
  evidence.
- **Nothing here re-baselines `logs/solver-baseline.json`** — the flag remains default-off, so no
  baseline change is implied by the A/B.
- **Portal levels and flipper-adjacent required neighbors are still out of scope** by construction.
  The 2026-08-11 locally-abstaining portal extension is a proposal that requires a new derivation,
  stored-solution replay, shadow score, and live A/B; it is not licensed by this report's existing
  proof.
