# R03351 microscope: initial evidence notes 001

> **Status:** initial evidence only; no mechanism claim yet
> **Date:** 2026-09-12
> **Parent preflight:** [`class5-single-level-microscope-r03351-preflight-001`](2026-09-12-class5-single-level-microscope-r03351-preflight-001.md)

## Evidence already available before new compute

The microscope begins with several useful facts already paid for by prior work.

1. `R03351` is in the frozen 28-level first-loss population whose accepted witness support is lost through beam width competition rather than hard pruning or coarse-state merge.
2. Under the ordinary width-2000 control used by the retention canaries, its accepted-witness support survives to depth 47.
3. `intsBucketRetention` changes the retention decision but reaches only depth 46 and produces no solve.
4. Existing `mechanicBucketRetention`, applied outside its normal routing regime as a research treatment, reaches only depth 34 and produces no solve. This is the largest negative depth delta in that canary (`-13`).
5. The accepted canonical hint is strongly cross-sourced: variant-parent replay recorded the same parent-valid path from many solved constrained-shuffle and group-reshuffle siblings. The path is therefore a suitable liveness witness for offline diagnosis even though no hint-derived signal may enter cold runtime policy.

## Immediate inference

The cheap hypothesis "the right state merely needs generic frontier diversity protection" is already weak for this specimen. Two materially different bucket keys alter who survives but do not preserve the accepted witness farther than ordinary top-K; one substantially harms it. The microscope should therefore begin by asking **future feasibility of the competing states**, not by trying a third arbitrary bucket key.

This does not prove the failure is scoring rather than retention. A retention mechanism could still be warranted if exact adjudication reveals a specific future-relevant partition that the two tested bucket keys do not track. The point is that the partition must now be earned from the specimen, not guessed from another convenient scalar.

## First execution target

Capture the ordinary-control extinction transition around depth 47 and freeze:

- the highest-ranked still-witness-compatible state immediately before extinction;
- its score and rank margin to the width cutoff;
- the cutoff-adjacent surviving state;
- the globally highest-scored survivor at that depth;
- at most two additional survivors only if they represent genuinely different obligation/topology states.

Then use exact/reference adjudication to establish whether each frozen state retains at least one valid completion. The first decision-bearing result is not "did a treatment solve R03351?" but one of:

- **live vs dead separates cleanly:** extract the smallest runtime-legal certificate/descriptor;
- **all compared states are live:** the failure is not simple future-feasibility discrimination at this boundary; inspect commitment diversity/longer-horizon competition instead;
- **all compared states are dead or the witness bookkeeping is inconsistent:** reconcile the boundary instrumentation before any mechanism work;
- **completion cannot be adjudicated cheaply:** document the exact missing reference capability rather than expanding an exact framework by default.

No new solver treatment is justified before that adjudication.
