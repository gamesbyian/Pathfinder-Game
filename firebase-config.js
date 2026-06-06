// Firebase project configuration for GitHub Pages hosting.
// Get these values from: Firebase console → Project Settings → General → Your apps → Web app.
// This file is safe to commit to a public repo — Firebase security is enforced by firestore.rules.

window.__firebase_config = JSON.stringify({
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID"
});

// A stable identifier for this app's Firestore namespace.
window.__app_id = "pathfinder-standalone";
