// Level completion tracking: local localStorage + Firestore cloud sync.
// UI notification is decoupled: callers supply an onProgressChanged callback
// rather than this module reaching into APP.UI directly.

export function createProgressStore(client, localSessionStore, APP, onProgressChanged) {
    const { appId } = client;
    let activeSyncUid    = null;
    let cloudSyncUnsubs  = [];
    let syncGeneration   = 0;

    function clearCloudSyncListeners() {
        syncGeneration++;
        if (!cloudSyncUnsubs.length) return;
        for (const unsub of cloudSyncUnsubs) {
            try { if (typeof unsub === 'function') unsub(); } catch (e) {
                console.warn('[Persistence] error tearing down cloud sync listener', e);
            }
        }
        cloudSyncUnsubs = [];
        activeSyncUid = null;
    }

    function syncProgress() {
        const localData = localStorage.getItem(`pathfinder_progress_${appId}`);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                if (!Array.isArray(parsed)) throw new Error('progress payload is not an array');
                APP.State.ENGINE.progressSet = new Set(parsed.filter(n => Number.isInteger(n) && n >= 0));
                onProgressChanged();
            } catch (e) {
                console.warn('[Persistence] Could not parse local progress; starting fresh.', e);
                APP.State.ENGINE.progressSet = new Set();
                onProgressChanged();
            }
        }

        const user = client.auth?.currentUser;
        if (!user || !client.db) {
            clearCloudSyncListeners();
            return;
        }

        if (activeSyncUid === user.uid && cloudSyncUnsubs.length > 0) return;
        clearCloudSyncListeners();

        const generation = ++syncGeneration;
        const userDataCollection = client.db
            .collection('artifacts').doc(appId)
            .collection('users').doc(user.uid)
            .collection('data');

        const progressUnsub = userDataCollection.doc('levelProgress').onSnapshot((doc) => {
            if (generation !== syncGeneration) return;
            if (!doc.exists) return;
            const cloudSet = new Set(doc.data().completedLevels || []);
            APP.State.ENGINE.progressSet = new Set([...APP.State.ENGINE.progressSet, ...cloudSet]);
            onProgressChanged();
            localStorage.setItem(`pathfinder_progress_${appId}`, JSON.stringify(Array.from(APP.State.ENGINE.progressSet)));
        }, (err) => { console.warn('[Persistence] progress snapshot error', err); });

        const sessionUnsub = userDataCollection.doc('sessionState').onSnapshot((doc) => {
            if (generation !== syncGeneration || !doc.exists) return;
            localSessionStore.handleCloudSessionSnapshot(doc.data() || {});
        }, (err) => { console.warn('[Persistence] session snapshot error', err); });

        cloudSyncUnsubs = [progressUnsub, sessionUnsub].filter(fn => typeof fn === 'function');
        activeSyncUid = user.uid;
    }

    async function markLevelComplete(idx) {
        APP.State.ENGINE.progressSet.add(idx);
        onProgressChanged();
        localStorage.setItem(`pathfinder_progress_${appId}`, JSON.stringify(Array.from(APP.State.ENGINE.progressSet)));

        const user = client.auth?.currentUser;
        if (user && client.db) {
            const progressDoc = client.db
                .collection('artifacts').doc(appId)
                .collection('users').doc(user.uid)
                .collection('data').doc('levelProgress');
            await progressDoc.set({ completedLevels: Array.from(APP.State.ENGINE.progressSet) }, { merge: true });
        }
    }

    return { syncProgress, markLevelComplete };
}
