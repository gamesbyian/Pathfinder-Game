// Level submission and published level access.
// encodeHints/decodeHints are exported so review-repository.js can share them.

export function encodeHints(levelData) {
    if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
    return { ...levelData, hints: levelData.hints.map(h => JSON.stringify(h)) };
}

export function decodeHints(levelData) {
    if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
    return { ...levelData, hints: levelData.hints.map(h => typeof h === 'string' ? JSON.parse(h) : h) };
}

export function createLevelSubmissionRepository(client, { isSameLevelStructure, getLevelFingerprint }) {
    const { appId } = client;
    const root = () => client.db.collection('artifacts').doc(appId);

    function duplicateMatchFromDoc(doc, levelData, fingerprint, source) {
        const data = doc.data() || {};
        if (data.levelFingerprint === fingerprint) return { source, id: doc.id, fingerprint };
        const existingLevelData = decodeHints(data.levelData || {});
        if (existingLevelData && isSameLevelStructure(existingLevelData, levelData)) {
            return { source, id: doc.id, fingerprint };
        }
        return null;
    }

    async function findDuplicateLevel(levelData) {
        if (!client.db) throw new Error('No Firebase connection');
        const fingerprint = await getLevelFingerprint(levelData);
        const warnings = [];

        const checkCollection = async (collectionName, source) => {
            const col = root().collection(collectionName);
            try {
                const indexedSnapshot = await client.withTimeout(
                    col.where('levelFingerprint', '==', fingerprint).limit(1).get(),
                    15000,
                    `Duplicate ${source} fingerprint query timed out`
                );
                for (const doc of indexedSnapshot.docs) {
                    const match = duplicateMatchFromDoc(doc, levelData, fingerprint, source);
                    if (match) return match;
                }
                const fullSnapshot = await client.withTimeout(
                    col.get(),
                    15000,
                    `Duplicate ${source} legacy scan timed out`
                );
                for (const doc of fullSnapshot.docs) {
                    const match = duplicateMatchFromDoc(doc, levelData, fingerprint, source);
                    if (match) return match;
                }
            } catch (e) {
                console.warn(`[Persistence] duplicate ${source} check failed`, e);
                warnings.push(source);
            }
            return null;
        };

        const pendingMatch  = await checkCollection('submissions',      'pending');
        if (pendingMatch)  return { duplicate: pendingMatch,  fingerprint, warnings };
        const approvedMatch = await checkCollection('published_levels', 'approved');
        if (approvedMatch) return { duplicate: approvedMatch, fingerprint, warnings };
        return { duplicate: null, fingerprint, warnings };
    }

    async function submitLevel(levelData, options = {}) {
        if (!client.db) throw new Error('No Firebase connection');
        const user = await client.waitForUser();
        if (!user) throw new Error('Not signed in');

        let levelFingerprint = options.levelFingerprint || await getLevelFingerprint(levelData);
        if (!options.skipDuplicateCheck) {
            const duplicateCheck = await findDuplicateLevel(levelData);
            levelFingerprint = duplicateCheck.fingerprint || levelFingerprint;
            if (duplicateCheck.duplicate) {
                const sourceLabel = duplicateCheck.duplicate.source === 'approved' ? 'approved levels' : 'pending submissions';
                const err = new Error(`Duplicate level found in ${sourceLabel}`);
                err.code = 'duplicate-level';
                err.duplicate = duplicateCheck.duplicate;
                throw err;
            }
        }
        console.log('[Submit] Writing to Firestore as uid:', user.uid);
        const col = root().collection('submissions');
        await client.withTimeout(
            col.add({
                levelData:          encodeHints(levelData),
                levelFingerprint,
                fingerprintVersion: 1,
                submittedAt:        client.serverTimestamp(),
                submittedBy:        user.uid,
            }),
            20000,
            'Firestore write timed out after 20s — check network or Firebase rules'
        );
        console.log('[Submit] Firestore write acknowledged.');
    }

    async function loadPublishedLevels() {
        if (!client.db) return [];
        try {
            const snapshot = await Promise.race([
                root().collection('published_levels').orderBy('sortOrder').get(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
            ]);
            return snapshot.docs.map(doc => decodeHints(doc.data().levelData)).filter(Boolean);
        } catch (e) {
            console.warn('[Persistence] loadPublishedLevels failed', e);
            return [];
        }
    }

    return { findDuplicateLevel, submitLevel, loadPublishedLevels };
}
