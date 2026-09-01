// Admin review operations: listing submissions, approving, rejecting,
// and managing published levels.

import { collection, doc, getDoc, getDocs, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { encodeHints, decodeHints } from './level-submission-repository.js';
import { mergeHints, upgradeLegacyHints, hintPathSignature } from '../domain/hint-types.js';
import { defaultReportError } from '../error-reporting.js';
import { LEVEL_FINGERPRINT_VERSION } from '../domain/level-fingerprint.js';
import type { ReportError } from '../ports.js';
import type { Hint } from '../domain/hint-types.js';

export function createReviewRepository(client: any, { getLevelFingerprint, getLocalLevelHints, saveLocalLevelHintIfNovel, reportError = defaultReportError }: {
    getLevelFingerprint: (level: any) => any,
    getLocalLevelHints: (levelFingerprint: string) => Promise<Hint[]>,
    saveLocalLevelHintIfNovel: (levelFingerprint: string, path: number[], pathSignature: string, provenance: any, alreadyKnown: ReadonlySet<string>) => Promise<boolean>,
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
     *  hint rediscovered by this addition gets its find appended rather than dropped. */
    async function approveHintAddition(submissionId: string, targetPublishedLevelId: string, hints: any[]): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const targetRef  = doc(published(), targetPublishedLevelId);
        const targetSnap = await getDoc(targetRef);
        if (!targetSnap.exists()) throw new Error('Target published level no longer exists');
        const targetLevelData = decodeHints(targetSnap.data()!.levelData || {});
        const mergedHints     = mergeHints(upgradeLegacyHints(targetLevelData.hints), upgradeLegacyHints(hints)).slice(0, 5);
        const batch = writeBatch(client.db);
        batch.update(targetRef, { levelData: encodeHints({ ...targetLevelData, hints: mergedHints }) });
        batch.delete(doc(submissions(), submissionId));
        await batch.commit();
    }

    /** Same idea as approveHintAddition, but for a level published in the local levels.json
     *  corpus rather than a Firestore published_levels doc — there's no single document to merge
     *  into, so each novel hint becomes its own entry in local_level_hints (see
     *  local-level-hints-repository.ts). Not a single atomic batch (each entry write is its own
     *  independent create, and the count/duplicate check is inherently best-effort already — see
     *  docs/firestore-security-model.md); the submission is deleted last so a failure partway
     *  through leaves it in the queue for a retry rather than silently losing the report. */
    async function approveLocalHintAddition(submissionId: string, levelFingerprint: string, hints: Hint[]): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const existing = await getLocalLevelHints(levelFingerprint);
        const knownSignatures = new Set(existing.map((h) => hintPathSignature(h.path)));
        for (const hint of hints) {
            const signature = hintPathSignature(hint.path);
            const provenanceEntry = hint.provenance[hint.provenance.length - 1];
            if (!provenanceEntry) continue;
            const saved = await saveLocalLevelHintIfNovel(levelFingerprint, hint.path, signature, provenanceEntry, knownSignatures);
            if (saved) knownSignatures.add(signature);
        }
        await deleteDoc(doc(submissions(), submissionId));
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
