from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Redline API"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/redline"

    model_config = SettingsConfigDict(env_prefix="REDLINE_", env_file=".env", extra="ignore")


settings = Settings()
