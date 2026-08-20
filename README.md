# Pathfinder

Pathfinder is a browser-based grid-path puzzle game with a deliberately serious solver and research toolchain behind it. The app is built with Vite and TypeScript, deployed to GitHub Pages, and uses Firebase/Firestore for submissions and progress.

## Start here

Choose the smallest entry point that matches the job:

| Need | Start here |
|---|---|
| AI or coding agent onboarding | [`AGENTS.md`](AGENTS.md) |
| Current application architecture | [`docs/architecture.md`](docs/architecture.md) |
| Full current developer reference and game-rule gotchas | [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) |
| Solver implementation and batch-tool selection | [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Current solver optimization priorities | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) |
| Existing CLI/research tooling | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Test selection and merge gates | [`docs/testing.md`](docs/testing.md) |
| Research reports and experiment history | [`reports/README.md`](reports/README.md) |
| All documentation by topic | [`docs/README.md`](docs/README.md) |

Do not reconstruct current solver priorities from dated reports. Reports preserve evidence and history; the current queue above owns the ranked optimization priorities.

## Development

```bash
npm ci
npm run dev
npm run ci
```

`npm run ci` is the normal pre-merge gate. Browser/release confidence uses `npm run ci:full`. Solver hot-path work has additional regression and cost checks documented in [`docs/testing.md`](docs/testing.md).

## Repository shape

- `modules/` contains the TypeScript application and solver source.
- `scripts/` contains local validation, analysis, solver, corpus, hint, family, and research tools. See [`scripts/README.md`](scripts/README.md).
- `.github/workflows/` contains CI/deployment plus expensive or sharded research jobs. See [`.github/workflows/README.md`](.github/workflows/README.md).
- `data/` contains published runtime data and the separately documented stress corpora.
- `reports/` contains human-readable analysis and investigation results.
- `logs/` contains raw run/audit data.
- `docs/` contains current references, plans, ADRs, and historical material, with status called out at the document level.

TypeScript source files are `.ts`, while import specifiers intentionally remain `.js`; see [`docs/typing.md`](docs/typing.md) before treating a `.js` import path as a repository filename.
