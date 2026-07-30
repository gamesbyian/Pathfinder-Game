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

if lv.get('portals') or lv.get('filters') or lv.get('flippingFilters'):
    print(f'{level_id}: SKIPPED (portals/filters/flipping filters not encoded yet)'); sys.exit(3)

gates = [(g['x'] - 1, g['y'] - 1) for g in lv['gates']]
goal = (lv['goal']['x'] - 1, lv['goal']['y'] - 1)
must_pass = cells('mustPass')
must_cross = cells('mustCross')
L, req_int = lv['reqLen'], lv['reqInt']
N = L + 1

grid = [(x, y) for y in range(H) for x in range(W) if (x, y) not in impassable]
idx = set(grid)
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
def step(c, d): return (c[0] + d[0], c[1] + d[1])

m = cp_model.CpModel()
x = [{c: m.NewBoolVar(f'x{t}_{c}') for c in grid} for t in range(N)]
for t in range(N): m.AddExactlyOne(x[t].values())
m.AddExactlyOne([x[0][g] for g in gates if g in idx])
m.Add(x[N-1][goal] == 1)

# mv[t][c][d]: at node t we are on c and the move t->t+1 goes in direction d.
mv = [{} for _ in range(N-1)]
for t in range(N-1):
    for c in grid:
        outs = []
        for di, d in enumerate(DIRS):
            n = step(c, d)
            if n not in idx: continue
            v = m.NewBoolVar(f'mv{t}_{c}_{di}')
            m.AddImplication(v, x[t][c]); m.AddImplication(v, x[t+1][n])
            mv[t][(c, di)] = v; outs.append(v)
        m.Add(sum(outs) == 1).OnlyEnforceIf(x[t][c])
        if not outs: m.Add(x[t][c] == 0)
    for c in grid:  # arriving at c at t+1 means exactly one arc pointed here
        arrivals = [mv[t][(p, di)] for (p, di) in mv[t] if step(p, DIRS[di]) == c]
        if arrivals: m.Add(sum(arrivals) == x[t+1][c])
        else: m.Add(x[t+1][c] == 0)

# dir[t][di]: direction taken by move t (exactly one, since exactly one cell is occupied)
dirv = [[m.NewBoolVar(f'd{t}_{di}') for di in range(4)] for t in range(N-1)]
for t in range(N-1):
    m.AddExactlyOne(dirv[t])
    for di in range(4):
        same = [mv[t][(c, dj)] for (c, dj) in mv[t] if dj == di]
        m.Add(sum(same) == dirv[t][di])

# turn[t] at node t (1 <= t <= N-2), between move t-1 and move t, with chirality.
turn_any, turn_cw, turn_ccw = {}, {}, {}
for t in range(1, N-1):
    ta = m.NewBoolVar(f'turn{t}'); cw = m.NewBoolVar(f'cw{t}'); ccw = m.NewBoolVar(f'ccw{t}')
    pairs_cw, pairs_ccw, pairs_straight = [], [], []
    for a in range(4):
        for b in range(4):
            px, py = -DIRS[a][0], -DIRS[a][1]          # prev relative to from
            cross = (DIRS[a][0]) * (DIRS[b][1]) - (DIRS[a][1]) * (DIRS[b][0])
            p = m.NewBoolVar('')
            m.AddBoolAnd([dirv[t-1][a], dirv[t][b]]).OnlyEnforceIf(p)
            m.AddBoolOr([dirv[t-1][a].Not(), dirv[t][b].Not()]).OnlyEnforceIf(p.Not())
            (pairs_cw if cross > 0 else pairs_ccw if cross < 0 else pairs_straight).append(p)
    m.Add(sum(pairs_cw) == cw); m.Add(sum(pairs_ccw) == ccw); m.Add(cw + ccw == ta)
    turn_any[t], turn_cw[t], turn_ccw[t] = ta, cw, ccw

visits = {}
for c in grid:
    v = m.NewIntVar(0, 2, f'v_{c}'); m.Add(v == sum(x[t][c] for t in range(N))); visits[c] = v
y = {}
for c in grid:
    b = m.NewBoolVar(f'y_{c}')
    m.Add(visits[c] >= 1).OnlyEnforceIf(b); m.Add(visits[c] == 0).OnlyEnforceIf(b.Not()); y[c] = b

m.Add(sum(y.values()) == N - req_int)                      # reqInt == nodes - distinctCells
for c in must_pass:
    if c in idx: m.Add(y[c] == 1)
if not core_only:
    for c in must_cross:
        if c in idx: m.Add(visits[c] == 2)                 # crossCounts >= 2
for g in gates:
    if g in idx: m.Add(visits[g] <= 1)
m.Add(visits[goal] == 1)

# edge-axis reuse: at most one entry into a cell per axis
for c in grid:
    for axis in ((1, 0), (0, 1)):
        entries = []
        for t in range(N-1):
            for di, d in enumerate(DIRS):
                if (abs(d[0]), abs(d[1])) != axis: continue
                p = step(c, (-d[0], -d[1]))
                if (p, di) in mv[t]: entries.append(mv[t][(p, di)])
        if entries: m.Add(sum(entries) <= 1)

def turn_var_for(t, want):
    return turn_any[t] if want == 'either' else (turn_cw[t] if want == 'cw' else turn_ccw[t])

for (c, role, want) in ([] if core_only else landmarks):
    if role in ('mustTurn', 'mustTurnCw', 'mustTurnCcw'):
        w = 'cw' if role == 'mustTurnCw' else 'ccw' if role == 'mustTurnCcw' else want
        opts = []
        for t in range(1, N-1):
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
                for t in range(1, N-1):
                    o = m.NewBoolVar('')
                    m.AddBoolAnd([x[t][n], turn_var_for(t, w)]).OnlyEnforceIf(o)
                    m.AddBoolOr([x[t][n].Not(), turn_var_for(t, w).Not()]).OnlyEnforceIf(o.Not())
                    opts.append(o)
        if opts: m.Add(sum(opts) >= 1)

solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = time_limit
solver.parameters.num_search_workers = 8
t0 = time.time(); status = solver.Solve(m); el = time.time() - t0
name = solver.StatusName(status)
print(f'{level_id}: {W}x{H} reqLen={L} reqInt={req_int} mustCross={len(must_cross)} '
      f'landmarks={len(landmarks)} -> {name} in {el:.1f}s')
if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) and emit_path:
    path = []
    for t in range(N):
        for c in grid:
            if solver.Value(x[t][c]): path.append([c[0] + 1, c[1] + 1]); break
    print('PATH ' + json.dumps(path))
