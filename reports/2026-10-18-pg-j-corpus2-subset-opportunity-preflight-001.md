# PG-J Corpus2 source-native subset opportunity (2026-10-18)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-18 — source-qualified fixed 12-parent [run 39197248687](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39197248687), artifact 12162297866, execution SHA `ca05b01f6af7870833d7afefc9ba2f8039641df1`
> **Decision:** The frozen 12-parent retained-beam opportunity test passes (12/12 parents, 287/297 sampled prefixes eligible), but the near-saturated predicate has no demonstrated ability to select nonredundant DEAD continuations; advance only a fuel-capped, observer-only necessary subset, not a hot-path prune.
> **Remaining gate:** Next: test a strictly bounded current-state two-MP/one-MC/one-portal-pair relaxation on replayed real retained prefixes, with actual candidate-local avoided descendant work, zero LIVE-witness false rejects and explicit abstention; no production consumer or fixed-work A/B yet.
> **Research question:** `WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR`
> **Evidence role:** opportunity
> **Selection:** twelve outcome-blind, distinct ID-ranked generated Corpus2 levels frozen in [source selector](stress/pg-j-coupled-obligation-transfer-12-parent-20261018.json), not selected by prior solver outcomes or P00137 reference fates
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Inference scope:** selected 12-parent, one-width/one-profile production-native beam frontier/eligibility telemetry only; no correct prune, work benefit or new cold solve

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-18","decision":"The frozen 12-parent retained-beam opportunity test passes (12/12 parents, 287/297 sampled prefixes eligible), but the near-saturated predicate has no demonstrated ability to select nonredundant DEAD continuations; advance only a fuel-capped, observer-only necessary subset, not a hot-path prune.","remainingGate":"Next: test a strictly bounded current-state two-MP/one-MC/one-portal-pair relaxation on replayed real retained prefixes, with actual candidate-local avoided descendant work, zero LIVE-witness false rejects and explicit abstention; no production consumer or fixed-work A/B yet.","joins":{"researchQuestion":"WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR","premiseRefs":["P198","P204"],"measurementOpportunity":null},"evidenceRole":"opportunity","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"12 outcomes-blind generated Corpus2 parent IDs fixed in pg-j-coupled-obligation-transfer-12-parent-20261018.json","inferenceScope":"source-native retained beam prefixes under one current-input choice of gate/scorer/width, not all production stages or all Corpus2 levels"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-j-coupled-obligation-transfer-12-parent-20261018.json","reports/stress/pg-j-effective-required-visits-static-opportunity-20261018.json","reports/stress/pg-j-corpus2-subset-native-beam-opportunity-20261018.json"],"successors":{"questions":["WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"A substantial fraction of source-native retained frontier prefixes might have two outstanding MP sites, one outstanding MC crossing and at least one portal pair not consumed.","surprise":"Eligibility saturated at 287/297 prefixes across all 12 parents. Only 10 prefixes on 2 parents failed the structural screen at the deepest checkpoint, so participation alone is a weak economic selector.","anomaly":null}} -->

## Why this is a separate question

The [PG-J P00137 model](2026-10-18-pg-j-coupled-obligation-route-preflight-001.md) is semantically promising (two historically unpruned exact-DEAD prefixes excluded) but requires up to 5.3k abstract states to reject one of them. Applying it directly to the generated corpus would be unsound as an economic claim: Corpus2 has 5–8 MPs and commonly multiple MCs and portal pairs, and not one exact P00137-shaped board. Before coding even a smaller DP, first establish that **real search reaches the proposed prerequisite state**.

## Recovered first-run source-normalization blocker (2026-10-18)

The initial one-shot [run 39183544683](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39183544683) **failed before the first frontier** at `board mechanics changed`. Its self-test and dependency setup succeeded, but it produced no output artifact and cannot count as a negative opportunity observation.

Root cause: the fixed structural freeze recorded **raw** `mustPass.length`, whereas canonical `normalizeRawLevel` additionally converts `mustTurn` (and `mustPass`) landmarks into mandatory `mustPassKeys` by design. The code had compared these two distinct representation layers as if equal. Inspection of all twelve immutable source parents confirmed that **6/12** add landmark-required visits: `R00565` has 7 raw MPs → 14 normalized, `R02801` 7→14, `R03195` 6→14, `R02336` 7→15, `R02897` 8→16, and `R03247` 6→13. The remaining six have matching raw/normalized MP counts. The updated source identity assertion now derives the effective canonical MP set from the same raw must-pass and must-turn/must-pass landmarks that normalization consumes. MC and portal-pair counts remain compared exactly. **No source parent, technique, budget, sample rank, threshold or frozen selection was changed.**

This matters economically beyond the test failure: using a raw-only obligation count would understate remaining obligations on half the selected parents and distort a real residual subset trigger. The follow-up must use the *canonical* current state.

## Corrected source-wide static opportunity (no extra search)

The initial human-source preflight had reported **303/1,700** structurally eligible Corpus2 parents using *only the raw must-pass list*. That excludes mechanically mandatory `mustTurn` and `mustPass` landmarks. A separate source-only [normalized-obligation census](stress/pg-j-effective-required-visits-static-opportunity-20261018.json), pinned to the same frozen corpus Git blob `999db4c0e2be706a10a2c71915f6672344a05338`, reconstructs the canonical union and finds **431/1,700** parents meeting `>=2` effective MP, `>=1` MC, `>=1` portal pair. The **128 newly eligible** parents all had zero raw MP but mandatory visit landmarks. Across the corpus, **936** parents have additional mandatory landmark visits and **426** have zero raw MP but some effective mandatory visits.

These are broader opportunity-screen counts, not a solve, downstream-work estimate, or proof that a proposed DP applies correctly. The twelve **already frozen** raw-eligible IDs remain the tested stratum; do not silently substitute the 128 newly eligible after seeing any new source-frontier outcome. The new 431-parent effective population could underpin a separately preregistered independent confirmation if the selected-sample micro-gate earns it.

## Frozen source-native observer

For each of the twelve fixed generated parents, independent cold level preparation, canonical **first gate**, exact `objectiveFirst` scorer, width **128**, no extra mechanic bucket retention or hints. Sample native beam continuation frontiers after phases **8, 16, 24, 32 and 48**, stopping after the first phase-complete checkpoint at or above nominal **40,000 canonical work** or **50,000 nodes**, and no more than **120 s wall**. A phase-complete pause can overshoot the nominal work amount: retain actual charged work, do not claim strict 40k equality. The only purpose is a few realistic frontier prefix states, not matching production output or demonstrating solved set.

At each captured phase, sample deterministic score-rank positions `0, floor((n-1)/4), floor((n-1)/2), floor(3(n-1)/4), n-1` (unique). Reconstruct literal retained ancestor paths from the beam's `prev` chain, replay each **from scratch on an independent prep work meter** through actual `getNeighbors/applyMove`, then record whether at least **two** MP sites remain unvisited, at least **one** MC obligation is still unmet, and at least **one portal pair** is unconsumed. This three-way conjunction is the **conditional necessary eligibility for a 2MP/1MC/one-pair abstract DP**. It does not itself prove the DP can reject or amortize its cost. Portal pairs are considered consumed when either endpoint has been visited (canonical endpoints are single-use); a consumed pair is not an optional resource for a future chosen pair. Record actual remaining counted length, prefix replay cost, phase work and sampled rank. No outcome label enters runtime selection.

**Primary gate:** at least 2 of 12 independent parents with one or more eligible retained prefixes and at least 8 eligible sampled prefixes total. This was selected before collecting any new frontier data as a deliberately weak *nonzero participation* screen; it is **not** enough for a pruning or cold-solve experiment.

**If gate fails:** close this source/width/profile subset-form negative, do not buy DP or move a hot-path operator. Other search-family or depth regimes may be distinct premises, but require a new opportunity reason.

**If gate clears:** a strictly fuel-capped, overpermissive tiny 2MP/1MC/one-pair route oracle may be built *read-only* on the same frozen sample. A useful next claim requires a semantic rejection at a retained prefix, no rejected referee-valid witness, and candidate-local downstream work demonstrably exceeding the oracle's actual derivation charge. No source path, historical hint or response is allowed in the live solver; all prefix inspection happens offline.

The beam sampling is a research-mode original technique, **not exact shared 250k whole-solve**, and an unexpected solve is only source/referee-valid isolated technique evidence, never automatically a near-typical cold-product solve. The producer emits compact data and a single immutable source-labeled artifact; retire its workflow after adjudication.

## Source-authentic recovery and completed opportunity evidence

The original [39183544683](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39183544683) run stopped *before sampling any frontier*: a source identity assertion incorrectly equated raw MP count to normalized must-pass keys after landmark mechanics. It created no result and never measured participation. The subsequent fixed source verification correctly includes must-turn and must-pass landmarks and changes neither the twelve parent IDs nor the preregistered sampling/budget criterion.

The **successful** [run 39197248687](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39197248687) ran on immutable synthetic execution SHA `ca05b01f6af7870833d7afefc9ba2f8039641df1`, artifact `12162297866`. ZIP SHA256 `ee28aff1f8eb0953beed46203b7b1ac0ec7df7ed25e27fd2b0da6c6c87576307`; `opportunity.json` SHA256 `11c3415fbf45b2ed87565414520b811f348419337680983be1a770a0e4928918`. A durable machine [twelve-row summary](stress/pg-j-corpus2-subset-native-beam-opportunity-20261018.json) retains every parent, visited phase and sample denominator with immutable source/protocol identity. The full sampled prefix paths remain in the Actions artifact.

| Source-native retained frontier measure | Result |
| --- | ---: |
| Independent frozen Corpus2 parent IDs sampled | **12/12** |
| Parents with at least one structurally eligible retained prefix | **12/12** |
| Sampled rank-and-phase prefixes | 297 |
| Prefixes eligible for *potential* two-MP/one-MC/one-pair subset | **287/297 (96.6%)** |
| Source-beam canonical work, total | 480,622 |
| Independently metered replay work | 7,276 |
| Runs with nominal 40k phase-boundary overrun | 9/12 |
| New source-valid isolated beam solves | **0** |
| Failures of canonical prefix replay/source identity on the corrected run | **0** |

**Exact ineligibility pattern:** five retained depth-48 paths on R00565 had no unused portal pair left, despite five remaining MP and two pending MC. Five depth-48 paths on R02264 failed because the pending MC count reached zero on one and fewer than two MP remained on four. All sampled earlier-depth paths qualified. Thus the present opportunity test is **almost always true**, not a useful standalone classifier, and it does not establish a pruning benefit. Repeated samples from a given parent and phase are dependent; do not treat 287 prefixes as independent puzzle trials.

**Disposition:** the precommitted two-parent/eight-prefix participation gate clearly passed. This earns a *small observation-only follow-up*, not integration of the originally expensive P00137 route DP. A new treatment must use a specific, cheap current-state subset selection with a hard cap, preserve every known legal completion, and exhibit real marginal descendant work that exceeds the cost of computing the certificate. The 40k dose was phase-bounded rather than primitive-atomic strict, so it also cannot be cited as a matched 40k product solve A/B.

The separate [static-normalization audit](stress/pg-j-effective-required-visits-static-opportunity-20261018.json) corrected the broad input-only eligible parent count from 303 to 431 of 1,700 by accounting for mandatory landmark visits. It does not broaden or retrospectively reselect this already frozen twelve-parent sample.
