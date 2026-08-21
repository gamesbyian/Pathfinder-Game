# Documentation loose-threads audit (2026-08-06)

## Purpose and scope

This is a repository-wide triage of plans, notes, reports, continuation prompts, and raw run
records. It answers two narrower questions:

1. Which investigations stop before their own stated conclusion or validation gate?
2. Which still-open work has gone quiet while newer work moved on?

The inventory covered every tracked documentation-like path: **57 files under `docs/`, 937 under
`reports/`, 2,703 under `logs/`, plus the root continuation prompt and documentation beside data
and workflows (3,703 paths total)**. Generated family reports and batch console logs were reviewed
as collections: manifests, summaries, completion markers, and exceptional logs were inspected,
rather than pretending that rereading thousands of mechanically repeated rows provides extra
evidence. The audit also searched the whole inventory for explicit open/pending/deferred/in-progress
language and followed cross-references into later reports and git history.

“Abandoned” below does **not** mean “old filename” or “negative result.” A thread is flagged only
when a document promises another measurement/decision, no later artifact closes it, and subsequent
campaign work has passed it by. Deliberately deferred work, rejected experiments, historical plans
under `docs/archive/`, and honest null results are not counted as abandoned.

## Executive result

The repository does not have a broad epidemic of half-finished experiments. Most dated reports
either contain a verdict or are explicitly absorbed into a later synthesis. The main problem is
**status drift**: a handful of genuine loose threads are mixed with stale “active” labels and
already-completed gates, making it hard to distinguish the current queue from history.

The highest-confidence unfinished item is the newly registered **family fragile/robust census**:
the workflow and 1,700-level manifest exist, but no combined census result or interpretive report
does. Two older experiments appear genuinely interrupted. Several other items remain legitimate
backlog rather than abandoned work.

## A. High-confidence interrupted or abandoned threads

### A1. Family fragile/robust census: infrastructure landed, conclusion did not

**Last activity:** 2026-08-06 (`7d641da`, `565fc60`, `08c1db3`; the first commit explicitly says
“in progress”).

The 2026-07-29 failure categorization made a turn-load-stratified family split its fourth
recommended next step. A five-level first sample was confounded by archetype; a same-day
disambiguation found turn load rather than archetype to be the stronger driver. The latest commits
then generated additional families, added a 20-shard GitHub Actions census, and registered the
workflow. There is now a census manifest, but no committed shard outputs, combined summary, or
report that answers the question at corpus scale.

**Conclusion still owed:** run the 20 shards, combine them with `family-census-combine.mjs`, report
fragile/robust rates by turn-load stratum (including failed/missing shards), and decide whether the
result changes solver priorities. This is active and very recent, not stale, but it is the clearest
work presently stopped before a conclusion.

### A2. Must-turn-biased repair promotion sweep stopped at 9/30

**Last narrative activity:** 2026-07-23.

`reports/2026-07-23-solver-batch-speed-and-hint-provenance.md` labels a 30-level ordinary-vs-biased
comparison “in progress,” records only 9/30 completed, explicitly warns not to conclude from that
sample, and says the per-level output is resumable. No later report records 30/30 or a promotion
decision. Later turn-bias A/B work concerns the different `repairTurnBiased` tier and does not close
this `repairMustTurnBiasedAttempt` question.

**Conclusion still owed:** either resume the remaining 21 levels and state a promotion verdict, or
close the experiment explicitly as superseded, naming the evidence that makes completion no longer
decision-relevant.

### A3. Fast-portfolio unsolved-corpus sweeps were never completed

**Last narrative activity:** 2026-07-15 through the imported/updated report state on 2026-07-30.

`reports/portfolio/README.md` says the corpus-1 straggler sweep was interrupted, provides an exact
resumable command for 17 levels, and says the curated 112-level corpus-2 subset has not been
attempted. The plan itself later reached a defensible conclusion—opt-in and not production-ready—so
this is **not** an open product decision. It is abandoned experimental coverage that should either
be run if the scheduler is reconsidered or marked cancelled because the negative published/stress
evidence already makes it immaterial.

**Conclusion still owed:** “completed results” or “cancelled as unnecessary”; leaving the section
headed “not yet run to completion” indefinitely makes an intentionally concluded experiment look
active.

## B. Stale status that hides what is actually open

### B1. The root continuation prompt is completed but still presents itself as the next session

`CONTINUATION_PROMPT_CORPUS2_CATEGORIZATION.txt` asks for 20 categorized levels and a report at
`reports/stress/corpus2-failure-categorization-2026-07-29.md`. That report exists, contains the
requested categorization, and has later updates to its recommendations. The prompt is now an
orphaned handoff artifact, not current work.

**Action:** archive/delete it or prepend a completion notice pointing to the report. Until then it
can cause a future agent to repeat finished work.

### B2. The active solver roadmap's baseline and campaign labels are stale

**Last meaningful campaign-state baseline in the document:** 2026-07-18 (304/1700), despite many
2026-07-23–08-06 refreshes and investigations.

The roadmap still calls Campaign 2 active and Campaign 3 “not yet started,” while its own later
addenda and the current `future-work.md` say the must-cross sequence is closed and Campaign 3 needs
a new lead. Its table also preserves an unverified +2 attribution that newer refresh/determinism
work has overtaken. Because `docs/README.md` calls this the active campaign source of truth, this is
more than harmless history.

**Action:** refresh the headline baseline and replace old campaign statuses with a compact current
frontier, or relabel the roadmap as a historical campaign record and make `future-work.md` the sole
live queue.

### B3. Turn-bias has a completed gate still listed as remaining

Both `docs/future-work.md` and `docs/repair-search-stagnation-escape-plan.md` still say the remaining
gate is a pair of corpus-2 A/B refreshes plus timing comparison. The 2026-07-23 turn-bias A/B report
did run the before/after refresh, discovered and fixed probe-budget stacking, reran post-fix, and
revised the result to a wash (~+1 inside the noise floor). It explicitly says default-on promotion
is not justified. A narrower latency/pick-one-design question remains, but the documented
“remaining gate” is no longer accurate.

**Action:** replace that gate with the actual remaining decision: either close turn-bias as
default-off, or investigate feature-based selection between the two biased tiers and measure the
three-tier fallback latency before reconsidering promotion.

### B4. The “proposed, not started” stagnation-plan index entry is obsolete

`docs/README.md` describes `repair-search-stagnation-escape-plan.md` as proposed/not started, while
the plan and `future-work.md` record Stages 1–3 as built and tested, with Stage 4 rescoped. This does
not leave code unfinished by itself, but it sends readers to the wrong starting point and obscures
the genuinely open descent-aware-probing/extend-operator choice.

**Action:** update the index description to the measured current verdict.

## C. Genuine open backlog that has gone quiet

These are not necessarily abandoned, but no closing artifact was found and newer campaigns have
not touched them.

| Thread | Last explicit activity | What remains |
|---|---:|---|
| AI-assisted manual-solving method | 2026-07-17 narrative / 2026-07-30 import | Run the recommended differential diagnosis on a genuinely unsolved level; the worked example was already solved. Newer R02751 work used a withheld witness, so it does not validate blind/manual construction. |
| Repair-probe budget scaling | 2026-07-17 | The early probe's fixed node budget remains unscaled by `timeBudgetMs`; decide/fix after a production latency measurement. |
| Attraction-diversity sequential per-flag passes | 2026-07-17 | Only the combined widening was tested; sequential isolated sub-passes were left untested because of their expected ~5× pass cost. Explicitly decide whether that cost closes the idea. |
| Solver hot-path unexplained divergence | 2026-07-30 | `R01403` reportedly changed from a ~5.3M-node solve to failure near ~580× that work after a supposedly pure-speed change; the report says it was not run down. This deserves closure because behavioral drift under a behavior-identical optimization could indicate nondeterminism or hidden state. |
| Tier-2/Tier-3 memory-bandwidth work | 2026-07-30 | Tier 2 is scoped but unimplemented; Tier 3 is named but unscoped. These are valid performance backlog, not an active correctness incident. |
| Persistent regression-set staleness | 2026-07-30 | Rebaseline `data/stress/regression-set.json` and/or put `stress:regression` in CI so known-hard pins cannot silently age. |
| Portfolio-learning classifier rerun | 2026-07-17 | Rerun the “will repair win?” classifier now that corpus-2 data greatly exceeds the original n=85, then build or drop it. Its stated prerequisite appears to have arrived. |
| Broader family/scaling research | 2026-07-15 | Systematic solver-scaling analysis and recipe cousins remain unimplemented. Recipe cousins are explicitly deferred; scaling analysis is open research, not a promised near-term deliverable. |
| Hint-tool cleanup | 2026-07-25 | Decide whether the standalone hint-candidate CLI should coexist with or be retired in favor of the workbench; also resolve the provenance of `reports/hint-selection.json`. |
| Firebase operational follow-ups | 2026-06/07 planning, indexed 2026-08-05 | Admin custom-claim cutover and emulator-backed rules tests remain blocked/deferred by external operations/infra. They are intentionally open, not abandoned code work. |

## D. Recent, honest open research (do not misclassify as abandoned)

These were touched on 2026-08-05/06 and already state the next experiment or decision clearly:

- portal-parity replay through real solver state;
- a product decision and feasibility study for clean-orbit surround semantics;
- structural derivation/census for must-turn, adjacent-turn, and surround landmarks;
- descent-aware shadow probing after the winning-path archaeology result;
- the R02751/near-twin branch-recognition investigation;
- Tier-2 shadow-evaluation candidates already closed as measured null/small results.

Likewise, negative reports, reverted experiments, and the archived modernization/hardening plans
are concluded work. “Not implemented” in those documents often records an evidence-based rejection,
not forgotten implementation.

## Recommended cleanup order

1. **Finish the census already prepared in A1** and publish one synthesis report; it is the only
   large current investment lacking results.
2. **Resolve A2 explicitly** (finish or cancel the 30-level sweep).
3. **Repair the four stale status surfaces in section B** so the indexes agree with later evidence.
4. **Triage section C into `do / defer-until / close`**, assigning a prerequisite to every deferred
   item. Start with the R01403 divergence and stale regression set because they affect trust in
   measurements, not merely future solve rate.
5. Add a small status convention to new investigation reports: `Status`, `Last evidence`,
   `Decision`, and `Remaining gate`. This would make the next audit mechanical and prevent completed
   prompts from competing with current plans.

## Reproduction notes

The audit used tracked-file inventory (`git ls-files`), full-text searches with `rg` for status
language, headings and cross-references, targeted reads of every hit, and `git log`/`git show` to
distinguish original file dates from later updates. Repository checkout mtimes were deliberately
ignored because they are identical and do not represent when a thread was last touched.
