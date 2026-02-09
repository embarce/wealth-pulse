import redis
from typing import Optional
from app.core.config import settings


class RedisClient:
    _instance: Optional[redis.Redis] = None

    @classmethod
    def get_client(cls) -> redis.Redis:
        if cls._instance is None:
            cls._instance = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                health_check_interval=30
            )
        return cls._instance

    @classmethod
    def close(cls):
        if cls._instance:
            cls._instance.close()
            cls._instance = None


# Dependency to get Redis client
def get_redis() -> redis.Redis:
    return RedisClient.get_client()
