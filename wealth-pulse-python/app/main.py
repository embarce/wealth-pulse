import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import nest_asyncio
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Apply nest_asyncio to allow nested event loops (for asyncio.run() in sync wrappers)
nest_asyncio.apply()

from app.api import stocks, health, auth, ai, hkstock
from app.core.config import settings
from app.core.exceptions import (
    ApiException,
    api_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from app.db.session import engine, Base
from app.schemas.common import success_response
from app.tasks.scheduler import scheduler

# Ensure logs directory exists
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/app.log', encoding='utf-8')
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("Starting up application...")

    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

    # Start scheduler
    try:
        scheduler.start()
        logger.info("Scheduler started")
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")

    logger.info("=" * 60)
    logger.info("Application started successfully!")
    logger.info("=" * 60)

    yield

    # Shutdown
    logger.info("Shutting down application...")
    scheduler.shutdown()
    logger.info("[OK] Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Wealth Pulse API",
    description="""
    Hong Kong and US Stock Market Data API

    ## Features
    * Real-time stock market data
    * Historical price data
    * JWT-based authentication
    * Automatic data refresh (every 5 minutes)
    * Redis caching for performance

    ## Authentication
    Most endpoints require a JWT bearer token. To get a token:
    1. Use POST /api/auth/token with your client credentials
    2. Copy the access_token
    3. Click "Authorize" button and enter: Bearer YOUR_TOKEN

    ## Stock Codes
    * HK stocks: 0700.HK (Tencent), 9988.HK (Alibaba), etc.
    * US stocks: NVDA.US (NVIDIA), AAPL.US (Apple), etc.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Wealth Pulse",
        "email": "support@wealthpulse.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(ApiException, api_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(ai.router)
app.include_router(hkstock.router)
app.include_router(health.router)


@app.get("/", summary="Root endpoint")
def root():
    """Root endpoint - API information"""
    return success_response(
        data={
            "name": "Wealth Pulse API",
            "version": "1.0.0",
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health/"
        },
        msg="Welcome to Wealth Pulse API"
    )


@app.get("/ping", summary="Ping endpoint")
def ping():
    """Ping endpoint for health check"""
    return success_response(
        data={"status": "pong"},
        msg="Service is running"
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
        reload_dirs=["app"] if settings.API_RELOAD else None,  # Only watch app directory
        log_level="info"
    )
