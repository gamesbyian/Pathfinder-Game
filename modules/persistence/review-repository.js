// Admin review operations: listing submissions, approving, rejecting,
// and managing published levels.

import { encodeHints, decodeHints } from './level-submission-repository.js';

export function createReviewRepository(client, APP) {
    const { appId } = client;
    const root = () => client.db.collection('artifacts').doc(appId);

    async function initAdminAuth() {
        if (!client.auth) throw new Error('No Firebase connection');
        const provider = new firebase.auth.GoogleAuthProvider();
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
            return snapshot.docs.map(doc => ({
                id:               doc.id,
                levelData:        decodeHints(doc.data().levelData || {}),
                levelFingerprint: doc.data().levelFingerprint || null,
                submittedAt:      doc.data().submittedAt,
                submittedBy:      doc.data().submittedBy,
            }));
        } catch (e) {
            console.warn('[Persistence] loadSubmissions failed', e);
            throw e;
        }
    }

    async function approveSubmission(submissionId, levelData, sortOrder) {
        if (!client.db) throw new Error('No Firebase connection');
        const levelFingerprint = await APP.LevelUtils.getLevelFingerprint(levelData);
        const batch      = client.db.batch();
        const publishRef = root().collection('published_levels').doc();
        batch.set(publishRef, {
            levelData:          encodeHints(levelData),
            levelFingerprint,
            fingerprintVersion: 1,
            approvedAt:         firebase.firestore.FieldValue.serverTimestamp(),
            sortOrder,
        });
        batch.delete(root().collection('submissions').doc(submissionId));
        await batch.commit();
    }

    async function rejectSubmission(submissionId) {
        if (!client.db) throw new Error('No Firebase connection');
        await root().collection('submissions').doc(submissionId).delete();
    }

    async function listPublishedLevelDocs() {
        if (!client.db) return [];
        const snapshot = await root()
            .collection('published_levels')
            .orderBy('sortOrder')
            .get();
        return snapshot.docs.map((doc, idx) => ({
            id:        doc.id,
            number:    (doc.data().sortOrder ?? idx) + 1,
            sortOrder: doc.data().sortOrder ?? idx,
            levelData: decodeHints(doc.data().levelData || {}),
        }));
    }

    async function deletePublishedLevels(ids = []) {
        if (!client.db) throw new Error('No Firebase connection');
        const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
        if (!uniqueIds.length) return;
        const batch = client.db.batch();
        uniqueIds.forEach(id => batch.delete(root().collection('published_levels').doc(id)));
        await batch.commit();
    }

    return { initAdminAuth, loadSubmissions, approveSubmission, rejectSubmission, listPublishedLevelDocs, deletePublishedLevels };
}
