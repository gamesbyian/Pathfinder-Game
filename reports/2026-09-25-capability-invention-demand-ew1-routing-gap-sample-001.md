# Capability-invention demand: EW1 routing-gap first-loss sample 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-25 — existing-data sample from the already-committed EW1 bounded pricing/production-reach join (`reports/stress/capability-runs/35687363645/equal-work-production-reach.json`) plus a direct `getAttemptConfigs` dump against current `main`.
> **Decision:** both `ew1-solvers-not-offered` rows on the frozen 60-level EW1 sample are **F8 routing/deployment misses**, not F7 work-starvation: production's `attempts.ts` feature-profile routing never includes the winning action at all (confirmed `productionAttempts=0` in the join, cross-checked against the level's actual current routed config list). Registered as `CID-0027`/`CID-0028` in `data/stress/capability-invention-demand.json`.
> **Remaining gate:** design (not dispatch) the smallest matched-work routing-exposure test per row's `smallestProbe`; no production change is authorized by this sampling alone.
> **Evidence role:** first-loss demand sampling, per `docs/solver-capability-invention-program.md`'s "First-loss demand sampling" instrument.
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`

## Why this sample needed no new acquisition

`docs/solver-optimization-workstreams.md`'s WS2-2I gate calls for "mechanically sample first-loss /
operational-divergence... especially the 47 singleton-supported cases and cheap isolated/zero-
production-win routing mismatches," using the fresh 2026-09-22 technique-census denominator. The
census combine matrix that would enumerate the full 83/47 cohort lives on a GitHub Actions artifact
host (`*.blob.core.windows.net`) this environment's network policy denies (confirmed via
`download_workflow_run_artifact` -> `curl` 403; see the branch's own commit history for that
investigation). That specific cohort therefore remains blocked pending either a broader network
allowlist or a repo-side change that persists the join durably (the census closeout's own flagged
provenance-contract defect).

However, the reconciliation report covering the same refresh (`reports/2026-09-22-broad-capability-
refresh-failure-evidence-reconciliation-001.md`) already surfaces a **smaller, fully local, already-
narrowed cohort**: "2 current production misses are solved by EW1 techniques that production never
offered on those levels," sourced from `reports/stress/capability-runs/35687363645/equal-work-
production-reach.json` — a file already committed on `main`. That file is itself decision-bearing
(`decisionBearing: true` per its own header) and requires no new solver execution to mine.

## Sample

Two rows, the full `pricingComparison: "ew1-solvers-not-offered"` set on the frozen 60-level EW1
pricing population (`reports/stress/capability-runs/35687363645/equal-work-production-reach.md`):

| Level | Winning EW1 action(s) | EW1 work | `productionAttempts` | Full-census T1 support |
|---|---|---:|---:|---|
| R00118 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` | 3,063,399 | 0 | 7 techniques (not singleton) |
| R02696 | `beam\|score=harvestThenFinish\|...\|width=2000\|retention=plain`, `...knotBuilder...`, `...mustCrossFirst...` | 604,008–660,150 | 0 (each) | **1 technique, singleton** |

## Diagnosis: F8, not F7

`CID-0001`'s neighboring rows in the register are **F7 work starvation** (a rescuer *is* offered/
attempted but its production dose is reserved below its known isolated cost — see the class-3 dose
exposure and reserve-starvation rows already in `data/stress/capability-invention-demand.json`).
These two rows are structurally different: `productionAttempts=0` in the join means the action was
never attempted at all, not attempted-and-underfunded. Per `docs/solver-first-loss-causal-taxonomy.md`,
that is **F8 routing/deployment miss**: "capability exists but is not invoked, placed, or sequenced
where needed."

Confirmed directly (not inferred from the join alone) by dumping each level's actual current
`getAttemptConfigs(level)` result against `main` (solver ref at time of dump: `4475009e...`, no
solver-behavior-changing commits since):

- **R00118** (`requiredIntersections=6`, no `mustCross`, no portals, 17 offered configs): production
  offers `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` — the same score
  and width as the EW1 winner, but the **plain** retention variant, never the **mechanic-buckets**
  retention variant that actually solves it.
- **R02696** (`requiredIntersections=12`, no `mustCross`, no portals, 12 offered configs): production
  offers `width=5000` beams (`intersectionHarvest`, `objectiveFirst`) and `width=2000` `perimeterSweep`
  (CW/CCW) only. None of the three winning score functions (`harvestThenFinish`, `knotBuilder`,
  `mustCrossFirst`) appear at **any** width for this feature profile.

Both are HARVEST: the beam family, score functions, and retention mechanic already exist and are used
elsewhere in `modules/solver/attempts.ts`'s many feature-profile branches; this is exposure/allocation,
not a missing semantic operation.

## Recurrence and base rate

Only 2 independent parents are known from this specific bounded population (2/60 = 3.3% of the EW1
frozen pricing sample). This is existing-data evidence, not a claim of a larger prevalence — the EW1
sample itself was frozen for a different pricing purpose and was never a representative draw over the
full 532-level residual. R02696 is the higher-priority row: it is the level's **only** known
T1-isolated rescuer family (singleton), entirely unrouted for this feature profile, versus R00118
where 6 other T1 techniques could in principle also reach it.

## What this does not authorize

- No change to `modules/solver/attempts.ts`'s routing for either feature profile.
- No claim that adding the missing action(s) would not regress some other level currently reached
  by the same feature-profile branch — that is exactly what the registered `smallestProbe` for each
  row is designed to check, and it has not been run.
- No inference that F8 routing misses are common; this is a 2-row sample from a 60-level bounded
  population selected for pricing, not prevalence.
- No progress toward the blocked 83/47 fresh-census cohort — that remains a separate, still-blocked
  acquisition need.

## Next action

Per each row's `smallestProbe`, the next gate for either row is a **design** step (a matched-work
routing-exposure test scoped to the exact feature-profile branch, with same-branch solved-level loss
controls), not a dispatch. Given the very small n (2 parents, one singleton), this is unlikely to
justify a broad campaign on its own; it is registered as HARVEST demand evidence for when a
routing/allocation question in this family is next prioritized, consistent with
`docs/solver-capability-invention-program.md`'s promotion-into-live-queue gate ("promote only
recurrent decision-bearing semantic gaps").

## Artifacts

- `data/stress/capability-invention-demand.json` — `CID-0027`, `CID-0028` (28 rows total after this
  change; validated via `node scripts/capability-invention-demand.mjs` and
  `npm run test:capability-invention-demand`).
- `reports/stress/capability-runs/35687363645/equal-work-production-reach.json` — source join
  (already committed, no new acquisition).
