# PG-H hidden semantic forcedness: frozen small reference pilot 001

> **Status:** active / execution pending. This preflight authorizes neither a solver action nor a production claim.
> **Question:** `WS2-SEMANTIC-FORCEDNESS` / PG-H, [canonical workstreams](../docs/solver-optimization-workstreams.md).
> **Evidence role:** development; Corpus 2 is extensively mined, even though the specified sample selection is outcome-blind for this test.
> **Production effect:** none. The observer, exact references and reconciliation run separately from ordinary production search.

## Decision this pilot can make

At a normal beam hard-prune seam, several children may survive yet only one may possess an exact valid completion. Such **hidden semantic forcedness** could justify a future cheap recognizer or branch prioritizer, but only if it occurs at interesting depth and enough work to matter. Merely finding exact-D E A D children is not a cold solve. The pilot first tests whether this type of branching exists, how often reference answers resolve within a small time allowance and whether its work/headroom could plausibly pay for a lightweight consumer.

## Frozen prospective selection

From the current `data/stress/stress-levels-random.json` file, sort the entire level population by SHA-256 of `pg-h-semantic-forcedness-20261016-pilot-001|<id>`, tie-break by ID, and take the first **8 parents** before inspecting a child reference label. The materializer writes full ID/position list, input file SHA-256 and runner commit in the uploaded capture artifact. Each independent unit is the level parent, not each correlated prefix/child.

The capture uses `scripts/stress/semantic-forcedness-capture.mjs` with **objectiveFirst, width 500, 500,000 canonical work per gate, 10-minute wall-safety limit, 2..4 ordinary-prune-surviving children, first two eligible parent states per gate**. Group membership depends on production-only generation order, never an exact oracle label. Preserve per-gate reach, termination and work. Reject an empty sample and fail rather than silently select more than 320 child cases.

## Reference protocol

All selected explicit child prefixes use the **existing** `cpsat-explicit-prefix-reference.mjs` and canonical `extractExplicitPrefixCases` normalizer. CP-SAT is bounded to 20 seconds per child, sharded across eight jobs; UNKNOWN, unsupported mechanics, invalid inputs and errors remain abstentions. Every LIVE claim needs the existing native referee validation of the CP-SAT witness. Combine all eight shards through the maintained integrity checker before classifying any parent; no missing rows accepted.

Reconcile via `semantic-forcedness-reconcile.mjs`. The only immediately decision-worthy verdict is whether any **fully resolved** multi-successor state has exactly one LIVE child, alongside its opportunity prevalence and measured parent-expansion work. Report unknown share, independent-parent count, depth, control-side exposure and per-case costs. Do not divide by only answered cases and present that as the population rate without coverage caveats.

## Stop / continuation

- Zero eligible children: capture/population incompatibility; inspect instrumentation before buying more exact queries.
- Majority unknown: improve the exact-observability pilot, do not infer absence of semantic forcedness.
- Fully resolved but no hidden forcedness across selected parents: close this **bounded early-state/width-500 form**, not the parent premise at other depths/techniques.
- Positive forcedness: first test a **cheap current-state discriminator** against the exact labels and price its cost at the real beam seam. A costly CP-SAT oracle is not a plausible near-typical-budget consumer.
- Keep results in dated evidence and update the canonical workstream next gate; no production flag promotion without a legal current-input, matched-work cold A/B and independent confirmation.

Execution is a temporary branch-local workflow `.github/workflows/pg-h-semantic-forcedness-pilot-20261016.yml`. It uploads full manifests/cases/exact rows/results, and keeps all actions read-only with respect to production defaults, hints and canonical baselines.
