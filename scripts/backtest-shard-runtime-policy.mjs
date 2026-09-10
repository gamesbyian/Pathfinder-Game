#!/usr/bin/env node
/**
 * Calibrates scripts/plan-highbudget-shards.mjs's uncertainty multipliers against real recorded
 * predicted-vs-actual gaps (data/stress/shard-runtime-backtest-cases.json), instead of picking a
 * conservatism constant by feel. "Least-conservative policy that would have prevented recent
 * timeout truncations" means: find the smallest multiplier that, applied to each case's own
 * predicted-ms-per-id, would have produced a predicted value >= that case's observed ms-per-id --
 * i.e. the shard's timeout/capacity math would no longer have been blindsided by that specific
 * incident. Two independent multipliers are calibrated because two independent mismatch causes
 * were found (see the cases' own `mismatchKind`): a runtime-scale mismatch (telemetry calibrated at
 * a very different --node-budget than requested) versus a flag-config mismatch (telemetry recorded
 * under different enable/disable flags than requested) additionally stacked on top of a scale
 * mismatch. Each is fit only from cases whose `mismatchKind` isolates or includes that cause.
 *
 * Usage:
 *   node scripts/backtest-shard-runtime-policy.mjs [--cases=<file>] [--margin=1.1] [--out=<file>]
 *
 * --margin adds headroom above the minimum-sufficient ratio observed in the case set (default 1.1,
 * i.e. 10% above the worst observed case) so the NEXT incident that is merely as bad as the worst
 * one seen so far -- not strictly worse -- still clears the bar. It does not protect against a
 * future incident materially worse than anything backtested; that still needs a new case added here
 * and the defaults recalibrated, which is why plan-highbudget-shards.mjs also keeps
 * --min-timeout-minutes and --fixed-group-size as independent, manually-invoked escape hatches.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const root = process.cwd();
const casesPath = args.get('--cases') || 'data/stress/shard-runtime-backtest-cases.json';
const margin = args.has('--margin') ? Number(args.get('--margin')) : 1.1;
const outPath = args.get('--out') || null;

export function calibrateMultipliers(cases, marginFactor = 1.1) {
    // scale-only cases isolate the node-budget-scale mismatch (matching flag config, wrong
    // --node-budget scale); scale-and-config cases stack a flag-config mismatch on top and
    // calibrate the higher, "no usable telemetry at all" multiplier instead.
    const scaleCases = cases.filter(c => c.mismatchKind === 'scale-only');
    const configCases = cases.filter(c => c.mismatchKind === 'scale-and-config');
    const maxRatio = (list) => list.length ? Math.max(...list.map(c => c.observedOverPredictedRatio)) : null;

    const scaleMismatchRatio = maxRatio(scaleCases);
    const configMismatchRatio = maxRatio(configCases);

    // Config mismatch is calibrated from cases that ALSO carry a scale mismatch (that is the only
    // real evidence available so far -- see the cases file's own header), so its multiplier is a
    // combined "no usable telemetry at all" figure, not a config-only increment layered on top of
    // the scale figure. Never let it come out lower than the scale-only figure: a caller with less
    // information (no matching telemetry at any scale) should never get a SMALLER safety margin
    // than one with partial information (matching config, wrong scale).
    const scaleMultiplier = scaleMismatchRatio ? Math.ceil(scaleMismatchRatio * marginFactor) : null;
    const configMultiplier = configMismatchRatio
        ? Math.ceil(Math.max(configMismatchRatio, scaleMismatchRatio ?? 0) * marginFactor)
        : scaleMultiplier;

    return {
        scaleMismatchMultiplier: scaleMultiplier,
        noTelemetryOrConfigMismatchMultiplier: configMultiplier,
        basis: {
            scaleCases: scaleCases.map(c => ({ id: c.id, ratio: c.observedOverPredictedRatio })),
            configCases: configCases.map(c => ({ id: c.id, ratio: c.observedOverPredictedRatio })),
            marginFactor,
        },
    };
}

function main() {
    const { cases } = JSON.parse(readFileSync(path.resolve(root, casesPath), 'utf8'));
    if (!Array.isArray(cases) || cases.length === 0) {
        console.error(`${casesPath}: no cases found`);
        process.exit(2);
    }
    const result = calibrateMultipliers(cases, margin);

    console.log(`Backtested ${cases.length} case(s) from ${casesPath} (margin=${margin}x over the worst observed ratio):`);
    for (const c of cases) {
        console.log(`  - ${c.id} [${c.mismatchKind}]: observed/predicted = ${c.observedOverPredictedRatio}x`);
    }
    console.log(`Calibrated scaleMismatchMultiplier=${result.scaleMismatchMultiplier} (from ${result.basis.scaleCases.length} scale-relevant case(s))`);
    console.log(`Calibrated noTelemetryOrConfigMismatchMultiplier=${result.noTelemetryOrConfigMismatchMultiplier} (from ${result.basis.configCases.length} config-mismatch case(s), floored at the scale multiplier)`);
    console.log('These are DEFAULTS baked into plan-highbudget-shards.mjs, not read live from this file at plan time -- re-run this script and update those defaults by hand after adding a new case.');

    if (outPath) {
        writeFileSync(path.resolve(root, outPath), JSON.stringify(result, null, 2) + '\n');
        console.log(`Wrote ${outPath}.`);
    }
    return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
