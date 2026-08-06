# Beam state-dedup: sound-signature duplicate ceiling and heuristic-key soundness audit (2026-08-06)

> **CORRECTION (same day, before Experiment C's conclusion was acted on further).** Experiment C
> below used a **2.5-second wall-clock budget** alongside a 300k-node cap. That wall-clock budget was
> almost certainly the actual binding constraint for both the dedup-on and dedup-off arms on a
> stress-corpus-2-weighted sample — exactly the "sequential/tight-budget A/B is untrustworthy under
> this sandbox's CPU variance" trap CLAUDE.md's own testing guidance warns about — making "zero
> divergence" an artifact of both arms failing equally fast, not a genuine null result. A corrected
> re-test with a clearly non-binding wall-clock budget (120s) and the same 300k-node cap, on a
> 75-level non-portal stress-corpus-2 sample, found **real, reproducible divergence: 19/75 levels**
> flip solved→unsolved when dedup is disabled (confirmed two independent ways — swapping the actual
> code via git, and toggling only the `STRATEGY_STATE_DEDUP` ablation flag on unmodified code, within
> one process; both gave the identical divergent-level set). **Disabling beam state-dedup costs real
> solves.** This does not contradict Experiments A/B (the true-duplicate rate is still tiny, and the
> shipped key is still formally unsound almost every time it merges) — it reframes what the
> mechanism's practical value actually is: not correctness-preserving duplicate elimination, but
> implicit diversity/width management (culling many candidates that converge on the same
> `(cell, mask)` combo to the single best-scoring one frees beam width for candidates elsewhere, even
> though the discarded ones are not truly identical to the survivor). Removing the mechanism entirely
> was the wrong response to Findings A/B; a narrower fix — keep the same merge granularity, make the
> key itself collision-free — was implemented instead. See "Experiment C (corrected)" and "The actual
> fix" below; both supersede this report's original "removed the mechanism" conclusion, which was
> committed, measured further, and retracted the same day.

Follow-up to an uploaded design note proposing "exact future-state equivalence" as the top-ranked
lever for finding more solves (canonical state identity → safe transposition/beam dedup). That
exact avenue was already measured for **DFS** and downgraded
(`reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md`: sound-signature duplicate
rate 0.5–16%, not the 92–99% a crude signature suggested — "checked and found weak"). This report
runs the same kind of measurement against **beam search** specifically, since beam holds many
candidates alive concurrently at one depth — a structurally different setting where duplicates
seemed more plausible — plus a second question the DFS report didn't ask: is the dedup mechanism
beam *already ships* (`STRATEGY_STATE_DEDUP`, `search.ts`'s `useStateDedup`) actually sound?

**Method, matching this repo's own established practice** (temporary instrumentation, measure,
revert — see the DFS report and `mitm-frontier-probe.mjs`'s history): added a `_SIG_AUDIT` debug
hook directly in `beamSearchFromGate` (env-gated, zero prod cost), computing for every candidate,
at the moment right after `applyMove` and before `undoMove` (so `ws`'s live typed arrays are
exactly that candidate's post-move state, no path replay needed): a **sound signature** — sorted
unique visited-cell keys + per-cell `edgeUsage`, `crossCounts`, `realLen`, `ints`, the existing
`sc` mask bundle, and `lastWasPortalJump`. (Portal-usage identity doesn't need a separate field:
portals are single-use, so a used terminal's key is already in the visited-cell set.) At the end of
each expansion step, before any culling, grouped the full candidate pool both by this sound
signature and by production's actual heuristic key (`key + sc * KEY_SPACE`), and logged the
cross-tabulation. Reverted immediately after measuring (`git checkout --`); no production code
changed.

**Sample**: 80 levels, evenly sampled — 20 published, 20 stress-corpus-1, 40 stress-corpus-2 — using
each level's real `getAttemptConfigs`-selected beam config (production routing, not a hand-picked
one), 2.5s / 300k-node budget per attempt. 62/80 levels actually exercised a beam attempt (the rest
routed to DFS-only configs and generated no beam candidates at all). 27 of the 62 had portals.

## Experiment A: the sound-signature duplicate ceiling is smaller than DFS's, not larger

| population | candidates generated | true sound-duplicate slots | rate |
|---|---:|---:|---:|
| all | 11,399,149 | 2,129 | **0.019%** |
| non-portal | 6,228,564 | 453 | 0.007% |
| portal | 5,170,585 | 1,676 | 0.032% |

Even a hypothetically perfect, zero-cost sound key would merge about **1 candidate in 5,000** in
beam's per-step frontier. This is an order of magnitude *below* the DFS report's already-downgraded
0.5–16% (median ~1–2%) trace-revisit rate, not above it — the "beam holds many candidates
concurrently, so duplicates should be more common" intuition doesn't hold up empirically. Portal
levels show a somewhat higher rate (0.032% vs 0.007%) but both are negligible in absolute terms.
This directly answers the uploaded document's "Ranked Research Programme #1" experiment for beam:
**the ceiling has been established, and it's not worth building anything on.**

## Experiment B: today's shipped dedup key is essentially always unsound when it fires

| | count |
|---|---:|
| heuristic-key groups with 2+ candidates | 1,647,849 |
| … of which contain a genuine sound-signature mismatch | 1,647,849 (**100.00%**) |
| candidate-slots touched by an unsound merge | 8,780,147 |
| levels with at least one unsound-merge event | 62/62 |

Every level that generated any multi-candidate heuristic-key group had at least one group where the
merged candidates are, by the sound signature, genuinely different future states. This is not
surprising given Experiment A: the (cell, `sc`-mask) key is coarse relative to the true state space
(which specific ~dozens of cells got visited, via which axis), so two *different* candidates landing
on the same cell with the same aggregate mask values are — per Experiment A's own number —
overwhelmingly likely to be non-identical underlying states, not a coincidental exact match. The two
findings are two sides of the same fact, not in tension: true duplicates are rare (A), so almost
every collision the coarse key catches is a false one (B). This gives `docs/future-work.md`'s terse
"State-dominance/transposition caching — correctness risk... unfavorable" line concrete,
beam-specific evidence it didn't have before (that line's likely evidentiary basis, the DFS report,
never actually measured a shipped, active dedup mechanism — only a proposed future one).

**Caveat on "unsoundCandidates":** this counts every member of a group as "affected" whenever *any*
mismatch exists in that group, not the number of specific non-matching pairs — a conservative
(over-counting) proxy, called out explicitly rather than presented as an exact pairwise count.

## Experiment C (ORIGINAL, RETRACTED): "the unsoundness has not cost a single solve on this sample"

| | dedup ON (production default) | dedup OFF (`STRATEGY_STATE_DEDUP: false`) |
|---|---:|---:|
| solved (of 35 non-portal levels with a real beam attempt) | 35 | 35 |

**Retracted — see the correction at the top of this report.** This used a 2.5s wall-clock budget
that was almost certainly the actual binding constraint for both arms, not the 300k-node cap,
making "zero divergence" uninformative rather than a genuine null result. Kept here, struck through
in spirit rather than deleted, per this repo's practice of keeping the reasoning trail visible.

## Experiment C (corrected): disabling dedup costs real solves

Same 300k-node cap, wall-clock budget raised to 120s (confirmed non-binding: every attempt in this
sample terminates on the node cap, never the clock) — sample: 40 levels from the 671-level
bit-overflow-affected population (see Experiment D below) + 40 general non-portal stress-corpus-2
levels (75 after dedup, portal exclusion, and de-duplication of the two pools' overlap), each run
through the real `getAttemptConfigs`-selected beam config via `runAttempt` directly (isolating the
beam attempt's own cost from the rest of the solve ladder).

| | dedup ON (production default) | dedup OFF (`STRATEGY_STATE_DEDUP: false`) |
|---|---:|---:|
| solved (of 75 non-portal levels) | 56 shared + 18 dedup-only | 56 shared + 1 dedup-off-only |

**19/75 (25%) diverge**, 18 of them solved-with-dedup / unsolved-without, 1 the reverse. Confirmed
two independent ways to rule out a code-editing artifact: (1) git-stashing the actual code between
runs, and (2) toggling only the `STRATEGY_STATE_DEDUP` ablation flag on entirely unmodified code
within a single process. Both produced the **identical** divergent-level set — this is a real,
reproducible property of the mechanism on this population, not noise or a measurement bug.

**Reconciling this with Experiments A and B (not a contradiction):** the shipped key is still true
that (A) real duplicates are vanishingly rare (~0.019%) and (B) the key is formally unsound almost
every time it fires. What this corrected measurement adds is *why the mechanism still matters
despite that*: its practical value was never about recognizing literally-identical futures. Beam
selects its next frontier by taking the top `beamWidth` candidates by score. Without dedup, many
candidates that superficially converge on the same `(cell, mask-tuple)` — genuinely different
underlying paths, per Experiment B — can crowd the top of that ranking simultaneously, consuming
beam width that would otherwise go to candidates at *different* cells or mask states. Dedup keeps
only the best-scoring one per `(cell, mask-tuple)` bucket, which is not a correctness-preserving
operation (Experiment B) but *is* an effective width-management/diversity heuristic — and removing
it lets the beam get crowded by redundant-looking-but-distinct candidates, which the 19-level
divergence shows costs real solves on this harder population.

## Experiment D: a second, independently-discovered, more severe bug

While building Experiment C's harder sample, `sc`'s bit-packing scheme was found to be unsound in a
second, structural way, unrelated to the visited-cell/edge-usage gap Experiments A/B measured: each
constraint mask (must-cross, must-pass, flipper, surround, must-turn, adjacent-turn) is packed into
a **fixed 4-bit slot by shift amount alone** — nothing in the code actually masks a field to 4 bits
before shifting it into place. CLAUDE.md's documented published-corpus maxima (≤4 for these
mechanics) fit in 4 bits, but stress-corpus-2's generator deliberately raises every one of these caps
to 8 (`scripts/stress/generate-random.mjs`'s own header comment). A field needing a 5th–8th bit
silently overflows into the **next** field's designated bit range, corrupting both. Confirmed with
real corpus data: `mustCrossMask = 0b100000` (a level's 6th must-cross cell) shifted into position
lands on bit 13 — squarely inside `flipperUsedMask`'s documented 12–15 range. **671 non-portal
stress-corpus-2 levels** exceed 4 of at least one of these mechanic counts; **211** of those have a
second, adjacent field simultaneously nonzero — a structurally guaranteed key collision on real
levels, not a theoretical edge case. R00044 (a level that recurs elsewhere in this project's
research, e.g. the MITM frontier sample) is one of them.

## The actual fix: a width-safe key, same merge semantics

Given Experiment C (corrected) shows the mechanism has real value and Experiment D shows the
*existing* key is unsafe on a real population, the fix is narrower than either "remove the
mechanism" (this report's original, retracted conclusion — would cost the 18 solves Experiment C
found) or "make it fully sound" (would eliminate the same value: a genuinely sound key merges almost
nothing, per Experiment A's own 0.019% ceiling). `sc` was changed from a bit-packed `number` to a
delimited **string** — `` `${ints}|${mpVisitedMask}|${mustCrossMask}|${flipperUsedMask}|${surroundMask}|${mustTurnMask}|${adjTurnMask}` ``
— preserving the *exact same* "one bucket per `(cell, full mask-tuple)` combination" merge
granularity, just with no field ever able to overflow into another regardless of any mechanic's
cardinality. The dedup key itself became `` `${key}|${sc}` `` (was `key + sc * KEY_SPACE`).

**Verification, same 75-level sample plus the wider affected population:**
- Typecheck and the full `modules/solver/` vitest suite (284 tests) pass unchanged.
- Comparing the fixed key against the *original buggy* key on the same 75 levels: **71/75 identical**
  (including essentially all 18 of Experiment C's "dedup-needed" solves — the fix preserves the
  mechanism's value, it doesn't just relocate the bug). **3 levels** (R00927, R00986, R03344) flip
  unsolved→solved — the overflow bug was directly costing these specific solves. **1 level**
  (R02945) flips solved→unsolved: this level's original solve depended on the *specific* corrupted
  merge decision the buggy key happened to make, which is exactly the kind of single-level
  sensitivity a heuristic search's move-ordering/culling changes are known to produce in either
  direction (see CLAUDE.md's own note that a ±5 corpus-2 solved-count delta is noise-level) — a net
  +2 on a 75-level sample from fixing a real correctness bug, not a systematic regression.
- The published corpus never exceeds the documented ≤4 caps that trigger the overflow, so the fix is
  expected to be a no-op there; confirmed via `solver:bench --check` against `logs/solver-baseline.json`.

## What this changes about the uploaded document's recommendations

- **"Ranked Research Programme #1" (exact future-state key laboratory) and "#2" (portal-aware beam
  dedup)**: both already have a direct answer for beam, matching the DFS answer this repo already
  had for the *fully sound* version of this idea — Experiment A's 0.019% ceiling means a genuinely
  sound key isn't worth building. That is a distinct conclusion from "the mechanism itself isn't
  worth keeping," which Experiment C (corrected) shows is false: it has real, measured value as a
  width/diversity heuristic, not as a correctness mechanism.
- **The document's soundness caution was right to flag as a live question, wrong on where the risk
  actually was measured to land**: the shipped key's *unsoundness* (Experiment B) turned out not to
  be the practical concern — its *structural fragility under a cardinality assumption that had
  already changed elsewhere in the codebase* (Experiment D) was the real, costly bug. Worth
  re-checking if `useStateDedup` is ever extended further (e.g. to portal levels, or a level with
  denser must-cross constraints, where the additional gap this audit surfaced — `sc`'s
  `mustCrossMask` bit can't distinguish "0 visits" from "1 visit, axis partially locked" on the same
  must-cross cell — could plausibly matter more than it did on this sample).
- Everything else in the uploaded document (Opportunities 2–9, the ranked programme's items 3–6)
  is unaffected by this measurement — it was scoped specifically to Opportunity 1 / the top two
  ranked-programme items, for beam.

## Verification

Experiments A/B: pure read-only measurement. Temporary instrumentation added to
`modules/solver/search.ts` (`_SIG_AUDIT`, env-gated), run via a throwaway driver script (not
committed), then reverted via `git checkout --`.

Experiments C/D and the fix: production code change in `modules/solver/search.ts` (the `sc`
encoding and its dedup-key construction only — `STRATEGY_STATE_DEDUP` and the surrounding
mechanism are unchanged). Verified: full typecheck clean; `modules/solver/` vitest suite (284
tests) passes; `npm run solver:bench -- --check` shows no regression against
`logs/solver-baseline.json` (expected, since no published level exceeds the caps that trigger the
overflow); the two-independent-methods divergence check (git-swap vs ablation-flag toggle) above;
and the 75-level fixed-vs-original comparison showing the fix preserves the mechanism's measured
value while correcting the overflow. All ad hoc driver scripts used for these measurements were
throwaway (not committed).
