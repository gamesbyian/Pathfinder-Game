# WS2 execution-readiness closeout 001

> **Status:** active
> **Last evidence:** 2026-09-15 — local implementation and synthetic branch fixtures; no solver experiment
> **Decision:** Class-4 and Class-2 execution tooling is ready for bounded canary/materialization use; no scientific promotion decision is claimed
> **Remaining gate:** run the Class-4 canary, then freeze and run the Class-2 cohort; evaluate the implemented Class-5 observer third
> **Base:** `main@0dd2306` (merged PR #1802)
> **Scope:** bounded Class-4/Class-2 readiness; no broad solve

## Delivered

- Added the default-off `portal-coarse-state-merge-dead-last-retry` after the current final
  multi-seed retry. It is portal-only, starts a fresh additive 50M-node/one-base-work scope,
  reruns the clean configured main ladder, and controls `STRATEGY_PORTAL_COARSE_STATE_MERGE` only
  through the retry-local proxy. Both arms enable the identical funded shell; the separate retry-
  local treatment selector is false in control and true in treatment. Attempts retain the stable stage ID plus nodes and `workSpent`;
  stage lifecycle supplies eligibility, reach, participation, starvation, deadline and work totals.
- Added one plain-Node readiness tool with three modes: Class-4 canary analysis, Class-2 cohort
  materialization, and Class-2 paired economics. The Class-4 analysis encodes the 8-row freshness
  gate, `R01273` path sentinel, non-portal no-op checks, earlier-stage equality, referee validity,
  fresh work and deadline checks. The Class-2 materializer uses control-side participation only,
  excludes the development pair, excludes `R03049` from gain accounting, transfers unused collateral capacity to gain, and
  freezes deterministic IDs and complete provenance, including scheduler mode and worker configuration/count in the freeze identity. The paired analyzer verifies population/config
  identity before reporting participation, gains/losses, target and whole-solve work, paired wall
  economics, downstream partial displacement/starvation, censoring, and the advancement/zero-gain decisions.
- Synthetic fixtures exercise advance, zero-gain/zero-of-eight, stop, insufficient coverage and
  invalid-execution paths. No scientific result is claimed from those fixtures.
- A real orchestration fixture now proves default-off and non-portal no-op behavior, true-final
  stage placement, retry-local treatment configuration, fresh work at dispatch, and lifecycle
  reach. The maintained level-blind producer also emits canonical Class-2 control eligibility from
  normalized mechanics and actual lifecycle/attempt evidence instead of requiring hand-authored
  selection fields.
- Added the Class-5 research observer without runtime routing. It integrates lifted phase along the
  actual open prefix, uses deterministic block/goose/dead-flipper punctures, retains non-integer phase, conditions
  on endpoint geometry, declares branch gauge, and abstains rather than drawing a portal jump.
  Hand-built fixtures cover endpoint-fixed homotopy, gauge shifts, endpoint conditioning and portal
  exclusion. The representation passed those gates; no LIVE/DEAD separation claim is made yet.

## Execution trace and remaining boundary

The active path is solver CLI/workflow config -> the existing normalized ablation transport ->
sequential/worker solve options -> additive orchestration -> attempt and stage-lifecycle rows -> v3
result manifest/retention -> this analyzer. The new runtime flag uses the existing ablation object,
which is already transported as a complete solve option rather than a new environment variable;
the worker returns the complete solve result. The stable stage registry is shared with sequential,
worker classification, result projection and analyzers.

The maintained producer now accepts and retains experiment, question, preflight and declared-stage-
order identity alongside its existing resolved config/SHA/population/envelope fields. The invoking
workflow must supply those declarations before execution. The analyzer derives arm identity directly from maintained sweep documents and
refuses missing population/config/SHA/scheduler identity, global portal-coarse enablement, or any
unintended effective-config difference. This remains a producer-specific use of #1799 retention,
not a second evidence system. The optional oracle-set manifest remains unimplemented. Class-5
evaluation stays behind the Class-4 and Class-2 gates.

## Next actions

1. Run only the Class-4 canary and feed paired primary rows to `ws2-experiment-readiness.mjs
   class4-canary`; stop on any non-advance verdict.
2. Run the Class-2 control-side materialization, commit/artifact-pin the emitted manifest before
   treatment inspection, then run the paired 60-row experiment and `class2-analyze`.
3. Only after those gates, evaluate the Class-5 observer on existing exact-labelled states within
   endpoint/geometry-controlled strata; stop if natural contrasts remain absent.
