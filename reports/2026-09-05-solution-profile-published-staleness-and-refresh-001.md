# The committed published-corpus solution profile was 6x stale (9,909 vs. 59,896 hints); refreshed, and the corpus turns out fully uniform on solved/support-class

> **Status:** concluded-negative
> **Last evidence:** 2026-09-05 — compared `reports/stress/solution-profile-published.json`'s stored `hintSignature` against a fresh `computeHintSignature()` call over current `data/levels.json`, then regenerated the profile via `npx tsx scripts/stress/solution-profile.mjs --levels-json=data/levels.json` (a local, non-GHA script run; no dispatch), then joined the refreshed 160-level profile to `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `published` corpus rows
> **Decision:** the committed profile was drastically stale — stored `hintSignature.totalHints` was 9,909 against a current true count of 59,896 (a 6.0x undercount), and covered only 156/160 current published levels. Regenerated it (now 160/160 levels, mean 374.35 hints/level vs. the stale 63.52). However, once refreshed and joined, the published corpus is **fully uniform** on every outcome dimension this session has used for structural-risk comparisons: all 160 levels are `productionSolved: true` and all 160 are `frozenT1SupportClass: frozen-t1-broadly-supported`. This closes off the published corpus as a candidate for any solved/unsolved or support-class standardized-difference analysis — there is no variance to compare against, a genuine negative result rather than an unexplored opportunity.
> **Remaining gate:** none. The refreshed profile remains available for future within-published-corpus (not solved-vs-unsolved) descriptive work, e.g. comparing structural richness across difficulty tiers if such a label exists elsewhere.
> **Evidence role:** forensic/data-quality — detects and repairs a stale committed artifact; the substantive follow-on question (solved/unsolved comparison) resolves to a clean null because the corpus lacks any unsolved members
> **Selection:** whole published population (160 levels), not a sample

## Method

1. Verified staleness read-only: called `computeHintSignature()` (the same deterministic hash `solution-profile-compare.mjs` uses to decide when to auto-refresh) against `readLevelsWithHints('data/levels.json')`, and compared the result to the value stored in the committed `solution-profile-published.json` (`generatedAt: 2026-07-15`).
2. Regenerated the profile locally (`npx tsx scripts/stress/solution-profile.mjs --levels-json=data/levels.json`, completed in well under a minute — a bounded local computation, not a GitHub Actions dispatch), producing a fresh `reports/stress/solution-profile-published.json` and its `-summary.md`.
3. Joined the refreshed profile to `level-capability.json`'s `published` corpus rows by `data/levels.json`'s file-order `id` field (this is the direct, first-class join for the published corpus — unlike corpus1, which requires an intermediate lookup through `stress-levels.json` because its profile's `level` field is a raw array position, not an id). Confirmed 160/160 rows matched, with no missing or ambiguous joins.
4. Attempted the same standardized-difference computation (`productionSolved` true/false, `frozenT1SupportClass` breakdown) used successfully on corpus1 and the pooled census.

## Result

| | stored (2026-07-15) | current (2026-09-05) |
|---|---:|---:|
| levels covered | 156 | 160 |
| `totalHints` | 9,909 | 59,896 (6.0x) |
| `totalProvenance` | 13,196 | 173,770 (13.2x) |
| mean hints/level | 63.52 | 374.35 |
| mean pairwise distinctiveness | 0.719 | 0.717 |
| levels with rigid must-cross order | 10/26 | 8/27 |

| join outcome | value |
|---|---:|
| `productionSolved: true` | 160/160 (100%) |
| `productionSolved: false` | 0/160 (0%) |
| `frozenT1SupportClass` values present | 1 (`frozen-t1-broadly-supported`, 160/160) |

## Interpretation

The staleness is large enough (6x hint count, 13x provenance count) that any prior or hypothetical use of the old committed file for a hint-richness or path-diversity claim about the published corpus would have been working from a snapshot missing the overwhelming majority of what is now known about these levels' solution spaces — this session's own earlier corpus1-only solution-profile report (`2026-09-05-solution-space-profile-corpus1-join-and-exploratory-signal-001.md`) deliberately avoided this exact file for exactly this reason, and that caution is now confirmed rather than merely precautionary.

The refresh itself, however, closes rather than opens a research direction: the published corpus (real shipped game levels) is, unsurprisingly in hindsight, fully solved and fully in the easiest support class in this census — shipped puzzle content cannot be unsolvable, so this population structurally cannot supply the solved/unsolved contrast that made corpus1 and corpus2 useful for the structural risk-factor work. This is a useful negative result to record explicitly: it forecloses a class of future "does structural risk replicate in the published corpus too" investigations that would otherwise look like a natural next replication target but cannot actually be run against this population.

## What this does not establish

- Does not investigate *why* the committed artifact went 6x stale — plausibly explained by unrelated intervening hint-generation campaigns (e.g. `data/stress/hints-random` corpus2 work, isolated-technique census runs) that also touched the published corpus's hint stash without triggering a profile refresh, since `solution-profile-compare.mjs` only auto-refreshes lazily at read time, not on every hint write.
- Does not attempt a within-published-corpus descriptive comparison (e.g. structural richness by level-difficulty tier, if such a label exists independent of `productionSolved`) — the profile data remains available for that if a suitable non-degenerate outcome variable is identified.
- Regenerating other stale profile-like artifacts (e.g. `data/level-heatmaps.json`, generated 2026-07-29, same positional-join family) was not attempted in this report and remains a candidate follow-up.
