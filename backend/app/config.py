from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str

    # JWT settings
    # Generate a strong secret with: openssl rand -hex 32
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    # Token expiry in minutes — 43200 = 30 days (personal app convenience)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
