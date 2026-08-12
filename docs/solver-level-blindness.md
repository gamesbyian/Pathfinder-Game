# Solver level-blindness contract

Pathfinder's solver exists first for the level editor: a player creates a new level, presses **Solve**, and asks whether that level is solvable and what a solution is. A newly created level has no solver history. Therefore the production solver and every headline capability benchmark must be **level-blind**.

## Invariant

For a fixed puzzle definition, solver revision, configuration, deterministic seed policy, and resource budget, the solve must receive the same information whether that exact level:

- has never existed before;
- has been attempted and failed many times;
- has been solved before;
- has hundreds of saved solutions, hints, provenance records, or historical winning attempts.

The solver may derive any information it wants from the puzzle during the current solve. It may also use general solver knowledge encoded in code/configuration and policies learned offline from populations of levels. It may **not recall facts about the exact level being solved**.

## Allowed solver inputs

- the current puzzle mechanics: grid, gates/goal, requirements, obstacles, obligations, landmarks, filters, flippers, portals and other actual gameplay fields;
- current solver code and production configuration;
- budgets and generic experiment flags;
- deterministic/random seeds produced by the current solver's generic seed policy from current-solve information;
- state, diagnostics, elites, partial paths, and other artifacts generated during the current invocation.

## Forbidden exact-level historical or identity inputs

A capability solve must not use any saved record of what happened on that level previously, including:

- a previously winning strategy, profile, template, gate, seed, or attempt index;
- a saved solution or hint as guidance;
- previous solved/unsolved status to choose a strategy, budget, ordering, or skip decision;
- an exact-level attempt cache;
- historical badness, timing, or nodes for that level to allocate current work;
- `primeAttempt` / `--prime-winner` or equivalent winner replay;
- corpus position or permanent level ID as a hidden policy/seed signal;
- research-only metadata such as provenance, generator/stress metadata, or stored witnesses.

`--prime-winner` remains available in the lower-level research sweep only as an explicitly historical **re-verification/replay** mechanism. Its own documentation already labels it “RE-VERIFY RUNS ONLY.” It must not feed the principal stress-capability workflow, a production/editor solve, or a headline solver score.

## Saved solutions are still valuable

This rule does **not** mean discarding research data. Every valid solution, hint, attempt record, lineage trace, CP-SAT label, variant relationship, and provenance record should continue to be saved. They are valuable as:

- regression/reference material;
- labels for offline analysis;
- evidence for discovering general heuristics and pruning rules;
- CP-SAT/oracle test cases;
- family/variant and lineage research;
- correctness witnesses;
- training/evaluation data for generic policies.

The boundary is directional: **solve → saved research data is allowed; saved exact-level history → solve is forbidden.** A later generic solver improvement may be inspired by old levels, but when it is evaluated it must operate from the puzzle itself.

## Canonical capability workflow

`.github/workflows/solver-stress-refresh.yml` is the principal capability workflow and is level-blind by construction:

- it invokes `scripts/level-blind-capability-sweep.mjs` rather than the history-aware research sweep;
- the capability sweep reads the source corpus only to construct a **mechanics-only temporary corpus** through an explicit gameplay-field allowlist;
- exact identity (`id`), hints, provenance, stress/generator metadata, descriptions, difficulty and future research fields are absent from the solver input by default;
- a dedicated `level-blind-capability-worker.mjs` prepares every mechanics-only puzzle without a corpus `levelNumber`, so a future generic seed/order policy cannot accidentally learn from array position;
- the sweep refuses baseline, winner-priming, priority, attempt-cache, resume, and related historical arguments;
- saving hints is output-only and happens in the parent process after solving; the worker cannot load hint artifacts;
- both Actions jobs pin `github.sha`, so queued jobs cannot silently follow a moving branch tip;
- stale checked-out shard files are removed before combining, so a missing current-run artifact cannot masquerade as complete coverage;
- complete coverage and absence of `solvedByPrime` are checked before a capability result may be persisted.

The experiment-manifest test contains a static boundary guard so CI fails if the principal workflow later grows a baseline/priming path, the mechanics allowlist starts admitting historical fields, the dedicated worker starts receiving corpus identity, or Actions stops pinning the dispatched SHA.

## Benchmark terminology

There is one headline concept: **level-blind solver capability**.

Historical exact-level re-verification counts may be preserved in reports, but must never be described as the solver's capability baseline. In particular, the historical Corpus-2 figure **725/1700** used exact-level winner priming for many previously solved levels. It is a valid record of re-verification behavior, not a valid answer to “how many unseen levels can this solver solve?”

The 2026-08-11 revised neighbor-budget A/B was intentionally run without priming and is therefore the current decision-bearing capability evidence: **611/1700 control → 665/1700 treatment** under the matched 36M-node / 48.24M-work, non-binding-deadline configuration.
