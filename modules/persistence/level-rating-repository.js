// Dev-mode level rating/tagging storage.

export function createLevelRatingRepository(client) {
    const { appId } = client;
    const root = () => client.db.collection('artifacts').doc(appId);

    async function loadLevelRating(fingerprint) {
        if (!client.db || !fingerprint) return null;
        const snap = await root().collection('level_ratings').doc(fingerprint).get();
        if (!snap.exists) return null;
        const data = snap.data();
        return {
            tags:       Array.isArray(data.tags) ? data.tags : [],
            customTags: Array.isArray(data.customTags) ? data.customTags : [],
            difficulty: Number(data.difficulty) || 0,
            fun:        Number(data.fun) || 0,
        };
    }

    async function saveLevelRating(fingerprint, levelNumber, rating) {
        if (!client.db || !fingerprint) throw new Error('No Firebase connection');
        await root().collection('level_ratings').doc(fingerprint).set({
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
