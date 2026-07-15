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

- **Persistent level id, replacing array-index identity — proposed design now written up,
  supersedes the fingerprint-keying idea below (2026-07-12).**
  [`level-id-unification-plan.md`](level-id-unification-plan.md): `data/levels.json` is still
  ordered-array-indexed for level identity (the hints split already landed — see
  `data/hints/<NNNNN>.json`, keyed by 1-based level *number*, not fingerprint), and — a finding
  from this pass — so are *both* stress corpora's local hint directories, despite each already
  carrying an `id` field (`S00001`/`R00001`) that nothing currently uses for storage. Originally
  scoped here as "key by `getLevelFingerprint()` instead" (the model `level_ratings` already uses),
  but the fuller writeup found that doesn't actually work as a persistent identity: fingerprint is
  a *content* hash — edit one block and it changes, silently orphaning that level's ratings/local
  hints under the old hash. A real `id`, assigned once and never recomputed, is what the goal
  ("level reordering/deletion is a non-event") actually requires. **Still not started** — the plan
  doc's own sequencing recommendation is stress corpora first (low risk, ids already exist) before
  touching the published corpus (needs the live hint-fetch path to change in lockstep, a
  live-game-breaking risk class if rushed). Governing invariant if it's ever picked up: no artifact
  may be keyed by array position.

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

## Solver dev-tooling

- **[`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) — all components A-G shipped
  2026-07-10.** Curated smoke suite (`npm run stress:smoke`), documented tier-selection workflow
  (`docs/testing.md`), mechanic-based targeted test selection (`--filter-mechanic=`),
  telemetry-driven level-priority ranking (`npm run stress:rank-levels`), richer diff-baseline
  explanations, an independent reference/oracle solver (`npm run oracle:fuzz`, zero shared code
  with `modules/solver`, verified clean across 600 random levels), and an automatic level reducer
  (`npm run stress:reduce-level`, witness-guided free shrink + solver-in-the-loop delta-debugging,
  verified against Corpus 2's `R0024`) are all built and verified — see that doc for the full spec,
  invariants, and what each verification run found. Production portfolio-based solving was
  considered and explicitly deferred (see that doc's "Deferred" section) pending evidence of an
  actual latency problem. **Also shipped 2026-07-10** (that doc's "Cheap-tail follow-ups" section):
  the five remaining concrete, cheap ideas from the *original* regression-testing brainstorm —
  isolated fresh-process retry on failure (`retry-isolated.mjs`, wired into `stress:regression` and
  `stress:diff-baseline -- --retry-failures=`), deterministic seeded sampling
  (`stress:benchmark -- --sample=N`), a failure-inbox promotion pipeline
  (`data/stress/failure-inbox.json` + `npm run stress:failure-inbox`), budget-edge stability
  classification (`npm run stress:classify-stability`), and empirical worker-count tuning
  (`npm run stress:tune-parallelism` — found N=3 fastest on this sandbox's 4 cores, confirming the
  existing `availableParallelism() - 1` default is already at the empirical optimum, not just a
  reasonable guess).

## Solver algorithmic research

- **[`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) — 4 of 5 items
  probed against real data, zero shipped to solver code (2026-07-11).** Cross-checked three
  external CP/planning/SAT literature surveys against the actual solver code: what's already
  implemented (sometimes more rigorously than the surveys assumed — the MST lower bound, the
  QD-style variety search, the delta-debugging reducer), what's a genuine gap, and how the existing
  solution-data infrastructure (saved hints, heatmaps, level/solution-space fingerprinting) lowers
  the cost of prototyping each gap. Every item below now has a concrete verdict from an actual probe
  (see the doc's "Suggested order" for the up-to-date priority read, which supersedes the original
  pre-probe ranking): **homotopy-class path signatures** — confirmed real, strongest evidence,
  build first; **learned portfolio selection** — a real 79%-wasted-attempt-time finding stands on
  its own, plus a moderate single-feature signal (`navDensity`) not yet strong enough to act on at
  n=85, re-test once corpus-2's benchmark quadruples the dataset; **nogood/dead-end learning** —
  a naive cache-key signature was proven unsound by direct instrumented search, needs a harder
  redesign before it's buildable; **articulation-point pruning** — original premise refuted
  (negative correlation), redirected form (corridor-capacity bound) not yet re-probed;
  **state-dominance/transposition caching** — still not worth pursuing, correctness risk too high.

## Housekeeping

- **`data/stress/regression-set.json`'s pinned "known-hard" baseline was stale — re-baselined
  2026-07-10.** A fresh `stress:regression` run found 13 of the original 15 "known-hard" levels
  now solve (repair-search work landed after the original pin — see `data/stress/README.md`'s
  Shipped section) and zero regressions. Pin file updated to match; only S033 and S043 remain
  `expected: unsolved` (the confirmed combinatorial-wall cases). **Still open:**
  `stress:regression` isn't wired into `npm run ci`, so this kind of staleness will recur silently
  unless either the check gets wired in or a recurring reminder is added — not done as part of
  this refresh, since it's a policy decision (CI runtime budget) separate from the data fix.
