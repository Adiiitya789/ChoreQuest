# Firebase setup

ChoreQuest runs without Firebase (guest mode, saved in the browser). These steps turn on
Google sign-in and per-user cloud saves. Everything here fits in Firebase's free Spark plan.

## 1. Create the project

1. Go to https://console.firebase.google.com and click **Create a project**. Google Analytics is optional.
2. In the project, click the **Web** icon (`</>`) to register a web app. Any nickname works; skip Hosting for now.
3. Firebase shows a `firebaseConfig` object. Copy `.env.example` to `.env` and paste each value into the
   matching `VITE_FIREBASE_*` line.

## 2. Turn on Google sign-in

1. **Build > Authentication > Get started**.
2. **Sign-in method** tab > **Google** > Enable, choose a support email, Save.
3. **Settings > Authorized domains**: `localhost` is listed by default. Add your real domain later when you deploy.

## 3. Create the database

1. **Build > Firestore Database > Create database**. Pick a location near your users and start in
   **production mode**.
2. Open the **Rules** tab, replace the contents with [`firestore.rules`](firestore.rules), and **Publish**.
   These rules let each signed-in user read and write only `users/{their uid}`.

## 4. Run it

Restart the dev server so Vite picks up `.env` (`npm run dev`). A **Sign in with Google** button
appears in the header.

## How the data is stored

- One document per player: `users/{uid}` with `{ state, updatedAt }`, where `state` is the full game
  state including the per-day `history` the dashboard reads.
- Guests keep using `localStorage`. On a player's **first** sign-in, if their cloud document doesn't
  exist yet, the guest progress from that browser is uploaded so nothing is lost. After that the cloud
  copy is the source of truth on every device.
- Signing out returns to the guest save on that browser.

The Firebase web config values are not secrets: they identify the project, and the security rules
are what protect the data. Do not commit `.env` anyway (it is git-ignored) so you can swap projects freely.

## Gemini coach (Firebase AI Logic)

1. Console -> Build -> AI Logic -> Get started -> choose **Gemini Developer API**.
2. Keep `VITE_COACH_BACKEND=gemini` in `.env`. Until AI Logic is enabled, the coach falls back to the on-device engine automatically.
3. Optional: Console -> App Check -> register the web app with reCAPTCHA v3 and put the site key in `VITE_RECAPTCHA_SITE_KEY`, then enforce App Check for Firestore and AI Logic.

## Updating security rules

After changing `firestore.rules`, paste it into Console -> Firestore -> Rules and click **Publish** (or run `firebase deploy --only firestore:rules`).
