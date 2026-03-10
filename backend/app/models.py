from pydantic import BaseModel


class TokenRequest(BaseModel):
    code: str
    redirect_uri: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "Bearer"


class AssetResponse(BaseModel):
    id: str
    name: str
    thumbnailUrl: str
    glbUrl: str
    usdzUrl: str | None = None
    posterUrl: str | None = None
    fileSizeBytes: int | None = None
    metadata: dict[str, str] | None = None
