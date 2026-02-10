from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "embrace_data_center"
    DB_NAME: str = "wealth_pulse"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = "redis_data_center"
    REDIS_DB: int = 0

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 9000
    API_RELOAD: bool = False
    API_SECRET_KEY: str = "your-secret-key-change-this-in-production"
    API_CLIENT_ID: str = "wealth-pulse-java"
    API_CLIENT_SECRET: str = "wealth-pulse-client-secret"

    # Task Scheduling
    SCHEDULER_ENABLED: bool = True
    MARKET_DATA_UPDATE_INTERVAL: int = 300  # seconds

    # API Rate Limiting
    YFINANCE_REQUEST_DELAY: float = 0.5  # seconds between requests (default: 0.5s)
    YFINANCE_USE_BATCH: bool = True  # Use batch requests for better efficiency
    YFINANCE_MAX_RETRIES: int = 3  # Maximum retry attempts for failed requests
    YFINANCE_BATCH_SIZE: int = 50  # Maximum symbols per batch request

    # Logging
    LOG_LEVEL: str = "INFO"

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
