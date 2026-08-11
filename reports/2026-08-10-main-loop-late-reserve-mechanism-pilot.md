# Main-loop late-suffix reserve mechanism pilot (2026-08-10)

## Status / decision / gate

- **Status:** completed deterministic 14-level mechanism pilot; not a promotion A/B.
- **Last evidence:** clean same-commit control/15% treatment pair at
  `f3bf41c7a613b915482bc462b4b1089924c45828`.
- **Decision:** the corrected per-beneficiary reserve activates as intended and recovers one current
  cold solve at the largest frozen arm (15%). Keep the treatment default-off.
- **Gate:** a full-population matched-node A/B is still required before promotion. The pilot cannot
  price regressions, and 1/14 recovery is too small to infer a positive net result.

## Why this pilot was necessary

The first implementation exposed the entire reserve to the selected suffix. That did not actually
guarantee each late configuration room: the first suffix config/gate could consume the slice and
recreate starvation one position later. The corrected implementation divides the reserve into
cumulative config/gate slices while retaining the original order. It also treats a fractional
reserve that rounds to zero as completely inert.

This run tests that corrected mechanism against the census's 14 deterministic DFS/beam matches. It
does **not** use those matches to choose beneficiaries; every level receives the same final-four
policy.

## Matched run

Both arms ran concurrently from clean commit `f3bf41c7a613b915482bc462b4b1089924c45828`, with the
same 14 levels, three workers per arm, legacy scheduling, 36M cumulative node ceiling, 48.24M main
work allocation, and no priming or adaptive baseline budget:

```bash
LEVELS=pos:65,pos:115,pos:231,pos:573,pos:627,pos:819,pos:884,pos:900,pos:1047,pos:1147,pos:1207,pos:1262,pos:1504,pos:1523
COMMON="--corpus=data/stress/stress-levels-random.json --levels=$LEVELS \
  --scheduler-mode=legacy --budget-ms=86400000 --node-budget=36000000 \
  --work-budget=48240000 --workers=3"

# Control
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- $COMMON \
  --out=/tmp/main-loop-reserve-hard14-control-clean.json

# Largest frozen treatment arm
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- $COMMON \
  --enable-flags=STRATEGY_MAIN_LOOP_LATE_RESERVE \
  --main-loop-late-reserve-fraction=0.15 \
  --main-loop-late-reserve-config-count=4 \
  --out=/tmp/main-loop-reserve-hard14-f015-clean.json
```

## Result

| Metric | Control | 15% treatment | Delta |
|---|---:|---:|---:|
| Solved | 0/14 | 1/14 | +1 |
| Nodes expanded | 504,001,640 | 493,213,452 | -10,788,188 |
| Work spent | 497,025,169 | 492,094,122 | -4,931,047 |
| Attempt errors | 0 | 0 | 0 |
| Deadline-truncated levels | 0 | 0 | 0 |
| Reserve-marked attempts | 0 | 56 | +56 |

All four beneficiaries ran on all 14 treatment levels. The sole gain was `R03173`, referee-valid,
through the historically matched `beam:perimeterSweep/perimeterCCW@beam2000` configuration on gate
`131081`. Its winning attempt expanded 122,175 nodes; the control remained unsolved.

The other 13 historically matched levels did not reproduce. This confirms that “deterministic
match” in the old census means a matching historical configuration, not proof that the current
solver revision will reproduce that old witness under a newly allocated slice. Future reporting
must keep that version-drift caveat explicit.

## Interpretation

- The mechanism is real: every intended config/gate beneficiary was activated, and one recovered a
  current cold solve that the matched control missed.
- The measured upside on the mechanism cohort is only 1/14 at the largest planned fraction. This is
  evidence against expecting the old 14-level count to translate directly into gains.
- This pilot has no solved-population control and therefore cannot establish net value. Do not ship
  or enable the flag from this result.
- If the full A/B is pursued, use fresh same-commit controls and describe the 14 levels as
  “historically matched,” not “provably recoverable.”
