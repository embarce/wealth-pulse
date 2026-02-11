from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from app.db.session import get_db
from app.services.stock_service import StockService
from app.schemas.stock import (
    StockInfoResponse,
    StockMarketDataResponse,
    StockMarketHistoryResponse
)
from app.core.security import get_current_user
from app.core.exceptions import ApiException
from app.schemas.common import success_response, page_response, ResponseCode
from app.db.lock import distributed_lock
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get(
    "/",
    summary="Get all stocks",
    description="Retrieve a list of all stocks in the database with pagination support."
)
def get_stocks(
    skip: int = Query(0, ge=0, description="Number of records to skip", example=0),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return", example=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all stocks (requires authentication)

    **Query Parameters:**
    - `skip`: Number of records to skip (for pagination)
    - `limit`: Maximum number of records to return (max 500)
    """
    try:
        stock_service = StockService(db)
        stocks = stock_service.get_all_stocks(skip=skip, limit=limit)

        # Convert to dict format
        stocks_data = []
        for stock in stocks:
            stocks_data.append({
                "stock_code": stock.stock_code,
                "company_name": stock.company_name,
                "short_name": stock.short_name,
                "stock_type": stock.stock_type,
                "exchange": stock.exchange,
                "currency": stock.currency,
                "industry": stock.industry,
                "market_cap": stock.market_cap,
                "display_order": stock.display_order,
                "stock_status": stock.stock_status
            })

        return success_response(
            data=stocks_data,
            msg="Stocks retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting stocks: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve stocks: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}", summary="Get stock by code")
def get_stock(
    stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, NVDA.US)", example="0700.HK"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get stock by stock_code (requires authentication)

    **Path Parameters:**
    - `stock_code`: Stock code (e.g., 0700.HK for Tencent, NVDA.US for NVIDIA)
    """
    try:
        stock_service = StockService(db)
        stock = stock_service.get_stock_by_code(stock_code)

        if not stock:
            raise ApiException(
                msg=f"Stock {stock_code} not found",
                code=ResponseCode.NOT_FOUND
            )

        stock_data = {
            "stock_code": stock.stock_code,
            "company_name": stock.company_name,
            "short_name": stock.short_name,
            "stock_type": stock.stock_type,
            "exchange": stock.exchange,
            "currency": stock.currency,
            "industry": stock.industry,
            "market_cap": stock.market_cap,
            "display_order": stock.display_order,
            "stock_status": stock.stock_status
        }

        return success_response(
            data=stock_data,
            msg="Stock retrieved successfully"
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error getting stock {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve stock: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/market-data", summary="Get market data")
def get_market_data(
    stock_code: str = Path(..., description="Stock code", example="0700.HK"),
    market_date: Optional[date] = Query(None, description="Market date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get market data for a stock (requires authentication)
    """
    try:
        stock_service = StockService(db)

        if market_date:
            market_data = stock_service.get_market_data(stock_code, market_date)
        else:
            market_data = stock_service.get_latest_market_data(stock_code)

        if not market_data:
            # Try to refresh from data provider
            fresh_data = stock_service.refresh_stock_market_data(stock_code)

            if fresh_data:
                market_data = fresh_data
            else:
                raise ApiException(
                    msg=f"Market data for {stock_code} not found",
                    code=ResponseCode.NOT_FOUND
                )

        data = {
            "id": market_data.id,
            "stock_code": market_data.stock_code,
            "last_price": float(market_data.last_price) if market_data.last_price else None,
            "change_number": float(market_data.change_number) if market_data.change_number else None,
            "change_rate": float(market_data.change_rate) if market_data.change_rate else None,
            "open_price": float(market_data.open_price) if market_data.open_price else None,
            "pre_close": float(market_data.pre_close) if market_data.pre_close else None,
            "high_price": float(market_data.high_price) if market_data.high_price else None,
            "low_price": float(market_data.low_price) if market_data.low_price else None,
            "volume": market_data.volume,
            "turnover": float(market_data.turnover) if market_data.turnover else None,
            "market_cap": float(market_data.market_cap) if market_data.market_cap else None,
            "pe_ratio": float(market_data.pe_ratio) if market_data.pe_ratio else None,
            "pb_ratio": float(market_data.pb_ratio) if market_data.pb_ratio else None,
            "quote_time": market_data.quote_time.isoformat() if market_data.quote_time else None,
            "market_date": market_data.market_date.isoformat() if market_data.market_date else None,
            "data_source": market_data.data_source
        }

        return success_response(
            data=data,
            msg="Market data retrieved successfully"
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error getting market data for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve market data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/history", summary="Get historical data")
def get_historical_data(
    stock_code: str = Path(..., description="Stock code", example="0700.HK"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get historical data for a stock (requires authentication)
    """
    try:
        stock_service = StockService(db)
        stock = stock_service.get_stock_by_code(stock_code)

        if not stock:
            raise ApiException(
                msg=f"Stock {stock_code} not found",
                code=ResponseCode.NOT_FOUND
            )

        history = stock_service.get_historical_data(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        history_data = []
        for h in history:
            history_data.append({
                "id": h.id,
                "stock_code": h.stock_code,
                "trade_date": h.trade_date.isoformat() if h.trade_date else None,
                "open_price": float(h.open_price) if h.open_price else None,
                "high_price": float(h.high_price) if h.high_price else None,
                "low_price": float(h.low_price) if h.low_price else None,
                "close_price": float(h.close_price) if h.close_price else None,
                "adj_close": float(h.adj_close) if h.adj_close else None,
                "volume": h.volume
            })

        return success_response(
            data=history_data,
            msg="Historical data retrieved successfully"
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error getting historical data for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve historical data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.post("/refresh", summary="Refresh market data")
def refresh_market_data(
    stock_codes: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger market data refresh (requires authentication)

    Only updates market_data for stocks that already exist in database.
    Does NOT create new stocks or update stock_info.

    Query Parameters:
    - stock_codes: Optional list of stock codes to refresh (e.g., ["0700.HK", "NVDA.US"])
                   If not provided, refreshes all active stocks in database.

    Uses distributed lock to prevent concurrent refresh operations.
    """
    try:
        from app.models.stock_info import StockInfo

        # Get stock codes to refresh
        if stock_codes is None:
            # Refresh all active stocks from database
            stocks = db.query(StockInfo.stock_code).filter(
                StockInfo.stock_status == 1
            ).all()
            stock_codes = [code for (code,) in stocks]
            logger.info(f"Refreshing all {len(stock_codes)} active stocks from database")
        else:
            logger.info(f"Refreshing {len(stock_codes)} specified stocks")

        if not stock_codes:
            return success_response(
                data={"results": []},
                msg="No stocks to refresh"
            )

        # Use distributed lock to prevent concurrent refreshes
        lock_name = "manual_market_data_refresh"
        lock_timeout = 600  # 10 minutes

        try:
            with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
                logger.info(f"Manual market data refresh started by user {current_user.get('username', 'unknown')}")

                # Use the new StockService batch refresh method
                stock_service = StockService(db)
                success_map = stock_service.refresh_batch_market_data(stock_codes)

                # Build results
                results = []
                success_count = 0
                for stock_code in stock_codes:
                    if success_map.get(stock_code, False):
                        # Get the updated market data
                        market_data = stock_service.get_latest_market_data(stock_code)
                        results.append({
                            "stock_code": stock_code,
                            "status": "success",
                            "last_price": float(market_data.last_price) if market_data and market_data.last_price else None
                        })
                        success_count += 1
                    else:
                        results.append({
                            "stock_code": stock_code,
                            "status": "failed",
                            "error": "Failed to refresh market data"
                        })

                logger.info(f"Manual market data refresh completed: {success_count}/{len(stock_codes)} succeeded")

                return success_response(
                    data={
                        "results": results,
                        "summary": {
                            "total": len(stock_codes),
                            "succeeded": success_count,
                            "failed": len(stock_codes) - success_count
                        }
                    },
                    msg=f"Market data refresh completed: {success_count}/{len(stock_codes)} succeeded"
                )

        except RuntimeError:
            # Lock acquisition failed - another refresh is already running
            logger.info("Manual market data refresh skipped - another refresh is already in progress")
            return success_response(
                data={"results": [], "skipped": True},
                msg="Another refresh operation is already in progress. Please wait for it to complete."
            )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing market data: {str(e)}")
        raise ApiException(
            msg=f"Failed to refresh market data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


# Public endpoint (no authentication)
@router.get("/public/list", summary="Get stocks (public)")
def get_stocks_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get all stocks (public endpoint - no authentication required)
    """
    try:
        stock_service = StockService(db)
        stocks = stock_service.get_all_stocks(skip=skip, limit=limit)

        stocks_data = []
        for stock in stocks:
            stocks_data.append({
                "stock_code": stock.stock_code,
                "company_name": stock.company_name,
                "short_name": stock.short_name,
                "stock_type": stock.stock_type,
                "exchange": stock.exchange,
                "currency": stock.currency,
                "industry": stock.industry,
                "market_cap": stock.market_cap,
                "display_order": stock.display_order,
                "stock_status": stock.stock_status
            })

        return success_response(
            data=stocks_data,
            msg="Stocks retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting stocks: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve stocks: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )
