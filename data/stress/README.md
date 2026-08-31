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
Corpus 1. It is now the main large **development/capability laboratory** for solver research. Because
its misses, technique responses, residuals, and archetypes have been repeatedly mined, it should not
be described as untouched generalization evidence for new treatments merely because each solve is
level-blind. Fresh samples from the same generator can still provide sample-independent confirmation.
See [`../../docs/solver-evaluation-evidence.md`](../../docs/solver-evaluation-evidence.md). Its level
IDs are persistent identifiers, not semantic features and never production policy inputs.

The corpus has been regenerated/cleaned historically. Do not infer content or chronology from the
numeric suffix of an `R` ID. Use the level data and provenance.

## Third stratum: in-envelope

The envelope stratum distinguishes "solver reaches outside the shipped complexity envelope" from
"solver handles complexity users can actually construct under documented object-count maxima."
Keep that distinction when interpreting Corpus-2 failures that exceed ordinary game limits. It uses
the same witness-first random generator family as Corpus 2, so an untouched envelope sample is useful
confirmation/in-envelope challenge evidence but is not, by itself, cross-generator transfer.

## Alternative generator: topology composition

`scripts/stress/generate-topology.mjs` is the supported solver-blind construction family for
distributionally independent challenge/transfer work. It does **not** use `generateWitness()`, the
stochastic witness walker shared by Corpus 1 and Corpus 2. Instead it:

- generates a randomized perfect maze first on a coarse 4x4 or 5x5 macro grid;
- takes that maze's diameter as a macro route;
- compiles the route into independent 3x3 Pathfinder path modules;
- uses a compact turn-module crossing gadget to create exact self-intersections without global
  solving; and
- preferentially places blocks from absent/off-route macro structure so the scaffold changes the
  final puzzle rather than existing only as provenance.

Every retained row still carries a construction witness and passes schema, structural, and canonical
referee checks. The production solver is never run during generation or candidate filtering.

The v0.1 scope is intentionally bounded to **12x12/15x15 perfect-maze-diameter
topologies** with blocks, MustPass, MustCross, flipping filters, must-turn landmarks, geese, and
false goals. Portals, static filters, surround, adjacent-turn, and multi-gate levels are currently
omitted. It also does not represent arbitrary macro cycles, multiple competing macro routes, large
open-region grammars, or other topology families merely because those could fit on the same grid.
Therefore transfer claims from this generator are limited to the mechanics, scales, and topology
family it actually represents.

**Suitability rule:** before a decision-bearing run, check
[`../../docs/solver-evaluation-evidence.md#suitability-and-expansion-gate`](../../docs/solver-evaluation-evidence.md#suitability-and-expansion-gate).
If the candidate requires an omitted mechanic/scale/topology, do not interpret non-participation or a
null as negative evidence. Use another independent source or expand the generator first. Conversely,
do not expand it merely for completeness when v0.1 already challenges the property at issue.
Expansion is earned when a ranked question is genuinely blocked by a missing capability or a broad
claim requires that additional distributional coverage.

The generator is durable tooling, **not a standing committed corpus**. By default it writes under
`tmp/`. Generate a persistent or locked sample only when a ranked research question earns it. Do
not tune generator parameters in response to candidate solve outcomes.

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
npm run stress:measure-solver
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
- Apply development/confirmation/transfer roles from
  [`../../docs/solver-evaluation-evidence.md`](../../docs/solver-evaluation-evidence.md). A new seed
  from the same generator can confirm a selected candidate; a cross-distribution claim needs a
  materially different source such as topology composition or independent human/editor material.
- Do not quote solve totals from this README. Counts change quickly and belong in frozen run reports,
  baselines, and [`../../docs/solver-optimization-workstreams.md`](../../docs/solver-optimization-workstreams.md).

## Historical solver-work chronology

The old README accumulated many dated sections such as "Future solver work," shipped/reverted
snapshots, individual root-cause investigations, benchmark progressions, and retired batch workflow
notes. They remain valuable provenance but are not the corpus contract.

Use [`../../docs/archive/snapshots/data-stress-README-2026-08-20.md`](../../docs/archive/snapshots/data-stress-README-2026-08-20.md) when reconstructing that history,
then reconcile any conclusion against current code, the live solver queue, and the relevant dated
report before acting on it.
