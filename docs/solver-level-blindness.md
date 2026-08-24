# Solver level-blindness and generalization contract

The production solver and headline capability benchmarks must be **level-blind**: an unseen editor level has no solver history, so exact-level history cannot be part of capability.

Level-blindness is necessary for a fair cold solve. It is **not sufficient evidence of generalization**. A generic rule can be perfectly level-blind at runtime and still be overfit to the corpus that was repeatedly used to invent, tune, and select it.

## Runtime invariant

For fixed puzzle mechanics, solver revision, configuration, seed policy, and budget, the solver receives the same information whether the exact level is new, previously failed, previously solved, or has stored hints/provenance.

The solver may use the current puzzle, current-invocation state/telemetry, generic code/configuration, and policies learned offline from populations. It may not use saved facts about the exact level.

## Allowed runtime inputs

- current gameplay fields: grid, gates/goal, requirements, obstacles, obligations, landmarks, filters, flippers, portals, etc.;
- current solver code/configuration, budgets, and generic experiment flags;
- seeds from the generic current-solve seed policy;
- state, diagnostics, elites, partial paths, and other artifacts created during this invocation;
- generic static/dynamic policy learned offline, provided its production inputs are legal current-level/current-solve features.

## Forbidden exact-level inputs

A capability solve must not use:

- prior winning strategy/profile/template/gate/seed/attempt;
- saved solutions or hints as guidance;
- historical solved status, timing, nodes, badness, or family outcome for allocation/routing;
- exact-level attempt caches;
- `primeAttempt`, `--prime-winner`, or equivalent winner replay;
- corpus position or permanent level ID as policy/seed input;
- provenance, generator/stress metadata, stored witnesses, or other research-only fields;
- a fingerprint/nearest-neighbor mechanism whose practical effect is to recognize the exact historical level or family and replay its known treatment.

`--prime-winner` remains available only for explicit historical re-verification/replay. It must not feed production/editor solves, the principal capability workflow, or headline solver scores.

## Research-data boundary

Keep valid solutions, hints, attempt records, lineage traces, CP-SAT labels, variant relationships, solution fingerprints, regression history, and provenance as regression material and offline research data.

**solve -> saved research data is allowed; saved exact-level history -> capability solve is forbidden.** Generic improvements may be learned from old levels, but the resulting live policy must operate from legal current inputs.

Offline data may discover that some latent property predicts a useful action. The production path must then use a generic legal descriptor of that property, not the historical label itself. Validate that descriptor away from the levels/families that nominated it.

## Generalization roles

Treat solver research populations as having distinct roles:

- **Discovery/tuning:** levels freely inspected to generate hypotheses, pick thresholds, select configurations, and diagnose failures. Corpus 2, much of the technique census, recurring regression cohorts, and heavily mined variant families belong here for many current decisions.
- **Confirmation:** levels not used to choose the candidate being tested. Use this to decide whether an apparently useful selected/tuned treatment survives selection bias.
- **Transfer/challenge:** a locked or freshly generated population not inspected during treatment design, reserved for claims about broader unseen-level behavior.

A population can move only toward more contaminated roles. Once exact failures from a confirmation/transfer set are inspected and used to redesign the treatment, those cases are development data for the next iteration. Replenish the locked/fresh set rather than pretending repeated exposure remains independent.

Variant siblings are correlated. Split/group by parent family for learned/tuned rules and transfer claims.

## Holdout visibility

A useful holdout protocol should reduce the temptation to tune against the holdout while still making decisions possible.

Where tooling permits during iteration:

- expose aggregate confirmation/transfer metrics first rather than exact level IDs, paths, winning configs, or failure traces;
- freeze the treatment/decision before opening exact failures for forensic learning;
- once exact failures are opened and influence the next design, mark those cases/population as development data for future iterations;
- record the generator/version/split so a replacement holdout can be created reproducibly;
- do not repeatedly create “fresh” siblings of already-inspected parents and call them independent transfer data.

This need not become a security system or elaborate blind leaderboard. The goal is procedural friction against accidental repeated peeking, not secrecy for its own sake.

## Claim discipline

Use language that matches the evidence:

- “+N on the current Corpus-2 sample” is a valid corpus result even if that corpus inspired the treatment.
- “improves level-blind capability on Corpus 2” requires a level-blind run but not necessarily an untouched holdout.
- “selected treatment confirmed on held-out parents” requires that those parents did not choose the treatment/threshold.
- “generalizes to unseen Pathfinder levels” requires independent confirmation/transfer evidence beyond the development population.
- “zero regressions” means zero observed losses on the stated population/protocol, not proof of universal monotonicity.

Do not use level-blindness as a rhetorical substitute for a train/test distinction.

## Canonical capability workflow

`.github/workflows/solver-stress-refresh.yml` enforces the **runtime information boundary**:

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

This workflow does **not** by itself certify that the tested population was untouched during treatment design. Record evidence role and selection separately under [`investigation-report-conventions.md`](investigation-report-conventions.md) and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Benchmark terminology

The headline metric is **level-blind solver capability** on the named population. Historical exact-level re-verification counts may be reported but are not capability baselines.

The historical Corpus-2 **725/1700** figure used winner priming and is re-verification evidence only. The 2026-08-11 unprimed neighbor-budget A/B is decision-bearing Corpus-2 capability evidence: **611/1700 control -> 665/1700 treatment** at matched 36M-node / 48.24M-work budgets with a non-binding deadline. It should not be retroactively described as an untouched generalization test.