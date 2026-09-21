# Response-guided execution protocol

> **Status:** active
> **Last evidence:** 2026-09-21 — execution contract frozen; parity/orientation cohorts, paired-width consumer oracle, and BC1 Stage-B screen are specified but not yet dispositioned here.
> **Decision:** use one frozen development contrast population for parity/orientation, explicit frozen inversion IDs for paired-width, and parent-level recurrence for BC1; none of these development analyses authorize production routing or pruning.
> **Remaining gate:** execute the frozen development screens, record their dated dispositions, and advance only the smallest consumer earned by those results.
> **Question family:** response-guided capability invention + `WS2-CUT-BALANCE-PROJECTION`.
> **Evidence role:** development.
> **Selection rule:** freeze cohorts before reading parity/orientation outputs; preserve parent identity for BC1 incidence.

## A. Freeze technique-discordance cohorts once

Source:
`reports/stress/technique-niches/2026-09-03/level-capability.json`

Command:

`npm run research:freeze-response-guided-contrasts -- --base=reports/stress/technique-niches/2026-09-03/level-capability.json --out=tmp/response-guided-contrast-population.json`

The frozen artifact records the source SHA-256 and exact left-only/right-only/both identities for the prespecified pairs.

Do not regenerate cohorts separately inside parity and orientation analysis.

## B. Parity/portal contrast

`npm run research:response-guided-parity -- --cohorts=tmp/response-guided-contrast-population.json --out=tmp/response-guided-parity-contrast.json`

Interpretation:
- compare twist/same-parity portal structure and gate twist-demand against the old portal-count baseline;
- use only to nominate a Stage-0 premise;
- do not route on cohort membership or mined thresholds.

## C. Orientation contrast

`npm run research:response-guided-orientation -- --cohorts=tmp/response-guided-contrast-population.json --out=tmp/response-guided-orientation-contrast.json`

Interpretation:
- signed side balances/moments are transformation-aware development descriptors;
- reflection metamorphic tests guard the declared transform law;
- a positive association nominates geometry/topology premises or selected traces, not a direction router.

## D. 2K/5K frontier consumer oracle

Use the exact `leftOnlyIds` from the two frozen prespecified 2K-vs-5K pairs. Run the paired frontier oracle separately for `objectiveFirst` and `intersectionHarvest` at identical profile/checkpoint settings; do not reselect inversion levels after reading any frontier output:

`npm run research:paired-beam-width-frontier -- --corpora=data/levels.json,data/stress/stress-levels.json,data/stress/stress-levels-random.json --levels=<frozen leftOnlyIds for that width pair> --profile=<objectiveFirst|intersectionHarvest> --widths=2000,5000 --depth-fraction=0.2 --out=<pair-specific output>`

Read first:
- containment in either direction;
- Jaccard overlap;
- examples of narrower-only/wider-only exact prefixes.

Do not infer feasibility or dominance from frontier membership alone.

## E. BC1 bridge-excursion incidence

Use the exact preregistered Stage-B development screen from the Stage-0 audit:

- parent source: `data/stress/stress-levels-random.json`;
- selection: uniform deterministic sample of **24 parents**;
- seed: `ws2-cut-balance-bc1-stageb-v1`;
- independent unit: parent level;
- frontier profile: `intersectionHarvest`;
- width: 5000;
- depth fraction: 0.20;
- picks: 12 distinct frontier states per sampled parent;
- BC1 denominator: only sampled states where existing connectivity/volume passes.

Reproduction:

```bash
npm run stress:select-random-sample -- \
  --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
  --sample=24 --seed=ws2-cut-balance-bc1-stageb-v1 \
  --out=tmp/bc1-stageb-parents.json

BC1_IDS=$(node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('tmp/bc1-stageb-parents.json'));process.stdout.write(r.map(x=>x.levelId).join(','))")

node scripts/run-bundled.mjs scripts/stress/production-search-frontier-sampler.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="$BC1_IDS" \
  --depth-fraction=0.20 --picks=12 --seed=ws2-cut-balance-bc1-stageb-v1 \
  --profile=intersectionHarvest --width=5000 \
  --question=WS2-CUT-BALANCE-PROJECTION --evidence-role=development \
  --population-out=tmp/bc1-stageb-frontier.json

npm run research:cut-bridge-incidence -- \
  --population=tmp/bc1-stageb-frontier.json \
  --corpus=data/stress/stress-levels-random.json \
  --out=tmp/bc1-stageb-incidence.json
```

Report sampled rows/parents, connectivity-passing rows/parents, conflict rows/parents, and conflict-parent recurrence. Zero or near-zero parent recurrence closes BC1 as a near-term prune candidate on this population; material recurrence earns a larger development incidence pass before any observer.

## Stop rules

- If parity/orientation add no stable distinction beyond current coarse descriptors, close that tested representation and return to the contrast.
- If paired frontiers are nearly nested/identical, do not invent width-retention architecture.
- If BC1 parent recurrence is negligible, keep the theorem but do not hot-path it; response value can still be tested separately.
- Any next live consumer requires its own decision-bearing contract and matched-work confirmation.
