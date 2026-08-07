# Hint Workbench

The hint workbench is a CLI for discovering and auditing hint candidates without changing level data by default. It runs generator presets, validates/deduplicates candidates through the shared acceptance path, and writes a JSON report for review.

## Mental model

The workbench separates four concerns:

1. **Generation**: presets run one or more candidate generators.
2. **Validation and dedupe**: every generated path is checked before policy evaluation.
3. **Policy evaluation**: `save-all`, `novelty-gated`, or audit evaluation decides whether a candidate is worthy.
4. **Writing**: accepted candidates are appended to hint artifacts only when `--write-levels` is passed, and audit mode never writes.

Player-facing hint display curation is separate and remains owned by `selectDisplayHints()`.

## Presets

| Preset | What it runs | Use when |
| --- | --- | --- |
| `enumerate-targeted` | Targeted System A/B enumeration around existing hint coverage. | You want a fast, focused search for more variety. |
| `enumerate-complete` | Complete variety-search DFS enumeration. | You want exhaustive enumeration within the configured budgets. |
| `ablation-ui` | Browser-safe solver ablation phases exposed by the in-editor diversification UI (baseline, forward gate x direction, forward portal-exit). | You want ablation-style solver variants without reverse or combined forcing, or want behavior identical to the in-editor "Solve Options" diverse search. |
| `ablation-full` | The full 7-phase solver ablation generator: baseline; forward gate x direction cascade/strategy; gate/goal-swap reversal; forward portal-exit cascade/strategy; swap portal-exit; evidence-bounded combined gate+direction x portal-exit forcing (forward and reversed). Defaults to full coverage (`--directions=forward,reverse --combined=evidence`) unless you narrow it explicitly. | You want the complete standalone-CLI-equivalent ablation sweep for a level, or want to control which phases run via `--directions`/`--combined`. |
| `ablation-combined-only` | Only the evidence-bounded combined phases (F/G). Ignores `--directions`/`--combined`. | You already ran the forward/reverse/portal phases in a prior batch (their discoveries are in `data/hints/`) and want to run just the combined phase against that evidence without repeating the earlier work. |
| `ablation-reverse-only` | Only the gate/goal-swap reverse phases (D/E/G). Ignores `--directions`/`--combined`. | You want to check for direction-sensitive discoveries without re-running the forward phases. |
| `candidate-grid` | Forced-first-step solves (same gate-neighbor forcing primitive `ablation-full`'s cascade phase uses) x strategy-ablation-flag grid, an *unforced* strategy-flag sweep `ablation-full` never runs standalone, and corner-flip mutation of a sampled subset of existing hints (`--seeds`). Ported from the standalone `hint-candidate-search.mjs`, but wall-clock-bounded (`--wall-ms`) so it always persists partial progress instead of losing an interrupted run. Unlike `ablation-full`, does not force portal-exit direction. | You want the unforced strategy-flag sweep or corner-flip local mutation of existing hints, integrated with the shared acceptance/write pipeline. |
| `portal-grid` | Every gate-direction x every portal-destination-exit-direction combo, one plain solve each (no cascade/strategy sweep) — not just the evidence-proven `(gate, direction, portalDest)` triples `ablation-full`'s Phase F/G is bounded to. Hard-capped by **both** `--max-combos` (default 500) and `--wall-ms`. No-op (near-instant) on a portal-less level. | You suspect a level's portal is reachable from a gate/direction no existing hint has ever used, which Phase F/G structurally cannot discover since it only varies the exit direction at an already-evidenced combo. **Opt-in only** — no other preset includes this step, since it's the one technique here with real (bounded but nonzero) combinatorial cost. |
| `ui-plus` | `enumerate-targeted -> ablation-ui -> enumerate-targeted`. | You want the browser-safe practical prototype sweep (no full ablation). |
| `full-practical` | `enumerate-targeted -> ablation-full`. | You want the actual practical cross-product named in the workbench's original proposal: enumeration plus every ablation phase. |
| `full-practical-plus` | `enumerate-targeted -> ablation-full -> candidate-grid`. | You want `full-practical` plus candidate-grid's unforced strategy sweep and corner-flip mutation — and since the accepted pool grows across steps within a level, running `candidate-grid` last means its corner-flip sampling also covers this run's own new finds, not just hints that existed before the run started. |
| `all-practical` | Deprecated alias for `ui-plus`. | Use only for backwards compatibility; it does not include full reverse or combined phases. |

Print preset help with:

```bash
npm run hints:workbench -- --help
```

## Axis overrides

Presets expand into a serializable `axisPlan` in the report. You can override the preset steps for current supported axes with `--include`:

```bash
npm run hints:workbench -- \
  --levels=id:1 \
  --include=enumeration,ablation-full \
  --directions=forward,reverse \
  --combined=evidence \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --output=tmp/hint-workbench-axis-audit.json
```

Supported `--include` values: `enumeration`, `complete-enumeration`, `ablation` (the browser-safe UI subset), `ablation-full`, `ablation-combined-only`, `ablation-reverse-only`, `candidate-grid`, `portal-grid`.

`--directions` and `--combined` control the `ablation-full` step's phase mix:

- `--directions=forward` (default outside `ablation-full`) runs only the forward phases (baseline, gate x direction, portal-exit).
- `--directions=forward,reverse` also runs the gate/goal-swap reversal phases (D/E/G).
- `--combined=off` (default outside `ablation-full`) skips the evidence-bounded combined phases (F/G).
- `--combined=evidence` runs them, bounded to `(gate, direction, portalDest)` triples an existing or newly-discovered hint already proves are jointly reachable.
- `--combined=full` is **not implemented** and fails fast: an unbounded full cross product is deliberately not exposed (see "Dangerous options" below).

Because the `ablation-full` step's own name promises full coverage, it defaults to `--directions=forward,reverse --combined=evidence` when you don't pass either flag explicitly — every other step (enumeration, `ablation-ui`) keeps the plain forward-only/combined-off default. The fixed-name presets `ablation-combined-only` and `ablation-reverse-only` always run their own documented phase subset regardless of `--directions`/`--combined`; those flags only affect the generic `ablation-full` step.

### Dangerous options

`--combined=full` (an unbounded `(gate x direction) x portalDest` cross product, as opposed to the evidence-bounded `--combined=evidence`) is rejected with a clear error — no such mode is implemented. This is intentional: design principle 4 requires expensive combined forcing to be evidence-bounded by default, with any future full-Cartesian-product mode requiring explicit opt-in and a finite budget, not silently reachable through a flag combination.

## Policies and audit mode

| Policy | Behavior |
| --- | --- |
| `save-all` | Accept every valid exact-deduped candidate. |
| `novelty-gated` | Accept candidates that pass `decideCandidateAcceptance()` novelty and coverage scoring. |
| `audit-only` | Evaluate a real policy but keep accepted write paths empty and never mutate hint artifacts. |

For audit runs, choose the policy to evaluate with `--audit-policy=save-all` or `--audit-policy=novelty-gated`:

```bash
npm run hints:workbench -- \
  --levels=id:1 \
  --preset=enumerate-targeted \
  --policy=audit-only \
  --audit-policy=save-all \
  --output=tmp/hint-workbench-audit.json
```

Audit reports use `wouldAcceptPaths` / `wouldAcceptPathSignatures` for candidates that would have been accepted, while `acceptedPaths` remains empty. Use `--policy-report=full` to include per-candidate policy decisions or `--policy-report=rejections-only` to include only rejected candidates with `wouldRejectReason`.

## Report format

Reports are JSON and currently use `schemaVersion: 1`. Each report includes:

- requested and resolved preset metadata;
- resolved `axisPlan` metadata with include axes, directions, combined mode, and expanded steps;
- CLI options, including `auditMode` and `evaluationPolicy`;
- per-level status and hint counts;
- per-generator run summaries with `status` and `exhaustion` fields;
- per-level `axisCoverage` summaries with attempted/completed/budgeted/capped/cancelled steps and produced/accepted counts by step;
- `axisCoverage.ablation` (present only when an `ablation-full`-family step ran): summed `baselineTried`, `gateDirectionsTried`, `swapGateDirectionsTried`, `portalDestDirectionsTried`, `swapPortalDestDirectionsTried`, `combinedTriplesTried`, `swapCombinedTriplesTried`, and the union of `phasesRun` across every such step the level ran. `null` (not a zeroed object) when no ablation-full-family step ran, so "zero combos tried" and "axis never attempted" stay distinguishable;
- accepted or would-accept candidate metadata with generator provenance;
- rejection counts, including exact versus canonical duplicate buckets;
- optional per-candidate policy reports when `--policy-report=full` or `--policy-report=rejections-only` is used;
- write summaries with changed files and post-write reminders when `--write-levels` is used.

Use `--include-paths=false` for compact reports that omit full path arrays while retaining path signatures:

```bash
npm run hints:workbench -- \
  --levels=id:1 \
  --preset=enumerate-targeted \
  --policy=audit-only \
  --audit-policy=save-all \
  --include-paths=false \
  --output=tmp/hint-workbench-compact.json
```

## Read-only audit examples

Fast targeted smoke audit:

```bash
npm run hints:workbench -- \
  --levels=id:1 \
  --preset=enumerate-targeted \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --restarts=1 \
  --node-budget=100 \
  --wall-ms=1000 \
  --max-accepted=1 \
  --output=tmp/hint-workbench-smoke.json
```

Browser-safe practical prototype audit:

```bash
npm run hints:workbench -- \
  --levels=id:1-10 \
  --preset=ui-plus \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --output=reports/hint-workbench/ui-plus-audit.json
```

Full-ablation practical audit (the actual practical cross-product — expect this to take much longer than `ui-plus` since it runs all 7 phases):

```bash
npm run hints:workbench -- \
  --levels=id:145 \
  --preset=full-practical \
  --policy=audit-only \
  --audit-policy=novelty-gated \
  --wall-ms=600000 \
  --output=reports/hint-workbench/level-145-full-practical-audit.json
```

## Write-capable corpus expansion

Only pass `--write-levels --yes=true` when you intend to append accepted candidates to hint artifacts:

```bash
npm run hints:workbench -- \
  --levels=id:145 \
  --preset=enumerate-targeted \
  --policy=novelty-gated \
  --write-levels \
  --yes=true \
  --output=reports/hint-workbench/level-145-write.json
```

Write-capable reports include a `writes` summary with changed files and reminders. The workbench refuses to place report output under source-controlled artifact paths such as `data/` unless `--allow-artifact-output=true` is passed.


To review accepted hints without mutating hint artifacts, write them to a patch JSON file instead:

```bash
npm run hints:workbench -- \
  --levels=id:145 \
  --preset=enumerate-targeted \
  --policy=novelty-gated \
  --write-patch=tmp/level-145-hints.patch.json \
  --output=reports/hint-workbench/level-145-patch.json
```

After applying a patch file or running any write-capable mutation, regenerate and validate derived hint artifacts:

```bash
npm run levels:generate-heatmaps
npm run check:hint-validity
npm run test:hint-path-oracle
```

## Batch parallelism across levels

`hint-workbench.mjs` itself stays single-process/flat (see "Current limitations" below), but `scripts/hint-workbench-parallel.mjs` (`npm run hints:workbench-parallel`) gets cross-level parallelism without touching that structure: it partitions the requested `--levels` round-robin across N child *processes* (not in-process workers — sidesteps the `worker_threads`/tsx-ESM-loader-hook problem entirely), each running an ordinary `hint-workbench.mjs` invocation, then merges their reports (and `--write-patch` files, if used) into one.

```bash
npm run hints:workbench-parallel -- \
  --levels=all --parallel=8 \
  --preset=enumerate-targeted \
  --policy=audit-only --audit-policy=novelty-gated \
  --output=reports/hint-discovery/parallel-audit.json
```

Every flag other than `--levels`/`--output`/`--parallel`/`--allow-artifact-output`/`--write-patch` is passed straight through to each child verbatim (`--preset`, `--policy`, `--write-levels`, `--wall-ms`, `--seed`, …). Concurrent `--write-levels` is safe by construction: `writeLevelsWithHints` (`level-data-io.mjs`) only rewrites a level's own per-level `hints/<id>.json` file when that level's in-memory `.hints`/`.hintRecords` identity changed since read, and `levels.json` itself never carries hints at rest for a split corpus — so N children touching disjoint level slices never race on the same file for the same level (see that function's own comment, which names this exact scenario). `--write-patch` is handled specially: each child gets its own per-shard patch path (a single shared path would let the last-finishing shard silently overwrite every earlier shard's patch), merged into the user's requested path afterward.

This is level-level parallelism only — it doesn't help a single slow level finish faster, and per-step evidence chaining (e.g. `ablation-full`'s portal-exit-forcing phases seeing an earlier step's finds) still only happens within one child process, same as today.

## Current limitations

- `--combined=full` (unbounded combined forcing) is not implemented; only evidence-bounded combined forcing (`--combined=evidence`) is available. Dangerous full Cartesian products are not exposed as a reachable default or option.
- `scripts/hint-diversification.mjs` (the standalone CLI) and `scripts/hint-workbench.mjs` both call the same `modules/solver/hint-ablation-generator.ts` engine, but there is no automated test proving byte-for-byte candidate parity between them beyond each independently testing correct behavior against the shared engine.
- The default report output path (`reports/hint-workbench/latest.json`) has no timestamp/tag convention, so repeated local runs overwrite it unless you pass `--output` explicitly; it is gitignored (`reports/hint-workbench/`), so this is a local-workflow inconvenience, not an accidental-commit risk.
- `hint-workbench.mjs` itself is intentionally **not** the home for worker-thread-parallel batch tooling: `scripts/hint-complete-enumeration-sharded.mjs` (sharded exhaustive enumeration *within* a level) needs a self-spawning `isMainThread`-gated worker-pool script structure that conflicts with the workbench's flat single-script step model — see that script's own header comment. This is a deliberate split, not a gap: use it directly for genuinely exhaustive/resumable/worker-parallel enumeration of one level; use the workbench's own sequential `enumerate-complete` step for a quick per-level check. Cross-*level* parallelism (many levels at once) is covered instead by `hint-workbench-parallel.mjs` above, which sidesteps the same constraint by using separate processes instead of in-process workers. See `reports/2026-07-25-hint-tool-comparison.md` for the investigation that found this split.
- `scripts/hint-candidate-search.mjs` (the standalone CLI whose technique `candidate-grid` ports in)
  remains a separate, supported candidate-discovery entry point. **Retention decision (2026-08-07):
  keep it** until a parity/migration check proves the workbench covers every documented use; the
  presence of an overlapping technique is not by itself a reason to delete a working workflow.

## Admissible-slack ordering (`--enum-order=admissible-slack`)

`enumerate-targeted`/`enumerate-complete` (`modules/solver/hint-enumeration.ts`, shared with `hint-corpus-expand.mjs` and `hint-complete-enumeration-sharded.mjs`) is a separate move-tree walker from the production solver ladder — it has no knowledge of last-resort tiers like `admissible-order-search` by default. `--enum-order=admissible-slack` (default `random`, every existing call unaffected) closes part of that gap: it reuses `admissible-order-search.ts`'s own `rankByAdmissibleSlack` ranking (least admissible slack first — the same "most-constrained-first" signal that production tier uses) **together with** the full admissible pruning gauntlet (`evaluatePrunedMove` — must-pass/must-cross/surround/adjTurn lower bounds, not just this engine's own weak over-length/over-intersection/goal-distance checks). Both pieces are required together: ranking alone, paired with the weaker default pruning, was measured to be *actively worse* than random on a must-pass test level (an admissibly-dead branch that the ranking puts first isn't rejected quickly by the weak pruning, so it gets explored deeply instead of rejected in O(1)) — see `modules/solver/hint-enumeration.ts`'s own `EnumOptions.orderBy` doc comment for the full incident writeup. With both pieces together, measured on the same test level: ~10.8x fewer nodes needed for full exhaustion (identical solution set, verified), and a solution found within a 100-node budget where a fixed-seed random restart found none in the same budget.

Use `--enum-tie-break=true` to also apply a soft-heuristic tie-break among equal-slack candidates (an empty `{}` `ScoringProfile`, i.e. every weight at its default) instead of leaving ties in `getNeighbors()`'s own order; default `false` (no tie-break) is the simpler, assumption-free choice, since the named tie-break profiles in `POLICY_PROFILES` were tuned for `admissible-order-search`'s own last-resort single-solve context, not open-ended enumeration.

`--restarts` is automatically capped to 1 under this mode (`variety-search.ts`): admissible-slack ordering is fully deterministic (never reads the RNG), so a second restart lap over the same gate would retrace the identical tree and find nothing new — every restart past the first would be pure waste.

**Persisted provenance reflects this mode, not just search behavior.** A hint's stored
`HintProvenanceEntry.solver.technique` gets a `:admissible-slack` suffix (e.g.
`'enumerate-targeted:admissible-slack'`), and `profile` is set to `'flat'` when `--enum-tie-break=true`
was used — so a hint found this way is distinguishable in `data/hints/<id>.json` from one found via
plain random order, not just in the audit report. This was a real gap when the option first shipped
(threaded into search behavior but never into what gets written to disk) — see
`reports/2026-07-25-hint-tool-comparison.md`'s "is persisted provenance actually complete" follow-up
and CLAUDE.md's hint-provenance section for the incident and the general lesson it left behind.

```bash
npm run hints:workbench -- \
  --levels=id:145 \
  --preset=enumerate-targeted \
  --enum-order=admissible-slack \
  --policy=audit-only --audit-policy=novelty-gated \
  --output=tmp/admissible-slack-audit.json
```

The same two flags (`--enum-order`, `--enum-tie-break`) also work on the standalone
`scripts/hint-corpus-expand.mjs` (System A/B) and `scripts/hint-complete-enumeration-sharded.mjs`
CLIs, which call the same `hint-enumeration.ts` engine directly — both restarts-cap and
worker-thread config passthrough are wired the same way. `hint-complete-enumeration-sharded.mjs`
in particular benefits from this more than ordering choice alone would suggest, since its whole job
is exhaustive enumeration and the stronger pruning half of the package deal reduces the *total*
nodes needed to fully exhaust a tree, not just how fast a first solution appears — **verified on a
real published level** (not a constructed one): `P00105` went from 353,444 total nodes (default) to
28,294 (`--enum-order=admissible-slack`), a ~12.5x reduction, both runs fully exhaustive and
finding the identical 3 solutions.

This also surfaced and fixed a real bug in the shared `rankByAdmissibleSlack` (production code,
also used by `admissible-order-search.ts`'s own last-resort solver tier): negative-slack
(already-dead) candidates were sorting *first* instead of last, contradicting the function's own
doc comment. Fixed 2026-07-25 — provably safe for correctness either way (an already-dead
candidate is still rejected in O(1) by `evaluatePrunedMove` regardless of where it lands in the
ranking), and `npm run solver:bench -- --check` showed no regressions (160/160 solved, consistent
across every run). An isolated A/B on the full published corpus (fix toggled on/off, same
codebase otherwise) put the fix's own full-corpus node-count effect within this solver's known
run-to-run variance (wall-clock-gated technique racing) — provably never-worse, but not reliably
measurable as a specific percentage at this scale; see
`reports/2026-07-25-hint-tool-comparison.md`'s "was any of this applicable to the solver itself?"
follow-up for the full writeup, including a correction of an earlier overstated number from
comparing against a stale baseline instead of an isolated A/B.

Not yet validated at real-corpus scale for the *enumeration* use case specifically (the P00105
result above is for `hint-complete-enumeration-sharded.mjs`'s exhaustive-enumeration case, not yet
repeated across the full corpus, and the `enumerate-targeted`/`hint-corpus-expand.mjs` targeted-mode
numbers are still from one constructed must-pass test level) — a good next step for anyone picking
this up would be a full published/stress-corpus A/B, the way `admissible-order-search`'s own
production validation was done (see `reports/2026-07-24-admissible-order-search-corpus2-validation.md`).
