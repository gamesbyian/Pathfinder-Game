# Future Work

A compiled index of genuinely open, non-stale work — pulled out of the various completed-plan
docs in [`docs/archive/`](archive/) so it isn't lost when those docs stop being read. Each entry
names where the detail lives; this file is the index, not the design doc.

> **Currently active:** solver speed/determinism work. See
> [`solver-architecture.md`](solver-architecture.md)'s "Solver speedup & robustness backlog"
> section for the live status board (done/scoped/not-scoped) — not duplicated here since it
> changes with that work.

## Security

- **Admin custom-claim production cutover.** `isAdmin()` currently accepts a Firebase custom
  claim (`admin: true`) *or* a legacy admin-email fallback (a no-lockout transition). Remaining:
  provision the claim in production, then delete the email fallback from `firestore.rules` and
  migrate the client-side email check (`review-repository.js`, UX-only) to read the claim.
  Ops-blocked (needs Firebase Console access), not code-blocked. Full procedure:
  [`firestore-security-model.md`](firestore-security-model.md) "Admin custom-claim migration".
- **Emulator-backed Firestore rule tests.** The current suite (`scripts/firestore-rules-test.mjs`)
  is source-level characterization + negative-case guards, not behavioral tests against the
  Firebase emulator. Deliberately deferred — needs emulator + CI wiring, and the payoff only
  lands when the rules actually change. Revisit alongside the next `firestore.rules` edit, not
  proactively. See [`testing.md`](testing.md) "Gaps / roadmap" and [`security.md`](security.md).

## Data layout

- **Fingerprint-keyed hints/heatmap store, replacing array-index identity.** `data/levels.json`
  is still ordered-array-indexed for level identity (the hints split already landed — see
  `data/hints/<NNN>.json`, keyed by 1-based level *number*, not fingerprint). A further split
  keyed by `getLevelFingerprint()` (the model `level_ratings` already uses successfully) would
  make level reordering/deletion a non-event instead of a renumbering diff. **Deferred by owner
  decision until the level corpus stabilizes** — do not build this preemptively. Governing
  invariant if it's ever picked up: no artifact may be keyed by array position.

## Hint tooling

- **Hint-corpus-expansion Phase 5 (optional targeted top-ups).** Generators A (randomized-restart)
  and B (prefix-anchored completion) are done and in production use (`npm run hints:expand`).
  Optional further generators — symmetry maps for invariant levels, crossover between compatible
  known hints, waypoint/order construction for specific missing must-pass/must-cross orders —
  should be driven by explicit gap reports from A/B, not built speculatively. See
  [`hint-curation.md`](hint-curation.md) "Relationship to hint discovery / corpus expansion".

## Solve-button variety

Phases 1–4 are shipped and in production (see [`solve-button-variety.md`](solve-button-variety.md)).
Open, not stale:

- **Complete-DFS hard safety ceiling** (node/time) for "Find all" — nothing currently stops an
  unbounded run on a pathological level if the user never cancels. Safety-relevant; highest
  priority of this group.
- **Phase 5 tuning** — tier → (node budget, restarts, seeds, time ceiling) calibration; current
  values are first-pass defaults.
- **Tier numbers + ceilings** — exact curator targets (5/25/100?) and per-tier time budgets.
- **Does the 1,000-hint cap lift for "Find all"?** Currently caps and reports `capped` (not
  truly "all") on solution-rich levels. Recommendation in the doc is to keep the cap; revisit only
  if a maker explicitly wants an uncapped dump.
- **Complete-enumeration size threshold** — the navigable-area/branching estimate below which
  exhaustive mode is attempted at all.

## Housekeeping

- **`stress/regression-set.json`'s pinned "known-hard" baseline is stale** — many pinned levels
  now solve (unrelated to solver-source changes; the pin file just hasn't been refreshed).
  `stress:regression` isn't wired into `npm run ci`, so staleness like this goes unnoticed until
  someone runs it by hand. Re-baselining the pin file (and/or wiring the check into `ci`) is a
  separate task from any solver-speed work. See `stress/README.md`.
