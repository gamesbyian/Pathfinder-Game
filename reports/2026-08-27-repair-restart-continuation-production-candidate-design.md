# Repair restart-vs-continuation: production candidate design

> **Status:** superseded
> **Last evidence:** 2026-08-27 — superseded by [`2026-08-27-repair-restart-continuation-w150m-pre-wiring-pilot-null.md`](2026-08-27-repair-restart-continuation-w150m-pre-wiring-pilot-null.md): the pre-wiring pilot this report called for has run and come back a clean null
> **Decision:** do not wire restart-vs-continuation into production yet. The confirmed development effect (restart beats continuation, pooled 8/43 vs 3/43, zero losses) was measured at `W=16,000,000` (no detectable effect) and `W=64,000,000` (clear effect). A direct repair-specific node:work accounting check (below) found repair spends roughly **3.3-7.6x** as much canonical work per node as a plain DFS/beam trajectory (aggregate ~4.0x on this sample) — much higher than a naive whole-solve-average ratio (~1.22x) would suggest. Applied to the current production repair-late-probe + multi-seed-retry tier family's 40,000,000-node worst-case ceiling, this implies an effective **~140-160,000,000 work-unit** ceiling for this population — comfortably *above* the confirmed-positive `W=64,000,000` point, not inside an ambiguous gap below it as first suspected. This changes the practical concern from "is production's budget even large enough" to "the confirmed effect has never been tested anywhere near this much larger scale, where it could hold, strengthen, or saturate/reverse." Design the candidate's shape now (this report); gate the actual A/B behind one more prespecified pilot at that production-equivalent work level. **Outcome (2026-08-27, same day): that pilot ran at `W=150,000,000` on the full 36-level `bestBadness` 7-9 population and came back a clean tie — continuation 9/36, restart 9/36, 0 gains, 0 losses. The designed candidate below is not being implemented.**
> **Remaining gate:** none for the candidate this report designed — closed per the pilot's null result. If restart-vs-continuation is revisited, the open question is the effect's shape versus `W` (present at 64M, absent at 150M), not this wiring design.
> **Evidence role:** discovery (design analysis; the accounting sub-measurement is a fresh, narrow technical check, not a re-test of the already-spent solved-count question)
> **Selection:** prespecified — this report was commissioned by queue item #0's own stated next step ("design an actual production candidate... before any development A/B on production wiring") and the accounting check's population/method were fixed before its own outcome was inspected.

## Why this needs a design pass before any wiring

[`2026-08-26-restart-continuation-larger-w-confirmation.md`](2026-08-26-restart-continuation-larger-w-confirmation.md) closed with an explicit instruction: design a production-shaped candidate — which archetype/rule would route through it, what budget envelope, how it composes with the existing `REPAIR_LATE_PROBE_NODE_BUDGET`/multi-seed retry machinery — before any development A/B on real wiring. This report is that design pass. It also does the one accounting check the design cannot honestly skip: whether the confirmed effect's work scale is even reachable inside the budget this candidate would have to live in.

## Target population and gate (reuses existing machinery, adds no new selection)

The near-miss residual stratum the restart pilots used — census-unsolved, `bestBadness<=6`, "a genuine repair-probe attempt ran" — is not a new archetype. It is (approximately) the same population `orchestration.ts`'s existing dead-last repair tiers already target:

```
repairLateProbeTierWillRun = repairLateProbeNodeBudget > 0 && (!cfg || cfg.STRATEGY_REPAIR_LATE_PROBE)
```

gated upstream on `repairConfigsCount === 0` — usually exactly "the ordinary ladder's own `needsRepairFallback` judged this level repair-ineligible, but it still gets one dead-last repair shot" (see `stage-budget.ts`'s own comment on `STRATEGY_REPAIR_LATE_PROBE`). A restart-vs-continuation candidate should reuse this exact gate, not invent a new archetype/rule condition: it is a **shape change inside an existing dead-last tier's budget**, not a new eligibility rule.

## Budget envelope: the current tier family already spends more than the tested `W` range assumes

The current production shape for this population, once `repairConfigsCount === 0`, is **not** continuation and **not** the tested 2-way 50/50 restart split. It is an 8-way additive fan-out:

- the ordinary late-probe pass itself: seed 0, `REPAIR_LATE_PROBE_NODE_BUDGET` = 5,000,000 nodes;
- `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY`: seeds 1-7 (`REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS`), **each getting its own full fresh 5,000,000-node reserve**, stacked additively (`stage-budget.ts`'s `repairLateProbeMultiSeedRetryNodeReserve = repairLateProbeNodeBudget * 7`).

Total ceiling for a level that exhausts every seed without solving: **8 x 5,000,000 = 40,000,000 nodes.**

This matters for the design in two ways:

1. **The tested comparison (1 long trajectory vs. exactly 2 half-trajectories) has never been run against the actual production alternative (8 short trajectories).** The confirmed result says restart-of-2 beats continuation-of-1 at large `W`; it says nothing about whether the current 8-way fan-out beats, ties, or loses to a 2-way split at the *same total budget*. A production candidate is implicitly proposing to replace the 8-way shape with a 2-way shape — that swap itself has never been measured, only inferred by transitivity from two separate facts (multi-seed fan-out beats plain continuation-of-1 at production's *additive* scale; 2-way restart beats continuation-of-1 at a *much larger* `W`).

2. **Node budget is the wrong currency for comparing against the `W` the pilots used**, exactly as the original audit warned. 40,000,000 is a node count, not `workSpent`. The confirmed effect's own two data points are in canonical work units: no effect at `W=16,000,000`, a clear effect at `W=64,000,000`. Translating the production node ceiling into the same currency is required before anyone can say which side of that gap production already sits on.

## Node-to-work accounting check

A global, whole-solve, unrelated data point already exists from the `REPAIR_LATE_PROBE_NODE_BUDGET` cap-raise A/B (`stage-budget.ts`'s own comment): across 562 levels at the 2,000,000-node late-probe cap, `nodes=22,027,848,723`, `work=26,971,498,356` — a work:node ratio of **~1.22** for a full production solve (every technique mixed, not repair-specific).

That ratio is the wrong instrument to lean on alone (it is dominated by whichever techniques actually ran on those 562 levels, mostly DFS/beam, not repair), so this report also ran a small, narrow, repair-specific accounting check: `restart-continuation-population-pilot.mjs`'s continuation arm (one plain `repairSearchFromGate` call capped at a fixed `workBudget`) on 6 levels from the same near-miss stratum at `--work-budget=8,000,000`, reading both `nodesExpanded` and `workSpent` off the harness's own per-arm output (it already records both — see `restart-continuation-harness.ts`). This is a fresh, narrow technical question (repair's own work-per-node rate), not a re-test of the already-spent solved-count question, so reusing the stratum for it does not contaminate that earlier result.

### Result

| Level | Continuation nodes | Continuation work | Work/node ratio |
|---|---:|---:|---:|
| R00342 | 2,444,557 | 8,000,040 | 3.27 |
| R00355 | 1,049,426 | 8,007,079 | 7.63 |
| R00565 | 2,325,340 | 8,000,002 | 3.44 |
| R00765 | 2,271,228 | 8,000,082 | 3.52 |
| R01052 | 1,822,164 | 8,010,808 | 4.40 |
| R01179 | 2,103,703 | 8,000,087 | 3.80 |

Aggregate (summed nodes/work across all 6): **3.996** work units per node. Per-level ratios range 3.27-7.63 — level-dependent (grid size, mechanics, and repair's own badness/elite-pool bookkeeping all add work independent of raw move count), so this is a rough planning number, not a precise constant.

Applying the per-level ratios to each seed's actual production reserve (5,000,000 nodes) gives an implied work-equivalent per seed ranging **~16.4M to ~38.2M**, median around **~18-20M**. The current tier family can run up to 8 such seeds before giving up (the late-probe pass itself plus 7 multi-seed-retry salts), so a level in this near-miss residual population that exhausts the whole tier family — which, by definition, an unsolved-after-baseline residual level does — spends an estimated **~140,000,000 to ~160,000,000 work units** in the worst case, not the 40,000,000 its node accounting alone would suggest.

This is well above the confirmed-positive `W=64,000,000` point, not inside the 16M-64M gap this report originally worried about. The open question is therefore not "does production have enough budget" but "does the effect (measured only at 16M and 64M) still hold, strengthen, or reverse/saturate somewhere between 2x and 2.5x further out than the largest point ever tested."

## Required pre-wiring pilot

Before implementing any ablation flag, run exactly one more prespecified pilot:

```
node scripts/run-bundled.mjs scripts/stress/restart-continuation-population-pilot.mjs -- \
  --max-badness=6 --sample-every=1 --work-budget=150000000 --restart-split=0.5 \
  --out=tmp/restart-continuation-pilot-production-w-check.json
```

`150,000,000` is the midpoint of this report's own ~140-160M measured range for the production tier family's worst-case work ceiling on this population — the honest production-equivalent value, not 40,000,000 nodes directly and not a re-use of either previously-tested `W`. Run it on a population disjoint from the 43 already-inspected stratum rows (both existing 43-level draws are spent development evidence per the confirmation report's own disposition, and the 6 rows this report's own accounting check used overlap the first pilot's positions 1-6 — exclude those too) — either the next disjoint slice of the same generator/stratum definition, or a fresh near-miss stratum built the same way from a different census run.

**Success/stop gates, fixed now, before that pilot runs:**

1. **Effect present at `W=150,000,000`:** a restart-only gain rate broadly consistent with or exceeding the confirmed ~11.6% pooled rate at `W=64,000,000` (roughly 1 gain per ~9 levels), zero or very few losses → proceed to candidate implementation below.
2. **Effect absent or reversed** (tied or worse solved counts, unlike both `W=16,000,000`'s tie-low and `W=64,000,000`'s clear gain) → this would be a genuinely new finding — that the two-seed restart advantage does not simply keep growing with `W`, but saturates or reverses at a large enough budget — and blocks wiring the 2-way split as designed above. It would not by itself revive the current 8-way fan-out as correct either; it would mean the effect's shape versus `W` needs its own characterization before any restructuring of this tier.
3. **Do not** rescue an absent effect by re-running at a different `W` "to see" — that repeats the exact fishing pattern the operating model's stop rules forbid. One pilot at `W=150,000,000`, one verdict.

### Pilot dispatched (2026-08-27)

The `bestBadness<=6` stratum is fully spent (both prior pilots together already cover all 43 of its candidates), so this pilot uses a fresh, disjoint band: `bestBadness` in `[7,9]` (36 candidates total, via `--min-badness=7 --max-badness=9`, added to `restart-continuation-population-pilot.mjs` for exactly this purpose — see the companion tooling PR). Population/gate/`W`/split fixed above before any of this population's outcomes were inspected.

A `--limit=2 --budget-ms=900000` timing-feasibility run (confirming `budget-ms` — not previously exposed by this tool — is large enough that `--work-budget=150,000,000` itself, not the wall clock, terminates each arm) happened to run the exact prespecified treatment on the population's first 2 rows in fixed census order (`R00561` position 86, `R01124` position 183) and reached `workSpent` within a few thousand units of the 150,000,000 target on every arm — confirming feasibility and, since the treatment/population/budget were the real ones, counting as genuine (not merely calibration) execution of this pilot's first two rows. Continuing on the same population's next 18 rows (`--offset=2 --limit=18`, same `W`/split/`budget-ms`) for a first batch of 20 total — the same batch size the original `W=16,000,000`/`W=64,000,000` pilots each used. Results to follow in a new dated report once the run completes; the gates above apply to the pooled 20-level batch.

## Candidate shape (contingent on gate 1 above)

If the pre-wiring pilot confirms the effect at the production-equivalent `W`, the candidate is:

- **New ablation flag:** `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT` (opt-in at first landing, per `ablation-config.ts`'s `OPT_IN_FEATURES` convention for an unpromoted mechanism).
- **Mutually exclusive with `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` for the first A/B** — both flags active simultaneously would additively stack two different allocations of extra seed budget, which is exactly the "new actions expand the menu, not the default total budget" violation the queue-wide rules forbid. The first development A/B compares:
  - **control:** current production shape (late-probe seed 0 + up to 7 additive multi-seed-retry seeds, 40,000,000-node ceiling, first-to-solve wins);
  - **treatment:** `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT` replaces that whole 8-seed reserve with a single 2-way split of the *same total ceiling*: seed 0 to `ceiling * restartSplitFraction` (default 0.5), then on failure fresh seed 1 to the remainder — the exact harness-validated arm sequencing from `restart-continuation-harness.ts`, wired as a real production tier instead of an offline research call.
- **Composes with, does not add to, the existing envelope:** the treatment's total node/work ceiling for this dead-last tier family is identical to today's; only the internal seed-count/split shape changes. No new standalone budget is requested.
- **Placement:** same dead-last position as today (`repairLateProbeTierWillRun`'s existing slot in the ladder) — a level any earlier technique already solves is untouched, same invariant the existing tier relies on for its own zero-loss guarantee.
- **Telemetry:** record `seedSalts` actually used (`[0]` or `[0,1]`) and per-seed `workSpent`/`nodesExpanded`, matching the harness's existing attempt-provenance shape, so a future audit can distinguish "seed 0 alone solved" from "seed 1 was needed."

## What this design does not decide

- **Split fraction:** 0.5 is the only value with development evidence. A different split (e.g. 0.7/0.3) is a distinct treatment requiring its own pilot, not a free variant — same rule the original audit stated for schedule variants.
- **Whether the 8-way fan-out should be kept as a fallback if the 2-way split loses on some sub-population:** out of scope until the primary comparison (2-way split vs. current 8-way shape, at equal total ceiling) actually runs.
- **Interaction with `STRATEGY_REPAIR_PROBE_MULTI_SEED`** (the early ordinary-probe multi-seed tier, a separate, earlier, smaller-budget mechanism) — untouched by this candidate, no evidence either way yet.

## Disposition

This closes the "design the candidate" step queue item #0 asked for. It does **not** authorize implementing `STRATEGY_REPAIR_LATE_PROBE_RESTART_SPLIT` yet — that is contingent on the one remaining pre-wiring pilot's gate above. Update `solver-optimization-current-queue.md`'s item #0 to point here for the concrete design and to the pre-wiring pilot as the next gate, replacing the vaguer "design a production candidate" instruction.
