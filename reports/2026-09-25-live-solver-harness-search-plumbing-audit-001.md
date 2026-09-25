# Live solver harness search/plumbing audit 001

> **Status:** active
> **Last evidence:** 2026-09-25 — current-main targeted-sweep workflow and WS1 frozen-model analysis path inspected after execution-efficiency/runtime activation.
> **Decision:** no same-proof-cheaper replacement is currently earned for the generic targeted-sweep scientific solve calls. Real search is confined to the execution-family canary and population solve shards; combine/integrity/contract/publication and WS1 frozen-model scoring are deterministic transforms. Optimize bootstrap/materialization around these boundaries, not the scientific payload.
> **Remaining gate:** audit BC1 later-disposition shadow and WS6 replication/speed harness when either becomes the immediate solver-queue gate; for the WS1 N=160 confirmation, preserve real production search only in the solve stage and keep generation/scoring/aggregation deterministic.
> **Evidence role:** execution-efficiency / harness audit
> **Research questions:** `WS2-REPAIR-DEADLINE-ALLOCATION`, `WS2-CAPABILITY-INVENTION-DEMAND`, `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Production effect:** none.

## Why this audit exists

The CI speed program repeatedly found tests that paid for production execution merely to create fixtures for bookkeeping assertions. Phase 5 of the solver research execution-efficiency plan asks whether current solver research harnesses contain the same defect.

The audit is deliberately scoped to *live* queue work. Closed admissible-order reserve, forced-work-capture, and WS1A remaining-length experiments are reproducibility surfaces, not current optimization targets.

## Generic level-blind targeted sweep

Current WS2 repair-deadline confirmation and any justified capability-invention safety sampling can use `.github/workflows/solver-level-blind-targeted-sweep.yml`.

### Real search that is justified

1. **Execution-family canary**
   - Runs one known-fast real level through `level-blind-capability-sweep.mjs` under the exact resolved config.
   - Purpose is executable config/plumbing validation before expensive fan-out: zero-attempt configurations, malformed output, crashes, or binding deadline mistakes must fail before the population run.
   - The canary uses a known-fast level, so its full configured ceiling does not imply full-budget work when the level solves quickly.
   - This is a real executable-boundary witness, not a substitute for scientific population evidence. Retain it unless measured cost becomes material enough to justify a separately proven cheaper boundary.

2. **Solve and recovery shards**
   - These calls are the experiment itself. Replacing them with deterministic stubs would destroy the scientific question.
   - Recovery re-executes only missing rows after timeout-shaped incompleteness and remains scientific search.

### Plumbing already separated from search

The following stages consume produced rows and do not invoke the solver:

- weighted shard planning;
- report combination;
- exact population validation;
- timeout-recovery population derivation;
- experiment-contract writing;
- work/stage summaries;
- standard result publication.

The relevant combiner/integrity paths already have permanent Node contracts. There is no current evidence that these stages need solver-generated fixtures beyond their ordinary checked-in/synthetic contract tests.

### Execution-efficiency consequence

The earned optimization surface is therefore **around** the solve:
- sparse short-job input materialization;
- exact runtime identity;
- exact dependency-tree reuse on the short planner/canary job;
- later extension to other short orchestration only from measured bootstrap economics.

Do not retarget Phase 5 toward replacing the targeted sweep's population searches.

## WS2 repair-deadline promotion confirmation

The September-25 nomination result used the generic targeted sweep and produced 7 gains / 0 losses on the frozen 53-parent population. The next gate is production-scale matched-work confirmation.

Harness conclusion:
- real control/treatment solve work is scientifically necessary;
- population identity, comparison, integrity, and publication can remain deterministic;
- no bespoke repair-specific workflow is justified merely for performance if the generic targeted sweep can express the final promotion design.

The next promotion design should first specify population/work matching. Harness work is secondary.

## WS2 capability-invention promotion

CID-0027 and CID-0028 already have target-row gains plus zero observed solved-control regressions across their pilot/confirmation samples.

Harness conclusion:
- **do not create another acquisition run solely because an execution-efficiency audit wants a harness to optimize**;
- the immediate gate is a reasoned promotion/safety decision;
- if that decision explicitly requires broader sampling, the scientific rows remain real search and the existing targeted-sweep infrastructure is the default execution surface.

## WS1 N=160 late-continuation confirmation

The current plan calls for one fresh 160-parent block, production solve protocol, then application of the frozen legal-signal model.

The current scoring script, `scripts/apply-action-selection-legal-signal-model.mjs`, is a deterministic JSON read/transform/write step. It performs no solver search.

Therefore any execution workflow for the N=160 block should preserve a clean three-part boundary:

1. **generation / population freeze** — deterministic from the preregistered generator + seed;
2. **scientific solve** — real production solver execution on the frozen block;
3. **frozen-model scoring / integrity / reporting** — deterministic postprocessing.

Do not fuse model scoring into solve execution merely for convenience, and do not run extra solver calls to test scoring/bookkeeping.

The existing generic targeted sweep is suitable for stage 2 once the generated population exists in a stable artifact/file form. Whether generation + freeze deserves a thin one-shot wrapper is an execution-design question, not a reason to invent a new solver runner.

## Deferred live surfaces

### BC1 later-disposition shadow

Still live/supporting. Its value depends on real beam-hosted observation, so the scientific observation path may genuinely require production search. Audit only when its exact dispatch/harness becomes the immediate queue gate.

### WS6 independent-parent replication / speed

Also deferred until it becomes immediate. Keep the same classification discipline: replication/speed measurement requires real solver work; population plumbing and aggregation should not.

## Closed surfaces removed from optimization scope

The following forms remain reproducible but should not receive new Phase-5 optimization effort absent a scientific reopen trigger:

- admissible-order reserve 0.35;
- forced-work capture economics;
- WS1A remaining-length intra-solve bridge.

## Decision

The current live harnesses do **not** reproduce CI's strongest "real work used as fixture generation" defect. The main execution-efficiency wins remain input/runtime/bootstrap architecture and careful design of any new WS1 acquisition wrapper.

This is a useful negative: do not manufacture testability refactors where the expensive operation is the scientific measurement itself.
