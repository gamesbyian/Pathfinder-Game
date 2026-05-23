#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const buildAttemptPolicy = (attemptIndex = 0) => {
  const idx = Math.max(0, Math.floor(Number(attemptIndex) || 0));
  const tierCycle = [0, 1, 2, 3, 3, 3];
  const tier = tierCycle[idx % tierCycle.length];
  const variation = idx % 16;
  const p = {
    purpose: 'hint',
    allowReferee: true,
    disableLegacyFallback: false,
    escalationTier: tier,
    variant: `policy-${variation}`
  };
  return p;
};

const runOnce = (policy) => {
  const args = [
    'node', 'scripts/run-solver-direct.mjs',
    '--levels=92',
    '--budget-ms=180000',
    '--verbose',
    '--output=/tmp/l92-pass.json'
  ];
  // policy knobs exposed by run-solver-direct
  if (policy.variant === 'policy-1') args.push('--root-ordering-variant=objective-first-bias');
  if (policy.variant === 'policy-2') args.push('--root-ordering-variant=knot-first-bias');
  if (policy.variant === 'policy-3') args.push('--root-ordering-variant=portal-first-bias');
  if (policy.variant === 'policy-4') args.push('--root-ordering-variant=perimeter-first-bias');
  if (policy.variant === 'policy-5') args.push('--dir-order-variant=alt');
  if (policy.variant === 'policy-6') args.push('--dir-order-variant=random');
  if (policy.variant === 'policy-7') args.push('--root-tie-seed-offset=7');
  if (policy.variant === 'policy-8') args.push('--root-tie-seed-offset=13');

  const cmd = args.join(' ');
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const payload = JSON.parse(fs.readFileSync('/tmp/l92-pass.json', 'utf8'));
  const row = payload.levels?.[0] || {};
  return {
    cmd,
    status: row.status,
    ok: !!row.ok,
    elapsedMs: row.elapsedMs,
    nodesExpanded: row.nodesExpanded,
    maxDepth: row.maxDepth,
    effectiveOrderingPolicy: row.effectiveOrderingPolicy,
    effectiveRootOrderingVariant: row.effectiveRootOrderingVariant,
    effectiveDirOrderVariant: row.effectiveDirOrderVariant,
    outputTail: out.split('\n').slice(-10).join('\n')
  };
};

const main = async () => {
  const attempts = [];
  for (let i = 0; i < 8; i++) {
    const policy = buildAttemptPolicy(i);
    const result = runOnce(policy);
    attempts.push({ attempt: i + 1, policy, ...result });
    console.log(`A${i + 1} ${policy.variant} tier=${policy.escalationTier} -> ${result.status} (${result.elapsedMs}ms, nodes=${result.nodesExpanded})`);
    if (result.ok || result.status === 'solved' || result.status === 'success') break;
  }
  console.log('\nSummary:');
  for (const a of attempts) {
    console.log(`A${a.attempt}: ${a.status} | ${a.policy.variant} | root=${a.effectiveRootOrderingVariant || 'null'} dir=${a.effectiveDirOrderVariant || 'null'} ordering=${a.effectiveOrderingPolicy || 'null'}`);
  }
};

main().catch((e) => {
  console.error(e.stack || e.message || String(e));
  process.exit(1);
});
