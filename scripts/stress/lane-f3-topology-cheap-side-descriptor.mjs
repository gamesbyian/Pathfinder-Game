#!/usr/bin/env node
/**
 * Lane F3 topology per-instance microscope, per docs/solver-optimization-workstreams.md's
 * "seek a sound actionable consequence (separator-side commitment, path-conditioned accessibility,
 * topology-aware impossibility/equivalence)." Direct continuation of the controlled open-path
 * topology fork pilot (reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md),
 * whose own "Next gate" section asks: "derive a compact, generic, runtime-legal descriptor of
 * 'which side of a nearby puncture the current path already committed to' ... then test whether
 * that descriptor predicts completion feasibility."
 *
 * The pilot's own observer (modules/solver/open-path-topology-observer.ts) computes a full
 * continuous winding-number-style phase by integrating a signed angle over EVERY step of a path
 * around EVERY board puncture -- O(segment length) atan2 calls per puncture, accumulated. This asks
 * a cheaper alternative: a fork pair's two segments always share identical start/end anchors (that
 * is what makes it a fork), so a start-to-end-only test is structurally blind to the route between
 * them and cannot possibly distinguish the two paths -- ruled out analytically before running
 * anything. Instead this tests the cheapest descriptor that DOES depend on route shape: find the
 * single path step closest to the puncture (a linear distance scan, no trig), then take the sign of
 * one cross product between the path vertices immediately before/after that closest approach. This
 * needs no atan2 and no accumulation across the whole segment -- just a min-distance scan plus one
 * local cross product -- and asks whether that local "which side at closest approach" reproduces
 * the full phase integral's "which side overall" classification.
 *
 * Zero new solver compute: this is a pure re-analysis of the pilot's own already-committed,
 * already-audited fork-segment/phase/exact-label data (10 pairs, 0 abstains, 0 correctness alarms).
 *
 * Usage:
 *   node scripts/stress/lane-f3-topology-cheap-side-descriptor.mjs \
 *     --out=reports/stress/lane-f3-topology-cheap-side-descriptor-2026-09-17.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const OUT_FILE = arg('out', null);

const candidatesFiles = [
    'reports/stress/class5-topology-fork-candidates-2026-09-16.json',
    'reports/stress/class5-topology-fork-replication-candidates-2026-09-16.json',
];
const analysisFile = 'reports/stress/class5-topology-fork-analysis-2026-09-16.json';

const analysis = JSON.parse(readFileSync(path.resolve(ROOT, analysisFile), 'utf8'));
const discordantById = new Map(analysis.pairs.map((p) => [p.pairId, p]));

const candidates = candidatesFiles.flatMap((f) => JSON.parse(readFileSync(path.resolve(ROOT, f), 'utf8')).candidates);

/** Cheap closest-approach side descriptor: find the path step nearest the puncture (linear
 * distance scan, no trig), then take the sign of one cross product between the path vertices
 * immediately before/after it -- no atan2, no accumulation across the whole segment. Also reports
 * whether multiple steps tied for closest (a degeneracy: the path grazes the puncture at roughly
 * constant distance across several steps, e.g. when it wraps most of the way around it -- exactly
 * the case a single nearest-point test cannot represent but a true winding count can). */
function closestApproachSign(segmentXY, punctureXY) {
    // puncture keys are 0-based cell coordinates; observer's point() adds 0.5 for cell center.
    // segmentXY is 1-based wire coords -> cell center = coord - 0.5, matching the observer's point().
    const px = punctureXY[0] + 0.5, py = punctureXY[1] + 0.5;
    const cells = segmentXY.map(([x, y]) => [x - 0.5, y - 0.5]);
    const dists = cells.map(([x, y]) => (x - px) ** 2 + (y - py) ** 2);
    const closestDist = Math.min(...dists);
    const tiedIndices = dists.map((d, i) => (d === closestDist ? i : -1)).filter((i) => i >= 0);
    const closestIdx = tiedIndices[0];
    const beforeIdx = Math.max(0, closestIdx - 1), afterIdx = Math.min(cells.length - 1, closestIdx + 1);
    const [bx0, by0] = cells[beforeIdx], [ax0, ay0] = cells[afterIdx];
    const ax = bx0 - px, ay = by0 - py, bx = ax0 - px, by = ay0 - py;
    const cross = ax * by - ay * bx;
    return { sign: cross === 0 ? 0 : Math.sign(cross), tiedClosestCount: tiedIndices.length };
}

function unpackPuncture(key) {
    return [key & 0xffff, key >>> 16];
}

const rows = [];
for (const c of candidates) {
    const verdict = discordantById.get(c.pairId);
    if (!verdict) continue;
    for (const phaseO of c.original.observation.phases) {
        const phaseA = c.alternate.observation.phases.find((p) => p.punctureKey === phaseO.punctureKey);
        if (!phaseA) continue;
        const phaseDelta = Math.abs(phaseO.phaseTurns - phaseA.phaseTurns);
        const punctureXY = unpackPuncture(phaseO.punctureKey);
        const closestO = closestApproachSign(c.original.pathXY, punctureXY);
        const closestA = closestApproachSign(c.alternate.pathXY, punctureXY);
        const cheapSignO = closestO.sign, cheapSignA = closestA.sign;
        const cheapDisagrees = cheapSignO !== 0 && cheapSignA !== 0 && cheapSignO !== cheapSignA;
        const tiedClosestPoints = closestO.tiedClosestCount > 1 || closestA.tiedClosestCount > 1;
        const phaseSignO = Math.sign(phaseO.phaseTurns);
        const phaseSignA = Math.sign(phaseA.phaseTurns);
        const phaseDisagrees = phaseSignO !== 0 && phaseSignA !== 0 && phaseSignO !== phaseSignA;
        rows.push({
            pairId: c.pairId, parentId: c.parentId, punctureKey: phaseO.punctureKey,
            phaseDelta, phaseSignO, phaseSignA, phaseDisagrees,
            cheapSignO, cheapSignA, cheapDisagrees, tiedClosestPoints,
            tiedClosestCountO: closestO.tiedClosestCount, tiedClosestCountA: closestA.tiedClosestCount,
            pairDiscordant: verdict.discordant,
            isDecisivePuncture: phaseDelta > 0.5, // the pilot's own construction targets ~1.0-turn deltas at the decisive puncture
        });
    }
}

// Agreement: does the cheap O(1) descriptor's disagreement flag match the full phase integral's
// disagreement flag, restricted to the decisive puncture per pair (the one the pilot's construction
// actually targeted -- most punctures on a board are irrelevant to a given fork and both methods
// should trivially agree "no difference" there, which is not the interesting test).
const decisiveRows = rows.filter((r) => r.isDecisivePuncture);
const cheapMatchesPhaseOnDecisive = decisiveRows.filter((r) => r.cheapDisagrees === r.phaseDisagrees);
const allMatches = rows.filter((r) => r.cheapDisagrees === r.phaseDisagrees);
const discordantDecisiveRows = decisiveRows.filter((r) => r.pairDiscordant);
const discordantMatches = discordantDecisiveRows.filter((r) => r.cheapDisagrees === r.phaseDisagrees);
const concordantDecisiveRows = decisiveRows.filter((r) => !r.pairDiscordant);
const concordantMatches = concordantDecisiveRows.filter((r) => r.cheapDisagrees === r.phaseDisagrees);
const mismatches = decisiveRows.filter((r) => r.cheapDisagrees !== r.phaseDisagrees);
const mismatchesWithTie = mismatches.filter((r) => r.tiedClosestPoints);

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane F3 topology per-instance microscope -- cheap closest-approach side descriptor vs. the full O(segment-length) atan2 phase-integral observer, zero new solver compute',
    sourceCandidates: candidatesFiles, sourceAnalysis: analysisFile,
    method: 'for every (fork pair, board puncture) combination already computed by the topology fork pilot, compare the full phase-integral\'s original-vs-alternate sign disagreement against a cheap closest-approach-vertex cross-product sign disagreement (linear distance scan, no trig, no accumulation)',
    totalPunctureRows: rows.length,
    decisivePunctureRows: decisiveRows.length,
    agreementOnDecisivePunctures: `${cheapMatchesPhaseOnDecisive.length}/${decisiveRows.length}`,
    agreementOnAllPunctures: `${allMatches.length}/${rows.length}`,
    agreementOnDiscordantPairs: `${discordantMatches.length}/${discordantDecisiveRows.length}`,
    agreementOnConcordantPairs: `${concordantMatches.length}/${concordantDecisiveRows.length}`,
    mismatchCount: mismatches.length,
    mismatchesWithTiedClosestPoint: mismatchesWithTie.length,
    decisiveRows,
};
console.log(`Decisive-puncture agreement: ${cheapMatchesPhaseOnDecisive.length}/${decisiveRows.length}`);
console.log(`All-puncture agreement: ${allMatches.length}/${rows.length}`);
console.log(`Discordant-pair agreement: ${discordantMatches.length}/${discordantDecisiveRows.length}`);
console.log(`Concordant-pair agreement: ${concordantMatches.length}/${concordantDecisiveRows.length}`);
console.log(`Mismatches with a tied closest point: ${mismatchesWithTie.length}/${mismatches.length}`);
console.log(JSON.stringify(decisiveRows, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
