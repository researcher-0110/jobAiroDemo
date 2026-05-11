from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_key: str
    database_url: str
    jwt_secret: str
    cors_origins: list[str] = ["http://localhost:3000"]
    proxy_url: Optional[str] = None
    proxy_user: Optional[str] = None
    proxy_pass: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    alert_email: Optional[str] = None
    environment: str = "development"

    @field_validator("supabase_url", "supabase_service_key", "database_url", "jwt_secret")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Required env var is empty")
        return v

settings = Settings()
