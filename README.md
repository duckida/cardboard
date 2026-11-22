# Cardboard

Cardboard is a realtime dashboard for public TV screens. The `/control` panel manages pages, cards, themes, announcements, screens, and the SOCS calendar; `/screen/:screenId` is the public kiosk view.

## Quick start

```sh
npm install
cp .env.example .env.local
npm run dev
```

With `VITE_DEMO=1`, open [http://localhost:5173/control](http://localhost:5173/control) and use the demo password from `VITE_DEMO_PASSWORD` (default: `cardboard`). Demo data is stored in this browser only.

For a repeatable local test run:

```sh
VITE_DEMO=1 npm run dev -- --host 127.0.0.1 --port 5173
# Open http://localhost:5173/control
npm run typecheck
npm run build
npm test
```

The demo has sample weather, calendar events, screens, announcements, JSON export/import, and the full editor without needing Firebase credentials. `npm test` currently passes with no test files; it is ready for unit tests to be added.

## Firebase and Firestore

For a real deployment:

1. Create a Firebase project and enable **Email/Password** and **Anonymous** sign-in.
2. Create a Firestore database and put the web app identifiers in `.env.local`.
3. Set `VITE_DEMO=0`, `VITE_BOARD_ID=main`, and deploy the rules:

   ```sh
   npx firebase login
   npx firebase use YOUR_PROJECT_ID
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```

4. Create an admin user and give it the custom claim required by the rules:

   ```sh
   FIREBASE_SERVICE_ACCOUNT='{"project_id":"…","client_email":"…","private_key":"…"}' \
     npm run set-admin -- admin@example.com
   ```

   Add `--create` with `ADMIN_PASSWORD` set if the user does not exist yet. The script never prints the password.

The public board document is intentionally readable by unauthenticated screens. Only users with the `role: "admin"` claim can write. The calendar URL lives in the public board config so screens can pass it to `/api/schedule`, which fetches and normalizes the feed for them.

## Vercel deployment

Import the project into Vercel with the default build settings (`npm run build`, output `dist`). Configure the `VITE_FIREBASE_*` variables, `VITE_BOARD_ID`, and these server-only variables in the Vercel project settings:

- `FIREBASE_SERVICE_ACCOUNT` — the service account JSON, preferably stored as one line.
- `ADMIN_EMAIL` — optional emergency/UI fallback; the custom claim is still recommended.
- `HACKCLUB_CDN_KEY` — Hack Club CDN v4 bearer key for image uploads.

Do not prefix server secrets with `VITE_`; Vite embeds those variables in the browser bundle.

You can deploy from the Vercel dashboard or CLI:

```sh
npx vercel login
npx vercel              # preview deployment
npx vercel --prod       # production deployment
```

Set the same variables in Vercel for **Preview** and **Production** as appropriate. Add the deployed domain to Firebase Authentication → Settings → Authorized domains. After the first deployment, open `/control`, sign in with the Firebase admin user, and create the screen URLs under **Screens**.

## Calendar and media

In **Control → Settings → Calendar**, paste the SOCS iCalendar URL (a `webcal://` URL is accepted and normalized to HTTPS). Choose whether approved/internal events should be included, then test the feed. Screens receive normalized events through `/api/schedule`.

Photos are resized to WebP in the browser and uploaded through `/api/upload` to Hack Club CDN. Image and photo cards support individual captions.

## JSON backup

**Settings → Export JSON** downloads the complete board configuration, including the calendar URL. Importing replaces the board after schema validation and layout normalization.

## Raspberry Pi

See [docs/kiosk.md](docs/kiosk.md) for Chromium flags and an autostart example tuned for Raspberry Pi 2 hardware.

## Useful commands

```sh
npm run typecheck
npm run build
npm run test
npm run emulators
```
