#!/usr/bin/env python3
"""Full-mechanic CP-SAT probe -- closes the relaxation gap left by cpsat-core-probe.py.

WHY THIS EXISTS. The core probe solved 5/5 levels our solver cannot solve, but it omitted
must-cross, turn landmarks, surround and adjacent-turn, so it was solving an EASIER problem and
the conclusion ("the levels are not intrinsically hard, our search strategy is the gap") was
suggestive rather than settled. This encodes those mechanics so the same levels can be re-tested
on the real problem.

NOT A HINT FACTORY. Per the project's goal, a level counts as solved only when OUR solver solves
it. Output here is evidence about difficulty and a source of insight, never a corpus contribution.

CORRECTNESS IS THE REFEREE'S JOB, NOT THIS FILE'S. Any path printed must be fed to
validateCandidatePath (see --emit-path and the companion node one-liner in the report). An
encoding bug then shows up as a REJECTED path rather than a false claim, which is the only reason
it is safe to hand-roll an independent model of the rules.

Conventions taken from the source rather than inferred:
  * turn chirality: cross = (fx-px)*(ty-fy) - (fy-py)*(tx-fx); >0 is 'cw', <0 'ccw', 0 no turn
    (modules/domain/geometry.ts turnDirection)
  * must-cross is satisfied by crossCounts[i] >= 2, i.e. simply visiting the cell TWICE; the
    "two opposite sides" property falls out of the edge-axis reuse rule (search-state.ts)
  * a cell is entered at most once per axis, which caps visits at 2 (verified on every witness)

PORTAL SUPPORT (added 2026-08-05). Portals break the model's original core assumption that the
path occupies exactly `reqLen + 1` nodes -- a portal jump advances the path by one node for FREE
(CLAUDE.md: "Counted length = number of nodes - 1 - portal jumps"), so a path using J jumps has
`reqLen + 1 + J` nodes, and J is not known until the solve finds one. Handled with a PADDED
horizon (`N = reqLen + 1 + P`, P = this level's own portal-pair count -- read from the level's own
data, NOT a documented/assumed max: CLAUDE.md's "max 3 pairs" is true only for the published
corpus; both stress corpora go up to 7, and stress-corpus-2's portal-bearing levels are entirely
4-7, none at 1-3) plus a goal-ABSORBING rule (`x[t][goal] => x[t+1][goal]`) so any unused padding
slots just idle at goal after the real path's genuine end -- exactly like the real game, which
ends the instant goal is reached, never continues past it.

Facts this leans on, verified against modules/solver/search-state.ts directly (not assumed from
docs): a portal terminal caps at exactly 1 visit (stricter than an ordinary cell's cap of 2); using
either terminal of a pair forces an immediate jump to the other, so a pair contributes at most one
jump total ("cannot be reused"); a portal jump touches neither edge-axis-reuse bookkeeping nor
direction/turn detection at all (`!isPortalJump` guards in applyMove); and the move immediately
after a jump has no defined entry axis (`prevLastWasPortalJump`), so turn/adjacent-turn landmarks
can never be satisfied by the move immediately following a jump.

SCOPE. Static (regular) filters remain unencoded, deliberately, not just deferred: 0 levels in
either stress corpus use them (data/stress/README.md: "No static filters. Only flipping filters are
used, by design"), so there is no population to validate an encoding against yet. Flipping filters
ARE encoded (added 2026-08-15, see FLIPPING FILTER SUPPORT below) -- CLAUDE.md's own summary called
this "the harder half" and it was originally deliberately deferred (docs/solver-shadow-eval-harness.md's
Part 6, 2026-08-05, recommended against building it at all -- see that section's own note below for
why this doesn't contradict that verdict).

VALIDATION STATUS (2026-08-05). check-witness passes across every real pair-count present in the
corpus (0, 4, 5, 6, 7) -- corpus-2's own portal-bearing levels are entirely 4-7, none at 1-3, and
this original validation pass evidently never happened to sample a corpus-1 level with pair-count
1-3 either (see the 2026-08-15 addendum below: that gap was real). Two real, UNPINNED solves -- one
4-pair level, one 6-pair level, found cold by the solver with no witness pinned at all -- were
independently accepted by the game's own validateCandidatePath (see cpsat-hint-harvest.mjs's referee
step). Two encoding bugs were caught and fixed along the way, both the same shape: an `is_jump[t]`
claim left partially unconstrained, letting the solver skip real adjacency/direction checks by
mislabelling a transition as a jump -- exactly the failure class check-witness alone cannot catch
(an under-constrained model still accepts every valid witness), which is why the referee step above
is not optional. Three other attempts (one 5-pair level twice, one 7-pair level once) timed out at
180-200s without finding ANY solution -- inconclusive on correctness, not a rejection; the padded
horizon is measurably bigger than the original model (up to +7 timesteps) and larger/denser portal
levels are a real computational step up, not just an encoding one. Treat this as
validated-but-not-exhaustive: real, but on a small sample.

FLIPPING FILTER SUPPORT (added 2026-08-15). Semantics from search-state.ts's isMoveDynamicallyValid,
not CLAUDE.md's summary: single-use (capped at 1, alongside portals in the visits[] cap below);
NO TURN on the one crossing (entry axis == exit axis, unconditionally); required entry axis is a
GLOBAL, order-dependent property -- the declared axis if the number of OTHER flippers already used
board-wide is even when this one is entered, the flipped axis if odd (`popcount(flipperUsedMask)`
parity in search-state.ts). Modelled per flipper WITHOUT a permutation/ordering variable: each
flipper's rank is the sum, over every other flipper, of a reified "was crossed strictly earlier"
literal built from each flipper's own (single, since capped-at-1) entry timestep -- see
FLIPPING FILTER SUPPORT below the edge-axis-reuse block for the actual encoding. Full writeup,
including why the mustCross>=2 abstention claim in an earlier report was a misattribution (mustCross
of any count was never unsupported -- the file's sole skip condition has only ever been
filters/flippingFilters) and why this doesn't reopen Part 6's "still no on flipping filters" verdict
(that verdict was about prune-gap-probe.mjs's many-cheap-branch-probe workload specifically, not the
few-targeted-full-solve workload this validates):
reports/2026-08-15-cpsat-flipping-filter-support.md.

PRE-EXISTING PADDING BUG, FOUND AND FIXED (2026-08-15, unrelated to flipping filters -- found while
validating them, but reproduces on flipper-free portal levels too, predates this session). A
portal-bearing level whose witness doesn't use every declared portal pair leaves genuine padding
slots after the real path ends. The edge-axis-reuse loop below used to read a padding transition's
forced-zero `horiz[t]` as "this move touched the V axis" unconditionally, double-counting a V-axis
touch on `goal` (once real, once per padding slot) and reporting a perfectly legal witness as
INFEASIBLE -- independent of the real entry move's actual axis. Only `goal` can ever be affected (no
other cell can be the path's terminal node). Fixed by gating the touch literals on `real_here(t)`
for `c == goal` specifically; every other cell keeps the original, cheaper, still-correct form. Full
repro/root-cause/validation: reports/2026-08-15-cpsat-flipping-filter-support.md.

Usage:  python3 scripts/stress/cpsat-full-probe.py <levelId> [timeLimitSec] [--emit-path]
        [--corpus=<path>] (default: data/stress/stress-levels-random.json)
"""
import json, sys, time
from ortools.sat.python import cp_model

level_id = sys.argv[1]
time_limit = float(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 120.0
emit_path = '--emit-path' in sys.argv
# CONTROL: keep the heavy arc encoding but drop the mechanic constraints, so a timeout can be
# attributed to the model's size rather than to the mechanics it expresses.
core_only = '--core-only' in sys.argv
# VALIDATION: pin every position variable to the level's stored witness solution -- a path the
# game itself accepts. If the model then reports INFEASIBLE, the ENCODING is wrong (over
# constrained) and any timeout was CP-SAT grinding to prove a falsehood, not evidence of
# difficulty. This must pass before any conclusion is drawn from this file.
check_witness = '--check-witness' in sys.argv
# Localise the blowup: enable the mechanics one family at a time.
no_mustcross = '--no-mustcross' in sys.argv
no_landmarks = '--no-landmarks' in sys.argv
no_flippers = '--no-flippers' in sys.argv
corpus_arg = next((a for a in sys.argv if a.startswith('--corpus=')), None)
corpus_path = corpus_arg.split('=', 1)[1] if corpus_arg else 'data/stress/stress-levels-random.json'

raw = json.load(open(corpus_path))
levels = raw if isinstance(raw, list) else raw['levels']
lv = next(l for l in levels if l.get('id') == level_id)

W, H = lv['grid']['w'], lv['grid']['h']
def cells(field): return {(c['x'] - 1, c['y'] - 1) for c in lv.get(field) or []}

IMPASSABLE_ROLES = ('surround', 'adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw', 'decorative')
impassable = cells('blocks') | cells('geese') | cells('falseGoals')
landmarks = []
for lm in lv.get('landmarks') or []:
    c = (lm['x'] - 1, lm['y'] - 1)
    landmarks.append((c, lm.get('role'), lm.get('turn') or 'either'))
    if lm.get('role') in IMPASSABLE_ROLES: impassable.add(c)

# Static (regular) filters remain unencoded -- deliberately, not just deferred: both stress
# corpora (the only source of the abstentions this file's docstring/callers care about) use ZERO
# static filters (data/stress/README.md: "No static filters. Only flipping filters are used, by
# design."), so there is no real population to validate an encoding against yet. Flipping filters
# ARE encoded below (2026-08-15) -- see FLIPPING FILTER SUPPORT.
if lv.get('filters'):
    print(f'{level_id}: SKIPPED (static filters not encoded -- unused by either stress corpus)'); sys.exit(3)

# Portal pairs: bidirectional (either terminal, entered normally, forces the jump to the other --
# modules/domain/level-codec.ts sets portalMap symmetrically both ways). Read this LEVEL's own pair
# count -- never a documented/assumed cap; see module docstring.
portal_pairs = [((p['x1'] - 1, p['y1'] - 1), (p['x2'] - 1, p['y2'] - 1)) for p in (lv.get('portals') or [])]
portal_dest = {}
for a, b in portal_pairs:
    portal_dest[a] = b
    portal_dest[b] = a
portal_cells = set(portal_dest.keys())
P = len(portal_pairs)

# Flipping filters: passable, single-use (cap 1, like a portal terminal -- see visits[] below),
# axis encoded 1=H/2=V matching modules/domain/level-codec.ts's raw pass-through of f.axis into
# flippingFilterMap (AXIS_H=1/AXIS_V=2, encoding.ts). Full semantics + ordering constraint below,
# under FLIPPING FILTER SUPPORT.
flip_filters = [((f['x'] - 1, f['y'] - 1), f['axis']) for f in (lv.get('flippingFilters') or [])]
flip_cells = {c for c, _ in flip_filters}
F = len(flip_filters)

gates = [(g['x'] - 1, g['y'] - 1) for g in lv['gates']]
goal = (lv['goal']['x'] - 1, lv['goal']['y'] - 1)
must_pass = cells('mustPass')
must_cross = cells('mustCross')
L, req_int = lv['reqLen'], lv['reqInt']
N0 = L + 1            # horizon with zero portal jumps (the original model's N)
N = N0 + P            # padded horizon: at most P jumps possible (each pair usable at most once)

grid = [(x, y) for y in range(H) for x in range(W) if (x, y) not in impassable]
idx = set(grid)
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
def step(c, d): return (c[0] + d[0], c[1] + d[1])

m = cp_model.CpModel()
x = [{c: m.NewBoolVar(f'x{t}_{c}') for c in grid} for t in range(N)]
for t in range(N): m.AddExactlyOne(x[t].values())
m.AddExactlyOne([x[0][g] for g in gates if g in idx])

# Goal is ABSORBING: once reached, every later node is goal too (padding slots idle there). This
# is what lets the padded horizon exceed the real path length without a separate "path length"
# variable -- the real end is wherever x[t][goal] first becomes true, and it is a hard invariant
# (not solver-chosen slack) that it can never become false again, matching the real game ending
# the instant goal is reached.
for t in range(N - 1):
    m.Add(x[t + 1][goal] == 1).OnlyEnforceIf(x[t][goal])
m.Add(x[N - 1][goal] == 1)

# real_here[t] (t=1..N-1, as a LITERAL not a fresh var): transition (t-1 -> t) is a genuine move,
# not a post-arrival padding idle. Equivalent to "NOT x[t-1][goal]" -- if the path was already at
# goal at t-1, absorption already forces x[t][goal]==1 too, so this is exactly the padding case.
def real_here(t): return x[t - 1][goal].Not()

# is_jump[t] / is_normal[t] (t=1..N-1): the TYPE of transition (t-1 -> t). Exactly one holds when
# real_here(t); both are forced 0 during padding (no move at all).
is_jump = {t: m.NewBoolVar(f'jump{t}') for t in range(1, N)}
is_normal = {t: m.NewBoolVar(f'norm{t}') for t in range(1, N)}
for t in range(1, N):
    m.Add(is_jump[t] + is_normal[t] == 1).OnlyEnforceIf(real_here(t))
    m.Add(is_jump[t] == 0).OnlyEnforceIf(real_here(t).Not())
    m.Add(is_normal[t] == 0).OnlyEnforceIf(real_here(t).Not())
    # REVERSE direction, easy to miss: is_jump[t]==1 must itself REQUIRE that x[t-1] actually is a
    # portal cell -- without this, nothing stops the solver from marking an ordinary transition as
    # a "jump" purely to escape every adjacency/direction/edge-axis constraint below (all of which
    # are gated on is_normal, not on "not is_jump"), which is a total under-constraint escape hatch.
    portal_occ_prev = [x[t - 1][c] for c in portal_cells if c in idx]
    if portal_occ_prev:
        m.Add(sum(portal_occ_prev) == 1).OnlyEnforceIf(is_jump[t])
    else:
        m.Add(is_jump[t] == 0)   # no portal cell could possibly precede this transition

# mv[t][c][d]: at node t we are on c and a NORMAL move t->t+1 goes in direction d. Built for every
# cell (portal cells included -- used only on the branch where they were entered via a jump, see
# below; goal included -- vacuously unused, since real_here(t+1) is always false whenever
# x[t][goal] holds, by the absorption rule above).
mv = [{} for _ in range(N - 1)]
for t in range(N - 1):
    for c in grid:
        outs = []
        for di, d in enumerate(DIRS):
            n = step(c, d)
            if n not in idx: continue
            v = m.NewBoolVar(f'mv{t}_{c}_{di}')
            m.AddImplication(v, x[t][c]); m.AddImplication(v, x[t + 1][n])
            mv[t][(c, di)] = v; outs.append(v)
        # A normal move out of c is mandatory exactly when standing on c AND this transition is
        # real AND typed as 'normal' (the only branch that ever needs a directional out-arc).
        trigger = m.NewBoolVar('')
        m.AddBoolAnd([x[t][c], is_normal[t + 1]]).OnlyEnforceIf(trigger)
        m.AddBoolOr([x[t][c].Not(), is_normal[t + 1].Not()]).OnlyEnforceIf(trigger.Not())
        m.Add(sum(outs) == 1).OnlyEnforceIf(trigger)
        if not outs: m.Add(trigger == 0)
    for c in grid:  # arriving at c via a NORMAL move at t+1 means exactly one arc pointed here
        arrivals = [mv[t][(p, di)] for (p, di) in mv[t] if step(p, DIRS[di]) == c]
        if arrivals: m.Add(sum(arrivals) == x[t + 1][c]).OnlyEnforceIf(is_normal[t + 1])

# Portal forcing. For a portal cell c (dest d): if c is occupied at t, this transition is real, and
# the ARRIVAL at c was not itself a jump (arrivedViaPortal would suppress the force), the ONLY
# legal continuation is is_jump[t+1] with x[t+1][d]==1 -- deterministic, no directional choice.
# Conversely, if c was entered VIA a jump, the next move is an ordinary directional one (handled
# by the mv/is_normal machinery above, same as any other cell) -- this is exactly why mv[][] was
# still built for portal cells. t==0 (the start) is never "arrived via jump" and can never itself
# be a portal cell (a gate and a portal cell are different object types on the same cell, which
# the schema forbids), so is_jump[0] doesn't need to exist.
for t in range(N - 1):
    for c in portal_cells:
        if c not in idx: continue
        d = portal_dest[c]
        if d not in idx: continue
        arrived_via_jump = is_jump[t] if t >= 1 else None
        forced = m.NewBoolVar('')
        lits = [x[t][c], real_here(t + 1)]
        if arrived_via_jump is not None: lits.append(arrived_via_jump.Not())
        m.AddBoolAnd(lits).OnlyEnforceIf(forced)
        m.AddBoolOr([l.Not() for l in lits]).OnlyEnforceIf(forced.Not())
        m.Add(is_jump[t + 1] == 1).OnlyEnforceIf(forced)
        m.Add(x[t + 1][d] == 1).OnlyEnforceIf(forced)

# EXPLICIT no-consecutive-jumps rule. The reverse implication above (is_jump[t]==1 requires x[t-1]
# to BE some portal cell) does NOT by itself rule out is_jump[t+1]==1 again right after arriving via
# a jump: when arrived_via_jump is true, "forced" above is false, so x[t+1] is simply left
# unconstrained by the forcing rule -- nothing stops the solver from ALSO setting is_jump[t+1]==1
# with a completely free destination, the exact same under-constraint shape as the first bug, just
# one step narrower. This is search-state.ts's `arrivedViaPortal` guard made explicit rather than
# left to be an accidental consequence of something else.
for t in range(1, N - 1):
    m.Add(is_jump[t + 1] == 0).OnlyEnforceIf(is_jump[t])

# dir[t][di]: direction taken by a NORMAL move t->t+1 (exactly one -- but only meaningful, and only
# required, when this transition actually is normal; a jump or padding transition takes no
# direction at all, matching search-state.ts's exclusion of portal jumps from axis/turn tracking).
dirv = [[m.NewBoolVar(f'd{t}_{di}') for di in range(4)] for t in range(N - 1)]
for t in range(N - 1):
    m.AddExactlyOne(dirv[t]).OnlyEnforceIf(is_normal[t + 1])
    for di in range(4):
        m.Add(dirv[t][di] == 0).OnlyEnforceIf(is_normal[t + 1].Not())
        same = [mv[t][(c, dj)] for (c, dj) in mv[t] if dj == di]
        if same: m.Add(sum(same) == dirv[t][di])
        else: m.Add(dirv[t][di] == 0)

# turn[t] at node t (1 <= t <= N-2), between move t-1 and move t, with chirality. Only meaningful
# when BOTH adjacent moves are normal -- a turn cannot be evaluated across a portal jump on either
# side (matches search-state.ts's !isPortalJump / prevLastWasPortalJump guards: the move ending in
# a jump has no chirality, and the move immediately after one has no defined entry axis to compare
# against). turn_any/cw/ccw are simply left at 0 (no turn) on such a boundary, which is correct:
# a must-turn or adjacent-turn landmark can never be satisfied by that node.
turn_any, turn_cw, turn_ccw = {}, {}, {}
for t in range(1, N - 1):
    ta = m.NewBoolVar(f'turn{t}'); cw = m.NewBoolVar(f'cw{t}'); ccw = m.NewBoolVar(f'ccw{t}')
    both_normal = m.NewBoolVar('')
    m.AddBoolAnd([is_normal[t], is_normal[t + 1]]).OnlyEnforceIf(both_normal)
    m.AddBoolOr([is_normal[t].Not(), is_normal[t + 1].Not()]).OnlyEnforceIf(both_normal.Not())
    pairs_cw, pairs_ccw, pairs_straight = [], [], []
    for a in range(4):
        for b in range(4):
            cross = (DIRS[a][0]) * (DIRS[b][1]) - (DIRS[a][1]) * (DIRS[b][0])
            p = m.NewBoolVar('')
            m.AddBoolAnd([dirv[t - 1][a], dirv[t][b], both_normal]).OnlyEnforceIf(p)
            m.AddBoolOr([dirv[t - 1][a].Not(), dirv[t][b].Not(), both_normal.Not()]).OnlyEnforceIf(p.Not())
            (pairs_cw if cross > 0 else pairs_ccw if cross < 0 else pairs_straight).append(p)
    m.Add(sum(pairs_cw) == cw); m.Add(sum(pairs_ccw) == ccw); m.Add(cw + ccw == ta)
    turn_any[t], turn_cw[t], turn_ccw[t] = ta, cw, ccw

# visits[c]: for every cell except goal, unchanged (padding never sits anywhere but goal, so every
# occupancy of a non-goal cell is automatically a real one). For goal specifically, only the FIRST
# arrival counts -- every later occurrence is a padding echo, not a second "visit" of the real path.
visits = {}
for c in grid:
    if c == goal:
        first_arrival = []
        for t in range(N):
            fa = m.NewBoolVar(f'firstarr{t}')
            if t == 0:
                m.Add(fa == x[0][goal])   # gate != goal always (schema invariant), so this is 0
            else:
                m.AddBoolAnd([x[t][goal], x[t - 1][goal].Not()]).OnlyEnforceIf(fa)
                m.AddBoolOr([x[t][goal].Not(), x[t - 1][goal]]).OnlyEnforceIf(fa.Not())
            first_arrival.append(fa)
        v = m.NewIntVar(0, 1, f'v_{c}'); m.Add(v == sum(first_arrival)); visits[c] = v
    else:
        # Flipping filters are single-use (search-state.ts: `if (state.flipperUsedMask & (1 << fi))
        # return false` rejects any second entry outright), same cap as a portal terminal.
        cap = 1 if (c in portal_cells or c in flip_cells) else 2
        v = m.NewIntVar(0, cap, f'v_{c}'); m.Add(v == sum(x[t][c] for t in range(N))); visits[c] = v
y = {}
for c in grid:
    b = m.NewBoolVar(f'y_{c}')
    m.Add(visits[c] >= 1).OnlyEnforceIf(b); m.Add(visits[c] == 0).OnlyEnforceIf(b.Not()); y[c] = b

# real_N: count of genuinely-real nodes (0..first goal arrival inclusive) -- node 0 is always real;
# every later node t is real iff the PREVIOUS node wasn't already goal (padding, once started,
# never un-starts). A plain linear expression, no new variables needed.
real_N = 1 + sum(x[t][goal].Not() for t in range(N - 1))

# BUG FIXED 2026-08-15 (found while re-running the repair-retreat --prefix binary search on
# portal-bearing levels post flipping-filter support -- see
# reports/2026-08-15-cpsat-flipping-filter-support.md's "Second pre-existing bug" section).
# Nothing previously tied real_N to the level's own reqLen: the model only forced "eventually reach
# goal by the last padded slot" (the absorption rule + `x[N-1][goal]==1`), which is equally
# satisfiable by reaching goal EARLY (fewer real moves than reqLen) and then padding out the rest of
# the horizon -- a real path is `reqLen + 1 + jumps` nodes (CLAUDE.md: "Counted length = nodes - 1 -
# portal jumps"), not merely "ends at goal eventually." --check-witness never exposed this because
# pinning the ENTIRE witness removes all freedom to arrive early; two prior cold, fully-unpinned
# solves used in this file's own validation (see FLIPPING FILTER SUPPORT above) both happened to be
# portal-free (P=0), where N=L+1 exactly and there is no padding slack for the exploit to live in.
# --prefix mode against a portal-bearing level (P>0, so N>L+1) is precisely where the missing
# constraint had real freedom to bite, and did: two referee-rejected "Path length 64 does not match
# required 70" / "Path length 39 does not match required 76" emissions, caught only because every
# emitted path is referee-validated, never because check-witness or the model itself flagged
# anything. `jumps_used` sums cleanly over the WHOLE horizon (is_jump[t] is already forced 0 outside
# the real region by the is_jump/is_normal typing block above), so no extra gating is needed.
jumps_used = sum(is_jump[t] for t in range(1, N))
m.Add(real_N == L + 1 + jumps_used)

m.Add(sum(y.values()) == real_N - req_int)                 # reqInt == nodes - distinctCells
for c in must_pass:
    if c in idx: m.Add(y[c] == 1)
if not core_only and not no_mustcross:
    for c in must_cross:
        if c in idx: m.Add(visits[c] == 2)                 # crossCounts >= 2
for g in gates:
    # A gate cell is illegal as a move target unconditionally (move-rules.ts: `gateKeys.includes
    # (targetKey)` rejects every gate, not just "the one already left"), including every OTHER
    # unused gate on a multi-gate level. `visits[g] <= 1` alone only capped the CHOSEN start gate
    # correctly (it is naturally 1, via x[0][g]) -- it left every non-chosen gate free to be
    # visited once at any later t, which real Pathfinder forbids outright. Found via a referee-
    # rejected witness on S00108 (4 gates): the emitted path walked through an unused gate cell
    # mid-route ("Invalid move at step 47" == invalid-gate-reentry in move-rules.ts).
    if g in idx:
        m.Add(visits[g] == 1).OnlyEnforceIf(x[0][g])
        m.Add(visits[g] == 0).OnlyEnforceIf(x[0][g].Not())
m.Add(visits[goal] == 1)

# Edge-axis reuse. The unit is a VISIT, not an entry.
#
# BUG FIXED 2026-07-31. This was `at most one ENTRY into a cell per axis`, which is strictly more
# permissive than the game: leaving a cell also consumes that cell's axis slot. path-validator.ts
# marks the axis on BOTH endpoints of every move (`markAxis(prev, ...); markAxis(cur, ...)`) and
# move-rules.ts rejects `invalid-edge-reuse-origin` as well as `...-target`. Under the old
# constraint this model happily emitted an immediate bounce back down the same edge —
# (5,2)->(6,2)->(5,2) — which validateCandidatePath rejects, so the "solutions" it printed were not
# game-valid paths. It solved a RELAXED problem throughout.
#
# --check-witness could never have caught this: an under-constrained model still accepts every
# valid path, so pinning a witness passes. Only refereeing an EMITTED path catches it, which is how
# it was found (scripts/stress/cpsat-hint-harvest.mjs feeds every path to validateCandidatePath).
#
# Correct rule: a visit to c touches axis A if it ENTERS along A or LEAVES along A, and at most one
# visit per cell may touch each axis. A straight-through pass enters and leaves on the same axis —
# two A-moves, but one A-touching visit — which is legal and is exactly the case move-rules.ts
# exempts by skipping the origin check when `axis === entryAxis`. (Encoding it as "at most one
# A-MOVE touching c" is the opposite error: it forbids straight-through passes and makes every
# level's own witness UNSAT.)
#
# PORTAL NOTE: a jump transition touches axis bookkeeping on NEITHER endpoint (search-state.ts:
# "Edge usage update (only for non-portal moves)") -- horiz[t] is only defined for normal moves
# (forced 0 during a jump or padding transition, both of which have no direction at all), so a
# jump's endpoints are automatically excluded here without extra conditioning.
horiz = [m.NewBoolVar(f'h{t}') for t in range(N - 1)]
for t in range(N - 1):
    m.Add(horiz[t] == dirv[t][0] + dirv[t][1])   # DIRS[0]=(1,0), DIRS[1]=(-1,0) are the H moves

# BUG FIXED 2026-08-15 (found while validating flipping-filter support, but PRE-EXISTING and
# unrelated to it -- see reports/2026-08-15-cpsat-flipping-filter-support.md for the full repro:
# a portal-bearing level whose witness does NOT use every declared portal pair leaves 1+ genuine
# padding slots after the real path ends. During a padding transition (both endpoints already
# goal), `horiz[t]` is forced 0 -- not because that move is vertical, but because there IS no real
# move at all (is_normal[t+1]==0 forces every dirv[t][*]==0, per the mv[]/dir[] block above). The
# ORIGINAL code below read that 0 as "this move touched V", so `want_h=False` unconditionally
# double-counted an axis touch at GOAL: once for the real arrival, once more for every padding
# slot -- INFEASIBLE on a perfectly legal witness whenever ANY padding existed, independent of
# what the real entry move's axis even was. Confirmed by a 5-level empirical bisection (disabling
# each candidate block against a known-good witness) before being traced to this exact mechanism.
# Only the GOAL cell can ever be affected: a non-goal cell can never itself be the path's terminal
# node (only goal absorbs), so for c != goal, x[t][c]==1 always implies both adjacent transitions
# are genuinely real -- the original simpler (cheaper) form is correct there and kept as-is.
def real_touch_lits(t, want_h):
    lits = []
    if t > 0:
        h_lit = horiz[t - 1] if want_h else horiz[t - 1].Not()
        entry = m.NewBoolVar('')
        m.AddBoolAnd([h_lit, real_here(t)]).OnlyEnforceIf(entry)
        m.AddBoolOr([h_lit.Not(), real_here(t).Not()]).OnlyEnforceIf(entry.Not())
        lits.append(entry)
    if t < N - 1:
        h_lit = horiz[t] if want_h else horiz[t].Not()
        exit_ = m.NewBoolVar('')
        m.AddBoolAnd([h_lit, real_here(t + 1)]).OnlyEnforceIf(exit_)
        m.AddBoolOr([h_lit.Not(), real_here(t + 1).Not()]).OnlyEnforceIf(exit_.Not())
        lits.append(exit_)
    return lits

for c in grid:
    for want_h in (True, False):
        touches = []
        for t in range(N):
            if c == goal:
                lits = real_touch_lits(t, want_h)
            else:
                lits = []
                if t > 0:   lits.append(horiz[t - 1] if want_h else horiz[t - 1].Not())
                if t < N - 1: lits.append(horiz[t] if want_h else horiz[t].Not())
            if not lits: continue
            any_side = m.NewBoolVar('')          # entered along this axis OR left along it
            m.AddMaxEquality(any_side, lits)
            tv = m.NewBoolVar('')                # ...and the path is actually on c at time t
            m.AddBoolAnd([x[t][c], any_side]).OnlyEnforceIf(tv)
            m.AddBoolOr([x[t][c].Not(), any_side.Not()]).OnlyEnforceIf(tv.Not())
            touches.append(tv)
        if touches: m.Add(sum(touches) <= 1)

# FLIPPING FILTER SUPPORT (added 2026-08-15). Semantics taken directly from
# search-state.ts's isMoveDynamicallyValid, not from CLAUDE.md's summary (CLAUDE.md's own account
# is consistent, but the source is the referee this file's whole discipline defers to):
#
#   * single-use (visits capped at 1, handled above alongside portals);
#   * NO TURN at a flipper cell, unconditionally, on its one crossing -- entry axis must equal
#     exit axis (`level.flippingFilterMap.has(from) && entryAxis !== moveAxis => false`);
#   * the REQUIRED entry axis on that one crossing is the filter's declared axis if this is the
#     filter's rank (0-indexed count of OTHER flippers already used board-wide when this one is
#     entered) is EVEN, and the flipped axis if ODD (`curAx = (usedCount & 1) === 0 ? initAx :
#     flip(initAx)`) -- a GLOBAL property of crossing order across every flipper on the board, not
#     a per-cell counter, which is why this can't be expressed as a simple per-cell constraint the
#     way must-cross's `visits[c] == 2` is.
#
# Modelled without needing to know the crossing order up front: for each ordered pair of distinct
# flippers (i, j), `before_ij` is true iff both are crossed AND j's (single, since capped at 1)
# entry timestep is strictly earlier than i's. Summing `before_ij` over every j != i gives flipper
# i's rank directly, entirely from variables the model already has (no permutation/ordering
# variable needed). Rank parity then selects the required axis exactly as above.
#
# A crossed flipper's entry is ALWAYS a normal directional move (never portal-forced: the ONLY
# portal-forced branch in getNeighbors is taken before any candidate/dynamic-validity check ever
# runs, and a portal destination can never itself be a flipper cell -- one-object-per-cell), so
# `horiz[t-1]`/`horiz[t]` (already defined above) are exactly the right entry/exit-axis literals;
# no new move-typing machinery is needed the way portal support required `is_jump`/`is_normal`.
for i, (c_i, ax_i) in enumerate([] if (core_only or no_flippers) else flip_filters):
    if c_i not in idx: continue
    entry_time_i = sum(t * x[t][c_i] for t in range(N))
    before = []
    for j, (c_j, _) in enumerate(flip_filters):
        if i == j or c_j not in idx: continue
        entry_time_j = sum(t * x[t][c_j] for t in range(N))
        lt = m.NewBoolVar(f'fliplt_{i}_{j}')
        m.Add(entry_time_j < entry_time_i).OnlyEnforceIf(lt)
        m.Add(entry_time_j >= entry_time_i).OnlyEnforceIf(lt.Not())
        b = m.NewBoolVar(f'flipbefore_{i}_{j}')
        m.AddBoolAnd([y[c_i], y[c_j], lt]).OnlyEnforceIf(b)
        m.AddBoolOr([y[c_i].Not(), y[c_j].Not(), lt.Not()]).OnlyEnforceIf(b.Not())
        before.append(b)
    rank = sum(before) if before else 0
    half = m.NewIntVar(0, max(1, len(before)), f'fliphalf_{i}')
    parity = m.NewBoolVar(f'flipparity_{i}')   # rank is odd
    m.Add(rank == 2 * half + parity)
    # Required entry axis: declared when parity is even(0), flipped when odd(1). horiz==1 means H.
    want_h_when_even = (ax_i == 1)
    for t in range(1, N):
        crossing = x[t][c_i]
        m.Add(horiz[t - 1] == (1 if want_h_when_even else 0)).OnlyEnforceIf([crossing, parity.Not()])
        m.Add(horiz[t - 1] == (0 if want_h_when_even else 1)).OnlyEnforceIf([crossing, parity])
    # No turn at a flipper cell, on its one crossing, regardless of orientation (t <= N-2 always
    # holds here: a flipper can never be the goal, so x[N-1][c_i] is already forced to 0 by the
    # exactly-one-cell-per-timestep + goal-absorption constraints above).
    for t in range(1, N - 1):
        m.Add(horiz[t - 1] == horiz[t]).OnlyEnforceIf(x[t][c_i])

def turn_var_for(t, want):
    return turn_any[t] if want == 'either' else (turn_cw[t] if want == 'cw' else turn_ccw[t])

for (c, role, want) in ([] if (core_only or no_landmarks) else landmarks):
    if role in ('mustTurn', 'mustTurnCw', 'mustTurnCcw'):
        w = 'cw' if role == 'mustTurnCw' else 'ccw' if role == 'mustTurnCcw' else want
        opts = []
        for t in range(1, N - 1):
            if c not in idx: continue
            o = m.NewBoolVar('')
            m.AddBoolAnd([x[t][c], turn_var_for(t, w)]).OnlyEnforceIf(o)
            m.AddBoolOr([x[t][c].Not(), turn_var_for(t, w).Not()]).OnlyEnforceIf(o.Not())
            opts.append(o)
        if opts: m.Add(sum(opts) >= 1)
    elif role == 'surround':
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (c[0] + dx, c[1] + dy)
                if (dx or dy) and n in idx: m.Add(y[n] == 1)
    elif role in ('adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw'):
        w = 'cw' if role == 'adjacentTurnCw' else 'ccw' if role == 'adjacentTurnCcw' else want
        opts = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (c[0] + dx, c[1] + dy)
                if not (dx or dy) or n not in idx: continue
                for t in range(1, N - 1):
                    o = m.NewBoolVar('')
                    m.AddBoolAnd([x[t][n], turn_var_for(t, w)]).OnlyEnforceIf(o)
                    m.AddBoolOr([x[t][n].Not(), turn_var_for(t, w).Not()]).OnlyEnforceIf(o.Not())
                    opts.append(o)
        if opts: m.Add(sum(opts) >= 1)

# --prefix=<json [[x,y],...]> pins the FIRST k positions (1-indexed coords, like a witness) and
# leaves the rest free, turning this file into a prefix-feasibility ORACLE: "does any valid
# completion exist from this partial path?" scripts/stress/prune-gap-probe.mjs uses it to ask, for
# each branch our own search declines to prune, whether that branch was actually dead — which is how
# a missing global inference is localised without solving each subtree by brute force.
#
# PORTAL NOTE: a prefix's own node count already reflects however many jumps it used, so pinning it
# against x[0..k-1] on the padded timeline is unchanged from the original scheme -- the padding
# machinery only affects what happens AFTER the pinned prefix.
prefix_arg = next((a for a in sys.argv if a.startswith('--prefix=')), None)
if prefix_arg:
    pre = [(c[0] - 1, c[1] - 1) for c in json.loads(prefix_arg.split('=', 1)[1])]
    if len(pre) > N:
        print(f'{level_id}: prefix has {len(pre)} nodes, model only has {N}'); sys.exit(4)
    for t, c in enumerate(pre):
        if c not in idx:
            print(f'{level_id}: prefix node {t} {c} is IMPASSABLE in my model'); sys.exit(5)
        m.Add(x[t][c] == 1)

if check_witness:
    wit = [(c[0] - 1, c[1] - 1) for c in lv['stressMeta']['witnessSolution']]
    if len(wit) > N:
        print(f'{level_id}: witness has {len(wit)} nodes, model horizon is only {N} -- cannot check'); sys.exit(4)
    for t, c in enumerate(wit):
        if c not in idx:
            print(f'{level_id}: witness node {t} {c} is IMPASSABLE in my model -- encoding bug'); sys.exit(5)
        m.Add(x[t][c] == 1)
    # A witness shorter than the padded horizon (it used fewer than P jumps) legitimately pads out
    # to goal for the remaining slots -- that's the absorbing rule doing its job, not pinned here;
    # only pin the witness's own real nodes.

solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = time_limit
solver.parameters.num_search_workers = 8
t0 = time.time(); status = solver.Solve(m); el = time.time() - t0
name = solver.StatusName(status)
print(f'{level_id}: {W}x{H} reqLen={L} reqInt={req_int} mustCross={len(must_cross)} '
      f'landmarks={len(landmarks)} portalPairs={P} flippingFilters={F} -> {name} in {el:.1f}s')
if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) and emit_path:
    # Stop at the first real arrival at goal -- everything after is a padding echo (repeated goal),
    # which is not a legal "move" in the real game and would make validateCandidatePath reject an
    # otherwise-correct path for the wrong reason.
    path = []
    for t in range(N):
        for c in grid:
            if solver.Value(x[t][c]):
                path.append([c[0] + 1, c[1] + 1])
                break
        if path[-1] == [goal[0] + 1, goal[1] + 1]:
            break
    print('PATH ' + json.dumps(path))
