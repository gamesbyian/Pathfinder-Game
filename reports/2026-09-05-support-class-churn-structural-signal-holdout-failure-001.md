# A structural signal for capability support-class churn across a census refresh does not replicate: the pooled estimate was a 2-level corpus1 artifact

> **Status:** concluded-negative
> **Last evidence:** 2026-09-05 — standardized difference between the 313 levels whose `frozenT1SupportClass`/support status changed (`reports/stress/technique-niches/2026-09-03/temporal-stability.json`'s `changedLevels`) and the 1,649 that stayed stable, on all 23 numeric `features`, computed pooled and then split by `corpus` via `scripts/analyze-structural-holdout-replication.mjs`, no new dispatch
> **Decision:** an initial pooled scan across both corpora looked like a real, if modest, effect — `constrainedObjects` standardized diff 0.436, with `requiredPathLength`/`width`/`height`/`area`/`portals`/`turnConstraintLoad` all in the 0.28-0.36 range. But a corpus1/corpus2 holdout split (this exact check is what `2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md` used successfully to *confirm* the production-solved risk ranking) fails badly here: Spearman rank correlation across the two corpus-specific rankings is **0.092** (no meaningful agreement), and top-8 feature overlap is only 2/8. The reason: corpus1 has only **2** support-class-changed levels out of 102 (vs. corpus2's properly-powered 311/1,700), so corpus1's ranking is almost pure noise (`constrainedObjects` standardized diff 3.151 there, driven by n=2) and dominates the naive pooled estimate. Corpus2's own, adequately-powered ranking shows a much weaker signal (`portals` 0.218, `constrainedObjects` 0.160) — too weak to call a confirmed structural driver of census-refresh instability.
> **Remaining gate:** none — this closes the specific "does the structural risk-factor block also predict temporal support-class churn" question as unconfirmed/weak, using already-collected data. It should not be cited as a positive finding.
> **Evidence role:** forensic/methodological — a multiple-comparisons catch: a plausible-looking pooled correlation demonstrated to be a small-sample artifact once a natural holdout is applied
> **Selection:** whole comparable census population (1,962 levels, all with a defined old/fresh support-class comparison), not a sample

## Method

Built the "changed" grouping from `temporal-stability.json`'s `changedLevels` array (313 levelIds whose support class or singleton/doubleton status changed between the `2026-09-01` and `2026-09-03` census snapshots), joined against `level-capability.json`'s `features`. Computed the standardized-difference ranking (a) pooled across both corpora and (b) independently within `corpus1` and `corpus2` via the same `analyzeHoldoutReplication` machinery used for the (successful) production-risk-factor holdout check, to test whether this new grouping's apparent signal is genuine or an artifact of pooling two very differently-sized populations.

## Result

| | pooled (n=313/1,649) | corpus1 (2/100 changed) | corpus2 (311/1,389 changed) |
|---|---:|---:|---:|
| `constrainedObjects` | 0.436 | 3.151 | 0.160 |
| `portals` | 0.337 | 2.958 | 0.218 |
| `requiredPathLength` | 0.360 | 1.135 | (not top 8) |
| `flippingFilters` | (not top 8) | 2.583 | (not top 8) |

Spearman rank correlation between the corpus1-only and corpus2-only rankings: **0.092**. Top-8 overlap: **2/8** (`constrainedObjects`, `portals` only).

## Interpretation

This is the negative-result counterpart to `2026-09-05-structural-risk-factor-corpus-holdout-replication-001.md`'s positive one: the same holdout-check methodology that confirmed the production-solved structural risk ranking (Spearman 0.82-0.90 there) here reveals that a superficially similar pooled correlation for support-class churn does **not** survive the identical check (Spearman 0.092). The mechanism is exactly the small-sample-pooling trap the session has repeatedly flagged as a risk: corpus1 contributes only 2 changed levels, so any features those 2 specific levels happen to have high values for get inflated standardized-difference scores that then dominate the pooled statistic once corpus1 and corpus2 are combined naively (corpus1's `constrainedObjects` value of 3.151 vs. corpus2's 0.160 is nearly a 20x difference in magnitude for the same nominal feature). Practically: `analyze-structural-holdout-replication.mjs`'s replication check is doing exactly the job it was built for here — catching a would-be false positive before it gets written up as a real finding.

The corpus2-only ranking (adequately powered, 311 changed levels) is the only trustworthy piece of this analysis, and its top signal (`portals` 0.218, `constrainedObjects` 0.160) is too weak to support a claim that these structural features meaningfully predict census-refresh instability. This should not be treated as "constrainedObjects predicts capability churn" — it should be treated as an open, currently unanswered question, with the corpus1-driven pooled number specifically flagged as unsafe to cite.

## What this does not establish

- Does not establish that no structural predictor of support-class churn exists — only that this specific 23-feature scan, at this sample size, did not find one that survives a corpus-holdout check.
- Does not test whether a properly-powered replication (e.g. splitting corpus2 alone into two halves, since it has adequate changed-level count on its own) would show a weak-but-real corpus2-internal signal — the corpus1/corpus2 split was chosen because it was the same natural split used successfully before, not because it is the ideal power split for this specific question.
- Single pair of census snapshots (2026-09-01 vs. 2026-09-03); does not test whether a different or larger refresh gap shows a different pattern.
