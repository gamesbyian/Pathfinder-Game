# Solver level-blindness and generalization contract

The production solver and headline capability benchmarks must be **level-blind**: an unseen editor level has no solver history, so exact-level history cannot be part of capability.

Level-blindness is necessary for a fair cold solve. It is **not sufficient evidence of generalization**. A generic rule can be perfectly level-blind at runtime and still be overfit to the corpus that was repeatedly used to invent, tune, and select it. Population roles and proportional confirmation/transfer gates are owned by [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

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

- prior winning search action/scoring profile/ordering bias/gate/seed/attempt;
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

There are three distinct questions:

1. **runtime blindness:** did this invocation use only legal current-level/current-solve inputs?
2. **sample independence:** did these evaluation rows help choose the treatment?
3. **distributional independence:** do these rows come from a materially different source/construction process?

Use the roles in [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md):

- **Development/tuning:** freely inspected levels used to invent, tune, select, or diagnose. Corpus 2,
  much of the technique census, recurring regression cohorts, and heavily mined variant families
  belong here for many current decisions.
- **Confirmation:** an untouched sample/block evaluated after the candidate and primary decision rule
  are fixed. Another seed from `generate-random.mjs` can be valid confirmation even though it
  shares Corpus 2's generator family.
- **Transfer/challenge:** evidence from a materially different construction/source distribution for
  a broader generalization claim. A new seed or `--envelope-caps` mode of the same witness-first
  generator is not cross-generator transfer.

Variant siblings are correlated. Split/group by parent family when family generalization matters.

## Holdout visibility and block consumption

A useful holdout protocol creates procedural independence without turning evaluation into a security
system.

When several confirmation decisions are expected, prefer a locked pool partitioned into blocks before
outcomes are inspected. Use one untouched block for one fixed decision-bearing candidate. After its
outcomes influence redesign, that **block** becomes development evidence for descendants; untouched
blocks in the same pool remain usable. There is no scientific benefit in declaring every unseen block
contaminated merely because a sibling block was used.

Where tooling permits:

- expose aggregate confirmation/transfer metrics before exact IDs/traces;
- freeze the verdict before opening exact failures for forensic learning;
- record generator/source revision, pool/block identity, seal/hash, treatment provenance, and
  participation;
- do not repeatedly reuse the same block for a succession of selected candidates;
- do not call fresh siblings of already-inspected variant parents independent transfer data.

A fresh one-off cohort remains valid when it is cheaper than maintaining a pool. The block model is an
efficiency default, not a new infrastructure requirement.

## Claim discipline

Use language that matches the evidence:

- “+N on the current Corpus-2 sample” is a valid corpus result even if that corpus inspired the treatment.
- “improves level-blind capability on Corpus 2” requires a level-blind run but not necessarily an untouched holdout.
- “selected treatment confirmed on an untouched block” requires that the block did not choose the treatment/threshold.
- “transfers to topology-composition levels” requires an untouched sample from that different generator family and is limited to its represented mechanics.
- “generalizes to unseen Pathfinder levels” requires broader distributionally independent transfer evidence beyond a new seed from the development generator.
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

This workflow does **not** by itself certify that the tested population was untouched during treatment design or distributionally independent from development data. Record evidence role and selection separately under [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), [`investigation-report-conventions.md`](investigation-report-conventions.md), and [`solver-research-operating-model.md`](solver-research-operating-model.md).

## Benchmark terminology

The headline metric is **level-blind solver capability** on the named population. Historical exact-level re-verification counts may be reported but are not capability baselines.

The historical Corpus-2 **725/1700** figure used winner priming and is re-verification evidence only. The 2026-08-11 unprimed neighbor-budget A/B is decision-bearing Corpus-2 capability evidence: **611/1700 control -> 665/1700 treatment** at matched 36M-node / 48.24M-work budgets with a non-binding deadline. It should not be retroactively described as an untouched generalization test.