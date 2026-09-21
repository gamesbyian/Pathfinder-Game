# Response-guided execution protocol

> **Status:** active
> **Last evidence:** 2026-09-21 — frozen execution completed in GHA run `35560075075` (artifact `10621363382`): parity/orientation contrasts, both paired-width cohorts, and BC1 Stage-B.
> **Decision:** close the tested richer portal-parity and static orientation explanations; advance non-nested width survivor composition to bounded viability/dominance tracing; advance BC1 to a production-inert safety/economics consumer. No production routing or pruning is authorized.
> **Remaining gate:** downstream consumers now live in canonical workstreams: selected CW/CCW operational traces, bounded exclusive-prefix viability/dominance, and BC1 reference-safety/cost measurement.
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

## D. 2K/5K frontier consumer comparison

Use the exact `leftOnlyIds` from the two frozen prespecified 2K-vs-5K pairs. Run the paired frontier comparison separately for `objectiveFirst` and `intersectionHarvest` at identical profile/checkpoint settings; do not reselect inversion levels after reading any frontier output:

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

## Executed dispositions

- **Portal/parity contrast:** closed in tested form. Raw portal count remains the strongest separator on both frozen plain-vs-mechanic-buckets cohorts; twist/same-parity decomposition and gate-demand parity do not add a stronger stable distinction.
- **Orientation contrast:** closed in tested static form. Perimeter beam tops out at `|d|=0.249`; perimeter DFS at `|d|=0.426`, with different leading descriptors. Move to selected operational traces.
- **Paired 2K/5K frontier:** non-nested survivor regimes confirmed. Objective: 20/29 parents have 2K-only support at a comparable gate, mean Jaccard 0.412. Intersection-harvest: 25/39, mean Jaccard 0.433. This earns retention/dominance/regime explanation only, not width routing.
- **BC1 Stage-B:** strongly positive incidence. 105/263 connectivity-passing states conflict across 22/24 eligible parents (91.7% parent recurrence). This earns a production-inert safety/economics consumer only.
- **Later-outcome overlap:** not measurable from the frozen BC1 frontier because no later disposition labels were captured. Capture prospectively in the earned observer study; do not backfill an outcome join after seeing incidence.

Full interpretation and closure semantics live in the dated nomination and cut/flow reports.

## Stop rules

- If parity/orientation add no stable distinction beyond current coarse descriptors, close that tested representation and return to the contrast.
- If paired frontiers are nearly nested/identical, do not invent width-retention architecture.
- If BC1 parent recurrence is negligible, keep the theorem but do not hot-path it; response value can still be tested separately.
- Any next live consumer requires its own decision-bearing contract and matched-work confirmation.
