from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from app.db.session import get_db
from app.services.stock_service import StockService
from app.services.yfinance_service import yfinance_service
from app.schemas.stock import (
    StockInfoResponse,
    StockMarketDataResponse,
    StockMarketHistoryResponse
)
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/", response_model=List[StockInfoResponse])
def get_stocks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all stocks (requires authentication)

    - **skip**: Number of records to skip
    - **limit**: Maximum number of records to return

    Authentication: Bearer token required
    """
    try:
        stock_service = StockService(db)
        stocks = stock_service.get_all_stocks(skip=skip, limit=limit)
        return stocks
    except Exception as e:
        logger.error(f"Error getting stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{stock_code}", response_model=StockInfoResponse)
def get_stock(
    stock_code: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get stock by stock_code (requires authentication)

    - **stock_code**: Stock code (e.g., 0700.HK, NVDA.US)

    Authentication: Bearer token required
    """
    try:
        stock_service = StockService(db)
        stock = stock_service.get_stock_by_code(stock_code)

        if not stock:
            # Try to fetch from yfinance (convert stock_code to yfinance format)
            yf_symbol = stock_code.replace('.US', '')  # Remove .US for US stocks
            stock_info = yfinance_service.get_stock_info(yf_symbol)

            if stock_info:
                stock = stock_service.get_or_create_stock(stock_info)
            else:
                raise HTTPException(status_code=404, detail=f"Stock {stock_code} not found")

        return stock
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stock {stock_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{stock_code}/market-data", response_model=StockMarketDataResponse)
def get_market_data(
    stock_code: str,
    market_date: Optional[date] = Query(None, description="Market date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get market data for a stock (requires authentication)

    - **stock_code**: Stock code (e.g., 0700.HK, NVDA.US)
    - **market_date**: Market date (optional, defaults to today)

    Authentication: Bearer token required
    """
    try:
        stock_service = StockService(db)

        # If market_date provided, get that specific date
        if market_date:
            market_data = stock_service.get_market_data(stock_code, market_date)
        else:
            # Get latest market data
            market_data = stock_service.get_latest_market_data(stock_code)

        if not market_data:
            # Try to fetch fresh data from yfinance
            stock = stock_service.get_stock_by_code(stock_code)
            if not stock:
                raise HTTPException(status_code=404, detail=f"Stock {stock_code} not found")

            # Convert stock_code to yfinance format
            yf_symbol = stock_code.replace('.US', '')
            fresh_data = yfinance_service.get_market_data(yf_symbol)

            if fresh_data:
                market_data = stock_service.update_market_data(stock_code, fresh_data)
            else:
                raise HTTPException(status_code=404, detail=f"Market data for {stock_code} not found")

        return market_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market data for {stock_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{stock_code}/history", response_model=List[StockMarketHistoryResponse])
def get_historical_data(
    stock_code: str,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get historical data for a stock (requires authentication)

    - **stock_code**: Stock code (e.g., 0700.HK, NVDA.US)
    - **start_date**: Start date filter (optional)
    - **end_date**: End date filter (optional)
    - **limit**: Maximum number of records to return

    Authentication: Bearer token required
    """
    try:
        stock_service = StockService(db)
        stock = stock_service.get_stock_by_code(stock_code)

        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock {stock_code} not found")

        history = stock_service.get_historical_data(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        return history
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting historical data for {stock_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
def refresh_market_data(
    symbols: List[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger market data refresh (requires authentication)

    - **symbols**: List of stock codes to refresh (optional, if not provided refreshes all monitored stocks)

    Authentication: Bearer token required
    """
    try:
        from app.tasks.scheduler import MONITORED_STOCKS

        if symbols is None:
            # Convert yfinance symbols to stock_codes
            symbols = [s if '.' in s else f"{s}.US" for s in MONITORED_STOCKS]

        results = []
        for stock_code in symbols:
            try:
                stock_service = StockService(db)

                # Convert stock_code to yfinance format
                yf_symbol = stock_code.replace('.US', '')

                # Get or create stock
                stock_info = yfinance_service.get_stock_info(yf_symbol)
                if stock_info:
                    stock = stock_service.get_or_create_stock(stock_info)

                    # Get market data
                    market_data = yfinance_service.get_market_data(yf_symbol)
                    if market_data:
                        stock_service.update_market_data(stock_info['stock_code'], market_data)
                        results.append({"stock_code": stock_code, "status": "success"})
                    else:
                        results.append({"stock_code": stock_code, "status": "failed", "error": "No market data"})
                else:
                    results.append({"stock_code": stock_code, "status": "failed", "error": "Stock not found"})

            except Exception as e:
                results.append({"stock_code": stock_code, "status": "failed", "error": str(e)})

        return {"results": results}
    except Exception as e:
        logger.error(f"Error refreshing market data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Public endpoint (no authentication required) - for testing
@router.get("/public/list", response_model=List[StockInfoResponse])
def get_stocks_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get all stocks (public endpoint - no authentication required)

    This endpoint is for testing and demonstration purposes.
    """
    try:
        stock_service = StockService(db)
        stocks = stock_service.get_all_stocks(skip=skip, limit=limit)
        return stocks
    except Exception as e:
        logger.error(f"Error getting stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
