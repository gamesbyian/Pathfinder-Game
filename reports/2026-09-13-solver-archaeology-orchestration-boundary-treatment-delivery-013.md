# Solver archaeology: orchestration-boundary treatment delivery

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — April/May option-propagation, rescue-gate, IDA*, divergence-guard, and HK delivery chains traced through commits and audit history
> **Decision:** preserve “consumer-observed participation” as a hard experimental requirement. Pathfinder repeatedly configured mechanisms correctly at plan/orchestrator level while dropping their options at intermediate explicit allowlists or attaching them only to attempts that never executed.
> **Remaining gate:** none for the historical conclusion. Current experiments should verify participation at the final consumer and record nonzero work/effect before interpreting treatment outcomes.
> **Evidence role:** archaeology / experimental-integrity calibration
> **Selection:** historical mechanisms whose intended treatment existed in source but audit evidence later proved it was not reaching the runtime consumer.

## 1. April near-closure and diversification controls were silently dropped

Commit `623552c548b7743492daedec8b47faea4d945290` found four fields that `_prepareSolveContext` extracted but `Referee.solve` failed to place into `solveContext.strategy/flags`:

- `hintLadderState`
- `rootTieSeedOffset`
- `rootOrderingVariant`
- `enableBlueprintPlanning`

The concrete consequences were not cosmetic. With `hintLadderState` absent, `runBaselineStage` always saw `sharedHintLadderState=null`, timeout history never accumulated across outer calls, `repeatedTimeoutOutcome` stayed false, and the near-closure rescue gate **never fired** for L108/L134/L61. Root diversification controls were likewise inert.

The same commit unintentionally activated blueprint planning, which had also been silently disabled by the missing field. That exposed a separate cost problem: full blueprint sweeps made the audit time out. Commit `9b8b9799a9665afcef65669b3570ba58578f82de` deliberately removed only blueprint propagation while retaining the critical timeout/diversification fields.

**Classification:** treatment never running due orchestration-boundary field loss, followed by a distinct treatment-cost problem once one dormant mechanism finally ran. Those are separate causal facts.

## 2. Audit-timeout cascade then caused a bulk “last green” rollback

Commit `f8ab568d57041d3539e0f0b471bfb17636cc8328` restored the tree to the last green audit baseline after every audit from PRs #738-#742 timed out. The rollback explicitly unwound a bundle including:

- the strategy-field propagation above;
- state-signature refactoring;
- validation changes;
- carried timeout accounting;
- portal-overload rescue;
- near-closure threshold changes;
- rescue budget caps;
- intersection-schedule scoring changes.

The commit’s purpose was control-plane recovery: return to a baseline from which changes could be re-landed individually behind green audits. It was **not** a causal verdict that every reverted mechanism was bad.

This is important when reading history. “Removed by the last-green reset” means “lost in a rollback bundle after audit non-completion” unless a later isolated experiment supplies a verdict.

## 3. The same missing-field pathology reappeared in May

After the reset, commit `3f75fbf4e2d74dee9a61a10f03d03d9e9dd451bf` discovered that `solveContext.strategy` was again missing four diversity fields:

- `hintLadderState`
- `rootTieSeedOffset`
- `rootOrderingVariant`
- `forbiddenFirstMoves`

Audits 41-50 had shown `effectiveRootOrderingVariant=null` and the effective ordering stuck on `portalCommitted`. The ladder rotation was being selected outside the cascade but never reached it.

The fix also found `forbiddenFirstMoves` dropped by another explicit allowlist before `_solveInstance`. Even after this repair, the commit documented that nine rescue/recovery callbacks constructed their own option blocks and still did not all carry the field, so end-to-end participation remained stage-dependent.

**Classification:** recurring implementation failure at multiple consumer boundaries, not a failed diversification premise.

## 4. Endgame IDA*: seven audits to get the option to the code that used it

The May endgame-IDA chain is the clearest treatment-delivery case study.

Commit `92c8947462df4155885578dc86fa0caf9537c896` implemented endgame IDA* and wired it to a near-closure/bound-plateau rescue. Subsequent audits repeatedly showed `endgameIDAStarTriggered=false` on L92.

The investigation then localized the failure one boundary at a time:

1. `76a52f39a981af367f9c9e0e7e6ff59ace8df1f7` stopped depending on the brittle rescue mutation and enabled IDA* by the high-intersection archetype.
2. `ebd88a0a82dd7b0344a1bb53ababde74405adf42` added consumer-side observation fields because the plan said IDA* was on but the trigger never fired.
3. `3eeeded2bd68710313b936f3ea278bf4e0101ea2` established the truth table: the DFS reached the intended depth/bound conditions, but `endgameIDAStarOption` was false.
4. `3cce229df4228cf45b59496d3d2216175c8dfa55` found `PathfinderSolver.solve` rebuilt `internalOpts` from an explicit allowlist and omitted every IDA* option.
5. `7acac9b8c785d59773d0d11768c6b0a190d23e4c` found yet another allowlist layer, in `makeSolverPolicy` / `runSolvePass`, where keys could exist but values were still undefined.

Only after those repairs did the intended treatment actually reach `_solveInstance`.

**Classification:** the early “IDA* didn’t fire/help” period is implementation/treatment-delivery failure, not algorithmic evidence. Later measured IDA* behavior, including the weak same-state handoff and frontier-snapshot experiments, is the legitimate negative evidence.

## 5. The pattern repeated for divergence guards

Commit `e6a64524f49ccd187a5df6bf5dd192e00ce6a410` added frontier-snapshot multi-start IDA* plus a cross-attempt prefix-divergence guard. The following audit showed snapshot fires worked but `forbiddenPrefixSuppressions` stayed null even though L92’s observed prefix was identical across retries.

Commit `2e540c1234aaa00645a3be83153bd67a8df8c53c` found the same root cause as IDA*: `forbiddenPrefixes` had been passed into `PathfinderSolver.solve` but omitted from the solve -> policy -> `internalOpts` chain, so `_getNeighbors` never saw it.

**Classification:** guard treatment never ran until the final consumer boundary was fixed.

## 6. Unified HK was configured on attempts L92 did not execute

Commit `285725a3611114e63f2ad0e4c9ad4c5c16b9b2ff` added a unified Held-Karp lower bound and described it as enabled for L92’s high-intersection archetype. Audit telemetry later showed the bound was never computed.

Commit `f20d5c874bee46cd967c8c7f2784f8d48d0d3797` found that `useUnifiedHKBound` had been applied only to `orderedAttempts`, while L92 actually executed prepended archetype attempts. The flag was therefore attached to attempts that did not run. The fix moved it onto the attempts that actually participated and added per-layer telemetry.

**Classification:** treatment assigned to the wrong execution population. Configuration presence somewhere in the plan is not participation.

## 7. Historical implication for negative-result reading

These episodes make four distinct questions mandatory when evaluating an old “treatment”:

| question | failure example |
|---|---|
| Was the option selected? | IDA*/HK selected in plan |
| Did the selected attempt actually execute? | HK attached only to non-running standard attempts |
| Did the option survive every orchestration/policy allowlist? | IDA*, forbidden prefixes, root ordering |
| Did the final consumer perform nonzero treatment work? | near-closure rescue never fired; suppressions remained null |

A “yes” at an upstream layer cannot substitute for the next one.

## 8. Current research rule

For decision-bearing experiments, treatment participation should be demonstrated at the **final behavioral consumer**, not inferred from configuration:

- record resolved treatment identity on the attempt that actually ran;
- record a consumer-side option/value or mode observation;
- record nonzero treatment-specific work/event counts where applicable;
- distinguish “off”, “configured but unreached”, “reached but no-op”, and “reached and exercised”;
- if a result is null before participation is proven, classify it as delivery/incomplete rather than premise failure.

This rule directly supports current WS2’s distinction between not-offered, offered-but-unreached/starved, and reached/comparable-work-failed. The archaeology shows why that distinction is not bureaucratic bookkeeping: Pathfinder has repeatedly spent weeks interpreting treatments that existed in source but never reached the branch where they were supposed to act.

## Bottom line

The April-May monolith era repeatedly lost experimental intent across explicit option-copy boundaries. Some mechanisms were inert for many audits; others were rolled back in bulk when enabling them unexpectedly exploded audit cost. Later research eventually learned to instrument the final consumer and distinguish participation from configuration.

When reading older history, only consumer-observed, exercised treatments deserve algorithmic verdicts. Everything upstream is implementation evidence.