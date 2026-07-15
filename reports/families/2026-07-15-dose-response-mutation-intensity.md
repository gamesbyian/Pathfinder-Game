# Experiment 5: does solver disruption scale with how much of the level changed?

Fifth and final experiment in the batch. Experiments 2–4 each tested one generation mode against
symmetry (Experiment 1) for the same parents. This experiment asks a different question directly:
**is there a dose-response relationship between how much of a level's object layout changes and
how much the repair probe's success/failure is disrupted?** The natural dose ladder, from
`docs/sibling-cousin-system.md`'s own mode vocabulary: local-mutant (one object moved) <
group-reshuffle (every instance of one mechanic type re-placed) < constrained-shuffle (every
movable object re-placed), all holding the witness and grid fixed — with symmetry (whole-level
coordinate transform) included as a reference point that is *not* part of this dose ladder (it
changes zero objects' relative structure, only the coordinate frame itself).

## Setup

Two parents already fully characterized under symmetry, local-mutant, and swap in Experiments
1–3: P00146 and R00631, both showed genuine fail/succeed flips under every mode tested so far.
Added `--mode=group-reshuffle` (reshuffling P00146's 9 blocks, R00631's 8 flipping filters — each
parent's most numerous mechanic type) and `--mode=constrained-shuffle` (reshuffling every movable
type at once), `--count=7` each, fixed seed. Parent solves reused from Experiment 1. Solved via
`--scheduler-mode=legacy --budget-ms=60000` — the same realistic, batch-testing-scale budget used
throughout every experiment this session.

**Methodology correction, made during this experiment and applied retroactively in spirit to
Experiments 1–4's caveats**: `P00146-constrainedshuffle` produced 2 siblings (`cs-02`, `cs-05`)
that did not finish within the 60 s budget (both still running past 400M nodes at the ~422 s mark,
the same repair-fallback extra-budget-multiplier behavior seen throughout this session). The
initial instinct — carried over from Experiment 1's handling of R02248 and R03015 — was to retry
at a much larger budget (900 s) to "get a real number." **That instinct was wrong and was
corrected mid-run**: no real deployment of this solver — not gameplay, not hint discovery, not a
CI batch, not a developer debugging one level by hand — would ever wait 400+ seconds for one
level, so a number obtained only by waiting that long describes mathematical solvability, not the
solver's real-world behavior, which is what this whole experiment batch is actually about. The
900 s retry was killed partway through (after ~26 minutes of CPU time, with `cs-02` having
returned a solve and `cs-05` still running) specifically so its partial, inconsistent-with-policy
result would not leak into the reported data. **Both `cs-02` and `cs-05` are reported here as "did
not solve within the tested realistic budget" — full stop — which is itself the finding, not a
placeholder for a better number.** Experiment 1's R02248/R03015 retries, in hindsight, should have
applied the same reasoning; see that report's own caveats for a cross-reference note.

## Results: fail-rate per parent across the dose ladder

| Mode | P00146 fail/7 | R00631 fail/7 |
|---|---|---|
| local-mutant (dose: 1 object) | 6 | 7 |
| group-reshuffle (dose: all-of-one-type) | 7 | 5 (+2 succeed, but at 31–41M nodes each — extremely expensive even when winning) |
| constrained-shuffle (dose: all movable types) | 3 solved-fail + **2 did not solve at all** + 2 solved-succeed | 6 |
| symmetry (whole-level transform, reference point) | 3 | 3 |

**No monotonic dose-response relationship.** If "more of the level changes" reliably meant "more
likely to break repair," fail-rate should climb steadily down the ladder (local-mutant →
group-reshuffle → constrained-shuffle) and symmetry — which changes every object's coordinates at
once — should be at least as disruptive as constrained-shuffle. **The opposite is true for both
parents**: symmetry has the *lowest* fail-rate of every mode tested (3/7 for both P00146 and
R00631), while every "in-place" perturbation mode — whether it moves 1 object, all of one type, or
all objects — clusters at a similarly high fail-rate (5–7 of 7, plus constrained-shuffle's 2
outright non-solves for P00146, a severity tier beyond simple failure).

## Interpretation

The consistent pattern across both parents suggests a real, if still provisional, mechanistic
story: **repair's search heuristic appears more sensitive to *any* in-place relocation of objects
within a fixed coordinate frame than to a full rotation/reflection of the entire frame at once.**
A rotation changes every coordinate simultaneously but preserves every object's position *relative
to every other object and to the witness path* exactly — nothing about their mutual geometry
changes, only the absolute frame. An in-place mutation — whether one object or all of them — can
disturb that relative geometry even when only one piece moves, and doing so seems to matter more
to repair's search order than reframing everything at once does. This directly extends
Experiment 3's own finding (local-mutant and swap track each other, not symmetry) to a third and
fourth mode (group-reshuffle, constrained-shuffle): the dividing line isn't "how much changed," it
is "did the objects' relative geometry change, or only the frame."

**Constrained-shuffle's 2 non-solves for P00146** are also worth flagging on their own: this is
the *most* disruptive single result in the entire dose ladder — worse than a config flip, an
outright failure to solve within any realistic budget — and it happened at the *highest*-dose
in-place mode, consistent with "more in-place disruption can get strictly worse," even while the
overall dose-vs-symmetry comparison above shows no such monotonic trend across modes as a whole.
Both observations can be true together: within the in-place family of modes, higher dose trending
toward worse outcomes is plausible from this data; the *comparison to symmetry* is where the
"more change = more disruption" intuition breaks down entirely.

## Caveats

- **n=2 parents, one mechanic-type choice each for group-reshuffle** (blocks for P00146,
  flippingFilters for R00631 — each parent's most numerous type, not chosen for any other
  property). A different type choice, or more parents, could show a different picture; this is a
  first look, not a settled dose-response curve.
- **The corrected retry policy is the more important takeaway of this experiment than the
  dose-response finding itself**: a research system whose purpose is to inform production solver
  behavior should treat "does it solve within the budget batch-testing actually uses" as the
  outcome of interest, and should not retry indefinitely to manufacture a "did it eventually solve"
  data point nobody would wait for in practice. Applied here (2 non-solves reported as final);
  should be applied to any future extension of Experiment 1 as well.
- Group-reshuffle's 2 P00146-adjacent repair successes for R00631 (`gr-02`, `gr-04`) succeed at
  31–41M nodes — 15–20× the parent's own cost even while winning — the same "succeeds but far more
  expensively" pattern seen repeatedly in Experiments 1–3 (R03015, R02976, F00146-lm-04's cousins).
  Cost-within-success continues to vary far more than the binary fail/succeed signal alone would
  suggest.
- `nodesExpanded` is the primary signal per CLAUDE.md's guidance.
- Data collection only; no solver changes proposed. Scoped to `legacy` scheduler mode, commit
  `2ced965` (pre-rebase; branch was rebased onto an updated `main` after this experiment's data was
  collected — see the session's rebase note).
