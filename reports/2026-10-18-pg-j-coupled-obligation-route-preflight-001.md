# PG-J combined mandatory-route bound: cheap retrospective qualification (2026-10-18)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-18 — [three exact-source one-shot qualifications](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39179175449), final execution `edad99330d13f1c472e5b402d41f392d9fdcd15b`, artifact `12155363564`
> **Decision:** Bounded-positive on one source-selected human parent: joint axis-history / portal / MP+MC bound rejects 2/2 existing exact-DEAD prefixes with 2/2 complete LIVE solution witnesses embedded, but is too expensive and nonportable in its tested form for a production prune.
> **Remaining gate:** Seek cheap current-input-derived subset abstraction and real-search retained-descendant-work opportunity on independently selected parents, plus broader soundness and cost controls; no unchanged P00137 replay or hot-path integration.
> **Research question:** `WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR`
> **Evidence role:** discovery
> **Selection:** all four pre-existing P00137 CP-SAT-proven opposite-fate prefixes at raw depths 9/10; a selected, dependent single human parent, **not** a cold population
> **Population identity:** 4 immutable source prefixes in `reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json`; human level P00137 from `data/levels.json`
> **Selection history:** exact reference fates and existing-prune non-rejections inspected before this design; any positive is a retrospective development finding
> **Inference scope:** exact necessary-condition discrimination of those four prefixes if mechanics are sound; not solve-set performance, prevalence, or a near-typical-budget improvement

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-18","decision":"Bounded-positive on one source-selected human parent: joint axis-history / portal / MP+MC bound rejects 2/2 existing exact-DEAD prefixes with 2/2 complete LIVE solution witnesses embedded, but is too expensive and nonportable in its tested form for a production prune.","remainingGate":"Seek cheap current-input-derived subset abstraction and real-search retained-descendant-work opportunity on independently selected parents, plus broader soundness and cost controls; no unchanged P00137 replay or hot-path integration.","joins":{"researchQuestion":"WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR","premiseRefs":["P198","P204"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"P00137 exact 4-case source cohort from three frozen topology-fork oracle reference reports","selection":"two selected opposite-fate depth-9/depth-10 sibling pairs on one human parent, observed before candidate design","inferenceScope":"local exact-reference semantic contrast only, no search-work or production inference"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-j-p00137-authoritative-mechanic-replay-20261018.json","reports/stress/pg-j-coupled-obligation-route-20261018-001.json"],"successors":{"questions":["WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"A coupled obligatory visit/crossing route with frozen used axes and irreversible portal/flipper transitions may force one DEAD prefix beyond remaining counted length.","surprise":"Both exact DEAD siblings exceed counted remaining length by one, both exact LIVE witnesses project stepwise; dropping the flipper dimension preserves all four outcomes and shrinks abstract search by >50%. Corpus2 has 303 broad structural matches but zero exact P00137-shape matches.","anomaly":null}} -->

## The premise, not a solver change

The previous authentic replay recorded two LIVE / two exact-DEAD prefixes on P00137. All four are canonical move-legal and are accepted by the current hard-prune gauntlet; within both pairs, the existing `mustPassLowerBound` and `mustCrossLowerBound` agree exactly (13/13 at depth 9, 11/12 at depth 10). Scalar bounds cannot explain the known opposite completion fates.

The new read-only prototype `scripts/stress/pg-j-coupled-obligation-route.mjs` asks a *different* necessary question: even after permitting arbitrary future cell and axis reuse apart from the mandatory crossing, what is the fewest counted moves to reach the goal **having visited both must-pass sites and crossed the must-cross site in two orthogonal directions**, while retaining consumed prefix axis bits, the immutable one-pass crossing lock, forced zero-cost portals, single-use portal endpoints and the globally ordered single-use flippers?

It uses canonical replay (`getNeighbors`, `applyMove`) only for the frozen initial state; future moves are computed in an explicitly **over-permissive** product graph. Exact oracle labels are attached only to output, never input to search or candidate ranking. The product intentionally does not store future used-axis changes on ordinary cells, visited-cell multiplicity, upper intersection counts, or full path history. These omissions can create false abstract completions and reduce precision, but **must never discard a legal continuation**. A false rejection on a LIVE source row invalidates the mechanism. The first version is purposely only qualified for prefixes with zero prior MP/MC/flipper/portal hits, as all four source cases satisfy.

The product state includes coordinate, incoming axis, portal arrival marker, outstanding must-pass bits, mandatory-crossing entry axes, global flipper-use mask and portal endpoint-use mask. A zero-cost forced portal jump makes ordinary move count equivalent to the level's counted path length. All visited derived states and relaxations are accounted; an explicit size cap must return *unknown*, not a DEAD certificate.

## Frozen decision

Run exactly the four pre-existing cases before broadening:
- No LIVE rejection, no source-prefix legality alarm, no exceeded abstract-state cap.
- Candidate success: at least one of the two previously unpruned exact-DEAD prefixes has *minimal relaxed remaining length strictly greater than its actual remaining counted length*.
- Candidate failure: 0/2 DEAD excluded; close this exact product as no better than previous bounds.
- A positive is **premise-only**: inspect whether computing the product costs more than any retained descendant work saved and test independent parents before shipping. No default-on prune, no new cold solve.

Historical reference solutions may be used only as *offline* LIVE soundness witnesses. Source provenance and experiment version are fixed before execution; do not tune to the four exact outcomes within this same experiment.

## Source-authentic result (run 39179175449)

The final [one-shot GitHub Actions run](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39179175449) passed at **immutable source `edad99330d13f1c472e5b402d41f392d9fdcd15b`**, artifact `12155363564`. ZIP SHA256 `2af0b9d82a8de12f6795e7efcaaccda18eb8aedba6702a55db06f7093d1ec2a3`; artifact member `verdict.json` SHA256 `8545cad5b2f10c4afbfe6dcbf8becb7b2c06e3838238f9dbf5d615ad69f947b9`. The checksum-pinned [durable verdict](stress/pg-j-coupled-obligation-route-20261018-001.json) retains every case and the independent static opportunity census.

| Source row | Exact oracle | Remaining counted steps | Full relaxed lower bound | **Flipper-free** lower bound | Flipper-free visited abstract states |
| --- | --- | ---: | ---: | ---: | ---: |
| B9 original | LIVE | 24 | 21 | **21** | 16,327 |
| B9 alternate | DEAD | 24 | 25 | **25** | 17,426 |
| B10 original | LIVE | 23 | 20 | **20** | 15,997 |
| B10 alternate | DEAD | 23 | 24 | **24** | 15,873 |

Both exact DEAD prefixes exceed their remaining counted budget **by one** even in the strictly weaker flipper-free relaxation, while both LIVE prefixes are not rejected. More strongly, each source LIVE row's **entire referee-accepted completion** was checked move by move to be an actual path through the abstract successor graph; the two required suffix lengths agree exactly (24 and 23 counted moves). No source legality alarm, state-cap exhaustion or false rejection was observed.

The original flipper-aware product visited **36,326–48,717** states and enumerated **93,354–132,121** abstract transitions per prefix. Removing the flipper restrictions (a logically safe relaxation, not a new hard assumption) preserved the same four lower bounds and reduced exploration to **15,873–17,426 states** and **45,111–50,531 transitions**. This simplifies the hypothesis: **the new discriminator resides in frozen consumed-axis history coupled to mandatory MP/MC routing, first-crossing axis lock and single-use portal transitions**. Flipper-order state is not required for these four particular rows. The simplifying observation was made *after* the full-model result, so it is a development diagnostic, not independent confirmation.

### Why the necessary bound is safe within its declared scope

For each source P00137 prefix, canonical `createState/getNeighbors/applyMove` reconstructs the exact consumed axis mask and unfulfilled obligations. Any **real** legal continuation maps inductively into the relaxed state graph:

1. Its next ordinary move is among the canonical static neighbors; an axis previously consumed on the frozen prefix remains unavailable. Future non-MC edge-axis consumption is **not** tracked, so the abstract graph permits *more* routes than the game, never fewer from this omission.
2. A must-cross site requiring two entries uses opposite axes because canonical target-axis reuse prohibits repeating an axis. The first entry's forced straight exit retains the other axis; those are canonical movement constraints, not label-derived heuristics.
3. A portal landing forces a **zero-count** jump unless it has just been jumped to. Previously/future visited portal endpoints cannot be re-entered. The abstract portal mask and incoming-jump flag preserve these rules.
4. The flipper-free variant ignores flipper rules entirely and does not restrict true paths on that account. Every necessary MP visit and the required MC pair must still be represented; future non-MC visits and total intersection ceilings are deliberately forgotten.
5. Each ordinary edge costs one counted step and each portal jump costs zero. Therefore the minimum relaxed cost cannot exceed the counted length of any real valid completion. If this lower bound exceeds actual remaining length, a genuine continuation is impossible.

The checked accepted-witness projections protect this reasoning against obvious source/encoding errors, but the argument is still **restricted to the tested prefix-initialization conditions** (no already-completed MP/MC/flipper/portal obligations). Generalized multi-obligation abstractions require new proof and independent regression, not copying this result into `hard-prune-pipeline.ts`.

### Static transfer/opportunity census: a material negative qualification

Before inventing a consumer, count ordinary puzzle structure without consulting historical solve outcomes. In the original 1,700-record Corpus2 source (`data/stress/stress-levels-random.json`, Git blob `999db4c0e2be706a10a2c71915f6672344a05338`), **303/1,700** records contain at least two must-pass cells, at least one must-cross, and at least one portal. But **0/1,700** have the tested **exact two-MP / one-MC** cardinality; its generators use five to eight must-pass sites whenever MP is present. In the 160-record human corpus, six structurally share the broad combination and **only P00137** has the exact two-MP / one-MC / three-portal shape.

Consequently **303 is a broad static feature co-occurrence count, not 303 ready uses of the current DP**. The exact-tested form has zero source-shape transfer opportunities in Corpus2. Extending the DP to 5–8 must-pass obligations and frequently multiple MC/portals without redesign would explode product-state size and fail the cost gate. No unverified claim about runtime or cold solved-set gain is permitted.

## Decision and next research gate

**Advance the semantic premise, not the code.** The new combined necessary condition succeeds on a previously unpruned exact opposite-fate contrast while retaining both full accepted LIVE suffixes. The flipper-free reduction is the preferred **research reference**, not a proposed hot-path implementation.

**Hold production entirely**: the reduced method still explores roughly 16–17k abstract states for one source prefix, and no canonical retained descendant work under real cold search has yet been measured. It would be irresponsible to charge that computation per hot candidate and pretend it saves work. The next useful experiment, if the queue prioritizes this lane, is a cheaply evaluated, source-input-only **small subset of current outstanding obligations** with strict abstention caps, followed by an opportunity-only measurement on *independently selected* eligible parents. A current-state trigger must find more avoided work than it costs. If it cannot, close the consumer while preserving this semantic counterexample.

No CP-SAT oracle reruns, hint-conditioned cold routing, new production paths or new near-typical cold solves occurred in this work.
