/// <reference types="vite/client" />

/** Build-time configuration. All values are optional so the app can run guest-only without Firebase. */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  readonly VITE_COACH_BACKEND?: 'gemini' | 'local';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
