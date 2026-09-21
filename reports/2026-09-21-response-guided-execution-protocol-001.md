# Response-guided execution protocol

> **Status:** executable development protocol; no production behavior authorized.
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

Use only the explicit development identities already nominated by the frozen relative-advantage contrast. Run the paired frontier oracle at identical profile/checkpoint settings:

`npm run research:paired-beam-width-frontier -- --corpus=data/stress/stress-levels-random.json --levels=<explicit frozen 2K-only/5K-only development ids> --profile=objectiveFirst --widths=2000,5000 --depth-fraction=0.2 --out=tmp/paired-width-frontier.json`

Read first:
- containment in either direction;
- Jaccard overlap;
- examples of narrower-only/wider-only exact prefixes.

Do not infer feasibility or dominance from frontier membership alone.

## E. BC1 bridge-excursion incidence

Construct/freeze a development production-frontier sample first using the existing sampler, preserving parent identity and question:

`node scripts/run-bundled.mjs scripts/stress/production-search-frontier-sampler.mjs -- --corpus=data/stress/stress-levels-random.json --levels=<prespecified development parents> --depth-fraction=0.1 --picks=25 --seed=ws2-cut-balance-bc1-v1 --profile=intersectionHarvest --width=5000 --question=WS2-CUT-BALANCE-PROJECTION --evidence-role=development --population-out=tmp/ws2-bc1-frontier-population.json`

Then:

`npm run research:cut-bridge-incidence -- --population=tmp/ws2-bc1-frontier-population.json --corpus=data/stress/stress-levels-random.json --out=tmp/ws2-bc1-incidence.json`

Primary denominator:
- states where existing connectivity/volume passes.

Primary recurrence unit:
- parent level, not frontier row.

Only non-trivial parent-level recurrence earns a production-inert observer.

## Stop rules

- If parity/orientation add no stable distinction beyond current coarse descriptors, close that tested representation and return to the contrast.
- If paired frontiers are nearly nested/identical, do not invent width-retention architecture.
- If BC1 parent recurrence is negligible, keep the theorem but do not hot-path it; response value can still be tested separately.
- Any next live consumer requires its own decision-bearing contract and matched-work confirmation.
