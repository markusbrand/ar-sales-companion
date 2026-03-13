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

# AR auf dem iPhone / hinter Reverse-Proxy (z. B. Cloudflare):
# Öffentliche HTTPS-URL, unter der Nutzer die App aufrufen (ohne trailing slash).
# Wenn die App z. B. über https://arcompanion.example.com erreichbar ist, hier eintragen.
# Das Backend nutzt diese URL für Modell-URLs, damit sie same-origin und auf dem iPhone ladbar sind.
# PUBLIC_BASE_URL=https://arcompanion.example.com

# Geheimnis für kurzfristige Modell-URLs (erforderlich, damit die App Proxy-Modell-URLs erhält).
# MODEL_URL_SECRET=ein-geheimes-zufalls-string
```

In Bynder muss unter der OAuth-App als Redirect URI genau `OAUTH_CALLBACK_URL` eingetragen sein (z. B. `http://192.168.1.10/auth/callback` oder `https://arcompanion.example.com/auth/callback` bei HTTPS).

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

- **App im Browser:** `http://DEINE-PI-IP:8888` (Standard-Port 8888; in `docker-compose.yml` auf `80:80` ändern für Port 80)
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
| App aufrufen | `http://DEINE-PI-IP:8888` (Pi-IP mit `hostname -I`) |

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

---

## AR auf dem iPhone / hinter Cloudflare (HTTPS)

Damit „In AR anzeigen“ auf dem iPhone funktioniert:

1. **HTTPS (sichere Verbindung):** Die App muss über HTTPS erreichbar sein. Bei Zugriff nur über `http://DEINE-PI-IP` ist AR in der Regel blockiert. Mit einem Reverse-Proxy wie **Cloudflare** (z. B. `https://arcompanion.brandstaetter.rocks` → `http://192.168.0.150:8888`) ist die sichere Verbindung gegeben.

2. **PUBLIC_BASE_URL:** Setze im Backend die **öffentliche** URL, unter der Nutzer die App im Browser öffnen – also die HTTPS-URL, nicht die interne Pi-Adresse. Beispiel:
   ```env
   PUBLIC_BASE_URL=https://arcompanion.brandstaetter.rocks
   ```
   Ohne diese Variable nutzt das Backend die interne Basis-URL; die ausgelieferten Modell-URLs wären dann z. B. `http://192.168.0.150:8888/...` und auf dem iPhone oft nicht ladbar (cross-origin).

3. **MODEL_URL_SECRET:** Muss gesetzt sein, damit die App Proxy-Modell-URLs vom Backend erhält (zufälliger geheimer String).

4. **OAuth / Callback:** `VITE_OAUTH_CALLBACK_URL` und die Bynder Redirect URI müssen die gleiche öffentliche HTTPS-URL verwenden (z. B. `https://arcompanion.brandstaetter.rocks` und `https://arcompanion.brandstaetter.rocks/auth/callback`).

**AR testen ohne Bynder:** In der App unter „AR testen“ (Navigation) kannst du eine eigene .glb-Datei hochladen und AR unabhängig von Bynder prüfen.
