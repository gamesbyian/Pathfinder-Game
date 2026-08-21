# Generated level families

> **Status:** historical generated data retained on the variant-trove branch. Use current `main` tooling and instructions to analyze it.

This directory stores generated parent/variant families. It is data, not current solver policy or a current research backlog.

## Layout

- `corpus1/`: generated families derived from stress Corpus 1 parents.
- `corpus2/`: generated families derived from stress Corpus 2 parents.
- Family JSON contains the parent and its generated variants.
- Companion manifest JSON records generation metadata and artifact identity.

Join solver evidence by full family/variant identity against `logs/family-census/`. Human-readable family reports live under `reports/families/`.

## Identity and interpretation

Use `(parentCorpus, parentId, variantId)` rather than a bare variant ID. Treat siblings as correlated observations from one parent family, not as independent benchmark samples.

Generation metadata establishes how a puzzle variant was constructed. It does not establish current production-solver capability. Historical solve outcomes in this branch must be re-tested on current code before they drive a current solver decision.

## Current workflow

Do not switch your working codebase to this branch to analyze these files. From current `main`, mount this branch in a separate worktree and use the current `docs/variant-level-research.md` and current family tooling. If a current tool cannot accept an external data root, fix that tool on `main` rather than falling back to historical code here.
