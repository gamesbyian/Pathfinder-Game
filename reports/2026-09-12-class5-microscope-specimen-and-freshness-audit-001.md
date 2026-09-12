# Class-5 microscope specimen and freshness audit 001

> **Status:** superseded
> **Last evidence:** 2026-09-12 — the freshness reconciliation and `R03229` exact microscope were completed in the branch-reconciliation report.
> **Decision:** this report remains the historical corrective audit that invalidated R03351 and established the freshness gate; final specimen selection, provenance reconciliation, and microscope disposition now live in `2026-09-12-class5-microscope-branch-reconciliation-001.md`.
> **Remaining gate:** none in this report. Follow the canonical WS2 authority and the branch-reconciliation report for the current acquisition gate.

## What the audit corrected

### 1. R03351 was the wrong specimen

The 28-level retention canary population combined two 14-level first-loss samples, and each source sample intentionally mixed class-4 controls with class-5 frontier levels. In the development sample, `R03351` belongs to the **class-4 control half**. Its deep ordinary-beam witness survival (depth 47) made it diagnostically attractive, but it did not satisfy the actual question: a level for which no known current capability is demonstrated.

The mistake came from collapsing “member of the frozen first-loss population” into “class 5.” The R03351-specific class-5 preflight and notes are therefore deleted rather than relabelled.

### 2. The microscope has a direct historical ancestor

The August B1/B2 extinction-adjacent CP-SAT work already froze real beam extinction decisions and exact-labelled rank-1 retained, known-supported culled, and width-cutoff states. It established both `dead preferred / live known alternative` and `live / live` phenotypes.

Therefore a new class-5 microscope does **not** earn a premise merely by showing that the current beam prefers a dead state over a live witness. That is historical mechanism recurrence. Advancement requires either:

- a materially different exact phenotype; or
- a new mechanism-specific runtime-legal discriminator/architectural limitation that explains the recurrence better than already-closed generic scorer/feature work.

The current collector and explicit-prefix reference runner already implement the hard parts; the only new tooling needed was the deterministic three-case postprocessor.

### 3. Frozen class-5 membership can lag later capability evidence

The residual atlas is a join against a specific production boundary and a specific T1 census artifact. Hint provenance continues to accumulate after, or outside, that frozen join. Consequently, “primary class 5” is a statement about the atlas's evidence boundary, not an eternal property of the level.

`R02302` demonstrates the problem. The current family/reference report treats it as a member of the 431-row class-5 cohort, but its current hint file contains repeated referee-accepted cold isolated `pathfinder-solver` successes, including current technique identities and `isolatedTechnique: true` provenance. That means capability has been demonstrated somewhere in the live evidence base even though the frozen atlas does not know it. Such a row belongs in **reconciliation/composition investigation before acquisition research**.

This is potentially solve-bearing rather than merely taxonomic: if multiple frozen class-5 rows now have isolated capability, they may expose cheap routing/work-allocation opportunities that are more immediately valuable than inventing new capability.

## Freshness audit contract

New tool: `scripts/stress/audit-class5-hint-capability-freshness.mjs`.

For every `primaryClass === 5` row in a regenerated atlas, it scans the current hint file for provenance satisfying:

- `solver.id === "pathfinder-solver"`;
- `context.usedExistingHints === false`;
- `context.hintGuided === false`;
- `context.isolatedTechnique === true`.

It reports technique/config identity, time, gate, work/node metadata and level revision where present.

These are **nominations only**. Hint provenance is not automatically protocol-equivalent to the T1 census, so the tool must not rewrite atlas classes or production policy. Each nomination is reconciled against current technique admissibility, protocol and fixed-work economics first.

Suggested execution:

```bash
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/34683011115/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/34683011115/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/post-1048-residual-atlas-fixed.json

node scripts/run-bundled.mjs scripts/stress/audit-class5-hint-capability-freshness.mjs -- \
  --atlas=tmp/post-1048-residual-atlas-fixed.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/class5-hint-capability-freshness.json
```

If the audit finds a meaningful set of class-5 rows with isolated current capability, work them as a bounded composition/exposure harvest before treating the 431 count as the acquisition denominator. If it finds only a trivial handful, reconcile them and continue with the microscope.

## Provisional microscope specimen after freshness reconciliation

The original development first-loss report's seven class-5 levels are:

`R01632`, `R03088`, `R01097`, `R03229`, `R03197`, `R02185`, `R02733`.

Their ordinary width-2000 known-support depths in the later matched canary are 10, 13, 16, **22**, 14, 19, and 16 respectively. `R03229` therefore offers the deepest already-observed live trajectory in that genuinely class-5 half without choosing on treatment response. Its current hint file also has no found isolated `pathfinder-solver`/`isolatedTechnique` provenance in this audit.

That makes `R03229` the leading **provisional** specimen, not yet the frozen specimen. The whole-cohort freshness audit must clear it first. If cleared, the next steps are:

1. collect its production-faithful full ranked-pool support-loss artifact;
2. freeze witness-culled, rank-1 survivor, and cutoff survivor with `build-class5-microscope-cases.mjs`;
3. exact-label the two survivor futures through the existing explicit-prefix reference seam;
4. compare the resulting exact phenotype to B1/B2 before proposing any treatment.

## Spirit-level conclusion

The microscope idea survives the audit, but its role is narrower and more useful than the first implementation implied. It is a **premise generator after evidence reconciliation**, not a substitute for keeping the residual classification fresh. The cheapest path to solves remains: harvest any newly demonstrated capability first; only then use a clean class-5 specimen to discover capability the solver genuinely does not yet have.
