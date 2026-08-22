# Shadow-mode solver evaluation harness

> **Status:** current tool contract. Historical prototype results are preserved separately.

The shadow harness tests candidate solver reasoners against labelled states **without changing production search**. Use it to falsify a pruning/representation premise cheaply before wiring a live treatment.

The full pre-consolidation document, including the first prototype campaigns and dated result interpretation, is frozen at [`archive/snapshots/solver-shadow-eval-harness-2026-08-20.md`](archive/snapshots/solver-shadow-eval-harness-2026-08-20.md). Current solver priority lives in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

## Entry point

`scripts/stress/interface-probe-harness.mjs` consumes the existing CP-SAT-labelled branch atlas under `reports/stress/` and replays each branch through the real solver-state primitives. It does not call CP-SAT itself.

Example:

```bash
node scripts/run-bundled.mjs scripts/stress/interface-probe-harness.mjs -- \
  --atlas-dir=reports/stress \
  --probes=<probe-id> \
  --out=reports/stress/interface-probe-harness-results.json
```

Start with [`tooling-catalog.md`](tooling-catalog.md) and inspect the current script/probe registry before adding another harness.

## Probe contract

A probe declares a name, soundness class, and an `evaluate` function over the reconstructed real solver state. The current reject/pass family is conceptually:

```js
export const name = '<id>';
export const soundnessClass = '<class>';
export function evaluate({ level, prep, state, pos }) {
  return { verdict: 'reject' | 'pass', abstained: false };
}
```

Use the actual script and existing probes as the schema authority; this snippet is a navigation aid, not a replacement type definition.

A probe that cannot decide should abstain. Never collapse abstain into dead/reject.

## What the harness measures

For labelled branches it can report:

- catch on exact/oracle-dead branch;
- false reject on live branch;
- unique catch beyond the existing gauntlet;
- overlap with existing pruning;
- abstain rate;
- decision depth and probe-specific explanation fields.

A claimed **sound prune** must have zero live false rejects on the tested supported population and still requires the repository's broader soundness validation before production use.

Do not rank candidates by raw catch count alone. Early rare catches can be more valuable than common late catches, and the harness does not automatically know avoided-subtree cost.

## Invariants

- Reconstruct state through the real solver transition machinery rather than a simplified model.
- Keep observation/probe mode production-inert.
- Preserve `live`, `dead`, and `abstain` distinctly.
- Treat CP-SAT/model coverage limits as coverage limits, not negative labels.
- Reuse the atlas rather than buying new oracle calls when existing labels answer the question.
- Write recoverable outputs during long runs.
- Keep offline oracle/research information outside production cold-solver policy.

## When to use something else

- Need current priority? Use [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).
- Need a level/family boundary? Use [`variant-level-research.md`](variant-level-research.md) and family tools.
- Need actual beam retention/extinction? Use [`solver-winning-lineage-survival-analysis.md`](solver-winning-lineage-survival-analysis.md).
- Need a causal before/after search divergence? Use family pair-divergence / witness-divergence tooling.
- Need a production decision? A shadow result nominates a narrow live experiment; it is not the promotion verdict.

## Extending shadow evaluation

Share replay, oracle labels, run identity, and reporting infrastructure where semantics match. Do not force fundamentally different artifacts into `reject|pass` merely to reuse this API. Producer/receptor information-sharing experiments may need richer typed artifacts; follow [`solver-research-operating-model.md`](solver-research-operating-model.md#producer--receptor-cooperation) rather than building a parallel generic “shadow mode” platform.
