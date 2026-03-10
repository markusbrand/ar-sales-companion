# AR Sales Companion auf dem Raspberry Pi installieren

Backend und **Frontend** laufen auf dem Pi in Docker. Eine gemeinsame `docker-compose`-Datei startet beide Dienste; das Frontend wird beim ersten Start aus dem Quellcode gebaut und liefert die PWA aus, das Backend kommt als vorgefertigtes Image von GHCR.

---

## Voraussetzungen

- **Raspberry Pi** (Modell 3/4/5 empfohlen) mit Raspberry Pi OS (64-bit für arm64 empfohlen)
- **Docker** (inkl. Docker Compose v2):

  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  ```
  Danach ab- und wieder anmelden.

---

## 1. Repository und Konfiguration auf dem Pi

```bash
cd ~
git clone https://github.com/markusbrand/ar-sales-companion.git
cd ar-sales-companion
```

Kopie der Compose-Datei und `.env` anlegen:

```bash
cp docker-compose.example.yml docker-compose.yml
nano .env
```

Inhalt von `.env` (Werte anpassen):

```env
# Bynder (für Backend und Frontend-Build)
BYNDER_BASE_URL=https://redbullsb.getbynder.com
BYNDER_CLIENT_ID=deine-client-id
BYNDER_CLIENT_SECRET=dein-client-secret

# Basis-URL, unter der die App im Browser erreichbar ist (ohne /auth/callback)
# z. B. http://192.168.1.10 oder https://pi.local
VITE_OAUTH_CALLBACK_URL=http://DEINE-PI-IP

# Backend braucht die volle Callback-URL (wird aus VITE_OAUTH_CALLBACK_URL abgeleitet)
OAUTH_CALLBACK_URL=http://DEINE-PI-IP/auth/callback

# Optional: nur Assets mit Tag „AR“ anzeigen (für GLB/AR-Katalog)
# BYNDER_FILTER_TAG=AR
```

In Bynder muss unter der OAuth-App als Redirect URI genau `OAUTH_CALLBACK_URL` eingetragen sein (z. B. `http://192.168.1.10/auth/callback`).

---

## 2. GHCR-Login (einmalig)

Für das Backend-Image aus der GitHub Container Registry (bei privatem Repo: Personal Access Token mit `read:packages`):

```bash
echo DEIN_GITHUB_TOKEN | docker login ghcr.io -u markusbrand --password-stdin
```

---

## 3. Backend und Frontend starten

**Option A – Deploy-Skript (empfohlen):**

```bash
chmod +x scripts/deploy-pi.sh
./scripts/deploy-pi.sh
```

**Option B – Manuell:**

```bash
docker compose up -d
```

Beim ersten Lauf wird das **Frontend-Image** aus dem Projekt gebaut (einige Minuten). Das **Backend** wird von GHCR gezogen.

- **App im Browser:** `http://DEINE-PI-IP` (Port 80)
- Das Frontend-Container-Nginx leitet `/api` und `/auth` an das Backend weiter.

Logs ansehen:

```bash
docker compose logs -f
```

---

## 4. Kurz-Checkliste

| Schritt | Befehl / Aktion |
|--------|----------------------------------|
| Docker installieren | `curl -fsSL https://get.docker.com \| sh` |
| Repo klonen | `git clone https://github.com/markusbrand/ar-sales-companion.git && cd ar-sales-companion` |
| Compose + .env | `cp docker-compose.example.yml docker-compose.yml` und `.env` anlegen |
| GHCR-Login | `echo TOKEN \| docker login ghcr.io -u markusbrand --password-stdin` |
| Start | `./scripts/deploy-pi.sh` oder `docker compose up -d` |
| App aufrufen | `http://DEINE-PI-IP` (Pi-IP mit `hostname -I`) |

---

## 5. Nützliche Befehle

- **Logs:** `docker compose logs -f` (beide Dienste) oder `docker compose logs -f frontend` / `docker compose logs -f backend`
- **Stoppen:** `docker compose down`
- **Neu starten:** `docker compose restart`
- **Backend-Image aktualisieren, Rest neu starten:**
  ```bash
  docker compose pull backend
  docker compose up -d
  ```
- **Frontend neu bauen** (z. B. nach Änderung an .env):
  ```bash
  docker compose build frontend --no-cache
  docker compose up -d
  ```

---

## Alternative: Nur Backend als Container, Frontend manuell

Wenn du das Frontend nicht im Container laufen lassen willst:

1. **Nur Backend starten:**
   ```bash
   docker pull ghcr.io/markusbrand/ar-sales-companion-backend:latest
   docker run -d -p 8888:8888 --restart unless-stopped --env-file .env --name arsalescompanion-backend ghcr.io/markusbrand/ar-sales-companion-backend:latest
   ```
2. **Frontend** auf dem PC bauen (`npm run build`), `dist/` auf den Pi kopieren und mit nginx (oder einem anderen Webserver) unter derselben URL ausliefern, die du für `OAUTH_CALLBACK_URL` nutzt. Nginx muss `/api` und `/auth` an `http://127.0.0.1:8888` proxien.

Details für eine manuelle nginx-Konfiguration findest du in der Git-Historie dieser Datei oder in der Backend-README.
