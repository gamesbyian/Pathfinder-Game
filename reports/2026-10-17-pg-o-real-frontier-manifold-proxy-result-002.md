# PG-O real-frontier partial-to-solution-manifold proxy result 002

> **Status:** concluded-negative
> **Last evidence:** 2026-10-17 — completed source-checked [Actions run 39089743702](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39089743702), exact source `2c77722da3462c88ca0c38f455df2dbfa8ec9d41`, all 50 frozen real-beam partials joined, zero identity/referee errors.
> **Decision:** the stored-accepted-path **same-depth geometric proximity** formulation is not a compelling discriminator of exact LIVE versus DEAD real-search prefixes on the selected two-parent cohort. Of the two exact-LIVE R03147 prefixes, one is distant from every matched accepted prefix (**Jaccard 0.9565**) and the other reaches **0.8000**; within-parent pairwise LIVE-vs-DEAD ordering is only **0.620** for nearest Jaccard and aligned positional mismatch, **0.641** for common-prefix length. No hint-informed ranking, LNS implementation or cold treatment is earned.
> **Remaining gate:** seek a **different**, genuinely hint-free current-state candidate shaping or local repairability consequence using real search partials, with enough independent parents for generalization. Do not repeat Stage-2 naive constructors or represent this retrospective hint-distance proxy as a production feature.
> **Research question:** `WS2-G1-COMPLETE-PATH-LNS`
> **Evidence role:** discovery
> **Population identity:** 50 frozen 11-move real-beam frontier prefixes: 25 R01600 (0 LIVE) and 25 R03147 (2 LIVE), 2 independent Corpus-2 parents; source run 39089743702.
> **Selection:** all 50 formerly frozen frontier draws from 2 source parents, `intersectionHarvest` beam width 5,000 at depth fraction 0.1; exact fates were determined earlier by CP-SAT, not inspected to select shapes or historical hints.
> **Inference scope:** offline *same-gate, same-depth, reference-hint-assisted* descriptive geometric closeness on two preselected parent puzzles; not LNS viability, performance, independent generalization or a cold candidate policy.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-17","decision":"Accepted-hint same-depth prefix proximity does not cleanly separate exact LIVE versus DEAD in the frozen two-parent real-beam pilot; observed paired within-R03147 ordering only 0.620 Jaccard/position and 0.641 common-prefix across 46 LIVE-DEAD pairs, with one LIVE Jaccard distance 0.9565.","remainingGate":"Find a materially different hint-free current-state partial-to-relaxed-candidate or repairability mechanism with independent-parent opportunity before any LNS implementation; never use reference paths or labels in cold decisions.","joins":{"researchQuestion":"WS2-G1-COMPLETE-PATH-LNS","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"50 frozen 11-move real-beam frontier prefixes: 25 R01600 (0 LIVE) and 25 R03147 (2 LIVE), 2 independent Corpus-2 parents; source run 39089743702.","selection":"Frozen independent CP-SAT labelled 50-case real-beam pilot; two independent parent boards with 25 siblings each; current-reference hints selected hash-first, never by fate.","inferenceScope":"retrospective offline hint-prefix similarity descriptive screen, not a hint-free runtime policy or independent-parent confirmation"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-o-real-frontier-manifold-proxy-20261017-001.json","scripts/stress/pg-o-real-frontier-manifold-proxy.mjs"],"successors":{"questions":["WS2-G1-COMPLETE-PATH-LNS"],"artifacts":[]},"prospective":{"expectation":"Real beam-produced prefixes should be close enough to accepted-solution prefixes that future-LIVE partials look meaningfully closer than DEAD siblings.","surprise":"Both exact-LIVE R03147 prefixes are substantially unlike every stored accepted prefix; one has minimum equal-depth Jaccard 0.9565, and across 46 LIVE/DEAD comparisons ordering is only 0.620/0.641.","anomaly":null}} -->

## Original blocker genuinely bypassed

[PG-O Stage 1](2026-09-17-lane-g-complete-path-lns-falsifier-result-001.md) measured a median whole-solution Jaccard distance of **0.111** across 2,235 pairs of accepted paths. The three original Stage-2 naive constructors were incapable of reliably producing a fair full-length candidate. They therefore never answered whether a plausible *real search-produced* incomplete route was near that accepted-solution manifold.

The bounded successor selected no new levels and executed no solver search: it reused all **50 already-frozen prefixes** from [production multi-pick](stress/class5-production-search-frontier-multi-pick-population-2026-09-17.json), and the independent CP-SAT exact fate labels in [this original source](stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json). Both puzzles furnished 25 genuine width-5,000 `intersectionHarvest` frontier nodes at depth 11, with R03147 contributing exactly **two** CP-SAT LIVE and 23 DEAD siblings. This is a selected development pair, not a broad representative population.

For each parent, the official Hint[] decoder produced historical accepted paths. The readout sorted path hashes, deduplicated, and revalidated every selected path using the current native PLAY referee, keeping **15 accepted hints for R01600** and **nine for R03147**. No hint was selected using the frozen prefix's fate. The original packed frontier path and each independent raw-XY oracle case had to match byte-for-byte before scoring.

A partial was compared only with the **12-node prefix of a same-gate, sufficiently long accepted path**, avoiding the earlier mistake of comparing 12 steps with an entire 60–128-step solution. All 50 partials had usable matching accepted prefixes. The three preregistered offline features were Jaccard distance over the two visited-cell sets, aligned index mismatch fraction and exact common-prefix length; features were frozen **before** labels were joined.

## Exact observed results

| Real frontier cohort | CP-SAT LIVE / DEAD | Median minimum same-depth Jaccard | Median minimum aligned mismatch | Median maximum common prefix |
|---|---:|---:|---:|---:|
| R01600 | **0 / 25** | 0.800 | 0.917 | 1 cell |
| R03147 DEAD | **0 / 23** | 0.955 | 0.917 | 1 cell |
| R03147 LIVE | **2 / 0** | 0.957 (two values: **0.800**, **0.957**) | 0.917 (0.750, 0.917) | 3 cells (values 1, 3) |

The two referee-verified R03147 LIVE frontier states were:
- `R03147:multi-pick-112`: min Jaccard **0.8000**, min positional mismatch **0.7500**, longest exact initial run **3** cells;
- `R03147:multi-pick-262`: min Jaccard **0.9565217**, min positional mismatch **0.9166667**, longest exact initial run **1** cell.

For the only available within-parent fate contrast, the two LIVE versus 23 DEAD partials yield **46 pairwise comparisons**, not 46 independent parent observations:

| Lower/greater is closer to a presumed viable prefix | Retrospective pairwise ordering |
|---|---:|
| Lower minimum prefix Jaccard | **0.619565** |
| Lower minimum position mismatch | **0.619565** |
| Greater longest shared initial prefix | **0.641304** |

The second exact-LIVE partial is nearly as unlike its historical accepted-prefix references as the most distant DEAD siblings. Conversely R01600's 25 DEAD partials appear much closer to their own hint-prefix manifold than most R03147 partials. **Do not** compare ranks across those different parent puzzles to claim discrimination, since hint/manifold geometry is level-specific.

Thus genuine successful partials can be geometrically remote from stored accepted solutions even when accepted full solutions themselves cluster tightly. This is a concrete reason the naive "solution family resemblance" route does not automatically imply a useful local-surgery policy.

## Validity and next decision

This is **not** a causal trial of LNS, nor an exact result on whether a partial could be locally repaired. Historical accepted solutions are retrospective ground truth, not solve-local current-input facts. The selected cohort has just **two parent levels**, and all two LIVE partials come from **one parent**. Labels are rigorous, but the observed pairwise rank statistic is a development descriptor, not population-level predictor validation or an excuse to add a hint-informed heuristic.

The original complete-solution clustering result remains valid. What this experiment closes is the **same-gate, same-depth, hint-prefix geometric-proximity discriminator** on this source population, as uneconomical motivation for a runtime method. Full LNS and broad candidate construction remain unearned.

A further useful PG-O attempt must formulate a **different cheap current-state relaxation or near-complete candidate construction**, based on actual search partials, that predicts local repairability or returns referee-accepted paths without consulting historical hints. Demand a bounded independent-parent opportunity survey before adding any LNS machinery or matched-work A/B. If no credible constructor emerges, close PG-O's implementation line while keeping the solution-manifold finding as historical characterization.

## Immutable evidence and reproducibility

- Source/run: [39089743702](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39089743702), source `2c77722da3462c88ca0c38f455df2dbfa8ec9d41`; **successful** read-only observer and self-tests.
- Original Action artifact: `12122810112` `pg-o-real-frontier-manifold-proxy-20261017`, ZIP digest `sha256:116624af7e87daea1d2991dd8ba36284e670b124bedc264a3902b16bafe82142`.
- JSON itself SHA-256 `657ee2ab2ce4ae07ddb7a5a98e7be6c82e8776861d72faeb0928088ac59b0113`; complete 50-case verdict copied unchanged to [machine report](stress/pg-o-real-frontier-manifold-proxy-20261017-001.json).
- Fixed input hashes and exact frontiers/case identities are in the machine verdict; published source `d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb` is the corpus SHA-256.
- Re-run using the normal bundled entrypoint: `node scripts/run-bundled.mjs scripts/stress/pg-o-real-frontier-manifold-proxy.mjs -- --self-test`, then `--out=tmp/pg-o/proxy.json`. This reproduces geometry; exact run SHA/input hashes remain the authority for the frozen result.

No production changes, no new cold solves and no downstream oracle spend are claimed.
