from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.redis import get_redis
import redis

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
def health_check(db: Session = Depends(get_db), r: redis.Redis = Depends(get_redis)):
    """
    Health check endpoint

    Returns:
        Status of database and redis connections
    """
    # Check database
    db_status = "healthy"
    try:
        db.execute("SELECT 1")
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check redis
    redis_status = "healthy"
    try:
        r.ping()
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    overall_status = "healthy" if db_status == "healthy" and redis_status == "healthy" else "unhealthy"

    return {
        "status": overall_status,
        "database": db_status,
        "redis": redis_status
    }
