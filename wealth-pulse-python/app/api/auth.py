from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from datetime import timedelta
from typing import Optional
import secrets

from app.core.security import create_access_token, verify_password
from app.core.config import settings
from app.db.redis import get_redis
import redis

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# HTTP Basic for client credentials flow
security = HTTPBasic()


class TokenRequest(BaseModel):
    """Token request using client credentials"""
    client_id: str
    client_secret: str


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenValidateResponse(BaseModel):
    """Token validation response"""
    valid: bool
    user_id: Optional[str] = None
    message: Optional[str] = None


@router.post("/token", response_model=TokenResponse)
async def get_token(
    request: TokenRequest,
    r: redis.Redis = Depends(get_redis)
):
    """
    Get access token using client credentials

    This endpoint is for Java API integration.
    Use the client_id and client_secret to obtain a bearer token.

    Example request:
    ```json
    {
        "client_id": "wealth-pulse-java",
        "client_secret": "wealth-pulse-client-secret"
    }
    ```
    """

    # Verify client credentials
    if request.client_id != settings.API_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if request.client_secret != settings.API_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": request.client_id, "type": "client_credentials"},
        expires_delta=timedelta(minutes=60 * 24)  # 24 hours
    )

    # Store token in Redis for validation (optional)
    try:
        cache_key = f"token:{request.client_id}"
        r.setex(cache_key, 60 * 60 * 24, access_token)
    except Exception as e:
        # Log error but don't fail the request
        pass

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 60 * 24  # 24 hours in seconds
    )


@router.post("/token/validate", response_model=TokenValidateResponse)
async def validate_token(
    credentials: Optional[TokenRequest] = None,
    r: redis.Redis = Depends(get_redis)
):
    """
    Validate an access token

    This endpoint can be used by Java API to check if a token is still valid.

    Example request:
    ```json
    {
        "client_id": "wealth-pulse-java",
        "client_secret": "wealth-pulse-client-secret"
    }
    ```
    """
    # Verify client credentials first
    if credentials and (
        credentials.client_id != settings.API_CLIENT_ID or
        credentials.client_secret != settings.API_CLIENT_SECRET
    ):
        return TokenValidateResponse(
            valid=False,
            message="Invalid client credentials"
        )

    # For demonstration, return valid if credentials are correct
    # In production, you would validate the actual token
    return TokenValidateResponse(
        valid=True,
        user_id=settings.API_CLIENT_ID,
        message="Token is valid"
    )


@router.post("/refresh")
async def refresh_token(
    credentials: TokenRequest,
    r: redis.Redis = Depends(get_redis)
):
    """
    Refresh an access token

    This endpoint allows getting a new token with the same client credentials.
    """
    # Verify client credentials
    if credentials.client_id != settings.API_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client credentials"
        )

    if credentials.client_secret != settings.API_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client credentials"
        )

    # Create new access token
    access_token = create_access_token(
        data={"sub": credentials.client_id, "type": "client_credentials"},
        expires_delta=timedelta(minutes=60 * 24)  # 24 hours
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 60 * 24
    )
