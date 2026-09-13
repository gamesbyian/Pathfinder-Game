# Class-5 compact dead-cause recurrence diagnostic 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-13 — 30 CP-SAT-adjudicated culled-candidate prefixes across 2 fresh class-5 residual levels (R00046, R02733), plus mechanic-relaxation + prefix-length-bisection cause extraction for all 30 (all DEAD).
> **Decision:** `WS2-COMPACT-DEAD-CAUSE-RECURRENCE` is not resolved either way at population scale by this diagnostic. It finds one directly verified instance of the same compact dead cause being independently rediscovered by two structurally different beam states in a real solve (not an artifact of resampling one trajectory — explicitly checked), which is a materially different, positive result from the prior scalar-descriptor null. But the sample is 2 levels and only 4/30 candidates got a fully resolved (non-abstained) minimal cause boundary, so no population-level recurrence rate or aggregate wasted-work estimate can be claimed from this evidence. No reuse/cache/nogood implementation is warranted yet.
> **Remaining gate:** before any implementation, and before this line can honestly close negative either, run a comparable cause-extraction pass with a cheaper/faster minimal-boundary method (or a larger per-call time budget) across more residual levels so the fraction of candidates that resolve to a *shared* compact cause (not just a shared coarse mechanic-family bucket) can actually be measured, not just demonstrated to exist once.

## Question

`WS2-COMPACT-DEAD-CAUSE-RECURRENCE` (`docs/solver-research-question-relations.json`): *"Do failed searches repeatedly encounter the same sound compact dead cause often enough for solve-local reason reuse/local nogoods to have information value?"* This diagnostic owns only the recurrence-measurement half, not scoring ("we need a better score" is the already-closed `reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md` route). Distinguished explicitly from that closed route throughout.

## Specimen selection

Regenerated the residual atlas fresh rather than trusting a possibly-stale `tmp/` artifact:

```
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/34683011115/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/34683011115/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random --out=tmp/atlas.json
```

Confirmed 431 `primaryClass === 5` rows (matches the workstream doc). `R03229` is already spent (per `reports/2026-09-12-class5-microscope-branch-reconciliation-001.md`) and excluded. Picked two fresh specimens by two independent, prespecified deterministic rules so the choice isn't cherry-picked after looking at results:

- **lowest level id** among the 431 class-5 rows: `R00046` (multi-portal regime, `productionAttemptCount=122`, `productionNodes=267,500,000`, `productionStatus=node-budget-reached`).
- **highest `productionAttemptCount`** among the 431 rows (excluding R03229): `R02733` (multi-portal regime, `productionAttemptCount=123`, `productionNodes=261,679,820`, `productionStatus=node-budget-reached`). `R02733` also happens to be one of the seven levels in the original class-4/class-5 first-loss development sample, but it was never itself exact-microscoped (only `R03229` was) — its atlas/production/capability evidence is current, not reused prior CP-SAT evidence.

Ran the existing freshness audit (`scripts/stress/audit-class5-hint-capability-freshness.mjs`) over the regenerated atlas: neither `R00046` nor `R02733` appears in the 36-row isolated-technique nomination list, so both are genuinely still class-5 residual under current production, not stale atlas membership.

## Method

### 1. Production-faithful full trace

For each specimen, ran the existing collector at the same production-faithful parameters used for the `R03229` microscope (`beamWidth=2000`, `nodeBudget=3,000,000`, matching `reports/stress/first-loss-pilot-beam-width2000-001.json`), with full retained detail:

```
node scripts/run-bundled.mjs scripts/stress/collect-known-solution-prefix-survival.mjs -- \
  --level-ids=<LEVEL> --beam-width=2000 --node-budget=3000000 \
  --include-stages --retain-all-removal-details --retain-ranked-pool-details \
  --out=tmp/<level>-microscope-survival.json
```

Both runs terminated well under budget (R00046: 67,018 nodes; R02733: 84,077 nodes — i.e. the search itself extinguished, it did not hit the node cap), each in ~9s wall time. R00046's retained trace has 29 distinct `score-width-culled` depths (10–42); R02733's has 35 (15–51).

### 2. Bounded, prespecified culled-candidate sample (new script: `scripts/stress/collect-class5-dead-cause-sample.mjs`)

Unlike `build-class5-microscope-cases.mjs` (which only ever looks at the single terminal loss depth, 3 cases total), recurrence is a question about whether the **same solve** re-hits the same dead reason at **multiple distinct decision points**, so this pulls candidates across the whole retained trace. Selection rule, fixed before any CP-SAT adjudication was run:

1. Take every depth that produced a `score-width-culled` stage (a real cull, not just "beam is at width").
2. If more than `--depths-per-level` (15) are available, subsample to exactly 15, evenly spaced by index across the sorted depth list (deterministic `Math.round`, not random).
3. At each selected depth, take the candidate at rank `beamWidth + 1` — the single **first-culled** candidate, the most competitive candidate the beam actually discarded at that decision point. Fixed, reproducible, not chosen after seeing labels.

15 depths × 2 levels = 30 cases (R00046 depths 10,12,14,16,18,20,22,24,26,29,31,33,38,40,42; R02733 depths 15,17,20,22,25,27,30,32,34,37,39,42,46,49,51). Committed at `reports/stress/class5-dead-cause-cases-001.json`.

**Independence check (addresses a legitimate framing risk directly).** Before interpreting any cause distribution, I checked whether these 30 "candidates" are actually 30 independent beam branches, or whether they might secretly be one continuous doomed trajectory per level sampled at multiple depths (which would make "N candidates share a cause" trivial and not a recurrence finding at all — it would just be the same branch's single dead reason counted N times). Exhaustively compared every pair of the 30 prefixes for a prefix/extension relationship: **zero** pairs found where one sampled candidate's path is an extension of another's, in either level. These are 30 genuinely distinct beam nodes — at every depth's cull event, the rank-2001 candidate is a different surviving lineage, because the whole width-2000 population is rescored and re-ranked every depth. So a shared cause across these candidates is a real cross-branch finding, not double-counting one branch.

### 3. CP-SAT adjudication (existing seam, unmodified)

```
node scripts/run-bundled.mjs scripts/stress/cpsat-explicit-prefix-reference.mjs -- \
  --cases=reports/stress/class5-dead-cause-cases-001.json --time-limit=120 \
  --out=reports/stress/class5-dead-cause-reference-001.json
```

Reused `cpsat-explicit-prefix-reference.mjs` exactly as the microscope line does: every SAT witness is referee-checked before being counted LIVE, and timeouts/unsupported-mechanic/unparsed cases are labelled `timeout/abstain`, never silently counted as DEAD. Result: **30/30 DEAD, 0 LIVE, 0 abstain, 0 correctness/input alarms** (`summary` in the committed reference file). Notable on its own: even the single most-competitive discarded candidate at every one of 30 independent decision points across two long real solves is exact-provably infeasible — the beam's own scoring is not merely mis-ranking a live alternative into a low position here, it's discarding candidates that were never coming back regardless of rank.

### 4. Compact cause extraction (new script: `scripts/stress/bisect-class5-dead-cause.mjs`)

**Why a relaxation/bisection proxy, not OR-Tools' native `SufficientAssumptionsForInfeasibility`.** That API requires every candidate-cause constraint to be gated behind a boolean assumption literal before solving. `cpsat-reference-probe.py`'s mechanic constraints (must-cross, flipper ordering/parity, landmark turn requirements) are built directly into the model via `OnlyEnforceIf` on internal derived booleans, not behind one assumption literal per mechanic family — wiring this up would mean rewriting most of that file's constraint banks (each carefully validated against real historical encoding bugs; see its own docstring). That's a substantial change to a load-bearing, already-hard-won exact oracle, for a diagnostic-only task. The existing `--core-only`/`--no-mustcross`/`--no-flippers`/`--no-landmarks` flags already give a mechanic-**family**-level cause partition for free with zero oracle changes, and prefix-length bisection (binary search over how much of the exact same fixed prefix is retained — monotone, because pinning more of one fixed continuation can only shrink the feasible-completion set) adds a length-level axis. Every claim below is verified by an actual second CP-SAT call showing the verdict flips to LIVE once the claimed cause is removed — this can only under-report minimality (a true unsat core could be smaller), never over-claim a cause.

```
node scripts/run-bundled.mjs scripts/stress/bisect-class5-dead-cause.mjs -- \
  --reference=reports/stress/class5-dead-cause-reference-001.json --time-limit=90 \
  --out=reports/stress/class5-dead-cause-bisection-001.json
```

104 auxiliary CP-SAT calls across the 30 DEAD rows (~70 minutes wall time; per-call time limit was 90s and roughly 30% of calls used most of it, discussed below as a cost finding).

## Results

### Mechanic-family distribution

| Cause bucket | Count / 30 |
|---|---:|
| `core-topology` (relaxing must-cross, flippers, *and* landmarks together is still DEAD) | 28 |
| `mustCross` (relaxing must-cross alone flips it LIVE) | 1 |
| `abstain` (core-only probe itself timed out; excluded, not counted) | 1 |

28/29 non-abstain DEAD verdicts (97%) land in one bucket. **This clustering is real but coarse, and by itself does not establish a reusable specific reason.** `core-topology` is close to "not a modeled optional mechanic" — a near-generic catch-all for base reachability/edge-axis-reuse/goal-distance infeasibility, which is unsurprising given the just-closed future-feasibility-descriptor result already showed none of the cheap resource/topology/joint-obligation summaries separate LIVE from DEAD, and given neither must-cross nor flippers nor landmarks are large in these two levels (1, 5, 7 and 1, 7, 9 respectively) relative to how constrained the base grid already is. It rules out "the differentiator is one of the three modeled optional mechanics" far more than it identifies what the actual shared reason is.

### Fine-grained cause: prefix-length bisection

This is where the real signal is, and where the limitation is too. Bisection fully resolved an exact minimal dead-boundary length for only **4 of 30** candidates (all in R00046); the other 26 halted on a CP-SAT abstain partway through the binary search and are reported as an unresolved bracket rather than a guessed value (per the "never under-claim, don't silently count abstain as dead" rule). This asymmetry is itself a finding: proving DEAD/LIVE for a much-shorter, much-more-open truncated prefix is *harder* for the oracle than the near-full-length prefixes the main adjudication batch used, so the highest-value direction for this diagnostic (how early was the fate sealed) is also the most expensive one to resolve — a real cost asymmetry, not a design flaw in the bisection.

The 4 resolved cases (R00046):

| case | full length | minimal DEAD length | slack (moves past the sealed point before culling) |
|---|---:|---:|---:|
| d10 | 11 | 10 | 1 |
| d16 | 17 | 13 | 4 |
| d38 | 39 | **17** | 21 |
| d42 | 43 | **17** | 25 |

**d38 and d42 share the exact same minimal boundary (17).** Direct inspection of the two prefixes' first 17 cells confirms this is not a coincidence of numbers: they take *different* routes for their first 7 cells (`d38`: `(4,4)→(4,5)→(4,6)→(5,6)→(6,6)→(6,7)→(5,7)`; `d42`: `(4,4)→(5,4)→(5,5)→(4,5)→(4,6)→(5,6)→(5,7)` — different cells visited, so genuinely different edge-axis-reuse footprints/states), both arrive at `(5,7)`, both take the *same* portal jump from there to `(7,3)`, and then both traverse the **identical** subsequent 10-cell corridor `(7,3)→(8,3)→(8,2)→(7,2)→(6,2)→(6,1)→(5,1)→(4,1)→(4,2)→(3,2)` before that shared point is where the fixed-prefix bisection independently certifies both as already-DEAD. This is a directly verified instance of two structurally different beam states independently rediscovering the same compact dead cause (something about that corridor, given the state on entry) — the strongest, most concrete form of the recurrence phenomenon this workstream question asks about, not just a shared coarse category.

Four further sampled candidates (d24, d29, d33, d40) pass through the *same* narrow board region with minor local route variations (e.g. `(5,2)` instead of `(6,1)`) and have brackets numerically consistent with the same boundary (their own bisections abstained before resolving an exact value, so this is suggestive, not confirmed).

R02733's bisection did not resolve a single exact minimal boundary within the 90s budget (all 15 non-abstain-mechanic cases there halted on an abstain) — plausibly because its 7 portal pairs (vs. R00046's 4) enlarge the padded CP-SAT horizon and make the shorter, more-open truncated prefixes materially harder to decide in the time given. No recurrence claim is made for R02733 beyond the coarse mechanic-family bucket; this is an honest gap, not evidence against recurrence there.

### Wasted-work context for the one confirmed recurrence pair

Read directly from the already-retained trace (no new compute): cumulative beam-search node-expansion work at depth 16 (the shared 17-cell sealed point) was 14,573 of R00046's eventual 67,018 total nodes (~22%). By the time the d38 and d42 lineages were actually culled (depths 38 and 42), cumulative work had reached 56,844 and 64,844 respectively — i.e. **~78% of this entire solve's total node-expansion work occurred after at least one lineage already sat on a fixed, exact-provably-dead corridor.** This number is offered as scale context, not a precise per-lineage cost: a beam-search step advances the whole width-2000 frontier together, so this is aggregate work across everything the beam carried during that span, not compute attributable solely to these two candidates (this collector does not retain enough per-node lineage detail to isolate that). It is a real, sourced bound on how early the first confirmed-dead cause appeared relative to how much total computation followed it, not a claim about how much of that total was itself wasted.

## Addressing the single-trajectory framing risk directly

Before finalizing, I explicitly checked the concern that the 30 sampled candidates might be one continuous already-dead trajectory per level, resampled at multiple depths, which would make "28/30 share a cause" trivial. The independence check above (exhaustive prefix/extension comparison across all pairs, in both levels) found **zero** such relationships — every one of the 30 candidates is a distinct beam lineage. The d38/d42 pair additionally demonstrates cause-sharing across candidates with *different* early states (different cells visited before the shared corridor), which is a stronger, more specific finding than same-branch resampling would have been: it is two independently-arrived-at dead states sharing one small compact reason, not one dead state's fate counted twice.

## Interpretation and disposition

- The already-closed simple-scalar-descriptor route (`reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md`) and the B1/B2 ranking-failure finding are not reopened or relitigated here; this diagnostic builds on both as settled premises.
- Recurrence of a compact sound dead cause is **real** — directly verified once, via two independent branches sharing an identical minimal boundary and an identical connecting corridor, with a substantial (though aggregate, not per-lineage) share of total solve work occurring after that shared cause was already sealed.
- Recurrence is **not shown to be material at population scale**. This diagnostic sampled 30 candidates from 2 levels and got a full, non-abstained cause resolution for only 4 of them; one dominant coarse mechanic-family bucket (28/29) is too generic by itself to license a reuse-mechanism cause key, and the one genuinely specific, verified recurrence instance is a single existence proof, not a measured rate. I cannot estimate what fraction of the 431 residual class-5 levels exhibit this same early-commitment-poisons-a-long-tail-of-depth pattern, nor what fraction of *aggregate* search work across the residual population it represents — that is squarely the next question, and two levels cannot answer it.
- **No reuse/cache/nogood mechanism should be implemented from this evidence.** That bar (`docs/solver-research-question-relations.json`'s own constraint: "measure recurrence and wasted work before building a cache") is not met — an existence proof is not a rate.
- This also should **not** be closed as a flat negative the way the scalar-descriptor route was: that would misrepresent a genuine, verified positive instance as absence of signal. The honest disposition is **inconclusive-with-a-verified-positive-existence-proof**, gated on measuring prevalence before any implementation decision.

### Recommended smallest next step (not an implementation)

Before either implementing anything or closing this line: get a **cheaper or faster minimal-boundary resolution** method so a similarly small, cheap sample can produce fully-resolved (non-abstained) cause boundaries across *more* residual levels, not just confirm the phenomenon exists once. Two candidate directions, either small enough to stay diagnostic-only:

1. Raise the per-bisection-call time limit only for the specific truncated-prefix lengths that abstained (targeted re-tries, not a blanket increase) — cheap, no new tooling.
2. Replace some outer bisection steps with a cheap **necessary-condition** filter using the solver's own native replay/state primitives (e.g. a resource-count lower bound on the remaining requirement) before falling back to CP-SAT, so CP-SAT is only invoked where the cheap filter can't already decide — more tooling, but avoids the repeated-full-CP-SAT-solve cost that produced this run's abstains.

Only once such a pass shows recurrence is common (not just possible) and the aggregate wasted work is a material share of total residual-population search cost should the smallest sound solve-local reuse mechanism shape be prototyped: a per-branch check, keyed on a compact, verified-sufficient state signature (current cell plus whatever committed-resource fingerprint the extracted cause actually depends on — not a global cache, not a learned score, not exact identity), consulted cheaply before a lineage is allowed to keep expanding. That shape is deliberately not designed further here, per the task scope: it remains contingent on the prevalence measurement this diagnostic could not perform.

## Cost discipline

30 adjudicated candidates (within the prescribed 15–30 range) plus 104 auxiliary cause-extraction probe calls (134 CP-SAT calls total), ~2h20m combined wall time, dominated by the cause-extraction phase's 90s-timeout abstains on R02733's larger-horizon truncated prefixes. That asymmetry (near-full-length prefixes resolve in ~1-3s; short, high-freedom truncations can take the full 90s and still abstain) is itself part of the "is this material" judgment from the task brief: whatever compact-cause mechanism is eventually considered must not itself require repeated expensive CP-SAT-scale reasoning at runtime — it would need to be cheap enough to check on every lineage, which the exact-oracle-based extraction method used here explicitly is not (and was never meant to be; it's an offline diagnostic proxy for the runtime-legal signature, not a candidate for it).

## Reproducibility

- New scripts (read-only diagnostics, no solver production code touched): `scripts/stress/collect-class5-dead-cause-sample.mjs`, `scripts/stress/bisect-class5-dead-cause.mjs`.
- Committed artifacts: `reports/stress/class5-dead-cause-cases-001.json` (30 selected culled candidates + selection provenance), `reports/stress/class5-dead-cause-reference-001.json` (CP-SAT adjudication, 30/30 dead), `reports/stress/class5-dead-cause-bisection-001.json` (cause extraction: mechanic distribution + bisection results).
- Not committed (regenerable, too large): the two full retained-trace survival artifacts (~150MB each) and the regenerated atlas/freshness-audit JSON — regenerate with the commands in the Method section above (`--level-ids=R00046` / `--level-ids=R02733`, `--beam-width=2000 --node-budget=3000000 --include-stages --retain-all-removal-details --retain-ranked-pool-details`).
