# Zero-T1 production calibration

Date: 2026-09-01

## Question

The frozen technique-capability synthesis contains 14 Corpus-2 levels that were solved by the frozen production join even though the isolated T1 census observed no winning technique. This note asks one bounded calibration question:

> What does a later compiled production baseline say about those same 14 rows?

This is cross-revision observational development evidence. It does not identify current-head capability, establish causality, or justify a routing rule.

## Inputs

- Frozen capability artifact: `reports/stress/technique-niches/2026-09-01/level-capability.json`
- Later compiled production baseline: `logs/stress-corpus2-baseline.json`
- Later baseline compile time: 2026-08-25T12:20:51.308Z
- Later baseline production source commit: `fc625d187204a86c94dd18fedf12013906b7863d`
- Later baseline result: 976 / 1,700 Corpus-2 levels solved
- Analyzer: `scripts/analyze-zero-t1-production-calibration.mjs`
- Machine-readable result: `reports/stress/technique-niches/2026-09-01/zero-t1-production-calibration.json`

All 14 frozen production-solved / zero-T1-winner rows are Corpus 2, so the later Corpus-2 baseline covers the complete calibration population.

## Result

Eight of the 14 levels are solved in the later baseline; six are unsolved.

The eight later wins are sharply concentrated:

- 6: `beam:intersectionHarvest@beam5000(diverse)`
- 1: `beam:objectiveFirst@beam5000(diverse)`
- 1: `dfs:repair:repair`

Their winning stages are:

- 4: `dedup-near-tie-retry`
- 2: `connectivity-axis-exhausted-retry`
- 1: `main-loop`
- 1: `repair-probe`

Seven of eight later wins are therefore diverse 5K beams, and six of those seven beam wins occur in retry stages rather than the main loop.

The seven beam wins expand only 232,396 to 571,573 nodes. The repair win expands 1,791,510 nodes. Those counts are far below the frozen T1 50M-node ceiling.

## Interpretation

This calibration strengthens the semantic warning already attached to the capability map.

The frozen label "production solved, no frozen T1 winner" is not a stable capability class. Six of the 14 frozen production solves disappear in the later production baseline, while eight remain solved. Conversely, seven of the eight later solves are attributed to beam configurations whose later winning runs are shallow relative to the T1 ceiling.

That pattern rules out a simple explanation in which T1 merely failed because those techniques needed more raw node budget. The evidence instead points to some mixture of revision drift, attempt/context semantics, retry-stage conditions, solver-state differences, eligibility/flag differences, or other behavior that is not captured by a coarse cross-revision attempt-config identity.

The result is especially useful as a warning against treating normalized action names as proof of behavioral equivalence across revisions. The same textual configuration identity can participate in materially different solver behavior as surrounding orchestration and implementation change.

The result does **not** show that retry stages themselves create capability, that diverse 5K beams should be routed to these levels, or that the six later-unsolved rows regressed for one common reason. The population was selected precisely because it was anomalous, and every comparison crosses revisions.

## Decision

Preserve this calibration as a compact semantic/provenance check. Do not open a new workstream and do not change queue priority.

For Workstreams 1 and 2, continue to require current-revision evidence for decision-bearing scheduler or action-selection claims. Frozen census rows remain useful development evidence, but "no frozen T1 winner" must stay distinct from "no current technique" and from "current production cannot solve."

No further dedicated sweep is earned by these 14 rows. A future investigation should revisit them only if a current-head experiment needs to distinguish configuration identity from surrounding stage/context semantics.
