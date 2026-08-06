# Winning-path archaeology: does the heuristic like the correct move? (2026-08-06)

`docs/solver-next-frontier-multilingual-research-update-2026-08-02.md`'s section 16 revised
experimental ranking lists three "Tier 1: establish the evidence engine" items ahead of everything
else. Two were already done before this measurement: the completion-feasibility atlas
(`docs/solver-shadow-eval-harness.md`'s Parts 1/5, 5,518 branches) and the residual separator
census (that doc's Part 3). This is the third: **winning-path archaeology**, and the explicit
prerequisite Tier 2 item 7 (a depth-reservoir beam / Rectangle Search wrapper) names as its own
gating condition — "proceed only if winning-path archaeology confirms beam extinction or
topology-class collapse."

## Method

`scripts/stress/winning-path-archaeology.mjs` replays a level's stored winning path step by step
through the real production primitives (`getNeighbors`/`scoreMove`/`applyMove`/`undoMove`,
`POLICY_PROFILES.default` — the exact functions `dfsFromGate`/`beamSearchFromGate` themselves call),
recording at each step the known-correct move's rank (1-indexed, sorted by score descending —
matching production's own `pool.sort((a, b) => b.score - a.score)`) among every legal candidate
`getNeighbors` returns, and the score gap to whichever candidate scored highest. Each sampled level
is also cold-solved via the real `Solver.solve()` entrypoint at a modest, fixed exploratory budget
(15s / 5,000,000 nodes — **not** the corpus's authoritative solved-count budget, see
`data/stress/README.md` for that) purely to bucket results into solved/unsolved for comparison.

**Deliberately narrower than section 9.1's full spec** — see the tool's own file doc for the
reasoning: this measures the heuristic's **local child rank** (among one parent's own candidate
moves), not the GLOBAL beam-frontier survival section 9.1 also asks for ("beam admission," "first
extinction depth" in a real width-limited multi-restart beam). Faithfully replaying global frontier
crowding would mean instrumenting `beamSearchFromGate`'s actual hot-path internals rather than
calling its exported primitives from outside, a materially bigger and riskier undertaking. Local
rank is a real, useful, but incomplete proxy: a low local rank can't survive a beam of any
reasonable width, but a high local rank does NOT guarantee survival if enough *other* parents'
children crowd the same global frontier — a phenomenon this measurement cannot see.

## Results

40 levels sampled (seed 1) from corpus-2's 927 eligible levels (stored hint with path length ≥ 4):

| bucket | levels | mean rank-1 fraction | mean of per-level mean rank |
|---|---|---|---|
| cold-solved (15s/5M nodes) | 22 | 72.3% | 1.33 |
| cold-unsolved (same budget) | 18 | 69.5% | 1.37 |

Full per-level detail: `logs/winning-path-archaeology/corpus2-sample.json`.

## Interpretation

**The heuristic already likes the correct move, in both buckets.** Averaged across ~100 steps per
level, the scorer ranks the true winning move 1st among all legal candidates roughly 70% of the
time, and its mean rank sits between 1.3 and 1.4 (i.e., typically 1st or 2nd) — in **both**
cold-solved and cold-unsolved levels. The gap between buckets (72.3% vs. 69.5%, a ~2.8-point
difference on a 40-level sample) is small and not the kind of gap that should be read as a strong
signal without a larger sample — but the two numbers being this close, both this high, is itself
the finding: whatever separates a level the solver quickly solves from one it doesn't is **not**
mainly "the heuristic ranks the correct move terribly on hard levels." Category 1 of section 9.1's
failure taxonomy ("early ordering failure") does not look like a dominant driver on this sample.

**What this means for Tier 2 item 7 (Rectangle Search / depth-reservoir beam).** Section 9.4's own
kill criteria include "deprioritize depth revisitation if winning moves are usually ranked
catastrophically low from the beginning" — that criterion clearly does not fire here (mean rank
~1.3-1.4 is the opposite of catastrophic). So this measurement does not kill Rectangle Search. But
it also does not confirm it: Rectangle Search's premise is about the beam **discarding** an
already-locally-well-ranked move because too many *other* parents' children crowd the same global
frontier at that phase — a fundamentally different phenomenon from local rank, and one this
measurement's scope explicitly does not reach (see Method). **Honest verdict: inconclusive, leaning
away from urgency.** If local heuristic quality were the bottleneck, this data would show it
clearly (it doesn't); the case for building Rectangle Search now would need to come from actual
beam-frontier telemetry (real width-crossing / extinction-depth tracking inside
`beamSearchFromGate`), not from this proxy — which is a bigger, separate build, not a natural
next step to slot in casually.

## Recommendation

Do not proceed to Tier 2 item 7 on the strength of this measurement alone. If beam extinction is
still suspected as a real phenomenon, the honest next step is instrumenting the actual beam
frontier (global rank/survival, not local child rank) — a distinct, larger task from this one, not
a natural continuation of it. This measurement's real contribution is closing out Tier 1 (all three
"evidence engine" items are now done) and providing a modest, real data point against "the scorer
just doesn't like the right moves" as an explanation for corpus-2's unsolved levels — the harder
levels' difficulty more plausibly lives in structural/connectivity/budget territory than in
move-ordering quality, consistent with this session's other findings (e.g. the Tier 2 probes'
own small catch rates against the existing pruning gauntlet).
