<!-- agent-context-budget: warn=12000 max=24000 -->
# Solver research queryability

> **Status:** current query/read-model contract.
> **Authority boundary:** this document owns query semantics and routing only. Scientific truth remains with questions, workstreams, structured closeouts, premise/asset authorities, experiment ledgers and other named source owners.
> **Primary command:** `npm run research:query -- ...`
> **Regression audit:** `npm run research:queryability-audit`

Queryability means more than being able to grep a document. A stable research relationship is queryable when its endpoints have stable identities, its relationship type/provenance are explicit, and an agent can traverse or compose it mechanically without upgrading lexical similarity into authority.

## Architecture

The query system is a **derived read model** over existing authorities.

It must not become:
- a second question/workstream/evidence registry;
- a place where lexical similarity becomes scientific truth;
- a generic confidence or validity scorer;
- a replacement for specialist evidence contracts;
- a hidden natural-language inference layer.

Use the smallest layer that answers the question:

1. **Known question context:** `npm run research:dossier -- --question-id=<id>`.
2. **Entity/reverse traversal:** `npm run research:query -- --entity=<type:id> [--direction=in|out|both] [--depth=N]`.
3. **Recurring cross-system question:** use a named semantic `--view`.
4. **Can the system answer this class of question at all?** run `npm run research:queryability-audit`.
5. **Historical structural change:** use `--compare-ref=<git-ref>` or explicit snapshots.

Prefer typed selectors such as `premises:P204` or `repositoryRefs:reports/...`. Named semantic views reject ambiguous bare IDs rather than choosing by node order.

## Named semantic views

| View | Answers | Important boundary |
|---|---|---|
| `answerability` | What can advance with no fresh solver/reference execution, with instrument-only observation, with bounded compute, or only conditionally? | Reads canonical workstream Gate class; does not reinterpret `acquisitionNeed`. |
| `impact` | What questions are structurally connected to this premise/question/MO/artifact? | Potential dependency/support impact, not automatic invalidation. |
| `live-successors` | Which structured evidence reports have successor questions still live? | Requires authored successor question edges. |
| `closed-constraints` | Which terminal questions still constrain live questions? | Uses stable question-to-question relations only. |
| `shared-measurements` | Which measurement opportunities serve multiple questions? | Counts authored question/MO joins. |
| `multi-consumed-blocks` | Which frozen research blocks were consumed by multiple questions? | Consumption events retain their own evidence semantics. |
| `ownership-gaps` | Where do stable ownership/provenance links still fall back to lexical discovery or no owner? | A gap is a review signal, not automatically a defect. |
| `non-question-lineage` | Which questionless structured reports author successor artifacts/questions? | Report-level lineage only; does not invent identities for findings inside prose. |
| `support-impact` | Would withdrawal of this evidence source remove necessary support, leave an independent alternative, or remain unknown? | Only explicit `decisionSupport` can establish necessity/redundancy. |
| `coverage` | Is the graph internally resolved and are current workstream gates structurally classified? | Structural/query coverage, not scientific coverage. |
| `system-findings` | What current research-system architecture/lifecycle findings exist under stable derived IDs? | IDs are derived observations, not queue authority. |

Examples:

```text
npm run research:query -- --view=impact --entity=premises:P204
npm run research:query -- --view=answerability
npm run research:query -- --view=support-impact --entity=repositoryRefs:reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md
npm run research:query -- --view=system-findings --query=workstream
```

## Immediate gate class versus acquisition need

These are separate machine dimensions.

The canonical workstream table owns **Gate class**, the immediate operational route:

- `existing-data`: retained evidence can directly advance the gate;
- `instrument-only`: new production-inert observation/instrumentation is needed; this may still require fresh solver execution;
- `bounded-compute`: fresh solver/reference execution is needed for the scientific discriminator;
- `design`: experiment/protocol design must be frozen first;
- `implementation`: required tooling/seam implementation comes first;
- `blocked`: no currently identifiable discriminator can advance;
- `reopen-only`, `method`, `subsumed`, `service`: non-ordinary execution lanes.

Update Gate class whenever the immediate gate changes.

Question `acquisitionNeed` instead classifies population/generation acquisition where the question contract requires it. Do not derive one from the other.

The `answerability` view separates:
- **noFreshSolverExecution:** `existing-data | design | implementation`;
- **instrumentOnly:** `instrument-only`;
- **boundedCompute:** `bounded-compute`;
- **dormantOrConditional:** `blocked | reopen-only | method | subsumed | service`.

## Explicit decision-support semantics

`answeredBy` is an evidence trail. Multiple citations do not prove redundant support and one citation does not prove necessity.

A question may optionally author:

```json
"decisionSupport": {
  "mode": "all",
  "refs": ["reports/example.md"]
}
```

Semantics:
- `all`: every listed ref is required for the current disposition;
- `any`: each listed ref is independently sufficient for the current disposition.

Every `decisionSupport` ref must also appear in `answeredBy`.

Absent `decisionSupport` means **unknown**. Do not bulk-backfill historical questions by reading prose or counting citations.

## Temporal queries

Current graph state cannot prove how it changed. Use an explicit baseline.

Snapshot files:

```text
npm run research:query -- --snapshot > /tmp/query-snapshot.json
npm run research:query -- --compare-snapshot=/tmp/query-snapshot.json
```

Reachable Git refs can be reconstructed directly:

```text
npm run research:query -- --compare-ref=<commit-or-ref>
```

Git-ref reconstruction uses a temporary detached worktree and historical workstream-table compatibility; current authority parsing remains strict.

Snapshots record Gate-class coverage. If either side predates complete Gate-class classification, the diff still reports node/edge and execution/question-owner changes, but **withholds answerability-class transition claims**. Adding the schema later is not evidence that the historical gate itself changed.

Temporal output includes:
- added/removed nodes;
- added/removed typed edges;
- workstream gate-class/execution/question-owner transitions;
- gates newly requiring bounded compute;
- gates newly advanceable without fresh solver/reference execution;
- instrument-only transitions separately.

A structural diff does not establish why a scientific conclusion changed.

Research-system finding snapshots use:

```text
npm run research:query -- --system-snapshot
npm run research:query -- --compare-system-snapshot=<file>
```

Stable system-finding identity hashes durable keys such as kind/path/workstream/dependency/relation. A separate fingerprint detects content change without changing identity.

## Source-shape hardening rule

When a useful query fails, classify the failure before adding machinery:

1. **missing source relationship:** add a stable ID/ref at the existing owner when the relationship is scientifically real and repeatedly consumed;
2. **relationship already structured, query missing:** add/reuse a named derived view;
3. **lexical-only historical evidence:** retain discovery provenance unless a real owner can author the relation;
4. **scientific sufficiency/causality unknown:** leave it unknown rather than infer it from graph topology;
5. **historical change:** compare snapshots/refs instead of inferring from current state.

A source change is earned when it makes an already-real scientific/operational relationship explicit, not merely because it simplifies query implementation.

## Queryability benchmark

`docs/research-queryability-benchmarks.json` owns the stable benchmark questions.

`npm run research:queryability-audit` classifies each as:
- **passed:** mechanically answerable under its stated contract;
- **partial:** machinery exists but the source system intentionally authors only part of the semantics;
- **conditional:** capability exists with an explicit prerequisite such as a historical baseline;
- **known-gap:** query class remains genuinely unmodeled;
- **failed:** a previously claimed capability or benchmark invariant regressed.

The benchmark file itself is validated for schema, unique IDs, known query kinds and known support levels.

Do not convert partials into passes by inventing metadata. Improve the owning source only when a real repeated consumer earns the stronger semantic relation.

## Current bounded partials

Two partial surfaces are intentional:

1. **Research-system finding lineage:** current architecture/lifecycle findings have stable derived IDs and diffable fingerprints, while structured questionless reports expose report-level successor edges. Individual derived findings do not yet author `resolvedBy`/successor links.
2. **Historical support redundancy:** `support-impact` is exact where `decisionSupport` exists. Most historical `answeredBy` trails intentionally remain “unknown sufficiency.”

These are reopen conditions, not invitations to bulk-normalize history.

## Adding query capability

Before adding another generic operator, add a benchmark question and try to answer it with:
- existing graph traversal;
- a small named semantic view;
- an explicit source-shape improvement at the real owner.

A generic query language is not earned while a small set of named views continues to cover repeated decision-relevant questions cleanly.
