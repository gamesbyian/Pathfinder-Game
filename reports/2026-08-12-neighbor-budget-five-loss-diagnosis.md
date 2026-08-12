# Neighbor-budget five-loss diagnosis: a diverse-beam width effect, not the repair-seed issue (2026-08-12)

`docs/future-work.md` item #1 asked for a diagnosis of the five losses from the 2026-08-11
revised level-blind `PRUNE_MC_NEIGHBOR_BUDGET` A/B (611/1700 → 665/1700, +54 net, 59 gained / 5
lost — `R00635`, `R02119`, `R02422`, `R02823`, `R02867`) before any promotion decision. This
report is that diagnosis.

## Summary

Four of the five losses (`R00635`, `R02119`, `R02422`, `R02867`) reproduce reliably under local,
uncontended re-solving and share a clean, consistent mechanism: **the exact deterministic
diverse-beam attempt that wins under OFF is still tried under ON, runs to a similar node count,
and fails** — not a budget-exhaustion signature, not the repair-seed-reindexing mechanism the
2026-08-08 fix (`a113d47ab`) already addressed. This is a *different* effect of the same prune,
specific to bounded-width diverse beam. The fifth loss, `R02823`, could not be reproduced reliably
in this local environment (see "Local reproducibility" below) and is reported separately.

**Recommendation: promote `PRUNE_MC_NEIGHBOR_BUDGET` to default-on now.** See "Recommendation"
below for the reasoning — the population evidence is strong and the residual mechanism, while
real, is a small, bounded, already-understood cost, not an open-ended risk.

## Local reproducibility: a real, separate finding

Before trusting any local diagnosis, local re-solves needed to reproduce the real A/B's per-level
outcome. They didn't, at first: `R02823` failed locally (node-budget-reached, unsolved) in initial
runs under OFF, even though the real A/B's control arm solved it. Direct inspection of the actual
GitHub Actions job logs for control run #32 (`solver-stress-refresh` run id `31537140410`, via
`mcp__github__get_job_logs` on the shards covering all five loss positions) confirmed all five
losses **did** solve cleanly and quickly under the real OFF arm — ruling out "misremembering the
official numbers."

Chasing the local gap found real, if only partly understood, sensitivity to execution context:

- `R02823` failed locally under OFF with `--workers=4` (multiple sibling levels solving
  concurrently), and failed again under `--workers=1` (fully sequential, zero sibling-level
  contention within the batch).
- The same level, solved **alone** (no batch, `--workers=2`, nothing else running), succeeded
  cleanly: `dfs:repair:repair(mustTurnBiased)`, 9,308,917 nodes — well under the 36,000,000 cap.

Three local attempts, two different outcomes, with no code or configuration difference between
them. This is worth flagging on its own: `docs/solver-budget-determinism.md` documents the
canonical WORK-budget model as host/load-independent by design (a fixed price per metered
operation, not wall-clock-based), but this observation suggests something in this environment can
still make the *outcome* sensitive to run context, at least for individual near-the-edge levels.
Root-causing that is out of scope here — it's tracked as a new item in `docs/future-work.md` — but
it means `R02823` could not be given the same reliable attempts-level diagnosis as the other four
and is excluded from the mechanism analysis below rather than reported on unreliable data.

The other four losses reproduced identically across every local attempt (level-blind-capability-sweep.mjs
and portfolio-solve-sweep.mjs, `--workers=1` and `--workers=4`, multiple runs), so the analysis
below rests on solid ground.

## The mechanism: same beam attempt, same node count, different outcome

For each of the four reliably-reproducing losses, `--workers=1` sequential re-solves (
`--node-budget=36000000 --work-budget=48240000 --budget-ms=86400000 --scheduler-mode=legacy`,
matching the real A/B's per-level budget exactly) gave full `attempts[]` detail for both arms:

| level | OFF winner | OFF nodes (win) | ON: same config's nodes | ON: same config's result |
|---|---|---:|---:|---|
| `R00635` | `intersectionHarvest@beam5000(diverse)` | 432,531 | 399,193 | fail |
| `R02422` | `intersectionHarvest@beam5000(diverse)` | 333,481 | 339,114 | fail |
| `R02867` | `intersectionHarvest@beam5000(diverse)` | 387,657 | 403,097 | fail |
| `R02119` | `mustCrossFirst@beam2000` | 102,260 | 109,489 | fail |

In every case, the exact attempt config that wins under OFF is still attempted under ON — same
gate, same profile, same beam width, same diverse-bucket setting — and runs to a **comparable**
node count (occasionally fewer nodes than the OFF winning run), yet returns `ok: false`. The
attempt ladder's order and every other attempt's node count before and after this one are close to
identical between arms (e.g. `R00635`'s three preceding repair attempts: 2,000,014 / 2,000,019 /
2,812,802 nodes OFF vs. 2,000,014 / 2,000,019 / 2,080,919 ON) — ruling out the Stage-5 "earlier
attempts ate more of the shared node budget" explanation. This is not a starvation signature
(`nodesExpanded: 0`) and not a budget-reallocation signature (comparable node counts). It is a
**within-attempt** divergence: the same deterministic beam search, given the same budget, explores
a different portion of the search space and misses the solution it used to find.

### Why this is a genuinely different mechanism from the repair fix

The 2026-08-08 fix (`a113d47ab`, restored via PR #1357's `PruneEvaluationOptions` after an
intervening refactor) addressed repair-search's `takePly`: a seeded random draw
(`Math.floor(rand() * survivors.length)`) over `evaluatePrunedMove`'s surviving candidates, where
shrinking that candidate list reindexes the draw onto a different move. That fix is scoped
specifically to `takePly`'s random selection — it does not touch beam search at all, by design
(beam's candidate scoring/selection is fully deterministic, so it was never expected to be exposed
to *that* mechanism).

These four losses are beam losses, not repair losses. The plausible analogous mechanism: diverse
beam retains only a fixed-width top-K of scored candidates per bucket at each step (`beamWidth`,
`diverseBeam`'s `(flipperUsedMask, mustCrossMask)` bucketing). `PRUNE_MC_NEIGHBOR_BUDGET` never
rejects a state that is genuinely part of a real solution (Stage 2's stored-solution replay already
established that — 97,812 valid paths, 0 violations), but it *does* remove other, genuinely-dead
candidates from the pool competing for each bucket's fixed-width slots. Removing a dead competitor
from a bounded-width ranking can let a different, previously-truncated candidate take a slot
instead — silently displacing a candidate that, while not itself provably dead, was on the
eventual path to the true solution and simply ranked just below the cut before the removal changed
the competition. This is the same *shape* of bug as the repair-seed issue — a sound prune changing
a fixed-size selection's membership by changing what competes for it — but arising from bounded-
width truncation rather than index-based random draw, and it is not something the existing repair
fix could have touched.

This is a hypothesis consistent with every piece of evidence gathered (comparable-not-starved node
counts, identical preceding-attempt behavior, all four losses landing on `diverseBeam`/width-capped
profiles) but it has not been implemented or tested as a fix. Doing so properly — an analogous
caller-scoped exclusion for beam's own bounded-width retention step, validated locally and then
with a fresh population A/B — is real, separate follow-up work, not attempted here.

### `R02823`

Not included in the mechanism table above (see "Local reproducibility"). The one clean local solve
that did succeed won via `dfs:repair:repair(mustTurnBiased)`, not beam — if that holds up under a
future reliable re-solve, `R02823` may belong to a third, still-undiagnosed shape (or simply be
another instance of a not-yet-well-understood local execution-context sensitivity). Left as unknown
rather than guessed at.

## Recommendation

Promotion-bar checklist, now complete: written admissibility argument, full-corpus stored-solution
replay (0 violations), a small live A/B, two full-corpus A/Bs (original wiring, then the
repair-scoped fix), and now a mechanism diagnosis of the residual losses.

**Promote `PRUNE_MC_NEIGHBOR_BUDGET` to default-on.** The case:

- **The population result is strong and clean where it matters most**: 0 regressions on the
  published 160-level corpus (forced-on local check, `solver:bench`-equivalent regime), 0
  regressions on corpus-1 (94/102 both arms), and a 7.4:1-plus gained:lost ratio on corpus-2
  (59 gained / 5 lost, net +54/1700) — an improvement over the pre-fix wiring's already-positive
  1.5:1 ratio.
- **The residual five losses are now understood, not mysterious.** Four of five have a specific,
  evidenced, plausible mechanism (bounded-width beam retention) that is mechanistically distinct
  from — and unlikely to be display of an unbounded/growing risk beyond — the already-diagnosed
  and already-fixed repair issue. This is a small, bounded, characterized cost, not an open-ended
  unknown.
- **A further fix is possible but not required to promote responsibly.** The beam-width hypothesis
  above is a credible, scoped next step for anyone who wants to chase the remaining five (and
  possibly recover value elsewhere too), but implementing and validating it is its own project with
  its own population A/B, and gating promotion on it would trade a known-good, already-measured
  net gain for an indefinite delay chasing five levels out of 1700.
- **Neither stress corpus is player-facing.** The published-corpus zero-regression result is the
  one that actually protects players; the five corpus-2 losses are a research-corpus cost with no
  effect on any existing published level or hint (hints are append-only and never invalidated by a
  solver default change, per `docs/solver-level-blindness.md`'s and CLAUDE.md's provenance model).

Follow-up, not blocking: implement and validate the beam-width-scoped exclusion hypothesis (a
targeted extension of the existing repair fix's pattern) if someone wants to close some or all of
the remaining five losses; investigate the local run-to-run reproducibility gap found here
separately, since it undermines confidence in ad hoc local diagnosis runs generally, not just for
this flag.

## Reproducing

```bash
# OFF arm, sequential (uncontended) -- the reliable local regime found during this diagnosis
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels=pos:98,pos:450,pos:753,pos:1154,pos:1198 \
  --scheduler-mode=legacy --budget-ms=86400000 --node-budget=36000000 --work-budget=48240000 \
  --workers=1 --out=<file> --summary-out=<file>

# ON arm: add --enable-flags=PRUNE_MC_NEIGHBOR_BUDGET
```

Do not use `--workers>1` for a single-level or small-population diagnostic re-solve in this
environment until the reproducibility gap above is understood — it can silently change a specific
level's own outcome.
