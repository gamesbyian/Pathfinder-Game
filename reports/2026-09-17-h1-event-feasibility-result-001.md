# H1 residual event-feasibility / completion-regime result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-17 — frozen 449-query population executed against the 28-state B2 exact-label set (`reports/2026-09-16-h1-event-feasibility-prespec-001.md`), current HEAD.
> **Decision:** the frozen event vocabulary (`E-CROSS-VIA`, `E-PASS-VIA`, `E-FLIP-ORDER`, `E-PORTAL-PAIR`) does **not** clear the prespec's advancement bar. No compact categorical relation recurs across unrelated parents: the one type with a large, clean effect size (`E-FLIP-ORDER`, 36% realizable overall) shows a directional pattern that is **opposite** between independent parents (`S00048`/`R00060` favor one direction, `R00104`/`R00064` [see below] favor the other), and the other three event types show substantial but geometrically featureless partial-realizability (an explicit distance-to-goal proxy found no separation). This closes the specific bounded relational formulation this prespec froze; it does not close H1's broader premise (see "What survives" below).
> **Remaining gate:** per the prespec, a null here "pushes acquisition toward a more expressive search mechanism rather than more feature accretion" — not a wider event-vocabulary sweep on this population. The next queue item (minimal DEAD-core / minimum-relaxation diagnosis) is the prespecified successor.
> **Evidence role:** confirmation of a fully prespecified experiment. The event vocabulary, selection rule, and advancement bar were frozen in the prespec before this session ran any query; only the model extension (the `--pin` hook) and its correctness were validated before the population ran, per the prespec's own instruction ("implement and validate the described extension... then run the frozen 28-state population").
> **Population identity:** the 28 already-committed, already-exact-labelled B2 states (`scripts/stress/class5-b2-exact-prefix-labels.mjs`, `reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`, corpus `data/stress/stress-levels.json`) — no new labelling, no new states. 449 queries enumerated from those 28 states per the prespec's selection rule, frozen before any CP-SAT run (`reports/stress/h1-event-feasibility-queries-2026-09-16.json`).
> **Selection history:** query enumeration used only each state's own pending-obligation bookkeeping (via the native solver's `createState`/`applyMove`) and static board adjacency — never an exact label or solver outcome. The only selection-pressure event in this pass was tuning the CP-SAT per-query time budget (45s, then 150s for the residual timeouts) after observing the resolution rate; the query set, event types, and advancement bar were unchanged throughout.
> **Inference scope:** this closes the specific frozen event vocabulary/selection rule as a source of one universal descriptor. It does not test other event families, does not bound how common blocked-interface structure is on the residual population, and does not license widening today's vocabulary combinatorially (the prespec's own explicit boundary).

## Why this ran

`docs/solver-optimization-workstreams.md`'s "Current premise execution order" names the frozen H1 prespec as the second Class-5 acquisition item, immediately after the controlled topology pilot (`reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md`, PR #1821). The prespec (`reports/2026-09-16-h1-event-feasibility-prespec-001.md`) had frozen the population, event vocabulary, and advancement bar but explicitly left "implement and validate the `cpsat-reference-probe.py` extension... then run the frozen 28-state population" as the remaining unit of work. This report does that.

## What was implemented and validated

- **`--pin=<json>` hook in `scripts/stress/cpsat-reference-probe.py`**: adds one extra boolean constraint to the already-built full-mechanic CP-SAT model, expressed only through existing model variables (`x[t][cell]`, `is_jump[t]`, the flipper `before_ij` literals). Implements `cross-via`, `pass-via`, `flip-order`, `portal-pair`. `E-ORDER` is not implemented: no accepted-path artifact nominates a specific cross-mechanic pair for any of these 28 states, and the prespec explicitly keeps that event type inactive absent such a nomination.
- Validated each event type against `--check-witness` (the entire known witness pinned): a pin consistent with the witness stays `OPTIMAL`/live reproducing it; a pin contradicting the witness correctly returns `INFEASIBLE`.
- **`scripts/stress/h1-event-feasibility-query-builder.mjs`**: replays each of the 28 frozen states through the native solver's own `createState`/`applyMove` primitives to determine pending must-cross/must-pass/flipper/portal obligations, then enumerates the frozen vocabulary per the prespec's selection rule (one query per pending obligation × legal board entry cell for `cross-via`/`pass-via`; one query per adjacent-board-distance-rank pending-flipper pair for `flip-order`; one query per pending portal pair). 449 queries frozen before any CP-SAT run.
- **`scripts/stress/h1-event-feasibility-runner.mjs`**: executes frozen queries through the `--pin` hook, referee-validating every claimed-live witness via `Solver.validateCandidatePath` exactly as the base LIVE/DEAD labelling pipeline requires.
- **`scripts/stress/cpsat-explicit-prefix-reference-lib.mjs`/`.mjs`**: after this population ran locally, added a generic `pin` passthrough field to the existing `{corpus, cases}` case format so any future pinned-event population can run through the existing sharded `cpsat-explicit-prefix-reference.yml` Actions workflow instead of a local run (see "Execution notes" below).

## Execution and coverage

The first pass (45s/query, local, 4-way concurrency) resolved only 89/449 (19.8%) queries; the rest hit the time limit (`UNKNOWN`), concentrated almost entirely in larger/mechanically denser levels. A 5-query canary at 200s resolved all 5 in 43-109s, showing the limiting factor was the time budget, not intractability, per the operating model's rule to size solver-side caps from representative evidence. The 360 still-abstained queries were rerun at 150s/query; 331 resolved. Combined: **420/449 (93.5%) resolved, 0 correctness alarms, 0 dead-state consistency violations** (every event query on an already-DEAD base state correctly came back infeasible, confirming the model extension is sound — infeasibility is monotonic under an added constraint).

## Result

| Event type | Resolved (LIVE states) | Realizable | Rate |
|---|---:|---:|---:|
| `E-CROSS-VIA` | 74 | 66 | 89.2% |
| `E-PASS-VIA` | 247 | 218 | 88.3% |
| `E-PORTAL-PAIR` | 20 | 17 | 85.0% |
| `E-FLIP-ORDER` | 22 | 8 | 36.4% |

`E-FLIP-ORDER` pins "does a completion exist where the board-distance-**farther**-ranked pending flipper is crossed before the **nearer**-ranked one." Broken out by parent level (all four are independent parent families):

| Level | Resolved | Realizable | Reading |
|---|---:|---:|---|
| `S00048` | 6 | 0 | farther-before-nearer never realizable |
| `R00060` | 7 | 0 | farther-before-nearer never realizable |
| `R00058` | 5 | 2 | mixed |
| `R00064` | 6 | 6 | farther-before-nearer **always** realizable |

`S00048` and `R00060` show a clean "nearer flipper must come first" pattern; `R00064` shows the **opposite** pattern with equal cleanliness. This directly rules out one fixed board-distance-based ordering rule as a universal descriptor — the direction depends on board-specific structure the ranking-by-distance abstraction does not capture, not on the event type itself being uninformative.

For `E-CROSS-VIA`/`E-PASS-VIA` (89% and 88% realizable, meaning roughly 1 in 9 events blocked even in an otherwise-LIVE state — non-trivial internal structure beyond the state's own label), a direct test of the simplest candidate geometric descriptor — whether the entry cell is closer to or farther from the goal than the target cell — found no separation (76.4% realizable when closer, 75.4% when farther; `reports/stress/h1-event-feasibility-analysis-2026-09-16.json`). This mirrors the earlier six-scalar-summary null (`reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md`): a simple distance/direction proxy does not separate realizable from blocked interfaces here either.

## Interpretation

Per the prespec's frozen advancement bar ("a compact categorical relation recurs across unrelated parents... for example LIVE children preserving a joint order/interface regime that DEAD children systematically lack"), this population is a **null**:

- the one event type with a strong, clean effect (`E-FLIP-ORDER`) does not recur in one direction across unrelated parents — it recurs in *both* directions, which is evidence against a single fixed ordering descriptor, not for one;
- the three high-realizability event types show real but geometrically featureless blocked-interface structure; the one cheap candidate descriptor tested (distance-to-goal) does not explain it.

## What survives

This null closes the *specific bounded relational formulation* the prespec froze (this event vocabulary, this selection rule, this advancement bar) — it does not settle H1's broader motivating premise, and per the prespec's own text a null here "pushes acquisition toward a more expressive search mechanism rather than more feature accretion." Two things are worth preserving as capability-memory evidence rather than re-deriving later:

1. Even within LIVE states, ~11-15% of geometrically-plausible single-interface commitments (`cross-via`/`pass-via`/`portal-pair`) are already ruled out by downstream structure invisible to must-cross/must-pass/portal bookkeeping alone — consistent with, and independent evidence for, the same underlying phenomenon the controlled topology-fork pilot found (`reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md`).
2. Flipper crossing order is real, board-dependent structure (a 3-of-4-levels-clean, 1-of-4-mixed pattern) with no fixed universal direction; a future descriptor for it would need board-specific geometry, not a rank-order heuristic.

## Execution notes for future similar populations

This population initially ran through a bespoke local runner (`scripts/stress/h1-event-feasibility-runner.mjs`) because no existing tool supported `--pin`; the first pass then needed a second, larger-time-budget local pass after 80% of queries timed out at 45s on this session's 4-core sandbox. `scripts/stress/cpsat-explicit-prefix-reference.mjs`/`-lib.mjs` now accept an optional `pin` field in the generic `{corpus, cases}` format, so a future pinned-event population (an H1 vocabulary follow-up, or similar DEAD-core/H2/H3 work needing the same hook) can dispatch through the existing sharded `cpsat-explicit-prefix-reference.yml` Actions workflow instead of local compute.
