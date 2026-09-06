# Solver experiment opportunity and sample sizing

> **Status:** current methodological guardrail for deciding whether a proposed solver experiment population can actually demonstrate its treatment, and how large that population needs to be.
> **Related:** [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md).
> **Tool:** `node scripts/experiment-opportunity-audit.mjs`.

## Core rule

Do not size an experiment from raw row count. Size it from the **opportunity population**: rows on which the treatment can actually change the primary outcome under the tested execution contract.

Examples:

- a rescue treatment normally needs a control failure;
- a late-stage treatment also needs that stage to receive real work, not merely appear in an attempt record;
- a mechanic-specific treatment needs the mechanic/routing condition represented;
- a work-repricing treatment needs the repriced action/stage to participate enough for the allocation difference to exist;
- a retention/ranking treatment needs the relevant beam/search boundary to be reached;
- a transfer test needs both treatment applicability and enough control failures to leave outcome headroom.

Feature eligibility by itself is often too broad. `eligible ∩ control fails ∩ treatment can execute` is a common rescue opportunity definition.

## Before broad compute

For every expensive decision-bearing run, answer these in order:

1. **What exact event can differ?** State the causal opportunity condition before looking at treatment outcomes.
2. **Can existing evidence estimate it?** Prefer current lifecycle, census, provenance, control runs, traces, profiles, or prior sealed control-side evidence.
3. **What fraction of rows are opportunities?** Report numerator and denominator. Treat nominal reach with zero work/nodes as non-participation.
4. **How many opportunity rows are actually needed?** Choose this from the decision: rare-rescue visibility, precision, no-harm coverage, or generalization scope.
5. **What total N buys that many opportunities?** Derive total N from the observed opportunity rate, with uncertainty. Do not choose a round number first and rationalize it later.
6. **What separate safety population is needed?** A benefit-enriched sample and a representative no-harm sample answer different questions. Do not force one population to do both jobs.
7. **What is the escalation rule?** Start with the smallest block that can estimate participation/headroom. Expand only if the observed opportunity count leaves the decision unresolved.

## Cheap control-first pilots

When opportunity frequency is unknown, a small **control-only** pilot is normally cheaper than a large paired A/B. It may measure:

- control solve/failure rate;
- target-stage real participation;
- mechanic/routing applicability;
- censoring/exhaustion;
- empirical work and wall-time scale;
- shard/runtime heterogeneity.

This pilot must not inspect treatment outcomes. It can therefore size a later independent treatment comparison without spending the treatment sample.

For residual-conditioned confirmation, freeze the treatment first, run control on an untouched block, freeze the control-failure/exposure residual, then compare both arms on that residual. State the conditional claim and retain the original-block denominator.

## Ceiling and non-participation warnings

A broad sample is a poor rescue test when control already solves nearly everything. As a default warning threshold, control solve rate above 95% should trigger a deliberate choice among:

- residual conditioning;
- a harder but independently defined source;
- a different outcome such as work/correctness if that is genuinely the claim;
- stopping because the distribution has too little headroom.

Likewise, target-stage real participation below 5% should trigger an exposure pilot or conditioned design before scaling the A/B.

These are warning thresholds, not universal rejection thresholds. A representative no-harm or broad generalization sample can still justify low opportunity density, but the report must say why the extra rows are buying information.

## Sample-size discipline

Prefer reasoning in **informative rows**, not total rows.

If independent control evidence estimates opportunity rate `q`, then a target of `K` opportunity rows has point estimate:

`N ≈ ceil(K / q)`

Use uncertainty in `q`, especially after a small pilot. `experiment-opportunity-audit.mjs` reports a Wilson 95% interval and a conservative total-N estimate using its lower bound.

For rare rescue visibility, if a meaningful treatment would rescue fraction `p` of opportunity rows, the number of opportunity rows needed for probability `d` of seeing at least one rescue is:

`n = ceil(log(1 - d) / log(1 - p))`

This is a value-of-information sizing calculation, not a substitute for a full significance/power analysis when one is actually needed.

## Avoiding needless large samples

A larger N must buy a named kind of information. Valid reasons include:

- enough opportunity cases for the primary effect;
- representative no-harm/regression coverage;
- precision around a small effect or work delta;
- independent-unit coverage such as parent families;
- distributional challenge required by the claim.

“More confidence” without identifying which uncertainty shrinks is not enough.

If proposed N is far larger than the N implied by the opportunity target, split the design: keep the smallest effect-bearing cohort and separately buy only the safety/generalization sample actually required. The opportunity-audit tool warns when proposed N exceeds twice the conservative opportunity-sizing estimate; that warning requires justification, not automatic cancellation.

## Historical failure patterns this prevents

This rule directly blocks several recently observed waste modes:

- a 1,000-level transfer test where control solved 997/1,000, leaving almost no rescue headroom;
- broad late-stage confirmation populations where many rows never reached the stage at all;
- nominal stage attempts that spent zero work because upstream search had exhausted the envelope;
- mechanic/feature eligibility being used as a proxy for control-failure opportunity;
- increasing N after a null without first checking whether the added rows can express the treatment.

## Tool contract

`node scripts/experiment-opportunity-audit.mjs --control=<report>` consumes a control-side `{levels:[...]}` report and supports:

- `--stage=<stageId>` for real work/node participation;
- `--mode=rescue|stage-impact|control-fail`;
- `--target-opportunities=<K>`;
- `--proposed-total=<N>`;
- `--conditional-event-rate=<p>`;
- `--detection-probability=<d>`;
- `--check` to fail on zero observed opportunity;
- `--json` for machine-readable output.

Use independent/control-side evidence only. Once treatment outcomes influence population selection or sizing, that population is development evidence for the resulting design.
