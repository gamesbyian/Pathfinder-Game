# Variant-level research resource

This is the canonical current reference for Pathfinder's controlled level-family and variant research.

**The large generated trove is not on `main`.** It lives on the research branch
`claude/variant-levels-solver-insights-tpk4qg`. The branch retains roughly **2.5 GB** of generated
family data and research outputs under `data/families/`, `logs/family-census/`, and
`reports/families/`. Reusable generators, analyzers, CLIs, and Actions workflows were promoted to
`main` deliberately; the bulk generated artifacts were deliberately left on the research branch.
Treat that branch as an existing research dataset, not as forgotten scratch data and not as content
to merge wholesale into production.

An audited wide artifact described in the preserved research record contains **1,962 parents,
72,965 variants, 36,622 cold solves, and 78,429 full attempt records**. Other family campaigns bring
the broader collection to roughly the 96,000-variant scale discussed in the research material. When
quoting a result, identify the specific artifact/campaign rather than treating every variant ever
generated as one homogeneous table.

## Access without polluting the working branch

Prefer a separate worktree or explicit branch-qualified reads. For example:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
```

Do not merge the research branch simply to inspect its data. Main contains the reusable machinery;
the worktree contains the heavy evidence.

| Research-branch location | Contents |
|---|---|
| `data/families/` | Generated family corpora and manifests, including Corpus-1/Corpus-2 families and campaign-specific families. |
| `logs/family-census/` | Raw family-census/run material. |
| `reports/families/` | Human-readable and generated family analyses, census summaries, and experiment outputs. |

## What the trove is good for

The variants are most valuable as **controlled relationships**, not as tens of thousands of
independent benchmark rows. The scientific unit is a parent plus a recorded transformation plus the
change in solver behavior.

| Question | Useful family evidence |
|---|---|
| Is the solver orientation-sensitive? | Rotation/reflection siblings. Solve-status cliffs or large work spreads indicate representation sensitivity, not harder puzzles. |
| Why does one canonical level fail? | Nearby solved siblings/local mutants can isolate a boundary while keeping much of the puzzle fixed. |
| Is a proposed solver fix robust? | Test the inspiring parent plus held-out siblings and unrelated parent families; a one-level rescue that damages relatives is a warning. |
| Which techniques have complementary capability? | Compare family-conditioned DFS/beam/repair/admissible-order outcomes and attempt telemetry, then confirm with isolated technique probes. |
| Is attempt routing or budget allocation wrong? | Compare which techniques succeed on siblings, whether canonical attempted them, and how much work each received. Historical winners nominate tests; they cannot become level-ID policy. |
| Is a heuristic tied to one geometry or mechanic arrangement? | Local mutants, swaps, group reshuffles, constrained shuffles, density sweeps, and re-embeddings vary one controlled dimension at a time. |
| Where does beam search lose a viable family? | Use family boundaries to nominate parent/sibling pairs, then winning-lineage or pair-divergence tooling to locate the first meaningful search divergence. |
| What does repair respond to? | Compare repair success, badness trajectories, retreat depth, and seed/operator behavior across close relatives instead of unrelated levels. |
| Does extra irrelevant space matter? | Re-embedded cousins and density sweeps vary navigable space while preserving more central structure than unrelated-level comparisons. |
| Can a classifier/routing rule generalize? | Train/evaluate with parent-family grouping. Never let siblings from one parent leak across train/test and masquerade as independent generalization. |
| Can a claimed invariant be falsified? | Symmetry families are strong invariance tests; local mutants provide near-counterexamples for scoring, pruning, and representation claims. |
| Which hard cases deserve expensive oracle/reducer work? | Rank family solve-status cliffs, cost cliffs, robust hard families, and config switches before spending on CP-SAT or detailed traces. |
| Can variant-discovered paths enrich research? | Inverse-transform symmetry solutions or referee-test non-symmetry paths against the parent; save only valid parent paths with provenance. |
| How should benchmarks be selected? | Sample by parent/family rather than row count so one prolific parent cannot dominate an evaluation. |

Variants can also support broader scaling research: board/open area, required length, intersection
pressure, mechanic density, portal count, and related features can be studied against solver work.
`npm run solver:req-length-sweep` is the existing narrow exact-length instrument; broader
multi-feature scaling remains a research question rather than a completed general model.

## Experimental discipline

1. **Parents are the independent units.** Siblings share construction history and often a witness.
   Report both row counts and parent-family counts. Do not claim N independent confirmations from N
   siblings of one parent.
2. **Use the full identity tuple.** Wide-family analysis must key variants by
   `(parentCorpus, parentId, variantId)`, not bare `variantId`; the historical wide artifact contains
   repeated bare variant IDs under different parents.
3. **Separate puzzle evidence from solver evidence.** A symmetry transform is isomorphic as a puzzle;
   a solve difference is evidence about the finite heuristic search. A non-symmetry child may also
   alter the solution space.
4. **Preserved witnesses prove validity, not solver capability.** Hidden witnesses, saved hints, prior
   winning configs, exact level IDs, and historical solve status may label offline research. They may
   not control a production cold solve. See [`solver-level-blindness.md`](solver-level-blindness.md).
5. **Respect provenance.** Variant construction witnesses and solver-discovered paths have different
   provenance. Use `--save-hints` when solve discoveries are meant to become durable research data,
   and preserve the repository's hint provenance model.
6. **Re-test historical cliffs on current code.** Family artifacts preserve valuable evidence, but
   solver behavior can drift after scoring, pruning, budget, or attempt-policy changes.
7. **Prefer family-balanced held-out tests.** For learned or tuned rules, split by parent family before
   fitting or selecting thresholds. A random row split is leakage.
8. **Do not operationalize orientation dependence as a retry first.** Diagnose recurring solver bias
   before adding a production rotate/mirror fallback. Representation dependence is usually a clue to
   a deeper search weakness.
9. **Do not copy the bulk trove to `main`.** Promote reusable code, compact decision-bearing summaries,
   and validated conclusions; keep large generated evidence on the research branch.

## Tools already on main

| Need | Existing entry point |
|---|---|
| Generate controlled variants | `npm run family:generate` |
| Join family solve results / mutation effects | `npm run family:analyze` |
| Build/read family boundary evidence | `npm run family:boundary-report` |
| Referee-test a variant-discovered path on its parent | `npm run family:parent-hint-replay` |
| Compare a selected parent/variant search divergence | `npm run stress:family-pair-divergence` |
| Compare known-solution behavior | `npm run stress:solution-profile-compare` |
| Analyze family-conditioned winning attempts | `npm run solver:winning-attempts` |
| Run a large family campaign | `.github/workflows/family-wide-trove.yml` |
| Probe one technique over a nominated population | `scripts/method-probe.mjs` / `.github/workflows/method-probe-sweep.yml` |
| Shrink a nominated pathological level | `npm run stress:reduce-level` |

Start with [`tooling-catalog.md`](tooling-catalog.md) before adding variant-specific infrastructure.
The previous detailed system/design/experiment documents are preserved as frozen snapshots under
[`archive/snapshots/`](archive/snapshots/README.md). Their old top-level paths remain as short
compatibility pointers, but this document owns current family/variant guidance.

## Relationship to current solver research

The trove is an evidence source, not a backlog. Use
[`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) to decide which solver
question is worth answering now, then use family evidence when it can sharpen, falsify, or generalize
that question. Use [`solver-research-operating-model.md`](solver-research-operating-model.md) for
broader sequencing and [`../reports/README.md`](../reports/README.md) for dated experiment evidence.
