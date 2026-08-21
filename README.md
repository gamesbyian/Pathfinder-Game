# Pathfinder

Browser grid-path puzzle game with a Vite/TypeScript app, solver/research toolchain, GitHub Pages deployment, and Firebase/Firestore persistence.

## Start here

| Need | Reference |
|---|---|
| Coding-agent onboarding | [`AGENTS.md`](AGENTS.md) |
| Application architecture | [`docs/architecture.md`](docs/architecture.md) |
| Full developer/game-rule reference | [`DEVELOPER_REFERENCE.md`](DEVELOPER_REFERENCE.md) |
| Solver implementation | [`docs/solver-architecture.md`](docs/solver-architecture.md) |
| Current solver priorities | [`docs/solver-optimization-current-queue.md`](docs/solver-optimization-current-queue.md) |
| Variant/family research trove | [`docs/variant-level-research.md`](docs/variant-level-research.md) |
| CLI/research tooling | [`docs/tooling-catalog.md`](docs/tooling-catalog.md) |
| Tests/merge gates | [`docs/testing.md`](docs/testing.md) |
| Reports/history | [`reports/README.md`](reports/README.md) |
| Documentation index | [`docs/README.md`](docs/README.md) |

Use the live solver queue for current priorities, not dated reports. Check the existing variant trove before generating more families.

## Development

```bash
npm ci
npm run dev
npm run ci:fast     # default per-change gate (~1 min); see docs/testing.md for when to run full `ci` instead
```

`npm run ci` is the full gate (adds coverage and the deep solver-proof tests); `ci:full` adds browser/release confidence on top of that. Solver hot-path changes have additional gates in [`docs/testing.md`](docs/testing.md).

## Repository map

- `modules/`: application and solver source.
- `scripts/`: local tooling; [`scripts/README.md`](scripts/README.md).
- `.github/workflows/`: CI/deploy/remote research; [workflow index](.github/workflows/README.md).
- `data/`: runtime data plus separate stress corpora.
- `reports/`: human-readable analysis; `logs/`: raw run/audit data.
- `docs/`: current references and archive pointers.

TypeScript source uses `.ts` files with intentional `.js` import specifiers; see [`docs/typing.md`](docs/typing.md).
