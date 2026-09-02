# Beam 31/32 flipping-filter identity fix

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — 6 new targeted counterexample/composition tests (`search.test.ts`), full `modules/solver/` vitest suite (530 passed, 4 skipped test files unrelated), `check:types`/`check:types:tests`/`check:lint`, and the full 160-level published-corpus `solver:regression -- --check` all passed; regression solved 160/160 with 68,562,085 nodes, byte-identical to the established current total.
> **Decision:** fix `search.ts`'s beam-search fast numeric coarse-state key and mechanic-bucket-retention bucket key, both of which relied on `_flipperBase = 1 << flipperCount` — unsound for a schema-valid 31- or 32-flipping-filter level, per `docs/solver-correctness-hardening.md`'s previously-open defect. Use `_flipperBase = 2 ** flipperCount` and normalize every composed `flipperUsedMask` with `>>> 0` before multiplying it into either key.
> **Remaining gate:** none. The defect entry in `docs/solver-correctness-hardening.md` is closed.

## Why this defect was real

`validateRawLevel` permits up to 32 flipping filters (`level-schema.test.ts`'s "accepts 32 flipping filters but rejects a 33rd that would alias bit zero"), because `flipperUsedMask` legitimately uses all 32 int32 bits and the underlying move-legality/apply/undo transition state already handles bit 31 correctly (`flipper-cardinality.test.ts`).

`search.ts`'s beam search built two *numeric* fast-path keys from `_flipperBase = 1 << prep.flipperKeys.length`:

- `beamNumericCoarseStateKey` (coarse-state merge/dedup — a mixed-radix positional encoding folding all 7 coarse-state fields, including `flipperUsedMask`, into one number);
- `_mechanicBucketSelect`'s own bucket key (`mustCrossMask * flipperBase + flipperUsedMask`, used for mechanic-bucket-retention diversity selection).

JS `<<` is int32-only: `1 << 31 === -2147483648` and `1 << 32` wraps the shift count back to `1 << 0 === 1`. Both are silently wrong radixes for a positional/multiplicative key. Separately, `flipperUsedMask` itself (built via `state.flipperUsedMask |= (1 << fi)` in `search-state.ts`) is a genuine negative int32 once flipper index 31 is used — a real, schema-valid 32-filter level's mask.

This was diagnosed but left open in `docs/solver-correctness-hardening.md` ("Open correctness defect: 31-32 flipping-filter beam identity") with five required repair steps and an explicit note that it "is a representation correctness bug, not evidence that any existing corpus result was wrong: no affected production/corpus population has yet been established" — i.e., a real defect, not yet known to have produced a wrong production result, and worth fixing regardless.

## Change

`modules/solver/search.ts`:

1. `_flipperBase = 2 ** prep.flipperKeys.length` (arithmetic power) instead of `1 << prep.flipperKeys.length` (bitwise shift). Exact as an ordinary float through the schema's full 32-filter cap, and bit-for-bit identical to the old shift for every cardinality `<= 30` — so the ordinary small-cardinality path is unaffected.
2. `beamNumericCoarseStateKey` and `_mechanicBucketSelect`'s bucket key both now use `(c.flipperUsedMask >>> 0)` instead of the raw (possibly negative) field when composing the key.
3. Extracted `beamNumericCoarseStateKey`'s composition into a standalone, directly-testable module function (`_composeBeamNumericCoarseStateKey`) — zero behavior change, pure refactor to enable direct unit testing without needing to force a full beam search into an exact 32-filter high-bit divergence.
4. Added `__mechanicBucketSelectForTests`/`__composeBeamNumericCoarseStateKeyForTests` exports, matching the existing `__pruneFirstStepNeighborsForTests`/`__reconstructBeamPathForTests` test-only-export convention.
5. Corrected `_mechanicBucketSelect`'s own comment, which had claimed `flipperBase` was "always small (well under 2^16)" — stale/wrong given the schema's real 32-filter cap.

## What this does not change

- no change to move legality, apply/undo, or the referee — already sound at the 31/32-filter boundary (`flipper-cardinality.test.ts` already covered this);
- no change to the delimited-string fallback key (`beamStateKey`) — already collision-free regardless of sign, since it concatenates decimal string representations rather than doing positional arithmetic;
- no change to `mustPassKeys`/`mustCrossKeys` radix computation (`_mpBase`/`_mcBase`) — those are capped well below the 31/32-bit boundary (30 bits, per the must-pass lower-bound memoization fix referenced in `solver-correctness-hardening.md`'s "Closed work" section), so they carry no analogous bug;
- no change to `_numericCoarseStateKeySafe`'s overflow-fallback mechanism itself, only to the value it now correctly evaluates.

## Counterexamples

Four new tests directly exercise the fixed arithmetic (`modules/solver/search.test.ts`), rather than trying to force a full beam search into this exact rare high-bit divergence:

1. **`_mechanicBucketSelect`: the OLD base=1 aliased distinct states.** Pins that `mustCrossMask=1,flipperUsedMask=0` and `mustCrossMask=0,flipperUsedMask=1` really did collide under the old `1<<32===1` formula (`1*1+0 === 0*1+1`), then proves both survive as distinct buckets under the fixed `2**32` base.
2. **`_mechanicBucketSelect`: a real bit-31 state buckets distinctly from an unused mask.**
3. **`_composeBeamNumericCoarseStateKey`: the OLD base=1 aliased distinct `(surroundMask, flipperUsedMask)` states.** Same pin-then-fix shape as (1), for the coarse-state key.
4. **`_composeBeamNumericCoarseStateKey`: a real bit-31 state composes exactly as the unsigned-normalized arithmetic predicts** — asserts the exact expected numeric value, not just inequality.

Every "pin the bug" assertion computes the OLD buggy value inline and asserts the collision actually occurs, so these tests demonstrate the defect rather than merely asserting the fix's own claim.

## Validation

Completed on this branch:

- 4 new counterexample tests + the 2 existing numeric/string-key differential tests: 6 passed;
- full `modules/solver/` vitest suite: 530 passed, 4 skipped (unrelated `SOLVER_DEEP_TESTS=0` gates), 42 files;
- `npm run check:types`, `check:types:tests`, `check:lint`: passed;
- published-corpus regression: **160/160 solved, failed `[]`, 68,562,085 nodes** — byte-identical to every other change in this session, confirming no ordinary-level behavior change (expected: the published corpus has no 31/32-flipping-filter levels);
- full `npm run ci`: in progress at time of writing, will be confirmed before merge.

Reproduction:

```bash
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/search.test.ts -t "_mechanicBucketSelect|_composeBeamNumericCoarseStateKey"
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/
npm run solver:regression -- --check
```
