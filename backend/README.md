# AR Sales Companion Backend

FastAPI service: Bynder OAuth token exchange, asset list and detail with GLB download URLs.

## Config

Uses project root `.env` or `backend/.env`. Variables:

- `BYNDER_BASE_URL` or `VITE_BYNDER_BASE_URL` – Bynder base URL (no trailing slash)
- `BYNDER_CLIENT_ID` or `VITE_OAUTH_CLIENT_ID` – OAuth client ID
- `BYNDER_CLIENT_SECRET` or `VITE_BYNDER_SECRET` – OAuth client secret

## Run locally

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8888
```

Or from project root:

```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8888 --app-dir backend
```

- Health: http://localhost:8888/health
- API docs: http://localhost:8888/docs

Frontend (Vite) proxies `/api` and `/auth` to port 8888 when using `npm run dev`.

## Docker

Build (from repo root):

```bash
docker build -t arsalescompanion-backend -f backend/Dockerfile backend
docker run -p 8888:8888 --env-file .env arsalescompanion-backend
```

## Raspberry Pi (GHCR)

Images are built as multi-arch (`linux/amd64`, `linux/arm64`, `linux/arm/v7`) and pushed to GitHub Container Registry on push to `main`/`develop`.

1. **Login** (once; use a Personal Access Token with `read:packages` or use the same account that has access to the repo):

   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
   ```

2. **Pull and run** (replace `OWNER` with your GitHub org/user and `arsalescompanion` with your repo name if different):

   ```bash
   docker pull ghcr.io/OWNER/arsalescompanion-backend:latest
   docker run -d -p 8888:8888 --restart unless-stopped \
     -e BYNDER_BASE_URL="https://your.getbynder.com" \
     -e BYNDER_CLIENT_ID="..." \
     -e BYNDER_CLIENT_SECRET="..." \
     -e OAUTH_CALLBACK_URL="https://your-app-url/auth/callback" \
     --name arsalescompanion-backend \
     ghcr.io/OWNER/arsalescompanion-backend:latest
   ```

   Or use a `.env` file (do not commit it):

   ```bash
   docker run -d -p 8888:8888 --restart unless-stopped --env-file .env --name arsalescompanion-backend ghcr.io/OWNER/arsalescompanion-backend:latest
   ```

- On Raspberry Pi, Docker will pull the matching image (arm64 or arm/v7) automatically.
- Optional: use `docker compose` or a systemd unit for startup on boot.
