# Fresh exact LIVE/DEAD sibling harvest result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — 75-state CP-SAT-labelled harvest across 25 independent Class-5 residual parents, plus a construction-method diagnostic and a bounded DEAD-core relaxation probe, current HEAD.
> **Decision:** the harvest supplies a real, reusable, well-provenanced exact-DEAD population (75 states, 25 independent parents, 0 correctness/input alarms) — nearly 19x the exhausted 4-state B2 set. It does **not** supply any exact-LIVE Class-5 siblings: the seeded goal-distance-guided legal-walk construction produced 0/75 LIVE outcomes at three depth fractions (0.35/0.55/0.75) and, in a follow-up check, 0/24 resolved LIVE outcomes even at depth-fraction 0.1 (~8 steps from the gate). A separate gate-only feasibility check confirms this is a **construction-method artifact, not a residual-structure finding**: 2/5 tested Class-5 levels are genuinely CP-SAT-feasible from scratch, yet the same heuristic still produced a DEAD state within its first ~8 steps on one of them. A bounded 38-query size-1 DEAD-core relaxation pass on one parent's 3 harvested DEAD states found **zero** single-commitment causal cores (vs. B2's 3/4) — consistent with, and likely explained by, the same construction confound (states are DEAD from generic self-trapping the must-cross/must-pass relaxation vocabulary cannot fix, not from one missed obligation).
> **Remaining gate:** a materially better sibling-construction method (using the real production search technique/scorer, not a naive heuristic walk) is needed before DEAD-core core-size/type recurrence or "spares LIVE" testing can be trusted on Class-5. This is a larger, separate engineering task and is handed off rather than attempted further here.
> **Evidence role:** reusable research asset acquisition (population) plus discovery (construction-method diagnostic, bounded DEAD-core probe). No solver treatment is authorized.
> **Population identity:** 25 parents seeded-shuffled from the frozen 390-row Class-5 census population (`reports/stress/class5-separator-census-population-2026-09-17.json`), 3 siblings each at depth fractions 0.35/0.55/0.75 (`reports/stress/class5-fresh-sibling-harvest-population-2026-09-17.json`), CP-SAT-labelled (`reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json`).

## Why this ran

Per `docs/solver-fresh-dead-sibling-harvest-preflight.md` and the live queue's item 2, this is the active-next WS2 premise-acquisition gate after the separator/decomposition census (PR #1827). The B2 DEAD-core pilot (`reports/2026-09-17-dead-core-relaxation-pilot-001.md`) was informative but exhausted at 4 states; this harvest's job is to freeze a fresh, independently-selected, reusable population before any label is computed.

## What was implemented

- **`scripts/stress/class5-fresh-sibling-harvest.mjs`**: selects parent levels via a seeded shuffle of the frozen Class-5 census population (no label/outcome inspection), then constructs sibling prefixes via a bounded, seeded, goal-distance-guided legal walk using only real `getNeighbors`/`applyMove` primitives (so every move is fully legal by construction) with an intersection-budget-aware penalty (added after an initial pilot showed a pure distance-greedy walk burns the level's fixed intersection budget early — see "Construction-method finding" below). Stops at one of three fixed depth-fraction checkpoints (0.35/0.55/0.75 of `requiredLength`) decided before any label is computed. Records parent/commit, full prefix, endpoint, prefix/remaining length, intersection budget, pending must-cross/must-pass obligations, portal/filter/flipper counts, and selection provenance, per the preflight's required fields.
- **`scripts/stress/class5-fresh-dead-core-relaxation.mjs`**: generalizes the exhausted-B2 `dead-core-relaxation-diagnosis.mjs` to consume the fresh harvest's own per-state pending-obligation lists, running the existing `cpsat-reference-probe.py --relax` single-commitment hook against the fresh DEAD population.
- Exact labelling used the existing local `cpsat-explicit-prefix-reference.mjs` pipeline (OR-tools installed locally for this session; no repo change needed) — no new reference-model code.

## Result

**Harvest and labelling:** 75/75 states resolved (0 abstain), 0 correctness alarms, 0 input alarms (every prefix replayed as native-legal before CP-SAT ran). **75/75 exact-DEAD, 0/75 exact-LIVE**, across all three depth-fraction strata and all 25 independent parents.

**Construction-method finding (the actual headline result of this pass):** a pure-goal-distance-greedy, intersection-budget-aware legal walk is not a viable sibling generator for Class-5 residual levels — it essentially never lands on a LIVE state, even at very shallow depth.
- A first pilot (pure distance-greedy, no intersection awareness) also went 15/15 DEAD; adding the intersection-budget penalty changed nothing (still 75/75 DEAD, so intersection exhaustion was not the dominant cause).
- A follow-up depth-fraction-0.1 pass (≈8 steps from the gate, ample remaining length/intersection budget) still resolved 0/24 LIVE (1 timeout/abstain).
- A gate-only feasibility check (CP-SAT queried with just the 1-cell starting prefix, i.e. "is this level solvable at all") on 5 of the same parents found **2/5 genuinely feasible** (`R01600`, `R03147` both `live (optimal)`; `R01945`/`R01142`/`R02359` timed out at 120s — indeterminate, not DEAD). `R01600` and `R03147` are therefore levels the walk *could* have reached LIVE from, yet its own depth-0.1 sibling on each still came back DEAD. This rules out "Class-5 residual has no live region reachable this shallow" and confirms the walk itself is the limiting factor. (Validated as a pipeline issue, not a bug: the same pipeline correctly labelled a known-solved Corpus-2 level's real 30-step and 85-step prefixes `live (optimal)` — `reports/stress/class5-fresh-sibling-gate-only-feasibility-check-2026-09-17.json`'s sibling test document.)

**Bounded DEAD-core relaxation (38 queries, one parent `R01945`, its 3 depth-fraction siblings):** 0/38 single-commitment relaxations flipped to feasible, 0 correctness alarms. This is the opposite pattern from B2 (3/4 states had a clean size-1 core) and is best read as **confounded by the construction finding above**, not as an independent negative on the DEAD-core premise: states produced by a self-trapping naive walk are plausibly dead for diffuse/geometric reasons a single must-cross/must-pass relaxation cannot repair, rather than for one identifiable missed commitment. Per the operating model's "smallest evidence that can decide the next gate," the remaining 24 parents' relaxation queries were not run — this single parent's 38-query result was already sufficient to identify the confound and stop before spending more compute on a population whose construction is in question.

## Disposition against the preflight's stop conditions

- **DEAD-starved:** no — 75 independent-parent exact-DEAD states from one bounded pilot, far more than needed for a first DEAD-core pass, and reusable for the separator census's deferred family-3 (path-history-conditioned) measurement.
- **LIVE-starved (construction-specific):** yes, for this specific construction method. Not evidence of a residual-wide LIVE-starvation; the gate-only check shows genuine LIVE capacity exists and this walk simply cannot find it.
- **Core-negative:** not established — the 0/38 relaxation result is real but confounded, not a clean test of the DEAD-core premise on states with knowable causal obligations.
- **Sibling-starved:** no — parents readily provide diverse DEAD states; the limitation is specifically the LIVE half of the within-parent contrast this construction method needs.

## What survives / next gate

The **75-state fresh exact-DEAD population is a reusable asset** (per the preflight's own multi-consumer framing): it is large enough and independent enough to support the separator census's deferred family-3 measurement (path-history-conditioned separators, which need exactly this kind of frozen legal prefix) as a follow-up join against the already-committed census tooling, without new CP-SAT compute.

**DEAD-core core-size/recurrence and "spares LIVE" testing on Class-5 remain open**, but require a materially different sibling-construction method — one that uses the real production search technique/scorer (or an equivalently obligation-aware heuristic respecting must-cross axis balance and portal/flipper ordering), not a naive geometric greedy walk. Building and validating that is a separate, larger implementation effort: it needs either instrumenting the production dispatch to capture intermediate states (an observer-hook change to solver internals) or a materially smarter standalone heuristic, followed by its own construction-validity check before any DEAD-core conclusion can be trusted. This is handed off as the next gate rather than attempted further in this pass.

## Artifacts

- `scripts/stress/class5-fresh-sibling-harvest.mjs`, `class5-fresh-dead-core-relaxation.mjs`
- `reports/stress/class5-fresh-sibling-harvest-population-2026-09-17.json` — frozen 75-state population (pre-label)
- `reports/stress/class5-fresh-sibling-harvest-cases-2026-09-17.json` — CP-SAT case input
- `reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json` — exact labels (75/75 dead)
- `reports/stress/class5-fresh-sibling-gate-only-feasibility-check-2026-09-17.json` — construction-method validation (known-LIVE-prefix pipeline check + gate-only feasibility)
- `reports/stress/class5-fresh-sibling-depth-0.1-pilot-2026-09-17.json` — shallow-depth follow-up (0/24 live)
- `reports/stress/class5-fresh-dead-core-relaxation-2026-09-17.json` — bounded 38-query relaxation result
