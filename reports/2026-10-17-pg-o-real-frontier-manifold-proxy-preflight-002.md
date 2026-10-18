# PG-O Stage-2 real-beam partial-to-solution-manifold proxy preflight 002

> **Status:** concluded-negative
> **Last evidence:** 2026-10-17 — [source-exact completed run 39089743702](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39089743702), all 50 cases with valid hints and exact outcomes.
> **Decision:** the tested historical-hint same-depth geometric proximity is not informative enough among the two independent real-beam parents to justify a runtime LNS discriminator; full machine evidence and outcome are preserved in [PG-O 002](2026-10-17-pg-o-real-frontier-manifold-proxy-result-002.md).
> **Remaining gate:** a different **hint-free current-state partial-to-relaxed-candidate and local-repairability** mechanism, with independent-parent opportunity; no LNS implementation authorized.
> **Question:** do genuinely beam-produced unfinished Pathfinder routes lie geometrically near the *same-depth prefix manifold* of accepted solutions, and is that resemblance informative about exact future completion?
> **Research question:** `WS2-G1-COMPLETE-PATH-LNS`
> **Evidence role:** development/cheapest falsifier; **zero production solver changes**.

## Why this is the next cheapest test

[Stage 1](2026-09-17-lane-g-complete-path-lns-falsifier-result-001.md) found median whole-solution visited-cell Jaccard distance of 0.111 on 2,235 accepted-path pairs, but Stage 2's naive whole-path candidate constructors either returned much shorter paths or dead-ended. Those failures did **not** show that current beam-search partials were geometrically distant from solutions.

The subsequently archived [real beam multi-pick population](stress/class5-production-search-frontier-multi-pick-population-2026-09-17.json) and independently [CP-SAT-labelled cases](stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json) remove the constructor blocker cheaply. The population is already frozen: 25 distinct width-5,000 `intersectionHarvest` frontier paths at 10% depth for each of **R01600** and **R03147**, all at 11 raw moves, with exact labels **0 LIVE/25 DEAD** and **2 LIVE/23 DEAD** respectively. No new oracle or production search run is needed.

## Protocol frozen before new readout

Use the existing, exact source-indexed 50-path sample in its entirety; assert both source files, case identity, parent, frontier index, 11-move depth and packed/raw-prefix equality. Decode the current canonical accepted Hint[] files for the two exact parent boards using the official source codec; sort path hashes and select at most 20 distinct independently referee-accepted accepted solutions **per parent**. Stored accepted solutions are permissible as an offline benchmark only, **not** as cold runtime input or a source of supposedly new solves.

For each selected beam-produced partial, compute all proxy features *before consulting that partial's exact label*. Compare against every accepted-solution **prefix of exactly the same 12-node raw depth and gate**:

- minimum Jaccard distance between the two prefixes' visited-cell sets;
- minimum position-by-position mismatch fraction at aligned prefix indices;
- maximum exact common initial run of cells.

Reject mismatched gates or shorter hints. Do not compare the short partial with entire accepted long routes and call the inevitable missing suffix a path-distance problem. All metrics are exploratory offline shape proxies, not relaxed candidate completions or local-repair outputs.

Only after all features are frozen join the CP-SAT LIVE/DEAD labels and report independent parent strata separately. In particular, R03147's **2 LIVE versus 23 DEAD** sibling comparisons are conditional on one parent; the 25 DEAD from R01600 are a distinct-parent negative control, **not** 25 independent levels. An observed descriptive pairwise ordering is not validated prediction.

## Stop/advance gate

- If reference-hint matching is absent, the proxy is unobservable, not negative evidence against LNS.
- If LIVE and DEAD partials have similar proximity to the accepted prefix manifold, close this specific *reference-guided geometric-proximity discriminator* as unpersuasive; original solution-solution clustering remains true.
- Even if the two LIVE prefixes are unusually close, **do not** implement LNS, a new ranking feature or a cold policy from a single positive parent. Next choose a new independent parent cohort without consulting outcomes and devise a plausible **hint-free current-state** relaxation or candidate-shaping procedure. Full candidate legality, local repairability, fixed-work cold cost and referee validation remain separate.
- No history/level ID/hint/label is allowed in the prospective cold consumer, even if offline proxy looks excellent.

Execution: `scripts/stress/pg-o-real-frontier-manifold-proxy.mjs` runs with a disposable, branch-only read-only GitHub Action. Delete the workflow before merge; preserve exact source/artifact hashes, machine results and the stable research-question join. No LNS engine or broad stochastic search is authorized here.

## Successor disposition (2026-10-17)

[Run 39089743702](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39089743702) completed every frozen case and matched reference hint. Two exact LIVE R03147 prefixes had minimum equal-depth reference-hint Jaccard distances 0.800 and 0.957; within-parent pairwise LIVE/DEAD ordering was only 0.620 (Jaccard/position) to 0.641 (longest common prefix) on 46 dependent comparisons. The retrospective hint-prefix geometry shortcut is **concluded-negative**, not a claim that LNS is impossible. Do not scale this signature or introduce stored hints into cold solving. PG-O remains active only for a *different hint-free current-state partial-to-relaxed-candidate and measurable local repairability* method, subject to independent-parent opportunity. Source-identical 50-row machine verdict is [permanent](stress/pg-o-real-frontier-manifold-proxy-20261017-001.json).
