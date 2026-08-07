# Documentation loose-threads audit (2026-08-06)

> **Status:** concluded-positive
>
> **Last evidence:** 2026-08-07 — cleanup follow-ups through the R00526 traversal diagnosis
>
> **Decision:** the identified interrupted threads and stale status surfaces are resolved; remaining
> work is explicitly active, deferred behind a trigger, retained, quarantined, or closed
>
> **Remaining gate:** none for this audit; use `docs/future-work.md` for live project work

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

The repository did not have a broad epidemic of half-finished experiments. Most dated reports
contained a verdict or were absorbed into a later synthesis. The material problem was **status
drift**: interrupted threads, stale “active” labels, and completed gates were mixed with the live
queue. The two genuinely interrupted experiments identified below are now explicitly cancelled as
superseded or no longer decision-relevant; all four stale status surfaces are reconciled; and the
older backlog has an explicit disposition table.

The family fragile/robust census remains deliberately excluded: it is active work owned on another
branch, so the absence of its eventual combined result on this branch is not evidence of abandonment.

## A. Formerly interrupted threads — now resolved

### A1. Must-turn-biased repair promotion sweep stopped at 9/30

**Last narrative activity:** 2026-07-23.

`reports/2026-07-23-solver-batch-speed-and-hint-provenance.md` labels a 30-level ordinary-vs-biased
comparison “in progress,” records only 9/30 completed, explicitly warns not to conclude from that
sample, and says the per-level output is resumable. No later report records 30/30 or a promotion
decision. Later turn-bias A/B work concerns the different `repairTurnBiased` tier and does not close
this `repairMustTurnBiasedAttempt` question.

**Resolved 2026-08-07:** explicitly cancelled as superseded. A later 31-level cross-corpus predictor
sample and full corpus-2 exclusive-selection A/B are stronger evidence against the decision the old
sweep was meant to make. The current experiment is a different, weighted two-technique design, so
finishing the remaining 21 stress-corpus-1 levels would not validate it. The source report now carries
this resolution and points to the later evidence.

### A2. Fast-portfolio unsolved-corpus sweeps were never completed

**Last narrative activity:** 2026-07-15 through the imported/updated report state on 2026-07-30.

`reports/portfolio/README.md` says the corpus-1 straggler sweep was interrupted, provides an exact
resumable command for 17 levels, and says the curated 112-level corpus-2 subset has not been
attempted. The plan itself later reached a defensible conclusion—opt-in and not production-ready—so
this is **not** an open product decision. It is abandoned experimental coverage that should either
be run if the scheduler is reconsidered or marked cancelled because the negative published/stress
evidence already makes it immaterial.

**Resolved 2026-08-07:** cancelled explicitly. The incomplete sweeps cannot change the already
recorded not-production-ready decision, and later legacy-ladder changes make their old timing
baseline stale. The portfolio README preserves the checkpoint command only as a restart recipe if a
new decision deliberately reopens the experiment.

## B. Former stale status surfaces — now resolved

### B1. The root continuation prompt is completed but still presents itself as the next session

The archived
[`corpus2-failure-categorization-handoff.md`](../docs/archive/corpus2-failure-categorization-handoff.md)
asked for 20 categorized levels and a report at
`reports/stress/corpus2-failure-categorization-2026-07-29.md`. That report exists, contains the
requested categorization, and has later updates to its recommendations. It is now retained only as
a completed handoff record rather than presented at the repository root as current work.

**Resolved 2026-08-07:** archived with a completion notice and reciprocal links to the result.

### B2. The solver roadmap was incorrectly presented as the live queue

**Last meaningful campaign-state baseline in the document:** 2026-07-18 (304/1700), despite many
2026-07-23–08-06 refreshes and investigations.

The roadmap still calls Campaign 2 active and Campaign 3 “not yet started,” while its own later
addenda and the current `future-work.md` say the must-cross sequence is closed and Campaign 3 needs
a new lead. Its table also preserves an unverified +2 attribution that newer refresh/determinism
work has overtaken. Because `docs/README.md` calls this the active campaign source of truth, this is
more than harmless history.

**Resolved 2026-08-07:** the roadmap is now labelled as a historical campaign record, its baseline
section is explicitly a snapshot with a pointer to generated current state, and `future-work.md` is
the sole live status index. The docs and reports indexes use the same distinction.

### B3. Turn-bias had a completed gate listed as remaining

Both `docs/future-work.md` and `docs/repair-search-stagnation-escape-plan.md` said the remaining gate
was a pair of corpus-2 A/B refreshes plus timing comparison. The 2026-07-23 turn-bias A/B report did
run the before/after refresh, discovered and fixed probe-budget stacking, reran post-fix, and revised
the result to a wash (~+1 inside the noise floor). It explicitly says default-on promotion is not
justified. A narrower latency/pick-one-design question remains.

**Resolved 2026-08-07:** both current documents now record the completed population verdict and the
narrower feature-selection/three-tier-latency question.

### B4. The “proposed, not started” stagnation-plan index entry was obsolete

`docs/README.md` described `repair-search-stagnation-escape-plan.md` as proposed/not started, while
the plan and `future-work.md` record Stages 1–3 as built and tested, with Stage 4 rescoped. This did
not leave code unfinished by itself, but it sent readers to the wrong starting point and obscured
the genuinely open descent-aware-probing/extend-operator choice.

**Resolved 2026-08-07:** the documentation index now states the measured verdict and next evidence
step.

## C. Older loose threads — triaged 2026-08-07

These are not necessarily abandoned, but no closing artifact was found in the original audit. Each
now has an explicit disposition in
[`docs/future-work.md`](../docs/future-work.md#older-loose-thread-triage-2026-08-07), summarized here.

| Thread | Disposition |
|---|---|
| AI-assisted manual-solving method | **Defer** until automated differential diagnosis yields a specific first-divergence question. |
| Repair-probe budget scaling | **Defer** until a measured small-budget caller shows harm. |
| Attraction-diversity sequential per-flag passes | **Close** on cost/evidence; reopen only with a cheap selector. |
| Solver hot-path unexplained divergence | **Closed 2026-08-07**; score-order restoration recovers `R00526`, proving the mid-phase tree-walk/budget mechanism. The speed/solve trade remains deliberately accepted. |
| Tier-2/Tier-3 memory-bandwidth work | **Defer** behind a fresh profile and staged lifetime audit. |
| Persistent regression-set staleness | **Completed 2026-08-07**; restored three hard pins and added a guarded solved-baseline writer. |
| Portfolio-learning classifier rerun | **Do (cheap measurement)** once, then build or drop. |
| Broader family/scaling research | **Defer** until a concrete cutoff decision needs it. |
| Hint-tool cleanup | **Keep** the standalone CLI pending parity; quarantine the untraced JSON snapshot. |
| Firebase operational follow-ups | **Defer** behind the already-named ops/rules-change triggers. |

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

## Cleanup completion

The audit's repository-organization work is complete. The prospective
[`Status / Last evidence / Decision / Remaining gate` convention](../docs/investigation-report-conventions.md)
now defines how new and materially revised reports avoid recreating the same drift. Remaining project
work is intentionally tracked in `docs/future-work.md`, not here.

## Reproduction notes

The audit used tracked-file inventory (`git ls-files`), full-text searches with `rg` for status
language, headings and cross-references, targeted reads of every hit, and `git log`/`git show` to
distinguish original file dates from later updates. Repository checkout mtimes were deliberately
ignored because they are identical and do not represent when a thread was last touched.
