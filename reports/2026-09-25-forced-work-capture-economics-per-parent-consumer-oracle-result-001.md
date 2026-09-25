# Forced-work capture-economics per-parent consumer-oracle result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-25 — code trace of the beam candidate pipeline (numerator 1) plus a local rerun of the frozen 64-parent forced-work-prevalence probe with a new rawNeighborCount field (numerator 2), same population/protocol/code path as GHA run `35659746572` and the 2026-09-25 phase census.
> **Decision:** close both remaining WS2-FORCED-WORK-CAPTURE-ECONOMICS numerators the phase census left open. Post-recognition bookkeeping (numerator 1) has no material skippable operation — every downstream per-candidate step costs the same flat amount regardless of a parent's arity, so "forced" earns no discount there. Earlier recognition (numerator 2) is decisively negative for the one case that could plausibly have been free (structural dead ends): `rawNeighborCount` is already known at zero marginal cost, but the single candidate it identifies still needs its hard-pruning verdict evaluated, and skipping that would be unsound.
> **Remaining gate:** none for either numerator as stated. A genuinely different, non-trivial sound recognizer (something other than raw neighbor count) remains conceptually open per the seam audit's own framing, but no candidate mechanism is proposed here.
> **Evidence role:** design (numerator 1, code trace only, no acquisition) + confirmation (numerator 2, reuses the frozen population/protocol, extends an existing research-only observer field)
> **Research question:** `WS2-FORCED-WORK-CAPTURE-ECONOMICS`
> **Owner:** WS2.
> **Production effect:** none. The new `rawNeighborCount` field is emitted only inside the existing `parentExpansionsForResearch` branch, itself only allocated when a caller opts in via `research.includeParentExpansionWork` (default off for every production caller). No `--save-hints`, no solver behavior change.

## Why this needed no new premise

`reports/2026-09-25-forced-work-capture-economics-phase-census-result-001.md` closed the *global*
beam-phase-collapse route and left two numerators open:

1. **Post-recognition bookkeeping at the per-parent seam**: when an individual expanded parent (not
   a whole phase) has exactly one survivor, how much sorting/retention/materialization work can be
   skipped for *that parent* while preserving exact behavior?
2. **Earlier recognition**: is there a cheaper sound current-input test that establishes a parent's
   unique viable continuation before ordinary candidate expansion/hard pruning?

Both are addressable from the code and one small, cheap telemetry extension — no new acquisition
design was needed to make progress on either.

## Numerator 1: post-recognition bookkeeping (closed by code trace, zero compute)

Traced the beam candidate pipeline in `modules/solver/search.ts` for where a surviving candidate's
downstream cost is actually paid, to find any step whose cost scales with how many siblings that
candidate's *parent* produced (which a forced parent, by definition, only ever produces one of):

- `buildCurUrgencyContext` (search.ts:1043) is built **once per parent**, before hard pruning even
  runs, so its cost cannot depend on how many candidates survive — a forced parent pays exactly the
  same for this as a branching parent.
- Each candidate's `scoreMove` (search.ts:1087) and `cands.push` (search.ts:1129) are per-*candidate*
  costs, paid once per surviving candidate regardless of the parent's own arity. A forced parent's
  one candidate costs exactly what any other single candidate costs — there is no "extra bookkeeping
  for having siblings" for it to skip, because branching parents do not pay a higher *per-candidate*
  rate, only a higher *candidate count*.
- Coarse-state merge and near-tie retention (search.ts:1153 on) are gated behind
  `cands.length > beamWidth` — a **phase-wide** condition over the accumulated candidate pool from
  *every* parent in the phase, uncorrelated with any individual parent's arity. When this gate does
  fire, the merge loop (search.ts:1184) processes the whole pool in one pass at O(1) amortized cost
  per candidate (one map lookup/insert); a forced parent's single candidate costs the same O(1) as
  any other candidate in that pass, not more.

Expansion work (neighbor generation + hard-pruning verdicts) is the cost that actually reveals
forcedness, and the seam audit already established that this cost is unavoidable — paid before
one-successor status is knowable, not retroactively removable. This trace adds the other half: the
*downstream* per-candidate machinery a survivor then passes through has no parent-arity-scaled
component either. Between the two, there is no live seam left where "this parent turned out to be
forced" implies work that could have been skipped.

**Disposition: CLOSE NEGATIVE.** No consumer is earned; none is proposed. Resolved entirely by
reading already-committed code — no experiment, no acquisition, no compute spent.

## Numerator 2: earlier recognition (new local rerun, decisive negative for the dead-end case)

### What was missing

The existing forced-work reducer (`scripts/stress/forced-work-prevalence-lib.mjs`) recorded each
expanded parent's **post**-hard-prune survivor count (`generatedCandidates`) but not its **pre**-prune
raw neighbor count — so it could not distinguish a structural dead end (one raw neighbor, forced
before any pruning verdict) from a parent whose several raw options were narrowed to one only by
paying the hard-pruning cost for each.

### Change (research-only, zero production effect)

- `modules/solver/search.ts`: added `rawNeighborCount: _beamNeighborCount` to the existing
  `parentExpansionsForResearch.push(...)` call — `_beamNeighborCount` (search.ts:1039) was already
  computed as part of ordinary flow; this only additionally *records* it, inside the same
  already-gated research branch used by `workSpent`/`generatedCandidates`.
- `scripts/stress/forced-work-prevalence-lib.mjs`: the collector now stores `rawNeighborCount` per
  expansion row (`null`, not `0`, when absent from an older capture — excluded from both buckets
  below rather than silently miscounted). `summarizeForcedWork`/`summarizeForcedWorkAcrossRuns` add an
  `earlyRecognition` block splitting one-successor parents into `triviallyForced`
  (`rawNeighborCount === 1`) and `pruneNarrowed` (`rawNeighborCount > 1`).
- Unit tests added to `scripts/stress/forced-work-prevalence-lib-node-test.mjs` covering both buckets
  and the legacy-capture exclusion case.

### Reproduction check

Coverage and prevalence totals are **byte-identical** to the original 2026-09-21 census and the
2026-09-25 phase census, confirming this rerun replayed the same population under the same code path:

| Metric | Prior runs | This rerun |
|---|---:|---:|
| Expanded parents | 19,260,501 | identical |
| One-successor parents | 7,617,557 (39.55%) | identical |
| Total expansion work | 90,572,067 | identical |
| Forced (one-successor) expansion work | 22,944,663 (25.33%) | identical |

### New early-recognition split

| Metric | Value |
|---|---:|
| One-successor parents with `rawNeighborCount` recorded | 7,617,557 (100% coverage) |
| Trivially forced (`rawNeighborCount === 1`) | 6,047,617 (**79.39%** of forced parents) |
| Trivially forced expansion work | 14,270,377 (62.2% of the forced-work reservoir; 15.76% of total expansion work) |
| Prune-narrowed (`rawNeighborCount > 1`) | 1,569,940 (**20.61%** of forced parents) |
| Prune-narrowed expansion work | 8,674,286 (37.8% of the forced-work reservoir) |

### Interpretation

The seam audit's numerator 2 asked for a cheaper sound test that establishes forcedness *before*
ordinary expansion/hard pruning. Raw neighbor count is the most natural candidate for such a test —
and it turns out to already be free: `getNeighbors()` is called unconditionally for every parent
regardless of anything else, so `rawNeighborCount` costs nothing beyond what ordinary flow already
pays.

But being free to *know* is not the same as being useful to *act on*. Tracing what a consumer could
actually do with `rawNeighborCount === 1` before hard pruning finds nothing skippable:

- The single candidate still needs its hard-pruning verdict evaluated to know whether it is even a
  valid continuation (`generatedCandidates` could be 0, not 1) — a structural dead end's only move can
  still fail must-cross/must-pass/connectivity checks. Skipping that verdict would be unsound.
- There is no multi-candidate overhead being wastefully paid for these parents to begin with: the
  per-candidate loop (search.ts:1046) already only touches exactly one candidate when there is exactly
  one raw neighbor. A rawNeighborCount-aware consumer would find the loop already doing the minimum
  work for this case.

So this result sharpens, rather than answers, the seam audit's open numerator: it decisively closes
the specific case that would have been easiest to hope for (raw-degree-1 corridors — the majority of
forced parents, and the majority of the forced-work reservoir), while confirming that even this
cheapest, already-free-to-know case yields no discount. This is a genuine, informative negative, not a
punt: it rules out the natural first candidate for "cheaper sound test" rather than leaving the
question abstract.

The deeper premise the seam audit explicitly declined to assume — "is there any cheaper sound
current-input test [of any kind, not just raw neighbor count] that establishes unique viable
continuation before ordinary candidate expansion/hard pruning" — remains genuinely open. No such test
is proposed or investigated here; this result only rules out the specific, cheapest candidate that
raw neighbor count offered.

## Disposition and next action

**CLOSE NEGATIVE** on both numerators as stated by the seam audit and the phase census:

1. Post-recognition bookkeeping at the per-parent seam: no material skippable operation exists,
   established by code trace alone.
2. Earlier recognition via raw neighbor count: the free-to-know, cheapest-to-hope-for case
   (structural dead ends, 79.4% of forced parents) yields no discount, established by this rerun.

`WS2-FORCED-WORK-CAPTURE-ECONOMICS` has no further live numerator from either the seam audit or the
phase census. Reopening this batch-speed line needs a materially different premise — specifically a
sound recognizer that is neither "wait for the whole global phase to collapse" (closed) nor "use raw
neighbor count" (closed here) — not a retune or rerun of either closed form.

## Artifacts

- `modules/solver/search.ts` — `rawNeighborCount` field added to `parentExpansionsForResearch` (near
  line 1139), research-only, gated behind the existing `includeParentExpansionWork` opt-in.
- `scripts/stress/forced-work-prevalence-lib.mjs` — `earlyRecognition` block added to
  `summarizeForcedWork`/`summarizeForcedWorkAcrossRuns`.
- `scripts/stress/forced-work-prevalence-lib-node-test.mjs` — coverage for both buckets and the
  legacy-capture exclusion case.
- `data/stress/forced-work-prevalence-sample-2026-09-21.json` — the reused frozen population (no new
  acquisition).
- Command (identical protocol to the phase census, local, not GHA):

```bash
node scripts/run-bundled.mjs scripts/stress/forced-work-prevalence.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --levels-file=data/stress/forced-work-prevalence-sample-2026-09-21.json \
  --profile=objectiveFirst --width=5000 \
  --work-budget=5000000 --budget-ms=600000 \
  --out=reports/stress/forced-work-prevalence-early-recognition-2026-09-25.json
```
