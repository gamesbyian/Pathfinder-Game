# Variant-level research resource

Canonical reference for controlled level-family/variant research.

> **Active use:** the evidence-driven scheduling/allocation program in [`solver-scheduling-policy.md`](solver-scheduling-policy.md) is **ASAP / HIGH PRIORITY**. Family data is especially valuable for discovering generic routing boundaries, but family identity/outcomes remain offline evidence only.

## Research trove

The bulk dataset is **not on `main`**. Branch `claude/variant-levels-solver-insights-tpk4qg` holds roughly **2.5 GB** under `data/families/`, `logs/family-census/`, and `reports/families/`; `main` keeps reusable generators, analyzers, and workflows.

One audited wide artifact has **1,962 parents, 72,965 variants, 36,622 cold solves, and 78,429 attempt records**. Other campaigns bring the collection to roughly 96,000 variants. Cite the specific campaign/artifact rather than treating all variants as one table.

### Access

Use current `main` for code/instructions and the trove branch as read-only historical data. Do not run historical branch code as current authority. Prefer a separate worktree:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
```

Run current tools from `main` against the sibling data worktree. If a current tool assumes in-tree family data, add a data-root argument rather than switching execution to the old branch.

### Disposable point-query index

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

`.cache/family-index.json` is deterministic/disposable. It joins canonical family/manifest identity, generation metadata, and census evidence; groups coverage by parent; counts unevaluated variants; reads census JSON/JSONL and chunked wide-trove reports; and reports malformed/oversize evidence instead of silently accepting it. Older manifests without `schemaVersion`, run history, or implementation metadata remain readable.

Indexed family commands share `--trove-root=<path>`. Existing scripts with explicit `--manifest`, `--in-dir`, or result paths keep those narrower external-root interfaces.

Parent-hint replay also accepts `--trove-root=<path>` while reading/writing canonical parent corpora on `main`. `--save-hints` is the mutation gate; omission is dry-run.

### Evaluation-run provenance

New decision-bearing family solver runs use `scripts/experiment-manifest-lib.mjs::validateFamilyEvaluationRunManifest`, recording solver commit/ref/dirty state, tool/workflow, corpus/family selection, trove identity, solver mode/profile/config/flags, work/node/wall budgets, strict-total-work mode, seeds, one-based shard identity, timestamps, outputs, and source-generation artifacts. Store shard manifests under `logs/family-census/**/manifest.json` with repository-relative output paths.

The family index groups valid shards by `runId`, checks declared shard completeness, and attaches provenance to output evidence. Invalid declared schemas are diagnostics. Historical evidence remains readable with missing fields `null`/unknown; never infer a uniform invocation contract across old artifacts.

This extends the shared experiment-manifest system; historical artifacts are not rewritten for cosmetic uniformity. When citing trove evidence, record branch/commit or artifact hash. Generation provenance does not make historical solver results current; re-test decision-bearing cliffs on current code.

## What variants are for

Scientific unit: **parent + controlled transformation + solver-behavior change**. Sibling rows are correlated, not independent samples.

| Question | Useful evidence |
|---|---|
| Orientation sensitivity | Rotation/reflection solve/work cliffs. |
| Why canonical fails | Close solved siblings/local mutants isolating a boundary. |
| Fix robustness | Inspiring parent + held-out siblings + unrelated families. |
| Technique routing | Family-conditioned DFS/beam/repair/admissible-order outcomes and isolated probes. |
| Scheduler routing/allocation | Controlled feature changes that flip action value or useful budget depth; train/tune/test by parent family and convert findings into legal generic runtime descriptors. |
| Beam loss boundary | Parent/sibling pair + lineage/pair-divergence trace. |
| Repair behavior | Badness, retreat depth, seeds/operators across close relatives. |
| Open-space effects | Re-embedded cousins/density sweeps. |
| Routing/classifier rules | Parent-family train/test split; never split siblings across folds. |
| Invariant falsification | Symmetry families/local mutants. |
| Oracle/reducer targets | Family solve/work cliffs and robust hard families. |
| Parent hint enrichment | Inverse-transform symmetry paths or referee-tested non-symmetry paths, saved with provenance. |
| Benchmark selection | Sample by parent/family, not raw variant count. |

For exact-length scaling use `npm run solver:req-length-sweep`; broader multi-feature scaling remains open.

## Scheduler-specific family discipline

Variants are a counterfactual feature-discovery resource, not a runtime lookup table. For scheduler work:

- compare close siblings to identify what generic structural change flips technique/config success, failure mode, or useful budget depth;
- look for boundaries such as density/open-space changes, must-cross/objective changes, portal structure, orientation-dependent search bias, and retention/diversity changes;
- hold out whole parents when fitting/tuning any classifier, threshold, score, or rule;
- validate discovered rules on unrelated canonical parents, not merely additional siblings;
- guard against accidental family identification through overly specific geometric fingerprints;
- re-run decision-bearing historical cliffs on current code before using them to tune policy;
- never expose parent/variant IDs, family outcome, or historical winner labels to the cold scheduler.

A family-derived rule earns production consideration only after it can be stated in legal level/state features and survives held-out-parent, matched-work validation. See [`solver-scheduling-policy.md`](solver-scheduling-policy.md).

## Experimental rules

1. **Parents are independent units:** report row and parent-family counts.
2. **Use full identity:** `(parentCorpus, parentId, variantId)`.
3. **Separate puzzle from solver evidence:** symmetry siblings are puzzle-isomorphic; non-symmetry children may change solution space.
4. **Witnesses prove solvability, not cold capability:** hints, winners, IDs, history, and generation metadata may label research but cannot steer production solves. See [`solver-level-blindness.md`](solver-level-blindness.md).
5. Preserve construction and solver provenance.
6. Re-test historical cliffs on current code.
7. Hold out by parent family for learned/tuned rules.
8. Diagnose orientation dependence before production rotate/mirror retries; it usually signals search bias.
9. Keep bulk generated evidence off `main`; promote reusable code and compact conclusions.

## Tools

| Need | Entry point |
|---|---|
| Generate variants | `npm run family:generate` |
| Build/query index | `npm run family:index`, `family:show`, `family:query`, `family:coverage` |
| Join solve/mutation effects | `npm run family:analyze` |
| Boundary synthesis | `npm run family:boundary-report` |
| Replay child path on parent | `npm run family:parent-hint-replay` |
| Parent/variant divergence | `npm run stress:family-pair-divergence` |
| Known-solution behavior | `npm run stress:solution-profile-compare` |
| Family-conditioned winners | `npm run solver:winning-attempts` |
| Large campaign | `.github/workflows/family-wide-trove.yml` |
| Technique probe | `scripts/method-probe.mjs` / `.github/workflows/method-probe-sweep.yml` |
| Reduce pathological level | `npm run stress:reduce-level` |

The family index is the canonical disposable query layer; extend it rather than making investigation-specific indexes. Canonical JSON/census artifacts remain evidence authority. Start with [`tooling-catalog.md`](tooling-catalog.md); historical designs live under [`archive/snapshots/`](archive/snapshots/README.md).

## Research priority

The trove is evidence, not backlog. **Near-term family work should preferentially support the ASAP scheduler program when it can sharpen a real routing/allocation boundary**, while still following the ranked solver queue and evidence gates. Use [`solver-scheduling-policy.md`](solver-scheduling-policy.md) for the active scheduling program, [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) for current solver priorities/dispositions, [`solver-research-operating-model.md`](solver-research-operating-model.md) for method, and [`../reports/README.md`](../reports/README.md) for dated evidence.
