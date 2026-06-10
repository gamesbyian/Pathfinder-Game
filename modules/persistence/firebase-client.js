// Firebase initialization and low-level connectivity.
// All other persistence modules receive a client instance rather than
// importing firebase globals directly.

export function createFirebaseClient(firebaseConfigRaw, appId) {
    let auth = null;
    let db   = null;

    if (firebaseConfigRaw) {
        try {
            const config = JSON.parse(firebaseConfigRaw);
            firebase.initializeApp(config);
            auth = firebase.auth();
            db   = firebase.firestore();
            db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
        } catch (e) {
            console.warn('[Persistence] Firebase init failed; running in local-only mode.', e);
            auth = null;
            db   = null;
        }
    }

    async function initAuth() {
        if (!auth) return;
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await auth.signInWithCustomToken(__initial_auth_token);
            } else {
                await auth.signInAnonymously();
            }
        } catch (e) {
            console.warn('[Persistence] Auth sign-in failed; cloud sync disabled.', e);
        }
    }

    function waitForUser(timeoutMs = 8000) {
        if (!auth) return Promise.resolve(null);
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return new Promise((resolve) => {
            const timer = setTimeout(() => { unsub(); resolve(null); }, timeoutMs);
            const unsub = auth.onAuthStateChanged((user) => {
                if (!user) return;
                clearTimeout(timer);
                unsub();
                resolve(user);
            });
        });
    }

    function withTimeout(promise, timeoutMs, message) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
        ]);
    }

    return {
        get auth()      { return auth; },
        get db()        { return db; },
        get hasConfig() { return !!firebaseConfigRaw; },
        appId,
        initAuth,
        waitForUser,
        withTimeout,
    };
}
