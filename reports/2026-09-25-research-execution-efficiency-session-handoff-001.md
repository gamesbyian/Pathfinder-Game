# Research execution-efficiency session handoff 001

> **Status:** active
> **Last evidence:** 2026-09-25 — PR #2122 exact-head recovery after CI feedback; un-PR'd Claude and stalled ChatGPT branches reconciled.
> **Decision:** finish #2122 before dispatching WS1. After merge, the highest-value next action is the single frozen WS1 confirmation dispatch, not more wrapper redesign.
> **Remaining gate:** exact-head CI for #2122, then merge and dispatch the frozen WS1 confirmation once from merged main.
> **Production effect:** none until a later scientific result separately earns a solver-policy change.

## Completed in this session

### Runtime and execution reproducibility

- PR #2119 merged the rehearsed exact-runtime/sparse-input work.
- PR #2120 merged the remaining runtime classification:
  - maintained scientific/deterministic research workflows use exact Node 22.23.2 where earned;
  - solver diagnostics stays explicitly on exact 20.20.2 pending diagnostics-specific cross-major parity;
  - the topology audit mechanically exposes exact/floating runtimes;
  - permanent research tests enforce zero major-only research workflow selectors;
  - direct solver/diagnostics evidence records Node/platform/arch runtime identity.
- The targeted-sweep short planner/canary now has sparse materialization and exact dependency-tree reuse with a safe `npm ci` miss path.
- Live search-vs-plumbing audit found no CI-style "real solver search merely generating bookkeeping fixtures" defect in the generic targeted sweep or WS1 frozen-model scoring. Preserve real search when it is the scientific measurement.

### Live-queue convergence

- Closed experiments were removed from the Phase-5 execution-efficiency optimization target list.
- Current execution optimization is tied to live solver gates, not historical harnesses.
- WS1 single-stage confirmation sizing was corrected in #2121:
  - N=160 retained;
  - >=3 independent nominated parents is the breadth floor satisfying the stated <2% false-stop target;
  - >=5% captured pre-winner work remains the magnitude gate;
  - Stage-A-compatible `portfolio-solve-sweep.mjs --scheduler-mode=production` row semantics are producer-locked;
  - generic targeted sweep is not assumed equivalent.

### Recovered un-PR'd work

`claude/solver-optimization-queue-ybpl88` contains one unique commit, `49a8773262f3889350766482920038d7fd49e761`, which generated a 160-parent seed-`2026092501` WS1 population but ran no solver.

The generator implementation used there is byte-identical to current main, so the block is technically reproducible. However, it existed before the final corrected precommitment. It is therefore quarantined from decision-bearing confirmation. Do not merge or dispatch that population.

The replacement decision-bearing seed is **2026092591**, frozen before generation.

`chatgpt/ws1-single-stage-confirmation-wrapper-2026-09-25` contained useful deterministic postprocessing work:
- nominated-parent breadth metric;
- maximum single-parent nominated-work share;
- frozen WS1 verdict evaluator;
- evaluator boundary tests.

All useful pieces are recovered into PR #2122. The old branch is superseded and should not be used as an execution authority.

## PR #2122 owns

PR #2122 is the sole live integration surface for the WS1 recovery/confirmation implementation. It includes:

- seed-overlap recovery/quarantine report;
- corrected plan + machine quality contract;
- one-shot workflow with no scientific dispatch inputs;
- exact generation of N=160 / seed 2026092591 only after merged precommitment;
- 40 fixed four-parent portfolio-solve shards;
- exact 22.23.2 runtime;
- 50M node ceiling / 67M work allocation / 24h non-binding wall safety deadline;
- no baseline, prime-winner, attempt cache, or hints;
- exact 160-row population integrity;
- producer/resource-envelope and referee-validity checks before scoring;
- frozen-model scoring;
- frozen verdict evaluator;
- decision-grade experiment contract and research-question binding;
- completed-positive/completed-negative research-outcome binding to exact result bytes/population/SHA;
- post-publish `decisionBearing=true` requirement;
- central durable evidence harvest with Hint ingestion disabled;
- workflow lifecycle, failure-evidence disposition, Hint inventory, README, live queue and execution-efficiency reconciliation.

Latest CI feedback identified only a declaration mismatch: failure-evidence registry correctly classified this workflow as `standard`, while the workflow contract still said `sideEffects.telemetry: none`. The exact implementation does generate compact failure response via `sweep-publish --failure-in=primary`; #2122 now declares `telemetry: compact`.

## Next steps after #2122 is green

1. Merge #2122.
2. Dispatch `ws1-late-continuation-single-stage-confirmation.yml` **once from merged main**. Do not generate the seed-2026092591 population before merge.
3. Let the workflow produce the frozen population, complete portfolio rows, scoring, verdict, standard decision-bearing evidence and central harvest.
4. Interpret exactly the frozen gates. A negative is scientifically valid and closes this acquisition form; do not rescue it by seed/model/threshold/source changes.
5. Write the durable result report, update the live solver queue, run the hostile closeout required by the quality manifest, then retire the one-shot workflow/lifecycle row unless a concrete repeated consumer exists.

Cross-program recommendations from the five-day retrospective are tracked in [`docs/cross-program-convergence-backlog.md`](../docs/cross-program-convergence-backlog.md). That backlog owns research cadence/claim ownership, semantic freshness, proof ownership, derived-resource ownership, governance-value auditing, phase-local hostile sampling, cost-of-knowing queryability, and evidence-gated remaining CI structural work.

## Remaining execution-efficiency work

These are still worthwhile, but should not preempt the WS1 confirmation or the live WS2 scientific gates.

### A. Measure real dependency-tree reuse economics

The targeted planner/canary now uses exact dependency-tree reuse, but the program still needs one real production dispatch with hit/miss timing.

After that measurement:
- extend reuse only to other **short** planner/generator/combine jobs where bootstrap is material;
- do not bulk-apply it to long solve shards without evidence that install time matters to their critical path.

### B. Continue search-vs-plumbing audit only on immediate gates

Already audited:
- generic targeted sweep;
- WS1 frozen scoring.

Deferred until immediate:
- BC1 later-disposition shadow;
- WS6 independent-parent replication/speed harness.

Do not optimize closed admissible-order, forced-work, or WS1A harnesses merely because they exist.

### C. Diagnostics cross-major parity

Diagnostics remains exactly pinned to Node 20.20.2. Its produced evidence now records runtime identity.

Only migrate it to 22.23.2 after a diagnostics-specific real-solver semantic parity rehearsal. There is no remaining major-only drift.

### D. WS2 science remains higher-value than generic infrastructure polishing

Current live WS2 gates remain:
- repair node-cap candidate: ordinary production-scale matched-work confirmation after the 7-gain / 0-loss nomination result;
- capability-invention CID-0027/CID-0028: reasoned promotion/safety decision, with broader sampling only if that decision actually requires it;
- BC1 later-disposition shadow remains bounded-compute/supporting.

Execution-efficiency work should support these gates rather than create parallel research campaigns.

## Lessons that should remain active

- **Search all branches, not only default-branch code, when claiming a seed/artifact/name is unused.** The 2026092501 overlap is the concrete failure case.
- **Generated populations are part of precommitment state even before solver outcomes exist.** If a population can be inspected before final protocol freeze, call that out rather than overstating independence.
- **Producer row semantics matter more than superficially similar workflow labels.** Level-blind targeted sweep and portfolio sweep are not interchangeable for WS1 merely because both can execute cold inputs.
- **Make conclusions executable.** Runtime policy, plan quality, workflow lifecycle, failure-evidence disposition and decision-bearing publication all gained permanent contracts instead of relying on prose.
- **Scientific negative != infrastructure failure.** One-shot evidence workflows should stay green for a valid preregistered negative and fail only for incomplete/malformed/invalid execution.
- **Optimize the plumbing around real search, not the measurement itself.** Sparse checkout, dependency reuse and deterministic postprocessing are earned targets; production search remains necessary where it is the observation.
- **Refresh optimization scope from the live queue.** Closed experiments should not remain accidental infrastructure priorities.
- **Hostile recovery should inspect un-PR'd branches.** Branch-only work can materially change the epistemic state even when it never reached a PR.

## Safe stopping state

- Main contains #2120 and #2121.
- PR #2122 is the only open PR.
- `chatgpt/ws1-precommitment-recovery-2026-09-25` is the authoritative working branch for this continuation.
- `chatgpt/ws1-single-stage-confirmation-wrapper-2026-09-25` is superseded; its useful changes are recovered.
- `claude/solver-optimization-queue-ybpl88` is preserved but quarantined as historical precommitment-overlap evidence.
- No decision-bearing WS1 confirmation population for seed 2026092591 has been generated yet.
