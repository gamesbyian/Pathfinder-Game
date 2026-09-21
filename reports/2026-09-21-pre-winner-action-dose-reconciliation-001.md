# Pre-winner action-dose reconciliation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — reconciled the current pre-winner work ceiling against historical static-portfolio, percentile-cap, and resumable-tranche evidence.
> **Decision:** the current pre-winner reservoir survives conservative exclusions, but does not reopen the old static-portfolio scheduler, frozen percentile caps, or resumable-tranche salvage; route only the surviving new-signal question to WS1.
> **Remaining gate:** test a new runtime-legal allocation signal through `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`; do not rerun the closed historical treatment forms unchanged.
> **Evidence role:** forensic
> **Trigger:** [pre-winner work oracle census 001](2026-09-21-prewinner-work-oracle-census-001.md).

## 1. Why reconcile before inventing another scheduler

The current production-boundary Corpus-2 census found:

- 65.66B canonical work before eventual winners on solved rows;
- 31.71% of whole-batch canonical work in that gross oracle numerator;
- 14.07B pre-winner work on conservative primary-ladder winners;
- 11.20B on ordinary main-search winners.

Those numbers are large enough to make action allocation newly important.

But this repository has already tested several closely related scheduler ideas. The current result must
not silently reopen them.

## 2. Historical positive: isolated p75 cap shaping really worked

The September 3 `portfolio-18` line measured isolated successful-work distributions on an independent
120-level Corpus-2 sample and built a p75-derived per-technique cap map.

That map was not merely pretty telemetry:

- confirmation 002: 62/150 solved versus 55/150 full-menu and 54/150 flat-cap;
- independent confirmation 003: 68/150 versus 64/150 full-menu and 62/150 flat-cap;
- both confirmations used less aggregate work than the full menu.

So the semantic premise survives:

> successful-work distributions can carry real allocation value.

The later cross-generator audit weakened the magnitude claim but did not reverse it: on the genuine A-F
stratum all arms tied 22/23, while tranche-v2 spent more work there.

## 3. Historical negative: replacing production with that scheduler failed

The real production-entrypoint A/B then tested the actual decision that matters.

On a fresh 40-level Corpus-2 population:

- production: 18/40;
- static portfolio p75 tranche: 14/40;
- static-portfolio exclusive wins: 0;
- production-only wins: 4.

The cheap-first-pass + cold production fallback composition also cost 9.82% more work because the first
pass could not transfer enough paid search into production.

Therefore:

- do not replace the production ladder with `static-portfolio`;
- do not prepend the old static scheduler to production;
- do not interpret the new pre-winner ceiling as permission to rerun that treatment.

## 4. Historical negative: simple same-policy beam continuation also failed

After beam continuation became available, the resumable-tranche development A/B exercised the exact
salvage mechanism that the old cheap-first-pass result seemed to demand:

- 120 fresh Corpus-2 levels;
- 120/120 produced eligible continuations;
- 64 continuations actually dispatched;
- control 52/120;
- treatment 52/120;
- treatment-exclusive gains: 0;
- losses: 0.

This is a real NULL with participation.

Do not reopen unchanged by adjusting tranche size or menu order.

## 5. Frozen p75 caps do not directly transfer to current production main-search

The old cap map was replayed as a pure trace diagnostic against production-boundary run
`35066677597`.

For ordinary `main-search` attempts whose action identity maps exactly to the old 18-technique cap
map:

- 6,647 attempts;
- 578 observed winners;
- a literal p75-cap application would retain only 407 of those 578 winners at first dose;
- 171 current winners require more work than the frozen p75 cap;
- hypothetical gross truncated work on these attempts is only about 709M.

So the old cap map is not a drop-in current-production answer.

At p90:

- 510/578 current winners fit under the old isolated p90 dose;
- 68 exceed it;
- gross trace-level truncation is only about 137M.

Again, not production-worthy without a second-dose mechanism, and the tested simple continuation
mechanism is already NULL.

One narrow action, main-search DFS perimeterCCW, happens to keep every observed C1/C2 winner under the
old p75/p90 cap while truncating some failures. Its project-level ceiling is too small to justify a
standalone treatment from this selected observation.

## 6. Conservative full-batch ceiling after protected late retries

The gross 94.74% solved-row oracle number is dominated in part by deliberately late treatment stages, especially the promoted portal-coarse dead-last retry. To avoid using protected placement as evidence for a general selector, a conservative decomposition was computed from the same frozen production-boundary artifact.

Restricting the eventual winner to the ordinary primary ladder (`early-repair-search`, `main-search`, `repair-fallback`, `admissible-order-fallback`):

- 874 solved rows;
- 14,070,783,830 canonical work before the winner;
- 16,533,435,130 canonical work on those solved rows;
- 85.11% pre-winner share within that subset;
- the pre-winner numerator is **6.80% of all canonical work across the full 1,700-level Corpus-2 batch**, including unsolved rows.

Restricting further to ordinary `main-search` winners:

- 646 solved rows;
- 11,202,006,403 canonical work before the winner;
- 12,867,322,422 canonical work on those solved rows;
- 87.06% pre-winner share within that subset;
- the pre-winner numerator is **5.41% of full-batch canonical work**.

So the WS1 opportunity remains material even after stripping away the most obvious protected late-retry contribution. These percentages remain perfect-hindsight ceilings, not achievable savings estimates.

## 7. What remains genuinely new

The current production result does **not** say:

> we need a better static cap map.

It says:

> production spends enough work before ordinary winners that discovering a **new legal allocation
> signal** has material value.

That signal may be:

- current-input mechanism structure;
- response from a cheap prior action;
- exact/safe facts produced during the current solve;
- a bounded action-specific dose-response signal;
- another semantic distinction not represented by the old generic static feature set.

It must not be:

- level ID;
- historical winner lookup;
- family membership;
- a retuned cap chosen to fit this same population;
- an unchanged static-portfolio/resumable-tranche treatment.

## 8. Relationship to prior static-selector negative

The September 10 action-selection preflight correctly found that generic static routing/topology
features did not add useful held-out value over coarse structure.

That remains binding.

The new evidence changes the **value of finding a new signal**, not the quality of the old signals.

Therefore do not launch a broad feature-engineering exercise. Start from a mechanism-specific
discriminator or observed response contrast.

## 9. Canonical disposition

Route this finding to **WS1 automatic action selection**.

The appropriate next-gate wording is:

> A current production-boundary census establishes a material action-ordering ceiling: ordinary
> main-search pre-winner work alone is 5.41% of total Corpus-2 canonical work, and conservative
> primary-ladder pre-winner work is 6.80%. Old generic static selectors, the p75 static-portfolio
> replacement, direct frozen-cap transfer, and simple resumable-tranche salvage remain closed.
> Seek one new runtime-legal mechanism-specific allocation discriminator before any behavioral reorder.

This is a supporting WS1 question, not a new scheduler workstream.
