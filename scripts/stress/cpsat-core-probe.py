#!/usr/bin/env python3
"""Feasibility probe: can CP-SAT find an exact-length, exact-intersection walk at corpus scale?

CORE ONLY -- grid, impassables, gate, goal, reqLen, reqInt, must-pass, and the edge-axis reuse
rule. Deliberately omits portals / filters / flipping filters / must-cross / turn landmarks, so a
solution here is NOT a valid hint. The question is only whether the core search space is tractable
for an exact solver at the sizes the corpus actually uses; if it is not, mechanic coverage is moot.

Key structural facts this leans on, both verified against the real corpus first:
  * reqInt == nodes - distinctCells  (exact on 172/172 portal-free witnesses)
    -> a single LINEAR cardinality constraint, which is precisely what makes this encodable at all
  * max visits to any cell == 2      (the edge-axis reuse rule caps it)
    -> visit counts are 0/1/2, not unbounded
"""
import json, sys, time
from ortools.sat.python import cp_model

level_id = sys.argv[1]
time_limit = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0

raw = json.load(open('data/stress/stress-levels-random.json'))
levels = raw if isinstance(raw, list) else raw['levels']
lv = next(l for l in levels if l.get('id') == level_id)

W, H = lv['grid']['w'], lv['grid']['h']
def cells(field):
    return {(c['x'] - 1, c['y'] - 1) for c in lv.get(field) or []}

impassable = cells('blocks') | cells('geese') | cells('falseGoals')
# Impassable landmark roles are blockers too; passable ones are ordinary cells here.
for lm in lv.get('landmarks') or []:
    if lm.get('role') in ('surround', 'adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw', 'decorative'):
        impassable.add((lm['x'] - 1, lm['y'] - 1))

gates = [(g['x'] - 1, g['y'] - 1) for g in lv['gates']]
goal = (lv['goal']['x'] - 1, lv['goal']['y'] - 1)
must_pass = cells('mustPass')
L = lv['reqLen']          # counted length == number of moves (portal-free)
N = L + 1                 # number of path nodes
req_int = lv['reqInt']

grid = [(x, y) for y in range(H) for x in range(W) if (x, y) not in impassable]
idx = {c: i for i, c in enumerate(grid)}
def nbrs(c):
    x, y = c
    return [n for n in ((x+1,y), (x-1,y), (x,y+1), (x,y-1)) if n in idx]

m = cp_model.CpModel()
# x[t][c] : path node t sits on cell c
x = [{c: m.NewBoolVar(f'x{t}_{c}') for c in grid} for t in range(N)]
for t in range(N):
    m.AddExactlyOne(x[t].values())

# endpoints
m.AddExactlyOne([x[0][g] for g in gates if g in idx])
m.Add(x[N-1][goal] == 1)

# adjacency: consecutive nodes are 4-neighbours
for t in range(N-1):
    for c in grid:
        m.AddBoolOr([x[t][c].Not()] + [x[t+1][n] for n in nbrs(c)])

# visit counts, capped at 2 by the edge-axis reuse rule
visits = {}
for c in grid:
    v = m.NewIntVar(0, 2, f'v_{c}')
    m.Add(v == sum(x[t][c] for t in range(N)))
    visits[c] = v
y = {}
for c in grid:
    b = m.NewBoolVar(f'y_{c}')
    m.Add(visits[c] >= 1).OnlyEnforceIf(b)
    m.Add(visits[c] == 0).OnlyEnforceIf(b.Not())
    y[c] = b

# THE constraint that makes this work: intersections == nodes - distinct visited cells
m.Add(sum(y.values()) == N - req_int)

# must-pass, gate-not-re-entered, goal-visited-once
for c in must_pass:
    if c in idx: m.Add(y[c] == 1)
for g in gates:
    if g in idx: m.Add(visits[g] <= 1)
m.Add(visits[goal] == 1)

# edge-axis reuse: a cell may be entered at most once along each axis
for c in grid:
    x0, y0 = c
    horiz = [n for n in ((x0+1,y0), (x0-1,y0)) if n in idx]
    vert  = [n for n in ((x0,y0+1), (x0,y0-1)) if n in idx]
    for axis_nbrs in (horiz, vert):
        entries = []
        for t in range(N-1):
            for n in axis_nbrs:
                e = m.NewBoolVar('')
                m.AddBoolAnd([x[t][n], x[t+1][c]]).OnlyEnforceIf(e)
                m.AddBoolOr([x[t][n].Not(), x[t+1][c].Not()]).OnlyEnforceIf(e.Not())
                entries.append(e)
        if entries: m.Add(sum(entries) <= 1)

solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = time_limit
solver.parameters.num_search_workers = 4
t0 = time.time()
status = solver.Solve(m)
el = time.time() - t0

name = solver.StatusName(status)
print(f'{level_id}: {W}x{H} reqLen={L} reqInt={req_int} cells={len(grid)} '
      f'vars~{N*len(grid)} -> {name} in {el:.1f}s')
if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
    path = []
    for t in range(N):
        for c in grid:
            if solver.Value(x[t][c]): path.append(c); break
    distinct = len(set(path))
    print(f'   path nodes={len(path)} distinct={distinct} implied reqInt={len(path)-distinct}')
