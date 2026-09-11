# Scorer-vocabulary frontier witness-only result

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — corrected witness-only class-4/class-5 run 34559477019 on the frozen post-1,029 Corpus-2 residual
> **Decision:** the current 12-weight DFS/pre-apply scorer vocabulary is **not supported as a class-5 frontier discriminator**. Weight-invariant ambiguity is common, but class 5 is not enriched relative to class 4. Do not add/tune scorer terms or buy an exact-label campaign from this evidence; continue first-loss/future-feasibility diagnosis.
> **Remaining gate:** none for this tested form; reopen only if an independent first-loss mechanism nominates evaluator/rank loss, or an independently exact-labelled live/dead pair under this same evaluator convention becomes decision-bearing
> **Evidence role:** discovery
> **Selection:** selected after inspecting the current residual atlas and scorer architecture; the witness-only source, class-4/class-5 contrast and primary readouts were fixed before the valid population run. Run 34559477019 changed only the benchmark-report input shape after the prior attempt exposed a parser-contract defect.

## Question

Does the current twelve-weight `scoreMove` vocabulary systematically fail to express a viability-relevant distinction on the **388 class-5 no-known-rescuer levels**, more often than on the **200 class-4 near-control levels** that also have no tier-1 isolated winner but do have a historical Pathfinder rescuer?

The probe is intentionally narrower than "is scoring imperfect?". It asks whether scorer expressivity distinguishes the current algorithmic frontier from its best residual control.

## Frozen population and treatment

- production boundary: `reports/stress/capability-runs/34531412380/per-level-corpus2.json`;
- residual atlas: `reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json`;
- population: all **671** production misses from the frozen 1,029/1,700 Corpus-2 boundary;
- primary comparison: class 5 (388) versus class 4 (200);
- path source: **stored stress witness only**, one source family per level, deliberately excluding saved hints to avoid the known hint-density confound;
- evaluator: default **DFS/pre-apply** scoring convention, no structural ordering-bias term;
- diagnostic: zero profile plus twelve one-hot profiles, with reconstruction against the real active `scoreAndSort` score;
- epsilon: `1e-9`.

The diagnostic does not label unrecorded siblings dead. A legal sibling outside the stored witness remains reference-abstain.

## Participation / validity checks

Corrected run `34559477019` completed the intended population cleanly:

| Check | Result |
|---|---:|
| production report rows | 1,700 |
| solved rows in frozen production report | 1,029 |
| residual rows selected | 671 |
| residual levels scored | 671 / 671 |
| decisions visited | 73,059 |
| branching decisions with known continuation | 42,914 |
| known continuations absent from legal siblings | **0** |
| affine reconstruction failures | **0** |
| maximum reconstruction error | `1.1368683772161603e-13` |

The basis therefore participated fully enough to interpret the class contrast. The zero missing-known-continuation count is also a useful consistency check, but it is not a new general proof of prune soundness.

## Primary result

### Exact weight-vocabulary collisions

A collision means the known continuation and another legal sibling have the same intercept and the same twelve tunable components, so no reweighting of those twelve fields can distinguish them at that state.

| Metric | Class 4 | Class 5 | Class 5 - class 4 |
|---|---:|---:|---:|
| levels covered | 200 / 200 | 388 / 388 | — |
| levels with >=1 collision | 163 / 200 = **81.50%** | 299 / 388 = **77.06%** | **-4.44 pp** |
| collision decisions / branching decisions | 605 / 12,893 = **4.692%** | 883 / 24,728 = **3.571%** | **-1.122 pp** |

The direction is opposite the frontier-gap hypothesis: exact scorer ambiguity is somewhat **more common in class 4**, the near-control population that has a known historical rescuer.

### Weight-invariant fixed alternative preference

A stronger local condition occurs when all twelve tunable components match but the profile-independent intercept favors the other legal sibling. In that case no retuning of the twelve profile weights can reverse the pairwise scorer margin.

| Metric | Class 4 | Class 5 | Class 5 - class 4 |
|---|---:|---:|---:|
| levels with >=1 fixed alternative preference | 18 / 200 = **9.00%** | 36 / 388 = **9.28%** | **+0.278 pp** |
| fixed-preference decisions / branching decisions | 37 / 12,893 = **0.2870%** | 65 / 24,728 = **0.2629%** | **-0.0241 pp** |

At level scale the populations are essentially flat; at decision scale class 5 is fractionally lower. This does not support a class-5-specific fixed scorer bias.

## Overall residual totals

Across all 671 production misses:

- exact vocabulary collision decisions: **1,793** / 1,832 pairs;
- weight-invariant decisions of any relation: **2,043** / 2,092 pairs;
- weight-invariant alternative-preferred decisions: **148** / 152 pairs.

Those counts establish that scorer ambiguity is real and not rare. They do **not** establish that it explains the frontier. The control comparison says the opposite: these phenomena are broad properties of the search landscape/evaluator, not a distinguishing signature of class 5.

## Decision

Close the tested proposition:

> **Current 12-weight DFS/pre-apply scorer expressivity is not a useful discriminator between class 5 and class 4 on the frozen post-1,029 residual.**

Consequences:

1. do not launch profile/weight racing from this result;
2. do not add another hand-authored scoring term merely because collisions exist;
3. do not buy a new CP-SAT live/dead sibling-label campaign solely for these scorer rows;
4. keep existing exact dead-over-live cases as local beam/retention evidence, not as proof of a frontier-wide scorer-vocabulary deficit;
5. continue the higher-value all-known-basin first-loss / residual-feasibility program;
6. if later first-loss evidence independently points to scorer/rank loss, reuse this tooling on the nominated cohort rather than reopening the broad class-5 hypothesis.

This is a **negative discriminator result**, not a claim that the scorer is optimal or information-complete.

## Execution history and input-contract correction

The evidence path itself exposed a research-tool correctness defect that must remain visible in the record.

### Run 34559111172 — invalid population filter, diagnostic otherwise healthy

The first prespecified workflow invoked:

`--unsolved-only --report=reports/stress/capability-runs/34531412380/per-level-corpus2.json`

but the diagnostic scored all **1,700** Corpus-2 levels. The canonical per-level capability report stores results under top-level `rows`; the diagnostic reader accepted only top-level `levels` and silently produced an empty solved-id set. The class-4/class-5 atlas join happened to remain restricted to the correct atlas rows, but this run is **not** the primary population result.

### Run 34559348271 — failed before scoring

A temporary normalization wrapper incorrectly assumed the frozen report was either an array or `{levels:[...]}`. It failed before the diagnostic ran and contributes no outcome evidence.

### Run 34559477019 — authoritative corrected run

The temporary runner explicitly normalized the canonical `rows` array into the diagnostic's expected shape. It printed:

- 1,700 report rows;
- 1,029 solved;
- 671 unsolved;

and then scored exactly 671 levels. Treatment, witness source, comparator classes and readouts were unchanged from the prespecified run; only the input-contract defect was repaired.

The durable tooling follow-up should make unsupported report shapes fail loudly and accept the repository's maintained `rows` contract directly. `witness-rank-diagnostic.mjs` contains the same `rep.levels` assumption and should be corrected at the same seam. Historical conclusions should not be retroactively invalidated without checking which report shape each run actually used.

## Scope boundary

This probe reproduces the **DFS/pre-apply** evaluator convention. Beam and repair have important post-apply scoring paths, and repair deliberately retains different MustCross scoring behavior. A local weight-invariant relation here is not automatically a cross-action shared defect.

That boundary is especially important for the broader "fundamental gap" question: shared-capability evidence still requires recurrence across operationally distinct actions at the same future-relevant boundary, not just recurrence across nearby score profiles.
