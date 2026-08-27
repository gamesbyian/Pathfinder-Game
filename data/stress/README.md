# Solver stress corpora

These generated corpora exist to evaluate and challenge the production solver. They are not player
content and must not be optimized for aesthetics or fun. Dev Mode can explicitly load selected
stress assets for maker/admin inspection, but ordinary play, Review Mode, and publication do not use
these corpora.

This README is the **current corpus contract and workflow reference**. The former long-form README,
including the dated benchmark progression, bug investigations, and solver-development diary through
2026-08-20, is preserved verbatim at
[`../../docs/archive/snapshots/data-stress-README-2026-08-20.md`](../../docs/archive/snapshots/data-stress-README-2026-08-20.md). Do not use historical solve counts
from that snapshot as current capability evidence; use the current solver queue and generated reports.

## Corpus map

| Asset | Purpose |
|---|---|
| `stress-levels.json` | **Corpus 1**, 102 hypothesis-driven/generated levels. Contains per-level `stressMeta`, including construction witness and generation metadata. |
| `hints/<id>.json` | Corpus-1 saved hints, keyed by persistent level ID. |
| `stress-levels-random.json` | **Corpus 2**, 1700 uniform-random/solver-blind stress levels retained after the solvable migration and square-grid cleanup. |
| `hints-random/<id>.json` | Corpus-2 saved hints. |
| `stress-levels-envelope.json` | **Envelope stratum**, 200 levels generated within documented shipped-game object-count maxima. |
| `hints-envelope/<id>.json` | Envelope-stratum saved hints. |
| `regression-set.json` | Pinned solver regression canaries/targets for `stress:regression`. |
| `smoke-set.json` | Small fast stress subset. |
| `failure-inbox.json` | Tooling-side failure triage state. |

Generated analyses belong under [`../../reports/stress/`](../../reports/stress/). Raw run/shard logs
belong under [`../../logs/`](../../logs/). Some report artifacts are inputs to other research tools,
so `reports/stress/` is not a pure archive.

## Guarantees and provenance

All generated stress levels are intended to be valid and solvable by construction:

- every retained level carries a construction witness, whether the generator chooses that witness
  first or derives it from a topology/composition scaffold;
- gate, goal, exact required length, and exact required intersections derive from that witness;
- added mechanics are accepted only when the witness still passes the canonical referee;
- accepted wire data passes schema and structural validation;
- generation is reproducible from recorded seeds;
- the production solver does not receive `stressMeta` or the hidden witness when capability is tested.

Per-level authorship/generation provenance lives on `level.provenance`; hint provenance lives in the
normal hint model. A construction witness proves the puzzle is solvable. It is not cold-solver
capability evidence and may not guide production solving. See
[`../../docs/solver-level-blindness.md`](../../docs/solver-level-blindness.md).

Static filters are deliberately absent from these generated stress corpora; flipping filters are
supported. Historical generation defects and their fixes are recorded in the archived README snapshot
and relevant reports rather than repeated here.

## Corpus 1: hypothesis-driven

Corpus 1 combines several generation batches with different research intent. The important
experimental distinction is whether generation was solver-aware.

| Batch | Intent | Solver-awareness / overfit risk |
|---|---|---|
| A `historical-solver-pain` | Target historically expensive feature regimes. | solver-aware / high |
| B `structural-complexity` | Maximize mechanic interaction. | solver-blind / low |
| C `deceptive-simplicity` | Sparse mechanics, ambiguous/open geometry. | solver-blind / low |
| D `novel-topology` | Prefer witness geometry distant from published solution families. | solver-blind / low |
| E `anti-heuristic` | Deliberately oppose known attempt-policy thresholds/heuristics. | solver-aware / high |
| F `wild-witness` | Broad parameter-space coverage without a solver hypothesis. | solver-blind / low |

Do not use A/E alone to claim general solver improvement. They are useful adversarial diagnostics,
but repeated tuning against solver-aware batches carries obvious overfit risk.

## Second corpus: uniform-random, solver-blind

Corpus 2 exists specifically to provide a broader solver-blind counterweight to hypothesis-driven
Corpus 1. Treat it as the main large cold-capability population when the research question calls for
generalization across generated hard levels. Its level IDs are persistent identifiers, not semantic
features and never production policy inputs.

The corpus has been regenerated/cleaned historically. Do not infer content or chronology from the
numeric suffix of an `R` ID. Use the level data and provenance.

## Third stratum: in-envelope

The envelope stratum distinguishes "solver reaches outside the shipped complexity envelope" from
"solver handles complexity users can actually construct under documented object-count maxima."
Keep that distinction when interpreting Corpus-2 failures that exceed ordinary game limits.

## Alternative generator: topology composition

`scripts/stress/generate-topology.mjs` is a deliberately different solver-blind construction
family for transfer/challenge work. It does **not** use `generateWitness()`, the stochastic witness
walker shared by Corpus 1 and Corpus 2. Instead it:

- generates a randomized perfect maze first on a coarse 4x4 or 5x5 macro grid;
- takes that maze's diameter as a macro route;
- compiles the route into independent 3x3 Pathfinder path modules;
- uses a compact turn-module crossing gadget to create exact self-intersections without global
  search; and
- gives off-route/absent macro connections priority when placing blocks, so the construction
  topology influences the resulting puzzle rather than serving only as hidden provenance.

Every retained row still carries a construction witness and passes the normal schema, structural,
and canonical-referee checks. The production solver is never run during generation or candidate
selection. The v0.1 mechanic scope is intentionally bounded to blocks, MustPass, MustCross,
flipping filters, must-turn landmarks, geese, and false goals. It currently omits portals, static
filters, surround, adjacent-turn, and multi-gate levels rather than broadening machinery merely for
coverage.

This is **generator tooling, not a standing committed corpus**. By default it writes under `tmp/`.
Create or reserve a persistent population only for a specific research question. Its value is
distributional independence from the shared random-walk generator, not an entitlement to call every
sample an untouched holdout forever.

## Workflow

Use [`../../docs/tooling-catalog.md`](../../docs/tooling-catalog.md) for task-oriented tool selection.
Common local commands:

```bash
npm run stress:generate
npm run stress:generate-random
npm run stress:generate-topology
npm run stress:validate-witnesses
npm run stress:compare
npm run stress:smoke
npm run stress:benchmark
npm run stress:regression
npm run stress:solve-one
npm run stress:reduce-level
npm run stress:rank-levels
npm run stress:failure-inbox
npm run stress:lifecycle-failure-map
npm run stress:curate-dev-benchmark
npm run stress:solution-profile
npm run stress:solution-profile-compare
```

For expensive current population refreshes use
[`../../.github/workflows/solver-stress-refresh.yml`](../../.github/workflows/solver-stress-refresh.yml).
For isolated technique capability use `technique-census.yml` only when the current census no longer
answers the question. Family/variant research has its own canonical resource:
[`../../docs/variant-level-research.md`](../../docs/variant-level-research.md).

## Measurement rules

- Prefer deterministic/work-budget protocols from
  [`../../docs/solver-budget-determinism.md`](../../docs/solver-budget-determinism.md).
- A cumulative known-solution/hint ledger is not the same thing as a fresh cold capability run.
- A high-budget or primed historical solve does not prove ordinary production capability.
- Compare gains and losses, not only net count.
- Record machine-independent `workSpent` where applicable; wall time is operational evidence, not a
  portable budget currency.
- Use both corpora when a production-facing solver treatment might trade one population against
  another.
- When a broad robustness claim needs evidence beyond another draw from the Corpus-2 generator,
  prefer a prespecified sample from the topology-composition generator or another genuinely
  different construction family; record that difference explicitly rather than calling a new seed
  a new distribution.
- Do not quote solve totals from this README. Counts change quickly and belong in frozen run reports,
  baselines, and [`../../docs/solver-optimization-current-queue.md`](../../docs/solver-optimization-current-queue.md).

## Historical solver-work chronology

The old README accumulated many dated sections such as "Future solver work," shipped/reverted
snapshots, individual root-cause investigations, benchmark progressions, and retired batch workflow
notes. They remain valuable provenance but are not the corpus contract.

Use [`../../docs/archive/snapshots/data-stress-README-2026-08-20.md`](../../docs/archive/snapshots/data-stress-README-2026-08-20.md) when reconstructing that history,
then reconcile any conclusion against current code, the live solver queue, and the relevant dated
report before acting on it.
