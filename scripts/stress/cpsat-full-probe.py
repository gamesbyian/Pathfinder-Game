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

SCOPE. Filters and flipping filters remain unencoded (flipping filters are genuinely
state/parity-dependent -- the harder half of this extension, deliberately deferred; see
docs/solver-shadow-eval-harness.md's discussion of why portals were tackled first).

Usage:  python3 scripts/stress/cpsat-full-probe.py <levelId> [timeLimitSec] [--emit-path]
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

raw = json.load(open('data/stress/stress-levels-random.json'))
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

if lv.get('filters') or lv.get('flippingFilters'):
    print(f'{level_id}: SKIPPED (filters/flipping filters not encoded yet)'); sys.exit(3)

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
        cap = 1 if c in portal_cells else 2
        v = m.NewIntVar(0, cap, f'v_{c}'); m.Add(v == sum(x[t][c] for t in range(N))); visits[c] = v
y = {}
for c in grid:
    b = m.NewBoolVar(f'y_{c}')
    m.Add(visits[c] >= 1).OnlyEnforceIf(b); m.Add(visits[c] == 0).OnlyEnforceIf(b.Not()); y[c] = b

# real_N: count of genuinely-real nodes (0..first goal arrival inclusive) -- node 0 is always real;
# every later node t is real iff the PREVIOUS node wasn't already goal (padding, once started,
# never un-starts). A plain linear expression, no new variables needed.
real_N = 1 + sum(x[t][goal].Not() for t in range(N - 1))
m.Add(sum(y.values()) == real_N - req_int)                 # reqInt == nodes - distinctCells
for c in must_pass:
    if c in idx: m.Add(y[c] == 1)
if not core_only and not no_mustcross:
    for c in must_cross:
        if c in idx: m.Add(visits[c] == 2)                 # crossCounts >= 2
for g in gates:
    if g in idx: m.Add(visits[g] <= 1)
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
for c in grid:
    for want_h in (True, False):
        touches = []
        for t in range(N):
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
      f'landmarks={len(landmarks)} portalPairs={P} -> {name} in {el:.1f}s')
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
