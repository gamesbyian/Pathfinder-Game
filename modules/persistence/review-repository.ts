// Admin review operations: listing submissions, approving, rejecting,
// and managing published levels.

import { encodeHints, decodeHints } from './level-submission-repository.js';
import { mergeUniqueHints } from '../solver/diversification.js';

export function createReviewRepository(client: any, { getLevelFingerprint }: { getLevelFingerprint: (level: any) => any }) {
    const { appId } = client;
    const root = () => client.db.collection('artifacts').doc(appId);

    async function initAdminAuth() {
        if (!client.auth) throw new Error('No Firebase connection');
        await client.auth.signOut();
        const provider = client.createGoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await client.auth.signInWithPopup(provider);
        const user = client.auth.currentUser;
        if (!user || user.email !== 'ianmakesjokes@gmail.com') {
            await client.auth.signOut();
            throw new Error('Access denied for ' + (user?.email || 'unknown account'));
        }
        return user;
    }

    async function loadSubmissions() {
        if (!client.db) return [];
        try {
            const snapshot = await root()
                .collection('submissions')
                .orderBy('submittedAt', 'asc')
                .get();
            return snapshot.docs.map((doc: any) => ({
                id:                     doc.id,
                levelData:              decodeHints(doc.data().levelData || {}),
                levelFingerprint:       doc.data().levelFingerprint || null,
                submittedAt:            doc.data().submittedAt,
                submittedBy:            doc.data().submittedBy,
                type:                   doc.data().type || null,
                targetPublishedLevelId: doc.data().targetPublishedLevelId || null,
            }));
        } catch (e) {
            console.warn('[Persistence] loadSubmissions failed', e);
            throw e;
        }
    }

    async function approveSubmission(submissionId: string, levelData: any, sortOrder: number): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const levelFingerprint = await getLevelFingerprint(levelData);
        const batch      = client.db.batch();
        const publishRef = root().collection('published_levels').doc();
        batch.set(publishRef, {
            levelData:          encodeHints(levelData),
            levelFingerprint,
            fingerprintVersion: 1,
            approvedAt:         client.serverTimestamp(),
            sortOrder,
        });
        batch.delete(root().collection('submissions').doc(submissionId));
        await batch.commit();
    }

    async function approveHintAddition(submissionId: string, targetPublishedLevelId: string, hints: any[]): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const targetRef  = root().collection('published_levels').doc(targetPublishedLevelId);
        const targetSnap = await targetRef.get();
        if (!targetSnap.exists) throw new Error('Target published level no longer exists');
        const targetLevelData = decodeHints(targetSnap.data().levelData || {});
        const mergedHints     = mergeUniqueHints(targetLevelData.hints || [], hints).slice(0, 5);
        const batch = client.db.batch();
        batch.update(targetRef, { levelData: encodeHints({ ...targetLevelData, hints: mergedHints }) });
        batch.delete(root().collection('submissions').doc(submissionId));
        await batch.commit();
    }

    async function rejectSubmission(submissionId: string): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        await root().collection('submissions').doc(submissionId).delete();
    }

    async function listPublishedLevelDocs() {
        if (!client.db) return [];
        const snapshot = await root()
            .collection('published_levels')
            .orderBy('sortOrder')
            .get();
        return snapshot.docs.map((doc: any, idx: number) => ({
            id:        doc.id,
            number:    (doc.data().sortOrder ?? idx) + 1,
            sortOrder: doc.data().sortOrder ?? idx,
            levelData: decodeHints(doc.data().levelData || {}),
        }));
    }

    async function deletePublishedLevels(ids: string[] = []): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
        if (!uniqueIds.length) return;
        const batch = client.db.batch();
        uniqueIds.forEach((id: string) => batch.delete(root().collection('published_levels').doc(id)));
        await batch.commit();
    }

    return { initAdminAuth, loadSubmissions, approveSubmission, approveHintAddition, rejectSubmission, listPublishedLevelDocs, deletePublishedLevels };
}
