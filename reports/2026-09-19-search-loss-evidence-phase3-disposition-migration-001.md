# Search-loss evidence: Phase 3 disposition migration wave 1

> **Status:** concluded-positive
> **Last evidence:** 2026-09-19 — migration of 8 further solver-running workflows to `disposition: "standard"`, full read of `scripts/combine-static-portfolio-shards.mjs` and the `collect-variant-family-dataset.yml` shard-summary path, current HEAD.
> **Decision:** migrate every solver-running workflow whose combined result already exposes a `levels`/`results` row array; leave the remaining ones on a reasoned `specialized-opt-out` rather than force a wiring that would require unrelated refactors.
> **Remaining gate:** none blocking; three specific, now-precisely-diagnosed follow-ups remain (see below).
> **Evidence role:** implementation record, not an experiment.
> **Population identity:** not applicable (implementation record).

## Why this ran

Following PR #1895 (merged), the user asked to continue with the "genuinely remaining" items from that PR's report: migrating the other 14 solver-running workflows off their interim `specialized-opt-out`/`unsupported` disposition.

## What migrated to `standard`

Eight workflows, each wired with the identical pattern already proven in PR #1895 (`node scripts/summarize-solver-failure-response.mjs --in=<already-combined file(s)> --out=<summary path>` immediately before the existing `publish-solver-sweep-result.mjs` call, plus `--failure-response-file=<summary path>` added to that call, plus `sideEffects.telemetry` changed from `'none'` to `'compact'`):

- `method-probe-sweep.yml`
- `solver-combine-sweep-runs.yml`
- `solver-highbudget-unsolved-sweep.yml` (had two literal telemetry branches, `'none'` for gap-fill and `'telemetry-update'` for normal dispatch; both now read `'compact'`)
- `solver-broad-confirmation.yml`
- `solver-routing-regime-sample-ab.yml`

Three paired control/treatment workflows (`solver-broad-confirmation.yml`, `solver-routing-regime-sample-ab.yml`, and originally `solver-residual-confirmation.yml`) already pass both arms' combined report files as `--primary=`/`--include=` to `publish-solver-sweep-result.mjs`; `summarize-solver-failure-response.mjs` already supports concatenating rows across multiple `--in=` files (tested since PR #1895), so no new capability was needed — the same command form works unchanged for a paired experiment as for a single-arm sweep.

`--rows-key=levels` was dropped from every new invocation: `summarize-solver-failure-response.mjs`'s default (`auto`) already checks `.levels` then falls back to `.results`, so passing it explicitly was redundant for every one of these levels-shaped producers.

## What did not migrate, and precisely why

- **`solver-level-blind-targeted-sweep.yml`, `solver-production-replay-baseline.yml`, `solver-residual-confirmation.yml`** — wiring these is the identical two-line addition used everywhere else above (confirmed by drafting and testing it), but all three already sit at `scripts/check-file-size-ratchet.mjs`'s grandfathered no-growth ceiling for their workflow category (each within ~1% of its frozen ceiling before this pass). Every candidate byte-saving (single-line commands, dropping the redundant `--rows-key`, shortening the output filename) was tried and applied where safe, but the two added lines still could not fit without cutting into unrelated existing content — which the ratchet's own guidance reserves for "genuinely pre-existing, unrelated debt," not new, deliberate growth. Reverted rather than pushed through with a ceiling bump. The clean fix is a follow-up: extract the repeated "summarize + publish" invocation pattern (now duplicated verbatim across 10 workflows) into a small checked-in wrapper script, which would shrink every calling workflow's YAML and make room for this and any future addition at the same time.
- **`static-portfolio-confirmation.yml`** — read `scripts/combine-static-portfolio-shards.mjs` in full: its `combine()` function computes per-arm `armSummaries`/`comparisons` and never writes the raw per-cell `results` array to `combined.json`. There is no row array for the standard summarizer to read. Wiring this needs either persisting raw rows (an artifact-size/behavior change to an existing, tested combiner) or a bespoke arm-aware compact projection — correctly out of scope for a read-time wiring pass.
- **`collect-variant-family-dataset.yml`** — confirmed its shard outputs are per-shard JSONL summary files (`logs/family-census/wide-shard-*-summary.jsonl`), never combined into one JSON row array; `summarize-solver-failure-response.mjs` only reads a single JSON document's `.levels`/`.results`. Needs either a JSONL-aware summarizer variant or a combined-row-array export from this workflow's own combine step.

## Finish line

`npm run check` (including `check:file-size-ratchet` and `check:failure-evidence-disposition`), `npm run test:node`, and `npm run build` all pass. All 5 newly-edited and 3 reverted-then-confirmed-clean workflow YAML files parse and pass `check:workflow-actions`.
