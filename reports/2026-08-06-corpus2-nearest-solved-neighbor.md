# Corpus-2 feature analysis, refreshed, plus nearest-solved-neighbor (2026-08-06)

Two things in one report: (1) a re-run of the existing corpus-wide discriminative analysis
(`reports/stress/corpus2-failure-categorization-2026-07-29.md`) against today's fresh baseline, and
(2) a new per-level nearest-solved-neighbor tool that complements it. Both read-only, no solving.

**This is a refresh + extension, not a new investigation from scratch** — the aggregate
feature-vs-solvability analysis this session was asked to do already existed in depth from
2026-07-29, using `scripts/stress/feature-solvability-analysis.mjs`. The gap that tool doesn't
cover — "for an unsolved level, what's the most similar level that DOES solve, and what actually
differs" — is what's new here (`scripts/stress/nearest-solved-neighbor.mjs`).

## Part 1: refreshed aggregate discriminative analysis

Re-run against `logs/stress-corpus2-baseline.json` (compiled 2026-08-06T05:30, the same dispatch
that brought corpus-2 from 605/1700 to **684/1700** via the offline-budget-decoupling fix earlier
this session — see `docs/solver-aware-game-architecture.md`'s "Fixed" sections). The July 29 report
used the 605/1700 baseline; this is the same method against 79 more solves. Full output:
`reports/stress/corpus2-feature-solvability-2026-08-06.json`.

```
FEATURE SEPARATION (Cohen's d; positive = higher in the UNSOLVED population)
  turnLoad      d=0.732   (was 0.750 on the old baseline — essentially unchanged)
  mustTurn      d=0.595
  portalPairs   d=0.584
  navDensity    d=0.506   (was 0.574 — softened somewhat)
  blocks        d=0.408
  surround      d=0.400
  reqLen        d=0.315
  adjTurn       d=0.299
  mustCross     d=0.189   (was 0.540 — the largest shift of any feature, see below)
  geese         d=0.168
  area          d=0.144
  flippers      d=0.133
  mustPass      d=0.039   (was -0.031 — still near-null, confirms the July 29 refutation)
  reqInt        d=-0.015  (was -0.045 — still near-null, confirms the July 29 refutation)
```

**Turn-constraint load is still the dominant discriminator**, with a clean monotone dose-response
unchanged in shape from July 29 (73.0% → 62.7% → 45.5% → 33.8% → 22.6% solved across five load
bins). The two previously-refuted signals (mustPass, reqInt) stay refuted at the new baseline —
this isn't a fluke of the old data.

**Two things shifted meaningfully, and both are informative:**

1. **`mustCross`'s effect nearly disappeared** (d: 0.540 → 0.189; navDensity-controlled effect of
   `mustCross >= 4`: was -31/-26/-18/-12 pp, is now only **-11.2/-8.4/-2.3/-3.4 pp**). The +79 solves
   this session's budget-decoupling fix produced came from raising the routine refresh's node/time
   ceiling — pure configuration, no algorithm change (see the "Fixed" section on offline solve-budget
   decoupling). That a **budget** change alone erased most of must-cross's apparent difficulty signal
   is itself evidence for the July 29 report's Finding 1: must-cross-heavy levels were structurally
   *starved* of the ladder attempts built for them (734/736 routed away from must-cross-specific
   rules by the archetype classifier), and more raw budget lets the catch-all ladder eventually work
   through some of them anyway. Must-cross's difficulty looks substantially **budget-bound**, not
   algorithm-bound.
2. **`portalPairs` newly stands out** (d=0.584, third-highest of any feature) with a
   navDensity-controlled effect (-32.4/-34.0/-34.1/-20.6 pp for `portalPairs >= 4`) comparable in
   magnitude to `mustTurn`'s. The July 29 report's only portal-related note was a *correction* of an
   earlier hand-labeled draft's 2x counting error — it never ranked portals against the other
   features corpus-wide the way this refresh does. **Unlike must-cross, portal difficulty did NOT
   shrink with the budget increase** — its controlled effect is essentially the same order of
   magnitude as turn load's, and turn load itself barely moved (0.750 → 0.732). This is a real,
   previously under-emphasized signal: portal-heavy levels look **algorithm-bound**, the same
   category as turn load, not budget-bound like must-cross.

## Part 2: nearest-solved-neighbor (new)

`scripts/stress/nearest-solved-neighbor.mjs`: for a level, z-scores the same 13 features
(reqLen/reqInt/navDensity/mustPass/mustCross/portalPairs/flippers/staticFilters/geese/falseGoals/
surround/mustTurn/adjTurn) against the full corpus's own mean/stddev, then finds the nearest SOLVED
levels by plain Euclidean distance. Run against the 8 lowest-best-badness unsolved levels (the
"near miss" population the July 29 report's Finding 4 calls the natural rescue target). Full output:
not persisted as a committed artifact (regenerate via the command below — it's cheap, seconds).

```
node scripts/stress/nearest-solved-neighbor.mjs \
    --baseline=logs/stress-corpus2-baseline.json \
    --corpus=data/stress/stress-levels-random.json --count=8 --k=3
```

### Two concrete findings worth reading in full

**A near-static-twin that still doesn't solve.** `R02751` (unsolved, best badness 15) and the
solved `R02669` differ by only `reqLen +13, mustPass -2, reqInt -1, mustTurn -1` — a Euclidean
distance of **1.001** in standardized space, the closest pair found in the whole sample, and by a
wide margin (the next-closest pair anywhere in the sample is 1.562). Two levels this close on every
measured static feature, one solving cleanly and the other stuck at badness 15 (not a near-solve in
search terms — see the July 29 report's own badness caveat), is direct evidence that **these 13
scalar features run out before individual-level difficulty does**. Whatever actually separates
R02751 from R02669 is something these counts don't capture — plausibly board geometry/layout
(the exact positions of obligations relative to each other and the goal, not just how many exist).

**A near-miss with zero turn load.** `R02271` (unsolved, badness 14) has `mustTurn=0, adjTurn=0,
surround=0` — zero turn-constraint load, the single strongest aggregate discriminator — yet still
fails. It carries `portalPairs=6, flippers=8, reqLen=137` instead. Its nearest solved neighbors
differ almost entirely by `reqLen`/`navDensity`, not by mechanic counts. This is a useful
counter-example to reading turn load as a universal explanation: for the portal/flipper-heavy
subpopulation specifically, the story looks like it's about something else (plausibly the newly
-surfaced portal effect from Part 1, or sheer length/density) — consistent with turn load being the
strongest AGGREGATE signal without being the ONLY mechanism, exactly the caveat Part 1's own
"association, not causation" limitation already carries.

The other 6 targets in the sample show a consistent middle pattern: nearest solved neighbors exist
with *comparable or even higher* mechanic counts (e.g. `R02519`, solved, has `mustTurn=8` vs its
unsolved neighbor `R02717`'s `mustTurn=5`) — reinforcing that raw counts alone don't cleanly
separate individual solved/unsolved pairs even where they cleanly separate the aggregate population.

## Interpretation and recommendation

This does not contradict Part 1 or the July 29 report — turn load and (now) portal load remain the
right things to point a differential diagnosis at, in aggregate. What the nearest-neighbor pass adds
is the concrete individual-level version of Part I item 6's own warning
(`solver-next-frontier-2026-08-02.md`): "two levels with very different board geometry may share the
same solver failure mechanism; two visually similar siblings may produce entirely different solver
behaviour." The R02751/R02669 pair is exactly that phenomenon, found on real data rather than
asserted from first principles.

**Recommended next step, in the same spirit as that item**: pick the R02751/R02669 pair (or a
handful like it — near-static-twins split across solved/unsolved) and run them through
`docs/sibling-cousin-system.md`'s fragile/robust family split, or a solver-response-vector
comparison (winner technique, nodes-by-attempt, best-badness trajectory) rather than more static
feature slicing — the static features have told us what they can; the next signal is in how the
solver's own search behaves differently on two levels that look nearly identical on paper. This
matches the July 29 report's own recommended-next-steps item 4 ("run the family fragile/robust
split on a turn-load-stratified sample") — the same tool, now with two concrete, well-matched real
pairs to point it at instead of a synthetic stratification.

Separately, **portal difficulty deserves the same rigor turn load already got**: a dose-response
table and navDensity-controlled breakdown analogous to the July 29 report's Finding 2, since this
refresh's numbers suggest it's a comparably-sized, comparably algorithm-bound (not budget-bound)
effect that hasn't had a dedicated investigation yet.

## Limitations

Same as Part 1's source report: association not causation, features are correlated, corpus-2 is
uniform-random-generated (not a player-relevant population). The nearest-neighbor distance metric is
a plain unweighted Euclidean z-score distance — a simple, interpretable first cut, not validated
against any ground truth for "true" level similarity; a smarter metric (weighted by each feature's
own discriminative d, or restricted to features with real effect sizes) might change which neighbors
surface. The 8-level sample is small and hand-picked by badness, not random — it is illustrative,
not a corpus-wide claim.
