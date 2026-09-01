# Offline-replay solver evaluation harness

> **Status:** current tool contract. Historical prototype results are preserved separately.

The offline replay harness tests candidate solver reasoners against labelled states **without changing production search**. Use it to falsify a pruning/representation premise cheaply before wiring a live treatment.

The full pre-consolidation document, including the first prototype campaigns and dated result interpretation, is frozen at [`archive/snapshots/solver-shadow-eval-harness-2026-08-20.md`](archive/snapshots/solver-shadow-eval-harness-2026-08-20.md). Current solver priority lives in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

## Entry point

`scripts/stress/offline-replay-harness.mjs` consumes the existing CP-SAT-labelled branch set under `reports/stress/` and replays each branch through the real solver-state primitives. It does not call CP-SAT itself.

Example:

```bash
node scripts/run-bundled.mjs scripts/stress/offline-replay-harness.mjs -- \
  --prune-gap-dir=reports/stress \
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

A claimed **sound prune** must have zero live false rejects on the tested supported population and still requires proof-oriented validation beyond the selected atlas. Zero observed false rejects is not a proof if the model, population, or state coverage is incomplete.

Do not rank candidates by raw catch count alone. Early rare catches can be more valuable than common late catches, and the harness does not automatically know avoided-subtree cost.

## Evidence discipline

The atlas is a labelled research sample, not an automatically representative distribution of solver states.

- State how atlas states were selected. If they were chosen because a failure/prune looked interesting, treat the result as targeted discovery/forensic evidence.
- If several probes or thresholds are tried on the same atlas, disclose the search. The best probe on that atlas requires confirmation on independently selected labelled states before a broad claim.
- Separate **classification quality** from **production value**. A perfect dead/live separator can still be too expensive or fire too late to help search.
- Report denominator and coverage: supported live/dead states, abstentions, model timeouts/unsupported mechanics, duplicate/related states, and independent parent families where relevant.
- Prefer exact/reference labels generated independently of the candidate reasoner. Do not define “dead” using the same heuristic being evaluated.
- A probe may nominate a score/retention/scheduler signal without being eligible for hard pruning. Soundness class and intended consumer must remain explicit.

## Invariants

- Reconstruct state through the real solver transition machinery rather than a simplified model.
- Keep observation/probe mode production-inert, including work, cache/memo state, ordering, tie behavior, and randomness.
- Preserve `live`, `dead`, and `abstain` distinctly.
- Treat CP-SAT/model coverage limits as coverage limits, not negative labels.
- Reuse the atlas rather than buying new oracle calls when existing labels answer the discovery question; buy fresh labels when independent confirmation is the question.
- Write recoverable outputs during long runs.
- Keep offline oracle/research information outside production cold-solver policy.

## Promotion path

A replay success is a gate, not a production verdict:

1. show the candidate separates the intended exact/live-dead or other labelled condition;
2. confirm that the signal recurs outside the cases used to design/select it;
3. measure probe cost and firing depth;
4. wire the narrowest live counterfactual behind an opt-in treatment;
5. compare actual cold solves/work at matched aggregate work where search policy changes;
6. run the relevant soundness/referee/differential checks if the treatment can reject states;
7. keep exact labels and historical identities out of the production decision path.

If the live result is null, do not keep tuning thresholds indefinitely on the same atlas. Reopen only when the failure shows a materially different consumer/cost problem or new labels change the premise.

## When to use something else

- Need current priority? Use [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
- Need a level/family boundary? Use [`variant-level-research.md`](variant-level-research.md) and family tools.
- Need actual beam retention/extinction? Use [`solver-known-solution-prefix-survival.md`](solver-known-solution-prefix-survival.md).
- Need a causal before/after search divergence? Use family pair-divergence / witness-divergence tooling.
- Need a production decision? A replay result nominates a narrow live experiment; it is not the promotion verdict.

## Extending offline replay evaluation

Share replay, oracle labels, run identity, and reporting infrastructure where semantics match. Do not force fundamentally different artifacts into `reject|pass` merely to reuse this API. Producer/consumer information-sharing experiments may need richer typed artifacts; follow [`solver-research-operating-model.md`](solver-research-operating-model.md#producer--consumer-cooperation) rather than building a parallel generic “shadow mode” platform.

Do not grow the harness into a general research framework merely because many experiments can be expressed as observation. Extend it only when the shared replay/label semantics genuinely reduce repeated work.