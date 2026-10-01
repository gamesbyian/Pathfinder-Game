# Solver queue exhaustion audit — 2026-10-01

## Conclusion

**PASS after reconciliation:** the current solver-science execution queue is exhausted.

This means there is no presently earned immediate solver experiment under the repository's own research rules. It does **not** mean the solver is globally optimal or that future evidence cannot reopen work. Future execution must enter through a named reopen condition, a materially changed premise/corpus/solver, or a new decision-bearing residual observation.

## Scope

Audited the authorities and likely resurrection surfaces that can make solver work appear live:

- `docs/solver-optimization-workstreams.md`
- `docs/solver-research-question-relations.json`
- `docs/solver-future-work.md`
- `docs/solver-capability-invention-program.md`
- `docs/solver-research-execution-efficiency-plan.md`
- `docs/solver-opt-in-experiment-ledger.md`
- current open pull requests
- solver/research branches with emphasis on recent Claude queue branches
- contract tests intentionally encoding workstream gate state

## Findings

### 1. No review-resident active work

There were no open pull requests at audit start. The current main history already contains the October 1 BC1 closeout/promotion work.

### 2. Canonical queue prose and table disagreed on BC1

The narrative correctly said `WS2-CUT-BALANCE-PROJECTION` / BC1 was closed and promoted, but the workstream table still marked 2X as `supporting` / `bounded-compute` and instructed the next agent to find a cheaper pre-filter.

Reconciled to `closed` / `reopen-only`.

### 3. Machine-readable BC1 state was stale

`solver-research-question-relations.json` still marked `WS2-CUT-BALANCE-PROJECTION` as `active-candidate` and described the pre-promotion shadow economics as current.

Reconciled to `concluded-positive`, with the production promotion, closed tested descendants, and exact reopen condition recorded.

### 4. WS6 looked more executable than the canonical queue intended

The workstream authority called WS6 supporting, but the question graph marked it `active-candidate`. The evidence remains a one-parent development-positive microscope result; no immediate consumer justifies buying replication merely to keep research moving.

Reconciled to `deferred-reopen` / `blocked/conditional`. Independent-parent replication remains legitimate only when a suitable population and concrete consumer make it decision-changing.

### 5. Future-work prose retained obsolete active gates

`solver-future-work.md` still said:

- cut balance active;
- repair-deadline active;
- reserve repricing nominated;
- H3 allocation / reserve repricing were earned designs in language that could be read as current priority.

Rewritten as historical/conditional state.

### 6. Capability-invention program still contained a live execution list

The program still instructed agents to continue demand sampling and run the BC1 consumer even though BC1 is complete. That section is now a re-entry contract rather than an execution queue.

### 7. Execution-efficiency plan still advertised closed scientific gates

Its Phase 5 "current live surfaces" still listed repair-deadline, CID-0027/0028, BC1 and WS1 confirmation. Phase 7 still waited for WS1 confirmation even though that confirmation concluded negative.

Those are now explicitly historical/non-activated. Infrastructure measurement is dormant until future independently justified solver work produces a real need.

### 8. WS1 question record contained an internal contradiction

The same record both reported the completed N=160 negative confirmation and later constrained agents with "the plan is designed, not dispatched." The stale constraint was replaced with the actual terminal result and a no-rerun rule for the frozen model.

### 9. One contract test encoded the old WS6 gate class

`scripts/research-system-inventory-node-test.mjs` expected `bounded-compute`. It now expects `blocked/conditional`, matching the reconciled authority.

### 10. Old Claude queue branch is not an orphaned source of current work

`claude/solver-optimization-queue-ybpl88` remains ahead of its old merge base, but its material September 26 closure work is already represented on current main. In particular, main already contains the synthetic research-query fixtures added when WS1/WS2 closure emptied the old live-gate bucket, and the promoted early-repair constants. Do not resurrect the branch as a current queue.

## Terminal state

Immediate solver-science execution:

- repair-deadline allocation — **closed / promoted**
- CID-0027 / CID-0028 exposure harvest — **closed / promoted**
- WS1 frozen action-selection model — **closed negative**
- BC1 fresh-connectivity prune — **closed / promoted**
- forced-work tested forms — **closed**
- parity tested forms — **reopen-only**
- WS6 dependency-conditioned repair — **supporting deferred premise, no immediate gate**
- exact/reference service — **on demand, not research priority**

Therefore there is no active immediate-execution solver-science row after this reconciliation.

## What can legitimately restart research

A future agent may reopen solver science only from evidence that satisfies an existing reopen condition or creates a materially new question, for example:

- a materially changed solver/corpus or fresh residual exposes a new decision-bearing capability gap;
- a new exact/topological fact family earns its own proof and economics path;
- a suitable independent-parent population plus concrete repair consumer makes WS6 replication decision-changing;
- the parked BC1-off final retry becomes economically relevant under a changed recovery/cost tradeoff;
- a materially different legal-signal model earns a fresh WS1 question.

Repository/infrastructure work, convergence audits, evidence hygiene, and services may continue independently, but they are not solver-science queue entries.

## Audit verdict

The phrase **"solver queue exhausted" is now an explicit repository state rather than an inference from a collection of closed experiments.**

No new solver experiment is justified solely because the queue is empty.
