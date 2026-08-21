# Symmetry semantic-equivariance prefix pilot

> **Status:** inconclusive  
> **Scope:** two transformed winning witnesses from one independently generated cliff family  
> **Date:** 2026-08-11

## Implementation

`family-pair-divergence.mjs` now replays corresponding parent/variant prefixes through authoritative
solver state and canonical `transformPoint`. At every prefix it compares mapped legal candidates,
mechanic masks/substate, goal/must-pass/must-cross lower bounds, per-child prune-gauntlet verdicts,
and neutral length/intersection/portal facts. Output is machine-readable under
`semanticEquivariance`. Directional template fields are annotations through the shared comparator,
not semantic failures.

The testing API exposes the existing prune gauntlet, real-length calculation, and lower-bound
primitives solely so this diagnostic reuses production semantics rather than duplicating them.

## Pilot

```text
node scripts/run-bundled.mjs scripts/stress/family-pair-divergence.mjs -- \
  --parent-levels=data/stress/stress-levels-random.json \
  --variant-levels=data/families/phaseB/R02248-symmetry.json \
  --manifest=data/families/phaseB/R02248-symmetry-manifest.json \
  --variant-id=F02248-sym-02 \
  --result=reports/families/2026-07-15-R02248-symmetry-family-solve.json \
  --profile=repair --out=reports/stress/symmetry-divergence-R02248-02.json
```

The analogous command used `F02248-sym-01` and `--profile=intersectionHarvest`. The stored family
run has four solved and three unsolved symmetry siblings, so it is an established solve-status cliff
family rather than a synthetic transform.

Both 101-step mapped witnesses were canonical-referee-valid in parent and variant coordinates. Across
202 corresponding prefixes there were zero semantic mismatches. The first meaningful deterministic
ranking divergence occurred at step 7 for the beam/profile witness and step 81 for the repair-profile
witness, each with equal candidate-set cardinality. Therefore these two cases rule out a semantic
equivariance violation along the observed winning trajectories and localize the earliest observed
difference to ordering/ranking rather than legality or hard pruning.

## Classification and limits

The beam/profile case is provisionally taxonomy C/E (deterministic tie/order or later retention), and
the repair-profile case is provisionally C/D (ordering interaction or stochastic trajectory). The
current trace does not yet record component-exact score equality at the divergent move, so neither is
claimed as a proven equal-score tie. Coordinate-normalized repair streams are implemented and unit tested. The bounded matched-seed control below localizes a survivor-order interaction, while a historical-budget solve-status verdict remains pending.

No correctness alarm was found. A bounded next run should add component scores at the two localized
steps and directly replay the repair siblings under one explicit research seed and matched canonical
node budget. Do not infer a production directional policy from these two witnesses.

## Matched repair-stream control

```text
npm run solver:symmetry-repair-seed-pilot -- --node-budget=100000 --record-limit=2000 \
  --out=reports/stress/symmetry-repair-seed-pilot-R02248-02.json
```

The parent and historically repair-solved rotation sibling received the same explicit research seed
for both independent streams. Both exhausted the matched 100,000-node budget unsolved, so this smaller
run does not reproduce or decide the historical 60-second solve-status cliff. It does validate the
mechanism control: survivor sets were equal but their directional order differed at choice 0. At
choice 14 the same exploratory draws (`0.305045...`, `0.772419...`) selected different mapped abstract
moves solely because the equal survivor set was ordered differently. Different draw consumption first
appeared at choice 15.

Thus coordinate-independent seeds do not by themselves create symmetry-equivalent repair trajectories:
they control stochastic values, while production survivor ordering remains a separate deterministic
symmetry breaker. This directly supports taxonomy C→D interaction for this witness. Production order
was not changed.
