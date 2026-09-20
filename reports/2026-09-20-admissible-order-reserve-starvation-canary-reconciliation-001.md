# Admissible-order reserve-starvation canary reconciliation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — durable decision-bearing evidence bundle for workflow run `35467098808`, plus source-lineage comparison.
> **Decision:** the frozen R00044 execution-family canary has already cleared. The next gate is the precommitted independent 40-parent recurrence probe; do not rerun R00044 merely because older queue prose still names the canary.
> **Remaining gate:** dispatch the exact 40-parent sample in `reports/stress/failure-evidence/reserve-starvation-default-profile-sample-2026-09-19.json` at the frozen 300M isolated node ceiling and apply its 0/1/>=2 recurrence rule.
> **Evidence role:** confirmation

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"R00044 execution-family canary already passed at the exact historical 219802423-node solve cost; advance directly to the frozen independent 40-parent recurrence probe","remainingGate":"dispatch the frozen 40-parent sample and analyze with the precommitted recurrence reducer/rule","joins":{"researchQuestion":"WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION","premiseRefs":[],"measurementOpportunity":"MO-004"},"evidenceRole":"confirmation","scope":{"populationIdentity":"R00044 only","selection":"known-positive execution-family canary fixed prospectively by the reserve-starvation preflight","inferenceScope":"execution/fidelity validation only; not frequency or prevalence"},"claimRefs":[],"sourceArtifacts":["reports/stress/experiment-evidence/35467098808__run-35467098808__attempt-1/bundle.json","reports/stress/experiment-evidence/35467098808__run-35467098808__attempt-1/manifest.json","reports/stress/experiment-evidence/35467098808__run-35467098808__attempt-1/evidence/primary/result.json","reports/2026-09-19-admissible-order-reserve-starvation-prospective-preflight-001.md"],"prospective":{"expectation":"R00044 should solve under the canonical default admissible-order action near the historical 219.8M-node cost if the execution family is faithful","surprise":"the durable run reproduces the historical node count exactly","anomaly":null}} -->

## Canary outcome

Run `35467098808` executed exactly:

- level: `R00044`;
- action: `admissible-order|tieBreak=default|lds=off`;
- corpus: `data/stress/stress-levels-random.json`;
- node ceiling: **300,000,000**;
- wall safety deadline: **600,000 ms**;
- one shard / one worker.

The durable v3 manifest reports:

- expected population: 1;
- observed population: 1;
- decision-valid complete: true;
- solved: 1;
- deadline-truncated: 0;
- harness/malformed/missing/unknown: 0;
- standard compact failure response present and complete.

The method result reports:

- **219,802,423 nodes expanded**;
- **239,078,288 workSpent**;
- elapsed 144,433 ms;
- canonical winning action exactly as frozen.

The historical microscope value used to size this canary was **219,802,423 nodes**. The current canary reproduces it exactly.

## Source-lineage check

The canary ran at source SHA `ab68cf2f8b57b55655c1f9acac07d33df621c386`, on a branch used to repair the method-probe experiment-contract writer.

That source SHA is not itself an ancestor of current `main`, so branch identity alone is not sufficient.

A compare against its merge base shows the eight branch-only commits changed the method-probe workflow/staging machinery but **did not change `modules/solver/**`**. The canary therefore did not obtain its solve from branch-local solver behavior.

Later current-main changes include research observers and surrounding solver infrastructure; nothing in this reconciliation treats the one-row canary as a fresh efficacy benchmark. Its job was narrower: prove the canonical execution family/action/cap could still reproduce the known positive under the corrected decision-bearing workflow.

That gate is satisfied.

## What this changes

Old wording that says:

> run the R00044 execution-family canary, then the frozen 40-parent sample

is now stale.

The live sequence is:

1. **canary complete**;
2. run the independent frozen 40-parent sample;
3. apply the existing frozen rule:
   - zero opportunities: close recurrence screen negative;
   - one: freeze one additional disjoint 40-parent sample;
   - two or more: design the smallest matched-total-work reserve-fraction A/B;
   - blocked: repair the named observability deficit.

R00044 remains a discovery/calibration row and does not enter the recurrence denominator.
