# Repair late-probe multi-seed retry `7 -> 6` confirmation: clean negative — seed 7 is a real, unique rescue on 2/150 levels

> **Status:** concluded-negative
> **Last evidence:** 2026-09-10 — control run [`34519862702`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34519862702) (seed count omitted, production default 7) and treatment run [`34519864989`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34519864989) (`repair_late_probe_multi_seed_retry_seed_count=6`), both against the frozen 150-id reach-conditioned population, both `conclusion=success`, `150/150` exact level ids present in both arms
> **Decision:** do **not** promote the unconditional six-seed truncation. Two of the frozen decision rule's five criteria fail outright (zero-loss and no-seed-7-exclusive-solve), each independently sufficient to close negative. Production stays at seven seeds
> **Remaining gate:** none for the unconditional form — closed per the preflight's own disposition ("mark the unconditional `7 -> 6` form closed unless materially new evidence identifies a narrower conditional premise")
> **Evidence role:** confirmation — the population-scale dispatch this preflight was built to run
> **Selection:** the full pre-specified 150-id population (`data/stress/repair-late-probe-six-seed-confirmation-001-ids.txt`), reach-conditioned on legal control-side `reachedTechniques` evidence, disjoint from the 40-level discovery population

## Method

Both arms used `solver-level-blind-targeted-sweep.yml` against the same 150-id population, `node_budget=50,000,000`, `work_budget=500,000,000` (explicit, independent of the legacy `node_budget * 1.34` derivation), `strict_total_work_budget=true`, no `node_budget_advisory_only` — the envelope validated in this preflight's own 2026-09-10 correction. Arms differ only in `repair_late_probe_multi_seed_retry_seed_count` (omitted / `6`). Compared each arm's `Combine shard results` job output directly (`Solved:`/`Unsolved:` id lists, per-stage reach/participation/workSpent breakdown), then re-ran the maintained `solver-combine-sweep-runs.yml` workflow with `highlight_stages=late-repair-multiseed-retry` against each run individually to get per-level `stageAttempts`/`stageSolved` detail for the target stage specifically.

## Result

| | control (7 seeds) | treatment (6 seeds) |
|---|---:|---:|
| population integrity | 150/150 exact ids | 150/150 exact ids |
| solved | 26/150 | 24/150 |
| `late-repair-multiseed-retry` reached | 146/150 | 146/150 (identical set) |
| `late-repair-multiseed-retry` solved-by-this-stage | 22/150 | 20/150 |
| `late-repair-multiseed-retry` aggregate `workSpent` | 4,645,103,126 | 4,022,554,777 |
| aggregate `workSpent` (whole population) | 38,399,869,936 | 36,269,016,110 |
| gains vs. control | — | 0 |
| losses vs. control | — | 2 (`R02460`, `R02553`) |

Every stage before `late-repair-multiseed-retry` is byte-identical between arms (`main-search`, `goal-attraction-disabled-retry`, `coarse-state-near-tie-retention-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `guidance-goal-distance-retry`, `must-cross-neighbor-prune-disabled-retry` all report the same reach counts and aggregate `workSpent` in both arms) — no execution confound or asymmetric truncation (criterion 5 satisfied structurally).

### The two losses are confirmed seed-7-exclusive rescues, not noise

Per-level detail for stage `late-repair-multiseed-retry`:

| id | control `stageAttempts` | control `stageSolved` | treatment `stageAttempts` | treatment `stageSolved` |
|---|---:|---:|---:|---:|
| `R02553` | 7 | true | 6 | false (`node-budget-reached`) |
| `R02460` | 7 | true | 6 | false (`node-budget-reached`) |

Both levels needed the full seven attempts to solve under control — `stageAttempts=7` means the winning attempt was the seventh (last) salt in the sequence. Under treatment, both levels exhaust exactly six attempts (`stageAttempts=6`, matching the seed-count override's own contract of consuming exactly salts 1-6) and fail. This is the textbook "credible seed-7-exclusive solve" the frozen decision rule's criterion 3 names explicitly, on two separate levels, not one borderline case.

## Decision against the frozen rule

Per `2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md`'s "Frozen decision rule" (five criteria, all required to promote):

1. **zero treatment losses** — FAILS (2 losses: `R02460`, `R02553`).
2. treatment reaches the stage on enough levels to be informative — PASSES (146/150, same set as control; not a null confirmation).
3. **seed 7 produces no unique control solve** — FAILS (both losses are confirmed seed-7-exclusive, per the `stageAttempts`/`stageSolved` table above).
4. treatment reduces aggregate `workSpent` by a real, non-trivial amount — PASSES (stage-level: 4,645,103,126 → 4,022,554,777, a 13.4% reduction; whole-population: 38,399,869,936 → 36,269,016,110, a 5.5% reduction).
5. no execution confound or asymmetric truncation — PASSES (population integrity 150/150 in both arms; every earlier stage byte-identical).

Criteria 1 and 3 each independently disqualify promotion; both fail here. Per the preflight's own "Disposition after result": *"On a negative result, leave production at seven seeds and mark the unconditional `7 -> 6` form closed unless materially new evidence identifies a narrower conditional premise."*

**Production stays at seven seeds.** No code or default-value change is warranted by this result.

## What this does not establish

- Does not rule out a narrower, conditionally-earned reduction (e.g. a level-property-gated seed count, or a seed count that varies by reach depth) — the preflight itself names this as the appropriate next question rather than "repeating nearby global seed-count guesses." Not investigated here.
- Does not quantify whether the observed 5.5%/13.4% work savings would still look attractive under a narrower, loss-free variant — no such variant has been designed or tested.
- The experiment-only `repairLateProbeMultiSeedRetrySeedCountOverride` plumbing (`orchestration.ts`, `stage-budget.ts`, `level-blind-capability-sweep.mjs`, `solver-level-blind-targeted-sweep.yml`) is left in place rather than removed, despite the preflight's "otherwise remove experiment-only plumbing after recording the result" note — it is a strict no-op when omitted, has its own unit/regression coverage, and may be directly reusable for the "narrower conditional premise" follow-up named above. Left as an open cleanup question rather than acted on unilaterally.

## Reproduction / provenance

- control: GitHub Actions run [`34519862702`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34519862702); per-stage detail via `solver-combine-sweep-runs.yml` run [`34527192028`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34527192028) (`highlight_stages=late-repair-multiseed-retry`)
- treatment: GitHub Actions run [`34519864989`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34519864989); per-stage detail via `solver-combine-sweep-runs.yml` run [`34527189135`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34527189135) (`highlight_stages=late-repair-multiseed-retry`)
- both at commit `a83e637c79f3d8f44eb571c0cbe2d9d8d6b33fa0` (PR #1709's merge)
- population: `data/stress/repair-late-probe-six-seed-confirmation-001-{population.json,ids.txt,selection-manifest.json}`
