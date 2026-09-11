#!/usr/bin/env node
/**
 * Analyzes the resumable-tranche development A/B (reports/2026-09-05-static-portfolio-resumable-
 * tranche-salvage-preflight.md's "Development A/B" section) against its own frozen decision rule.
 *
 * Usage:
 *   node scripts/stress/analyze-resumable-tranche-development-ab.mjs -- \
 *     --control=<control.json> --treatment=<treatment.json> [--out=<summary.md>]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const controlPath = argMap.get('--control');
const treatmentPath = argMap.get('--treatment');
const outPath = argMap.get('--out') || null;
if (!controlPath || !treatmentPath) { console.error('Requires --control and --treatment'); process.exit(2); }

const control = JSON.parse(readFileSync(controlPath, 'utf8'));
const treatment = JSON.parse(readFileSync(treatmentPath, 'utf8'));
const cById = new Map(control.levels.map(r => [r.id, r]));
const tById = new Map(treatment.levels.map(r => [r.id, r]));

const ids = [...cById.keys()];
if (ids.length !== tById.size || !ids.every(id => tById.has(id))) {
  console.error('Control/treatment population mismatch -- cannot compare.');
  process.exit(2);
}

let controlSolved = 0, treatmentSolved = 0;
let bothSolved = 0, controlOnlyWins = [], treatmentOnlyWins = [];
let controlWork = 0, treatmentWork = 0;
let naturallyExhaustedBeamCount = 0;
let eligibleContinuationTotal = 0, residualDispatchTotal = 0, residualIncrementalWorkTotal = 0, firstPassOvershootTotal = 0;
let residualSolves = [];
let errors = [], deadlineTruncated = [];

for (const id of ids) {
  const c = cById.get(id), t = tById.get(id);
  if (c.ok) controlSolved++;
  if (t.ok) treatmentSolved++;
  if (c.ok && t.ok) bothSolved++;
  if (c.ok && !t.ok) controlOnlyWins.push(id);
  if (!c.ok && t.ok) treatmentOnlyWins.push(id);
  controlWork += c.workSpent || 0;
  treatmentWork += t.workSpent || 0;
  if (c.hadAttemptError) errors.push(['control', id]);
  if (t.hadAttemptError) errors.push(['treatment', id]);
  if (c.deadlineTruncated) deadlineTruncated.push(['control', id]);
  if (t.deadlineTruncated) deadlineTruncated.push(['treatment', id]);

  const residual = t.resumableResidualPass;
  if (residual) {
    eligibleContinuationTotal += residual.eligibleContinuationCount || 0;
    residualDispatchTotal += residual.residualDispatchCount || 0;
    residualIncrementalWorkTotal += residual.residualIncrementalWork || 0;
    firstPassOvershootTotal += residual.firstPassCaptureOvershoot || 0;
    if (residual.residualDispatchCount > 0 && t.ok) {
      const winner = t.attempts?.find(a => a.ok);
      if (winner?.resumableResidualTranche) residualSolves.push(id);
    }
  }
  // Count naturally-exhausted vs capped beam attempts in the TREATMENT first pass (proxy: any
  // beam-config attempt with outcome 'exhausted' vs 'budget-starved' with a captured continuation --
  // approximated here via eligibleContinuationCount already tallied above; naturally-exhausted beam
  // attempts are inferred as beam attempts NOT among the eligible continuations).
  const beamAttempts = (t.attempts || []).filter(a => a.beamWidth && !a.resumableResidualTranche);
  const exhaustedBeam = beamAttempts.filter(a => a.outcome === 'exhausted').length;
  naturallyExhaustedBeamCount += exhaustedBeam;
}

const gains = treatmentOnlyWins;
const losses = controlOnlyWins;

const lines = [];
lines.push('# Resumable-tranche development A/B: result');
lines.push('');
lines.push(`Population: ${ids.length} fresh Corpus-2 levels (seed \`resumable-tranche-development-ab-2026-09-11\`, disjoint from all prior static-portfolio populations).`);
lines.push(`Both arms: portfolio-18-tranche-v2 menu, portfolio-18-specialists-tranche-cap-map-v2.json, workBudget=67,000,000.`);
lines.push('');
lines.push('## Headline result');
lines.push('');
lines.push(`| | control | treatment |`);
lines.push(`|---|---:|---:|`);
lines.push(`| solved | ${controlSolved}/${ids.length} | ${treatmentSolved}/${ids.length} |`);
lines.push(`| aggregate workSpent | ${controlWork.toLocaleString()} | ${treatmentWork.toLocaleString()} |`);
lines.push('');
lines.push(`**Gains (treatment-exclusive):** ${gains.length} — ${gains.join(', ') || 'none'}`);
lines.push(`**Losses (control-exclusive):** ${losses.length} — ${losses.join(', ') || 'none'}`);
lines.push(`**Both solved:** ${bothSolved}`);
lines.push('');
lines.push('## Residual-pass participation');
lines.push('');
lines.push(`- Eligible continuations (capped, not naturally exhausted, beam attempts) across the population: ${eligibleContinuationTotal}`);
lines.push(`- Residual dispatches actually run: ${residualDispatchTotal}`);
lines.push(`- Naturally-exhausted beam attempts (never eligible): ${naturallyExhaustedBeamCount}`);
lines.push(`- Levels first solved during the residual pass: ${residualSolves.length} — ${residualSolves.join(', ') || 'none'}`);
lines.push(`- Aggregate residual incremental work: ${residualIncrementalWorkTotal.toLocaleString()}`);
lines.push(`- Aggregate first-pass bounded-overshoot work (real, honestly counted against the 67M envelope): ${firstPassOvershootTotal.toLocaleString()} (${(100 * firstPassOvershootTotal / controlWork).toFixed(3)}% of control's aggregate work)`);
lines.push('');
lines.push('## Censoring/integrity');
lines.push('');
lines.push(`- Errors: ${errors.length} ${errors.length ? JSON.stringify(errors) : ''}`);
lines.push(`- Deadline truncation: ${deadlineTruncated.length} ${deadlineTruncated.length ? JSON.stringify(deadlineTruncated) : ''}`);
lines.push('');
lines.push('## Decision (per the preflight\'s own frozen rule)');
lines.push('');
if (losses.length > 0) {
  lines.push(`**NEGATIVE / credible loss.** ${losses.length} level(s) solved by control but not treatment: ${losses.join(', ')}. Per the frozen decision rule, any credible loss means stop and root-cause before treating this as a scheduler-policy result -- the treatment is supposed to be strictly additive within unused residual work.`);
} else if (gains.length >= 2 && eligibleContinuationTotal >= 1) {
  lines.push(`**POSITIVE.** Zero credible losses, ${gains.length} treatment-exclusive solve(s) (>= 2 required), continuation participation is real (${eligibleContinuationTotal} eligible, ${residualDispatchTotal} dispatched). This earns the next gate: design the smallest protected residual-capability lane, then compare the combined scheduler against the real production ladder -- NOT an automatic production promotion.`);
} else if (eligibleContinuationTotal === 0) {
  lines.push(`**NON-INFORMATIVE.** Zero eligible continuations arose in this population -- production-width capture may be rare at this envelope/population, or the population produced too few capped-not-exhausted beam attempts to test the mechanism. Diagnose the participation/envelope issue before interpreting efficacy either way.`);
} else {
  lines.push(`**NULL.** Zero credible losses, but treatment-exclusive gains (${gains.length}) fall short of the >= 2 threshold despite real continuation participation (${eligibleContinuationTotal} eligible, ${residualDispatchTotal} dispatched). Close this simple salvage form -- do not respond by changing tranche sizes, switching beam policies, or growing the portfolio menu.`);
}

const summary = lines.join('\n') + '\n';
console.log(summary);
if (outPath) { writeFileSync(outPath, summary); console.log(`\nWrote ${outPath}`); }
