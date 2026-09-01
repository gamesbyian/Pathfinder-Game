// Level submission and published level access.
// encodeHints/decodeHints are exported so review-repository.ts can share them.
import { collection, doc, getDocs, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { defaultReportError } from '../error-reporting.js';
import { LEVEL_FINGERPRINT_VERSION } from '../domain/level-fingerprint.js';
import { hintPaths, upgradeLegacyHints } from '../domain/hint-types.js';
import type { ReportError } from '../ports.js';

export function encodeHints(levelData: any): any {
    if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
    return { ...levelData, hints: levelData.hints.map((h: any) => JSON.stringify(h)) };
}

export function decodeHints(levelData: any): any {
    if (!Array.isArray(levelData?.hints) || !levelData.hints.length) return levelData;
    return { ...levelData, hints: levelData.hints.map((h: any) => typeof h === 'string' ? JSON.parse(h) : h) };
}

export function createLevelSubmissionRepository(
    client: any, { isSameLevelStructure, getLevelFingerprint, reportError = defaultReportError }: { isSameLevelStructure: (a: any, b: any) => boolean, getLevelFingerprint: (level: any) => any, reportError?: ReportError },
) {
    const { appId } = client;
    const root = () => doc(client.db, 'artifacts', appId);

    function duplicateMatchFromDoc(snap: any, levelData: any, levelFingerprint: string, source: string): any {
        const data = snap.data() || {};
        const existingLevelData = decodeHints(data.levelData || {});
        const isMatch = data.levelFingerprint === levelFingerprint
            || (existingLevelData && isSameLevelStructure(existingLevelData, levelData));
        if (!isMatch) return null;
        // Duplicate-detection compares plain paths only (submission-core.ts's selectNovelHints) —
        // unwrap the canonical Hint[] the decoded doc carries down to bare paths for that purpose.
        // The actual Hint records (with provenance) for the final submission come from the working
        // level/session state, not from this match object.
        const hints = hintPaths(upgradeLegacyHints(existingLevelData?.hints));
        return { source, id: snap.id, levelFingerprint, hints };
    }

    async function findDuplicateLevel(levelData: any): Promise<any> {
        if (!client.db) throw new Error('No Firebase connection');
        const levelFingerprint = await getLevelFingerprint(levelData);
        const warnings: string[] = [];

        const checkCollection = async (collectionName: string, source: string): Promise<any> => {
            const col = collection(root(), collectionName);
            try {
                const indexedSnapshot = await client.withTimeout(
                    getDocs(query(col, where('levelFingerprint', '==', levelFingerprint), limit(1))),
                    15000,
                    `Duplicate ${source} fingerprint query timed out`
                );
                for (const snap of indexedSnapshot.docs) {
                    const match = duplicateMatchFromDoc(snap, levelData, levelFingerprint, source);
                    if (match) return match;
                }
                // Version bridge: the indexed query above only matches docs stamped with the
                // CURRENT fingerprintVersion. Any doc written under an older fingerprint
                // algorithm (see LEVEL_FINGERPRINT_VERSION) never matches that query, no matter
                // how similar the level — so without this full scan, every fingerprint-version
                // bump would silently stop detecting duplicates against the entire pre-bump
                // history. duplicateMatchFromDoc falls back to isSameLevelStructure (a live
                // recomputation under the CURRENT algorithm) for exactly this reason, which is
                // why this scan still finds a match even when levelFingerprint strings differ.
                const fullSnapshot = await client.withTimeout(
                    getDocs(col),
                    15000,
                    `Duplicate ${source} legacy scan timed out`
                );
                for (const snap of fullSnapshot.docs) {
                    const match = duplicateMatchFromDoc(snap, levelData, levelFingerprint, source);
                    if (match) return match;
                }
            } catch (e) {
                reportError('persistence.duplicate-check', e, { source });
                warnings.push(source);
            }
            return null;
        };

        const pendingMatch  = await checkCollection('submissions',      'pending');
        if (pendingMatch)  return { duplicate: pendingMatch,  levelFingerprint, warnings };
        const approvedMatch = await checkCollection('published_levels', 'approved');
        if (approvedMatch) return { duplicate: approvedMatch, levelFingerprint, warnings };
        return { duplicate: null, levelFingerprint, warnings };
    }

    async function submitLevel(levelData: any, options: any = {}): Promise<void> {
        if (!client.db) throw new Error('No Firebase connection');
        const user = await client.waitForUser();
        if (!user) throw new Error('Not signed in');

        let levelFingerprint = options.levelFingerprint || await getLevelFingerprint(levelData);
        if (!options.skipDuplicateCheck) {
            const duplicateCheck = await findDuplicateLevel(levelData);
            levelFingerprint = duplicateCheck.levelFingerprint || levelFingerprint;
            if (duplicateCheck.duplicate) {
                const sourceLabel = duplicateCheck.duplicate.source === 'approved' ? 'approved levels' : 'pending submissions';
                const err = new Error(`Duplicate level found in ${sourceLabel}`) as any;
                err.code = 'duplicate-level';
                err.duplicate = duplicateCheck.duplicate;
                throw err;
            }
        }
        console.log('[Submit] Writing to Firestore as uid:', user.uid);
        const col = collection(root(), 'submissions');
        const docData: any = {
            levelData:          encodeHints(levelData),
            levelFingerprint,
            fingerprintVersion: LEVEL_FINGERPRINT_VERSION,
            submittedAt:        client.serverTimestamp(),
            submittedBy:        user.uid,
        };
        if (options.targetPublishedLevelId) {
            docData.type = 'hintAddition';
            docData.targetPublishedLevelId = options.targetPublishedLevelId;
        } else if (options.targetLocalLevelFingerprint) {
            docData.type = 'localHintAddition';
            docData.targetLocalLevelFingerprint = options.targetLocalLevelFingerprint;
        }
        await client.withTimeout(
            addDoc(col, docData),
            20000,
            'Firestore write timed out after 20s — check network or Firebase rules'
        );
        console.log('[Submit] Firestore write acknowledged.');
    }

    async function loadPublishedLevels(): Promise<any[]> {
        if (!client.db) return [];
        try {
            const snapshot = (await Promise.race([
                getDocs(query(collection(root(), 'published_levels'), orderBy('sortOrder'))),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
            ])) as any;
            return snapshot.docs.map((snap: any) => decodeHints(snap.data().levelData)).filter(Boolean);
        } catch (e) {
            reportError('persistence.load-published-levels', e);
            return [];
        }
    }

    return { findDuplicateLevel, submitLevel, loadPublishedLevels };
}
