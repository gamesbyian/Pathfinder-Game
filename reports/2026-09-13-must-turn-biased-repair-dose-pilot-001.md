# Must-turn-biased repair dose pilot 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — current matched-node isolated repair rungs on `R02768`, `R02180`, and `R03049`, plus reconstruction of the seven nominated rows from technique census `33717910218`.
> **Decision:** the family-guided pilot earns a smallest default-off additive late must-turn-biased repair tier at a 7M node cap, after the existing plain late-repair tier. Correct the nominated guidance population from seven rows to six: `R03049` is an allocation/dose case because standard repair already solves it in the census.
> **Remaining gate:** implement the additive 7M tier without stealing existing repair work, prove the intended action participates, reproduce the two current matched gains through orchestration, then measure bounded collateral/work before any broader exposure or promotion.

## Why this test existed

The September 12 class-1/2/3 rejoin identified seven current residual class-2 rows with isolated `repair|score=repair|guidance=must-turn-biased` wins while production reached repair context without exposing that exact guidance. The variant-family audit then used existing controlled siblings to choose an intentionally contrasted opening pair instead of simply launching a seven-row solver batch.

Historical family response over constrained-shuffle, group-reshuffle and swap siblings was strongly parent-dependent:

- `R02768`: 5/30 sibling solves, the most family-responsive nominated parent;
- `R02180`: 1/30, family-rigid despite being the second-cheapest biased winner;
- `R02367`, `R03049`, `R03056`: 0/30;
- the seven parents together: 8/210, with swap 0/70.

That made `R02768` + `R02180` an information-rich contrast pair. Family evidence selected cases and interpretations; it did not claim current solver efficacy.

## Rung 1: shipped late-repair dose, 5M nodes

Current code, canonical technique-census cell executor, matched node caps, referee validation enabled:

| Parent | Plain repair | Must-turn-biased repair | Matched treatment gain? |
|---|---:|---:|---|
| `R02768` | budget reached at 5,000,007 | **solved at 1,179,294** | **yes** |
| `R02180` | budget reached at 5,000,000 | budget reached at 5,000,000 | no at this dose |

A duplicate automatically-triggered run reproduced the same outcomes and exact deterministic node counts. It is operational reproducibility, not another independent sample.

`R02768` therefore establishes a current causal guidance gain at the existing late-tier-sized dose. `R02180` turned the question into dose rather than mechanism because its historical isolated biased win was 6,206,072 nodes.

## Rung 2: 7M matched dose

| Parent | Plain repair | Must-turn-biased repair | Matched treatment gain? |
|---|---:|---:|---|
| `R02768` | budget reached at 7,000,007 | **solved at 1,179,294** | **yes** |
| `R02180` | budget reached at 7,000,000 | **solved at 6,206,072** | **yes** |

Both sides of the family-sensitivity bracket therefore show a current matched guidance gain at 7M, reproducing the historical biased node counts exactly while plain repair fails under the same cap.

## Rung 3: attempted 0/30-family confirmation exposed a population confound

`R03049` was selected because it was the cheapest historically 0/30 family parent and had a historical must-turn-biased win at 12,345,609 nodes. A 13M matched test produced:

| Parent | Plain repair | Must-turn-biased repair | Matched treatment gain? |
|---|---:|---:|---|
| `R03049` | **solved at 11,461,672** | **solved at 12,345,609** | **no** |

Instead of treating this as a failed confirmation of the six-row mechanism, the result triggered a zero-compute reconstruction of the original census rows.

## Census reconstruction: seven nominations are not one causal class

Technique census `33717910218` used a 50M node cap for these T1 repair cells:

| Parent | Standard repair | Turn-biased repair | Must-turn-biased repair | Interpretation |
|---|---:|---:|---:|---|
| `R02180` | fail at 50M | solved 22,981,107 | **solved 6,206,072** | must-turn is materially better; standard absent |
| `R02367` | fail at 50M | fail at 50M | **solved 32,182,920** | unique repair guidance capability |
| `R02459` | fail at 50M | fail at 50M | **solved 16,268,287** | unique repair guidance capability |
| `R02768` | exhausted 48,290,530 | fail at 50M | **solved 1,179,294** | unique repair guidance capability |
| `R02849` | fail at 50M | exhausted 46,281,474 | **solved 12,955,651** | unique repair guidance capability |
| `R03049` | **solved 11,461,679** | **solved 11,456,189** | solved 12,345,609 | **not a guidance gap; dose/allocation case** |
| `R03056` | fail at 50M | fail at 50M | **solved 23,299,834** | unique repair guidance capability |

`R03049` should not have been interpreted as evidence that the exact must-turn guidance is missing capability. The prior rejoin correctly noticed a must-turn-biased win but the seven-row shorthand obscured that this row also has cheaper standard/turn-biased wins. The corrected guidance population is therefore six rows: all except `R03049`.

`R02180` is also nuanced rather than strictly unique: turn-biased repair eventually solves it, but must-turn-biased is ~3.7x cheaper in nodes and standard repair does not solve within 50M. For the bounded 7M exposure question it remains a genuine must-turn-specific gain.

## What the family library contributed

The library materially improved the experiment without pretending to answer it:

1. it showed the seven nominations do not live in one generic perturbation-sensitive neighborhood;
2. it selected `R02768` and `R02180` as a deliberate family-responsive/family-rigid contrast;
3. the matched current test then demonstrated guidance gains on both at 7M;
4. the pre-registered 0/30-family confirmation forced inspection of `R03049`, which exposed a hidden population impurity in the original seven-row shorthand before production code was written.

That is the desired evidence pipeline: family data for cheap causal screening and case selection, current matched solver cells for efficacy, then census reconstruction when results disagree with the premise.

## Decision

A 7M additive must-turn-biased late-repair treatment is earned as the smallest integration test because:

- it buys two current residual solves in matched isolated cells where plain repair fails at the same dose;
- the two parents deliberately differ in historical family sensitivity;
- both current biased results reproduce their historical deterministic node costs exactly;
- additive placement after the existing plain late tier can avoid stealing its work or regressing earlier solves;
- the treatment remains default-off until orchestration participation and collateral/work are measured.

This does **not** justify a 13M+ broad tier merely because several remaining unique-guidance rows need more work. The high-dose question comes later and must earn either acceptable additive economics or a legal general selector. `R03049` is explicitly excluded from must-turn-guidance gain accounting.