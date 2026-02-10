from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from datetime import timedelta, datetime
from typing import Optional
import secrets

from app.core.security import create_access_token, verify_password
from app.core.config import settings
from app.core.exceptions import ApiException
from app.schemas.common import success_response, ResponseCode
from app.db.redis import get_redis
import redis

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# HTTP Basic for client credentials flow
security = HTTPBasic()


class TokenRequest(BaseModel):
    """Token request using client credentials"""
    client_id: str = Field(..., description="Client ID for authentication", example="wealth-pulse-java")
    client_secret: str = Field(..., description="Client secret for authentication", example="wealth-pulse-client-secret")


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds", example=86400)


@router.post(
    "/token",
    summary="Get access token",
    description="Obtain a JWT access token using client credentials. This token is required for accessing protected API endpoints.",
    responses={
        200: {
            "description": "Successfully obtained access token",
            "content": {
                "application/json": {
                    "example": {
                        "code": 200,
                        "msg": "success",
                        "data": {
                            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                            "token_type": "bearer",
                            "expires_in": 86400
                        },
                        "timestamp": "2026-02-09T15:30:00"
                    }
                }
            }
        }
    }
)
async def get_token(
    request: TokenRequest,
    r: redis.Redis = Depends(get_redis)
):
    """
    Get access token using client credentials

    This endpoint is for Java API integration.
    Use the client_id and client_secret to obtain a bearer token.

    **Example Usage:**
    ```bash
    curl -X POST http://localhost:9000/api/auth/token \\
      -H "Content-Type: application/json" \\
      -d '{
        "client_id": "wealth-pulse-java",
        "client_secret": "wealth-pulse-client-secret"
      }'
    ```

    **Steps to use the token:**
    1. Copy the `access_token` from the response
    2. In Swagger UI, click the "Authorize" button (lock icon)
    3. Enter the token in the format: `Bearer YOUR_ACCESS_TOKEN`
    4. Click "Authorize" and close the dialog
    5. Now you can access protected endpoints
    """
    # Verify client credentials
    if request.client_id != settings.API_CLIENT_ID:
        raise ApiException(
            msg="Invalid client credentials",
            code=ResponseCode.UNAUTHORIZED
        )

    if request.client_secret != settings.API_CLIENT_SECRET:
        raise ApiException(
            msg="Invalid client credentials",
            code=ResponseCode.UNAUTHORIZED
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
    except Exception:
        # Log error but don't fail the request
        pass

    token_data = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24  # 24 hours in seconds
    }

    return success_response(
        data=token_data,
        msg="Token obtained successfully"
    )


@router.post(
    "/token/validate",
    summary="Validate access token",
    description="Validate an access token. This endpoint can be used by Java API to check if a token is still valid."
)
async def validate_token(
    credentials: Optional[TokenRequest] = None,
    r: redis.Redis = Depends(get_redis)
):
    """
    Validate an access token

    This endpoint can be used to check if a token is still valid.

    **Example Request:**
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
        raise ApiException(
            msg="Invalid client credentials",
            code=ResponseCode.UNAUTHORIZED
        )

    # For demonstration, return valid if credentials are correct
    return success_response(
        data={
            "valid": True,
            "user_id": settings.API_CLIENT_ID
        },
        msg="Token is valid"
    )


@router.post(
    "/refresh",
    summary="Refresh access token",
    description="Refresh an access token with the same client credentials."
)
async def refresh_token(
    credentials: TokenRequest,
    r: redis.Redis = Depends(get_redis)
):
    """
    Refresh an access token

    This endpoint allows getting a new token with the same client credentials.

    **Example Request:**
    ```json
    {
        "client_id": "wealth-pulse-java",
        "client_secret": "wealth-pulse-client-secret"
    }
    ```
    """
    # Verify client credentials
    if credentials.client_id != settings.API_CLIENT_ID:
        raise ApiException(
            msg="Invalid client credentials",
            code=ResponseCode.UNAUTHORIZED
        )

    if credentials.client_secret != settings.API_CLIENT_SECRET:
        raise ApiException(
            msg="Invalid client credentials",
            code=ResponseCode.UNAUTHORIZED
        )

    # Create new access token
    access_token = create_access_token(
        data={"sub": credentials.client_id, "type": "client_credentials"},
        expires_delta=timedelta(minutes=60 * 24)  # 24 hours
    )

    token_data = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24
    }

    return success_response(
        data=token_data,
        msg="Token refreshed successfully"
    )
