# WS1 precommitment-overlap recovery 001

> **Status:** active
> **Last evidence:** 2026-09-25 — recovery of un-PR'd branch `claude/solver-optimization-queue-ybpl88`, commit `49a8773262f3889350766482920038d7fd49e761`.
> **Decision:** quarantine the already-generated seed-`2026092501` population from decision-bearing WS1 confirmation and replace it with seed `2026092591` before any new generation.
> **Remaining gate:** merge the recovered precommitment revision, then implement the one-shot wrapper and generate the replacement population only after that merge.
> **Evidence role:** research-process integrity / precommitment recovery
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Production effect:** none.

## Recovered un-PR'd work

Branch `claude/solver-optimization-queue-ybpl88` has no PR and is one unique commit ahead of its historical base:

- commit: `49a8773262f3889350766482920038d7fd49e761`;
- files:
  - `data/stress/ws1-late-continuation-single-001.json`;
  - `data/stress/ws1-late-continuation-single-001-ids.txt`;
- generated parent count: **160**;
- IDs: `U00001` through `U00160`;
- master seed: **2026092501**;
- question id: `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`;
- block id: `ws1-late-continuation-single-001`;
- evidence role: `confirmation`;
- population identity: `sha256:a6bdc8eb73c8c53e7f557eb97b4cfd2dd81395811d5f4644a01d70fa0e796ab7`;
- no solver run was executed.

Claude's commit message proposed dispatch via `solver-level-blind-targeted-sweep.yml`. That execution route is superseded by the corrected plan because the frozen-model scorer requires the Stage-A-compatible `portfolio-solve-sweep.mjs --scheduler-mode=production` attempt-row surface.

## Generator freshness check

The generation implementation used by Claude is not stale relative to current main. Blob identities are identical between Claude's base and current main for:

- `scripts/research-level-generation.mjs`;
- `scripts/research-level-generation-lib.mjs`;
- `scripts/stress/generate-random.mjs`.

So the recovered block is a valid deterministic realization of that seed/configuration. The problem is temporal precommitment, not generator compatibility.

## Why quarantine is required

The final corrected confirmation plan merged after this population already existed on an un-PR'd branch. An earlier default-branch-only code search incorrectly concluded that `2026092501` had no prior use.

No solver outcome exists, and the plan correction was driven by:
- the breadth-floor power arithmetic;
- Stage-A producer/row semantics;
- plan-quality closure requirements.

Nevertheless, once a population exists before final precommitment, its structural content is in principle inspectable. Treating it as an unseen confirmation block would overstate the independence of the test.

Therefore:
- do not merge the recovered corpus/IDs into the decision-bearing execution path;
- do not use its structure, mechanics, apparent difficulty, or any future solve result to tune the confirmation protocol;
- retain the branch/commit as historical recovery evidence;
- generate a replacement block only after the revised precommitment is merged.

## Replacement precommitment

Replacement seed: **2026092591**.

Before freezing it in the recovery revision:
- default-branch code search found no occurrence;
- repository commit search found no occurrence.

The scientific protocol otherwise remains unchanged:
- N=160;
- random witness-first generator;
- evidence role confirmation;
- block id `ws1-late-continuation-single-001`;
- U namespace;
- >=3 nominated-parent breadth floor;
- >=5% captured pre-winner work;
- zero winner endangerment;
- <=35% single-parent nominated-work concentration;
- same-stage late continuation majority;
- Stage-A-compatible production portfolio producer;
- frozen model unchanged.

## Recovered useful implementation work

A separate stalled branch, `chatgpt/ws1-single-stage-confirmation-wrapper-2026-09-25`, contains deterministic postprocessing improvements that are independent of the contaminated seed:
- frozen-model output now exposes nominated-parent breadth and per-parent nominated-work concentration;
- the existing model contract tests those fields;
- a dedicated confirmation evaluator applies the preregistered WS1 pass/fail criteria.

Those changes are safe to recover because they encode criteria frozen by the plan rather than adapting them to the generated `2026092501` population. The evaluator is updated to the replacement seed.

## Closeout rule

The quarantined block remains historical evidence only. It does not become a development sample after the fact, and it does not create a second chance to inspect outcomes before the replacement confirmation. Any future use requires a separate question and evidence-role decision.
