# PG-D: canonical-referee differential for the ordinary trail-switch reduction

> **Status:** superseded
> **Last evidence:** 2026-10-17 — 903/903 toy path/subset representations agreed under stripped mechanics; 2026-10-17 canonical-referee test underway on full-level accepted witnesses.
> **Decision:** (Pre-registered gate completed in [PG-D result 001](2026-10-17-pg-d-canonical-switch-referee-result-001.md).) No production trail/ZDD engine until the toy reduction has been confronted with the canonical Pathfinder referee and a *novel* real-prefix consequence has been established independently of existing prunes.
> **Remaining gate:** count actual referee-accepted ordinary-path witnesses and all counterexamples; then price a concrete exact-DEAD prefix consequence beyond ordinary connectivity/BC1. Unsupported portals must abstain, never report impossibility.
> **Research question:** `WS2-TRAIL-SWITCH-FEASIBILITY`
> **Evidence role:** discovery
> **Population identity:** deterministic corpus-order first 500 levels of Corpus-2 and all 160 published, up to three persisted hint paths per selected level (not independent outcome-blind solve-rate sampling).
> **Selection:** complete indicated parent slices, first three stored paths for each; every included witness independently checked against current canonical PLAY referee; positive controls are published retained accepted hints, not new cold solutions.
> **Inference scope:** necessary ordinary-edge switch-route relation on complete accepted trajectories with *no non-ordinary transitions*, including samples with other supported mechanics; not a general full-game switch model or incremental pruning proof.
> **Production effect:** none.

## Preregistered test and known failure modes

The independent research implementation `scripts/research-trail-switch-toy.mjs` exhaustively matched 903 small independent toy walks, including real crossing revisits. That limited result does not establish correspondence to the production rule engine, particularly on portal jumps or axis history.

The current experiment uses `scripts/stress/pg-d-canonical-referee-trail-switch.mjs` and a disposable [GitHub Action](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39078716122). From the first 500 ordered records of each source (published has only 160), it evaluates up to three stored hint paths per parent, first passing them through `validateCanonicalPath` on a correctly `prepareLevelForSolver`-normalized actual board. It then independently converts each accepted path into an ordinary undirected edge set and checks vertex degrees, straight H/V degree-four pairings, exact single-switch-strand traversal and edge-use uniqueness. Input has **no prior CP-SAT answers, outcome-driven case nominations or technique routing**.

A real accepted path containing any non-orthogonal/portal move is **unsupported**, not a static-refutation of the level. Invalid/stale persisted paths are also excluded from the positive-reference numerator and counted separately. Synthetic duplicate-edge mutations of referee-accepted ordinary paths must fail in both the independent static checker and canonical referee, supplying negative controls.

The decisive alarm is **even one referee-valid, non-portal accepted path rejected by the static switch-route condition**. Such an alarm forbids any hard-pruning descendant pending source-level reconstruction. Zero alarms is a useful *bounded differential*, not formal proof for untested full-mechanic states. Portal-free hints among portal-bearing boards can be accepted as ordinary trajectories, not evidence about portal-using routes.

Do not build Graphillion/ZDD, a general trail solver, or a production prune from this alone. Even a positive referee differential cannot establish novelty over BC1/BC1-VX: the real next falsifier must exhibit an **exactly labelled prefix**, with known actual branch eligibility, where a sound cheap switch-derived necessary condition rejects beyond the existing production gauntlet, and show that this occurs before expensive search is lost. If zero such concrete witness is found, close the current structural condition as economically redundant and keep higher-level joint-feasibility research separate.
