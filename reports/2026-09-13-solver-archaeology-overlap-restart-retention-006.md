# Solver archaeology: overlap, restart value, and unfinished retention gate

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — overlap/restart archaeology confirmed an unfinished categorical-state retention line alongside closed historical mechanisms.
> **Decision:** preserve the unfinished retention premise as a scoped research lead; make no production or priority change from archaeology alone.
> **Remaining gate:** reconcile the unfinished retention projection against current WS4/Class-5 evidence before any solver-policy change.

## 1. August full-pool categorical-state projection is genuinely unfinished

The 2026-08-24 beam-extinction descriptor line progressed beyond scalar feature brainstorming.

Four exact A/D dead-top/live-alternative parents (`S00001`, `S00030`, `S00048`, `R00104`) falsified several scalar stories. A follow-up replay then showed that MustCross first-pass phase separates only one of the four pairs, local pending-MustCross H/V corridor availability separates none, and the selected pairs instead differ heterogeneously in cheap state already maintained by beam (`mpVisitedMask`, `adjTurnMask`, intersection phase, and one MustCross first-pass case).

That result explicitly redirected the question from pairwise classification to a set-level retention counterfactual: preserve the complete ranked extinction pools, then compare a tiny prespecified family of low-cardinality bucket keys at the same width. Required controls were bucket cardinality, singleton share, exact-live survivor retention where labels exist, random reserve, and modest width-only expansion.

The tooling was then extended specifically to make that experiment executable. `winning-lineage-pilot.mjs` gained `--retain-ranked-pool-details` and an explicit `--level-ids` selector, and the readiness report recorded the exact intended command and output path (`reports/stress/beam-extinction-full-pools-2026-08-24.json`). The branch `chatgpt/beam-descriptor-projection-2026-08-24` ends at the reconciliation commit after the descriptor projection; it contains no unique later execution.

Repository and commit searches find no committed full-pool artifact, projection result, or later verdict. This is therefore a clean unfinished experiment, not a historical null.

### Archaeological disposition

High-value unfinished observer/counterfactual gate. It is materially different from the later WS4 scalar/bucket canaries because its question is whether a small categorical state-phase representation preserves exact-live alternatives at fixed historical extinction boundaries, with singleton and width controls designed in advance.

Do not infer that it should become a production retention mechanism. First reconcile it with the current WS4 closure and current Class-5 exact-labelled cases. The useful first step remains read-only fixed-width projection.

## 2. April/May basin-overlap evidence was repeatedly compromised before behavior could be judged

April introduced direct portfolio-diversity telemetry: `pairwiseStateOverlap`, `branchDecisionCorrelation`, family coverage, distinct profile/family counts, oscillation counts, and deterministic attempt identity/seeds.

The first data were invalid. `toAuditRefereeAttemptHistory` stripped the policy identity fields and `rootMoveScores`, causing `distinctProfileIdCount=0` and `pairwiseStateOverlap=1` mechanically. Commit `5f560878...` repaired those exact transport defects and moved diversity calculation to referee-attempt granularity.

No later committed Gate-B interpretation using the repaired telemetry has been found. Current `main` no longer contains the historical observer. Therefore April does not supply a clean corpus-level answer to whether nominally different attempts actually explore different basins.

May independently rediscovered the same concern on L92: retries were reported as nearly identical (`pairwise overlap ~1.0`), leading to a cross-attempt prefix-divergence guard. That behavioral experiment then suffered a long chain of delivery failures:

- `forbiddenPrefixes` was omitted from the internal option allowlist;
- prior-attempt prefixes were dropped from cross-iteration hint-ladder state;
- raw `attempts[]` passthrough briefly caused a catastrophic audit serialization regression and was reverted;
- a safe shallow attempt projection was later built to restore the carry path.

The history proves repeated same-basin concern and repeated control-plane failure. It does not provide a clean general negative on anti-redundancy.

### Archaeological disposition

Recover the *observer question*, not the old guard. A modern basin-overlap observer should use canonical current action identities, prove treatment/row participation, and compare actual state/trajectory populations among nominally distinct current actions on residual misses. No anti-redundancy policy is justified before that measurement.

## 3. Frontier snapshots: one descendant was eventually tested cleanly enough to close its specific consumer

March's old checkpoint/restart idea later reappeared in May as beam frontier snapshots handed to endgame IDA*.

The first implementation was not trustworthy because snapshot firing was silently suppressed by an undeclared/incorrect `startTime` budget calculation. After that was fixed, audit telemetry showed snapshots were captured and the multi-start fallback actually ran. A later audit cited in commit `2e540c...` reports L92 attempts D-G with snapshot fallback `fires=2`, `tried=2`, all exhausting.

That is real negative evidence for the specific form:

> promising beam snapshot -> same endgame IDA* completion consumer

It does not close producer/consumer handoff generally and does not establish that snapshots lack value for a complementary consumer.

### Archaeological disposition

Keep `snapshot -> same consumer` closed. Reopen only with a materially different consumer or a prior observer showing that a preserved frontier regime contains information the proposed consumer can exploit.

## 4. Restart versus continuation contains a regime-dependence result, not a reusable restart policy

The August restart/continuation line is unusually informative when read as an allocation experiment rather than a retired strategy.

At `W=16,000,000` canonical work on a 20-level near-miss residual stratum, continuation and a 50/50 fresh-seed restart were indistinguishable after a best-badness aggregation bug was corrected. The initial apparent continuation advantage was explicitly retracted.

At `W=64,000,000`, the same frozen near-miss population produced a real difference: continuation solved 1/20 versus restart 3/20. A prespecified confirmation on the disjoint remaining 23 rows reproduced and strengthened it: continuation 2/23 versus restart 5/23. Pooled: continuation 3/43 (7.0%), restart 8/43 (18.6%), five restart-only gains, zero losses.

The attempted production translation correctly asked whether that advantage survives the actual production-scale work envelope. Repair-specific accounting showed the relevant ladder could consume roughly `W=140-160M`, so a fresh `bestBadness 7-9` population was tested at `W=150,000,000`. Result: 9/36 versus 9/36 on the identical solved set. The production candidate was closed.

This means the historical result is not “restart is good” or “restart is bad.” Action value changed with work/population regime:

- no detected effect at 16M;
- clear, independently replicated restart advantage at 64M on near-misses;
- no advantage at 150M on a harder residual band.

Because the 150M population differs from the 64M population, the history cannot identify whether the effect is primarily work-dependent, residual-band-dependent, or their interaction. But it does establish that a global restart disposition throws away useful structure.

### Current implication

Current WS0 is correctly closed in tested production forms. The reusable archaeological premise belongs in WS2 allocation: continuation value can be highly state/regime dependent, so fixed action identity alone may be an inadequate allocation signal.

A modern revisit should not retest generic restart. It should first ask whether legal current-solve observables identify regions where marginal continuation value collapses while a fresh trajectory retains value. Basin novelty/progress is a more promising bridge than retry count.

## 5. Synthesis

These three lines converge on a narrower research question:

> Is the solver spending fixed work repeatedly inside the same qualitative future regime, while a different represented regime or fresh trajectory still has completion value?

The old evidence supplies three distinct pieces:

1. beam extinction may discard candidates occupying cheap categorical state phases not represented by the coarse retention key;
2. historical attempts/retries were sometimes suspected or measured to have very high overlap, but the general observer was never cleanly completed;
3. restart value was strongly regime-dependent under fixed work rather than globally monotone.

This does **not** reopen generic beam diversity or generic restart. It nominates a current observer problem: measure qualitative regime/basin novelty and marginal progress before deciding whether work should continue, restart, or preserve a different categorical survivor.

## Smallest modern follow-ups

1. Reconcile the unfinished August full-pool projection against current WS4/Class-5 evidence; if still non-redundant, run it read-only with the originally prespecified controls.
2. Rebuild only a current basin-overlap observer, not the old divergence guard. Measure whether nominally distinct actions/retries really explore distinct state populations on current residual misses.
3. Join overlap/novelty with within-action progress under canonical `workSpent`. Ask whether the historical 64M restart-positive phenotype corresponds to measurable saturation of the continued trajectory.
4. Keep all behavioral changes gated behind those observations. The archaeology earns measurements, not production policy.
