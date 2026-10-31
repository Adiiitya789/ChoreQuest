import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

function init(): FirebaseServices | null {
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) return null;
  const app = initializeApp(config);
  // App Check proves requests come from this app, which stops scripted abuse of
  // Firestore and the Gemini quota. Enforce it in the console once the key is set.
  if (recaptchaSiteKey) {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
  }
  return {
    app,
    auth: getAuth(app),
    // Optional GameState fields may be undefined; Firestore rejects those by default.
    db: initializeFirestore(app, { ignoreUndefinedProperties: true }),
  };
}

/** Null when the VITE_FIREBASE_* env vars are missing; the app then runs guest-only with a local save. */
export const firebase = init();
