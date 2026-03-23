"""Authorization requirements for protected routes."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_api_assets_requires_bearer():
    response = client.get("/api/assets")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_api_asset_requires_bearer():
    response = client.get("/api/assets/some-id")
    assert response.status_code == 401


def test_api_asset_model_requires_auth():
    response = client.get("/api/assets/some-id/model")
    assert response.status_code == 401
