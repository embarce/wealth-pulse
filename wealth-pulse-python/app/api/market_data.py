"""
市场数据刷新 API
提供当日市场数据的刷新和查询接口
"""
import logging
from datetime import date, datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.core.security import get_current_user
from app.db.lock import distributed_lock
from app.db.session import get_db
from app.schemas.common import success_response, ResponseCode
from app.services.stock_service import StockService
from app.models.stock_market_data import StockMarketData
from app.models.stock_info import StockInfo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/market-data", tags=["market-data"])


@router.post(
    "/refresh/today",
    summary="Refresh today's market data for all active stocks",
    description="Refresh market data for all active stocks or specified stock codes for today's date. Uses distributed lock to prevent concurrent refresh operations."
)
def refresh_today_market_data(
    stock_codes: Optional[List[str]] = Query(None, description="Optional list of stock codes to refresh (e.g., ['0700.HK', '09888.HK']). If not provided, refreshes all active stocks."),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Refresh today's market data for all active stocks or specified stocks.

    **Query Parameters:**
    - `stock_codes`: Optional list of stock codes to refresh. If not provided, refreshes all active stocks.

    **Process:**
    1. Acquire distributed lock to prevent concurrent refresh
    2. Get stock codes to refresh (all active or specified)
    3. Call data provider to fetch latest market data
    4. Save to database (tb_stock_market_data table)
    5. Return refresh results

    **Returns:**
    - success: List of successfully refreshed stocks with their latest prices
    - failed: List of failed stocks with error messages
    - summary: Summary statistics
    """
    try:
        today = date.today()
        logger.info(f"[API] Starting today's market data refresh for {today}")

        # Get stock codes to refresh
        if stock_codes is None:
            # Refresh all active stocks from database
            stocks = db.query(StockInfo.stock_code).filter(
                StockInfo.stock_status == 1
            ).all()
            stock_codes = [code for (code,) in stocks]
            logger.info(f"[API] Refreshing all {len(stock_codes)} active stocks")
        else:
            logger.info(f"[API] Refreshing {len(stock_codes)} specified stocks")

        if not stock_codes:
            return success_response(
                data={"results": [], "summary": {"total": 0, "succeeded": 0, "failed": 0}},
                msg="No stocks to refresh"
            )

        # Use distributed lock to prevent concurrent refreshes
        lock_name = "today_market_data_refresh"
        lock_timeout = 600  # 10 minutes

        try:
            with distributed_lock(lock_name, timeout=lock_timeout, blocking=False):
                logger.info(f"[API] Today's market data refresh started by user {current_user.get('username', 'unknown')}")

                # Use StockService to refresh market data
                stock_service = StockService(db)
                success_map = stock_service.refresh_batch_market_data(stock_codes)

                # Build detailed results
                success_list = []
                failed_list = []

                for stock_code in stock_codes:
                    if success_map.get(stock_code, False):
                        # Get the updated market data
                        market_data = stock_service.get_latest_market_data(stock_code)
                        if market_data:
                            success_list.append({
                                "stock_code": stock_code,
                                "status": "success",
                                "last_price": float(market_data.last_price) if market_data.last_price else None,
                                "change_rate": float(market_data.change_rate) if market_data.change_rate else None,
                                "change_number": float(market_data.change_number) if market_data.change_number else None,
                                "quote_time": market_data.quote_time.isoformat() if market_data.quote_time else None,
                                "market_date": market_data.market_date.isoformat() if market_data.market_date else None
                            })
                        else:
                            success_list.append({
                                "stock_code": stock_code,
                                "status": "success",
                                "note": "Data refreshed but not found in database"
                            })
                    else:
                        failed_list.append({
                            "stock_code": stock_code,
                            "status": "failed",
                            "error": "Failed to refresh market data"
                        })

                success_count = len(success_list)
                failed_count = len(failed_list)

                logger.info(f"[API] Today's market data refresh completed: {success_count}/{len(stock_codes)} succeeded")

                return success_response(
                    data={
                        "refresh_date": today.isoformat(),
                        "results": success_list if success_list else [],
                        "failed": failed_list if failed_list else [],
                        "summary": {
                            "total": len(stock_codes),
                            "succeeded": success_count,
                            "failed": failed_count,
                            "success_rate": f"{(success_count / len(stock_codes) * 100):.1f}%" if stock_codes else "0%"
                        }
                    },
                    msg=f"Today's market data refresh completed: {success_count}/{len(stock_codes)} succeeded"
                )

        except RuntimeError:
            # Lock acquisition failed - another refresh is already running
            logger.info("[API] Today's market data refresh skipped - another refresh is already in progress")
            return success_response(
                data={"results": [], "failed": [], "skipped": True},
                msg="Another refresh operation is already in progress. Please wait for it to complete."
            )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[API] Error refreshing today's market data: {str(e)}")
        raise ApiException(
            msg=f"Failed to refresh today's market data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.post(
    "/refresh/today/{stock_code}",
    summary="Refresh today's market data for a specific stock",
    description="Refresh market data for a single stock for today's date."
)
def refresh_single_stock_today(
    stock_code: str = Path(..., description="Stock code to refresh (e.g., '0700.HK', 'NVDA.US')"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Refresh today's market data for a specific stock.

    **Path Parameters:**
    - `stock_code`: Stock code to refresh

    **Returns:**
    - Stock market data if successful
    - Error message if failed
    """
    try:
        today = date.today()
        logger.info(f"[API] Refreshing today's market data for {stock_code}")

        # Use StockService to refresh single stock
        stock_service = StockService(db)
        market_data = stock_service.refresh_stock_market_data(stock_code)

        if not market_data:
            raise ApiException(
                msg=f"Failed to refresh market data for {stock_code}",
                code=ResponseCode.INTERNAL_ERROR
            )

        logger.info(f"[API] Successfully refreshed {stock_code}: last_price={market_data.last_price}")

        return success_response(
            data={
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
            },
            msg=f"Market data refreshed successfully for {stock_code}"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[API] Error refreshing today's market data for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to refresh today's market data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get(
    "/today",
    summary="Get today's market data for all active stocks",
    description="Get today's market data for all active stocks or a specific stock."
)
def get_today_market_data(
    stock_code: Optional[str] = Query(None, description="Optional stock code to get data for. If not provided, returns all active stocks."),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get today's market data.

    **Query Parameters:**
    - `stock_code`: Optional stock code. If not provided, returns all active stocks.

    **Returns:**
    - Market data for specified stock or all active stocks
    """
    try:
        today = date.today()
        logger.info(f"[API] Getting today's market data for {today}")

        if stock_code:
            # Get data for specific stock
            stock_service = StockService(db)
            market_data = stock_service.get_market_data(stock_code, today)

            if not market_data:
                # Try to get latest data if today's data not found
                market_data = stock_service.get_latest_market_data(stock_code)

            if not market_data:
                raise ApiException(
                    msg=f"Market data not found for {stock_code}",
                    code=ResponseCode.NOT_FOUND
                )

            return success_response(
                data={
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
                },
                msg=f"Today's market data retrieved for {stock_code}"
            )
        else:
            # Get data for all active stocks
            stock_service = StockService(db)
            all_market_data = stock_service.get_all_latest_market_data()

            if not all_market_data:
                return success_response(
                    data={"stocks": []},
                    msg="No market data found for today"
                )

            # Convert to serializable format
            stocks_data = []
            for code, data in all_market_data.items():
                stocks_data.append({
                    "stock_code": data.stock_code,
                    "last_price": float(data.last_price) if data.last_price else None,
                    "change_number": float(data.change_number) if data.change_number else None,
                    "change_rate": float(data.change_rate) if data.change_rate else None,
                    "open_price": float(data.open_price) if data.open_price else None,
                    "pre_close": float(data.pre_close) if data.pre_close else None,
                    "high_price": float(data.high_price) if data.high_price else None,
                    "low_price": float(data.low_price) if data.low_price else None,
                    "volume": data.volume,
                    "turnover": float(data.turnover) if data.turnover else None,
                    "market_cap": float(data.market_cap) if data.market_cap else None,
                    "quote_time": data.quote_time.isoformat() if data.quote_time else None,
                    "market_date": data.market_date.isoformat() if data.market_date else None
                })

            return success_response(
                data={
                    "market_date": today.isoformat(),
                    "total_stocks": len(stocks_data),
                    "stocks": stocks_data
                },
                msg=f"Today's market data retrieved for {len(stocks_data)} stocks"
            )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"[API] Error getting today's market data: {str(e)}")
        raise ApiException(
            msg=f"Failed to get today's market data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )
