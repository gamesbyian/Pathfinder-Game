// Admin review operations: listing submissions, approving, rejecting,
// and managing published levels.

import { collection, doc, getDoc, getDocs, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { encodeHints, decodeHints } from './level-submission-repository.js';
import { mergeHints, upgradeLegacyHints, hintPathSignature, provenanceEventKey } from '../domain/hint-types.js';
import { defaultReportError } from '../error-reporting.js';
import { LEVEL_FINGERPRINT_VERSION } from '../domain/level-fingerprint.js';
import type { ReportError } from '../ports.js';
import type { Hint } from '../domain/hint-types.js';
import type { SaveLocalLevelHintOutcome } from './local-level-hints-repository.js';

/** Per-outcome tally for approveLocalHintAddition() — see its own doc comment for why this is
 *  richer than a plain success/fail. */
export interface LocalHintAdditionSummary {
    /** Number of distinct submitted paths for which at least one provenance event was persisted. */
    pathsWithSavedEvidence: number;
    /** Number of provenance events persisted across those paths. */
    saved: number;
    duplicateNotRecorded: number;
    capacityReached: number;
}

export async function persistLocalHintAdditionEvents({
    levelFingerprint,
    hints,
    existing,
    saveLocalLevelHintIfNovel,
}: {
    levelFingerprint: string;
    hints: Hint[];
    existing: Hint[];
    saveLocalLevelHintIfNovel: (levelFingerprint: string, path: number[], pathSignature: string, provenance: any, alreadyKnownEventKeys: ReadonlySet<string>) => Promise<SaveLocalLevelHintOutcome>;
}): Promise<LocalHintAdditionSummary> {
    const knownEventKeys = new Set(
        existing.flatMap((h) => h.provenance.map((entry) => provenanceEventKey(hintPathSignature(h.path), entry))),
    );
    const summary: LocalHintAdditionSummary = {
        pathsWithSavedEvidence: 0,
        saved: 0,
        duplicateNotRecorded: 0,
        capacityReached: 0,
    };
    for (const hint of hints) {
        const signature = hintPathSignature(hint.path);
        let pathSaved = false;
        for (const provenanceEntry of hint.provenance ?? []) {
            const outcome = await saveLocalLevelHintIfNovel(
                levelFingerprint,
                hint.path,
                signature,
                provenanceEntry,
                knownEventKeys,
            );
            if (outcome.saved) {
                knownEventKeys.add(provenanceEventKey(signature, provenanceEntry));
                summary.saved++;
                pathSaved = true;
            } else if (outcome.reason === 'duplicate-provenance-not-recorded') {
                summary.duplicateNotRecorded++;
            } else if (outcome.reason === 'capacity-reached') {
                summary.capacityReached++;
            }
        }
        if (pathSaved) summary.pathsWithSavedEvidence++;
    }
    return summary;
}

// Firestore's hard per-document limit is 1,048,576 bytes for the WHOLE document, not just the
// hints field -- levelData also carries grid/gate/goal/provenance fields. 900,000 bytes leaves
// ~148 KiB of headroom for the rest of levelData plus Firestore's own field/index encoding
// overhead, matching the 900k/950k candidate thresholds the pre-implementation audit itself
// measured against real encoded Hint arrays
// (reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md's Firestore
// sizing section). This is a conservative safety margin, not a claim about the eventual bounded-
// growth persistence unit Phase 3 will define.
export const FIRESTORE_HINT_CAPACITY_BUDGET_BYTES = 900_000;

/** Byte size of an encoded levelData document (JSON + UTF-8), for comparison against Firestore's
 *  real per-document budget. Pure/exported so this can be unit-tested without a Firestore mock —
 *  see local-level-hints-repository.test.ts's header comment for why no persistence repo in this
 *  codebase has emulator/mock-backed tests. */
export function encodedLevelDataByteSize(encodedLevelData: any): number {
    return new TextEncoder().encode(JSON.stringify(encodedLevelData)).length;
}

export function createReviewRepository(client: any, { getLevelFingerprint, getLocalLevelHints, saveLocalLevelHintIfNovel, reportError = defaultReportError }: {
    getLevelFingerprint: (level: any) => any,
    getLocalLevelHints: (levelFingerprint: string) => Promise<Hint[]>,
    saveLocalLevelHintIfNovel: (levelFingerprint: string, path: number[], pathSignature: string, provenance: any, alreadyKnownEventKeys: ReadonlySet<string>) => Promise<SaveLocalLevelHintOutcome>,
    reportError?: ReportError,
}) {
    const { appId } = client;
    const root = () => doc(client.db, 'artifacts', appId);
    const submissions = () => collection(root(), 'submissions');
    const published = () => collection(root(), 'published_levels');

    async function initAdminAuth() {
        if (!client.auth) throw new Error('No Firebase connection');
        await client.signOut();
        const provider = client.createGoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await client.signInWithPopup(provider);
        const user = client.auth.currentUser;
        if (!user || user.email !== 'ianmakesjokes@gmail.com') {
            await client.signOut();
            throw new Error('Access denied for ' + (user?.email || 'unknown account'));
        }
        return user;
    }

    async function loadSubmissions() {
        if (!client.db) return [];
        try {
            const snapshot = await getDocs(query(submissions(), orderBy('submittedAt', 'asc')));
            return snapshot.docs.map((snap: any) => ({
                id:                     snap.id,
                levelData:              decodeHints(snap.data().levelData || {}),
                levelFingerprint:       snap.data().levelFingerprint || null,
                submittedAt:            snap.data().submittedAt,
                submittedBy:            snap.data().submittedBy,
                type:                   snap.data().type || null,
                targetPublishedLevelId: snap.data().targetPublishedLevelId || null,
                targetLocalLevelFingerprint: snap.data().targetLocalLevelFingerprint || null,
            }));
        } catch (e) {
            reportError('persistence.load-submissions', e);
            throw e;
        }
    }

    async function approveSubmission(submissionId: string, levelData: any, sortOrder: number): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const levelFingerprint = await getLevelFingerprint(levelData);
        const batch      = writeBatch(client.db);
        const publishRef = doc(published());
        batch.set(publishRef, {
            levelData:          encodeHints(levelData),
            levelFingerprint,
            fingerprintVersion: LEVEL_FINGERPRINT_VERSION,
            approvedAt:         client.serverTimestamp(),
            sortOrder,
        });
        batch.delete(doc(submissions(), submissionId));
        await batch.commit();
    }

    /** `hints` is the canonical Hint[] (path + provenance) the reviewer is contributing — see
     *  review-controller.ts's reconcileHints() call at the approve-button handler. Merged against
     *  the target's existing Hint[] by path signature (mergeHints), so provenance survives and a
     *  hint rediscovered by this addition gets its find appended rather than dropped.
     *
     *  No count-based cap: the pre-implementation audit
     *  (reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md) found this
     *  used to silently `.slice(0, 5)` the merged set -- a legacy pre-provenance-era value with no
     *  current justification, discarding real evidence on every approval for any level with more
     *  than 5 known hints. Firestore's actual constraint is a 1 MiB total document size, not a hint
     *  count, so capacity is checked in bytes against FIRESTORE_HINT_CAPACITY_BUDGET_BYTES. When the
     *  full merge does not fit, this throws rather than silently truncating -- the caller (see
     *  review-controller.ts) already surfaces the thrown message to the admin, and throwing before
     *  batch.commit() leaves the submission undeleted so it is retried, not lost. This is a Phase 1
     *  containment fix, not the final bounded-growth persistence design (that is a Phase 3 item in
     *  docs/hint-evidence-execution-identity-storage-consolidation-plan.md) -- it stops the known
     *  silent-loss defect without committing to event/occurrence-child documents or any other final
     *  physical layout. */
    async function approveHintAddition(submissionId: string, targetPublishedLevelId: string, hints: any[]): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const targetRef  = doc(published(), targetPublishedLevelId);
        const targetSnap = await getDoc(targetRef);
        if (!targetSnap.exists()) throw new Error('Target published level no longer exists');
        const targetLevelData = decodeHints(targetSnap.data()!.levelData || {});
        const mergedHints     = mergeHints(upgradeLegacyHints(targetLevelData.hints), upgradeLegacyHints(hints));
        const encodedLevelData = encodeHints({ ...targetLevelData, hints: mergedHints });
        const encodedBytes = encodedLevelDataByteSize(encodedLevelData);
        if (encodedBytes > FIRESTORE_HINT_CAPACITY_BUDGET_BYTES) {
            throw new Error(
                `Capacity exceeded: this level's full hint history (${mergedHints.length} hints, ` +
                `~${encodedBytes.toLocaleString()} bytes) does not fit Firestore's per-document budget ` +
                `(${FIRESTORE_HINT_CAPACITY_BUDGET_BYTES.toLocaleString()} bytes). Nothing was saved and ` +
                `this submission was not removed from the queue. This level needs the capacity-aware ` +
                `hint storage redesign tracked in the hint evidence consolidation plan before more hints ` +
                `can be approved for it.`,
            );
        }
        const batch = writeBatch(client.db);
        batch.update(targetRef, { levelData: encodedLevelData });
        batch.delete(doc(submissions(), submissionId));
        await batch.commit();
    }

    /** Same idea as approveHintAddition, but for a level published in the local levels.json
     *  corpus rather than a Firestore published_levels doc — there's no single document to merge
     *  into, so each novel hint becomes its own entry in local_level_hints (see
     *  local-level-hints-repository.ts). Not a single atomic batch (each entry write is its own
     *  independent create, and the count/duplicate check is inherently best-effort already — see
     *  docs/firestore-security-model.md); the submission is deleted last so a failure partway
     *  through leaves it in the queue for a retry rather than silently losing the report.
     *
     *  Returns a per-outcome tally rather than void: a genuinely NEW discovery event for an
     *  already-known path gets its own sibling entry (see local-level-hints-repository.ts's
     *  entryIdFor), but the exact same discovery event submitted twice is still a real duplicate
     *  refused as a no-op, so a submission consisting entirely of such duplicates would otherwise
     *  complete "successfully" while persisting nothing. Surfacing the tally lets the caller
     *  (review-controller.ts) tell the admin what actually happened instead of a blanket "Hints
     *  added!" regardless of outcome. */
    async function approveLocalHintAddition(submissionId: string, levelFingerprint: string, hints: Hint[]): Promise<LocalHintAdditionSummary> {
        if (!client.db) throw new Error('No Firebase connection');
        const existing = await getLocalLevelHints(levelFingerprint);
        const summary = await persistLocalHintAdditionEvents({
            levelFingerprint,
            hints,
            existing,
            saveLocalLevelHintIfNovel,
        });
        if (summary.capacityReached > 0) {
            throw new Error(
                `Capacity exceeded while saving local hint evidence: ${summary.capacityReached} provenance event(s) were not persisted. `
                + `The submission remains in the review queue; ${summary.saved} event(s) already saved will dedupe on retry.`,
            );
        }
        await deleteDoc(doc(submissions(), submissionId));
        return summary;
    }

    async function rejectSubmission(submissionId: string): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        await deleteDoc(doc(submissions(), submissionId));
    }

    async function listPublishedLevelDocs() {
        if (!client.db) return [];
        const snapshot = await getDocs(query(published(), orderBy('sortOrder')));
        return snapshot.docs.map((snap: any, idx: number) => ({
            id:        snap.id,
            number:    (snap.data().sortOrder ?? idx) + 1,
            sortOrder: snap.data().sortOrder ?? idx,
            levelData: decodeHints(snap.data().levelData || {}),
        }));
    }

    async function deletePublishedLevels(ids: string[] = []): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
        if (!uniqueIds.length) return;
        const batch = writeBatch(client.db);
        uniqueIds.forEach((id: string) => batch.delete(doc(published(), id)));
        await batch.commit();
    }

    return { initAdminAuth, loadSubmissions, approveSubmission, approveHintAddition, approveLocalHintAddition, rejectSubmission, listPublishedLevelDocs, deletePublishedLevels };
}
