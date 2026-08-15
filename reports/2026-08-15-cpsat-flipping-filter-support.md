# CP-SAT flipping-filter support: correction, encoding, a pre-existing bug fix, and validation

> **Status:** complete. Encoding built and validated (102/102 flipping-filter-bearing witness-checks
> pass, 0 INFEASIBLE, plus 2 independent cold-solve+referee validations); a documentation
> correction; a real, independent pre-existing bug found, root-caused, and fixed — all 5
> originally-failing levels now resolve `OPTIMAL`, and a further 83-level flipper-free portal batch
> (all of Corpus 1's eligible population + a 60-level Corpus-2 sample) confirms it on its own
> merits: 83/83 feasible, 0 INFEASIBLE.
> **Scope:** `scripts/stress/cpsat-full-probe.py` only. No solver (`modules/solver/*`) code touched.
> **Motivation:** docs/future-work.md's CP-SAT-coverage bottleneck (item 2: "Coverage is
> bottlenecked by flipping-filter support in the CP-SAT model") and a correction to
> `reports/2026-08-12-repair-retreat-cpsat.md`'s "mustCross >= 2" framing.
> **Bonus finding:** validating the new flipping-filter support surfaced a real, pre-existing,
> unrelated encoding bug in the portal-support padding logic (any portal-bearing level whose
> witness doesn't use every declared portal pair was silently mis-modelled as `INFEASIBLE`) — found,
> root-caused, and fixed. See Part 3.

## Part 1: the mustCross claim was a misattribution

`reports/2026-08-12-repair-retreat-cpsat.md`'s "Broadened sample" section reported two abstentions
(`R00630`, `R02449`) on `unsupported-mechanics`, framed as *"a real coverage gap distinct from the
previously-known flipping-filter one"* — implying `cpsat-full-probe.py` couldn't handle
`mustCross >= 2`.

Reading the actual code disproves this immediately: the model's must-cross constraint
(`m.Add(visits[c] == 2)` for every must-cross cell) has never been conditioned on count, and the
file's *sole* skip condition was (and mechanically could only ever be) `filters`/`flippingFilters`.
Checking the two flagged levels' own data confirms it directly: both `R00630` and `R02449` carry
`flippingFilters: 5`, not zero. Empirically:

```
$ python3 scripts/stress/cpsat-full-probe.py R00630 5 --check-witness
R00630: SKIPPED (filters/flipping filters not encoded yet)
$ python3 scripts/stress/cpsat-full-probe.py R02449 5 --check-witness
R02449: SKIPPED (filters/flipping filters not encoded yet)
```

And mustCross of real size resolves cleanly, cold, no witness pinned:

```
$ python3 scripts/stress/cpsat-full-probe.py R00108 60   # mustCross=7
R00108: 12x12 reqLen=101 reqInt=7 mustCross=7 landmarks=17 portalPairs=0 -> OPTIMAL in 54.5s
$ python3 scripts/stress/cpsat-full-probe.py R00239 60   # mustCross=8 (the corpus max)
R00239: 14x14 reqLen=106 reqInt=10 mustCross=8 landmarks=13 portalPairs=0 -> OPTIMAL in 60.1s
```

`R00001` — mustCross=6 — was itself one of the three levels the *same* report's first pass already
resolved cleanly (`OPTIMAL`/`INFEASIBLE`), which was available evidence the whole time. Corrected
both source reports (`2026-08-12-repair-retreat-cpsat.md`, `2026-08-12-b2-extinction-adjacent-cpsat-labels.md`)
in place, per this repo's standing rule of appending a correction rather than silently rewriting the
original text.

## Part 2: flipping filters, encoded

Given mustCross was never the real gap, the actual, sole remaining unencoded mechanic is filters —
and 0 levels in either stress corpus use *static* filters (`data/stress/README.md`: "No static
filters. Only flipping filters are used, by design"), while **957/1700 (56%) of corpus-2 and 42/102
(41%) of corpus-1** carry flipping filters. This is a far larger population than mustCross count
ever was, and worth encoding on its own merits.

### Semantics (from `search-state.ts`'s `isMoveDynamicallyValid`, not from CLAUDE.md's summary)

- **Single-use**: capped at 1 visit, same as a portal terminal (`state.flipperUsedMask` rejects a
  second entry outright).
- **No turn on its one crossing**: entry axis must equal exit axis, unconditionally (independent of
  orientation state) — `level.flippingFilterMap.has(from) && entryAxis !== moveAxis => reject`.
- **Required entry axis is a GLOBAL, order-dependent property**: on its one crossing, the required
  axis is the filter's declared axis if `popcount(flipperUsedMask)` (how many *other* flippers have
  already been used, board-wide, at that point) is even, and the flipped axis if odd. This is not a
  per-cell counter — it depends on the crossing order of every flipper on the board.

### Encoding

For each flipper `i` (cell `c_i`, declared axis `ax_i`):

- `entry_time_i = Σ t·x[t][c_i]` (a linear expression, valid because visits are capped at 1 — at
  most one term is nonzero).
- For every other flipper `j`: `before_ij ⟺ crossed_i ∧ crossed_j ∧ entry_time_j < entry_time_i`,
  built via the same AND/OR reification pattern already used throughout the file. No permutation or
  ordering variable is needed — summing `before_ij` over `j` gives flipper `i`'s rank directly from
  variables the model already has.
- `rank_i = Σ before_ij`; `parity_i` (rank odd) via `rank_i == 2·half_i + parity_i`.
- Required axis: `horiz[t-1] == (declared-axis-is-H XOR parity_i)` at the (unique) crossing timestep.
- No-turn: `horiz[t-1] == horiz[t]` at the crossing timestep (always well-defined — a flipper can
  never be the goal, so the crossing timestep is provably never the final one).
- A flipper's entry is always a normal directional move, never portal-forced: the only
  portal-forced branch in `getNeighbors` short-circuits before any dynamic-validity check runs, and
  a portal destination can never itself be a flipper cell (one-object-per-cell). So the existing
  `horiz[]`/`is_normal[]` machinery from portal support already covers this without new move-typing.

~`O(F²)` extra boolean variables per level (`F` = flipper count, capped at 8 in either stress
corpus — at most 56 ordered pairs), cheap relative to the existing `O(N)` timestep encoding.

## Part 3: validation, and a real pre-existing bug found along the way

Same protocol the file's own PORTAL SUPPORT section established: `--check-witness` across the real
population first (an `INFEASIBLE` result there is decisive proof of over-constraint), then genuinely
cold (no witness pinned) solves with their emitted paths independently fed to the real referee
(`Solver.validateCandidatePath`) — the check an under-constrained model *cannot* fool, unlike
`--check-witness` alone.

**No regression from the flipper edits themselves**: `R00001` (mustCross=6) and `R00108` (corpus-2,
mustCross=7, both flipper-free, both portal-free) resolve `OPTIMAL` post-change, confirming the
`visits[]`-cap and skip-condition edits didn't disturb existing behavior.

**First witness-check batch (every flipping-filter-bearing, no-static-filter level with a stored
witness across both stress corpora, up to 60 per corpus, 15s cap each): 102 tested — 99 feasible, 0
unknown, 3 INFEASIBLE.** All three failures (`S00028`, `S00030`, `S00035`, all corpus-1) had exactly
1 flipper each — but disabling the new flipper logic entirely (`--no-flippers`) did **not** fix them,
immediately ruling out the new encoding as the cause.

### The real bug: a pre-existing, portal-related padding defect, unrelated to flipping filters

Bisection (disabling each candidate constraint block against the known-good witness) traced it to
the edge-axis-reuse loop, and further bisection on flipper-*free* portal-bearing levels
(`S00103`, `S00108`) reproduced the exact same failure — proving it predates this session's flipper
work entirely and was simply never exercised, because every level that could have triggered it
either had no portals (impossible without them) or happened to be skipped for carrying a flipper.

**Mechanism**: a portal-bearing level whose witness does not use every declared portal pair leaves
one or more genuine padding slots after the real path ends (the padded horizon is sized for the
*maximum* possible jumps, `N = reqLen + 1 + portalPairs`, but a real solution may use fewer). During
a padding transition (both endpoints already `goal`), `horiz[t]` — the boolean the edge-axis-reuse
loop reads to mean "this move was horizontal" — is *forced* to `0`, not because that move is
vertical, but because there is no real move at all (`is_normal[t+1]==0` forces every direction
variable to `0`). The original code read that `0` as "this move touched the V axis" unconditionally,
so it double-counted a V-axis touch on the `goal` cell — once for the real arrival, once more for
*every* padding slot — tripping the model's own `sum(touches) <= 1` rule on a perfectly legal
witness, independent of what the real entry move's axis even was. Confirmed by hand-computation on
`S00108`'s witness (entry into goal is horizontal; the model nonetheless registered two V-axis
touches, exactly one real + one padding-spurious) and by a `--prefix=` binary search pinpointing the
exact transition where feasibility flipped.

Only the `goal` cell can ever be affected: no other cell can be the path's terminal node (only goal
absorbs), so for `c != goal`, `x[t][c]==1` always implies both adjacent transitions are genuinely
real — the original, cheaper form is correct there and was left unchanged.

**Fix**: for `c == goal` only, gate each entry/exit touch literal on `real_here(t)` (a literal the
file already defines and uses elsewhere for exactly this "is this transition real, or padding"
distinction), via the same AND/OR reification pattern used throughout the file. All other cells keep
the original, unconditional (and now provably correct) logic.

**Re-validation after the fix**: all 5 previously-failing levels (`S00028`, `S00030`, `S00035`,
`S00103`, `S00108`) now resolve `OPTIMAL`. Full re-run of the same witness-check batches:

- Flipping-filter-bearing batch (102 levels, same population as above): **102 tested — 102 feasible,
  0 unknown, 0 INFEASIBLE.**
- Direct re-test of all 5 originally-failing levels — the two that are flipper-*free*
  (`S00103`, `S00108`) confirm the fix on its own merits, independent of any flipper logic:
  **`S00028`, `S00030`, `S00035`, `S00103`, `S00108` all now resolve `OPTIMAL`** (previously
  `INFEASIBLE`, all five).
- Broader portal-bearing, flipper/filter-free batch (independent of this session's flipper work,
  validating the fix purely on its own merits): **83 tested — 83 feasible, 0 unknown, 0 INFEASIBLE.**
  All 23 of Corpus 1's flipper-free portal-bearing levels with a stored witness (the entire
  population, not a sample — this is where the bug actually lived, since Corpus 2's portal levels
  are all pair-count 4-7) plus a 60-level sample of Corpus 2's 415. Includes `S00103`/`S00108`, the
  two levels that first exposed the bug flipper-free.

**Independent cold-solve + referee validation** (the decisive under-constraint check, re-run after
the fix to confirm it didn't introduce a new one): two levels, chosen for real flipper diversity (not
trivial 1-flipper edge cases) and mixed declared axes:

| level | flippers | axes | portals | mustCross | cold solve | emitted path vs. stored witness | referee |
|---|---:|---|---:|---:|---|---|---|
| `R02211` | 7 | mixed (5×V, 2×H) | 0 | 0 | OPTIMAL, 13.9s | **different** (diverges at step 2: `[6,4]→[5,4]` vs. witness's `[6,4]→[7,4]`) | **`ok: true`** |
| `R03243` | 8 | — | 0 | 0 | OPTIMAL, 15.5s | different | **`ok: true`** |

Both are genuinely independent discoveries (CP-SAT was never shown the stored witness), and the real
game referee — the actual arbiter of correctness, per this file's own header discipline — accepted
both. This is the strongest available evidence short of a formal proof: an under-constrained model
could produce a witness-passing result by luck, but it is far less likely to produce a *different*,
independently-constructed path that also happens to satisfy every real rule by luck, twice, across
different flipper counts and axis mixes. (Neither of these two levels has portals, so this pair
specifically validates the flipper logic; the padding-bug fix is validated separately by the batches
above and the direct `S00028`/`S00030`/`S00035`/`S00103`/`S00108` re-tests.)

## Part 4: this does not overturn the earlier "still no on flipping filters" verdict — it answers a different question

`docs/solver-shadow-eval-harness.md`'s Part 6 (2026-08-05) explicitly recommended *against* building
flipping-filter support, for a specific, evidence-backed reason: `prune-gap-probe.mjs`'s workload —
sampling *many* branches per level (`--every=6`) against a *short* per-branch time budget
(`oracle-limit=45`) to find gauntlet gaps — was already showing a rising "oracle unknown" (timeout)
rate as mechanic complexity grew (portal levels: up to 16 unknowns against 26 classified on one
level alone), and flippers, being harder on every axis at once, were predicted to push that further
in the wrong direction. That verdict is not contradicted by anything here.

**The distinction is the consumer.** Part 6's cost analysis is about *exhaustive branch-sampling at
a short per-call budget* — many cheap calls. This work's validation is about *targeted, single-point
full-solve or explicit-prefix feasibility checks at a normal budget* (15-60s) — few, higher-value
calls — which is exactly `cpsat-explicit-prefix-oracle.yml`'s own use case (the repair-retreat
binary search, the B2 extinction-adjacent labeling) and was never measured by Part 6 at all. The two
cold, unpinned full-level solves above (15-17s each, well within a normal budget) directly
contradict the *pessimistic extrapolation* for this specific consumer, though they say nothing about
whether `prune-gap-probe.mjs`'s own many-branch-per-level workload would fare any better — that
remains untested and the Part 6 concern likely still applies there. **Do not use this report to
re-open Part 6's `prune-gap-probe`/`interface-probe-harness` cost verdict without new measurement
specific to that workload.** This report only unblocks the targeted-labeling consumers that were
explicitly asking for it (`docs/future-work.md` item 2, the repair-retreat report).

## What this unblocks

- `docs/future-work.md` item 2's 9 previously-abstained B/D-class extinction-adjacent rows
  (`reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md`) are re-runnable through
  `cpsat-explicit-prefix-oracle.yml` — not done here, next step for whoever picks up B/D-class exact
  labeling.
- `R00630`/`R02449`'s original repair-retreat binary search (`reports/2026-08-12-repair-retreat-cpsat.md`)
  is re-runnable — not done here.
- Any future CP-SAT-anchored version of `scripts/stress/repair-plateau-rollout-classifier.mjs`
  (see `reports/2026-08-15-repair-plateau-rollout-proxy-negative.md`'s "what's still worth keeping")
  can now use flipper-bearing levels, which it could not before.

## Scope discipline

`--no-flippers` and `--core-only` flags added, mirroring the file's existing `--no-mustcross`/
`--no-landmarks` isolation convention, for future debugging. Static (regular) filters remain
unencoded and skipped — deliberately, since 0 levels in either stress corpus use them; there is no
population to validate an encoding against. No change to `modules/solver/*`, `modules/domain/*`, or
any production code path.
