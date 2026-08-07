# Stress-analysis reports

Generated and curated evidence for the stress corpora lives here. Some JSON/profile summaries are
tooling inputs and must not be treated as disposable historical output. The collection-level rules
and authoritative entry points are documented in the [reports index](../README.md#subdirectories).

Use these syntheses before reading individual generated files:

- [`corpus2-failure-categorization-2026-07-29.md`](corpus2-failure-categorization-2026-07-29.md)
  interprets the remaining corpus-2 failures and links its follow-up experiments.
- [`dev-benchmark-corpus2.json`](dev-benchmark-corpus2.json) is the curated development subset used
  by solver iteration tooling.
- [`solution-profile-corpus1-summary.md`](solution-profile-corpus1-summary.md) and
  [`solution-profile-published-summary.md`](solution-profile-published-summary.md) summarize the
  live solution-profile libraries used by comparison tooling.
- [`repair-winner-classifier-2026-08-07.json`](repair-winner-classifier-2026-08-07.json) is the
  machine-readable five-fold rerun backing the classifier's concluded-negative report.

Corpus definitions, generation guarantees, and benchmark commands live in
[`data/stress/README.md`](../../data/stress/README.md).
