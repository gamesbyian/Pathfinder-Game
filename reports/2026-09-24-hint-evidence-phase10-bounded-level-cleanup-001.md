# Hint evidence consolidation — Phase 10 bounded level cleanup — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — applied the already-proven-safe sparse omission rule to all four real tracked level corpora, reducing 6,630,613 bytes to 6,514,630 bytes (1.75%) with zero semantic change.
> **Decision:** execute the real cleanup now that Phase 6/7 have closed and the omission rule is proven equivalent for every one of the 2,162 real levels, per the plan's own "implement only already-safe omission rules" Phase 10 scope.
> **Remaining gate:** none — provenance tables/sidecars and scalar-default omission remain explicitly deferred per the plan's own Phase 10 text, not attempted here.
>
> **Batch:** applies the real, bounded Phase 10 level cleanup the folded-in PR #2042 only benchmarked
> (`scripts/level-sparse-serialization-benchmark.mjs`): omit empty optional mechanic arrays from the
> physical corpus JSON, since the canonical parser (`modules/domain/level-codec.ts`) already treats a
> missing array the same as an empty one.

## 1. Why this is safe to execute now, not just benchmark

The plan's own Phase 10 text: "Only after hint semantics/storage have stabilized: benchmark sparse
level serialization; implement only already-safe omission rules; leave provenance tables/sidecars
deferred unless a separate level-corpus-codec project earns them." With Phase 6 (GHA persistence
centralization) and Phase 7 (historical enrichment) both closed earlier this session, hint semantics
have stabilized, so this batch executes the one omission rule the plan explicitly scopes in.

The rule itself was already correct and already proven per-level by
`scripts/level-sparse-serialization-benchmark.mjs`'s `assertSparseLevelEquivalent()`: an optional
mechanic array (`blocks`, `geese`, `falseGoals`, `mustPass`, `mustCross`, `landmarks`, `filters`,
`flippingFilters`, `portals`) may be physically absent when empty, because
`modules/domain/level-codec.ts` — the canonical raw-level parser every solver/referee/harvester
consumer goes through — already reads a missing array the same as `[]` (e.g.
`(raw.blocks || []).forEach(...)`). This is a pre-existing fact about the parser, not something this
batch introduces.

## 2. What was missing: an apply path

The benchmark script was deliberately read-only. Added `scripts/level-sparse-serialization-apply.mjs`,
a mutation companion that reuses the benchmark's own `sparseLevelCandidate()`/
`assertSparseLevelEquivalent()` functions rather than re-deriving the omission rule, refuses to write
anything if even one level in a corpus fails the equivalence proof, and only rewrites a file when its
canonical serialization actually changed.

## 3. The real apply

Ran it for real against all four tracked corpora:

| Corpus | Levels | Source bytes | Target bytes | Reduction |
| --- | --- | --- | --- | --- |
| `data/levels.json` | 160 | 129,685 | 125,667 | 3.10% |
| `data/stress/stress-levels.json` | 102 | 326,974 | 320,392 | 2.01% |
| `data/stress/stress-levels-random.json` | 1,700 | 5,639,814 | 5,545,894 | 1.67% |
| `data/stress/stress-levels-envelope.json` | 200 | 534,140 | 522,677 | 2.15% |
| **Total** | **2,162** | **6,630,613** | **6,514,630** | **1.75%** |

Every one of the 2,162 real levels passed `assertSparseLevelEquivalent()` before being written — the
apply script would have refused to write any file where even one level failed. Diffed the actual
change on disk: only empty-array fields (`[]`) were removed; every non-empty array and every other
field is byte-identical to before.

## 4. Verification

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,586 tests, all pass (real game/solver logic loading the modified
  corpora, not just JSON-level equivalence).
- A real solve (`scripts/run-solver-direct.mjs --levels=pos:1-3`) against the modified `data/levels.json`
  solved all 3 levels correctly, including P00001 whose `blocks`/`mustPass`/`mustCross`/`filters`/
  `flippingFilters`/`geese`/`falseGoals` fields were all omitted by this batch.
- `node scripts/check-corpus-level-formatting.mjs` — all 4 corpus files and 2,086 hint files remain
  canonically formatted after the change.
- `npm run test:node` — full suite pass, including the new
  `test:level-sparse-serialization-apply` regression coverage (pure-function equivalence/idempotency
  tests plus a real temp-file CLI-shape integration test).

## 5. What this batch does not do

- Does not touch provenance tables, sidecars, or scalar-default omission — explicitly deferred per the
  plan's own Phase 10 text ("leave provenance tables/sidecars deferred unless a separate
  level-corpus-codec project earns them").
- Does not touch any hint/provenance data (`data/hints/`, `data/stress/hints*/`) — this batch is scoped
  entirely to the four level-definition corpus files.
- Does not attempt a Phase-8-style physical schema version bump for levels — this is a conservative,
  losslessly-reversible field omission within the existing level JSON shape, not a new format.

## 6. Plan status

With this batch, every phase the plan names through Phase 10 has real, executed, verified work:
Phase 0–7 complete (prior sessions plus this one), Phase 8 (v4 hint codec) landed via the folded-in
PR #2042, Phase 9 (generated runtime projection) landed via PR #2011, and Phase 10 now has a real
executed cleanup pass in addition to its benchmark. The one explicitly-flagged open design question is
whether Phase 8's lazy per-write v4 upgrade should become an explicit one-time bulk migration instead
— a decision, not missing implementation.
