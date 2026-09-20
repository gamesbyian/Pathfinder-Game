# Admissible-order reserve-starvation prospective probe preflight 001

> **Status:** active
> **Last evidence:** 2026-09-19 — retained-asset audit plus recovery of R00044's original 1.2B targeted-sweep artifact.
> **Decision:** freeze an independent 40-parent current-residual sample and probe only the demonstrated winning default admissible-order profile at a 300M isolated node ceiling.
> **Remaining gate:** dispatch the one-row R00044 execution canary, then the frozen 40-parent sample; classify the high-cost tail before any reserve-fraction A/B.
> **Evidence role:** precommitment / acquisition design; no new solver outcome inspected for the frozen sample.

## Why this probe is now well specified

The zero-compute asset audit established that both committed technique censuses stop isolated actions at 50M nodes, too low to observe the cost range implicated by R00044.

The original R00044 work-ladder artifact from GHA run `35335905251`, shard 011, resolves the mechanism exactly:

- winning config: `admissible-order|tieBreak=default|lds=off`;
- winning action: `admissible-order-fallback|admissible-order|tieBreak=default|lds=off`;
- isolated stage solve cost inside the production ladder: **219,802,423 nodes**;
- current 300M external budget gives admissible-order fallback a 25% reserve, about **75M nodes**.

That makes a one-profile isolated cost probe the smallest faithful recurrence test. Do not combine the five admissible-order profiles into one method-probe call: the production code's own validation history says those profiles were calibrated as standalone canonical attempts, and combining them would change budget semantics.

## Frozen confirmation population

Source boundary: capability run `35066677597` at solver ref `16114b80e54233910f34ec2ea8e2c1a41a859eb4`, Corpus 2, 1,700 total / 1,169 solved / **531 residual**.

Discovery rows `R00044`, `R01000`, and `R02974` are excluded before sampling.

From the remaining 528 residual rows, draw 40 by the repository-standard deterministic convention:

```text
FNV-1a(seed) -> mulberry32 -> Fisher-Yates
seed = failure-reserve-starvation-default-profile-2026-09-19
seedHash = 1682830276
```

The frozen artifact is:

`reports/stress/failure-evidence/reserve-starvation-default-profile-sample-2026-09-19.json`

The frozen artifact also carries the machine-readable `resolutionDesign`: live rivals, discriminating observable, required observability axes, negative-interpretation policy, and the 0/1/>=2 outcome meanings. It also owns `probeDesign.reserveNodes`, `probeDesign.totalNodes`, and `probeDesign.expectedAction`. `analyze-reserve-starvation-probe.mjs` consumes those frozen values and rejects disagreeing CLI overrides rather than hardcoding a second quantitative contract.

It also carries a frozen `independenceDesign`. The 40 sampled rows are independent level-parent units and exclude the three discovery rows, but they remain from the same Corpus-2 construction family and use shared Pathfinder implementation/analysis/framing. The recurrence result therefore supports a current-residual frequency claim, not cross-distribution or independently implemented replication.

Frozen ids:

```text
R00050,R00142,R00306,R00479,R00563,R00647,R01044,R01132,R01154,R01290,R01577,R02029,R02032,R02054,R02206,R02210,R02272,R02318,R02325,R02347,R02387,R02397,R02432,R02561,R02622,R02664,R02733,R02768,R02780,R02890,R02918,R02949,R03046,R03092,R03212,R03216,R03270,R03287,R03291,R03330
```

This population was selected without inspecting any new default-profile 300M outcomes.

## Instrument

Use `.github/workflows/method-probe-sweep.yml`, whose targeted `levels` input now preserves exact selected-population integrity and protocol identity.

Canonical attempt identity:

```text
admissible-order|tieBreak=default|lds=off
```

Node ceiling: **300,000,000**.

Do not set a canonical work ceiling for this acquisition. The question is the isolated node find-cost curve that originally sized the node reserve. Use `budget_ms=600000` as a deliberately loose per-attempt wall safety deadline; wall binding is censoring, never a negative.

Use one process per shard (`workers=1`) so within-run CPU contention does not become part of the find-cost comparison.

## Stage 0 execution-family canary

Before the 40-parent dispatch, run only `R00044` with:

```text
only = admissible-order|tieBreak=default|lds=off
corpus = data/stress/stress-levels-random.json
levels = R00044
budget_ms = 600000
work_budget = <blank>
node_budget = 300000000
shard_count = 1
max_parallel = 1
workers = 1
```

Canary passes only if:

1. selected-population integrity is exactly 1/1 R00044;
2. the attempt identity is the canonical default admissible-order config above;
3. the row is not deadline-truncated or harness-error;
4. standard compact failure-response publication succeeds;
5. if it solves, the observed node cost is compatible with the prior ~219.8M result rather than revealing a material current-code drift.

A canary non-solve is not automatically an infrastructure failure because current code may have drifted. If the execution contract is healthy but the known positive no longer reproduces, stop and reconcile capability freshness before using the 40-parent result.

## Stage 1 frozen 40-parent probe

After the canary clears, dispatch the same inputs except:

```text
levels = R00050,R00142,R00306,R00479,R00563,R00647,R01044,R01132,R01154,R01290,R01577,R02029,R02032,R02054,R02206,R02210,R02272,R02318,R02325,R02347,R02387,R02397,R02432,R02561,R02622,R02664,R02733,R02768,R02780,R02890,R02918,R02949,R03046,R03092,R03212,R03216,R03270,R03287,R03291,R03330
shard_count = 40
max_parallel = 20
workers = 1
```

The wrapper may reduce shard count only if the selected population is smaller than requested; for this frozen population it should remain 40.

Recover infrastructure/deadline-censored ids under the same commit, config, node ceiling, and wall deadline policy. Do not score missing/censored rows as failures.

## Mechanical result reduction

After the standard compact failure-response artifact is complete, run:

```bash
npm run research:analyze-reserve-starvation -- \
  --in=<compact-failure-response.json> \
  --sample=reports/stress/failure-evidence/reserve-starvation-default-profile-sample-2026-09-19.json \
  --out=<reserve-starvation-analysis.json>
```

`scripts/analyze-reserve-starvation-probe.mjs` verifies the frozen population, protocol identity, exact retained action identity, censoring, and the prespecified 75M/300M thresholds. It refuses to apply the 0/1/>=2 decision rule while any expected parent is missing or non-interpretable.

## Primary derived quantity

For each complete row, use the isolated default-profile `nodesExpanded` on a solve.

Define a **reserve-starvation opportunity** as:

```text
solved
AND nodesExpanded > 75,000,000
AND nodesExpanded <= 300,000,000
```

Interpretation:

- `<=75M`: default-profile capability exists, but the find cost fits inside the current 25% reserve and does not support the R00044 starvation mechanism.
- `(75M,300M]`: the isolated find lies above the current reserve but inside the existing total node envelope; this is the recurrence shape the question asks about.
- unsolved/exhausted at 300M: no evidence that reallocating the existing 300M could expose this isolated default-profile solve.
- deadline/harness error: abstention / recovery required.

This is still nomination evidence. Isolated find cost does not prove the real ladder can reallocate without harming earlier stages.

## Decision rule, frozen before dispatch

Among the 40 independent parents:

- **0 reserve-starvation opportunities:** close this first recurrence screen negative and keep reserve repricing deferred. A zero count in 40 places the simple binomial 95% upper bound near 7.2%; do not spend matched-work A/B compute from R00044 alone.
- **1 opportunity:** inconclusive. Freeze one additional disjoint 40-parent sample before any reserve-fraction A/B.
- **>=2 opportunities:** recurrence is large enough to justify designing the smallest matched-total-work reserve-fraction A/B. Do not pick the new fraction from the confirmation outcomes; use the observed cost curve only to predeclare candidate fractions and include explicit earlier-stage loss controls.

Any later reserve A/B must measure both sides of the zero-sum trade:

- newly recovered residual rows;
- regressions among rows relying on earlier-stage budget;
- total canonical `workSpent` and node allocation;
- stage participation/censoring;
- solved controls under the same protocol.

## What this does not authorize

This preflight does not:

- change `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`;
- reopen broad 4x total-budget escalation;
- treat isolated method-probe success as production success;
- use R00044 inside the confirmation denominator;
- mix other admissible-order profiles into the primary recurrence estimate;
- interpret censored rows as negatives.

## Handoff

Question owner: `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`.

The probe is independent of the main WS2 discriminator selection. It may run in parallel, but failure-response reconnaissance remains the main queue's next selection aid.
