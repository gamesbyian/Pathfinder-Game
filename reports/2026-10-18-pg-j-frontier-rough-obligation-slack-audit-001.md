# PG-J retained-frontier obligation slack: post hoc cheap economic triage (2026-10-18)

> **Status:** concluded-negative
> **Last evidence:** 2026-10-18 — previously source-verified native-beam retained-prefix artifact from GHA run 39197248687, 12 fixed Corpus2 parents, 297 retained paths
> **Decision:** do not run a full 2MP/1MC/one-pair residual DP at arbitrary shallow/early beam prefixes merely because 96.6% pass its eligibility gate. The observed loose-count proxy has a minimum margin of 25 counted steps; this diagnostic does not establish impossibility or correctness, only weak obvious tightness in the sampled regime.
> **Remaining gate:** a distinct cheap current-state and work-aware *late tightness/descendant-work* trigger, first on source-native prefixes; no fixed P00137 shape transfer or full DP production gate
> **Research question:** `WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR`
> **Evidence role:** diagnostic
> **Selection:** all 297 frozen score-rank/phase samples from GHA 39197248687, 12 outcome-blind selected Corpus2 parent IDs, already produced before this metric was chosen
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Selection history:** this arithmetic screen was chosen *after inspecting* the 287/297 eligibility saturation; exploratory and not a registered confirmation endpoint
> **Inference scope:** observations of selected early/medium beam prefixes only, correlated within parent and phase; not a sound prune, cost-saving measurement, or cold-solve claim

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-18","decision":"Do not treat saturated structural eligibility or a loose obligation-count proxy on early native frontiers as sufficient economic justification for a costly coupled-obligation DP.","remainingGate":"Measure a cheap late-stage current-state tightness discriminator and retained descendant-work before any full DP or real-search A/B.","joins":{"researchQuestion":"WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR","premiseRefs":["P198","P204"],"measurementOpportunity":null},"evidenceRole":"diagnostic","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"all 297 source-authentic frozen beam rank/phase prefixes from 12 selected Corpus2 parents","inferenceScope":"post hoc parent-dependent early/medium beam descriptive data; no sound necessary cost bound or efficacy claim"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-j-corpus2-subset-native-beam-opportunity-20261018.json"],"successors":{"questions":["WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"The original structural opportunity conjunction was too loose to discriminate practical early beam prefixes.","surprise":"The simple visit-count diagnostic remains 25 or more below remaining counted length even for the tightest observed sample.","anomaly":null}} -->

## Source and exact exploratory arithmetic

The source is the original complete unfiltered `opportunity.json` in Actions artifact **12162297866**, run [39197248687](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39197248687), executed at immutable PR synthetic SHA `ca05b01f6af7870833d7afefc9ba2f8039641df1`. Artifact ZIP SHA256 `ee28aff1f8eb0953beed46203b7b1ac0ec7df7ed25e27fd2b0da6c6c87576307`; JSON member SHA256 `11c3415fbf45b2ed87565414520b811f348419337680983be1a770a0e4928918`. No historical hint or path feeds solver search; the ranks and frontier phases were precommitted upstream.

For every retained sampled path `p`, compute a **diagnostic, explicitly NOT admissible** proxy:

`rough_obligation_margin(p) = countedRemaining(p) - outstandingMP(p) - 2 × pendingMC(p)`.

A must-cross cell's outstanding requirement can represent one or two future visits depending on its current crossing status; portal jumps can visit mandatory objects without charging counted length; mandatory objectives can overlap under general rules. Therefore **this expression cannot be used for hard pruning, proof, or guaranteed progress metrics**. It only asks whether naive obligation counts even approach the remaining-length scale in these observed retained prefixes.

All 297/297 source-retained sampled paths give the following descriptive output, computed offline without executing the solver again:

| Statistic | Value |
| --- | ---: |
| Source parents | 12 |
| Correlated sampled retained paths | 297 |
| Distinct sampled parent/path combinations | 297 |
| Previously observed structurally eligible | 287/297 |
| Median rough obligation margin | **55 counted steps** |
| Minimum / maximum rough margin | **25 / 107** |
| Samples with rough margin at most 30 | **14/297** |
| Samples with rough margin at most 40 | **52/297** |
| Samples with rough margin at most 50 | **118/297** |
| Parents contributing any margin at most 30 | **3/12:** R00565, R02801, R02897 |
| Samples from phase >=32 | 120/297 |

Even the *smallest* observed rough margin is 25, so the saturation of the simple pending-MP/MC/portal prerequisite does not imply route-count tightness here. This is not evidence that the true coupled route bound has a margin of 25: consumed axes, forced portals, and ordering dependencies may make the true residual feasibility *much tighter*, as the P00137 counterexample demonstrates. Equally, the count proxy may overestimate mandatory counted steps because of zero-length portal edges and should not be used for feasibility decisions.

## Economical next question

There are two separable problems: **where** to invoke the route oracle and **whether** it can reject with less work than the true retained descendants it avoids. At 4.7k–5.3k abstract states and roughly 14k–16k transitions for P00137, an expensive per-prefix cold beam call is indefensible without strong current-state selectivity and downstream-work benefit.

The next valuable task is to measure, before oracle computation, a **source-native late-stage retained-parent prefix** with unusually constrained unconsumed axes/portal transitions and substantial actual retained descendant work. A prospective cheap trigger might combine consumed-axis geometry with remaining mandatory crossings and a crossing-neighbor bottleneck; it must be chosen without CP-SAT labels or historical winners and *may only nominate* an oracle call. The oracle itself must have a strict state/time/fuel cap that returns UNKNOWN, not a false rejection. Compare actual source-native work to run the oracle against source-native descendant work that would be spared. A zero-benefit or near-zero-participation outcome closes that specific candidate rather than scaling the search.

No new cold solve, no solve policy change, and no CI workload are justified by this retrospective slack audit alone.
