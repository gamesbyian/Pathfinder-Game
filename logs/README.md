# Audit/log artifact policy

`logs/` owns raw generated run evidence such as solve traces, benchmark dumps, and determinism logs. Curated interpretation belongs in [`reports/`](../reports/). Routine local or CI output should not be committed because it creates noisy diffs and obscures source changes.

## Naming

Use lowercase kebab-case for tracked log directories and filenames. Prefer a stable family/topic first, then corpus and role where useful: for example `solver-determinism/`, `solver-corpus2-batches/`, or `<topic>-corpus2-latest.json`. Use canonical corpus names `published`, `corpus1`, and `corpus2`; avoid minting new `random`/`randoms` aliases for Corpus 2.

A current convenience pointer may use `latest`; a dated snapshot must use a date/run identity and must not also claim to be `latest`. Names such as `new`, `final`, `after-all`, `diag`, or bare `big-budget` are historical vocabulary, not patterns for new artifacts. Preserve old evidence until its consumers are checked; classify legacy names in artifact metadata or archive them rather than silently repurposing them.

## Tracked versus untracked output

Commit raw output only when it is a small test fixture, a deliberate compatibility/comparison baseline, or irreplaceable provenance for a documented investigation. Do not commit routine `logs/solver-workflow/*.json`, exploratory runs, or CI output that can remain a workflow artifact.

[`artifact-metadata.json`](artifact-metadata.json) is the machine-readable classification for tracked exceptions. It records whether each important artifact is a current pointer, baseline, historical snapshot, or source evidence; its generator and consumers; regeneration and supersession; and whether deletion or regeneration is safe. `npm run check:audit-artifacts` validates the metadata and the restricted `solver-workflow` inventory.

`latest` is a convenience pointer, not independent authority. Use its embedded source/run metadata and the corresponding timestamped snapshot when provenance matters. Generated baselines must be regenerated with the command in the metadata rather than hand-edited.

## Archiving superseded runs

Move superseded batch output to `logs/solver-corpus2-batches/archive/<dated-subdir>/` with `git mv`; do not silently delete evidence referenced by a report. Record the replacement in artifact metadata or the owning dated report. The chronology behind current exceptions is preserved in [`../docs/history/log-artifact-exceptions.md`](../docs/history/log-artifact-exceptions.md).

Do not add another tracked raw-output class without adding or extending its metadata entry and explaining why the evidence belongs in git.
