# Tooling catalog

> **Purpose:** family-level map for existing developer/research tooling.
> **Named-tool discovery:** `node scripts/tooling-census.mjs --compact --query=<term>`.
> **Full pre-consolidation question→command catalogue:** [`archive/snapshots/tooling-catalog-2026-09-04-pre-consolidation.md`](archive/snapshots/tooling-catalog-2026-09-04-pre-consolidation.md).

Do not duplicate individual script aliases/options here. `tooling-census`, `package.json`, [`../scripts/README.md`](../scripts/README.md), and [`.github/workflows/README.md`](../.github/workflows/README.md) own executable discovery at different levels of detail.

## Choose the smallest tool first

Before adding or launching machinery:

1. Query the concept: `node scripts/tooling-census.mjs --compact --query=<term>`.
2. New/unregistered question: use [`research-question-intake.md`](research-question-intake.md), query `research-status-index --compact --query=<term>`, then `research:dossier` only for a known ID.
3. Solver research: read [workstreams](solver-optimization-workstreams.md); query `research-asset-query.mjs --query=<term>` before generating data. When the question is whether rejected/older policies demonstrate complementary capability, prefer the rebuildable [`solver capability-evidence`](solver-capability-evidence.md) view before rerunning solver work.
4. Before broad/sharded solver compute, estimate the treatment's opportunity population and required informative rows with [`solver-experiment-opportunity-sizing.md`](solver-experiment-opportunity-sizing.md) / `node scripts/experiment-opportunity-audit.mjs`.
5. Choose the smallest population/tool that can falsify or decide the gate; run a representative execution-family canary before scaling a materially new cap/selector/worker path.
6. Escalate only surviving questions to broader/sharded workflows.
7. Before inventing a script, run `node scripts/tooling-census.mjs --orphans` and inspect related current code/reports.

Tool choice does not determine evidence quality. Decision-bearing solver work still follows [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), and [`investigation-report-conventions.md`](investigation-report-conventions.md).

## Tool families

| Family | Front door | Use for |
|---|---|---|
| Validation | [`testing.md`](testing.md); `npm run ci:fast`, `npm run ci`, targeted `check:*` / `test:*` | Implementation correctness and finish-line gates |
| Solver direct/regression | query `solver:direct`, `solver:regression`, `solver:measure-speed` | Named-level debugging, published regression, pinned-work speed measurement |
| Solver research preflight | `npm run solver:experiment-preflight`; [`solver-experiment-opportunity-sizing.md`](solver-experiment-opportunity-sizing.md); `node scripts/experiment-opportunity-audit.mjs` | Treatment/control/config comparability, exact opportunity/headroom, sample sizing, work-envelope checks before scale |
| Solver capability evidence | [`solver-capability-evidence.md`](solver-capability-evidence.md); `node scripts/analyze-solver-capability-evidence.mjs --manifest=<manifest.json>` | Rebuildable current-residual joins over current row reports and historical gain/loss signatures; overlap, unique capability, displacement, and premise nomination without new solver compute |
| Stress/corpus | [`../data/stress/README.md`](../data/stress/README.md); query `stress` | Generation, benchmarks, reducers, lifecycle/failure diagnostics, profiles |
| Compact corpus discovery | `node scripts/corpus-query.mjs` | Corpus summaries, filters, deterministic samples; `--full` only for exact payloads |
| Technique capability/census | query `technique census`, `niches`, `relative advantage`, `temporal stability` | Isolated technique response, capability maps, niche/ownership analyses |
| Scheduling/portfolio | [`solver-scheduling-policy.md`](solver-scheduling-policy.md); query `static portfolio`, `equal work`, `reach` | Fixed-work portfolios, cap/tranche pricing, production reach/value joins |
| Operational comparison | [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md); query `paired trace`, `method probe`, `beam trace` | Bounded behavioral comparisons after outcome/work screening; shared reducers include deterministic divergence, beam frontier overlap, and beam rank/retention divergence |
| Decision observation | `scripts/solver-decision-observation-lib.mjs` | Bounded production-inert decision/rank/retention/work records for D1 and later rejection/retention questions; annotations remain experiment-specific |
| D1 production-inert observation | `npm run solver:capture-d1-decisions`, then `npm run solver:annotate-d1-decisions` | Stage-1 development tooling: verify a requested beam tuple exists in current production policy, freeze its cull decisions/eligibility under unchanged search, then attach exact D1 zero/nonzero/UNKNOWN evidence offline; full-production reach/independent confirmation remains a later gate |
| Work-ladder response | `npm run solver:analyze-work-ladder -- --inputs=... --work-budgets=... --out=...` | MO-004 bounded response curves after a live underdose/threshold/non-monotone ambiguity is declared; not a standing full-corpus sweep |
| Cross-experiment response | `npm run solver:analyze-response-covariance -- --input=... --out=...` | MO-006 offline ancestry-aware gain/loss co-movement nominations; never runtime routing or independent confirmation by itself |
| Exact/reference | query `cpsat`, `reference`, `prefix survival`, `offline replay` | Feasibility labels, counterexamples, bounded exact diagnostics |
| Hints/provenance | `npx tsx scripts/hint-query.mjs --id=<ID>`; query `hint` | Hint generation, diversification, provenance/cost forensics |
| Variant/family | [`variant-level-research.md`](variant-level-research.md); query `family`; mount the off-main dataset with `--variant-family-dataset-root=<worktree>`; run `node scripts/variant-library-evidence-audit.mjs --variant-family-dataset-root=<worktree> --pretty` before decision-bearing whole-trove counts | Family generation/index/query/coverage, parent replay, controlled transformations, mixed-era/content-identity integrity checks |
| Human/editor controlled contrasts | [`human-parent-contrast-research.md`](human-parent-contrast-research.md); `node scripts/human-parent-contrast-pilot.mjs` | Question-first human-origin causal/transfer families; delegates mutation/referee work to `family-generate.mjs`, defaults to temporary output, records evidence role/parent exposure/independence unit |
| Production-search state sampling | `npm run solver:sample-production-frontiers -- --levels=... --depth-fraction=... --picks=... --seed=...` | Freeze multiple distinct states from real beam frontiers before labeling; preserve parent/frontier ancestry and distinguish within-parent detection power from between-parent confirmation |
| New question intake | [`research-question-intake.md`](research-question-intake.md) + `research-status-index --compact --query=<term>` | Pre-ID context/routing; no new authority/queue |
| Research status | `node scripts/research-status-index.mjs --compact --query=<term>` | Existing investigations, dispositions, gates, evidence pointers |
| Research question dossier | `research:dossier -- --question-id=<id>` | Post-ID read-only question/premise/resource/block/evidence/acquisition join |
| Research graph query | `npm run research:query -- --entity=<type:id> [--direction=in|out|both] [--relation=<edge>] [--depth=N]`; semantic `--view=<answerability|impact|live-successors|closed-constraints|shared-measurements|multi-consumed-blocks|ownership-gaps|non-question-lineage|support-impact|coverage|system-findings>`; `--snapshot`; `--compare-snapshot=<file>`; `--system-snapshot`; `--compare-system-snapshot=<file>` | Derived read-only cross-family lookup, reverse traversal, recurring semantic views, and temporal snapshots. Authored edges/sufficiency stay distinct from lexical discovery; snapshot comparison reports structural change rather than inventing scientific causality. |
| Research relations | `research:relations -- --list`; `--relation=<name> [--query=<term>] [--discover]` | Authorities/relations, active premises, authored multi-asset relationship recipes, durable evidence, optional block discovery |
| Research consumption lineage | `research:record-consumption -- ...` | Append use/selection ancestry sidecars; supports matched selections |
| Research enrichment lineage | `npm run research:link-enrichment -- --block-artifact=<path> --artifact=<path> --kind=<observation|exact|treatment|artifact> --out=<path>` | Attach an existing enrichment artifact to a frozen research block by reference only; payload remains owned by its source artifact |
| Research acquisition preflight | `npm run research:acquisition-preflight -- --question-id=<id> [...]` | Conservative route using discovered blocks, audit-grade Resource Contract signals, authored multi-resource joins and existing generator guidance; opportunity sizing can collapse clustered rows by explicit independent unit; never auto-generates |
| Research resolution view | `npm run research:resolution-view -- --in=<analysis.json>[,<analysis.json>...]` | Read-only validated resolution summary with blocker/remediation axes plus causal/common-mode independence ancestry when present; consumes specialist envelopes/vectors and never infers scientific verdicts or confidence scores |
| Research level generation | [`solver-research-generation.md`](solver-research-generation.md); `npm run research:generate-levels -- --list`; `npm run research:match-generation -- ...`; `npm run research:audit-generation-origin -- ...` | One dispatcher over the three independent full-level producers, named multi-source suites that retain separate blocks, outcome-blind static-descriptor matching, and source-recognizability diagnostics; family generation remains a second-stage microscope |
| Research integration audit | `research:integration-audit` | CI cross-system reference checks; no semantic decisions |
| Research question authority audit | `npm run research:question-authority-audit` | Validate question evidence-path references and active/deferred gate shape; warn on live questions missing from current queue/future-work without making semantic reopen decisions |
| Signature-collision analysis | `scripts/signature-collision-analysis-lib.mjs` | Reusable grouping/mixed-outcome/independent-unit accounting for behavioral quotients and nested representation falsifiers |
| Research assets | `node scripts/research-asset-query.mjs --query=<term>` | Existing evidence families, joins, boundaries, entry points |
| Capability demand | `npm run research:capability-demand [-- --json]` | Validate/summarize HARVEST / EXTENSION / INVENTION demand rows and recurrent acquisition nominations |
| Raw artifact metadata | `node scripts/artifact-query.mjs [--query=...] [--role=...]` | Meaning/provenance of tracked raw artifacts |
| Completed GHA result retrieval | `npm run gha:fetch-result -- --run=<run-id>` | Standard result/manifest retrieval without enumerating shards |
| Tool inventory/health | `node scripts/tooling-census.mjs --compact`, `--health`, `--orphans` | Existing tool discovery, surfaced import health, unindexed specialists |
| Completed naming-cleanup status/history | `npm run naming:status -- --batch=<id>` | Completed Phase 0–15 state/history; not current naming authority |

Use `package.json` only when the compact tool query does not expose the alias/options you need. Use directory listings as a fallback, not a discovery default.

## Evidence boundaries

Keep these out of the tooling catalogue's command descriptions; the owning research docs are authoritative:

- **Level-blindness:** exact identity, saved hints, historical per-level outcomes/cost, winner configs, capability-evidence membership/signatures, and variant outcomes cannot steer cold production policy. See [`solver-level-blindness.md`](solver-level-blindness.md).
- **Generalization:** fresh same-generator data is not automatically cross-generator transfer. Human/editor descendants inherit source independence from their parents only at the parent-family level; mutation siblings are correlated and parent exposure still determines whether they are development, confirmation, or transfer evidence. See [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) and [`human-parent-contrast-research.md`](human-parent-contrast-research.md).
- **Capability evidence:** historical gain/loss intersections with today's residual are premise nominations, not current solve claims; row-report comparisons establish only the rows actually observed under their stated protocol. See [`solver-capability-evidence.md`](solver-capability-evidence.md).
- **Allocation:** compare techniques/treatments with `workSpent`; wall deadlines must be non-binding for deterministic search evidence. See [`solver-budget-determinism.md`](solver-budget-determinism.md).
- **Selection:** a population/feature/config/policy selected after outcomes is development evidence until independently confirmed at strength proportional to selection pressure.
- **Known solutions/exact labels:** powerful offline diagnostics, forbidden as hidden runtime lookup. A preserved generation witness proves solvability only; it does not prove solution-space completeness or DEAD alternatives.

A tool's presence does not imply an active hypothesis or a production recommendation.

## Remote execution

GitHub Actions is execution infrastructure; workflow inputs/sharding live in [`.github/workflows/README.md`](../.github/workflows/README.md). A green run is not evidence by itself: retain protocol, population, code/data ref, work envelope, and evidence role. Prefer branch/PR execution.

## Adding or changing tooling

Before adding a script/workflow:

- query existing tooling and orphan candidates;
- reuse shared loaders/parsers/workers/report contracts where they already model the operation;
- use [`change-recipes.md`](change-recipes.md) for telemetry/provenance/persistence/state/worker boundaries;
- expose a compact discovery surface if the new tool would otherwise require directory/package scans;
- document only durable family/contract guidance here, not a dated experiment narrative.

When a tool is renamed/retired, update its actual surfaces and tooling census inputs. Do not retain a second prose alias list in this file.
