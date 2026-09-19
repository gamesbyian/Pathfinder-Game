# Admissible-order reserve starvation: zero-compute retained-asset audit

> **Status:** concluded-evidence-gap / prospective measurement required.
> **Date:** 2026-09-19.
> **Question:** Can existing committed technique-census assets size the R00044-style within-total-budget fallback starvation premise without new solver compute?
> **Evidence role:** asset audit / acquisition gate; no solver efficacy claim.

## Retained assets checked

The two committed technique-census generations are:

| run | rows | isolated full node cap |
|---|---:|---:|
| `reports/stress/technique-census/32240161854` | 78,505 cells | 50,000,000 |
| `reports/stress/technique-census/33717910218` | 78,505 cells | 50,000,000 |

Both run summaries explicitly state that the full isolated-technique budget is 50M nodes.

The R00044 microscope established an `admissible-order-fallback` solving cost of **219,802,423** nodes. A 50M isolated cap cannot observe a find in that range and therefore cannot reconstruct the reserve-sizing curve needed to ask whether R00044-style starvation recurs at useful frequency.

No additional committed technique-census generation exists under `reports/stress/technique-census/`.

## Decision

The zero/new-compute path is exhausted for this question. Existing census data can establish lower-cost admissible-order capability, but it cannot size the high-cost tail that matters to the 25% reserve calibration.

Do not infer rarity from the absence of >50M finds in a dataset that censors every action at 50M.

## Next evidence gate

A prospective, precommitted **isolated admissible-order fallback cost sample** is required before any reserve-fraction A/B.

The acquisition should:

- use the current residual boundary rather than the historical population that originally tuned the 0.25 reserve;
- run only the implicated action/configuration needed to estimate its find-cost distribution;
- use a cap high enough to observe the R00044 range (at least 300M nodes is the natural first ceiling because it spans the current total-budget question);
- preserve standard compact failure response, exact action identity, allocated ceiling, work/nodes, censoring, and protocol identity;
- freeze population/sample and cap before outcomes are inspected;
- size the population before escalating to the full 390/531-row residual if a smaller control-only sample can establish whether the opportunity rate is negligible or non-trivial.

Only if recurrent finds fall above the current 75M reserve while still below the fixed 300M total-budget envelope should `admissibleOrderNodeReserveFractionOverride` advance to a matched-total-work A/B.

## Non-claims

This audit does not show that a larger reserve is good, that R00044 is common, or that the fallback should receive 300M in production. It only proves that the retained 50M censuses cannot answer the newly nominated high-cost-tail question.
