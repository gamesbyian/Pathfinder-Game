// Level submission and published level access.
// encodeHints/decodeHints are exported so review-repository.ts can share them.

export function encodeHints(levelData: any): any {
    if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
    return { ...levelData, hints: levelData.hints.map((h: any) => JSON.stringify(h)) };
}

export function decodeHints(levelData: any): any {
    if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
    return { ...levelData, hints: levelData.hints.map((h: any) => typeof h === 'string' ? JSON.parse(h) : h) };
}

export function createLevelSubmissionRepository(
    client: any, { isSameLevelStructure, getLevelFingerprint }: { isSameLevelStructure: (a: any, b: any) => boolean, getLevelFingerprint: (level: any) => any },
) {
    const { appId } = client;
    const root = () => client.db.collection('artifacts').doc(appId);

    function duplicateMatchFromDoc(doc: any, levelData: any, fingerprint: string, source: string): any {
        const data = doc.data() || {};
        const existingLevelData = decodeHints(data.levelData || {});
        const isMatch = data.levelFingerprint === fingerprint
            || (existingLevelData && isSameLevelStructure(existingLevelData, levelData));
        if (!isMatch) return null;
        const hints = Array.isArray(existingLevelData?.hints) ? existingLevelData.hints : [];
        return { source, id: doc.id, fingerprint, hints };
    }

    async function findDuplicateLevel(levelData: any): Promise<any> {
        if (!client.db) throw new Error('No Firebase connection');
        const fingerprint = await getLevelFingerprint(levelData);
        const warnings: string[] = [];

        const checkCollection = async (collectionName: string, source: string): Promise<any> => {
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

    async function submitLevel(levelData: any, options: any = {}): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const user = await client.waitForUser();
        if (!user) throw new Error('Not signed in');

        let levelFingerprint = options.levelFingerprint || await getLevelFingerprint(levelData);
        if (!options.skipDuplicateCheck) {
            const duplicateCheck = await findDuplicateLevel(levelData);
            levelFingerprint = duplicateCheck.fingerprint || levelFingerprint;
            if (duplicateCheck.duplicate) {
                const sourceLabel = duplicateCheck.duplicate.source === 'approved' ? 'approved levels' : 'pending submissions';
                const err = new Error(`Duplicate level found in ${sourceLabel}`) as any;
                err.code = 'duplicate-level';
                err.duplicate = duplicateCheck.duplicate;
                throw err;
            }
        }
        console.log('[Submit] Writing to Firestore as uid:', user.uid);
        const col = root().collection('submissions');
        const doc: any = {
            levelData:          encodeHints(levelData),
            levelFingerprint,
            fingerprintVersion: 1,
            submittedAt:        client.serverTimestamp(),
            submittedBy:        user.uid,
        };
        if (options.targetPublishedLevelId) {
            doc.type = 'hintAddition';
            doc.targetPublishedLevelId = options.targetPublishedLevelId;
        }
        await client.withTimeout(
            col.add(doc),
            20000,
            'Firestore write timed out after 20s — check network or Firebase rules'
        );
        console.log('[Submit] Firestore write acknowledged.');
    }

    async function loadPublishedLevels(): Promise<any[]> {
        if (!client.db) return [];
        try {
            const snapshot = (await Promise.race([
                root().collection('published_levels').orderBy('sortOrder').get(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
            ])) as any;
            return snapshot.docs.map((doc: any) => decodeHints(doc.data().levelData)).filter(Boolean);
        } catch (e) {
            console.warn('[Persistence] loadPublishedLevels failed', e);
            return [];
        }
    }

    return { findDuplicateLevel, submitLevel, loadPublishedLevels };
}
