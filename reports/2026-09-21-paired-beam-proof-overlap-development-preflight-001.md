# Paired beam-width proof-overlap development preflight 001

> **Status:** FROZEN BEFORE EXECUTION.
> **Date:** 2026-09-21.
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Multi-query authority:** [multi-query preflight 001](2026-09-21-computational-work-elimination-multi-query-preflight-001.md).
> **Evidence role:** selected development mechanism test; not prevalence or production efficacy.

## Question

When 2K and 5K isolated beam searches materially differ in a previously observed response measure, do they nevertheless derive many of the same exact portal-free connectivity cut proofs before the selected checkpoint?

This asks whether a proof object can be a useful reusable computation unit even when path support diverges.

## Historical selection source

Selection uses only the already-retained Card-E sizing artifacts:

- `reports/stress/card-e-sizing-beam-width2000-001.json`;
- `reports/stress/card-e-sizing-beam-width5000-001.json`.

Both use solver ref:

`65f790db5d3cfaa83fd84b0881eb9b4b2a9f5414`

The two artifacts share 156 parent IDs.

For each shared parent:

`abs(normalizedLastSupportDepth_5K - normalizedLastSupportDepth_2K)`

was computed from the historical known-solution-prefix survival records.

The development cohort is the **top 8 parents by that absolute historical response delta**, tie-broken by level ID. No successor-audit proof-overlap result was inspected before this selection.

## Frozen parents

| rank | parent | 2K normalized last support | 5K normalized last support | absolute delta | raw depth 2K -> 5K |
|---:|---|---:|---:|---:|---:|
| 1 | R01516 | 0.147826 | 0.443478 | 0.295652 | 17 -> 51 |
| 2 | R02437 | 0.237705 | 0.409836 | 0.172131 | 29 -> 50 |
| 3 | R02074 | 0.139535 | 0.302326 | 0.162791 | 18 -> 39 |
| 4 | R01179 | 0.222222 | 0.370370 | 0.148148 | 18 -> 30 |
| 5 | R02448 | 0.144737 | 0.263158 | 0.118421 | 11 -> 20 |
| 6 | R03030 | 0.131579 | 0.236842 | 0.105263 | 15 -> 27 |
| 7 | R01718 | 0.141026 | 0.230769 | 0.089744 | 11 -> 18 |
| 8 | R00537 | 0.139785 | 0.215054 | 0.075269 | 13 -> 20 |

All eight historical final-support-loss causes were `score-width-culled`.

This is intentionally an enriched mechanism cohort. It cannot estimate proof-overlap prevalence in Corpus 2.

## Fresh execution contract

Run current branch/head code, not the historical solver revision.

Tool:

`scripts/stress/compare-paired-beam-width-frontiers.mjs`

Frozen arguments:

- corpus: `data/stress/stress-levels-random.json`;
- parents: the eight IDs above, in rank order;
- profile: `default`;
- widths: `2000,5000`;
- depth fraction: `0.2`;
- wall safety: `600000 ms`;
- proof projection: `connectivity-cut`;
- every gate in each current normalized level is evaluated by the current tool;
- searches remain isolated; no state/proof is actually shared.

Command:

```bash
node scripts/run-bundled.mjs scripts/stress/compare-paired-beam-width-frontiers.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels=R01516,R02437,R02074,R01179,R02448,R03030,R01718,R00537 \
  --profile=default \
  --widths=2000,5000 \
  --depth-fraction=0.2 \
  --budget-ms=600000 \
  --reason-overlap=connectivity-cut \
  --out=reports/stress/computational-work-elimination-paired-beam-proof-overlap-001.json
```

## Primary observables

For each gate where both searches reach the same checkpoint:

- exact frontier-prefix Jaccard;
- exact prefix counts unique/shared;
- exact connectivity-cut proof identities derived by each width;
- shared cut-proof identities;
- cut-proof Jaccard;
- proof retention drops;
- work spent by each isolated width.

Proof identities are counted even when bounded runtime retention drops a certificate. Runtime retention economics and observed proof-derivation denominator remain separate.

## Interpretation matrix

### Low prefix overlap + low proof overlap

The tested proof family does not expose a useful shared-computation reservoir below path identity for this width-divergent workload.

### Low prefix overlap + high proof overlap

Strong nomination evidence that independent searches are repurchasing the same exact implication despite divergent paths.

This still does **not** earn shared execution. Next gate is derivation/lookup economics and a smallest typed handoff.

### High prefix overlap + high proof overlap

The proof may add little architectural information beyond shared search ancestry.

### Any proof overlap with trivial proof cost

Structural recurrence only. Do not optimize it.

## Guardrails

- Same proof signature means same reached-component + complete cardinal-boundary implication template, not equivalent residual states.
- A stored cut proof still requires current boundary validation before it applies to a later state.
- Historical known-solution-prefix response was used for selection only; it is not current-head efficacy evidence.
- This cohort is selected development evidence.
- Do not infer a cache key, routing rule, or production benefit from Jaccard overlap.
- If the observer prevents a search from reaching the checkpoint under the generous wall safety, classify that gate as non-comparable / measurement-reactive rather than filling in an overlap value.

## Advance condition

A shared-computation experiment is considered only if multiple independent parents show:

1. substantial exact proof overlap despite materially lower exact-prefix overlap;
2. non-trivial proof derivation volume/work;
3. no semantic ambiguity in proof identity;
4. a plausible consumer that can validate/reuse the proof more cheaply than recomputation.

Otherwise close connectivity-cut proof sharing for this multi-query form without generalizing the negative to BC1 or other proof families.
