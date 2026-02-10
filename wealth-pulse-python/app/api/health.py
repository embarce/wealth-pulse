from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.redis import get_redis
from app.schemas.common import success_response, ResponseCode
from app.core.exceptions import ApiException
import redis

router = APIRouter(prefix="/health", tags=["health"])


@router.get(
    "/",
    summary="Health check",
    description="Check the health status of API, database, and Redis connections"
)
def health_check(
    db: Session = Depends(get_db),
    r: redis.Redis = Depends(get_redis)
):
    """
    Health check endpoint

    Returns the health status of:
    - API service
    - Database connection
    - Redis connection
    """
    # Check database
    db_status = "healthy"
    db_message = "Database connection successful"
    try:
        db.execute("SELECT 1")
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        db_message = f"Database connection failed: {str(e)}"

    # Check redis
    redis_status = "healthy"
    redis_message = "Redis connection successful"
    try:
        r.ping()
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
        redis_message = f"Redis connection failed: {str(e)}"

    # Determine overall status
    overall_status = "healthy"
    if "unhealthy" in db_status or "unhealthy" in redis_status:
        overall_status = "unhealthy"

    health_data = {
        "status": overall_status,
        "database": {
            "status": db_status,
            "message": db_message
        },
        "redis": {
            "status": redis_status,
            "message": redis_message
        }
    }

    return success_response(
        data=health_data,
        msg=f"Service is {overall_status}"
    )
