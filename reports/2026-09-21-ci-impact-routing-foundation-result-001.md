# CI impact routing foundation result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — the impact-routing foundation, ownership model, classifier, planner, and zero-unclassified inventory were implemented and exercised while scoped CI remained disabled.
> **Decision:** retain the conservative impact-routing foundation and continue through shadow validation before any execution-skipping activation.
> **Remaining gate:** validate the routing model against historical/recent PRs and live shadow runs before enabling scoped CI.

> **Branch/PR:** `chatgpt/ci-impact-routing-foundation-2026-09-21` / #1965.

## What is now true

Pathfinder has a machine-readable validation ownership model, a conservative source-impact model, semantic package-diff handling, tracked-path coverage enforcement, and a data-driven validation planner. None of these currently remove validation from PR CI.

### Validation ownership

`scripts/validation-groups.json` is an exact partition of the current permanent aggregate commands.

Current branch counts:

- **27/27** members of `check:validators`;
- **164/164** members of `test:node`;
- zero omitted members;
- zero registry-only members;
- zero duplicate ownership.

`check:dead-scripts` invokes the parity checker, so aggregate/registry drift fails mechanically.

### Tracked-path impact coverage

The current branch contains **10,285 tracked blobs**. Every tracked path matches either exact registered-entrypoint ownership or an explicit/fallback source-impact rule.

- **0 unclassified tracked paths**.
- New paths inside known broad areas inherit their conservative area rule.
- A genuinely new/unmatched surface still classifies as full impact.
- `check:ci-impact-inventory` now enforces zero unclassified tracked paths in the ordinary validator graph.

### Change semantics

The classifier now handles:

- additive/modifying/deleting paths;
- rename/copy records by unioning old and new path ownership;
- malformed/unknown change status by broadening to full;
- production-solver producer propagation to research consumers;
- exact ownership for registered validation entrypoints;
- first-class game, persistence, solver, research, data, repo, and shared surfaces;
- full-impact CI/router/config authorities.

### package.json

A `package.json` edit is no longer automatically equivalent to a dependency/toolchain change.

- Any non-`scripts` mutation remains **full impact**.
- Opaque script commands remain full.
- Script commands reaching unknown/full-impact entrypoints remain full.
- Script-only mutations can inherit impact from known local entrypoints.
- `scripts/run-bundled.mjs` is transparent when merely used as a command wrapper; changing the wrapper itself remains independently impactful.
- Universal gate composition changes such as `check:validators` still reach CI infrastructure and therefore remain full.

Historical base/head inspection confirmed that #1961, #1960, and #1954 changed only research/test script registration, while #1964 changed the universal validator composition and remains correctly broad.

### Persistence split

Persistence is now a first-class impact surface rather than a hidden part of generic game validation.

- `modules/persistence/**` => game + persistence.
- Firestore rules/index/emulator authority => repo + persistence.
- Firebase client config => game + persistence.
- Firestore Node harness ownership moved from game to persistence.
- The stress/probe corpus loader moved from game ownership to data.

This creates an explicit seam for avoiding Java/Firestore startup on unrelated UI/game changes.

### Validation planning

`scripts/ci-validation-plan.json` and `scripts/ci-validation-plan.mjs` convert semantic surfaces into validation obligations.

Initial conservative capabilities:

- research/repo changes: semantic validators/harnesses plus lint;
- game: game contracts + covered unit population + production build;
- solver: solver/research contracts + covered unit population + all deep proofs + production solver canary + production build;
- persistence: persistence contracts + Firestore boundary;
- shared: shared contracts + covered unit population;
- data: data contracts, with runtime-data source rules independently escalating to game/solver/research where appropriate.

Lint remains universal in this first planner. Fine-grained coverage/proof selection remains deferred.

### Git-diff entrypoint

The classifier can now consume a real Git diff:

```bash
node scripts/ci-impact-classifier.mjs --git-diff <base-ref> <head-ref> --json
```

The diff parser preserves rename/delete semantics and automatically compares package revisions when `package.json` changes.

## What is deliberately NOT enabled

- No PR job is skipped.
- No branch-protection/required-check behavior is changed.
- `ci.yml` still executes the existing broad gate.
- `main-push-validation.yml` remains broad.
- premise-map path routing is still independent.
- full-vs-scoped disagreement telemetry does not yet exist.

## Next gate

Before enabling scoped CI:

1. run a larger recent-PR backtest through the Git-diff entrypoint;
2. inspect any repeated broad fallbacks or surprising surface unions;
3. benchmark `test:node` bounded concurrency separately;
4. design the small always-running routing/meta job and one stable final required status;
5. shadow-run the planned scoped obligations while still executing full CI;
6. only then allow irrelevant jobs/steps to skip.

The system is now sufficiently explicit that the next work should optimize evidence and execution, not invent another ownership layer.
