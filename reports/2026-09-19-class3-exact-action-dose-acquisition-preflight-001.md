# Class-3 exact-action dose acquisition preflight 001

> **Status:** active
> **Last evidence:** 2026-09-19 — current-boundary expectation freeze and maintained-producer audit, zero solver search.
> **Decision:** the exact 23-parent/24-rescuer join and reducer are frozen; only a production-shaped shared-ladder run can supply the missing dose.
> **Remaining gate:** protocol-compatible compact exact-action participation/work/censoring rows for the frozen parents.
> **Evidence role:** acquisition design, not a capability or promotion result.

## Frozen expectation population

`reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json` freezes 23 current Class-3 parents and 24 exact isolated T1 rescuer identities from production boundary `35066677597`, census `33717910218`, and residual-classification schema v2. It records family reach/starvation context, observability, isolated nodes, and winning gate. Isolated census nodes are context only, never shared-production dose.

Freshness/regeneration paths:

```bash
npm run verify:class3-dose-expectations-current
npm run research:build-class3-dose-expectations -- --atlas=<current-atlas.json> --out=<expectations.json>
npm run research:freeze-current-class3-dose-expectations
```

Do not repeat census archaeology unless boundary freshness is in question.

## Required acquisition

Use a level-blind, production-shaped shared ladder with the production allocation contract, standard compact response, a loose wall deadline, and the frozen IDs. `solver-level-blind-targeted-sweep.yml` is the smallest maintained execution family, but its existing planning canary plus 23 expensive residual parents makes this a bounded GHA acquisition rather than suitable local work. Record the resolved commit, `protocolHash`, solver ref, node/work envelope, exact action `configKey`, `stageId`, allocated ceilings, actual work/nodes, outcome, and censoring. Do not substitute isolated method probes.

After artifact recovery run:

```bash
npm run research:analyze-class3-dose -- \
  --expectations=reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json \
  --in=<failure-response/compact.json> --out=<analysis.json>
```

The reducer fails closed on unknown/mixed protocol or solver identity and mechanically emits: `exact-not-participated`, `exact-participated-dose-unknown`, `exact-participated-censored`, `exact-participated-exhausted-negative`, `exact-participated-solved`, or `exact-participated-indeterminate`. Parent is the independent unit. Error/unresolved mixtures are indeterminate, not negatives.

## Decision boundary

Systematic under-dose/placement starvation may nominate an allocation premise. Verified comparable exact-action dose followed by exhaustion may close the old ambiguity. Missing or censored telemetry preserves the evidence gap. No outcome directly authorizes production promotion.
