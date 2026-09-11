# WS1 structural technique-response stage 3: bounded isolated-technique resolve 001

> **Status:** concluded-positive for both frozen pairs
> **Last evidence:** 2026-09-11 — isolated single-technique resolves of the four exact frozen configs (`beam|score=objectiveFirst|bias=none|width=5000|retention={plain,mechanic-buckets}` and `beam|score=intersectionHarvest|bias=none|width=5000|retention={plain,mechanic-buckets}`) against the existing family variants of one parent per pair, at a matched 20,000,000-work-unit budget per attempt (a 10x escalation from an initial 2,000,000 pilot that hit a 0-solved ceiling for both configs on both parents — see "Budget calibration" below).
> **Decision:** stage 3 **succeeds for both pairs**: controlled family transformations (existing generator modes only, no new variant generation) produce real, per-sibling response flips between `plain` and `mechanic-buckets` retention, recurring across most of each parent's existing family transform modes. The two parents flip in **opposite net directions** — `plain` dominates on `R02687` (objectiveFirst pair), `mechanic-buckets` dominates on `R02094` (intersectionHarvest pair) — which is itself informative: the retention advantage is parent/structure-dependent, not a universal ranking of one retention policy over the other.
> **Remaining gate:** advance only to the next earned stage per the extension ladder — source-controlled solution-space mediation or bounded operational first divergence — for these two pairs specifically. Do not resolve a third pair or generate new variants.
> **Evidence role:** discovery/diagnosis (bounded family resolve, existing material only). Not a production routing change; not a population-scale claim beyond these two parents.

## Why now

[`2026-09-11-structural-technique-response-family-query-001.md`](2026-09-11-structural-technique-response-family-query-001.md) established that stage 3 was blocked on a data-shape gap (the family census records only whole-ladder winners, not per-technique outcomes) rather than a null result, and specified the exact bounded resolve needed: run the two pairs' four exact configs against the existing family variants of one parent per pair. This report executes that specified resolve.

## Method

**Population:** existing family-dataset material only, via the `claude/variant-levels-solver-insights-tpk4qg` worktree (`git worktree add ../pathfinder-variant-research`), no new variant generation. One parent per pair, chosen for intermediate (non-ceiling) whole-ladder coverage per the family-query report's own candidate list: `R02687` (30/47 whole-ladder solved) for the objectiveFirst pair, `R02094` (23/47) for the intersectionHarvest pair. Each parent has 5 existing family transform modes (`constrained-shuffle`, `group-reshuffle`, `local-mutant`, `swap`, `symmetry`), 47 variants total per parent.

**Execution:** `scripts/method-probe.mjs` (already built for exactly this purpose — "run ONE attempt config directly against a level set, bypassing the full ladder"), pointed directly at each family's raw-level JSON file in the worktree (`--corpus=<family file>`, `--levels=all`), one config at a time (`--only=<canonical attempt identity>`), `--work-budget` for a deterministic matched-work ceiling. No new tooling was needed or added.

```
node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
  --corpus=../pathfinder-variant-research/data/families/corpus2/family-R02687-<mode>.json \
  --levels=all --only='beam|score=objectiveFirst|bias=none|width=5000|retention=<plain|mechanic-buckets>' \
  --work-budget=20000000 --budget-ms=120000 --out=<result file>
```

(same pattern for `R02094`/`intersectionHarvest`, and for each of the 5 family-mode files per parent — 20 invocations per pair, 40 total.)

### Budget calibration

An initial pilot at `--work-budget=2000000` (2M) produced **0/47 solved for every config on both parents**, with every attempt hitting `work-budget-reached` in ~1.5s wall-clock (not a natural exhaustion) — an inadequate-work confound, the same failure mode Line B's repair-side check independently ran into this session. Escalated 10x to 20,000,000 work units (still well under the technique-census T1 tier's own 50,000,000-node convention) before drawing any conclusion, per the standing rule against reopening/closing forms on an under-provisioned budget.

## Result

### `R02687` — `beam:objectiveFirst@5000`, plain vs mechanic-buckets

| family mode | n | plain solved | mechanic-buckets solved | per-sibling flips |
|---|---:|---:|---:|---:|
| constrained-shuffle | 10 | 0 | 0 | 0 (ceiling — neither config solves any variant at this budget) |
| group-reshuffle | 10 | 9 | 8 | 1 |
| local-mutant | 10 | 8 | 7 | 3 |
| swap | 10 | 7 | 4 | 7 |
| symmetry | 7 | 7 | 0 | 7 (complete inversion) |
| **total** | **47** | **31** | **19** | **18** |

### `R02094` — `beam:intersectionHarvest@5000`, plain vs mechanic-buckets

| family mode | n | plain solved | mechanic-buckets solved | per-sibling flips |
|---|---:|---:|---:|---:|
| constrained-shuffle | 10 | 0 | 8 | 8 (complete inversion, opposite direction from R02687's) |
| group-reshuffle | 10 | 1 | 4 | 5 |
| local-mutant | 10 | 4 | 5 | 3 |
| swap | 10 | 4 | 5 | 1 |
| symmetry | 7 | 7 | 7 | 0 (ceiling — both configs solve every variant) |
| **total** | **47** | **16** | **29** | **17** |

## Interpretation

Both pairs clear the stage-3 bar: **real per-sibling response flips recur across most existing family transform modes** (4/5 modes for each parent), not merely an aggregate solve-count difference that could be explained by one lucky/unlucky variant. This directly answers the stage-3 question — controlled family transformations *do* produce a predicted response flip between `plain` and `mechanic-buckets` retention for both frozen pairs.

The **direction reverses between parents**: `plain` wins 31-19 on `R02687`, `mechanic-buckets` wins 29-16 on `R02094` — with each parent showing one family mode as a *complete* inversion in its own favored direction (`symmetry` 7-0 for plain on `R02687`; `constrained-shuffle` 0-8 for mechanic-buckets on `R02094`). This is evidence *against* a simple "one retention policy is generically better" story and *for* a structure-dependent mediator — consistent with the original discovery population's own leading effects (`portals` for the objectiveFirst pair, `requiredIntersections` for the intersectionHarvest pair) plausibly interacting with what each family transform mode does or does not preserve about portal/intersection structure.

Each parent also has one family mode sitting at a ceiling with zero discriminating power at this budget (`constrained-shuffle` for `R02687`, `symmetry` for `R02094`) — these modes are not informative for this specific question at 20M work units and should not be read as "no effect"; they are simply uninformative here (one all-zero, one all-solved).

## First mediator check: static object counts (negative, as expected)

Cross-tabbed each per-sibling flip against the variant's own static portal/must-cross counts and `requiredLength`/`requiredIntersections` (zero new solver compute — a direct read of each variant's own JSON, already on disk in the worktree). Every flip on both parents shares **identical** counts with its own non-flipped siblings (`gr`/`lm`/`swap`/`sym`/`cs` transforms permute or locally perturb existing objects; they do not add/remove portals or must-cross cells). This rules out object-count confounding as the mediator by construction — it was never a live hypothesis given how these transform modes work, but it is worth recording so a future pass does not re-derive it. **This confirms the real mediator must be positional/order-based** (portal-use/order diversity, must-cross order rigidity, or a solution-path-structure property), consistent with the extension audit's own candidate list.

## Second mediator check: portal-use timing (also negative)

Also free (the `solution` path for every solved attempt is already recorded in the stage-3 result files): for each flip, decoded the winning config's own solved path via `Solver.prepareLevelForSolver`/`level.portalMap` and computed each portal terminal's first-use step as a fraction of path length, averaged per variant. This does **not** separate winners from non-winners within a family mode — e.g. `R02094`'s `gr` family shows bucket-winning variants spanning fractions 0.28-0.65 with no separation from the one plain-winning variant (0.40); `R02687`'s `swap` family shows plain- and bucket-winners overlapping almost exactly (0.54-0.56 for both). A simple "how early portals get used" descriptor is not the mediator.

This is a genuine, if unglamorous, negative result: the two cheapest, zero-compute candidate descriptors (object counts, portal-use timing) both fail to separate winners. The real mediator — if one exists as a compact descriptor rather than an idiosyncratic per-variant effect — likely needs something more structural: must-cross visitation *order* relative to portal use (not just portal timing alone), or a basin/family-membership descriptor over the *set* of portals/must-cross cells actually used together, per the extension audit's own list. This is genuinely the next stage's own work (source-controlled solution-space mediation), not completed by either check in this report.

## What this does and does not establish

- **Establishes:** the plain-vs-mechanic-buckets structural association from the original discovery census is not an artifact of aggregate whole-ladder bookkeeping — it reproduces as genuine per-sibling behavior on existing, controlled family material for both frozen pairs.
- **Does not establish:** *why* the direction reverses between parents, or which structural mediator (portal-use/order diversity, must-cross order rigidity, objective-satisfaction depth, prefix/basin diversity — the extension audit's own candidate list) explains it. That is the next earned stage (source-controlled solution-space mediation), not this report.
- **Does not** license generating new variants for either parent, testing a third pair, or building any routing/selector logic from this result yet.

## Artifacts

- [`reports/stress/ws1-stage3-isolated-resolve-001/`](stress/ws1-stage3-isolated-resolve-001/) — 40 `method-probe.mjs` result files (2 parents x 5 family modes x 2 retention configs), at both the falsified 2M budget and the informative 20M budget.
- No new tooling: `scripts/method-probe.mjs` used unmodified, pointed at family-worktree files instead of a standard corpus file (already supported — it reads any JSON array of raw levels).
