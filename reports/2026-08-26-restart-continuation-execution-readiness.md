# Restart-vs-continuation execution-readiness prerequisite

> **Status:** concluded-positive
> **Last evidence:** 2026-08-26 — new `runRepairRestartVsContinuation` harness, unit accounting tests, and a `repair-direct-probe.mjs --work-budget` CLI smoke run against a real corpus level
> **Decision:** the execution-readiness gate [`2026-08-24-restart-continuation-value-audit.md`](2026-08-24-restart-continuation-value-audit.md) required before any restart-vs-continuation A/B can run is now closed. The primary comparison (seed 0 continued to `W` canonical work units versus seed 0 to `W/2` then, only on failure, fresh seed 1 to the remainder) can now be executed and measured in the correct currency (`workSpent`, not raw nodes). No population-scale A/B has been run yet — that is the queue's next gate, not this report's.
> **Remaining gate:** freeze a baseline-failure-conditioned residual population (per the audit's "Population" section) and run the single prespecified primary comparison on it, reporting solved/`workSpent`/nodes per the audit's "Outcomes to report" list, then independent confirmation before any promotion claim.
> **Evidence role:** discovery (this is tooling/accounting evidence, not a solve-quality result)
> **Selection:** prespecified — the harness implements exactly the "smallest faithful execution prerequisite" the audit already specified; nothing here was chosen after seeing solve outcomes.

## What was built

The audit found that `repairSearchFromGate` already terminates correctly on `prep._workCap` (repair-search.ts's own budget check), so canonical work capping was already a real termination condition — the missing piece was purely a caller that drives two arms through it in the correct sequence and sums their cost, since the only exposed batch-tooling knob (`repairLateProbeNodeBudgetOverride`) is a flat node count, not canonical work.

Added `modules/solver/restart-continuation-harness.ts` (`runRepairRestartVsContinuation`), which:

- runs the **continuation arm** as one `repairSearchFromGate` call at seed salt 0 with `prep._workCap` set to the full budget `W`;
- runs the **restart arm** as seed salt 0 capped at `W/2` on a fresh `prep`, then — only if seed 0 did not solve — seed salt 1 on the **same `prep`** capped at the remaining `W - workSpent(seed0)`, following the identical "extend, don't share the depleted pool" `prep._workCap` sequencing orchestration.ts's own production multi-seed retry tier already uses;
- reports each arm's `solved`, `workSpent` (summed across every seed that ran, not just the last), `nodesExpanded`, and the seed salts actually used.

`repairSearchFromGate`'s own elites/nogood cache/PRNG streams are local to each call, so reusing one `prep` across the restart arm's two calls does not carry any search state between seeds — seed 1 is a genuinely fresh trajectory, only `_workMeter`/`_workCap` bookkeeping is shared.

Wired into `scripts/repair-direct-probe.mjs` as `--work-budget=<n>` (mutually exclusive with `--races`), so a single corpus level/gate can be probed directly, e.g.:

```
node scripts/run-bundled.mjs scripts/repair-direct-probe.mjs -- --corpus=data/levels.json --level=44 --gate-index=0 --work-budget=200000
```

## Acceptance test (accounting, not solves)

Per the audit: "the acceptance test for that prerequisite is accounting, not solves: on deliberately failing fixtures, the two arms must terminate within the same canonical-work envelope ... and telemetry must sum failed seed work rather than reporting only the final seed."

`modules/solver/restart-continuation-harness.test.ts` uses the same parity-impossible fixture `repair-search.test.ts` already uses (a portal-free 1x3 corridor with `reqLen=1`, which repair can never solve) plus a trivially solvable fixture, and checks:

1. both arms stay within the requested `workBudget` (up to the work meter's own per-restart check granularity) and actually spend close to the full envelope on a fixture that can never succeed (proof the cap is the real terminating condition, not an early giveup);
2. the restart arm's reported `workSpent` equals an independently replayed sum of seed 0's and seed 1's own work — not roughly half that value, which is what "reporting only the final seed" would produce;
3. the restart arm skips seed 1 entirely (and reports `seedSalts: [0]`) when seed 0 already solves;
4. a 10x larger work budget buys proportionally more spent work on the never-solves fixture.

All four tests pass; `npm run check` (including `check:types`) and the full `repair-search.test.ts`/`orchestration.test.ts` suite (154 tests) pass unchanged.

## What this does not establish

This is purely the execution-readiness prerequisite. It says nothing about whether restart beats continuation at equal work — that is exactly the question the audit reserves for the next gate, on a frozen baseline-failure-conditioned residual population, as a single prespecified primary comparison (not a swept schedule). Do not treat the CLI smoke run above (which happened to solve immediately in both arms on an easy level/gate) as evidence either way.
