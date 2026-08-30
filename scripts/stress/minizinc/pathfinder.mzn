%-----------------------------------------------------------------------------
% Pathfinder level as a constraint model — solver-independent.
%
% WHY THIS EXISTS. scripts/stress/cpsat-reference-probe.py answered "can an exact solver crack the
% levels ours cannot" with ONE hand-rolled encoding on ONE solver, and got a timeout. That result
% is confounded: "these instances are intrinsically hard" and "this particular model encodes
% must-cross badly" predict exactly the same observation. This file is the same problem written
% once in a solver-independent language so the SAME model can be run across CP-SAT, Chuffed (lazy
% clause generation) and Gecode, which separates the two.
%
% NOT A HINT FACTORY BY ITSELF. Any path this emits is a claim, not a hint. The driver
% (scripts/stress/minizinc-probe.mjs) feeds every path to the game's own validateCandidatePath
% before it is allowed anywhere near the corpus, so an encoding bug surfaces as a REJECTED path
% rather than a corrupt hint. That referee check is the only reason it is safe to hand-roll an
% independent model of the rules at all.
%
% SCOPE. Portals, filters and flipping filters are NOT modelled; the driver refuses such levels
% rather than silently solving an easier problem. This matches cpsat-reference-probe.py's own scope, so
% the backend comparison stays apples-to-apples with the result it is re-testing. Flipping filters
% in particular are path-history-dependent (axis flips on parity of use), which a time-indexed
% model can express only with per-step filter state — real work, not an oversight.
%
% CONVENTIONS taken from the source, not inferred (same as the CP-SAT probe):
%   * turn chirality: cross = dx[a]*dy[b] - dy[a]*dx[b] over consecutive move directions;
%     > 0 is 'cw', < 0 is 'ccw', 0 is straight  (modules/domain/geometry.ts turnDirection)
%   * must-cross is satisfied by visiting the cell TWICE; the "two opposite sides" property falls
%     out of the edge-axis reuse rule (modules/solver/search-state.ts)
%   * a cell is entered at most once per axis, which caps visits at 2
%   * reqInt == nodes - distinctCells  (verified exact on 172/172 portal-free witnesses)
% All coordinates here are 0-INDEXED; the level JSON is 1-indexed and the driver converts.
%-----------------------------------------------------------------------------
include "globals.mzn";

int: W;                                   % grid width
int: H;                                   % grid height
int: N;                                   % number of path nodes == reqLen + 1
int: reqInt;                              % exact intersection count

set of int: CELL = 0..W*H-1;
set of int: TIME = 1..N;
set of int: MOVE = 1..N-1;

set of CELL: PASSABLE;
set of CELL: GATES;
CELL: goalCell;
set of CELL: MUSTPASS;
set of CELL: MUSTCROSS;
set of CELL: SURROUND;                    % 8-neighbours of surround landmarks; must be visited

% Turn landmarks. want: 0 = either, 1 = cw, 2 = ccw.
int: nMustTurn;
array[1..nMustTurn] of CELL: mustTurnCell;
array[1..nMustTurn] of 0..2: mustTurnWant;

% Adjacent-turn landmarks: the turn may happen at ANY of the landmark's 8 passable neighbours,
% so membership is a set per landmark rather than a single cell.
int: nAdjTurn;
array[1..nAdjTurn, CELL] of bool: adjTurnMember;
array[1..nAdjTurn] of 0..2: adjTurnWant;

% Witness pinning (the --check-witness equivalent). When checkWitness is true every position is
% forced to the level's own stored witness, a path the GAME accepts. If the model then reports
% UNSATISFIABLE, the ENCODING is over-constrained and any timeout elsewhere was the solver
% grinding to prove a falsehood rather than evidence of difficulty. This must pass before any
% conclusion is drawn from this file — on every backend, since a wrong answer here is a bug
% wherever it appears.
bool: checkWitness;
array[TIME] of CELL: witnessPos;

% Direction 1=+x, 2=-x, 3=+y, 4=-y.
array[1..4] of int: dx = [1, -1, 0, 0];
array[1..4] of int: dy = [0, 0, 1, -1];
% crossSign[a,b] = sign(dx[a]*dy[b] - dy[a]*dx[b]) for consecutive moves a then b.
array[1..4, 1..4] of int: crossSign =
  array2d(1..4, 1..4, [ dx[a]*dy[b] - dy[a]*dx[b] | a in 1..4, b in 1..4 ]);

array[TIME] of var 0..W-1: px;
array[TIME] of var 0..H-1: py;
array[TIME] of var PASSABLE: pos;         % domain restricted to passable cells directly
array[MOVE] of var 1..4: dir;

% Boolean occupancy matrix, channelled to `pos`. This is the difference between a model that is
% CORRECT and one that can actually SEARCH: an earlier version of this file used `pos` alone with
% global_cardinality for the visit counts and reified integer equalities for the axis rule, passed
% the witness check on all three backends in ~1s — and then timed out at 90s on levels our own DFS
% solver solves in seconds, while the hand-rolled boolean CP-SAT model
% (scripts/stress/cpsat-reference-probe.py) solved the same levels in 7-19s. The lesson is recorded in
% the report: a witness check proves soundness, NOT propagation quality, so a model needs a
% positive control (a level it ought to crack easily) before any timeout from it means anything.
% With the channelling below, visit counts become plain linear sums over booleans and the axis rule
% a conjunction of two booleans, which is the form these engines actually propagate on.
array[TIME, CELL] of var bool: visit;
constraint forall(t in TIME)( sum(c in CELL)(bool2int(visit[t, c])) = 1 );
constraint forall(t in TIME, c in CELL)( visit[t, c] <-> pos[t] = c );
% horiz[t] splits the move axis out as its own boolean so the edge-axis rule below is a boolean
% conjunction rather than a reified integer comparison repeated W*H*N times.
array[MOVE] of var bool: horiz;
constraint forall(t in MOVE)( horiz[t] <-> dir[t] <= 2 );

constraint forall(t in TIME)( pos[t] = py[t]*W + px[t] );

% Movement: one orthogonal step per move, expressed through dir so turns are readable off it.
constraint forall(t in MOVE)(
    px[t+1] = px[t] + dx[dir[t]] /\ py[t+1] = py[t] + dy[dir[t]]
);

constraint pos[1] in GATES;
constraint pos[N] = goalCell;

% Visit counts. The axis rule below caps these at 2; stating the bound here as well gives the
% propagators it directly instead of making them infer it.
array[CELL] of var 0..2: visits;
constraint forall(c in CELL)( visits[c] = sum(t in TIME)(bool2int(visit[t, c])) );

% reqInt == nodes - distinctCells, as a single linear constraint. This identity is what makes the
% intersection count encodable without tracking revisits pairwise.
constraint sum(c in CELL)(bool2int(visits[c] > 0)) = N - reqInt;

constraint forall(c in MUSTPASS)( visits[c] >= 1 );
constraint forall(c in MUSTCROSS)( visits[c] = 2 );
constraint forall(c in SURROUND)( visits[c] >= 1 );
constraint forall(g in GATES)( visits[g] <= 1 );      % a gate cannot be re-entered
constraint visits[goalCell] = 1;                      % reaching the goal ends the path

% Edge-axis reuse: a cell may be entered at most once per axis. dir <= 2 is a horizontal move,
% dir >= 3 vertical; the cell entered by move t is pos[t+1].
% BOTH ENDPOINTS, not just the entry. modules/domain/path-validator.ts marks the axis on the cell
% being LEFT as well as the one being entered (`markAxis(prev, moveAxis); markAxis(cur, moveAxis)`),
% and move-rules.ts then rejects both `invalid-edge-reuse-target` and `invalid-edge-reuse-origin`.
% So a cell's horizontal slot is consumed by ANY horizontal move touching it, in or out.
%
% Encoding this as entries-only (which is what scripts/stress/cpsat-reference-probe.py does) makes the
% model strictly MORE PERMISSIVE than the game: it admits an immediate bounce back along the same
% edge, e.g. (5,2)->(6,2)->(5,2), which the referee rejects. That is not a hypothetical — it is how
% the first paths harvested from the Python probe were caught by validateCandidatePath. A witness
% check cannot detect this class of error at all, because an under-constrained model still accepts
% every valid path; only a positive control (emit a path and referee it) can.
% The unit is a VISIT, not a move. A visit to c touches axis A if it ENTERS along A or LEAVES along
% A; at most one visit per cell may touch each axis. A straight-through pass enters and leaves on
% the same axis, so it is two A-moves but only ONE A-touching visit — legal, and exactly the case
% move-rules.ts exempts by skipping the origin check when `axis === entryAxis`. Two visits both
% touching A is what it rejects, as `invalid-edge-reuse-target` / `invalid-edge-reuse-origin`.
%
% Getting this wrong in either direction is silent, and both directions were hit here:
%   * entries only (what scripts/stress/cpsat-reference-probe.py encodes) is too WEAK — it admits an
%     immediate bounce back down the same edge, (5,2)->(6,2)->(5,2), which the referee rejects.
%     Caught only by refereeing an emitted path; a witness check cannot see an under-constraint.
%   * "at most one A-move touching c" is too STRONG — it forbids the ordinary straight-through pass
%     and made every level's own witness come back UNSAT on all three backends.
% Consequence worth noting: a cell visited twice must be crossed once horizontally and once
% vertically, which is precisely the must-cross "two opposite sides" semantics.
predicate touchesAxis(int: t, var bool: isH) =
    ( if t > 1 then (horiz[t-1] = isH) else false endif )
    \/ ( if t < N then (horiz[t] = isH) else false endif );

constraint forall(c in CELL)(
    sum(t in TIME)( bool2int(visit[t, c] /\ touchesAxis(t, true)) ) <= 1
);
constraint forall(c in CELL)(
    sum(t in TIME)( bool2int(visit[t, c] /\ touchesAxis(t, false)) ) <= 1
);

% A turn happens AT node t, between move t-1 and move t — so only interior nodes can carry one.
predicate turnMatches(int: t, int: want) =
    if want = 1 then crossSign[dir[t-1], dir[t]] > 0
    elseif want = 2 then crossSign[dir[t-1], dir[t]] < 0
    else crossSign[dir[t-1], dir[t]] != 0 endif;

constraint forall(i in 1..nMustTurn)(
    exists(t in 2..N-1)( pos[t] = mustTurnCell[i] /\ turnMatches(t, mustTurnWant[i]) )
);

constraint forall(i in 1..nAdjTurn)(
    exists(t in 2..N-1)( adjTurnMember[i, pos[t]] /\ turnMatches(t, adjTurnWant[i]) )
);

constraint checkWitness -> forall(t in TIME)( pos[t] = witnessPos[t] );

% Search over positions in time order: this is a path, so the natural sequential commitment is
% also the one that lets the propagators prune earliest. Backends that ignore the annotation
% (CP-SAT rewrites its own search) are unaffected — the model is identical either way, which is
% the whole point of running one model across three engines.
solve :: int_search(pos, input_order, indomain_min, complete) satisfy;

output [ "PATH " ++ show([ fix(pos[t]) | t in TIME ]) ];
