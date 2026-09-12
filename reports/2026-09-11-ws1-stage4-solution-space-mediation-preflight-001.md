# WS1 stage 4 solution-space mediation preflight 001

> **Status:** active
> **Last evidence:** 2026-09-11 — stage 3 produced reproducible plain-vs-mechanic-buckets sibling-response flips for `R02687`/objectiveFirst and `R02094`/intersectionHarvest across 4/5 existing family modes per parent; static object counts and simple portal-use timing did not mediate them.
> **Decision:** the next WS1 step can reuse saved evidence and retained raw family definitions before any new solver search. Freeze a small theory-driven solution-event analysis first; do not sweep a large descriptor library.
> **Remaining gate:** join the retained raw family siblings to the committed 20M Stage-3 result files, compute the two prespecified event-order/basin descriptors below, and test whether they separate retention-policy response within parent/mode. If not, advance to bounded operational first divergence.
> **Evidence role:** prespecification for cheap offline mediation. No production routing claim and no new solve compute.

## Existing evidence to reuse

Raw family variants were intentionally not copied into `main`; they remain on retained branch `claude/variant-levels-solver-insights-tpk4qg` under `data/families/corpus2/` for the five existing modes of each parent.

Committed Stage-3 outcomes and solved paths are under:

`reports/stress/ws1-stage3-isolated-resolve-001/`

Use only the informative **20,000,000-work-unit** result files. The earlier 2M files are calibration evidence for an inadequate-work floor and must not be mixed into mediation.

Parents/config pairs remain frozen:

- `R02687`: `beam|score=objectiveFirst|bias=none|width=5000|retention={plain,mechanic-buckets}`;
- `R02094`: `beam|score=intersectionHarvest|bias=none|width=5000|retention={plain,mechanic-buckets}`.

Do not add a third pair or generate new variants.

## Unit and comparison contract

The variant sibling is the observational unit, nested inside parent and family mode. Parent direction is already known to reverse, so do **not** pool the two parents into a single global coefficient that assumes one retention policy is universally better.

Classify each sibling from the frozen Stage-3 outcomes as:

- plain-only solve;
- mechanic-buckets-only solve;
- both solve;
- neither solves.

The mediation question is strongest on the exclusive-response siblings. Both-solve siblings may be used as within-mode controls for descriptor range; neither-solve siblings have no solved path and therefore cannot contribute path-event descriptors without new search.

No exact level ID, family ID or historical outcome may become a production routing input. This is diagnostic evidence only.

## Prespecified descriptor 1: mechanic event-order signature

For each stored solved path, replay only enough level semantics to extract the ordered first-occurrence sequence of mechanic events:

- `M`: first satisfaction/visit event for a must-cross cell;
- `P`: portal traversal/use event;
- `X`: self-intersection event when the path creates one.

Retain repeated event types when they represent distinct mechanic events, but collapse ordinary non-mechanic path steps. Record both the raw event sequence and event positions normalized by solution-path length.

Primary summaries, fixed before looking at separation:

1. fraction of must-cross first-events occurring before the first portal traversal;
2. median normalized path distance from each must-cross first-event to the nearest portal traversal;
3. whether the first portal traversal occurs before the median must-cross first-event.

These are deliberately relational. Stage 3 already showed that portal timing alone is non-separating, so the question is whether **portal timing relative to must-cross progress** differs between response classes.

## Prespecified descriptor 2: must-cross order rigidity / basin signature

For each solved sibling, represent must-cross progress as pairwise precedence relations among the must-cross cells encountered by the path. Because family transforms can move coordinates, compare structure within each sibling/mode rather than assuming coordinate identity across transformed levels.

Compute:

1. the ordered sequence of must-cross first-events along the solution;
2. for each must-cross event, whether its immediately preceding/following mechanic event is `P`, `M`, `X`, or none;
3. a compact mechanic-basin signature consisting of the event-order string plus the vector of normalized must-cross event positions.

Within each parent/mode, ask whether exclusive-response siblings cluster by the local `M`/`P` precedence texture or by the compact basin signature. The target is a **small recurring relation**, not a high-dimensional classifier.

Do not add graph/placement features during this stage. If these two mechanism-motivated descriptors fail, record the null and move to first divergence rather than feature accretion.

## Analysis discipline

- Preserve family mode as a stratum. A mode sitting at an all-zero or all-solved ceiling is non-informative for response mediation.
- Report every exclusive-response sibling, not only clean examples.
- Treat opposite parent directions as a feature of the question, not noise to average away.
- Do not infer causality from a descriptor that merely tracks generic path length/work. Check any apparent relation against normalized positions and the existing matched-work outcome.
- No new solver runs are needed for this stage unless a stored solution path is missing or malformed; missing evidence stays missing rather than being silently regenerated.

## Advancement gate

**Advance within WS1** if one of the two prespecified relational descriptors recurs across multiple exclusive-response siblings and more than one informative family mode in a parent, with the direction interpretable in terms of retention behaviour. The next test would then be a bounded observer/first-divergence analysis around that exact relation.

**Advance directly to bounded operational first divergence** if neither descriptor separates response after mode stratification. That is a clean negative on the cheap solution-space mediation stage, not permission to search a large feature library.

A descriptor discovered here is still offline research evidence. Any production selector would need a legal generic current-level/current-solve signal plus independent confirmation proportional to the selection pressure incurred.

## Compute boundary

This stage should be data-join/replay analysis only. It reuses already-solved paths and raw level definitions. It does not justify another family solve campaign, a third retention pair, new variant generation, or a broad GHA run.