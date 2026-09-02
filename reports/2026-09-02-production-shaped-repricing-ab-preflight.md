# Production-shaped static repricing A/B: preflight and in-flight join dispatch

> **Status:** active
> **Last evidence:** 2026-09-02 — GitHub Actions run [`33588487486`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33588487486) dispatched (`solver-stress-refresh.yml`, exact commit `a3a7bb109b8212bd8e3afe37b09bcfcd2d74abcf`, `main` head at dispatch time, `lifecycle_telemetry=true`, every other input default: 60 shards, `max_parallel=20`, `deterministic=false` — the normal canonical-refresh shape, so it also updates the canonical baseline/latest reports on completion).
> **Decision:** no treatment selected yet; this fixes only the mechanical evaluation protocol (envelope, population, confirmation rule) the eventual development A/B and confirmation must follow, before the join data that will inform the treatment choice exists.
> **Remaining gate:** run `33588487486` must complete and pass its own embedded join `--check` gate; then select the smallest candidate the protocol below allows and run the development A/B.

## Why now

Workstream 2's budget-model-completion prerequisite (`solver-scheduling-policy.md`'s "Budget-model completion prerequisite" steps 1-7) is now satisfied: all nine ms-derived work-dose sites are migrated (see `docs/solver-budget-determinism.md`), and the whole-ladder deadline-independence regression (step 6/"Expand the invariant") is in place and passing (`2026-09-02-whole-ladder-deadline-independence-widening.md`). `docs/solver-optimization-workstreams.md`'s Workstream 2 row names the next gate explicitly: join the corrected EW1 equal-work pricing (`reports/stress/ew1/33156541827-pricing-snapshot.json`) to current production reach/work via `solver:analyze-equal-work-production-reach --require-current-head --check`, then prespecify the smallest production-shaped static repricing A/B.

The join requires a current-head production lifecycle-telemetry report — one does not yet exist at (or near) the exact commit this session left `main` at, so the first action was to dispatch the canonical refresh that produces it, rather than to invent a stand-in from a stale run. That dispatch is now in flight; this document is the "work ahead while it runs" half of that gate, per this session's own operating instruction not to leave a long run idle.

## What the in-flight run supplies

`solver-stress-refresh.yml` with `lifecycle_telemetry=true` (per that input's own description in the workflow file) adds `--lifecycle-telemetry` to both corpus solves, emits mass-weighted failure maps, and **runs the durable corrected-EW1 × exact-dispatch production-reach/work gate itself** as part of the workflow — i.e., the join in `docs/solver-optimization-workstreams.md`'s "Current post-naming Workstream-2 handoff" section is not a separate manual step for a normal dispatch; the workflow writes `equal-work-production-reach.{json,md}` under `reports/stress/capability-runs/<run-id>/` and fails its own decision gate if commit/corpus provenance, lifecycle telemetry, capability coverage, or matched attempt work is incomplete. Manual `solver:analyze-equal-work-production-reach` remains available for reconstruction/forensics only.

On completion, the concrete next action is:

```bash
npm run gha:fetch-result -- --run=33588487486   # or --workflow=solver-stress-refresh.yml, latest
```

(per `AGENTS.md`'s routing table: "Completed GHA solver/research run") to retrieve `reports/stress/capability-runs/33588487486/equal-work-production-reach.{json,md}`, confirm its own `--check` gate passed, and read the joined view together with the current technique-capability map (`reports/2026-09-01-technique-niches-and-unsupported-level-anatomy.md`).

## What can be prespecified now, and what cannot

Per `solver-evaluation-evidence.md`, a candidate selected after seeing outcomes is development evidence, and confirmation strength scales with selection pressure. The **treatment itself** (which action/tranche to reprice, and how) is a genuine empirical question the join has not yet answered — nothing here should be read as prejudging it. What *can* be fixed now, before that data exists, is the mechanical **protocol** the eventual development A/B and its confirmation will follow, so that landing the join data does not become an opportunity to also improvise the evaluation rules around whatever the data happens to show.

### Protocol (fixed now)

1. **Envelope.** Use `strictTotalWorkBudget: true` for both control and treatment, matching every prior repricing A/B in this program (`2026-08-25-scheduler-static-repricing-join.md`'s own development/confirmation pair; `solver-budget-determinism.md`'s "Matched-work experiments" and "Scheduler portfolio contract" sections). A candidate that only wins by escaping the declared shared envelope is disqualified outright, not merely down-weighted.
2. **Candidate scope.** Per `solver-scheduling-policy.md`'s "Configuration and portfolio search" complexity ladder, the first candidate must be a small, legally-scoped reallocation of the *existing* action grammar (e.g., suppressing/narrowing/re-tranching one or two named actions or continuation bands) — not a new action, not a learned/dynamic policy, and not a Cartesian sweep. `docs/solver-optimization-workstreams.md`'s own guardrail applies: a materially different premise is required if this reopens ground the closed global two-DFS-suppression form (`2026-08-25-scheduler-static-repricing-join.md`) already covered.
3. **Development population.** Reuse the durable, already-mined 60-level EW1 frozen-gap sample (`reports/stress/ew1/33156541827-pricing-snapshot.json`'s own level set) for the *development* A/B, since it is already the join's own reference population and reusing it does not spend a fresh cohort. Explicitly label any result on it as development evidence, per this program's own established practice (the 2026-08-25 report's identical framing).
4. **Confirmation population.** A locked, disjoint cohort **not** touched during development, materialized once from a pinned generator revision and hash-verified before search — the same discipline `confirm-broad-001` used. Do not reuse `transfer-envelope-001` or any other previously-spent pool (`solver-evaluation-evidence.md`'s pre-partitioned-block rule).
5. **Frozen acceptance rule.** Adopt the same bar the last repricing confirmation used and failed against, since it is this program's own established standard, not an arbitrary choice: **zero solve losses**, plus **either** a solve gain **or** at least **10% lower aggregate `workSpent`**, decided on the aggregate verdict before individual changed level IDs are inspected.
6. **Rare-capability guardrail.** Per `solver-optimization-workstreams.md`'s "Workstream-wide rules" ("Scheduler/repricing experiments must report rare-capability retention, not only aggregate solves/work"), separately audit singleton/doubleton and specialist-only cohorts (from the 2026-09-01 technique-niches map) for the treatment, in addition to the aggregate metric above. A cheaper aggregate that silently erases a specialist-only capability is not a pass even if it clears rule 5.
7. **Reporting.** Follow `solver-scheduling-policy.md`'s Promotion path steps 9-10 shape: report gains/losses, `workSpent`, wall cost, reach, actions/tranches touched, and rare unique losses — not just the top-line delta.

### Deliberately deferred until the join lands

- Which action(s)/tranche(s) the candidate touches.
- The candidate's exact mechanical form (a suppression, a tranche cap, a reordering, or a reserve-fraction change).
- Whether one candidate suffices or a small racing set is warranted (per the complexity ladder's step 2, "construct a small fixed-work static portfolio" is itself a legitimate first move, not necessarily a single hand-picked rule).

Fixing the protocol first and the treatment second is itself the anti-selection discipline this program has repeatedly needed (see the "confirmation-workflow treatment-flag wiring bug" and prior null confirmations catalogued in `docs/solver-optimization-workstreams.md`'s Workstream 1 row) — a treatment chosen to match a protocol invented after seeing the data would be a materially weaker result even if it looked identical on paper.

## Next step

When run `33588487486` completes: fetch its result, confirm the join's own `--check` gate passed, read the joined residual-value/reach table together with the technique-capability map, select the smallest candidate the protocol above allows, and run the development A/B on the EW1 sample under `strictTotalWorkBudget`. Do not expand or re-run EW1 itself merely for smoother rankings (an explicit standing rule in `solver-optimization-workstreams.md`).
