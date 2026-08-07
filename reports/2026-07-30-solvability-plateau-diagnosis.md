# Why the solve count stopped moving: four hypotheses tested, three killed (2026-07-30)

> **Status:** superseded
> **Last evidence:** 2026-07-31 — the corrected CP-SAT model and reserved-intersection wall
> **Decision:** retain sections 1–3 as negative results; section 4 is retracted, and the surviving
> must-cross lead was resolved by the
> [corrected model](2026-07-31-cpsat-encoding-bug-and-external-hints.md),
> [forced-structure derivation](2026-07-31-mustcross-forced-structure.md), and
> [shipped reserved-intersection wall](2026-07-31-reserved-intersection-wall.md)
> **Remaining gate:** none

> **CORRECTION (2026-07-31): section 4 and the must-cross conclusion below are based on a CP-SAT
> model that was under-constrained, and section 4's finding is retracted.**
> `cpsat-full-probe.py` encoded the edge-axis rule as "at most one ENTRY per axis"; the game also
> consumes a cell's axis slot when the path LEAVES it, so the model was strictly more permissive than
> the rules and emitted paths `validateCandidatePath` rejects. `--check-witness` cannot detect this —
> an under-constrained model still accepts every valid path. With the rule corrected, **R00044,
> R00001 and R00108 solve in 24.5s / 29.3s / 40.5s**, not the 240s timeouts recorded below, so
> "CP-SAT also fails here" is false and the argument against porting conflict learning loses its
> basis. The mechanic ablation that produced "must-cross is the mechanic that makes these levels
> hard" ran on the same broken model and needs re-running: 21 must-cross-*saturated* levels have
> since been solved in 4–38s. Sections 1–3 (move ordering, the `absent` bucket, the identity) do not
> depend on the CP-SAT model and stand unchanged.
> See [`2026-07-31-cpsat-encoding-bug-and-external-hints.md`](2026-07-31-cpsat-encoding-bug-and-external-hints.md).

Corpus-2 sits at 434/1700 at typical budget, and two weeks of solver work barely moved it. This
session tried to find out why rather than to add another mechanism. Four candidate explanations
were tested; three are dead, one survives and is not yet exploited.

Everything here is measurement, not argument. Each section names the tool, the number, and the
control that makes the number mean what it claims.

---

## What was ruled out

### 1. Move ordering is NOT the deficit — dead

**Tool:** `scripts/stress/witness-rank-diagnostic.mjs`

Every unsolved level ships a known-good solution (`stressMeta.witnessSolution`), and 357 of them
also carry saved hints, so we possess thousands of correct trajectories through levels the solver
cannot rediscover. The diagnostic replays them through the real search state and asks
`scoreAndSort` — the exact function the search uses — to order the real candidate list, recording
the rank of the **best acceptable continuation**: the minimum rank over every known solution
sharing that prefix. Solutions are merged into a prefix trie so each distinct prefix is scored once
and the state is walked with `applyMove`/`undoMove`.

Controlled at one solution per level, matched decision counts, corpus-2:

| population | rank 0 | rank 1 | rank 2 | rank 3+ | absent |
|---|---|---|---|---|---|
| unsolved | **68.1%** | 24.1% | 7.5% | 0.3% | 0% |
| solved | **65.1%** | 25.8% | 8.7% | 0.3% | 0% |

The failing levels are ordered *slightly better* than the ones we solve. Learning `scoreMove`'s
weights from the witness corpus cannot preferentially rescue them, because there is no ordering
deficit there to close.

**The control is the result.** An uncontrolled first pass showed 71.3% vs 78.4% and looked like a
clear lever. That gap was an artifact: solved levels carry far more hints (1,318 decisions/level of
trie versus 142), and more known solutions mechanically lowers a *minimum* rank. Any future use of
this diagnostic must hold solutions-per-level fixed across the groups being compared.

### 2. No prune rejects valid moves — clean

Same tool, `absent` bucket: **0.0%** across ~12,000 decisions on both populations. Every move on a
valid solution is always present in `getNeighbors`. That rules out a whole class of correctness bug
and is worth having on its own.

### 3. The `reqInt == nodes - distinctCells` identity is already exploited

Verified exact on 172/172 portal-free witnesses, so it is a real invariant — but it yields no new
prune. `search.ts`'s `PRUNE_MC_CEILING` already prunes on `(reqInt - ints) > rSteps`, and
`topology.ts` on `freshVolume + intNeeded < rSteps`, which is the identity applied to the remainder.
Both directions are covered.

### 4. Porting CP-SAT's conflict learning — unpromising on its own evidence

A first probe (`scripts/stress/cpsat-core-probe.py`) solved 5/5 levels our solver fails, median 23s
against 10s for levels we solve, suggesting the levels were tractable and our *search strategy* was
the gap — which pointed at porting CDCL-style conflict learning and global propagation into the DFS.

Encoding the mechanics that probe omitted reversed it. `scripts/stress/cpsat-full-probe.py` times
out at 240s on the same levels. So CP-SAT — which already *has* conflict learning, global
propagation and non-chronological backtracking — also fails here. A capability is not worth porting
when the tool that has it also cannot solve the instances.

---

## What survives: must-cross is the difficulty

Enabling mechanic families one at a time on R00044 (`--no-landmarks` / `--no-mustcross`):

| enabled | result |
|---|---|
| neither (`--core-only`) | OPTIMAL in 15.6s |
| landmarks only (turns + surround + adjacent-turn) | **OPTIMAL in 8.2s** |
| must-cross only (6 cells) | **UNKNOWN at 150.8s** |

Identical model, identical variable count. Turn landmarks — the mechanic that looks expensive
because of the chirality encoding — cost nothing. Six must-cross cells turn a 16-second problem
into a timeout.

**Why it bites.** Each must-cross cell is visited exactly twice, so by the identity above it
consumes exactly one intersection. R00044 has `reqInt` 6 and six must-cross cells: every
intersection is pre-reserved, no other cell may be revisited at all, and the path is a *simple path*
everywhere except six mandated double-visits at fixed positions. That regime is over-represented
among the failures:

| | unsolved | solved |
|---|---|---|
| `reqInt` exactly == must-cross count | **42.3%** | 27.6% |
| must-cross >= 80% of `reqInt` | **49.1%** | 29.7% |

---

## Do not retry: the degree prune

The obvious way to exploit the above is a degree prune — a pending must-pass/must-cross cell with
fewer than 2 usable neighbours can be entered but never left, so prune. **It is unsound**, and
`topology.test.ts`'s used-flipper case catches it immediately.

The edge-axis reuse rule forbids re-entering a *cell* along an axis already used to enter it. It
does not forbid traversing an *edge* twice. A dead-end cell is visited by going in and coming
straight back out: `(2,1)→(2,2)→(2,1)` re-enters (2,1) vertically, and if (2,1) was first entered
horizontally that axis is free. Legal, costing two steps and one intersection.

The only sound corner is `intNeeded == 0`, where the return trip's intersection is unaffordable —
and that never coincides with the must-cross-heavy regime, since pending must-cross cells reserve
intersections and hold `intNeeded` above zero. The full argument sits above `isConnected` in
`topology.ts`, where the next person to notice "reachability doesn't check egress" will find it.

---

## Methodology notes worth keeping

- **The CP-SAT models are validated against the game's own witnesses**, not trusted.
  `--check-witness` pins every position variable to the stored witness and expects a solution; it
  returns OPTIMAL in under a second on R00044/R00001/R00108. Without that check a timeout is
  ambiguous between "hard instance" and "over-constrained model grinding to prove UNSAT". This
  check was added only after a conclusion had already been drawn without it — draw it first.
- **Separate model SIZE from model FORMULATION.** `--core-only` keeps the heavy arc encoding while
  dropping the mechanic constraints, which is what showed the blowup is the mechanics rather than
  the ~34,000 extra booleans the arc encoding introduces.
- **Nothing here is a corpus contribution.** A level counts as solved only when our solver solves
  it; CP-SAT output is evidence about difficulty, and any path it emits must pass
  `validateCandidatePath` before being believed at all.

## Historical open question — resolved 2026-07-31

The fully-reserved must-cross regime is the one unexploited lead: roughly half the failures, and a
structural property the solver counts but never reasons about *positionally*. A mechanism that
reasons about **where** the reserved intersections must be spent — rather than how many remain —
might pay. No sound one is known; the degree prune was the obvious candidate and it is dead. Prove
the next one on paper before writing code.

That paragraph records the state when this report was written; it is no longer an open queue item.
The next report supplied the requested proof in
[`2026-07-31-mustcross-forced-structure.md`](2026-07-31-mustcross-forced-structure.md), and the
subsequent implementation shipped the positive part as `PRUNE_MC_RESERVED_WALL` in
[`2026-07-31-reserved-intersection-wall.md`](2026-07-31-reserved-intersection-wall.md). The local
straight-crossing and required-cell-budget follow-ups below remain useful negative evidence, not
unfinished alternatives.

---

## Follow-up: the must-cross straight-crossing prune — sound, and not worth shipping

Having localised the difficulty to must-cross, the natural prune follows from the rules rather than
from intuition. Two checks in `isMoveDynamicallyValid` combine: the must-cross lock rejects a turn
at a pending 1st-pass cell, and once two entries have set both axis bits the ordinary turning check
rejects one as well. So **a must-cross cell is crossed straight, twice, once per axis** — and each
crossing therefore needs *both* flanking cells on that axis, one to arrive from and one to leave to.
`edgeUsage` records the axis of every move into or out of a cell, so a pending cell's used bits say
which crossing is still outstanding.

Crucially this has no there-and-back escape, which is what made the degree prune above unsound: a
straight crossing cannot double back.

**Soundness, established properly.** `scripts/stress/mc-prune-soundness-check.mjs` (kept) replays
every known-valid solution — each level's witness plus every saved hint — through the real search
state and asserts `isConnected` never rejects a state lying on one. Any rejection would be a state
on a path the game itself accepts.

| corpus | levels | valid paths | steps replayed | rejections |
|---|---|---|---|---|
| corpus-2 | 939 | 7,798 | 679,829 | **0** |
| corpus-1 | 43 | 4,456 | 336,072 | **0** |

`solver:bench --check` also passed 160/160 with nodesExpanded **bit-identical**, i.e. it never fires
on the published corpus at all.

**Effectiveness, which is why it was reverted.** On 20 unsolved corpus-2 levels in the
fully-reserved regime it was meant to target (`reqInt` == must-cross count):

| | solved | nodes | wall |
|---|---|---|---|
| with prune | 0/20 | 192,993,606 | 158.63s |
| without | 0/20 | 195,337,898 | 158.38s |

A 1.2% node reduction, no wall-time change, and zero new solves — not worth ~40 lines on
`isConnected`, the hottest call in the solver. Reverted; the soundness harness is kept because it
generalises to any future must-cross prune and is the check this class of change actually needs.

**What this rules out.** The straight-crossing structure is real and correctly derived, but the
solver was already reaching those dead ends by other means almost as fast. A must-cross prune that
pays will have to be *positional* — reasoning about where the reserved crossings can go and what
that forces about the rest of the path — rather than a local feasibility test on the crossing cells
themselves. Local tests on must-cross cells are now two-for-two on not working.

---

## Follow-up 2: the derived required-cell budget — the best signal found, still not a solve

The straight-crossing rule has a positional consequence the earlier prune missed. If a must-cross
cell is crossed straight on H, the path uses edges (left→c) and (c→right); straight on V uses
(up→c) and (c→down). **All four incident edges are therefore on the path, so all four orthogonal
neighbours of every must-cross cell are visited by any valid solution.** Checked before use: 409
portal-free levels, 2,094 must-cross cells, **zero witnesses** where an in-grid neighbour goes
unvisited.

That turns into a budget, not a local test. Since `distinct == N - reqInt`, exactly
`rSteps - intNeeded` fresh cells remain to be spent, and each still-unvisited required cell —
must-pass, must-cross, or a derived must-cross neighbour — consumes one. If the outstanding set
outnumbers the budget, no completion exists. This is positional where the existing volume check is
not: volume asks whether enough fresh cells are *reachable*, which a level passes happily while the
specific cells it is *obliged* to visit already exceed the budget.

**Sound**, on the broadened harness (all must-pass/must-cross levels, not just must-cross):

| corpus | levels | valid paths | steps replayed | rejections |
|---|---|---|---|---|
| corpus-2 | 1,371 | 17,102 | 1,551,772 | **0** |

**Effect**, on the 20 unsolved fully-reserved levels:

| | solved | nodes | wall |
|---|---|---|---|
| with | 0/20 | 175,287,638 | 159.58s |
| without | 0/20 | 183,722,153 | 159.27s |

A **4.6% node reduction** — nearly 4x the straight-crossing prune — at no wall-time cost. But
`solver:bench --check` came back 160/160 at **+0.3% nodes on the published corpus**: pruning a
state early changes which branches the freed budget explores, so the effect is not uniformly
positive. Zero new solves either way.

Reverted on the same standard as the previous one: no solves, and a node effect that is negative on
one corpus and positive on another does not justify a prep array plus a loop on `isConnected`.

**Re-tested on the near-miss tail, and the idea is dead.** The 20-level sample above was wrong for
it — all deeply unsolved, where a 4.6% saving cannot flip anything. The right population is
`stress:rank-levels`' closest-miss ordering: 24 levels at badness 2-3, every one of them exhausting
the 20M node ceiling, so a node saving converts directly into more effective search.

| | solved | nodes |
|---|---|---|
| with | 1/24 | 141,385,200 |
| without | 1/24 | 140,775,508 |

No solve difference, and 0.4% MORE nodes. The -4.6% did not reproduce: it was population-specific
reordering rather than a real saving, which is exactly what a single unreplicated sample cannot
distinguish. Three prunes derived from must-cross structure — degree, straight-crossing, and
required-cell budget — are now sound-or-unsound but uniformly worthless, and the last one is dead on
the population it was supposed to help.

(An earlier version of this section, and the commit that landed it, said the implementation was
recoverable from git history. That was wrong — the prune was reverted before committing, so it was
never in a commit. It has since been re-derived once from the description here, which took a few
minutes, so the description is sufficient.)
