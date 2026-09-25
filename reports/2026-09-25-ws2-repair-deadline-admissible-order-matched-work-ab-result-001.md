# WS2 repair-deadline / admissible-order matched-work A/B result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-25 — GHA dispatch, frozen 53-parent shared-acquisition population, `solver-level-blind-targeted-sweep.yml`, solver ref `ad35d752e9a24648175592c5571e0bb2a9727e04`.
> **Decision:** `WS2-REPAIR-DEADLINE-ALLOCATION` is **POSITIVE (nomination)** — 7 treatment-only referee-valid solves, 0 control-only losses, matching the preflight's own bridge-positive bar exactly. `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` is **CLOSE NEGATIVE** — the treatment's solved set is byte-identical to control's (same 30 levels), including on both rows (`R02219`, `R03354`) the design specifically sized the fraction for.
> **Remaining gate:** repair-deadline advances to the ordinary promotion path (matched-work confirmation at production scale), per the preflight's own gate — this result is nomination evidence, not a production authorization. Admissible-order reserve fraction 0.35 is closed in this tested form; do not retest at this population/scale without a materially different premise.
> **Evidence role:** first real dispatch of both predeclared A/Bs (design/preflight already frozen; this is execution).
> **Research questions:** `WS2-REPAIR-DEADLINE-ALLOCATION`, `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION`
> **Production effect:** none. Research-only dispatch via CLI overrides; no `--save-hints`; no production default changed.

## Two real bugs found and fixed before this result was obtainable

`solver-level-blind-targeted-sweep.yml` had never completed successfully with more than one level per
shard (its normal operating mode) since its introduction two days prior:

1. **Multi-level shard bug**: the shard-run and recovery-pass steps ran
   `levels="pos:$(echo "$levels" | sed 's/pos://g')"` on `matrix.shard.levels`, which
   `plan-highbudget-shards.mjs` already emits as a comma-joined `pos:X,pos:Y,...` string with one
   prefix per token. The `sed` stripped every `pos:` prefix and the substitution re-added only one,
   at the front, so every shard with more than one level passed bare unprefixed numbers after the
   first — which `level-blind-capability-sweep.mjs` explicitly rejects as ambiguous. Fixed by passing
   `matrix.shard.levels` through unmodified.
2. **Wrong `configurationHash` path**: the "Declare the native v3 experiment contract" step read
   `combined.json.configurationHash` (top-level), but `combine-solver-sweep-reports.mjs` nests it at
   `combined.json.summary.configurationHash`. The wrong path produced JS `undefined`, and
   `JSON.stringify(undefined)` printed via `node -p` emits the literal token `undefined` — invalid
   JSON — corrupting the generated experiment-contract spec and failing the workflow at combine-final
   on every dispatch, after all real shard compute had already succeeded. Fixed by correcting the path.

Both fixes are committed on this branch (`c832025d`'s follow-ups); this A/B's dispatches are the first
to exercise the fixed workflow end-to-end.

## Protocol

Both arms: `scripts/level-blind-capability-sweep.mjs` production defaults via
`solver-level-blind-targeted-sweep.yml`, `--corpus=data/stress/stress-levels-random.json`,
`--node-budget=50000000`, derived `--work-budget=67000000`, generous non-binding `--budget-ms`,
level-blind. Population: the existing frozen 53-parent shared-acquisition population (23 Class-3
residual + 30 solved controls), reused verbatim from
`reports/stress/failure-evidence/ws2-class3-shared-acquisition-population-2026-09-20.json` — no new
acquisition. A single control dispatch (no override) served both A/Bs, since both questions' control
arm is identically "production defaults, no override."

- **Control**: [run 36119211454](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119211454) — 30 solved / 53, work=6,685,622,679, nodes=5,470,329,675.
- **Repair-deadline treatment** (`earlyRepairSearchOrdinaryNodeBudget=21000000,earlyRepairSearchBiasedNodeBudget=38000000`): [run 36119216418](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119216418) — 37 solved / 53, work=7,209,588,509, nodes=4,525,572,857.
- **Admissible-order treatment** (`admissibleOrderNodeReserveFraction=0.35`): [run 36119221345](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119221345) — 30 solved / 53, work=6,588,711,942, nodes=5,425,421,812.

## Result: WS2-REPAIR-DEADLINE-ALLOCATION — POSITIVE

| Metric | Value |
|---|---:|
| Control solved | 30/53 |
| Treatment solved | 37/53 |
| Treatment-only gains | **7** |
| Control-only losses | **0** |
| Total work ratio (treatment/control) | 1.078 (more solves cost more total work) |
| Total nodes ratio | 0.827 (fewer nodes — solved rows exit early instead of grinding to the node cap) |

Gained levels (all previously `node-budget-reached` under the 2M/6M production defaults, all
`success` under the raised 21M/38M caps): `R00306`, `R01086`, `R02138`, `R02892`, `R03109`, `R03251`,
`R03323` — 7 independent parents, no single level dominating.

Applying the preflight's own bridge-positive bar (`reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md`):
"treatment-only referee-valid solves >= 1, zero control-only losses" — met decisively (7 vs the >=1
floor, 0 losses against the "target is zero" bar). This is **nomination evidence for the two node-cap
constants specifically** (`earlyRepairSearchOrdinaryNodeBudgetOverride`/
`earlyRepairSearchBiasedNodeBudgetOverride`), not a production change and not reopening the
closed-negative broad 4x work-ladder economics question — per the preflight, the next gate is the
ordinary promotion path (matched-work confirmation at production scale, the same path
`WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION` already completed).

## Result: WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION — CLOSE NEGATIVE

| Metric | Value |
|---|---:|
| Control solved | 30/53 |
| Treatment solved | 30/53 |
| Treatment-only gains | **0** |
| Control-only losses | **0** |
| Solved-set identity | **byte-identical** — same 30 level ids in both arms |

Both rows the design specifically sized the 0.35 fraction for (`R02219` at 28.6% headroom, `R03354`
at 32.2%) remain `node-budget-reached` (unsolved) under the treatment — the larger reserve did not
close either gap at this population/scale, despite the canary confirming the reserve itself genuinely
scaled to ~17.5M (vs. 12.5M default), a real 1.4x increase reaching `SolveOpts` correctly.

Applying the design's own bar (`reports/2026-09-25-ws2-admissible-order-reserve-repricing-matched-work-ab-design-001.md`):
zero rescues on the residual tranche, zero losses on the solved-control tranche — a clean, fully
determined negative (not underpowered or ambiguous; every row's outcome is identical across arms).
Closes `admissibleOrderNodeReserveFractionOverride=0.35` on this frozen 53-parent population. Per the
design's own foreclosure, do not retest this fraction on this population, and do not escalate toward
the expensive band (0.625-0.965, R02277/R01269/R02979) without a new, separately-justified design
that explicitly models the larger earlier-stage risk.

## What this does not authorize

- No production default change for either constant.
- No reopening of the closed-negative broad 4x total-budget escalation question.
- No merging the two questions — they remain cross-validated but distinct mechanisms, confirmed here
  by their genuinely different outcomes on the identical population.
- No claim that `WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION` is closed at every fraction or population —
  only the tested 0.35-fraction form on this specific 53-parent population.

## Artifacts

- GHA runs: [36119211454](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119211454) (control),
  [36119216418](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119216418) (repair-deadline treatment),
  [36119221345](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/36119221345) (admissible-order treatment).
- `reports/2026-09-25-ws2-repair-deadline-allocation-node-cap-seam-and-ab-preflight-001.md` — originating preflight and decision rule.
- `reports/2026-09-25-ws2-admissible-order-reserve-repricing-matched-work-ab-design-001.md` — originating design and decision rule.
- `.github/workflows/solver-level-blind-targeted-sweep.yml` — the two bug fixes that made this dispatch possible.
