# H1 residual event-feasibility / completion-regime prespecification 001

> **Status:** active
> **Last evidence:** 2026-09-16 — reconstruction of the B2 exact-prefix case structure (`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`, `reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`) and the existing full-mechanic CP-SAT reference model (`scripts/stress/cpsat-reference-probe.py`).
> **Decision:** freeze the H1 population, event vocabulary, and required model extension before any new CP-SAT compute, per the standing rule that a relational observer's candidate events must be nominated before labels are inspected.
> **Remaining gate:** implement and validate the described `cpsat-reference-probe.py` extension (event-pinning constraints), referee/replay-verify a small pilot, then run the frozen 28-state population and evaluate against the advancement bar below.
> **Production authority:** none. Design/prespecification only; no compute run yet, no solver code touched.

## Why this exists

`docs/solver-future-work.md` (premise-generation stack, priority 4) names H1 as the strongest currently independent Class-5 acquisition premise, per [`2026-09-16-class5-cross-resource-hypothesis-harvest-001.md`](2026-09-16-class5-cross-resource-hypothesis-harvest-001.md). That report defines H1's premise and lists candidate event families in prose but does not freeze an exact population, an implementable event definition, or the required tooling change. This report does that groundwork so H1 can run as soon as compute time is available, without inventing the population or vocabulary after results are already visible.

## Why the six-summary null does not settle H1

Re-reading the actual B2 case structure clarifies *why* `2026-09-12-future-feasibility-descriptor-rejoin-result-001.md`'s six scalar summaries overlapped so completely between LIVE and DEAD. Each B2 case is not an independent trajectory — it is one of several **candidate next moves (children) from one shared, fixed prefix**: the beam's actual top-ranked choice (`top-rank1`), a culled-but-known-supported alternative (`witness-culled`/`culled-supported-rankN`), and, for width-saturated rows, a retained-near-cutoff candidate. Because the prefix is identical across a level's sibling cases, generic remaining-obligation counts (how many must-cross axes are left, how much intersection slack remains, etc.) are necessarily near-identical between the LIVE and DEAD children too — a scalar "how much is left" summary is structurally incapable of separating them. What differs between siblings is a single move: *which interface/cell* that one step commits to. H1's premise — that the solver may not represent **which combinations and orders of future events remain jointly realizable** — follows directly from this structure, not merely by analogy.

This also sharpens what "individually realizable" must mean to be informative. Every must-cross/must-pass/portal obligation still pending at a LIVE state is, by definition of a valid solution, resolved by *some* completion — asking only "is obligation X resolved by some completion" therefore collapses back into the state's own LIVE/DEAD label and adds nothing. The informative relational questions are about **which interface/order** resolves an already-mandatory obligation, not whether it is resolved at all.

## Frozen population

The durable, committed, reproducible material is the **B2 exact-label set**: 28 exact-labelled prefix+child cases across **14 levels** (`S00001, S00028, S00030, S00035, S00048, S00095, S00099, S00108, S00120, S00140, R00058, R00060, R00064, R00104`), sourced from `data/stress/stress-levels.json` (corpus 1), with labels in `scripts/stress/class5-b2-exact-prefix-labels.mjs` and prefixes/children in `reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`.

Excluded from this population, with reasons recorded rather than silently dropped:

- **`R00087`** — present in the case file (2 cases) but has no resolved exact label in the committed projection. Do not exact-label it opportunistically mid-H1; if reopened, do it as its own dated, prespecified labelling pass.
- **The `R03229` microscope cases** (3 of the harvest report's quoted 31 states) — these lived only in `tmp/r03229-microscope-cases.json`, which no longer exists on disk. The original negative report itself called them "illustrative rather than rescuing a descriptor," so this is not a material loss; do not regenerate them merely to hit the original 31-count. If H1 needs more power later, prefer a fresh, independent expansion (see "Expansion" below) over reconstructing a lost ad hoc set.

This is **development/tuning evidence** relative to H1: it already informed the six-summary null and now informs this vocabulary. Any positive H1 result needs sample-independent confirmation on a materially different exact-labelled population before it can nominate a runtime descriptor, per the standing evidence-intensity rule.

## Level mechanic inventory (grounds vocabulary in what is actually present)

| Level | mustCross | mustPass | portals | flippingFilters |
|---|---:|---:|---:|---:|
| S00001 | 4 | 1 | 0 | 0 |
| S00028 | 3 | 3 | 2 | 1 |
| S00030 | 2 | 3 | 1 | 1 |
| S00035 | 3 | 2 | 3 | 1 |
| S00048 | 4 | 4 | 1 | 3 |
| S00095 | 0 | 0 | 1 | 0 |
| S00099 | 0 | 0 | 1 | 0 |
| S00108 | 0 | 2 | 1 | 0 |
| S00120 | 0 | 2 | 0 | 0 |
| S00140 | 0 | 2 | 0 | 2 |
| R00058 | 0 | 7 | 5 | 5 |
| R00060 | 0 | 0 | 0 | 5 |
| R00064 | 0 | 8 | 0 | 5 |
| R00104 | 2 | 5 | 0 | 0 |

Only construct an event for a mechanic type a given level actually has pending at the relevant state. Do not invent a must-cross event for S00095/S00099/S00120/R00060 (no must-cross there), etc. This keeps the vocabulary data-driven rather than a generic bundle applied uniformly.

## Frozen event vocabulary

All events are checked from the **one-step-extended state** (prefix + the case's own `child` move), using the same full-mechanic model `cpsat-reference-probe.py` already builds for whole-level LIVE/DEAD labelling, with one additional pinning constraint per query. Every query is a single extra CP-SAT solve on top of the existing, already-validated model — not a new model.

1. **E-CROSS-VIA(axis, entryCell)** — does a valid full completion exist in which must-cross axis `axis`'s second required crossing (`visits[axis] == 2`, already a hard constraint in the base model) occurs via a specific neighboring entry cell, i.e. `OR_t (x[t-1][entryCell] AND x[t][axis])`? Enumerate `entryCell` over the axis's actual legal neighbors on that level's board (typically 2-4). Only defined for levels with `mustCross > 0` at the state.
2. **E-PASS-VIA(cell, entryCell)** — analogous for a pending must-pass cell (`y[cell] == 1` already hard-constrained). Only defined where `mustPass` obligations remain.
3. **E-FLIP-ORDER(i, j)** — for two pending flipping filters `i, j`, is the model's own existing `before_ij` reified literal (already built into the flipper-parity encoding, `cpsat-reference-probe.py`'s "FLIPPING FILTER SUPPORT" section) satisfiable pinned `true`, and separately pinned `false`? This event type requires no new constraint at all — only exercising an existing internal variable that the base model already derives but never queries directly. Only defined where at least 2 flipping filters remain pending.
4. **E-PORTAL-PAIR(pairId)** — does a valid completion exist that uses portal pair `pairId` at all (`OR_t is_jump_pair[t] == pairId`, derived from existing `portal_pairs`/`is_jump` bookkeeping)? Only defined where `portals > 0` remain.
5. **E-ORDER(A, B)** — for a nominated pair of pending obligations of any of the above kinds (not all pairs — see selection rule), does a completion exist where A's satisfying timestep precedes B's, and separately where B precedes A? This is the direct generalization of `E-FLIP-ORDER` to cross-mechanic pairs and is only run where accepted-path evidence (existing referee-valid stored hints/human solutions for the same level, if any) nominates a specific order question — per the harvest report's own scoping, this event type stays inactive absent such a nomination rather than being applied to every pair combinatorially.

**Selection rule (fixed before any label is inspected):** for each of the 28 frozen states, enumerate every pending obligation of a represented type (from the mechanic inventory above) and construct exactly one `E-CROSS-VIA`/`E-PASS-VIA` query per obligation x per legal entry cell, one `E-FLIP-ORDER` pair per two pending flippers (not all C(n,2) — only adjacent-rank pairs by board distance, to keep the query count bounded and match the harvest report's "no feature sweep" instruction), and one `E-PORTAL-PAIR` per pending pair. `E-ORDER` runs only where an existing accepted-path artifact nominates a pair. Record the exact enumerated query list per state before running any solve, and freeze it as an artifact alongside the population.

## Required model extension

`cpsat-reference-probe.py` needs one additive capability: an optional `--pin` argument (or equivalent programmatic hook) that adds one extra boolean constraint to the already-built model before solving, expressed in terms of variables the model already constructs (`x[t][cell]`, `visits[c]`, `is_jump`, the flipper `before_ij` literals). This is deliberately **not** a new model — every variable an event query needs already exists in the base encoding; the extension only adds the ability to pin one of them and re-solve. Preserve the existing script's validation discipline unchanged: every claimed-SAT witness still gets `--emit-path` and a canonical-referee check before being trusted, exactly as the base LIVE/DEAD labelling already requires.

Do not modify the base model's mechanic encoding itself. If the pinning hook cannot cleanly reuse an existing internal variable for a given event type, that event type is not yet implementable cheaply and should be dropped from the frozen vocabulary rather than motivating a parallel model.

## Measurements

For each of the 28 frozen states, for each enumerated query:

- individual realizability (SAT/UNSAT) of the pinned constraint on top of the full feasibility model;
- for `E-ORDER`/`E-FLIP-ORDER` pairs, both directions' SAT/UNSAT (four possible joint outcomes: both realizable, only A-before-B, only B-before-A, neither);
- referee/replay validity of every emitted SAT witness;
- solver wall time / CP-SAT status (SAT/UNSAT/UNKNOWN-timeout) per query, since a timeout is indeterminate, not a negative.

## Advancement bar (frozen now, per the harvest report's own boundary)

Advance to a reusable offline event-feasibility microscope or narrowly justified runtime abstraction only if a compact categorical relation recurs across **unrelated parents** (not one level, not one obligation type) — for example, LIVE children preserving a joint order/interface regime that DEAD children systematically lack, while the six existing scalar summaries remain overlapping on the same states. A null result closes this bounded relational formulation and, per the harvest report, pushes acquisition toward a more expressive search mechanism rather than more feature accretion — it does not license widening the event vocabulary combinatorially before closing.

This result alone, positive or negative, does not authorize intersection blueprints, synthetic must-cross anchors, or a broad alternate solver, per the harvest report's own explicit boundary.

## Expansion (conditional, not authorized yet)

If the frozen 28-state population is underpowered (e.g., too few states carry a given mechanic type to say anything), the correct next step is a **fresh, independently labelled** exact-prefix set using the same B2-style same-parent-sibling construction on currently-residual Class-5 levels — not reconstructing the lost `R03229` cases and not reusing this population's own outcomes to justify which new levels to label (that would be selection on the dependent variable). Any such expansion is its own dated, prespecified pass, gated on this pilot showing the vocabulary is implementable and worth more power.

## What this report does not do

It does not run any CP-SAT query. It does not modify `cpsat-reference-probe.py`. It does not draw any LIVE/DEAD relational conclusion. It exists so that implementing the pinning hook and running the frozen 28-state x enumerated-query population is the entire remaining unit of work for the next session that picks up H1.
