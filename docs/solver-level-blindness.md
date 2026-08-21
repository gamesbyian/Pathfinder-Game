# Solver level-blindness contract

The production solver and headline capability benchmarks must be **level-blind**: an unseen editor level has no solver history, so exact-level history cannot be part of capability.

## Invariant

For fixed puzzle mechanics, solver revision, configuration, seed policy, and budget, the solver receives the same information whether the exact level is new, previously failed, previously solved, or has stored hints/provenance.

The solver may use the current puzzle, current-invocation state/telemetry, generic code/configuration, and policies learned offline from populations. It may not use saved facts about the exact level.

## Allowed inputs

- current gameplay fields: grid, gates/goal, requirements, obstacles, obligations, landmarks, filters, flippers, portals, etc.;
- current solver code/configuration, budgets, and generic experiment flags;
- seeds from the generic current-solve seed policy;
- state, diagnostics, elites, partial paths, and other artifacts created during this invocation.

## Forbidden exact-level inputs

A capability solve must not use:

- prior winning strategy/profile/template/gate/seed/attempt;
- saved solutions or hints as guidance;
- historical solved status, timing, nodes, badness, or family outcome for allocation/routing;
- exact-level attempt caches;
- `primeAttempt`, `--prime-winner`, or equivalent winner replay;
- corpus position or permanent level ID as policy/seed input;
- provenance, generator/stress metadata, stored witnesses, or other research-only fields.

`--prime-winner` remains available only for explicit historical re-verification/replay. It must not feed production/editor solves, the principal capability workflow, or headline solver scores.

## Research-data boundary

Keep valid solutions, hints, attempt records, lineage traces, CP-SAT labels, variant relationships, and provenance as regression material and offline research data.

**solve -> saved research data is allowed; saved exact-level history -> capability solve is forbidden.** Generic improvements may be learned from old levels, but evaluation must operate from the puzzle itself.

## Canonical capability workflow

`.github/workflows/solver-stress-refresh.yml` enforces this boundary:

- runs `scripts/level-blind-capability-sweep.mjs`;
- builds a mechanics-only temporary corpus from an explicit gameplay-field allowlist;
- omits identity, hints, provenance, stress/generator metadata, descriptions, difficulty, and research fields;
- `level-blind-capability-worker.mjs` receives no corpus `levelNumber`;
- refuses baseline, winner-priming, priority, attempt-cache, resume, and related history-aware arguments;
- workers cannot load hint artifacts; saved hints are output-only in the parent;
- Actions jobs pin `github.sha`;
- stale shard files are removed before combining;
- complete coverage and absence of `solvedByPrime` are required before persistence.

Experiment-manifest tests statically guard the mechanics allowlist, worker identity boundary, no-priming path, and pinned SHA.

## Benchmark terminology

The headline metric is **level-blind solver capability**. Historical exact-level re-verification counts may be reported but are not capability baselines.

The historical Corpus-2 **725/1700** figure used winner priming and is re-verification evidence only. The 2026-08-11 unprimed neighbor-budget A/B is decision-bearing capability evidence: **611/1700 control -> 665/1700 treatment** at matched 36M-node / 48.24M-work budgets with a non-binding deadline.
