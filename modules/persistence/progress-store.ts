// Level completion tracking: local localStorage + Firestore cloud sync.
// UI notification is decoupled: callers supply an onProgressChanged callback
// rather than this module reaching into APP.UI directly.
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';

export function createProgressStore(client: any, localSessionStore: any, { getState }: any, onProgressChanged: any) {
    const { appId } = client;
    let activeSyncUid: any    = null;
    let cloudSyncUnsubs: any[]  = [];
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
                getState().progressSet = new Set(parsed.filter((n: any) => Number.isInteger(n) && n >= 0));
                onProgressChanged();
            } catch (e) {
                console.warn('[Persistence] Could not parse local progress; starting fresh.', e);
                getState().progressSet = new Set();
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
        const userDataCollection = collection(client.db, 'artifacts', appId, 'users', user.uid, 'data');

        const progressUnsub = onSnapshot(doc(userDataCollection, 'levelProgress'), (snap: any) => {
            if (generation !== syncGeneration) return;
            if (!snap.exists()) return;
            const cloudSet = new Set(snap.data().completedLevels || []);
            getState().progressSet = new Set([...getState().progressSet, ...cloudSet]);
            onProgressChanged();
            localStorage.setItem(`pathfinder_progress_${appId}`, JSON.stringify(Array.from(getState().progressSet)));
        }, (err: any) => { console.warn('[Persistence] progress snapshot error', err); });

        const sessionUnsub = onSnapshot(doc(userDataCollection, 'sessionState'), (snap: any) => {
            if (generation !== syncGeneration || !snap.exists()) return;
            localSessionStore.handleCloudSessionSnapshot(snap.data() || {});
        }, (err: any) => { console.warn('[Persistence] session snapshot error', err); });

        cloudSyncUnsubs = [progressUnsub, sessionUnsub].filter((fn: any) => typeof fn === 'function');
        activeSyncUid = user.uid;
    }

    async function markLevelComplete(idx: any) {
        getState().progressSet.add(idx);
        onProgressChanged();
        localStorage.setItem(`pathfinder_progress_${appId}`, JSON.stringify(Array.from(getState().progressSet)));

        const user = client.auth?.currentUser;
        if (user && client.db) {
            const progressDoc = doc(client.db, 'artifacts', appId, 'users', user.uid, 'data', 'levelProgress');
            await setDoc(progressDoc, { completedLevels: Array.from(getState().progressSet) }, { merge: true });
        }
    }

    return { syncProgress, markLevelComplete };
}
