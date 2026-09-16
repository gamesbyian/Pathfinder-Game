# Class-5 controlled open-path topology fork pilot: result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — frozen candidate construction (`scripts/stress/class5-topology-fork-construct.mjs`) plus exact-labelling (`scripts/stress/cpsat-explicit-prefix-reference.mjs`) executed this session, current HEAD.
> **Decision:** the controlled open-path topological-fork premise is **EARNED**: 4 exact-resolved LIVE/DEAD-discordant pairs across 2 independent human/editor parent families (`P00124`, `P00137`), all control checks valid, every discordant pair phase-distinct by exactly one full turn. Per the preflight's frozen rule this earns a **microscope step**, not production routing of raw phase coordinates.
> **Remaining gate:** microscope the discordant pairs to derive the smallest generic runtime-safe descriptor of "which side of a board puncture the prefix passed," then a bounded solver pilot and independent confirmation before any promotion consideration. Tracked in `docs/solver-future-work.md`.
> **Evidence role:** discovery/confirmation-adjacent. The premise itself was prespecified (`docs/solver-class5-controlled-topology-acquisition-preflight.md`, frozen 2026-09-16, not authored this session); parent/anchor/segment selection used only board geometry and mechanic-progress bookkeeping, never a solver outcome or exact label, per that preflight's guardrails. A 2-parent replication population (`P00137`, `P00140`) was added mid-session after the first 3-parent population landed in the preflight's own "discovery only" tier (discordance confined to one family) — this is the preflight's own prescribed next step ("sharpen a preregistered replication on untouched parents"), not a redesign after seeing an unwanted result.
> **Population identity:** `data/levels.json` at commit `9216c0b` (current `main` at session start); 5 published human/editor-authored parents (`provenance.origin === 'human'`, `confidence === 'certain'`): `P00075, P00104(withdrawn — see below), P00124, P00136, P00137, P00140`. `P00104` was withdrawn after both its constructed pairs abstained (CP-SAT `SKIPPED (static filters not encoded)` — `P00104` uses 3 static, non-flipping filters, which `cpsat-reference-probe.py` deliberately does not encode) and replaced with `P00075`, which has zero static filters; this is an exact-tooling-compatibility substitution, not a solver-outcome-based selection.
> **Selection history:** parent choice used only mechanical construction admissibility (does a same-length, disjoint, phase-distinguishing alternate route exist, and is the parent's mechanic set supported by the exact-label tool) — never a solver run or an exact label. See "Parent selection" below for the full audit trail.
> **Inference scope:** this establishes that the open-path phase captures *some* completion-feasibility information not visible to matched non-history state, on two independent human-authored boards, for one specific equal-length opposite-side-of-a-single-puncture construction. It does not establish a runtime descriptor, does not bound how common the effect is, and does not license production use of the raw phase observer.

## Why this ran

`docs/solver-optimization-workstreams.md`'s "Current premise execution order" names the controlled open-path topology pilot as the first item in the current WS2 Class-5 acquisition queue, following the fixed-endpoint homotopy coverage-null (`reports/2026-09-13-class5-homotopy-prefix-census-result-001.md`) and the natural-evidence join's 28-row/26-stratum, zero-natural-contrast finding. `docs/solver-class5-controlled-topology-acquisition-preflight.md` froze the experiment contract (population, matching rules, exact-label protocol, independence rules, stop/advance thresholds) but was not yet executed. This report executes it, implementing only the missing construction/execution tooling the preflight called for.

## What was implemented

Two new scripts (no existing tool constructed fork pairs or joined them to labels; confirmed by search before writing):

- **`scripts/stress/class5-topology-fork-construct.mjs`** — the candidate-construction operator. For each requested published human/editor parent: replays each stored witness through the native solver's own `createState`/`getNeighbors`/`applyMove` primitives (the same incremental legality/bookkeeping the production solver uses, exposed via `SOLVER_TESTING_API`), finds anchor pairs `(A,B)` whose witness segment touches no must-pass/must-cross/flipper/portal cell and leaves the level's own mechanic-progress fingerprint (`ints`, `mpVisitedMask`, `mustCrossMask`+`crossCounts`, `flipperUsedMask`, `portalJumps`, landmark masks) unchanged between `A` and `B`, then runs a bounded DFS — disjoint from every cell used elsewhere in the prefix (keeps both routes self-intersection-free) and from the original segment's own interior cells (forces genuine route divergence rather than a trivial near-copy) — for a same-length alternate `A→B` route. A candidate is kept only if the two full prefixes' `observeOpenPathTopology` phases differ by more than `1e-12` turns on at least one puncture, matching progress exactly, sharing `endpointGeometryKey`/`referenceSetIdentity`, and using no portal jump. Every accepted candidate freezes both full prefixes, the control fingerprint, and the phase data *before* any exact-label request — the script never imports or calls an exact-label tool. Deterministic (no RNG): rerunning against the same commit reproduces the identical candidate set.
- **`scripts/stress/class5-topology-fork-analysis.mjs`** — read-only join of frozen candidates to `cpsat-explicit-prefix-reference.mjs` label rows, applying the preflight's frozen interpretation thresholds mechanically (construction-starved / exact-tooling-limited / premise-earned / discovery-only / tested-construction-negative).

Exact-labelling itself reused the existing `scripts/stress/cpsat-explicit-prefix-reference.mjs` unchanged, run locally with `ortools` installed in-session (`--format=cases`, `--shard-count=1` — no sharded Actions workflow needed for a 10-pair/20-case population).

## Parent selection

Per the preflight ("Prefer published parents directly. Only create a descendant when the parent lacks a usable topological fork... Never accept or reject descendants based on solver outcome or exact label"): started from 3 published human parents (`P00073, P00104, P00116`), found 0 admissible pairs on 2 of them within a generous bounded search (all attempted anchor windows either touched a forbidden cell or their alternate-route DFS was exhausted or non-phase-distinguishing) and 2 on `P00104`. To avoid fabricating a descendant merely because the first 3 picks were unlucky, the construction operator was run (read-only, construction-admissibility only — no solver/label involved) across all 30 published `confidence:certain` human parents to find which already admit a natural fork; 9 did. Three (`P00104, P00124, P00136`) were selected from that admissible set for the first frozen population. `P00104` was then withdrawn (see status block) for an exact-tooling incompatibility unrelated to its construction admissibility, and replaced with `P00075`. This substitution and the later 2-parent replication population (`P00137, P00140`, chosen from the same pre-existing admissible-set survey) are the only parent-selection decisions made after any evidence was inspected, and in both cases the inspected evidence was tooling coverage or the preflight's own prescribed discovery→replication path — never a solver outcome or exact label used to pick which board to keep.

## Population and frozen candidates

10 admissible pairs / 20 exact-label requests across 5 parent families (within the preflight's 12-pair/24-label ceiling), frozen before labelling:

- `reports/stress/class5-topology-fork-candidates-2026-09-16.json` — `P00075` (2 pairs), `P00124` (2), `P00136` (2)
- `reports/stress/class5-topology-fork-replication-candidates-2026-09-16.json` — `P00137` (2), `P00140` (2)

Every pair: `maxPhaseDelta = 1.0` turns (both routes pass on opposite sides of the same single puncture, close to the preflight's preferred "approximately one full turn" case), `controlFingerprintMatch = true`, `endpointGeometryKeyMatch = true`, `portalExcludedBoth = true`, both prefixes self-intersection-free.

## Exact labels

`reports/stress/class5-topology-fork-exact-labels-2026-09-16.json`, `reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json`, joined in `reports/stress/class5-topology-fork-analysis-2026-09-16.json`. 20/20 cases resolved (0 abstain, 0 correctness/input alarms); every `live` witness referee-validated (`Solver.validateCandidatePath`) with no rejection.

| Parent | Pairs | Labels (original/alternate) | Discordant |
|---|---:|---|---:|
| `P00075` | 2 | live/live, live/live | 0 |
| `P00124` | 2 | live/dead, live/dead | 2 |
| `P00136` | 2 | live/live, live/live | 0 |
| `P00137` | 2 | live/dead, live/dead | 2 |
| `P00140` | 2 | live/live, live/live | 0 |

**4 discordant pairs across 2 independent parent families** clears the preflight's earned bar (≥3 discordant pairs across ≥2 independent parents, all controls valid, members phase-distinct).

## Case studies (why this is a clean contrast, not an artifact)

- **`P00124-w1-A0-B15`** (11×11 board, gate `(3,6)`, goal `(9,6)`, blocks at `(4,4)` and `(9,9)`, a 2×2 must-cross cluster at `(6,6)-(7,7)`): both 15-step routes run from the gate to `(7,9)`. The original goes south immediately (`(3,6)→(3,9)→...→(8,9)→(7,9)`, i.e. below the `(4,4)` block) and is `LIVE`; the alternate goes north first (`(3,6)→(3,2)→(5,2)→...→(7,8)→(7,9)`, above the `(4,4)` block) and is `DEAD`. Puncture `196611` (the `(4,4)` block, 0-based `(3,3)`) shows phase `-0.160` turns on the original vs. `+0.840` on the alternate — a full-turn difference from passing the block on opposite sides.
- **`P00137-w1-A2-B9`** (10×10 board, gate `(2,3)`, goal `(10,8)`): both 8-step routes run from `(3,4)` to `(2,2)`, one hugging the board's left edge (`x=1` column) west of the goose at `(4,3)`, the other looping east through `x≈5` and back, east of the same goose. West is `LIVE`, east is `DEAD`.

Both cases isolate a single point obstacle with routes of identical length reaching an identical cell, differing only in which side of that one obstacle they pass — exactly the preflight's target construction, not a confound from multiple simultaneous differences.

## Interpretation and boundary

This is real evidence that two states matched on every non-history mechanic field the current runtime already tracks (must-pass/must-cross progress, portal usage, landmark masks, self-intersection count) can still differ in ground-truth completion feasibility depending on **which side of a board obstacle the path already took** — a fact the six previously-tested scalar future-feasibility summaries (`reports/2026-09-12-future-feasibility-descriptor-rejoin-result-001.md`) and the fixed-endpoint homotopy formulation (coverage-null; `reports/2026-09-13-class5-homotopy-prefix-census-result-001.md`) could not observe. Per the preflight's own explicit boundary:

- this earns a **microscope step** (inspect the first-loss/completion boundary; derive the smallest generic runtime-safe descriptor of the distinction) — **not** production routing of the raw phase coordinate;
- 4 discordant pairs is a real signal but a small one; the population is still small enough that a broader, differently-constructed confirmation remains warranted before any solver intervention;
- both discordant families used a single-puncture, single-obstacle construction; whether the effect recurs for multi-obstacle punctures or longer segments is untested.

## Next gate

Per `docs/solver-future-work.md`'s premise-generation stack, item 1 now reads "microscope earned"; the queued next step is to derive a compact, generic, runtime-legal descriptor of "which side of a nearby puncture the current path already committed to" from the 4 discordant cases above (plus, if useful, a small confirmatory extension using the same construction operator on untouched parents), then test whether that descriptor predicts completion feasibility beyond generic difficulty/work before any bounded solver pilot. This does not block `docs/solver-optimization-workstreams.md`'s next-in-line item (the frozen H1 event-feasibility prespec), which is an independent Class-5 acquisition premise per the premise-generation stack and does not require this microscope step first.
