# Census cross-evidence coding handoff

> **Status:** active
> **Last evidence:** 2026-09-04 — Gates 0A-0F executed by a local coding agent; see `reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md` for the current disposition.
> **Decision:** ready for local coding-agent execution as specified below.
> **Remaining gate:** whatever Gate 0's own conclusion-delta result leaves open (see the rejoin report); Gate 1 only if Gate 0 leaves a stable, interpretable question.
> **Branch/PR:** `chatgpt/census-cross-evidence-research-plan-2026-09-04` / PR #1671
> **Purpose:** finish the deterministic existing-data materialization that the GitHub-only pass cannot execute locally, then run the first bounded solution-profile join only if Gate 0 leaves stable technique-response questions.
> **Solver behavior:** do not change solver policy, defaults, budgets, scoring, retention, pruning, or production scheduling in this handoff.

## Read first

1. `docs/solver-optimization-workstreams.md` — canonical queue and closed forms.
2. `reports/2026-09-04-census-cross-evidence-research-plan.md` — ranked research gates.
3. `reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md` — current partial refresh and missing parity outputs.
4. `docs/technique-census-analysis.md` — census analyzer contract.
5. `docs/solver-solution-profile.md` — solution-profile fields, freshness, provenance/leakage boundary.
6. `docs/variant-level-research.md` — only if Gate 3 is reached later; the bulk family dataset is off `main`.
7. `docs/solver-research-post-naming-resumption.md` — normalize historical attempt/stage/routing identities at owning compatibility boundaries.

Do not start from an old solver-development branch. Work from current post-PR main/branch state and current executable names.

## One queue edit to make locally

The GitHub pass deliberately avoided replacing the 123 KB canonical queue file through a whole-file API write. Add one **short** standing-evidence bullet under the refreshed-census/capability-map material in `docs/solver-optimization-workstreams.md`:

> **2026-09-04 cross-evidence follow-through:** current census-dependent work now has an earned existing-data Gate 0 before further capability/routing claims: rebuild the refreshed run's second-order analysis, fixed eight-pair relative-advantage view, and old→new action-stability table; then use the already-existing published/Corpus-1 solution-profile libraries as the next bounded explanatory join only if stable niches remain. This is standing capability-map analysis, not a new numbered workstream and not authorization for new solver behavior. See `reports/2026-09-04-census-cross-evidence-research-plan.md` and `reports/2026-09-04-census-cross-evidence-coding-handoff.md`.

Keep it this size. Do not paste the whole plan into the queue.

## Gate 0A — regenerate refreshed second-order analysis

Run the existing analyzer against the completed current census:

```bash
node scripts/analyze-technique-census.mjs reports/stress/technique-census/33717910218
node scripts/analyze-technique-census.mjs reports/stress/technique-census/33717910218 --check
```

Expected generated authority is the run-local `second-order-analysis.{json,md}` family used by `docs/technique-census-analysis.md`. Inspect current script output names rather than hard-coding an historical path if they differ.

Required checks:

- use current identity normalizers; do not join old/new attempt names as raw strings;
- preserve old census outputs as historical evidence;
- no new technique census or solver dispatch;
- if the analyzer refuses because an expected production join is absent, generate the census-only outputs first and report the missing optional join explicitly rather than substituting stale production data.

## Gate 0B — rebuild the fixed eight relative-advantage pairs

Do **not** inspect fresh pair outcomes and then choose new pairs. The September-1 comparison set is frozen before this refresh:

1. wide objective beam: 5K plain vs 5K mechanic-buckets;
2. wide intersection-harvest beam: 5K plain vs 5K mechanic-buckets;
3. objective beam: 2K plain vs 5K plain;
4. intersection-harvest beam: 2K plain vs 5K plain;
5. DFS `harvestThenFinish` vs `portalFirstTransfer`;
6. historical IDA/default vs IDA/`mustCrossFirst` pair, translated through the current owning attempt-identity normalizer/current representation rather than copied as stale strings;
7. perimeter beam CW vs CCW at width 2K;
8. perimeter DFS CW vs CCW.

Historical counts/effects are in `reports/2026-09-01-technique-relative-advantage-followup.md`; machine source is `reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json`.

Run current tests/command first:

```bash
npm run test:analyze-technique-relative-advantage
node scripts/analyze-technique-relative-advantage.mjs
```

If the script is still hard-wired to the 2026-09-01 niche artifact/output path, make the smallest reusable change needed to accept explicit input/output paths while preserving its default/historical behavior and tests. Generate a **new dated refreshed artifact**, not an overwrite of the September-1 result.

For each pair report old vs fresh: left-only, right-only, both, neither, leading standardized differences, and whether the September-1 interpretation survived/strengthened/weakened/reversed. Do not nominate a new routing rule from this regeneration alone.

## Gate 0C — materialize action-level temporal stability

This is the most important missing new analysis.

Join the old and refreshed capability artifacts by normalized level identity and normalized attempt identity:

- old: `reports/stress/technique-niches/2026-09-01/level-capability.json`
- fresh: `reports/stress/technique-niches/2026-09-03/level-capability.json`

For every comparable current action, emit at minimum:

- old solved count / fresh solved count;
- solve-set intersection and union;
- Jaccard;
- gained and lost level counts (plus IDs in machine output);
- old/fresh singleton-exclusive count;
- singleton ownership retained/gained/lost;
- old/fresh thin-boundary participation;
- production-miss-win movement;
- successful-node median/p90 movement where comparable;
- failed-node median/p90 movement where comparable;
- explicit non-comparable/missing reason rather than silently dropping rows.

Also emit level-side summary:

- support class stable/changed;
- solver-count delta;
- singleton gained/lost/retained;
- doubleton gained/lost/retained;
- number of solving actions retained/gained/lost.

A compact rebuildable script is justified here because temporal census comparisons will recur after future refreshes. Prefer extending an existing analyzer if natural; otherwise add one narrowly named tool plus node/unit coverage and catalogue entry. Do **not** build a database/query framework.

Interpretation target: distinguish **aggregate capability stability** from **capability-ownership stability**. The existing partial report already establishes the premise: oracle union 1,313→1,316 while 229/1,962 support classes changed.

## Gate 0D — refreshed production-boundary/exposure join

Only use production evidence whose commit/protocol is actually comparable to the refreshed census/current intended claim. Read `docs/tooling-catalog.md` before choosing an artifact.

Replace superseded historical counts such as 73 not-offered / 57 starved / 9 adequate-depth non-replay with current classifications where the evidence contract supports them:

- production miss + isolated rescuer;
- rescuer never offered;
- offered but zero-work/starved;
- offered and censored too shallow;
- offered at comparable depth/work but still fails;
- action/context not represented by isolated T1;
- non-comparable/unknown.

Use canonical `workSpent` for allocation conclusions, nodes only for within-technique depth comparisons.

Do not manufacture a current production join from stale lifecycle telemetry merely to fill every cell. A blocked/non-comparable row is preferable to false precision.

## Gate 0E — explain the 35 production-solved / no-isolated-T1-winner rows

The refreshed capability map has 35 such levels, up from 14. Build a current anatomy table, classifying where possible:

- winning production action absent from T1 action universe;
- same action present but production context/retry/flags differ;
- sequence/predecessor-state context;
- budget/dose difference;
- census/current-run revision mismatch still relevant;
- unresolved.

This is evidence-semantics calibration, not proof that retries create capability.

## Gate 0F — concise conclusion delta

Update `reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md` with a short table classifying each important September-1 census conclusion as:

- survived;
- strengthened;
- weakened;
- reversed;
- superseded.

Do not turn it into a second copy of the generated analysis.

## Gate 1 — only after Gate 0: solution-space fingerprints vs technique response

The needed profile substrate already exists on `main`:

- `reports/stress/solution-profile-published.json` — 156/156 levels have hints, mean 63.52 hints/level;
- `reports/stress/solution-profile-corpus1.json` — 102/102 levels have hints, mean 14.6 hints/level;
- summaries alongside both;
- contract: `docs/solver-solution-profile.md`.

Available profile axes already include cell/edge/intersection frequency, portal signatures, MustCross order/rigidity, objective-satisfaction depth, turn distribution, prefix diversity, pairwise distinctiveness, discovery-saturation, normalized footprint, and provenance-source buckets. Do not invent a new fingerprint system.

Before joining, use the existing freshness mechanism or force a rebuild only if needed. Neither current library has a provably exhaustive level, so never treat homogeneity/rigidity as complete solution-space proof.

### Gate-1 first pilot, prespecified before seeing joined outcomes

Use **Corpus 1 first** because all 102 levels have profiles and it is a genuinely different construction source from Corpus 2. Published may be a second descriptive stratum, not pooled silently with Corpus 1.

Test only these first questions:

1. **Multiplicity / basin width:** compare refreshed census solver-count/support multiplicity to `pairwiseDistinctiveness`, `prefixDiversity`, portal-signature diversity and MustCross-order rigidity.
2. **Diverse-beam mechanism:** for the two already-frozen 5K plain-vs-mechanic-buckets pairs, compare only disagreement rows on solution distinctiveness, portal-use/signature diversity, prefix diversity, crossing dispersion if represented, and normalized-footprint diversity. This directly tests whether the old portal-count signal is really a multi-basin/portal-mode signal.
3. **Width inversion:** for objective 2K-vs-5K disagreement, test whether 2K-only rows have narrower/more rigid solution basins despite being geometrically larger, versus the alternative that the inversion has no solution-space correlate.
4. **Orientation control:** CW-vs-CCW disagreement is a negative-control family for scalar solution-profile explanations. Do not expect turn `cwFraction` by itself to be causal; the prior first-divergence pilot already found no simple semantic-equivariance defect.

Report corpus/source coverage and missing profile fields per comparison. If a profile bucket is selected after inspecting results, label it tuning/discovery. Start with `combined`; provenance-source buckets are sensitivity checks, not eight extra fishing expeditions.

### Gate-1 stop rule

Stop before variants/traces if no compact descriptor survives Corpus-1 and source-bucket sensitivity. Do not respond by profiling Corpus 2 or scanning dozens more axes.

## Variant-family access, later only

If Gate 3 is eventually earned, the bulk ~96k family dataset is **not on `main`**. Follow `docs/variant-level-research.md`:

```bash
git fetch origin claude/variant-levels-solver-insights-tpk4qg
git worktree add ../pathfinder-variant-research origin/claude/variant-levels-solver-insights-tpk4qg
npm run family:index -- --variant-family-dataset-root=../pathfinder-variant-research
```

Use current code against the sibling historical data root. Do not execute historical branch code. Check family-index mixed-era diagnostics before decision-bearing joins. Parent family is the independent unit.

## Known-solution-prefix / exact / reducer tools, later only

Do not start with these. If a recurring inversion survives Gates 0/1/2, then follow `docs/solver-known-solution-prefix-survival.md`: locate the first loss of known support through generation/prune/dedup/score-width/diversity boundaries, then use paired traces and exact/reference labels only for the nominated mechanism. Reduction comes after a stable inversion exists.

## Deliverables before stopping

Minimum useful coding-agent completion:

1. the queue bullet above;
2. refreshed second-order outputs + `--check` passing;
3. refreshed fixed-eight relative-advantage artifact/report;
4. reusable old→new action/level stability artifact + report;
5. refreshed production-boundary / 35-row anatomy **if comparable production evidence exists locally**; otherwise a precise blocked-status note naming what evidence is missing;
6. conclusion-delta update;
7. tests/checks for any changed analyzer plumbing;
8. only if Gate 0 leaves a stable question and scope remains manageable, the bounded Corpus-1 Gate-1 pilot. Otherwise stop cleanly and leave Gate 1 for the next slice.

No solver treatment is required or expected from this handoff. A positive analysis should end by nominating one next value-of-information experiment, not by implementing it automatically.
