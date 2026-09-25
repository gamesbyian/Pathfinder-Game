#!/usr/bin/env node
// Translates solver-level-blind-targeted-sweep.yml's `node_cap_overrides` workflow_dispatch input
// (comma-separated key=value pairs) into level-blind-capability-sweep.mjs CLI flags, one per line
// on stdout -- shared by that workflow's canary and every shard-run site instead of duplicating the
// key->flag mapping inline three times (this file's own size ratchet cannot absorb three copies).
const KEY_TO_FLAG = {
    earlyRepairSearchOrdinaryNodeBudget: '--early-repair-search-ordinary-node-budget',
    earlyRepairSearchBiasedNodeBudget: '--early-repair-search-biased-node-budget',
    admissibleOrderNodeReserveFraction: '--admissible-order-node-reserve-fraction',
};

const raw = process.argv[2] ?? '';
if (raw.trim() === '') process.exit(0);
for (const pair of raw.split(',')) {
    const eq = pair.indexOf('=');
    if (eq < 0) {
        console.error(`node_cap_overrides: malformed pair "${pair}" (expected key=value)`);
        process.exit(2);
    }
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    const flag = KEY_TO_FLAG[key];
    if (!flag) {
        console.error(`Unknown node_cap_overrides key: ${key}`);
        process.exit(2);
    }
    console.log(`${flag}=${value}`);
}
