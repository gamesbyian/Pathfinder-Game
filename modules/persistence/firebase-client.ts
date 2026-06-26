// Firebase initialization and low-level connectivity.
// All other persistence modules receive a client instance rather than
// importing firebase globals directly.

declare const firebase: any;
declare const __initial_auth_token: any;

export function createFirebaseClient(firebaseConfigRaw: any, appId: any, {
    firebaseApi = (typeof firebase !== 'undefined' ? firebase : null),
    initialAuthToken = (typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null),
}: any = {}) {
    let auth: any = null;
    let db: any   = null;

    if (firebaseConfigRaw && firebaseApi) {
        try {
            const config = JSON.parse(firebaseConfigRaw);
            firebaseApi.initializeApp(config);
            auth = firebaseApi.auth();
            db   = firebaseApi.firestore();
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
            if (initialAuthToken) {
                await auth.signInWithCustomToken(initialAuthToken);
            } else {
                await auth.signInAnonymously();
            }
        } catch (e) {
            console.warn('[Persistence] Auth sign-in failed; cloud sync disabled.', e);
        }
    }

    function waitForUser(timeoutMs: any = 8000) {
        if (!auth) return Promise.resolve(null);
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return new Promise((resolve: any) => {
            const timer = setTimeout(() => { unsub(); resolve(null); }, timeoutMs);
            const unsub = auth.onAuthStateChanged((user: any) => {
                if (!user) return;
                clearTimeout(timer);
                unsub();
                resolve(user);
            });
        });
    }

    function withTimeout(promise: any, timeoutMs: any, message: any) {
        return Promise.race([
            promise,
            new Promise((_: any, reject: any) => setTimeout(() => reject(new Error(message)), timeoutMs)),
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
        createGoogleAuthProvider: () => new firebaseApi.auth.GoogleAuthProvider(),
        serverTimestamp: () => firebaseApi.firestore.FieldValue.serverTimestamp(),
    };
}
