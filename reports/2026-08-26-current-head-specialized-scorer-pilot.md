# Current-HEAD specialized scorer pilot

> **Status:** concluded-negative
> **Last evidence:** 2026-08-26 — three-repetition interleaved fixed-work A/B on all 160 published levels and a 24-level hard Corpus-2 sample, with byte-identical solve/node traces between control and treatment
> **Decision:** close the tested static plain/default/no-template scorer specialization. It was +0.91% slower on published and effectively flat (-0.05%) on hard Corpus-2 despite fresh profiling showing scoreMove at 9.55% and 14.56% self-time respectively.
> **Remaining gate:** use the existing debug-only beam breakdown on the same hard workload to partition replay, candidate generation, connectivity, dedup, and sort; nominate a fused-JS move/state or replay/materialization pilot only if that breakdown identifies a material subcomponent.
> **Evidence role:** bounded pure-speed development pilot
> **Queue item:** #7, architectural speed and execution substrate

## Question

After the August speed stack, does current solver HEAD still spend enough CPU in scoring/candidate generation to justify the predeclared specialized-JS scorer pilot, and if so does a conservative structurally specialized scorer improve representative end-to-end wall time while preserving deterministic search decisions?

No production policy, budget, ordering, eligibility, score weight, prune, or solver source was changed for this experiment.

## Fresh profile

The profile was pinned to commit `0815d6f5b4e58b45a3487c2c63a9c90ee79c38bf` and used deterministic 250,000-node caps with a non-binding 600,000 ms wall allowance.

The pinned solver implementation is still current at report time: comparing that commit with `main` `0f8c1bd2c3fdc47a478e1ed929e400fce27a9a42` shows only queue/research reports, workflows, and stress tooling changed; `modules/solver/search.ts`, `scoring.ts`, and `prep.ts` are byte-identical.

| Workload | Nodes | Leading self-time |
|---|---:|---|
| Published, all 160 | 6,645,927 | `beamSearchFromGate` 21.56%; `_floodFillBits` 18.47%; `scoreMove` 9.55%; `applyMove` 5.15% |
| Hard Corpus-2 stride sample, 24 | 5,496,243 | `beamSearchFromGate` 30.46%; `scoreMove` 14.56%; `_floodFillBits` 10.28%; `applyMove` 6.90% |

So the queue's premise survived: scoring/candidate evaluation is still material enough to earn one bounded scorer-specialization pilot.

Profile run: GitHub Actions `32984890223`.

## Treatment

The treatment was deliberately narrower than a general scorer compiler. It added a static fast path only when all of the following held for a candidate batch:

- production/default configuration (`prep._cfg === null`);
- no must-pass or must-cross objectives;
- no surround, must-turn, or adjacent-turn landmarks;
- no flipping filters;
- no portals;
- no structural template;
- the ordinary DFS/beam context path, excluding repair's intentionally preserved scoring convention.

Within that shape, the helper retained the same arithmetic order for all still-live terms and deleted only branches whose predicates were statically false. The apparent perimeter-phase discrepancy was audited before interpretation: with `template === null`, production `phasePerimScale` is identically 1.0, so the specialized `wp * 3` expression is equivalent.

Control and treatment were materialized as detached worktrees from the same pinned commit. The treatment was patched only inside its disposable worktree.

## A/B protocol

Two representative workloads were each run three times with alternating arm order:

- all 160 published levels;
- the same 24-level hard Corpus-2 stride sample used by the fresh profile.

Each solve used a 250,000-node cap and 600,000 ms wall allowance. The acceptance harness required every row's `id:solved:nodes` signature to match between control and treatment and across repetitions before timing could be interpreted.

A/B run: GitHub Actions `33012129267`, artifact `plain-scorer-speed-ab`.

## Result

Deterministic parity passed completely on both workloads.

### Published

| Rep | Control | Treatment | Paired delta |
|---:|---:|---:|---:|
| 1 | 9,525.5 ms | 9,477.5 ms | -0.50% |
| 2 | 9,309.9 ms | 9,431.8 ms | +1.31% |
| 3 | 9,365.7 ms | 9,548.6 ms | +1.95% |

Paired geometric-mean treatment delta: **+0.91% slower**.

### Hard Corpus-2 sample

| Rep | Control | Treatment | Paired delta |
|---:|---:|---:|---:|
| 1 | 24,055.4 ms | 24,041.3 ms | -0.06% |
| 2 | 24,295.3 ms | 24,322.4 ms | +0.11% |
| 3 | 24,063.6 ms | 24,015.9 ms | -0.20% |

Paired geometric-mean treatment delta: **-0.05%**, effectively flat.

The treatment therefore buys no representative end-to-end speed despite `scoreMove` owning about 10-15% of measured self-time. V8 is already handling the generic default scorer well enough that deleting these statically dead branches does not repay the extra dispatch/helper structure.

## Disposition

Close the exact tested form:

> a conservative static plain/default/no-template scorer specialization whose main advantage is deleting impossible scoring branches.

Do not tune eligibility or add more generated scorer variants merely to rescue this hypothesis. A materially different scorer candidate would need new profile evidence and a different mechanism, such as precomputing/fusing work that the current pilot still performs rather than only deleting branches.

The fresh profile does leave a broader #7 question open. On the hard sample, `beamSearchFromGate` itself owns about 30.5% self-time. The solver already has debug-only beam breakdown counters for replay, candidate generation, connectivity, dedup, and sort. The next smallest gate is to run that existing breakdown on the same hard workload and let it nominate a specific subcomponent. If candidate generation/apply/undo dominates, the documented fused-JS move/state kernel becomes the natural pilot; if replay is material again, revisit state materialization; if neither is material, close those forms rather than guessing.
