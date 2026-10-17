# PG-N retained exact-fate interface collision falsifier 001

> **Status:** concluded-negative
> **Last evidence:** 2026-10-17 — [read-only GitHub Actions run 39068642585](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39068642585), exact source `0948269064878b0e2bab0ec74e291c0e7a66deb9`, all pre-existing reference rows retained and strict self-tests green.
> **Decision:** **reject** three lossy future-state interface candidates for exact pruning/caching on direct opposite-fate counterexamples. Adding the full visited-cell support resolves those particular collisions only by making every sampled signature a singleton, with **zero measured compression**. Do not promote a state abstraction or implement a search architecture from this cohort.
> **Remaining gate:** test a **materially different**, mechanic-aware interface on retained, comparably exact LIVE/DEAD pairs with at least some *distinct prefixes sharing the proposed signature*. If the candidate merely separates every state, stop for lack of compression. Seek additional evidence of meaningful repeated state support before construction of a general representation engine.
> **Research question:** `WS2-INTERFACE-SUFFICIENCY-FALSIFIER`
> **Evidence role:** forensic
> **Selection:** complete pre-existing topology-fork exact label sets, originally selected to explore path-history consequences; **not** outcome-blind sampling of the general solver population.
> **Population identity:** 28 labelled observations from [original](stress/class5-topology-fork-exact-labels-2026-09-16.json), [extension](stress/class5-topology-fork-extension-exact-labels-2026-09-17.json), and [replication](stress/class5-topology-fork-replication-exact-labels-2026-09-16.json) cohorts; deduplicated to 25 unique level+prefix observations across seven independent published parents. Source SHA-256 values are in the [machine verdict](stress/pg-n-exact-fate-interface-collision-20261017-001.json).
> **Inference scope:** exact insufficiency of those specific signatures on these current-history pairs, not prevalence, correctness of other representations, causal search improvement or cold-solve economics.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-17","decision":"Observed 7 exact LIVE/DEAD endpoint/raw-depth signature collisions across four published parent puzzles and 2 collisions even after adding bounding box. Complete visited-cell support produced 25 singleton signatures on 25 unique prefixes and zero comparison/compression opportunity.","remainingGate":"Find a materially different mechanic-aware interface with genuine repeated-signature support and adequate exact LIVE/DEAD coverage before any proposed exact cache/prune or search architecture.","joins":{"researchQuestion":"WS2-INTERFACE-SUFFICIENCY-FALSIFIER","premiseRefs":["P198","P204"],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"28 labelled observations from [original](stress/class5-topology-fork-exact-labels-2026-09-16.json), [extension](stress/class5-topology-fork-extension-exact-labels-2026-09-17.json), and [replication](stress/class5-topology-fork-replication-exact-labels-2026-09-16.json) cohorts; deduplicated to 25 unique level+prefix observations across seven independent published parents. Source SHA-256 values are in the [machine verdict](stress/pg-n-exact-fate-interface-collision-20261017-001.json).","selection":"three complete previously selected topology-fork exact-reference label sets, no posterior selection of collision cases","inferenceScope":"counterexample to each tested lossy signature only, without population prevalence or production-solve claims"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-n-exact-fate-interface-collision-20261017-001.json","scripts/stress/pg-n-exact-fate-interface-collision.mjs"],"successors":{"questions":["WS2-INTERFACE-SUFFICIENCY-FALSIFIER"],"artifacts":[]},"prospective":{"expectation":"Adding coarse shape information could repair endpoint/depth collisions while retaining some compression.","surprise":"Even endpoint, raw depth and full path bounding box still mixed exact LIVE and DEAD fates; full visited support had no shared-signature comparison pairs.","anomaly":null}} -->

## Source and correctness controls

The [one-shot green run](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39068642585) used `scripts/stress/pg-n-exact-fate-interface-collision.mjs` over **all 28 rows** in the three already-retained published topology-fork exact-reference datasets. Every decisive `live` row had a referee-accepted emitted solution, every `dead` row had CP-SAT `INFEASIBLE`, and all sources declared zero correctness/input alarms. No oracle calls or production solver experiments were made. Identical `(corpus, level, entire prefix)` observations were deduplicated: **three repeated aliases**, no conflicting labels, giving **17 LIVE and 8 DEAD distinct prefixes** in seven parent levels.

The comparator derives each signature **solely from the prefix and puzzle identity**, without reading its label. It retains puzzle identity to prevent false collisions between different levels; collisions only matter between distinct paths in the **same** puzzle. `rawDepth` is the literal number of recorded prefix transitions, *not* the portal-aware counted path length. The tested forms are therefore exactly the listed lossy proposals, not all reasonable future state representations.

## Exact-fate collision results

| Candidate signature (within each level) | Distinct keys | Repeated keys | Mixed LIVE/DEAD keys | Disposition |
|---|---:|---:|---:|---|
| Endpoint + raw depth | 12 | 12 | **7** | Falsified; 4 independent parent levels contain a mixed group |
| Endpoint + unique visited-cell count | 12 | 12 | **7** | Falsified on the same four independent parents |
| Endpoint + raw depth + path bounding box | 20 | 4 | **2** | Falsified; P00009 and P00148 |
| Endpoint + raw depth + full visited-cell *support set* | 25 | **0** | 0 | No tested collision, but **zero repeated signatures** means no fidelity-with-compression evidence |

The seven endpoint/depth collisions come from **P00009, P00124, P00137 and P00148**. For example, two P00124 prefixes can reach the same endpoint after the same number of recorded moves but have opposing exact completion fates. The machine result preserves every conflicting case ID, case label, original source identity, and full source artifact provenance. These are **literal insufficiency witnesses** for their tested representations: exact caching or hard rejecting based on those signatures would identify states with different futures.

A box-shaped visit summary is still insufficient for two groups. By contrast, a full occupied-cell set distinguishes every path in this small cohort, but *that does not prove it is future-sufficient*: it may omit path order, per-cell visits/used axes, portal/flipper history and other mechanics. Its zero repeated groups also gives nothing for a useful quotient/compression comparison. An exact-state identity that never merges two measured states is not a demonstrated search improvement.

## Scope, stop rule and next useful falsifier

This is a **retrospective case-based diagnostic**, deliberately drawn from existing path-history-fork experiments. The fraction of mixed signatures is not a general prevalence estimate and is not independent across multiple cases within the same parent. A single correct mixed-signature group is enough to falsify a candidate's universal future-equivalence claim, but no number of isolated non-collisions on this tiny selected sample proves the converse.

Do not build a state-compression subsystem, frontiers/ZDDs, transposition pruning, or new cold runtime policy on these results. The next PG-N candidate must specify exactly what mechanic/history resource it preserves, find repeated candidate-signature pairs **before** claiming compression, and ask whether one of those pairs has demonstrably different exact future fate. A tiny read-only or disposable interface experiment is allowed even while PG-D's trail/switch work is open; the independent architecture gate remains closed.

Reproduction on current main (no external workflow required):

```bash
node scripts/stress/pg-n-exact-fate-interface-collision.mjs --self-test
node scripts/stress/pg-n-exact-fate-interface-collision.mjs --out=tmp/pg-n-interface-verdict.json
```

The one-shot workflow was removed from the integration branch once its green run and artifact `12113808163` were preserved.
