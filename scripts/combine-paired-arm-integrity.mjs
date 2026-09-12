#!/usr/bin/env node
/**
 * Merges two arms' (control/treatment, or two named routing-regime arms) OWN exact population
 * integrity records -- each already computed against the SAME expected-id population -- into one
 * paired integrity record. Unlike combine-population-integrity.mjs (which SUMS disjoint
 * sub-populations), both inputs here describe the SAME population observed twice, once per arm, so
 * expected/observed counts must already agree and the identity hash must be identical: a paired
 * comparison is only decision-bearing when BOTH arms actually solved the one sealed population, not
 * merely when each arm's own solo run happened to be complete.
 */
import fs from 'node:fs';
import path from 'node:path';

export function combinePairedArmIntegrity(left, right) {
  if (left.populationIdentityHash !== right.populationIdentityHash) {
    throw new Error(`paired arms observed different populations: ${left.populationIdentityHash} vs ${right.populationIdentityHash}`);
  }
  const coverageComplete = Boolean(left.coverageComplete) && Boolean(right.coverageComplete);
  const decisionValidComplete = Boolean(left.decisionValidComplete) && Boolean(right.decisionValidComplete);
  return {
    populationIdentityHash: left.populationIdentityHash,
    expectedCount: left.expectedCount,
    coverageComplete,
    decisionValidComplete,
    complete: coverageComplete,
    arms: { left, right },
  };
}

function parseArgs(argv) {
  return new Map(argv.filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const leftFile = args.get('left');
  const rightFile = args.get('right');
  const out = args.get('out');
  if (!leftFile || !rightFile || !out) {
    console.error('Usage: combine-paired-arm-integrity.mjs --left=<integrity.json> --right=<integrity.json> --out=<file>');
    process.exit(2);
  }
  const left = JSON.parse(fs.readFileSync(leftFile, 'utf8'));
  const right = JSON.parse(fs.readFileSync(rightFile, 'utf8'));
  const merged = combinePairedArmIntegrity(left, right);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Paired integrity: coverageComplete=${merged.coverageComplete}; decisionValidComplete=${merged.decisionValidComplete}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try { main(); } catch (error) { console.error(`combine-paired-arm-integrity: ${error.message}`); process.exit(2); }
}
