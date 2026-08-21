# Variant-level research resource

Canonical current reference for controlled level-family and variant research.

## Existing research trove

The large generated dataset is **not on `main`**. It lives on branch `claude/variant-levels-solver-insights-tpk4qg`, with roughly **2.5 GB** under `data/families/`, `logs/family-census/`, and `reports/families/`. Main contains reusable generators/analyzers/workflows; do not merge the bulk trove merely to inspect it.

One audited wide artifact contains **1,962 parents, 72,965 variants, 36,622 cold solves, and 78,429 attempt records**. Other campaigns bring the broader collection to roughly 96,000 variants. Quote the specific campaign/artifact rather than treating all generated variants as one homogeneous table.

### Access model

**Keep current `main` as the execution and instruction environment. Treat the trove branch as read-only historical data.** Do not switch the working checkout to the trove branch: its code, docs, root prompts, counts, and investigation state predate current `main` and are not current authority.

Prefer a separate worktree:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
```

Run current tools from the `main` worktree and pass/read data from the sibling worktree when the tool supports an external path. If a needed current tool assumes in-tree family data, adapt the tool to accept a data-root argument rather than running historical branch code.

### Disposable point-query index

Build the shared derived index with current-main code while pointing at the data worktree:

```bash
npm run family:index -- --trove-root=../pathfinder-variant-research
npm run family:show -- --trove-root=../pathfinder-variant-research --variant-id=F00110-01
npm run family:show -- --trove-root=../pathfinder-variant-research --parent-corpus=data/levels.json --parent-id=P00110 --variant-id=F00110-01
npm run family:query -- --trove-root=../pathfinder-variant-research --corpus=corpus2 --mode=symmetry
npm run family:query -- --trove-root=../pathfinder-variant-research --operator=transform
npm run family:query -- --trove-root=../pathfinder-variant-research --object-type=blocks
npm run family:query -- --trove-root=../pathfinder-variant-research --evaluated=false
npm run family:coverage -- --trove-root=../pathfinder-variant-research --corpus=corpus2
```

The compact `.cache/family-index.json` is disposable and deterministic: it omits build timestamps
and absolute worktree paths. It records canonical family/manifest paths,
full parent/family/variant identity, generation implementation metadata when present, and joins
machine-readable census evidence. Coverage is grouped by parent and explicitly counts unevaluated
variants. It consumes both census JSON/JSONL and the canonical chunked wide-trove attempt reports;
malformed evidence is reported in index diagnostics rather than silently ignored. Older manifests
without `schemaVersion`, per-run history, or implementation metadata remain readable.
Malformed/non-family manifest classifications and evidence files above the parser safety limit are
also explicit diagnostics; an index never silently presents those artifacts as evaluated coverage.
All family commands using the index share `--trove-root=<path>`; omission keeps ordinary in-tree
use unchanged. Research scripts that already accept explicit `--manifest`, `--in-dir`, or result
paths remain external-root capable through those narrower arguments and were not given redundant
flags.

The wide parent-hint replay batch also accepts `--trove-root=<path>` for read-only manifests and
variant hints while continuing to read/write canonical parent corpora in the current-main checkout.
`--save-hints` remains the explicit mutation gate; omission is a dry run.

When citing trove evidence, record the branch/commit or artifact hash used. Generation manifests are durable evidence about the generated family; they do not make historical solver results current. Re-test decision-bearing solver cliffs on current code.

## What variants are for

Treat a **parent + controlled transformation + solver-behavior change** as the scientific unit. Sibling rows are correlated evidence, not independent benchmark samples.

| Question | Useful evidence |
|---|---|
| Orientation sensitivity | Rotation/reflection siblings; solve/work cliffs reveal representation/search sensitivity. |
| Why a canonical level fails | Close solved siblings/local mutants isolate a boundary while preserving most structure. |
| Robustness of a fix | Inspiring parent + held-out siblings + unrelated families. |
| Technique complementarity/routing | Family-conditioned DFS/beam/repair/admissible-order outcomes and isolated probes. |
| Beam loss boundary | Parent/sibling pairs followed by lineage or pair-divergence tracing. |
| Repair behavior | Badness, retreat depth, seeds/operators across close relatives. |
| Open-space effects | Re-embedded cousins and density sweeps. |
| General routing/classifier rules | Train/test by parent family; never split siblings across folds. |
| Invariant falsification | Symmetry families and controlled local mutants. |
| Expensive oracle/reducer targets | Family solve/work cliffs and robust hard families. |
| Parent hint enrichment | Inverse-transform symmetry paths or referee-test non-symmetry paths; save only valid parent paths with provenance. |
| Benchmark selection | Sample by parent/family, not raw variant count. |

Broader scaling questions can use variants too. `npm run solver:req-length-sweep` is the existing exact-length instrument; broader multi-feature scaling remains open research.

## Experimental rules

1. **Parents are independent units.** Report row and parent-family counts.
2. **Use full identity:** `(parentCorpus, parentId, variantId)`, not bare `variantId`.
3. **Separate puzzle from solver evidence.** Symmetry siblings are puzzle-isomorphic; solve differences measure finite heuristic search. Non-symmetry children can alter solution space.
4. **Witnesses prove solvability, not cold capability.** Hints, prior winners, IDs, history, and generation metadata may label offline research but cannot steer a production solve. See [`solver-level-blindness.md`](solver-level-blindness.md).
5. **Preserve provenance** for construction witnesses and solver discoveries.
6. **Re-test historical cliffs on current code.** Solver behavior drifts.
7. **Hold out by parent family** for learned/tuned rules.
8. **Diagnose orientation dependence before adding production rotate/mirror retries.** It usually indicates a deeper search bias.
9. **Keep bulk generated evidence off `main`.** Promote reusable code and compact conclusions only.

## Existing tools

| Need | Entry point |
|---|---|
| Generate variants | `npm run family:generate` (new manifests include source hash and Git identity) |
| Build/query disposable trove index | `npm run family:index`, `family:show`, `family:query`, `family:coverage` |
| Join solve/mutation effects | `npm run family:analyze` |
| Family-boundary synthesis | `npm run family:boundary-report` |
| Replay child path on parent | `npm run family:parent-hint-replay` |
| Parent/variant search divergence | `npm run stress:family-pair-divergence` |
| Known-solution behavior | `npm run stress:solution-profile-compare` |
| Family-conditioned winners | `npm run solver:winning-attempts` |
| Large family campaign | `.github/workflows/family-wide-trove.yml` |
| Technique probe | `scripts/method-probe.mjs` / `.github/workflows/method-probe-sweep.yml` |
| Reduce pathological level | `npm run stress:reduce-level` |

The family index is the canonical disposable point-query layer. Extend it rather than creating an
investigation-specific index; canonical JSON and census artifacts remain the evidence authority.

Start with [`tooling-catalog.md`](tooling-catalog.md) before adding infrastructure. Detailed historical designs/experiments are frozen under [`archive/snapshots/`](archive/snapshots/README.md).

## Research priority

The trove is evidence, not a backlog. Use [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) to choose the current question, [`solver-research-operating-model.md`](solver-research-operating-model.md) for method, and [`../reports/README.md`](../reports/README.md) for dated evidence.
