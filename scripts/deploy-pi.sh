#!/usr/bin/env bash
# Deploy AR Sales Companion on Raspberry Pi (or any host with Docker).
# Run from repository root: ./scripts/deploy-pi.sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker &>/dev/null; then
  echo "Docker is not installed. Install with: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if [ ! -f docker-compose.yml ]; then
  echo "Creating docker-compose.yml from docker-compose.example.yml"
  cp docker-compose.example.yml docker-compose.yml
fi

if [ ! -f .env ]; then
  echo "Missing .env file. Create it from the example in docs/DEPLOY-RASPBERRY-PI.md"
  echo "Required: BYNDER_BASE_URL, BYNDER_CLIENT_ID, BYNDER_CLIENT_SECRET, VITE_OAUTH_CALLBACK_URL, OAUTH_CALLBACK_URL"
  exit 1
fi

echo "Pulling backend image and starting services..."
docker compose pull backend
docker compose up -d --build

echo "Done. App should be available at http://$(hostname -I | awk '{print $1}') (port 80)"
echo "Logs: docker compose logs -f"
