# The CP-SAT probe was under-constrained; its three headline levels solve in under a minute once fixed (2026-07-31)

Started as "run one model across CP-SAT / Chuffed / Gecode to separate solver from encoding." That
comparison is **inconclusive** — my MiniZinc model is too weak to search with. What the attempt found
instead is a defect in the existing probe that invalidates the conclusion it was built to test.

**Headline**: `scripts/stress/cpsat-full-probe.py` encoded the edge-axis rule as *at most one entry
per axis*, but the game also consumes a cell's axis slot when the path **leaves** it. The model was
therefore strictly more permissive than the game and emitted paths `validateCandidatePath` rejects.
With the rule corrected, **R00044, R00001 and R00108 — the three levels
`reports/2026-07-30-solvability-plateau-diagnosis.md` built its argument on — solve in 24.5s, 29.3s
and 40.5s**, against the 240s timeouts that report recorded. 41 referee-validated hints were
harvested along the way, **22 of them on levels our production solver cannot solve**.

---

## 1. The bug

`modules/domain/path-validator.ts` marks the axis on **both endpoints** of every move:

```js
const moveAxis = (((cur >>> 16) & 0xFFFF) === ((prev >>> 16) & 0xFFFF)) ? 1 : 2;
markAxis(prev, moveAxis);
markAxis(cur, moveAxis);
```

and `move-rules.ts` then rejects two distinct cases — `invalid-edge-reuse-target` (entering a cell on
an axis already used) **and** `invalid-edge-reuse-origin` (leaving a cell on an axis already used,
when that differs from the axis it was entered on).

The probe encoded only the first. Concretely, the old model admits an immediate bounce back down the
same edge — `(5,2) → (6,2) → (5,2)` — which the referee rejects. That is not hypothetical: it is the
first path the harvester pulled out of the probe, and the referee threw it out.

The correct unit is a **visit**, not a move or an entry: *a visit to `c` touches axis A if it enters
along A or leaves along A, and at most one visit per cell may touch each axis.* A straight-through
pass enters and leaves on the same axis — two A-moves but one A-touching visit — which is legal, and
is exactly the case `move-rules.ts` exempts by skipping the origin check when `axis === entryAxis`.

Both neighbouring formulations are wrong, and I hit both:

| encoding | effect | how it shows up |
|---|---|---|
| at most one **entry** per axis (the old probe) | too weak | emits paths the referee rejects |
| at most one **move** touching the cell per axis | too strong | every level's own witness comes back UNSAT |
| at most one **visit** touching the cell per axis | correct | witness SAT, emitted paths referee-clean |

A pleasing consequence of the correct rule: a cell visited twice must be crossed once horizontally
and once vertically — which *is* the must-cross "two opposite sides" semantics, falling out rather
than being separately imposed.

## 2. Why `--check-witness` could never have caught it

The plateau report's own methodology note says the models "are validated against the game's own
witnesses, not trusted," and treats that as the safeguard. It is a real check, but it is
**one-directional**: pinning a witness detects an *over*-constrained model (one that rejects valid
paths). An *under*-constrained model still accepts every valid path, so it passes the witness check
cleanly — as this one did, in 0.2s, on every level.

Detecting an under-constraint requires the opposite test: let the model **emit** a path and put it
through the referee. That is now what `scripts/stress/cpsat-hint-harvest.mjs` does on every solve,
which is how the bug surfaced.

**Two controls, not one, and they catch opposite errors:**

- *witness pinned → expect SAT* — catches over-constraint.
- *emitted path → expect referee-accept* — catches under-constraint.
- and, separately, *a level the model should crack easily → expect a solve in reasonable time* —
  catches an encoding that is correct but propagates too weakly to be worth running. My MiniZinc
  model passes both of the first two and fails this third one (§4).

## 3. What this does to the plateau report

The relevant claim was: *"`cpsat-full-probe.py` times out at 240s on the same levels. So CP-SAT —
which already has conflict learning, global propagation and non-chronological backtracking — also
fails here. A capability is not worth porting when the tool that has it also cannot solve the
instances."*

Re-run with the corrected model, same levels, same machine:

| level | grid | reqLen | mustCross | reqInt | plateau report | corrected model |
|---|---|---|---|---|---|---|
| R00044 | 11x11 | 91 | 6 | 6 | UNKNOWN at 240s | **OPTIMAL in 24.5s** |
| R00001 | 11x11 | 84 | 6 | 6 | UNKNOWN at 240s | **OPTIMAL in 29.3s** |
| R00108 | 12x12 | 101 | 7 | 7 | UNKNOWN at 240s | **OPTIMAL in 40.5s** |

All three paths were accepted by `validateCandidatePath` and are now stored hints. So the premise is
false: CP-SAT does not fail on these instances, and the inference against porting conflict learning
loses its evidential basis. It is not thereby an argument *for* porting — that would need its own
evidence — but the reason recorded for dismissing it no longer holds.

**The counter-intuitive part, worth internalising:** the *relaxed* model was much SLOWER. Removing a
constraint adds solutions, which usually makes finding one easier; here the missing rule let the
search wander through an enormous space of bounce-heavy candidates while trying to satisfy the exact
intersection count. Tightening it to the real rule prunes hard. A model being more permissive than
the problem is not a conservative error — it can cost far more than it saves, while also making
every "solution" it prints untrustworthy.

The report's other CP-SAT-derived result — the mechanic ablation on R00044 (`--no-mustcross`
OPTIMAL 8.2s vs must-cross-only UNKNOWN at 150.8s), which is the origin of "**must-cross is the
mechanic that makes these levels hard**" — was measured on the same broken model and should be
re-run before it is relied on. The 41-level harvest below already argues against the strong form of
it: **21 must-cross-*saturated* levels (reqInt == mustCross count) solved, in 4–38s.** Saturation
alone is plainly not sufficient for hardness.

I am *not* claiming the opposite conclusion. My harvest deliberately took short levels first, so
length and saturation are confounded in that sample; the matched-length probe below is only a start:

| level | reqLen | mustCross | reqInt | free budget | result |
|---|---|---|---|---|---|
| R00433 / R02194 / R02517 | 84 | 0 | 5–8 | 5–8 | OPTIMAL, 15–20s |
| R02618 | 84 | 6 | 7 | 1 | OPTIMAL in 51.7s |
| R00001 | 84 | 6 | 6 | **0** | OPTIMAL in 29.3s |

At matched length 84 the saturated level is not the slowest one. That is one triple, not a study —
but it is enough to say the single-level ablation the strong claim rests on needs redoing.

## 4. The MiniZinc comparison: inconclusive, and why

The original goal. `scripts/stress/minizinc/pathfinder.mzn` is a solver-independent model of the same
rules, run through `scripts/stress/minizinc-probe.mjs` across CP-SAT 9.10, Chuffed 0.13.2 (lazy
clause generation) and Gecode 6.3.0. It is committed because it is correct and the encoding notes are
worth keeping — but it **cannot currently answer the question it was built for**.

Every level's witness comes back SAT on all three backends in ~1s, so the model is sound. But on
R03360 — which the corrected Python model solves in 11.8s — all three backends time out at 120s. A
model that cannot reproduce a solve the reference model finds in seconds is measuring its own
encoding, not the backends. The 15/15 timeouts from the first 5-level sweep are therefore reported
here as a property of my model and nothing more.

One round of the obvious fix (boolean occupancy channelling in place of `global_cardinality` and
reified integer equalities) did not close the gap; the remaining suspect is that the Python model's
explicit per-(time, cell, direction) arc booleans give these engines a structure my formulation only
implies. Reworking it is future work, and the honest status is: **not yet a valid experiment.**

## 5. Hints harvested

41 new paths, every one accepted by `validateCandidatePath`, **zero rejected** after the fix (before
the fix, the first two attempts were both rejected — which is how the bug was found).

- **22 on levels the production solver does not solve** at typical budget, including R00044, R00001,
  R00108, R00986 and R02315.
- 19 on levels it does solve — novel paths, so they still add hint-corpus diversity.
- Median solve 14.4s, max 54.2s. Scope: reqLen 59–101, 11x11 and 12x12.

Stored through `scripts/level-data-io.mjs` into `data/stress/hints-random/<id>.json` with:

```
solver.id        = 'external-constraint-solver'   (EXTERNAL_SOLVER_ID — new)
solver.technique = 'cpsat-full-probe'
context.hintGuided = false        (the model never sees a stored hint: a cold find)
context.levelRevision = getLevelFingerprint(level)
```

`EXTERNAL_SOLVER_ID` is deliberately neither `SOLVER_ID` nor `WITNESS_GENERATOR_ID`. **These hints
are not evidence our solver can find anything** — nothing in `modules/solver/` participated — so any
"what can the solver find cold?" query must exclude them exactly as it already excludes `witness` and
`hintGuided` entries. They are legitimate hints (referee-validated, they feed the in-game hint system
and the heat-map); they are not solver-capability data. A rediscovery of an already-stored path
appends a provenance entry to the existing hint rather than creating a duplicate.

## 6. Scope limit worth knowing

Only **328 of 1700** corpus-2 levels (19%) are in model scope — portals, filters and flipping filters
are not encoded, and both probes refuse such levels rather than silently solving an easier problem.
Flipping filters in particular are path-history-dependent, which a time-indexed model can express
only with per-step filter state. Any corpus-wide claim from either probe is a claim about that 19%.

## 7. Next

1. **Re-run the mechanic ablation** (`--no-mustcross` / `--no-landmarks`) on the corrected model. The
   "must-cross is the difficulty" conclusion is currently unsupported in either direction.
2. **Harvest the rest of the in-scope set** — 328 levels are in scope, 45 have been tried, and the
   hit rate so far is 45/45. The unsolved in-scope levels are the valuable ones.
3. **Fix or retire the MiniZinc model.** Port the explicit arc booleans; if that does not close the
   gap, drop the multi-backend question rather than leave a misleading half-experiment.
4. Encoding portals would roughly double addressable scope and is the single biggest coverage win.

## Reproducing

```
python3 scripts/stress/cpsat-full-probe.py R00044 300 --check-witness     # expect OPTIMAL, <1s
node scripts/run-bundled.mjs scripts/stress/cpsat-hint-harvest.mjs -- \
  --levels=R00044,R00001,R00108 --time-limit=300 [--save-hints]
node scripts/run-bundled.mjs scripts/stress/minizinc-probe.mjs -- \
  --levels=R03360 --backends=cpsat,chuffed,gecode --time-limit=120   # the failing positive control
```

MiniZinc 2.8.5 bundle (Chuffed/Gecode/CP-SAT included); set `MINIZINC_BIN` if not at
`/opt/MiniZincIDE-2.8.5-bundle-linux-x86_64/bin/minizinc`. `ortools` via pip for the Python probe.
Per-level data: `reports/stress/cpsat-hint-harvest.json`, `cpsat-length-test.json`,
`cpsat-saturated-test.json`, `minizinc-backend-comparison.json`.
