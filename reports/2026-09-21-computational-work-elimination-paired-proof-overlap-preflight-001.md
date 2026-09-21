# Computational work elimination: paired beam proof-overlap execution preflight 001

> **Status:** superseded / concluded-without-execution
> **Last evidence:** 2026-09-21 — original response-guided GHA artifact recovered the exact frozen 29-parent objective-first and 39-parent intersection-harvest 2K-only cohorts.
> **Decision:** do not execute this connectivity-cut overlap study; later W1 dominated-work evidence made the result non-decision-bearing. See [paired proof-overlap disposition 002](2026-09-21-computational-work-elimination-paired-proof-overlap-disposition-002.md).
> **Remaining gate:** reopen W2 only for a proof family that first clears soundness, recurrence and removable-work economics under its own canonical owner.
> **Evidence role:** development.
> **Parent:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **W2 preflight:** [multi-query divergence preflight 001](2026-09-21-computational-work-elimination-multi-query-preflight-001.md).
> **Source contrast report:** [response-guided premise nominations 001](2026-09-21-response-guided-premise-nominations-001.md).
> **Frozen source artifact:** GHA run `35560075075`, artifact `10621363382` (`response-guided-hardening-evidence`), digest `sha256:4c1b843d17651a413c80bc0623ce7e5d257f5665e853073eb84cb9ef154a9a17`.
> **Artifact execution SHA:** `95022500618dd9275882506241e0bea089c6bb0a`.

## Question

The original paired-width oracle established materially non-nested exact frontier-prefix support at a matched 20% phase checkpoint.

The successor question is smaller:

> **When 2K and 5K beams retain different exact prefixes, do they nevertheless derive the same exact portal-free connectivity cut proofs?**

This tests whether an implication-level proof object is a reusable computational unit below path-prefix identity.

It does **not** test shared execution, caching, routing, dominance, or solve efficacy.

## Frozen populations

These are the exact `leftOnlyIds` files from the original response-guided artifact. They were selected from technique outcomes before the original frontier analysis and are not reselected for connectivity behavior.

### Objective-first 2K-only cohort

29 parents:

`P00050,P00083,P00125,R00314,R00548,R00729,R00852,R00927,R02002,R02006,R02229,R02256,R02355,R02382,R02435,R02491,R02563,R02719,R02731,R02796,R02812,R02824,R02836,R02913,R02917,R03249,R03286,S00030,S00103`

Original matched frontier result:

- 29 parents / 32 comparable gates;
- 12/32 gates had 2K frontier contained in 5K;
- 20/29 parents had 2K-only support;
- mean exact-prefix Jaccard: **0.412**.

### Intersection-harvest 2K-only cohort

39 parents:

`P00042,P00101,R00347,R00977,R01118,R01511,R01889,R02020,R02158,R02406,R02440,R02447,R02517,R02540,R02563,R02626,R02667,R02684,R02716,R02727,R02778,R02796,R02808,R02901,R02929,R02933,R03048,R03146,R03179,R03187,R03210,R03217,R03236,R03293,R03312,R03317,R03362,R03369,S00103`

Original matched frontier result:

- 39 parents / 42 comparable gates;
- 17/42 gates had 2K frontier contained in 5K;
- 25/39 parents had 2K-only support;
- mean exact-prefix Jaccard: **0.433**.

## Execution contract

Use the existing paired tool unchanged except for its new opt-in proof-overlap observer:

```bash
npm run research:paired-beam-width-frontier -- \
  --corpora=data/levels.json,data/stress/stress-levels.json,data/stress/stress-levels-random.json \
  --levels=<frozen cohort ids> \
  --profile=<objectiveFirst|intersectionHarvest> \
  --widths=2000,5000 \
  --depth-fraction=0.2 \
  --reason-overlap=connectivity-cut \
  --out=<cohort output>
```

The two beams remain isolated.

The observer records exact normalized cut-proof identities only. It never shares a proof between arms and never changes pruning.

## Required outputs

For each comparable gate retain both:

1. existing exact frontier-prefix overlap:
   - left/right/shared;
   - containment;
   - Jaccard;
2. exact connectivity-cut proof overlap:
   - left/right/shared proof signatures;
   - containment;
   - Jaccard;
   - bounded examples.

Also report parent/gate support:

- gates where either arm derives at least one cut proof;
- gates with at least one shared cut proof;
- parents with any shared cut proof;
- proof overlap conditional on both arms deriving at least one proof.

Do not average zero/undefined proof opportunity into a claim about overlap.

## Interpretation matrix

### A. Prefix overlap low/moderate, proof overlap substantial

This is the strongest positive result.

It means materially different retained search paths repeatedly rediscover the same exact structural implications. That earns a **specific cross-query proof-reuse opportunity** for further economics sizing, not a generic shared-search runtime.

### B. Prefix and proof overlap both substantial

The proof may mostly ride ordinary path overlap. Report it, but this is weaker evidence for a distinct reusable unit.

### C. Prefix overlap non-nested, proof overlap negligible

Close connectivity-cut sharing as the first multi-query reusable-reasoning case. The proof remains useful solve-locally if its own economics survive.

### D. Little proof opportunity in either arm

This population cannot answer the cut-proof overlap question. Treat as an observability result, not a negative on multi-query reasoning generally.

## Stop / advance gates

Advance only if multiple independent parents show shared exact proof identities and the shared proofs represent non-trivial derivation or downstream work.

Do not build a multi-query cache from signature Jaccard alone.

A negative result blocks generic shared-search architecture from using connectivity-cut proofs as its evidence. Reopen W2 for another proof family only when that family independently shows real solve-local recurrence/economics.

## Selection and contamination boundary

Historical 2K-only cohort membership is offline development selection.

It must never become production routing or solver input.

The proof-overlap observer derives every certificate from the current isolated search state and level only. No prior solution or cohort outcome enters search.
