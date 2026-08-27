# Repair live-prefix reconstruction classification: `R00630` and `R02449`

> **Status:** concluded-positive
> **Last evidence:** 2026-08-27 — direct `closeLengthGap`/randomized-rollout invocation from CP-SAT-verified live prefixes, referee-validated
> **Decision:** both cases are **live-and-reconstructable by `closeLengthGap`**, but at sharply different cost: `R00630` solves in 3,247 nodes (under `closeLengthGap`'s own 4,000-node production budget), `R02449` needs 1,268,180 nodes (317x that production budget). Neither resembles `R00648` (live but defeats the same operator even at 500x budget). This is a third regime the parent audit's two-quadrant matrix ("live+succeeds" / "live+fails") did not name: **live, reconstructable in principle by the same named operator, but only far outside the work production actually allocates to it.**
> **Remaining gate:** none for these two cases specifically. The parent audit's broader gate (classify the remaining exact-live retreat cases) is now satisfied for `R00630` and `R02449`; `R02449`'s own CP-SAT interior `[20,36]` stays open per the original report (not re-attempted here, out of this report's scope).
> **Evidence role:** discovery (single-case forensic classification, same role as the R00648/R03176 diagnostic this reuses)
> **Selection:** prespecified — `R00630`/`R02449` are exactly the two remaining "supported elites with resolved or bracketed boundaries" the parent audit named as not yet run through this diagnostic; the operator (`closeLengthGap`, `floor=0`) and node budget (2,000,000, matching the R00648/R03176 precedent) were fixed before invocation, not chosen after seeing either result.

## Question

[`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s "Remaining bounded pilot" asked to classify the other already-resolved exact-live cases the same way `R00648`/`R03176` were classified: replay a proven CP-SAT-verified live (`D_live`) prefix into native state, invoke one named existing reconstruction operator, and report solve/failure plus cost. `R00630:elite:0` (`low=36`, `high=37`, post the `real_N`-constraint fix in [`2026-08-15-cpsat-flipping-filter-support.md`](2026-08-15-cpsat-flipping-filter-support.md)'s Part 4) and `R02449:elite:3` (`low=19`, referee-verified feasible; `high=37`) were the two with a resolved boundary that had never been run through this diagnostic — that report explicitly left this as future work ("too thin a sample for a real verdict on its own").

## Method

Reused, rather than re-derived, everything upstream:

- the elite paths, exactly as dumped in `reports/stress/repair-retreat-broaden-elite-paths-2026-08-13.json`;
- the corrected post-fix boundaries from `2026-08-15-cpsat-flipping-filter-support.md`'s Part 4 (`R00630`: `low=36,high=37`; `R02449`: `low=19,high=37`) — the pre-fix `reports/stress/repair-retreat-broaden-round1-2026-08-13.json` file's own `R00630`/`R02449` entries predate that fix and record a stale `unsupported-mechanics` abstention, not used here;
- `scripts/stress/repair-plateau-rollout-classifier.mjs`'s existing `--retreat-file` mode for the randomized-rollout half (already implemented and smoke-tested per that same report, just never run at full scale/written up for these two cases).

Two small fixes/extensions to existing tooling, no production code touched:

1. **Bug fix:** `repair-plateau-rollout-classifier.mjs` imported `../../modules/Solver.ts` (capital `S`) but the real module is `modules/solver.ts` — silently worked on a case-insensitive filesystem, hard-failed here. Corrected the import path.
2. **Extension:** added `--close-gap-node-budget=<n>` (default 0 = skip), which — in `--retreat-file` mode — also invokes the real `closeLengthGap` operator (`__closeLengthGapForTests`) directly from each elite's verified-feasible depth with `floor=0` (full backtrack to the gate), exactly mirroring the original `R00648`/`R03176` diagnostic's own hand-run invocation, now reusable instead of another ad hoc script.

Command:

```
node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --retreat-file=<constructed-boundary-file> \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-reconstructability-classification-2026-08-27
```

`--backoffs=0` restricts the rollout ladder to exactly the verified-feasible depth itself (no ladder sweep) — the same single-point methodology `R00648`/`R03176` used, not a new sweep. `--close-gap-node-budget=2000000` matches the original diagnostic's 500x-inflated ceiling (`closeLengthGap`'s own production budget is 4,000 nodes).

Every `closeLengthGap` "SOLVED" result was independently verified two ways beyond the operator's own internal claim: `Solver.validateCandidatePath` (the same referee the rest of the solve pipeline uses) on the emitted path, and a from-scratch replay through fresh state confirming `isSolutionState` — both passed on both cases.

## Result

| Elite | `D_live` | `D_dead` | Elite length | Random rollouts (2,000 trials) | `closeLengthGap` (floor=0, 2M-node cap) | Referee |
|---|---:|---:|---:|---|---|---|
| `R00630:elite:0` | 36 | 37 | 65 | **0/2000 solved**, best depth 33/34 residual | **SOLVED, 3,247 nodes** (6,055 `workSpent`) | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |
| `R02449:elite:3` | 19 | 37 | 44 | **0/2000 solved**, best depth reached 61 (residual 57 — rollouts can walk past the nominal residual without solving, since `takePly` only stops on a true dead end or an exact win) | **SOLVED, 1,268,180 nodes** (4,847,552 `workSpent`) | `validateCandidatePath: ok`, independent replay `isSolutionState: true` |

Both closed-length-gap solves are well within the 2,000,000-node diagnostic ceiling, so neither result is budget-truncated the way `R00648` was tested (defeated the ceiling entirely). But relative to `closeLengthGap`'s own **production** budget (4,000 nodes, 500x smaller than this diagnostic's ceiling):

- `R00630` solves in 3,247 nodes — **under** the production budget. If ordinary repair's own random-restart/splice mechanism ever reaches (or reopens to) this depth-36 branch point in real operation, the existing production `closeLengthGap` call should be able to close it at its normal budget, no larger reconstruction budget needed.
- `R02449` needs 1,268,180 nodes — **317x** the production budget. Even if ordinary repair reaches this exact depth-19 branch point, the production-sized `closeLengthGap` invocation would almost certainly still fail there; only the artificially inflated diagnostic budget closes it.

## Interpretation

Neither case matches `R00648`'s pattern (defeats `closeLengthGap` even at 500x budget — a genuine operator/basin mismatch) or is a plain repeat of `R03176` (also defeats the direct diagnostic; only a whole different repair restart trajectory eventually solves it). Both `R00630` and `R02449` are **live-and-reconstructable by the exact same named operator** — but the two cases sit at opposite ends of a cost axis the parent audit's original two-quadrant matrix ("live succeeds" / "live fails") did not distinguish:

- `R00630`: cheap reconstruction (well inside the production budget) — this nominates a **retreat/reopening** question, not a reconstruction-strength one, per the audit's own "Shallow live boundary + reconstruction succeeds" regime: "Nominate a small reversible retreat/reopening treatment, not a large destroy operator." The open question this leaves is whether ordinary repair's random restarts/splices ever actually reach (or are biased to reach) a branch point this close to `R00630`'s own live boundary — that is a retreat/reachability measurement, not a reconstruction one, and is not answered by this report.
- `R02449`: reconstruction succeeds only far outside production's own budget for that operator — a genuine **budget-scale reconstruction gap** for a case that is not otherwise operator-incapable. This is a third finding worth naming explicitly: "live, same-operator-reconstructable, but only at a work multiple production never spends there" is a different actionable shape than either "operator cannot exploit this basin at all" (`R00648`) or "cheap once reached" (`R00630`) — a larger `closeLengthGap` node budget specifically (not a different operator, not a larger destroy window) is the narrowest candidate mechanism this case alone would nominate, and even that needs recurrence across unrelated cases before it is worth pursuing, per the parent audit's own stop rule ("one instance does not establish a general repair policy").

Randomized rollout (`takePly`) failed on both cases (0/2000), consistent with every other case tested this way (`R00648`, `R03176`) — repair's own stochastic construction remains poorly matched to needle-in-a-haystack exact-live neighborhoods regardless of how cheap or expensive the deterministic backtracking alternative turns out to be. This continues to support the audit's standing conclusion that these are two structurally different search paradigms, not points on one "more/less lucky" continuum.

## What this does not establish

- **Not a claim about production behavior.** `floor=0` deliberately isolates the reconstruction-operator question from the retreat/floor question, exactly as the original `R00648`/`R03176` diagnostic did — it says nothing about whether ordinary repair's actual random-restart/splice mechanism ever reaches these exact branch points in real operation. That is the retreat/reachability question the audit keeps explicitly separate from reconstructability.
- **Not a population.** Two more classified cases (four total now: `R00648` operator-incapable, `R03176` operator-incapable-here-but-whole-process-eventually-solves, `R00630` cheaply reconstructable, `R02449` reconstructable-but-expensive) is still not a recurrent pattern in any one regime. Per the parent audit's stop rule, do not build a retreat mechanism for `R00630`'s shape or a larger `closeLengthGap` budget for `R02449`'s shape without first checking whether either shape recurs across unrelated parents.
- **`R02449`'s CP-SAT interior `[20,36]` remains open**, per the original report's own disposition (a likely genuine SAT phase-transition hard region, not re-attempted here — out of scope).

## Disposition

Update [`2026-08-24-repair-reachability-reconstructability-audit.md`](2026-08-24-repair-reachability-reconstructability-audit.md)'s diagnostic-matrix population: four exact-live cases now classified (`R00648`, `R03176`, `R00630`, `R02449`), three distinct cost/regime shapes among them. Do not build retreat or reconstruction-budget machinery from either single case; the next step per the audit's own stop rule is checking for recurrence, not designing a mechanism from n=1.
