# Action-selection legal-signal capture preflight 001

> **Status:** concluded-positive; development execution completed in `2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md`.
> **Last evidence:** 2026-09-21 — pre-winner oracle census found 94.74% C2 and 87.58% C1 solved-row canonical work before the eventual winning attempt.
> **Decision:** test whether cheap level-blind signals available before each action can capture a material fraction of the pre-winner oracle ceiling in shadow mode.
> **Remaining gate:** the development gate completed from retained evidence. Freeze the selected prior-response+work+next-stage form at min development support 100 for sample-independent confirmation before any live scheduler treatment.
> **Evidence role:** discovery
> **Selection:** current production-boundary C1/C2 attempts; split before fitting or threshold selection.
> **Population identity:** GitHub Actions run `35066677597`, solver ref `16114b80e54233910f34ec2ea8e2c1a41a859eb4`.
> **Inference scope:** shadow predictability/capture on the recorded current production population only; no scheduler promotion.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`

## Parent finding

[Pre-winner work oracle census 001](2026-09-21-prewinner-work-oracle-census-001.md) establishes enormous perfect-hindsight headroom but no ex-ante decision rule.

The next question is:

> Given only information legally available immediately before the next action, can a cheap rule identify enough low-value work to matter without hiding rare winning capability?

## Unit and label

Use an **action boundary within one level** as the observation, with the level as the independent unit.

For each boundary retain:

- current level-derived static features already legal to the solver;
- actions/stages already attempted;
- their outcomes, censoring and canonical work;
- best/final badness or other compact failure response already emitted;
- which next actions are mechanically eligible under current policy;
- remaining total work envelope where available;
- eventual recorded winning action/stage and work-to-win as an offline label only.

Do not expose level ID, historical hint/census membership, stored solution, family outcome or future attempts to the candidate policy.

## First candidate family

Start deliberately simple.

1. **Current-order baseline:** spend exactly as production did.
2. **Static action-order baseline:** fixed reordering or tranche policy with no per-level learned state.
3. **Simple legal-signal rules:** shallow rules over current-input features plus already-observed attempt response.
4. Only if those show held-out value, consider a small learned model.

The target is not classification accuracy. Measure **captured canonical pre-winner work subject to solve-capability protection**.

## Split discipline

Freeze level-level splits before fitting:

- development: choose features/rules/thresholds;
- validation: estimate captured ceiling and rare-winner loss risk;
- preserve C1/C2 source identity and report them separately as well as pooled;
- never split attempts from one level across roles.

A later production-facing treatment requires sample-independent confirmation proportional to any selection pressure introduced here.

## Shadow semantics

This phase changes no search behavior.

A shadow rule may nominate:

- skip/delay an action;
- terminate a tranche;
- jump ahead to a later action;
- protect a complementary action despite low average value.

But recorded downstream success is observational. Skipping predecessors may change later budget/state/context. Therefore shadow savings are an **upper-bound nomination**, followed by a matched-work live test only for a fixed rule that survives validation.

## Admission gate

Before implementing a live scheduler treatment, require all of:

- a material held-out fraction of the pre-winner oracle ceiling is nominated by simple legal signals;
- the signal is cheaper than the work it proposes to avoid;
- rare winning actions are explicitly protected or the observed loss upper bound is acceptably small;
- value is not confined to one selected stage/mechanic stratum;
- the rule beats a simple fixed action-order/tranche baseline;
- required features already exist or have a small production-inert observer seam.

If simple signals capture little of the oracle ceiling, close the dynamic-selector direction despite the huge hindsight reservoir.

## Cross-action redundancy handoff

Use this dataset to rank predecessor/winner pairs by potentially avoidable work. Only pairs with large recurring economic headroom should advance to deeper operational-overlap tracing.

That tracing then asks whether two actions repurchase the same states/facts/failure structure. Do not run an all-actions operational census first.

## Implementation checkpoint — retained-evidence analyzer ready

The first shadow consumer is now implemented as `scripts/analyze-action-selection-legal-signals.mjs`.

It requires no solver execution. It derives action-boundary rows from the retained sweep attempts, preserves the deterministic level-held-out split, and evaluates a deliberately small prespecified family of coarse legal signatures before any learned model:

- next stage;
- prior stage/outcome + next stage;
- prior response/work bands + next stage;
- prior response + next coarse config family.

For each family/support floor it reports held-out pre-winner work nominated and held-out winner levels endangered. These remain observational upper bounds because skipping a predecessor can change downstream context and budgets.

The next gate is therefore execution of this reducer on the frozen C1/C2 production-boundary artifacts and retention of the derived dataset/result, not a new solver sweep.

## No production change

This preflight earns dataset construction and shadow analysis only. It does not authorize action skipping, reordering, dynamic budgeting or a learned selector.
