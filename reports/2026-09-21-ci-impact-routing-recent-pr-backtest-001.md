# CI impact routing recent-PR backtest 001

> **Date:** 2026-09-21
> **Status:** Phase-1 classifier development evidence; no CI skipping enabled.
> **Classifier:** `scripts/ci-impact-rules.json` schema v1 on PR #1965 branch.

## Question

Does the first conservative source-impact model produce plausible validation surfaces on real recent Pathfinder work, and where does it broaden to full validation?

## Method

Replay the changed-file lists of nine recent PRs through the ordered first-match classifier.

`all` means every semantic surface: `repo`, `game`, `solver`, `research`, `data`, and `shared`.

Unknown paths and CI/package/build/router authorities deliberately escalate to `all`. The classifier is not connected to GitHub Actions in this phase.

## Results

| PR | Character | Classified surfaces | Full fallback? | Main reason |
|---|---|---|---|---|
| #1963 | research closeout docs/reports/evidence | repo + research | no | clean research-only surface |
| #1962 | forced-work research analyzer + docs/report | repo + research | no | downstream research tooling |
| #1961 | semantic-forcedness research tooling | all | **yes** | `package.json` changed to register tooling |
| #1960 | forced-work research population/tooling | all | **yes** | `package.json` changed to register tooling |
| #1957 | inverse-question research method/docs | repo + research | no | research authorities/evidence only |
| #1954 | action-selection research tooling/data | all | **yes** | `package.json` changed to register tooling |
| #1947 | production-solver architecture/audit | repo + research + solver + shared | no | real production solver changes plus unclassified shared scripts |
| #1937 | protocol contraction across game/domain/solver/research | all | **yes** | genuine cross-domain change plus `package.json` |
| #1964 | agent-context maintenance policy/tooling | all | **yes** | `package.json` plus repository tooling |

Summary: **4/9** samples route to a scoped set under the deliberately conservative v1 model; **5/9** escalate to full. Three of those five are research-heavy PRs whose full escalation is caused by `package.json`, not by product/solver implementation changes.

## Findings

### 1. The basic semantic split survives contact with real PRs

The easy research-only cases stay narrow without special-casing individual PRs. A genuine production-solver change (#1947) acquires solver/research obligations without automatically acquiring game/persistence validation. The broad protocol-contraction change (#1937) correctly reaches full impact.

### 2. package.json is the dominant false-broadening seam

#1961, #1960, and #1954 are the clearest examples. Their research code and data are downstream consumers, but adding or changing package-script registration touches the same file that owns dependencies/build metadata. The conservative classifier therefore cannot distinguish "new research harness command" from "changed production dependency/toolchain" without looking inside the diff.

This is now measured implementation debt, not merely architectural taste.

Preferred repair order:

1. move validation/research tool registration into a dedicated machine-readable authority if that can be done without adding another drifting source of truth; or
2. as an interim, add tested semantic `package.json` diff classification that treats dependency/engine/build-core changes as full but script-only additions/changes according to their registered validation ownership.

Do not simply classify all `package.json` edits narrowly.

### 3. scripts/ remains a secondary ambiguity seam

#1947 includes four `other-scripts` paths that conservatively add `shared`. This is safe but worth inspecting. The source model should gain durable script-family ownership rather than an expanding exception list.

The validation registry created in Phase 0 is a natural source for some of this information, but executable tools that are not permanent CI members still need ownership.

### 4. Current rules are safe enough for development, not yet for CI selection

The model intentionally over-selects. It has not yet proved rename/delete behavior, mixed package diffs, or complete tracked-path coverage, and it does not yet derive changed files itself from the PR merge ref.

## Next discriminators

Before any scoped CI execution:

1. add direct classifier tests for rename/delete input semantics and rule/config mutation;
2. inventory tracked paths against the rule set and quantify unknown fallback rather than discovering unknowns PR-by-PR;
3. resolve or explicitly retain `package.json` as a full-impact seam;
4. inspect the high-frequency `other-scripts` families and assign ownership where architecture supports it;
5. rerun a larger historical PR sample after those changes.

## Decision

Continue implementation. The v1 classifier is useful as an explanatory/backtest tool, but **does not yet authorize skipped CI**.
