#!/usr/bin/env node
/**
 * Behavioral-state quotient / future-language equivalence -- Moonshot G in
 * reports/2026-09-16-assumption-breaking-solver-development-moonshots-001.md: "Two syntactically
 * different states are equivalent for search if every relevant future completion behavior
 * available from one is available from the other... a probe-defined approximation can reveal
 * which state distinctions matter and which are noise." Its own "cheapest falsifier": "Sample
 * sibling states, run a fixed battery of exact bounded completion/event probes, cluster by
 * behavioral response, and ask how much syntactic state collapses without mixing known LIVE/DEAD
 * behavior on held-out parents."
 *
 * This is the tiniest possible version of that falsifier: reuse two ALREADY-COMMITTED per-state
 * feature+outcome artifacts (zero new solver compute, zero new CP-SAT queries) and check, for a
 * natural discrete "pending obligation count" signature, whether identical signatures ever mix
 * known-different outcomes.
 *
 * Population A -- B2 (true exact CP-SAT LIVE/DEAD labels, 28 states / 14 parent levels, from
 * reports/stress/h1-event-feasibility-queries-2026-09-16.json, H1's own frozen state replay).
 * Signature: (pendingCounts.mustCross, mustPass, flippers, portalPairs) -- already computed there.
 * This directly answers Moonshot G's literal "known LIVE/DEAD" wording, including SAME-PARENT
 * pairs (the two roles replayed per level), which is a stronger, board-controlled falsifier than
 * cross-parent recurrence alone.
 *
 * Population B -- Card-E (156 states / 156 distinct parent levels -- one state per level, so any
 * multi-member signature group is inherently cross-parent -- from
 * reports/stress/h3-repair-commitment-interface-2026-09-17.json, H3's own commitment-feature
 * extraction). Outcome is Card-E's reconstructable/non-reconstructable label, a bounded-search
 * proxy, NOT an exact LIVE/DEAD ground truth -- reported separately from B2 for that reason.
 * Signature: (mustCrossPending, mustPassPending, portalJumpsUsed, ints) -- deliberately EXCLUDES
 * lengthRemaining, the dominant driver H3 already found (d=-1.81), so any purity here is not just
 * that confound. Tested against two permutation nulls: (1) a full label shuffle, and (2) a
 * length-quintile-blocked shuffle that preserves the length-outcome relationship, to check whether
 * the signature carries information beyond remaining length alone.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { groupRowsByKey } from '../signature-collision-analysis-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const b2File = args.get('--b2-states') ?? 'reports/stress/h1-event-feasibility-queries-2026-09-16.json';
const cardEFile = args.get('--card-e') ?? 'reports/stress/h3-repair-commitment-interface-2026-09-17.json';
const outFile = args.get('--out') ?? 'reports/stress/behavioral-state-quotient-probe-results.json';
const trials = Number(args.get('--trials') ?? 5000);

// Deterministic PRNG (mulberry32) so the permutation p-values reproduce exactly on rerun.
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---- Population A: B2 exact LIVE/DEAD ----
const b2Doc = JSON.parse(readFileSync(b2File, 'utf8'));
const b2Rows = b2Doc.states.map(s => ({
    caseId: s.caseId, levelId: s.levelId, exactLabel: s.exactLabel,
    sig: JSON.stringify([s.pendingCounts.mustCross, s.pendingCounts.mustPass, s.pendingCounts.flippers, s.pendingCounts.portalPairs]),
}));
const b2Groups = groupRowsByKey(b2Rows, r => r.sig);
const b2GroupSummaries = [...b2Groups.entries()].map(([sig, members]) => {
    const labels = new Set(members.map(m => m.exactLabel));
    const parents = new Set(members.map(m => m.levelId));
    return {
        sig, n: members.length, labels: [...labels], parents: [...parents],
        mixed: members.length > 1 && labels.size > 1,
        crossParent: parents.size > 1,
        members: members.map(m => ({ caseId: m.caseId, levelId: m.levelId, exactLabel: m.exactLabel })),
    };
});
const b2Multi = b2GroupSummaries.filter(g => g.n > 1);
const b2Mixed = b2Multi.filter(g => g.mixed);
const b2CrossParentPure = b2Multi.filter(g => g.crossParent && !g.mixed);

// ---- Population B: Card-E rescuability (proxy label) ----
const cardEDoc = JSON.parse(readFileSync(cardEFile, 'utf8'));
const cardERows = cardEDoc.rows.map(r => ({
    levelId: r.levelId, reconstructable: r.reconstructable, lengthRemaining: r.commitment.lengthRemaining,
    sig: JSON.stringify([r.commitment.mustCrossPending, r.commitment.mustPassPending, r.commitment.portalJumpsUsed, r.commitment.ints]),
}));
const cardESigs = cardERows.map(r => r.sig);
function countMixed(labels) {
    const groups = new Map();
    for (let i = 0; i < cardESigs.length; i++) { const s = cardESigs[i]; if (!groups.has(s)) groups.set(s, []); groups.get(s).push(labels[i]); }
    let mixed = 0, multi = 0;
    for (const members of groups.values()) { if (members.length > 1) { multi++; if (new Set(members).size > 1) mixed++; } }
    return { mixed, multi };
}
const cardEObserved = countMixed(cardERows.map(r => r.reconstructable));

const rand = mulberry32(0xC5C5);
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
function nullDistribution(fn) {
    const counts = [];
    for (let t = 0; t < trials; t++) counts.push(fn());
    counts.sort((a, b) => a - b);
    const mean = Number((counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(3));
    const pAtMostObserved = counts.filter(x => x <= cardEObserved.mixed).length / counts.length;
    return { mean, p5: counts[Math.floor(trials * 0.05)], p50: counts[Math.floor(trials * 0.5)], p95: counts[Math.floor(trials * 0.95)], pValueAtMostObserved: Number(pAtMostObserved.toFixed(4)) };
}

const rawNull = nullDistribution(() => countMixed(shuffle(cardERows.map(r => r.reconstructable))).mixed);

const sortedByLength = [...cardERows].sort((a, b) => a.lengthRemaining - b.lengthRemaining);
const qSize = Math.ceil(sortedByLength.length / 5);
sortedByLength.forEach((r, i) => { r.lenQuintile = Math.floor(i / qSize); });
const byQuintile = new Map();
for (const r of sortedByLength) { if (!byQuintile.has(r.lenQuintile)) byQuintile.set(r.lenQuintile, []); byQuintile.get(r.lenQuintile).push(r); }
const idxByLevel = new Map(cardERows.map((r, i) => [r.levelId, i]));
function lengthBlockShuffle() {
    const labelsOut = new Array(cardERows.length);
    for (const members of byQuintile.values()) {
        const vals = shuffle(members.map(m => m.reconstructable));
        members.forEach((m, i) => { labelsOut[idxByLevel.get(m.levelId)] = vals[i]; });
    }
    return labelsOut;
}
const lengthBlockedNull = nullDistribution(() => countMixed(lengthBlockShuffle()).mixed);

const document = {
    schemaVersion: 1, kind: 'behavioral-state-quotient-probe', generatedAt: new Date().toISOString(),
    hypothesis: 'reports/2026-09-16-assumption-breaking-solver-development-moonshots-001.md#moonshot-g',
    populationA_B2: {
        source: b2File, note: '28 exact-CP-SAT-labelled states, 14 parent levels, reused unmodified from H1.',
        signature: '(pendingCounts.mustCross, mustPass, flippers, portalPairs)',
        stateCount: b2Rows.length, distinctSignatures: b2Groups.size,
        multiMemberGroups: b2Multi.length, mixedGroups: b2Mixed.length, crossParentPureGroups: b2CrossParentPure.length,
        mixedGroupDetail: b2Mixed.map(g => ({ sig: g.sig, members: g.members })),
        crossParentPureGroupDetail: b2CrossParentPure.map(g => ({ sig: g.sig, members: g.members })),
    },
    populationB_CardE: {
        source: cardEFile, note: '156 rows, one per distinct level (proxy rescuability label, not exact LIVE/DEAD); every multi-member group is inherently cross-parent.',
        signature: '(mustCrossPending, mustPassPending, portalJumpsUsed, ints) -- excludes lengthRemaining',
        stateCount: cardERows.length, distinctSignatures: new Set(cardESigs).size,
        observed: cardEObserved,
        rawShuffleNull: rawNull,
        lengthQuintileBlockedNull: lengthBlockedNull,
        trials,
    },
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({
    b2: { stateCount: b2Rows.length, distinctSignatures: b2Groups.size, multiMemberGroups: b2Multi.length, mixedGroups: b2Mixed.length, crossParentPureGroups: b2CrossParentPure.length },
    cardE: { observed: cardEObserved, rawShuffleNull: rawNull, lengthQuintileBlockedNull: lengthBlockedNull },
}, null, 2));
