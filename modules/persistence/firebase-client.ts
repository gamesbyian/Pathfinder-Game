// Firebase initialization and low-level connectivity (modular SDK — firebase/app,
// firebase/auth, firebase/firestore; bundled by Vite, no CDN compat globals).
// All other persistence modules receive this client instance plus the modular Firestore
// free functions (collection/doc/getDocs/…) imported directly where they operate.
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithCustomToken,
    signInAnonymously,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
} from 'firebase/auth';
import { initializeFirestore, serverTimestamp } from 'firebase/firestore';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// The slice of the modular SDK the client uses, bundled together so tests can inject a fake
// (this is the seam that `declare const firebase: any` used to be — now typed by the SDK).
export interface FirebaseApi {
    initializeApp: typeof initializeApp;
    getAuth: typeof getAuth;
    signInWithCustomToken: typeof signInWithCustomToken;
    signInAnonymously: typeof signInAnonymously;
    signInWithPopup: typeof signInWithPopup;
    signOut: typeof signOut;
    onAuthStateChanged: typeof onAuthStateChanged;
    GoogleAuthProvider: typeof GoogleAuthProvider;
    initializeFirestore: typeof initializeFirestore;
    serverTimestamp: typeof serverTimestamp;
}

const DEFAULT_API: FirebaseApi = {
    initializeApp,
    getAuth,
    signInWithCustomToken,
    signInAnonymously,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    initializeFirestore,
    serverTimestamp,
};

export function createFirebaseClient(firebaseConfigRaw: string | null, appId: string, {
    firebaseApi = DEFAULT_API,
    initialAuthToken = null,
}: { firebaseApi?: FirebaseApi; initialAuthToken?: string | null } = {}) {
    const api = firebaseApi;
    let auth: Auth | null = null;
    let db: Firestore | null   = null;

    if (firebaseConfigRaw && api) {
        try {
            const config = JSON.parse(firebaseConfigRaw);
            const app = api.initializeApp(config);
            auth = api.getAuth(app);
            // Long-polling auto-detect replaces the compat `db.settings(...)` call; passing it to
            // initializeFirestore is the modular equivalent (must run before any Firestore use).
            db   = api.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
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
                await api.signInWithCustomToken(auth, initialAuthToken);
            } else {
                await api.signInAnonymously(auth);
            }
        } catch (e) {
            console.warn('[Persistence] Auth sign-in failed; cloud sync disabled.', e);
        }
    }

    function waitForUser(timeoutMs: number = 8000): Promise<User | null> {
        if (!auth) return Promise.resolve(null);
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        const activeAuth = auth;
        return new Promise((resolve) => {
            const timer = setTimeout(() => { unsub(); resolve(null); }, timeoutMs);
            const unsub = api.onAuthStateChanged(activeAuth, (user) => {
                if (!user) return;
                clearTimeout(timer);
                unsub();
                resolve(user);
            });
        });
    }

    function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
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
        createGoogleAuthProvider: () => new api.GoogleAuthProvider(),
        serverTimestamp: () => api.serverTimestamp(),
        // Auth operations are wrapped here (the security-sensitive seam) so the review
        // repository stays free of direct firebase/auth imports.
        signInWithPopup: (provider: GoogleAuthProvider) => {
            if (!auth) throw new Error('No Firebase connection');
            return api.signInWithPopup(auth, provider);
        },
        signOut: () => {
            if (!auth) throw new Error('No Firebase connection');
            return api.signOut(auth);
        },
    };
}
