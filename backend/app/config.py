from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str

    # "development" | "production"
    ENV: str = "development"

    # Comma-separated allowed origins, e.g. https://app.example.com,capacitor://localhost
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,"
        "capacitor://localhost,https://localhost,http://localhost"
    )

    # JWT settings — MUST set SECRET_KEY in production
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    # Production toggles
    ENABLE_DOCS: bool = True
    ENABLE_SCHEDULER: bool = True
    AUTO_CREATE_TABLES: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
