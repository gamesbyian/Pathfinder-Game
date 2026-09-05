# Corpus1's easier solve profile is also more concentrated at the specific-technique level

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `winningConfig` distribution split by corpus, from `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json`, no new dispatch
> **Decision:** corpus1 uses fewer distinct winning configs (20) than corpus2 (26) despite corpus1 having far fewer solved levels to draw from (98 vs. 975), and its top config and top-3 configs both carry a larger share: `repair|score=repair|guidance=standard` alone is 31.6% of corpus1's solves vs. 19.8% of corpus2's; the top 3 configs cover 54.1% of corpus1 vs. 48.0% of corpus2.
> **Remaining gate:** none — descriptive characterization extending `2026-09-05-main-ladder-config-level-deconcentration-001.md` with a corpus split.
> **Evidence role:** discovery — a corpus-level refinement of the config-deconcentration finding
> **Selection:** whole solved population within each corpus, not a sample

## Method

Repeated the specific-`winningConfig` tabulation from the config-deconcentration report, computed separately for corpus1 and corpus2.

## Result

| | corpus1 (n=98 solved) | corpus2 (n=975 solved) |
|---|---:|---:|
| distinct winning configs | 20 | 26 |
| top config share | 31.6% (`repair-standard`) | 19.8% (`repair-standard`) |
| top-3 config share | 54.1% | 48.0% |

## Interpretation

Corpus1's already-established ease (96.1% solved overall, 97% via just two ladder stages, per `2026-09-04-corpus1-corpus2-stage-share-comparison-001.md`) extends down to the specific-technique level: not only does corpus1 need fewer *stages*, it also needs a narrower *repertoire* of specific techniques within those stages, with the single most common config (`repair-standard`) alone covering nearly a third of its solves. Corpus2, needing to reach into more of the ladder overall, correspondingly draws on a wider spread of specific techniques even for its solved subset. This reinforces routing-regime composition (`2026-09-05-routing-regime-composition-by-corpus-001.md`) as another structural axis on which corpus1 is a narrower, easier population than corpus2, not just a smaller one.

## What this does not establish

- Does not test whether corpus1's narrower technique dependency would hold on a larger corpus1 sample (n=98 is thin relative to corpus2's 975).
- Correlational; does not identify why corpus1 draws a narrower technique repertoire beyond the already-established ease/regime-composition context.
- Single production run.
