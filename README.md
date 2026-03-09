# AR Sales Companion (PWA)

Leichtgewichtige Web-App für den Außendienst: 3D-Modelle aus Bynder per Augmented Reality in realen Räumen platzieren. PWA mit Offline-Favoriten und OAuth-Anmeldung an Bynder.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript
- **UI:** Material Design (MUI)
- **AR:** Google `<model-viewer>` (WebXR, Scene Viewer, AR Quick Look)
- **PWA:** Vite PWA Plugin (Workbox), Offline-Caching der App-Shell
- **Offline-Speicher:** IndexedDB (idb-keyval) für GLB/USDZ-Favoriten
- **Backend:** FastAPI (separates Repo/Service) – Bynder API, GLB→USDZ, Token-Exchange

## Voraussetzungen

- Node.js 20+
- Backend (FastAPI) läuft und stellt `/api/assets`, `/api/assets/:id` und `/auth/token` bereit

## Setup

1. Repository klonen und Abhängigkeiten installieren:

   ```bash
   npm ci
   ```

2. Umgebungsvariablen anlegen (siehe `.env.example`):

   ```bash
   cp .env.example .env
   ```

   In `.env` eintragen:

   - `VITE_API_BASE_URL` – Basis-URL des Asset-Broker-Backends (z. B. `http://localhost:8888`)
   - `VITE_BYNDER_BASE_URL` – Bynder-Instanz (z. B. `https://your-company.getbynder.com`)
   - `VITE_OAUTH_CALLBACK_URL` – Öffentliche Basis-URL dieser App (z. B. `http://localhost:5173` oder Produktion)
   - `VITE_OAUTH_CLIENT_ID` – Bynder OAuth Client ID

3. In Bynder eine OAuth-App anlegen und als Redirect URI genau  
   `{VITE_OAUTH_CALLBACK_URL}/auth/callback` eintragen.

4. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

   Die App ist unter `http://localhost:5173` erreichbar. API-Anfragen an `/api` und `/auth` werden per Vite-Proxy an `VITE_API_BASE_URL` weitergeleitet (siehe `vite.config.ts`).

## Build & PWA

- **Build:** `npm run build` → Ausgabe in `dist/`
- **Preview:** `npm run preview` → lokal den Produktionsbuild testen
- **PWA:** Beim Build werden Service Worker und Web-App-Manifest erzeugt. Für Icons `public/pwa-192x192.png` und `public/pwa-512x512.png` anlegen (oder in `vite.config.ts` anpassen).

## GitHub Actions

- **CI:** Bei Push/PR auf `main`/`develop`: Lint und Build (`.github/workflows/ci.yml`).
- Build nutzt Platzhalter-Env-Variablen; für Docker-/Deploy-Jobs können Repository-Secrets für die echten Werte genutzt werden.

## Projektstruktur (Auszug)

- `src/pages/` – Katalog, Asset-Detail, Favoriten, OAuth-Callback
- `src/components/` – Layout, AssetCard, ModelViewer (model-viewer-Wrapper)
- `src/context/` – Auth, Favorites, Snackbar
- `src/services/` – API, authService, favoritesStore (IndexedDB)
- `src/types/` – Asset-Typen

## Hinweise (scope.md)

- **iOS USDZ:** Backend liefert `usdzUrl`; die App setzt es als `ios-src` am `<model-viewer>`.
- **Offline:** Favoriten speichern GLB (und ggf. USDZ) in IndexedDB; in der Detail-Ansicht werden Offline-URLs priorisiert.
- **CORS:** Bynder und Backend müssen CORS so setzen, dass die PWA-Origin Binärdaten laden darf.
