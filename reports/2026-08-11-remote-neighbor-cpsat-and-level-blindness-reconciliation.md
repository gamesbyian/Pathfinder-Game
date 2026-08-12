# Remote neighbor-budget A/B, explicit-prefix CP-SAT, and capability-model reconciliation

Date: 2026-08-11

This report reconciles the two remote experiments completed on 2026-08-11 with the solver's actual product requirement: **a level-editor solve must be level-blind**. It also records the workflow/provenance issues exposed while interpreting those runs and updates the decision queue.

## Executive result

The revised `PRUNE_MC_NEIGHBOR_BUDGET` wiring is strongly positive under the product-relevant level-blind benchmark:

| arm | Corpus 1 | Corpus 2 | C2 nodes | C2 canonical work |
|---|---:|---:|---:|---:|
| control, flag OFF | 94/102 | 611/1700 | 43,017,428,195 | 59,668,825,637 |
| treatment, flag ON | 94/102 | **665/1700** | **41,320,735,149** | **56,486,598,535** |
| delta | 0 | **+54 net** | **-3.94%** | **-5.33%** |

Corpus-2 churn is **59 gained / 5 lost**. The five losses are `R00635`, `R02119`, `R02422`, `R02823`, and `R02867`. There were no attempt errors or deadline-truncated rows in either Corpus-2 arm. The treatment gains are referee-valid.

This is materially cleaner than the original neighbor-budget wiring's historical 42 gained / 28 lost result. The revised caller policy that suppresses the prune only from repair's stochastic `takePly` selection did what it was intended to do: most of the old random-index churn disappeared while the positive search effect grew.

The remaining five losses mean the current flag is not yet a strict-superset production integration. The full-population A/B itself is **complete and must not be rerun unchanged**. The remaining decision is how to handle the five losses under Pathfinder's “more solves/faster without regression” goal.

## A/B run identity

GitHub Actions workflow runs:

- control: `solver-stress-refresh` run #32, run id `31537140410`;
- treatment: run #33, run id `31537474435`.

The dispatch metadata initially looked mismatched: #32 was dispatched while `main` pointed at `ddb3efeb039d6d04b866b7cbba0b2cf132826c6e`, while #33 reported `c86ba8f86192801176b1e6c5fece3b120850df44`. Inspection of every shard artifact resolved the ambiguity: **all Corpus-1 and Corpus-2 shard reports in both arms record actual solver commit `c86ba8f86192801176b1e6c5fece3b120850df44`**.

The cause was a workflow race, not an experiment-code mismatch: the old workflow checked out the mutable branch ref, so queued jobs could resolve a newer `main` tip than the dispatch event recorded. This report's accompanying workflow hardening pins `github.sha` for both solve and combine jobs so future runs cannot move under their own feet.

## Why 725 is not the capability baseline

The historical Corpus-2 figure `725/1700` came from a workflow that unconditionally supplied `--prime-winner`. That mechanism reads the exact level's previous winning config/gate/seed from a saved baseline and injects it before the ordinary ladder. The lower-level tool's own documentation correctly calls this **“RE-VERIFY RUNS ONLY”** and says not to use it for capability benchmarks.

A comparison of that historical 725 result with the 611 level-blind control found that **112 of the 114 extra historical solves were `solvedByPrime`**. Only two old non-prime solves were absent from the new control. Thus the apparent 725→611 “regression” was overwhelmingly the removal of exact-level answer recall, not a collapse in solver capability.

That distinction is not optional for Pathfinder. The solver exists to answer a level-editor user who has just created a new level. Exact-level history does not exist in that scenario. Therefore:

- the single headline metric is **level-blind solver capability**;
- 725 is preserved only as a historical re-verification result;
- the decision-bearing A/B is 611→665;
- saved solutions/hints remain research outputs but may not feed the solve of that exact level.

The canonical contract is `docs/solver-level-blindness.md`.

## Explicit-prefix CP-SAT result

Workflow `cpsat-explicit-prefix-oracle` run id `31537268571` processed the 12 atlas rows that had previously been `oracle-abstain`:

- **7 dead** (`INFEASIBLE`);
- **1 live** (`OPTIMAL`, emitted witness referee-valid);
- **4 abstain**;
- **0 correctness alarms**;
- **0 input alarms**.

All four abstentions are R00039 and report `unsupported-mechanics`; the runner correctly refused to convert unsupported-model coverage into dead evidence.

Supported labels:

- R00001: five dead siblings and one live sibling;
- R00044: two dead siblings;
- R00039: four unsupported/abstain.

The live case is `R00001:42:child-[5,6]:3`; CP-SAT returned `OPTIMAL` and the emitted completion passed Pathfinder's referee. The dead cases are exact-prefix infeasibility results, not heuristic guesses.

## What the CP-SAT labels mean for winning-lineage work

The first exact labels strengthen the score-representation diagnosis from `reports/2026-08-11-winning-lineage-score-width-forensics.md`.

At least one R00001 atlas sibling that the beam ranked **first** at its parent is now CP-SAT-proven dead while that parent has a known-valid continuation. This directly establishes that some score/width losses are genuine mis-ranking of future viability, not merely exact ties or an unavoidable width shortage. The one CP-SAT-live sibling is also important: the oracle is not simply declaring every alternative dead, and the search really does face multiple viable futures in some states.

The sample is still small: only eight cases were model-supported, across R00001/R00044, with R00039 outside the model. Therefore the result justifies **expanding the bounded extinction-adjacent exact-label set**, not immediately freezing a new score, quota, or structural-family reservoir policy.

## Workflow/data issues found while interpreting the runs

### 1. Moving branch checkout

Fixed by pinning the immutable dispatch SHA (`github.sha`) in the capability workflow.

### 2. Capability workflow admitted historical priming

Fixed structurally. The principal stress workflow no longer exposes a `prime_winner` input and no longer passes a baseline into the solve command. It uses the dedicated `level-blind-capability-sweep.mjs`, which refuses baseline/priming/priority/attempt-cache/resume inputs.

`--prime-winner` is retained only in the lower-level research/re-verification sweep because it remains useful for reproducing and studying historical winners.

### 3. Saved hints were attached in the old sequential sweep path

The old `portfolio-solve-sweep.mjs` reads levels with their external hint records attached and asserts that they are harmless when not saving. That is weaker than the product invariant. The new capability sweep avoids the ambiguity entirely: solve tasks are built from raw corpus JSON and executed in the existing worker path; hint artifacts are loaded separately only for output persistence after a solve.

### 4. Current compiled Corpus-2 baseline is malformed

The repository's current `logs/stress-corpus2-baseline.json` was rewritten by the intervening refresh into an empty/incomplete compiled baseline. The historical 725 re-verification report remains archived, so research history is not lost. More importantly, the hardened capability workflow no longer needs that file to solve levels. The next complete non-deterministic level-blind refresh will regenerate the compiled baseline from a valid 1700-level capability result.

## Updated decision queue

### Neighbor-budget prune

**Population A/B complete. Do not rerun unchanged.**

Next decision-bearing work is a narrow analysis of the five losses and an integration choice:

1. determine whether the five losses share one deterministic search-reordering mechanism;
2. test whether a cheap policy can preserve the 59 gains without losing those five under the same total work envelope;
3. only then decide default-on promotion versus a complementary/fallback integration.

Do not “solve” the five losses by exact-level special cases or historical winner replay. Any recovery must be level-agnostic and evaluated level-blind.

### Winning-lineage / score representation

The first 12 CP-SAT abstentions are **complete**. Do not rerun them unchanged.

Next: construct a bounded set of informative same-parent siblings close to actual score/width extinction events and label those exact prefixes through the existing CP-SAT workflow. Preserve live/dead/abstain as distinct outcomes. Use those labels to test neutral future-opportunity descriptors before implementing a score or retention policy.

### Repair retreat

Still pending. Use the same explicit-prefix CP-SAT seam on bounded coarse-to-fine retreat cases from the retained repair elites. The rollback pilot's long demonstrated retreat distances remain a hypothesis about where editable prefix history lives, not proof of minimum edit distance.

### Main-loop late reserve

Still pending full-population A/B. It is now unblocked by the neighbor-budget population verdict, but must run through the hardened level-blind workflow. The treatment changes remain only `enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE` plus the reserve fraction; config count stays 4 in all arms. No prime-winner dimension exists anymore.

### Measurement rule going forward

A result counts toward solver capability only if:

- every level is freshly solved from raw level data;
- no exact-level history influences search or allocation;
- the run completes the requested population;
- wall deadline is non-binding when the experiment claims canonical fixed-work evidence;
- solver SHA/config/workflow inputs are recorded and matched where required;
- saved hints/solutions are outputs only.

This reconciles the research harness with the product the solver actually has to serve.
