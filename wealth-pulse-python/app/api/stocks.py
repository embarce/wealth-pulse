import logging
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.core.exceptions import ApiException
from app.core.security import get_current_user
from app.db.lock import distributed_lock
from app.db.session import get_db
from app.schemas.common import success_response, ResponseCode
from app.services.stock_service import StockService

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
                            "last_price": float(
                                market_data.last_price) if market_data and market_data.last_price else None
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


@router.get("wealth-pulse-python/app/api/stocks.py", summary="Get HK stock security profile")
def get_security_profile(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 03900.HK)", example="03900.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock security profile from Eastmoney (requires authentication)

    This endpoint fetches real-time security profile data from Eastmoney's API,
    including listing information, issue details, and trading specifications.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 03900.HK)

    **Data Source:**
    - AkShare `stock_hk_security_profile_em` API
    - Eastmoney (emweb.securities.eastmoney.com)

    **Returned Fields:**
    - stock_code: 证券代码
    - security_name: 证券简称
    - listing_date: 上市日期
    - security_type: 证券类型
    - issue_price: 发行价
    - issue_volume: 发行量(股)
    - lot_size: 每手股数
    - par_value: 每股面值
    - exchange: 交易所
    - sector: 板块
    - year_end_date: 年结日
    - isin_code: ISIN（国际证券识别编码）
    - is_sh_hk_stock: 是否沪港通标的
    """
    try:
        import akshare as ak
        import pandas as pd

        # 判断是否为港股代码
        if not stock_code.upper().endswith('.HK'):
            raise ApiException(
                msg=f"Invalid stock code format. Expected HK stock code (e.g., 0700.HK, 03900.HK)",
                code=ResponseCode.BAD_REQUEST
            )

        # 标准化股票代码（参考 init_stocks.py 的 normalize_stock_code 函数）
        normalized_code = stock_code.replace('.HK', '').replace('.hk', '')
        if len(normalized_code) < 5:
            normalized_code = normalized_code.zfill(5)

        logger.info(f"[SecurityProfile] Fetching security profile for {stock_code} (normalized: {normalized_code})")

        # 调用 AkShare API 获取证券资料
        security_profile_df = ak.stock_hk_security_profile_em(symbol=normalized_code)

        if security_profile_df.empty:
            raise ApiException(
                msg=f"Security profile data not found for stock {stock_code}",
                code=ResponseCode.NOT_FOUND
            )

        # 获取第一行数据
        profile_data = security_profile_df.iloc[0]

        # 映射字段到 VO（根据 AkShare 返回的列名）
        # AkShare 返回的列名: ['证券代码', '证券简称', '上市日期', '证券类型', '发行价', '发行量(股)',
        #                       '每手股数', '每股面值', '交易所', '板块', '年结日', 'ISIN（国际证券识别编码）', '是否沪港通标的']
        response_data = {
            "stock_code": str(profile_data.get('证券代码', stock_code)),
            "security_name": str(profile_data.get('证券简称', '')),
            "listing_date": str(profile_data.get('上市日期', '')) if pd.notna(profile_data.get('上市日期')) else None,
            "security_type": str(profile_data.get('证券类型', '')) if pd.notna(profile_data.get('证券类型')) else None,
            "issue_price": float(profile_data.get('发行价')) if pd.notna(profile_data.get('发行价')) else None,
            "issue_volume": int(profile_data.get('发行量(股)')) if pd.notna(profile_data.get('发行量(股)')) else None,
            "lot_size": int(profile_data.get('每手股数')) if pd.notna(profile_data.get('每手股数')) else None,
            "par_value": str(profile_data.get('每股面值', '')) if pd.notna(profile_data.get('每股面值')) else None,
            "exchange": str(profile_data.get('交易所', '')) if pd.notna(profile_data.get('交易所')) else None,
            "sector": str(profile_data.get('板块', '')) if pd.notna(profile_data.get('板块')) else None,
            "year_end_date": str(profile_data.get('年结日', '')) if pd.notna(profile_data.get('年结日')) else None,
            "isin_code": str(profile_data.get('ISIN（国际证券识别编码）', '')) if pd.notna(
                profile_data.get('ISIN（国际证券识别编码）')) else None,
            "is_sh_hk_stock": str(profile_data.get('是否沪港通标的', '')) if pd.notna(
                profile_data.get('是否沪港通标的')) else None,
        }

        logger.info(f"[SecurityProfile] Successfully fetched security profile for {stock_code}")

        return success_response(
            data=response_data,
            msg="Security profile retrieved successfully"
        )

    except ApiException:
        raise
    except ImportError:
        logger.error("AkShare module not installed")
        raise ApiException(
            msg="AkShare module not available. Please install akshare package.",
            code=ResponseCode.INTERNAL_ERROR
        )
    except Exception as e:
        logger.error(f"Error fetching security profile for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve security profile: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/company-profile", summary="Get HK stock company profile")
def get_company_profile(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 03900.HK)", example="03900.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock company profile from Eastmoney (requires authentication)

    This endpoint fetches detailed company information including contact details,
    management team, and company description.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 03900.HK)

    **Data Source:**
    - AkShare `stock_hk_company_profile_em` API
    - Eastmoney (emweb.securities.eastmoney.com)

    **Returned Fields:**
    - stock_code: 证券代码
    - company_name: 公司名称
    - company_name_en: 英文名称
    - registration_place: 注册地
    - establishment_date: 公司成立日期
    - industry: 所属行业
    - chairman: 董事长
    - company_secretary: 公司秘书
    - employee_count: 员工人数
    - office_address: 办公地址
    - website: 公司网址
    - email: E-MAIL
    - year_end_date: 年结日
    - phone: 联系电话
    - auditor: 核数师
    - fax: 传真
    - company_introduction: 公司介绍
    """
    try:
        import akshare as ak
        import pandas as pd

        # 判断是否为港股代码
        if not stock_code.upper().endswith('.HK'):
            raise ApiException(
                msg=f"Invalid stock code format. Expected HK stock code (e.g., 0700.HK, 03900.HK)",
                code=ResponseCode.BAD_REQUEST
            )

        # 标准化股票代码（参考 init_stocks.py 的 normalize_stock_code 函数）
        normalized_code = stock_code.replace('.HK', '').replace('.hk', '')
        if len(normalized_code) < 5:
            normalized_code = normalized_code.zfill(5)

        logger.info(f"[CompanyProfile] Fetching company profile for {stock_code} (normalized: {normalized_code})")

        # 调用 AkShare API 获取公司资料
        company_profile_df = ak.stock_hk_company_profile_em(symbol=normalized_code)

        if company_profile_df.empty:
            raise ApiException(
                msg=f"Company profile data not found for stock {stock_code}",
                code=ResponseCode.NOT_FOUND
            )

        # 获取第一行数据
        profile_data = company_profile_df.iloc[0]

        # 映射字段到 VO（根据 AkShare 返回的列名）
        # AkShare 返回的列名: ['公司名称', '英文名称', '注册地', '公司成立日期', '所属行业', '董事长',
        #                       '公司秘书', '员工人数', '办公地址', '公司网址', 'E-MAIL', '年结日', '联系电话',
        #                       '核数师', '传真', '公司介绍']
        response_data = {
            "stock_code": stock_code,
            "company_name": str(profile_data.get('公司名称', '')),
            "company_name_en": str(profile_data.get('英文名称', '')),
            "registration_place": str(profile_data.get('注册地', '')) if pd.notna(profile_data.get('注册地')) else None,
            "establishment_date": str(profile_data.get('公司成立日期', '')) if pd.notna(
                profile_data.get('公司成立日期')) else None,
            "industry": str(profile_data.get('所属行业', '')) if pd.notna(profile_data.get('所属行业')) else None,
            "chairman": str(profile_data.get('董事长', '')) if pd.notna(profile_data.get('董事长')) else None,
            "company_secretary": str(profile_data.get('公司秘书', '')) if pd.notna(
                profile_data.get('公司秘书')) else None,
            "employee_count": int(profile_data.get('员工人数')) if pd.notna(profile_data.get('员工人数')) else None,
            "office_address": str(profile_data.get('办公地址', '')) if pd.notna(profile_data.get('办公地址')) else None,
            "website": str(profile_data.get('公司网址', '')) if pd.notna(profile_data.get('公司网址')) else None,
            "email": str(profile_data.get('E-MAIL', '')) if pd.notna(profile_data.get('E-MAIL')) else None,
            "year_end_date": str(profile_data.get('年结日', '')) if pd.notna(profile_data.get('年结日')) else None,
            "phone": str(profile_data.get('联系电话', '')) if pd.notna(profile_data.get('联系电话')) else None,
            "auditor": str(profile_data.get('核数师', '')) if pd.notna(profile_data.get('核数师')) else None,
            "fax": str(profile_data.get('传真', '')) if pd.notna(profile_data.get('传真')) else None,
            "company_introduction": str(profile_data.get('公司介绍', '')) if pd.notna(
                profile_data.get('公司介绍')) else None,
        }

        logger.info(f"[CompanyProfile] Successfully fetched company profile for {stock_code}")

        return success_response(
            data=response_data,
            msg="Company profile retrieved successfully"
        )

    except ApiException:
        raise
    except ImportError:
        logger.error("AkShare module not installed")
        raise ApiException(
            msg="AkShare module not available. Please install akshare package.",
            code=ResponseCode.INTERNAL_ERROR
        )
    except Exception as e:
        logger.error(f"Error fetching company profile for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve company profile: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/financial-indicator", summary="Get HK stock financial indicators")
def get_financial_indicator(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 03900.HK)", example="03900.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock financial indicators from Eastmoney (requires authentication)

    This endpoint fetches key financial metrics including profitability ratios,
    valuation metrics, and growth indicators.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 03900.HK)

    **Data Source:**
    - AkShare `stock_hk_financial_indicator_em` API
    - Eastmoney (emweb.securities.eastmoney.com)

    **Returned Fields:**
    - stock_code: 证券代码
    - basic_eps: 基本每股收益(元)
    - net_assets_per_share: 每股净资产(元)
    - legal_capital: 法定股本(股)
    - lot_size: 每手股
    - dividend_per_share_ttm: 每股股息TTM(港元)
    - payout_ratio: 派息比率(%)
    - issued_capital: 已发行股本(股)
    - issued_capital_h_shares: 已发行股本-H股(股)
    - operating_cash_flow_per_share: 每股经营现金流(元)
    - dividend_yield_ttm: 股息率TTM(%)
    - total_market_cap_hkd: 总市值(港元)
    - hk_market_cap_hkd: 港股市值(港元)
    - total_operating_revenue: 营业总收入
    - operating_revenue_growth_yoy: 营业总收入滚动环比增长(%)
    - net_profit_margin: 销售净利率(%)
    - net_profit: 净利润
    - net_profit_growth_yoy: 净利润滚动环比增长(%)
    - roe: 股东权益回报率(%)
    - pe_ratio: 市盈率
    - pb_ratio: 市净率
    - roa: 总资产回报率(%)
    """
    try:
        import akshare as ak
        import pandas as pd

        # 判断是否为港股代码
        if not stock_code.upper().endswith('.HK'):
            raise ApiException(
                msg=f"Invalid stock code format. Expected HK stock code (e.g., 0700.HK, 03900.HK)",
                code=ResponseCode.BAD_REQUEST
            )

        # 标准化股票代码（参考 init_stocks.py 的 normalize_stock_code 函数）
        normalized_code = stock_code.replace('.HK', '').replace('.hk', '')
        if len(normalized_code) < 5:
            normalized_code = normalized_code.zfill(5)

        logger.info(
            f"[FinancialIndicator] Fetching financial indicators for {stock_code} (normalized: {normalized_code})")

        # 调用 AkShare API 获取财务指标
        financial_indicator_df = ak.stock_hk_financial_indicator_em(symbol=normalized_code)

        if financial_indicator_df.empty:
            raise ApiException(
                msg=f"Financial indicator data not found for stock {stock_code}",
                code=ResponseCode.NOT_FOUND
            )

        # 获取第一行数据
        indicator_data = financial_indicator_df.iloc[0]

        # 映射字段到 VO（根据 AkShare 返回的列名）
        response_data = {
            "stock_code": stock_code,
            "basic_eps": str(indicator_data.get('基本每股收益(元)', '')) if pd.notna(
                indicator_data.get('基本每股收益(元)')) else None,
            "net_assets_per_share": str(indicator_data.get('每股净资产(元)', '')) if pd.notna(
                indicator_data.get('每股净资产(元)')) else None,
            "legal_capital": str(indicator_data.get('法定股本(股)', '')) if pd.notna(
                indicator_data.get('法定股本(股)')) else None,
            "lot_size": str(indicator_data.get('每手股', '')) if pd.notna(indicator_data.get('每手股')) else None,
            "dividend_per_share_ttm": str(indicator_data.get('每股股息TTM(港元)', '')) if pd.notna(
                indicator_data.get('每股股息TTM(港元)')) else None,
            "payout_ratio": str(indicator_data.get('派息比率(%)', '')) if pd.notna(
                indicator_data.get('派息比率(%)')) else None,
            "issued_capital": str(indicator_data.get('已发行股本(股)', '')) if pd.notna(
                indicator_data.get('已发行股本(股)')) else None,
            "issued_capital_h_shares": int(indicator_data.get('已发行股本-H股(股)')) if pd.notna(
                indicator_data.get('已发行股本-H股(股)')) else None,
            "operating_cash_flow_per_share": str(indicator_data.get('每股经营现金流(元)', '')) if pd.notna(
                indicator_data.get('每股经营现金流(元)')) else None,
            "dividend_yield_ttm": str(indicator_data.get('股息率TTM(%)', '')) if pd.notna(
                indicator_data.get('股息率TTM(%)')) else None,
            "total_market_cap_hkd": str(indicator_data.get('总市值(港元)', '')) if pd.notna(
                indicator_data.get('总市值(港元)')) else None,
            "hk_market_cap_hkd": str(indicator_data.get('港股市值(港元)', '')) if pd.notna(
                indicator_data.get('港股市值(港元)')) else None,
            "total_operating_revenue": str(indicator_data.get('营业总收入', '')) if pd.notna(
                indicator_data.get('营业总收入')) else None,
            "operating_revenue_growth_yoy": str(indicator_data.get('营业总收入滚动环比增长(%)', '')) if pd.notna(
                indicator_data.get('营业总收入滚动环比增长(%)')) else None,
            "net_profit_margin": str(indicator_data.get('销售净利率(%)', '')) if pd.notna(
                indicator_data.get('销售净利率(%)')) else None,
            "net_profit": str(indicator_data.get('净利润', '')) if pd.notna(indicator_data.get('净利润')) else None,
            "net_profit_growth_yoy": str(indicator_data.get('净利润滚动环比增长(%)', '')) if pd.notna(
                indicator_data.get('净利润滚动环比增长(%)')) else None,
            "roe": str(indicator_data.get('股东权益回报率(%)', '')) if pd.notna(
                indicator_data.get('股东权益回报率(%)')) else None,
            "pe_ratio": str(indicator_data.get('市盈率', '')) if pd.notna(indicator_data.get('市盈率')) else None,
            "pb_ratio": str(indicator_data.get('市净率', '')) if pd.notna(indicator_data.get('市净率')) else None,
            "roa": str(indicator_data.get('总资产回报率(%)', '')) if pd.notna(
                indicator_data.get('总资产回报率(%)')) else None,
        }

        logger.info(f"[FinancialIndicator] Successfully fetched financial indicators for {stock_code}")

        return success_response(
            data=response_data,
            msg="Financial indicators retrieved successfully"
        )

    except ApiException:
        raise
    except ImportError:
        logger.error("AkShare module not installed")
        raise ApiException(
            msg="AkShare module not available. Please install akshare package.",
            code=ResponseCode.INTERNAL_ERROR
        )
    except Exception as e:
        logger.error(f"Error fetching financial indicators for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve financial indicators: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/minute-history", summary="Get HK stock minute-level history from Sina Finance")
async def get_minute_history(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 01611.HK)", example="01611.HK"),
        period: str = Query('1', description="Period: 1=1min, 5=5min, 15=15min, 30=30min, 60=60min",
                            regex="^(1|5|15|30|60)$"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock minute-level historical data from Sina Finance (requires authentication)

    This endpoint fetches intraday minute-level data from Sina Finance API.
    Note: Only supports 1-minute period (real-time minute data).

    **Path Parameters:**
    - `stock_code`: Stock code (e.g., 0700.HK, 01611.HK)

    **Query Parameters:**
    - `period`: Time period ('1', '5', '15', '30', '60' for minutes)
                Note: Only '1' is supported for real-time minute data

    **Data Source:**
    - Sina Finance (stock.finance.sina.com.cn)

    **Returned Fields:**
    - trade_time: 交易时间 (HH:MM:SS)
    - stock_code: 股票代码
    - period: 周期 (固定为 1)
    - open_price: 开盘价 (港元)
    - close_price: 收盘价 (港元)
    - high_price: 最高价 (港元)
    - low_price: 最低价 (港元)
    - volume: 成交量 (股)
    - turnover: 成交额 (港元)
    - latest_price: 最新价 (港元)

    **Note:**
    - 数据为当日分时数据，包含开盘后每一分钟的成交信息
    - 股票代码会自动标准化为新浪格式
    """
    try:
        from app.services.sina_hk_realtime_crawler import sina_hk_minute_crawler

        logger.info(f"[MinuteHistory] Fetching minute history for {stock_code}: period={period}")

        # 使用爬虫获取分时数据
        result = await sina_hk_minute_crawler.fetch_minute_data(stock_code)

        if result.get('status') == 'error':
            logger.warning(f"[MinuteHistory] Failed to fetch minute history for {stock_code}: {result.get('error')}")
            raise ApiException(
                msg=f"Failed to fetch minute history: {result.get('error')}",
                code=ResponseCode.INTERNAL_ERROR
            )

        minute_data = result.get('minute_data', [])

        if not minute_data:
            return success_response(
                data=[],
                msg=f"No minute history found for stock {stock_code}"
            )

        # 转换为响应格式
        response_data = []
        for record in minute_data:
            response_item = {
                "trade_time": record.get('time'),
                "stock_code": stock_code,
                "period": period,
                "open_price": record.get('price'),
                "close_price": record.get('price'),
                "high_price": record.get('avg_price'),
                "low_price": record.get('avg_price'),
                "volume": record.get('volume'),
                "turnover": record.get('turnover'),
                "latest_price": record.get('price'),
            }
            response_data.append(response_item)

        logger.info(f"[MinuteHistory] Successfully fetched {len(response_data)} records for {stock_code}")

        return success_response(
            data=response_data,
            msg=f"Minute history retrieved successfully: {len(response_data)} records"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching minute history for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve minute history: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/enhanced-history", summary="Get HK stock enhanced history with period")
def get_enhanced_history(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 01611.HK)", example="0700.HK"),
        period: str = Query('daily', description="Period: 'daily'=daily, 'weekly'=weekly, 'monthly'=monthly",
                            regex="^(daily|weekly|monthly)$"),
        adjust: str = Query('', description="Adjustment type: ''=no adjust, 'qfq'=pre-adjust, 'hfq'=post-adjust"),
        start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock enhanced historical data with period support (requires authentication)

    This endpoint fetches enhanced historical data with different time periods.

    **Path Parameters:**
    - `stock_code`: Stock code (e.g., 0700.HK, 01611.HK)

    **Query Parameters:**
    - `period`: Time period ('daily', 'w')
    - `adjust`: Adjustment type (''=none, 'qfq'=pre-adjustment, 'hfq'=post-adjustment)
    - `start_date`: Start date (default: 1 year ago)
    - `end_date`: End date (default: today)

    **Data Source:**
    - AkShare `stock_hk_hist` API
    - Eastmoney

    **Returned Fields:**
    - stock_code: 股票代码
    - period: 周期类型
    - trade_date: 交易日期
    - open_price: 开盘价(港元)
    - close_price: 收盘价(港元)
    - high_price: 最高价(港元)
    - low_price: 最低价(港元)
    - volume: 成交量(股)
    - turnover: 成交额(港元)
    - amplitude: 振幅(%)
    - change_rate: 涨跌幅(%)
    - change_number: 涨跌额(港元)
    - turnover_rate: 换手率(%)
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[EnhancedHistory] Fetching enhanced history for {stock_code}: period={period}, adjust={adjust}")

        # 使用 AkShareProvider 获取数据
        provider = AkShareProvider()
        history_data = provider.get_stock_daily_history_enhanced(
            stock_code=stock_code,
            start_date=start_date,
            end_date=end_date,
            period=period,
            adjust=adjust
        )

        if not history_data:
            raise ApiException(
                msg=f"Enhanced history data not found for stock {stock_code}",
                code=ResponseCode.NOT_FOUND
            )

        # 转换为响应格式
        response_data = []
        for item in history_data:
            response_item = {
                "stock_code": item['stock_code'],
                "period": item['period'],
                "trade_date": item['trade_date'].isoformat() if isinstance(item['trade_date'], date) else item[
                    'trade_date'],
                "open_price": float(item['open_price']) if item.get('open_price') is not None else None,
                "close_price": float(item['close_price']) if item.get('close_price') is not None else None,
                "high_price": float(item['high_price']) if item.get('high_price') is not None else None,
                "low_price": float(item['low_price']) if item.get('low_price') is not None else None,
                "volume": int(item['volume']) if item.get('volume') is not None else None,
                "turnover": float(item['turnover']) if item.get('turnover') is not None else None,
                "amplitude": float(item['amplitude']) if item.get('amplitude') is not None else None,
                "change_rate": float(item['change_rate']) if item.get('change_rate') is not None else None,
                "change_number": float(item['change_number']) if item.get('change_number') is not None else None,
                "turnover_rate": float(item['turnover_rate']) if item.get('turnover_rate') is not None else None,
            }
            response_data.append(response_item)

        logger.info(f"[EnhancedHistory] Successfully fetched {len(response_data)} records for {stock_code}")

        return success_response(
            data=response_data,
            msg=f"Enhanced history retrieved successfully: {len(response_data)} records"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching enhanced history for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve enhanced history: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/news", summary="Get HK stock news from Sina Finance")
async def get_stock_news(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 09868.HK)", example="0700.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock news from Sina Finance (requires authentication)

    This endpoint crawls stock news from Sina Finance website.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 09868.HK)

    **Data Source:**
    - Sina Finance (stock.finance.sina.com.cn)

    **Returned Fields:**
    - title: 新闻标题
    - url: 新闻链接
    - datasource: 数据来源(固定为"新浪财经")
    - publish_time: 发布时间

    **Note:**
    - 股票代码会自动标准化为新浪格式(如 0700.HK → 00700)
    - 只返回当前页的新闻列表(通常约30条)
    """
    try:
        from app.services.sina_news_crawler import sina_news_crawler

        logger.info(f"[StockNews] Fetching news for {stock_code}")

        # 使用爬虫获取新闻
        news_items = await sina_news_crawler.fetch_stock_news(stock_code)

        if not news_items:
            return success_response(
                data=[],
                msg=f"No news found for stock {stock_code}"
            )

        logger.info(f"[StockNews] Successfully fetched {len(news_items)} news for {stock_code}")

        return success_response(
            data=news_items,
            msg=f"Stock news retrieved successfully: {len(news_items)} items"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching news for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve stock news: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/company-info-sina", summary="Get HK stock company info from Sina Finance")
async def get_company_info_sina(
        stock_code: str = Path(..., description="Stock code (e.g., 01810.HK, 09868.HK)", example="01810.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock company information from Sina Finance (requires authentication)

    This endpoint crawls company information from Sina Finance website.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 01810.HK, 09868.HK)

    **Data Source:**
    - Sina Finance (stock.finance.sina.com.cn)

    **Returned Fields:**
    - security_code: 证券代码
    - company_name_cn: 公司名称(中文)
    - company_name_en: 公司名称(英文)
    - business_description: 公司业务
    - industry: 所属行业
    - total_shares: 港股股份数目
    - chairman: 主席
    - major_shareholders: 主要持股人
    - directors: 董事
    - company_secretary: 公司秘书
    - registered_office: 注册办事处
    - headquarters: 公司总部
    - share_registrar: 股份过户登记处
    - auditor: 核数师
    - main_bank: 主要往来银行
    - legal_advisor: 法律顾问
    - website: 公司网址
    - email: 电邮地址
    - phone: 电话号码
    - fax: 传真号码
    - datasource: 数据来源(固定为"新浪财经")

    **Note:**
    - 股票代码会自动标准化为新浪格式(如 01810.HK → 01810)
    - 数据来源于新浪财经公司资料页面
    """
    try:
        from app.services.sina_company_info_crawler import sina_company_info_crawler

        logger.info(f"[CompanyInfoSina] Fetching company info for {stock_code}")

        # 使用爬虫获取公司信息
        company_info = await sina_company_info_crawler.fetch_company_info(stock_code)

        if not company_info:
            return success_response(
                data={},
                msg=f"No company info found for stock {stock_code}"
            )

        logger.info(
            f"[CompanyInfoSina] Successfully fetched company info for {stock_code} with {len(company_info)} fields")

        return success_response(
            data=company_info,
            msg="Company info retrieved successfully"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching company info for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve company info: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/financial-indicators-sina", summary="Get HK stock financial indicators from Sina Finance")
async def get_financial_indicators_sina(
        stock_code: str = Path(..., description="Stock code (e.g., 01810.HK, 09868.HK)", example="01810.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock financial indicators from Sina Finance (requires authentication)

    This endpoint crawls and calculates financial indicators from Sina Finance.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 01810.HK, 09868.HK)

    **Data Source:**
    - Sina Finance (stock.finance.sina.com.cn)

    **Returned Fields:**

    **Latest Period:**
    - end_date: 截止日期
    - report_type: 报表类型（年报/中报/季报）
    - announcement_date: 公告日期

    **Profitability (盈利能力):**
    - revenue: 营业收入（百万元）
    - net_profit: 净利润（百万元）
    - gross_profit_margin: 毛利率（%）
    - net_profit_margin: 净利率（%）
    - eps_basic: 基本每股盈利（仙）
    - operating_profit: 经营盈利（百万元）

    **Financial Health (财务健康):**
    - current_ratio: 流动比率
    - debt_ratio: 负债率（%）
    - operating_cash_flow: 经营现金流（百万元）
    - current_assets: 流动资产（百万元）
    - current_liabilities: 流动负债（百万元）
    - total_equity: 股东权益（百万元）

    **Historical Data:**
    - 最近8个报告期的历史数据

    **Note:**
    - PE、PB、ROE等指标在新浪财务页面不直接提供，需要从其他数据源获取
    - 毛利率和净利率根据原始财务数据计算得出
    - 流动比率和负债率同样通过计算得出

    **Data Limitations:**
    - 新浪财经主要提供原始财务数据
    - 部分指标需要手动计算或从其他数据源补充
    - 建议结合AkShare等其他数据源获取更完整的财务比率数据
    """
    try:
        from app.services.sina_finance_crawler import sina_finance_crawler

        logger.info(f"[FinancialIndicatorsSina] Fetching financial indicators for {stock_code}")

        # 使用爬虫获取财务指标
        financial_data = await sina_finance_crawler.fetch_financial_indicators(stock_code)

        if not financial_data:
            return success_response(
                data={},
                msg=f"No financial indicators found for stock {stock_code}"
            )

        logger.info(f"[FinancialIndicatorsSina] Successfully fetched financial indicators for {stock_code}")

        return success_response(
            data=financial_data,
            msg="Financial indicators retrieved successfully"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financial indicators for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve financial indicators: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/company-notices", summary="Get HK stock company notices from Sina Finance")
async def get_company_notices(
        stock_code: str = Path(..., description="Stock code (e.g., 01810.HK, 09868.HK)", example="09868.HK"),
        max_pages: int = Query(1, ge=1, le=10, description="Maximum number of pages to fetch (1-10, default: 1)"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock company notices from Sina Finance (requires authentication)

    This endpoint crawls company notices from Sina Finance website.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 01810.HK, 09868.HK)

    **Query Parameters:**
    - `max_pages`: Maximum number of pages to fetch (1-10, default: 1)

    **Data Source:**
    - Sina Finance (stock.finance.sina.com.cn)

    **Returned Fields:**
    - title: 公告标题
    - url: 公告链接
    - datasource: 数据来源(固定为"新浪财经")
    - publish_time: 发布时间
    """
    try:
        from app.services.sina_company_notice_crawler import sina_company_notice_crawler

        logger.info(f"[CompanyNotices] Fetching notices for {stock_code}, max_pages: {max_pages}")

        # 使用爬虫获取公告
        notices = await sina_company_notice_crawler.fetch_company_notices(stock_code, max_pages)

        if not notices:
            return success_response(
                data=[],
                msg=f"No notices found for stock {stock_code}"
            )

        logger.info(f"[CompanyNotices] Successfully fetched {len(notices)} notices for {stock_code}")

        return success_response(
            data=notices,
            msg=f"Company notices retrieved successfully: {len(notices)} items"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notices for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve company notices: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/realtime-quote", summary="Get HK stock realtime quote from Sina Finance")
async def get_realtime_quote(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 01810.HK)", example="0700.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock realtime quote from Sina Finance (requires authentication)

    This endpoint fetches real-time market data from Sina Finance API.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 01810.HK)

    **Data Source:**
    - Sina Finance (hq.sinajs.cn)

    **Returned Fields:**
    - symbol: 股票代码
    - normalized_symbol: 标准化后的股票代码 (5 位数字)
    - fetch_time: 获取时间
    - datasource: 数据来源 (新浪财经)
    - realtime_data: 实时行情数据
        - english_name: 英文名
        - chinese_name: 中文名
        - open: 开盘价
        - previous_close: 昨收价
        - high: 最高价
        - low: 最低价
        - current: 当前价
        - change: 涨跌额
        - change_percent: 涨跌幅
        - ask1: 卖一价
        - bid1: 买一价
        - turnover: 成交额
        - volume: 成交量
        - pe_ratio: 市盈率
        - high_52w: 52 周最高
        - low_52w: 52 周最低
        - date: 日期
        - time: 时间
        - amplitude: 振幅

    **Note:**
    - 股票代码会自动标准化为新浪格式 (如 0700.HK → 00700)
    - 数据为实时行情（港股交易时间内更新）
    """
    try:
        from app.services.sina_hk_realtime_crawler import sina_hk_realtime_crawler

        logger.info(f"[RealtimeQuote] Fetching realtime quote for {stock_code}")

        # 使用爬虫获取实时行情
        result = await sina_hk_realtime_crawler.fetch_realtime_quote(stock_code)

        if result.get('realtime_data', {}).get('status') == 'error':
            logger.warning(f"[RealtimeQuote] Failed to fetch realtime quote for {stock_code}: {result['realtime_data'].get('error')}")

        logger.info(f"[RealtimeQuote] Successfully fetched realtime quote for {stock_code}")

        return success_response(
            data=result,
            msg="Realtime quote retrieved successfully"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching realtime quote for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve realtime quote: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/minute-data", summary="Get HK stock minute-level data from Sina Finance")
async def get_minute_data(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 01810.HK)", example="0700.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock minute-level data from Sina Finance (requires authentication)

    This endpoint fetches intraday minute-level data from Sina Finance API.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 01810.HK)

    **Data Source:**
    - Sina Finance (stock.finance.sina.com.cn)

    **Returned Fields:**
    - symbol: 股票代码
    - normalized_symbol: 标准化后的股票代码
    - fetch_time: 获取时间
    - datasource: 数据来源 (新浪财经)
    - status: 状态 (success/error)
    - minute_data: 分时数据列表
        - time: 时间 (HH:MM:SS)
        - volume: 成交量
        - turnover: 成交额
        - price: 价格
        - avg_price: 均价
        - prev_open_volume: 前开盘量（仅第一条记录）

    **Note:**
    - 数据为当日分时数据
    - 包含开盘后每一分钟的成交和价格信息
    """
    try:
        from app.services.sina_hk_realtime_crawler import sina_hk_minute_crawler

        logger.info(f"[MinuteData] Fetching minute data for {stock_code}")

        # 使用爬虫获取分时数据
        result = await sina_hk_minute_crawler.fetch_minute_data(stock_code)

        if result.get('status') == 'error':
            logger.warning(f"[MinuteData] Failed to fetch minute data for {stock_code}: {result.get('error')}")

        logger.info(f"[MinuteData] Successfully fetched minute data for {stock_code}")

        return success_response(
            data=result,
            msg="Minute data retrieved successfully"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching minute data for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve minute data: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/{stock_code}/financial-indicator-em", summary="Get HK stock financial indicators from AkShare")
def get_financial_indicator_em(
        stock_code: str = Path(..., description="Stock code (e.g., 0700.HK, 09868.HK)", example="0700.HK"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get HK stock financial indicators from AkShare (East Money) (requires authentication)

    This endpoint fetches comprehensive financial indicators including PE, PB, ROE, etc.

    **Path Parameters:**
    - `stock_code`: Stock code in format (e.g., 0700.HK, 09868.HK)

    **Data Source:**
    - AkShare (East Money)

    **Key Indicators:**

    **Valuation (估值指标):**
    - `pe_ratio`: 市盈率
    - `pb_ratio`: 市净率

    **Profitability (盈利能力):**
    - `eps_basic`: 基本每股收益(元)
    - `net_assets_per_share`: 每股净资产(元)
    - `net_profit`: 净利润
    - `net_profit_margin`: 销售净利率(%)
    - `roe`: 股东权益回报率(ROE, %)
    - `roa`: 总资产回报率(%)
    - `operating_cash_flow_per_share`: 每股经营现金流(元)

    **Dividend (股息相关):**
    - `dividend_per_share_ttm`: 每股股息TTM(港元)
    - `dividend_yield_ttm`: 股息率TTM(%)
    - `payout_ratio`: 派息比率(%)

    **Growth (增长指标):**
    - `total_revenue`: 营业总收入
    - `revenue_growth_qoq`: 营业总收入滚动环比增长(%)
    - `net_profit_growth_qoq`: 净利润滚动环比增长(%)

    **Market Cap (市值相关):**
    - `market_cap_total`: 总市值(港元)
    - `market_cap_hk`: 港股市值(港元)

    **Share Capital (股本相关):**
    - `authorized_capital`: 法定股本(股)
    - `issued_shares`: 已发行股本(股)
    - `issued_shares_h_share`: 已发行股本-H股(股)
    - `lot_size`: 每手股数

    **Note:**
    - 数据来源：东方财富（通过AkShare接口）
    - 数据已经完成复权处理
    - 包含完整的PE、PB、ROE等关键财务比率
    - 建议结合新浪财务爬虫一起使用，获取更全面的财务数据

    **Comparison with Sina Finance:**
    - Sina: 提供原始财务数据和多期历史数据
    - AkShare: 提供计算好的财务比率（PE/PB/ROE）
    - Recommendation: Use both for comprehensive analysis
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[FinancialIndicatorEm] Fetching financial indicators for {stock_code}")

        # 使用AkShareProvider获取财务指标
        provider = AkShareProvider()
        financial_data = provider.get_stock_financial_indicator_sync(stock_code)

        if not financial_data:
            return success_response(
                data={},
                msg=f"No financial indicators found for stock {stock_code}"
            )

        logger.info(f"[FinancialIndicatorEm] Successfully fetched financial indicators for {stock_code}")

        return success_response(
            data=financial_data,
            msg="Financial indicators retrieved successfully from AkShare"
        )

    except ImportError:
        logger.error("AkShare module not installed")
        raise ApiException(
            msg="AkShare module not available. Please install akshare package: pip install akshare",
            code=ResponseCode.INTERNAL_ERROR
        )
    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financial indicators for {stock_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve financial indicators from AkShare: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


# ==================== 港股指数相关 API ====================

@router.get("/all/indices", summary="Get all HK stock market indices")
def get_all_indices(
        current_user: dict = Depends(get_current_user)
):
    """
    Get all Hong Kong stock market indices (requires authentication)

    多数据源自动切换：
    1. 优先使用东方财富网 (stock_hk_index_spot_em)
    2. 失败时自动切换到新浪财经 (stock_hk_index_spot_sina)

    **Data Source:**
    - Primary: AkShare `stock_hk_index_spot_em` API (Eastmoney)
    - Backup: AkShare `stock_hk_index_spot_sina` API (Sina Finance)

    **Returned Fields:**
    - index_code: 指数代码
    - index_name: 指数名称
    - index_type: 指数类型 (HK)
    - last_price: 最新价
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    - open_price: 开盘价
    - pre_close: 前收盘价
    - high_price: 当日最高价
    - low_price: 当日最低价
    - volume: 成交量
    - turnover: 成交额
    - pe_ratio: 市盈率
    - pb_ratio: 市净率
    - quote_time: 行情时间
    - market_date: 交易日
    - data_source: 数据来源
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info("[API] Fetching all HK indices (multi-source)")

        provider = AkShareProvider()
        indices = provider.get_all_hk_indices()

        if not indices:
            return success_response(
                data=[],
                msg="No HK indices found"
            )

        logger.info(f"[API] Successfully fetched {len(indices)} HK indices")

        return success_response(
            data=indices,
            msg=f"HK indices retrieved successfully: {len(indices)} indices"
        )

    except Exception as e:
        logger.error(f"Error fetching all HK indices: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve HK indices: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/indices/sina", summary="Get all HK stock market indices from Sina (backup source)")
def get_all_indices_sina(
        current_user: dict = Depends(get_current_user)
):
    """
    Get all Hong Kong stock market indices from Sina Finance (backup source)

    当东方财富网数据源不稳定时，可使用此接口作为备选方案。

    **Data Source:**
    - AkShare `stock_hk_index_spot_sina` API (Sina Finance)

    **Returned Fields:**
    - index_code: 指数代码
    - index_name: 指数名称
    - index_type: 指数类型 (HK)
    - last_price: 最新价
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    - open_price: 开盘价
    - pre_close: 前收盘价
    - high_price: 当日最高价
    - low_price: 当日最低价
    - volume: 成交量
    - turnover: 成交额
    - pe_ratio: 市盈率
    - pb_ratio: 市净率
    - quote_time: 行情时间
    - market_date: 交易日
    - data_source: 数据来源 (sina)
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info("[API] Fetching all HK indices from Sina Finance")

        provider = AkShareProvider()
        indices = provider._get_all_hk_indices_sina()

        if not indices:
            return success_response(
                data=[],
                msg="No HK indices found from Sina"
            )

        logger.info(f"[API] Successfully fetched {len(indices)} HK indices from Sina")

        return success_response(
            data=indices,
            msg=f"HK indices retrieved from Sina: {len(indices)} indices"
        )

    except Exception as e:
        logger.error(f"Error fetching HK indices from Sina: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve HK indices from Sina: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/indices/{index_code}", summary="Get HK stock market index by code")
def get_index(
        index_code: str = Path(..., description="Index code (e.g., HSI, HSTECH, CESHKM)", example="HSI"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get Hong Kong stock market index by code (requires authentication)

    This endpoint fetches real-time data for a specific HK stock market index
    from Eastmoney via AkShare.

    **Path Parameters:**
    - `index_code`: Index code (e.g., HSI for Hang Seng Index, HSTECH for Hang Seng TECH Index)

    **Data Source:**
    - AkShare `stock_hk_index_spot_em` API
    - Eastmoney

    **Returned Fields:**
    - index_code: 指数代码
    - index_name: 指数名称
    - index_type: 指数类型 (HK)
    - last_price: 最新价
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    - open_price: 开盘价
    - pre_close: 前收盘价
    - high_price: 当日最高价
    - low_price: 当日最低价
    - volume: 成交量
    - turnover: 成交额
    - pe_ratio: 市盈率
    - pb_ratio: 市净率
    - quote_time: 行情时间
    - market_date: 交易日
    - data_source: 数据来源
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[API] Fetching HK index: {index_code}")

        provider = AkShareProvider()
        index_data = provider.get_index_spot_data(index_code)

        if not index_data:
            raise ApiException(
                msg=f"Index {index_code} not found",
                code=ResponseCode.NOT_FOUND
            )

        logger.info(f"[API] Successfully fetched HK index: {index_code}")

        return success_response(
            data=index_data,
            msg="HK index retrieved successfully"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching HK index {index_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve HK index: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/indices/{index_code}/history", summary="Get HK stock market index history")
def get_index_history(
        index_code: str = Path(..., description="Index code (e.g., HSI, HSTECH)", example="HSI"),
        start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
        period: str = Query("daily", description="Period: daily=日线，weekly=周线，monthly=月线",
                            regex="^(daily|weekly|monthly)$"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get historical data for Hong Kong stock market index (requires authentication)

    **Path Parameters:**
    - `index_code`: Index code (e.g., HSI, HSTECH)

    **Query Parameters:**
    - `start_date`: Start date (default: 1 year ago)
    - `end_date`: End date (default: today)
    - `period`: Period type (daily, weekly, monthly)

    **Data Source:**
    - AkShare `stock_hk_index_daily_em` API
    - Eastmoney

    **Returned Fields:**
    - index_code: 指数代码
    - period: 周期类型
    - trade_date: 交易日期
    - open_price: 开盘价
    - close_price: 收盘价
    - high_price: 最高价
    - low_price: 最低价
    - volume: 成交量
    - turnover: 成交额
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[API] Fetching HK index history: {index_code}, period={period}")

        provider = AkShareProvider()
        history_data = provider.get_index_history_data(
            index_code=index_code,
            start_date=start_date,
            end_date=end_date,
            period=period
        )

        if not history_data:
            raise ApiException(
                msg=f"Index history data not found for {index_code}",
                code=ResponseCode.NOT_FOUND
            )

        # Convert to serializable format
        serializable_data = []
        for item in history_data:
            serializable_item = {
                "index_code": item["index_code"],
                "period": item["period"],
                "trade_date": item["trade_date"].isoformat() if isinstance(item["trade_date"], date) else str(
                    item["trade_date"]),
                "open_price": float(item["open_price"]) if item.get("open_price") is not None else None,
                "close_price": float(item["close_price"]) if item.get("close_price") is not None else None,
                "high_price": float(item["high_price"]) if item.get("high_price") is not None else None,
                "low_price": float(item["low_price"]) if item.get("low_price") is not None else None,
                "volume": int(item["volume"]) if item.get("volume") is not None else None,
                "turnover": float(item["turnover"]) if item.get("turnover") is not None else None,
                "change_number": float(item["change_number"]) if item.get("change_number") is not None else None,
                "change_rate": float(item["change_rate"]) if item.get("change_rate") is not None else None,
            }
            serializable_data.append(serializable_item)

        logger.info(f"[API] Successfully fetched {len(serializable_data)} history records for {index_code}")

        return success_response(
            data=serializable_data,
            msg=f"Index history retrieved successfully: {len(serializable_data)} records"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching HK index history {index_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve index history: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/indices/{index_code}/constituents", summary="Get HK stock market index constituents")
def get_index_constituents(
        index_code: str = Path(..., description="Index code (e.g., HSI)", example="HSI"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get constituent stocks of Hong Kong stock market index (requires authentication)

    **Path Parameters:**
    - `index_code`: Index code (e.g., HSI)

    **Data Source:**
    - AkShare `index_stock_cons` API

    **Returned Fields:**
    - stock_code: 股票代码
    - stock_name: 股票名称
    - weight: 权重 (%)
    - industry: 行业
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[API] Fetching HK index constituents: {index_code}")

        provider = AkShareProvider()
        constituents = provider.get_index_constituents(index_code)

        if not constituents:
            raise ApiException(
                msg=f"Index constituents data not found for {index_code}",
                code=ResponseCode.NOT_FOUND
            )

        logger.info(f"[API] Successfully fetched {len(constituents)} constituents for {index_code}")

        return success_response(
            data=constituents,
            msg=f"Index constituents retrieved successfully: {len(constituents)} stocks"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching HK index constituents {index_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve index constituents: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


# ==================== 美股指数相关 API ====================

@router.get("/us-indices", summary="Get all US stock market indices")
def get_all_us_indices(
        current_user: dict = Depends(get_current_user)
):
    """
    Get all US stock market indices (requires authentication)

    获取主要美股指数行情，包括：
    - .INX: 标普 500 指数 (S&P 500)
    - .DJI: 道琼斯工业平均指数 (Dow Jones Industrial Average)
    - .IXIC: 纳斯达克综合指数 (NASDAQ Composite)
    - .NDX: 纳斯达克 100 指数 (NASDAQ-100)

    **Data Source:**
    - AkShare `index_us_stock_sina` API (Sina Finance)

    **Returned Fields:**
    - index_code: 指数代码
    - index_name: 指数名称
    - index_type: 指数类型 (US)
    - last_price: 最新价
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    - open_price: 开盘价
    - pre_close: 前收盘价
    - high_price: 当日最高价
    - low_price: 当日最低价
    - volume: 成交量
    - turnover: 成交额
    - quote_time: 行情时间
    - market_date: 交易日
    - data_source: 数据来源
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info("[API] Fetching all US indices")

        provider = AkShareProvider()
        indices = provider.get_all_us_indices()

        if not indices:
            return success_response(
                data=[],
                msg="No US indices found"
            )

        logger.info(f"[API] Successfully fetched {len(indices)} US indices")

        return success_response(
            data=indices,
            msg=f"US indices retrieved successfully: {len(indices)} indices"
        )

    except Exception as e:
        logger.error(f"Error fetching all US indices: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve US indices: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/us-indices/{index_code}", summary="Get US stock market index by code")
def get_us_index(
        index_code: str = Path(..., description="Index code (e.g., .INX, .DJI, .IXIC, .NDX)", example=".INX"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get US stock market index by code (requires authentication)

    支持的美股指数：
    - .INX: 标普 500 指数 (S&P 500)
    - .DJI: 道琼斯工业平均指数 (Dow Jones Industrial Average)
    - .IXIC: 纳斯达克综合指数 (NASDAQ Composite)
    - .NDX: 纳斯达克 100 指数 (NASDAQ-100)

    **Path Parameters:**
    - `index_code`: Index code (e.g., .INX, .DJI, .IXIC, .NDX)

    **Data Source:**
    - AkShare `index_us_stock_sina` API (Sina Finance)

    **Returned Fields:**
    - index_code: 指数代码
    - index_name: 指数名称
    - index_type: 指数类型 (US)
    - last_price: 最新价
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    - open_price: 开盘价
    - pre_close: 前收盘价
    - high_price: 当日最高价
    - low_price: 当日最低价
    - volume: 成交量
    - turnover: 成交额
    - quote_time: 行情时间
    - market_date: 交易日
    - data_source: 数据来源
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[API] Fetching US index: {index_code}")

        provider = AkShareProvider()
        index_data = provider.get_us_index_spot(index_code)

        if not index_data:
            raise ApiException(
                msg=f"US Index {index_code} not found",
                code=ResponseCode.NOT_FOUND
            )

        logger.info(f"[API] Successfully fetched US index: {index_code}")

        return success_response(
            data=index_data,
            msg="US index retrieved successfully"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching US index {index_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve US index: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/us-indices/{index_code}/history", summary="Get US stock market index history")
def get_us_index_history(
        index_code: str = Path(..., description="Index code (e.g., .INX, .DJI)", example=".INX"),
        start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
        end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
        current_user: dict = Depends(get_current_user)
):
    """
    Get historical data for US stock market index (requires authentication)

    **Path Parameters:**
    - `index_code`: Index code (e.g., .INX, .DJI, .IXIC, .NDX)

    **Query Parameters:**
    - `start_date`: Start date (default: 1 year ago)
    - `end_date`: End date (default: today)

    **Data Source:**
    - AkShare `index_us_stock_sina` API (Sina Finance)

    **Returned Fields:**
    - index_code: 指数代码
    - trade_date: 交易日期
    - open_price: 开盘价
    - close_price: 收盘价
    - high_price: 最高价
    - low_price: 最低价
    - volume: 成交量
    - turnover: 成交额
    - change_number: 涨跌额
    - change_rate: 涨跌幅 (%)
    """
    try:
        from app.services.akshare_provider import AkShareProvider

        logger.info(f"[API] Fetching US index history: {index_code}")

        provider = AkShareProvider()
        history_data = provider.get_us_index_history(
            symbol=index_code,
            start_date=start_date,
            end_date=end_date
        )

        if not history_data:
            raise ApiException(
                msg=f"US Index history data not found for {index_code}",
                code=ResponseCode.NOT_FOUND
            )

        # Convert to serializable format
        serializable_data = []
        for item in history_data:
            serializable_item = {
                "index_code": item["index_code"],
                "trade_date": item["trade_date"].isoformat() if isinstance(item["trade_date"], date) else str(
                    item["trade_date"]),
                "open_price": float(item["open_price"]) if item.get("open_price") is not None else None,
                "close_price": float(item["close_price"]) if item.get("close_price") is not None else None,
                "high_price": float(item["high_price"]) if item.get("high_price") is not None else None,
                "low_price": float(item["low_price"]) if item.get("low_price") is not None else None,
                "volume": int(item["volume"]) if item.get("volume") is not None else None,
                "turnover": float(item["turnover"]) if item.get("turnover") is not None else None,
                "change_number": float(item["change_number"]) if item.get("change_number") is not None else None,
                "change_rate": float(item["change_rate"]) if item.get("change_rate") is not None else None,
            }
            serializable_data.append(serializable_item)

        logger.info(f"[API] Successfully fetched {len(serializable_data)} history records for {index_code}")

        return success_response(
            data=serializable_data,
            msg=f"US index history retrieved successfully: {len(serializable_data)} records"
        )

    except ApiException:
        raise
    except Exception as e:
        logger.error(f"Error fetching US index history {index_code}: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve US index history: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )
