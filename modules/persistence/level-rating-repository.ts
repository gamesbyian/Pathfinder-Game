// Dev-mode level rating/tagging storage.
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

export function createLevelRatingRepository(client: any) {
    const { appId } = client;
    const ratings = () => collection(doc(client.db, 'artifacts', appId), 'level_ratings');

    async function loadLevelRating(levelFingerprint: string): Promise<any> {
        if (!client.db || !levelFingerprint) return null;
        const snap = await getDoc(doc(ratings(), levelFingerprint));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {
            tags:       Array.isArray(data.tags) ? data.tags : [],
            customTags: Array.isArray(data.customTags) ? data.customTags : [],
            difficulty: Number(data.difficulty) || 0,
            fun:        Number(data.fun) || 0,
        };
    }

    async function saveLevelRating(levelFingerprint: string, levelNumber: number | null, rating: any): Promise<void> {
        if (!client.db || !levelFingerprint) throw new Error('No Firebase connection');
        await setDoc(doc(ratings(), levelFingerprint), {
            tags:        rating.tags || [],
            customTags:  rating.customTags || [],
            difficulty:  rating.difficulty || 0,
            fun:         rating.fun || 0,
            levelNumber: levelNumber ?? null,
            updatedAt:   client.serverTimestamp(),
        });
    }

    return { loadLevelRating, saveLevelRating };
}
