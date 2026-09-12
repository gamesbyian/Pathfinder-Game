# Class-5 single-level microscope: R03351 preflight 001

> **Status:** active / prespecified
> **Last evidence:** 2026-09-12 — audit reconciled this microscope with the existing B2 extinction-adjacent exact-prefix program, the current 431-level class-5 cohort, and the existing explicit-prefix CP-SAT execution seam.
> **Decision:** keep `R03351` as the first microscope specimen, but do not treat `dead top-ranked survivor vs live culled witness` as a new premise by itself; B1/B2 already established that phenotype. The microscope must either expose a materially different exact phenotype or produce a new mechanism-specific runtime-legal discriminator/architectural limitation.
> **Remaining gate:** deterministically reproduce the ordinary width-2000 extinction, freeze exactly the culled witness prefix plus rank-1 and cutoff survivors, exact-label the two survivor futures (witness prefix is already known live and serves as a positive control), then classify the result against the historical B2 phenotypes before proposing any treatment.

## Why a one-level microscope is earned now

The current production boundary leaves 431 class-5 Corpus-2 misses with no known admissible/T1 candidate. Cheap composition routes have been substantially exhausted for this cycle: the bounded capability-memory census has zero class-5 reach; naive family/reference comparison is confound-dominated; the doubly confirmed 28-level first-loss population loses known-live beam support through score-width culling; widening is insensitive; repair does not naturally approach those trajectories; and two distinct bucket-retention treatments (`intsBucketRetention` and existing `mechanicBucketRetention`) both closed negative on that frozen population.

That creates a premise-generation problem, not an evaluation-capacity problem. The microscope asks a narrow question: **what future-relevant property does a genuinely live state possess that the current solver fails to value, preserve, represent, or reconstruct?** One deeply observed level can expose that distinction more efficiently than another untargeted sweep, provided the result is not mistaken for promotion evidence.

## Why R03351

`R03351` belongs to the frozen 28-level class-5 first-loss population and is unusually informative:

- required length: 119;
- ordinary width-2000 beam retains known-solution support to depth **47** before the known-live family is lost;
- `intsBucketRetention` reaches depth 46, with no solve;
- `mechanicBucketRetention` reaches only depth 34, with no solve;
- therefore failure is not merely initial exposure, and two plausible generic diversity axes have already failed;
- its canonical accepted hint has strong provenance: the same parent-valid path was replayed from many independently solved family variants.

The full accepted path itself proves every exact prefix of that path is live under the real referee. CP-SAT does not need to establish that fact from scratch; the witness-prefix case is a calibration/control for the reference model. The decision-bearing exact labels are the states that **survive instead**.

## Historical precedent and novelty bar

This method has an important predecessor that must constrain interpretation: [`2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md). B2 already rebuilt real score/width extinction points, froze the beam's top-ranked retained candidate against a known-supported culled candidate (and, for width-saturated rows, a cutoff survivor), replay-validated the prefixes, and exact-labelled their futures.

That work established at least two distinct exact phenotypes:

- **dead-preferred-over-live:** at multiple independent extinction points the beam's rank-1 choice was CP-SAT-proven dead while a culled known-solution prefix was live; later flipping-filter support extended the recurrence into width-saturation cases;
- **live-vs-live:** weak-margin cases existed where both rank-1 and the known alternative retained exact completions, so not every extinction is a future-feasibility ranking error.

Therefore the R03351 microscope is **not** licensed merely to rediscover that scoring can prefer a dead future. If R03351 reproduces the dead-top/live-witness shape, that is current class-5 recurrence of an old mechanism class, not a new mechanism. Advancement then requires a materially new, mechanism-specific runtime signal or architectural explanation, consistent with the standing rejection of generic feature/scorer accretion.

The instrumentation also need not be reinvented. `scripts/stress/collect-known-solution-prefix-survival.mjs` already supports `--retain-ranked-pool-details --retain-all-removal-details --include-stages`, and `scripts/stress/cpsat-explicit-prefix-reference.mjs` already consumes explicit packed-key prefixes, replay-validates them natively, exact-labels them, and referee-checks emitted SAT witnesses.

## Frozen question

At R03351's production-faithful score/width extinction, **what is the exact future-feasibility pattern of the states that beat the live witness prefix, and what smallest generic current-level/current-search distinction, if any, explains it beyond the already-known B2 phenomenology?**

Do not broaden the question until this one is answered or declared non-diagnostic.

## Protocol

### A. Reproduce the boundary, not the whole problem

Use the existing known-solution-prefix survival collector with the same ordinary beam regime as the first-loss canary: `default` profile, width 2000, 3,000,000 node budget, stored hints used only for observation. Retain full ranked-pool/removal detail. The collector must remain behavior-identical observation-on/off.

If the current branch materially changes the previously observed depth-47 boundary, stop and reconcile before interpreting it.

### B. Freeze exactly three cases first

At the final `score-width-culled` support loss, freeze:

1. **witness-culled:** the best-ranked actually culled candidate that is an exact prefix of a referee-valid R03351 solution;
2. **top-rank1:** the beam's rank-1 surviving candidate from that same pre-selection pool;
3. **cutoff-survivor:** the candidate at rank `beamWidth`, the last ordinary top-K survivor.

This deliberately mirrors the strongest B2 design while avoiding post-hoc survivor mining. Do **not** add “interesting-looking” states before these three labels are known. Add another state only if the three-case result leaves a prespecified mechanistic ambiguity that the additional case can resolve.

Bind the witness by exact path identity/hash in the artifact so later hint growth cannot silently change what “the witness” means.

### C. Exact/reference adjudication

Run the existing explicit-prefix reference tool on the frozen cases.

- `witness-culled` is already known live from its full referee-valid continuation. Its CP-SAT label is a **positive control**: `dead` or referee-invalid `live` is a correctness blocker; timeout/abstain leaves the real-witness liveness fact intact but limits model coverage.
- `top-rank1` and `cutoff-survivor` are the decision-bearing cases. Ask whether each exact state has at least one valid completion.

Interpret the smallest useful matrix before looking for descriptors:

| top-1 | cutoff | witness | first interpretation |
|---|---|---|---|
| dead | dead/live | live | future-feasibility mis-ranking is present; if top-1 dead, this is historical B2 recurrence, not by itself a new premise |
| live | live | live | not simple dead-vs-live ranking; investigate commitment/crowding/long-horizon competition |
| live | dead | live | mixed frontier quality; cutoff-specific crowding/retention structure may matter |
| abstain | any | live | no mechanism claim from the missing label; improve only the bounded adjudication seam if cheap |

Do not expand into a broad exact-solver program.

### D. Compare only causally plausible, runtime-legal distinctions

Only after exact labels exist, inspect a small mechanism-led set such as:

- remaining exact-length slack and unavoidable-distance lower bounds;
- remaining intersection requirement versus attainable/revisitable crossing opportunity;
- must-cross / portal / filter obligations and their ordering compatibility;
- residual connectivity/interface capacity and access to required landmarks;
- parity or endpoint feasibility;
- commitment/irreversibility: whether visited geometry has consumed a future route or crossing opportunity;
- information already represented but ignored by score/retention versus genuinely absent state information.

Do not restart the old broad descriptor/scorer program. The current queue already records that a generic 18-feature bundle lacked held-out value and broad scorer-vocabulary tuning is closed. Any new descriptor must be specifically motivated by the exact R03351 distinction.

Historical hint identity may label the live side offline, but no candidate mechanism may use level ID, family membership, stored hints, or historical outcomes at runtime.

### E. Mechanism classification before treatment

Classify the first useful distinction before writing a treatment:

- **ranking failure:** a mechanism-specific legal signal is present but current ordering undervalues it;
- **retention failure:** multiple live hypotheses need a justified axis materially different from the two closed bucket keys;
- **state-representation failure:** future-relevant histories are collapsed or omitted;
- **pruning failure:** a prune/lower bound destroys a viable continuation;
- **reachability/operator failure:** the solver can identify a live future but search/repair cannot reach it;
- **commitment/restart failure:** viable alternatives exist but are discarded at an identifiable commitment boundary.

Only the observed class may reopen its corresponding workstream/premise.

### F. Advancement gate

A positive microscope result requires one of:

1. a **mechanism-specific** runtime-legal signal that explains the frozen exact labels and changes the diagnosed boundary in the predicted direction; or
2. a precise architectural/reachability limitation that nominates a materially new generic capability.

The following are **not** advancement by themselves: R03351 solves; the witness is live; rank-1 is dead; another arbitrary bucket key moves the boundary; or another hand-tuned scoring weight helps this level.

Any intervention that helps R03351 must next face a tiny independent phenotype-matched set (prefer 3-5 levels) before larger validation. A one-level solve never licenses promotion.

## Stop conditions

Close or pause without treatment search if:

- exact labels add no distinction beyond an already-closed form and no mechanism-specific legal signal is found;
- the only separator is hint-derived, level-specific, or unavailable to a cold solve;
- the experiment begins accumulating feature variants/interventions without one causal story;
- solving the specimen effectively encodes its answer;
- exact adjudication cannot resolve the survivor cases within the existing bounded seam and there is no evidence that expanding the reference model would change a decision.

A negative microscope is useful if it eliminates a capability class or tells us which next specimen phenotype would be informative.

## Immediate execution seam

1. Collect full boundary detail:
   `node scripts/run-bundled.mjs scripts/stress/collect-known-solution-prefix-survival.mjs -- --level-ids=R03351 --beam-width=2000 --node-budget=3000000 --include-stages --retain-all-removal-details --retain-ranked-pool-details --out=tmp/r03351-microscope-survival.json`
2. Build the frozen three-case exact input with the dedicated postprocessor added for this microscope.
3. Run `scripts/stress/cpsat-explicit-prefix-reference.mjs` on that case file.
4. Record the exact phenotype and only then decide whether a descriptor/treatment is earned.

## Relationship to the active queue

This is the current WS2 capability-acquisition premise generator. WS5 is a supporting adjudicator. It does not reopen WS4, WS6, WS0, continuation/handoff, generic scorer work, or selector work by default; a concrete microscope finding must satisfy the relevant reopen condition first.
