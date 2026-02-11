"""
AkShare service for fetching Chinese stock data.

This service provides single-stock operations using AkShare library.
It mirrors the interface of YFinanceService for consistency.
"""
import akshare as ak
import pandas as pd
from typing import Optional, Dict, Any
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


class AkShareService:
    """Service for fetching stock data from AkShare"""

    def __init__(self):
        self.cache_timeout = 300  # 5 minutes

    def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch stock information

        Args:
            symbol: Stock symbol (e.g., '0700.HK' for Tencent, '000001.SZ' for 平安银行)

        Returns:
            Dictionary containing stock info or None if failed
        """
        try:
            stock_code, market = self._parse_symbol(symbol)

            # For HK stocks
            if market == 'HK':
                # Try to get stock info from historical data
                hist = ak.stock_hk_hist_sina(symbol=stock_code)
                if hist.empty:
                    logger.warning(f"No data found for HK stock {symbol}")
                    return None

                company_name = f"HK Stock {stock_code}"
                short_name = stock_code
                stock_type = 'STOCK'
                exchange = 'HKEX'
                currency = 'HKD'
                industry = ''

            # For A-shares
            elif market in ('SH', 'SZ'):
                # Get A-share stock info
                hist = ak.stock_zh_a_hist(symbol=stock_code, period="daily")
                if hist.empty:
                    logger.warning(f"No data found for A-share {symbol}")
                    return None

                # Try to get company name from individual stock info
                try:
                    stock_info = ak.stock_individual_info_em(symbol=stock_code)
                    if not stock_info.empty:
                        # Get item from column 'item' and value from 'value'
                        name_row = stock_info[stock_info['item'] == '股票简称']
                        if not name_row.empty:
                            company_name = name_row.iloc[0]['value']
                        else:
                            company_name = f"A-Share {stock_code}"
                    else:
                        company_name = f"A-Share {stock_code}"
                except:
                    company_name = f"A-Share {stock_code}"

                short_name = stock_code
                stock_type = 'STOCK'
                exchange = 'SSE' if market == 'SH' else 'SZSE'
                currency = 'CNY'
                industry = ''

            else:
                logger.warning(f"Unsupported market type for {symbol}")
                return None

            # Format stock code
            formatted_code = self._format_stock_code(symbol)

            stock_info = {
                'stock_code': formatted_code,
                'company_name': company_name,
                'short_name': short_name,
                'stock_type': stock_type,
                'exchange': exchange,
                'currency': currency,
                'industry': industry,
                'market_cap': None,  # AkShare doesn't provide this in basic calls
                'display_order': 0,
                'stock_status': 1
            }

            return stock_info

        except Exception as e:
            logger.error(f"Error fetching info for {symbol}: {str(e)}")
            return None

    def get_market_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch current market data for a stock

        Args:
            symbol: Stock symbol

        Returns:
            Dictionary containing market data or None if failed
        """
        try:
            stock_code, market = self._parse_symbol(symbol)

            if market == 'HK':
                return self._get_hk_market_data(stock_code, symbol)
            elif market in ('SH', 'SZ'):
                return self._get_a_share_market_data(stock_code, symbol, market)
            else:
                logger.warning(f"Unsupported market type for {symbol}")
                return None

        except Exception as e:
            logger.error(f"Error fetching market data for {symbol}: {str(e)}")
            return None

    def get_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical price data

        Args:
            symbol: Stock symbol
            period: Time period (akshare uses specific date ranges)
            interval: Data interval (akshare mostly supports daily)

        Returns:
            DataFrame with historical data or None if failed
        """
        try:
            stock_code, market = self._parse_symbol(symbol)

            if market == 'HK':
                # Fetch Hong Kong stock historical data
                hist = ak.stock_hk_hist_sina(symbol=stock_code)
            elif market in ('SH', 'SZ'):
                # Fetch A-share historical data
                adjust = ""  # No adjustment by default
                hist = ak.stock_zh_a_hist(
                    symbol=stock_code,
                    period="daily",
                    adjust=adjust
                )
            else:
                logger.warning(f"Unsupported market type for {symbol}")
                return None

            if hist.empty:
                logger.warning(f"No historical data for {symbol}")
                return None

            # Rename columns to match database schema
            # AkShare columns: 日期, 开盘, 收盘, 最高, 最低, 成交量, etc.
            column_mapping = {
                '日期': 'trade_date',
                '开盘': 'open_price',
                '最高': 'high_price',
                '最低': 'low_price',
                '收盘': 'close_price',
                '成交量': 'volume',
                '成交额': 'turnover'
            }

            hist = hist.rename(columns=column_mapping)

            # Add stock_code column
            hist['stock_code'] = self._format_stock_code(symbol)

            # Convert trade_date to date
            hist['trade_date'] = pd.to_datetime(hist['trade_date']).dt.date

            # Select and reorder columns
            columns_to_keep = ['trade_date', 'open_price', 'high_price', 'low_price',
                               'close_price', 'volume', 'stock_code']
            if 'turnover' in hist.columns:
                columns_to_keep.append('turnover')

            hist = hist[columns_to_keep]

            return hist

        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
            return None

    def _get_hk_market_data(self, stock_code: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get Hong Kong stock market data"""
        try:
            # Fetch HK real-time data
            df = ak.stock_hk_spot_em()

            # Find the stock in the dataframe
            stock_row = df[df['代码'] == stock_code]

            if stock_row.empty:
                logger.warning(f"No data found for {symbol}")
                return None

            row = stock_row.iloc[0]

            now = datetime.now()
            market_date = now.date()

            # Extract data from AkShare response
            current_price = float(row['最新价']) if pd.notna(row['最新价']) else 0
            open_price = float(row['开盘']) if pd.notna(row['开盘']) else 0
            prev_close = float(row['昨收']) if pd.notna(row['昨收']) else 0
            high_price = float(row['最高']) if pd.notna(row['最高']) else 0
            low_price = float(row['最低']) if pd.notna(row['最低']) else 0
            volume = int(row['成交量']) if pd.notna(row['成交量']) else 0
            change_number = float(row['涨跌额']) if pd.notna(row['涨跌额']) else 0
            change_rate = float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0

            market_data = {
                'stock_code': self._format_stock_code(symbol),
                'last_price': round(current_price, 4),
                'change_number': round(change_number, 4),
                'change_rate': round(change_rate, 4),
                'open_price': round(open_price, 4),
                'pre_close': round(prev_close, 4),
                'high_price': round(high_price, 4),
                'low_price': round(low_price, 4),
                'volume': volume,
                'turnover': round(volume * current_price, 4) if volume > 0 else None,
                'day_low': round(low_price, 4),
                'day_high': round(high_price, 4),
                'price_range_percent': round(
                    ((high_price - low_price) / low_price * 100), 4
                ) if low_price > 0 else None,
                'week52_high': None,
                'week52_low': None,
                'market_cap': None,
                'pe_ratio': None,
                'pb_ratio': None,
                'quote_time': now,
                'market_date': market_date,
                'data_source': 'akshare',
                'index_str': {
                    'dividend_yield': None,
                    'eps': None,
                    'beta': None
                }
            }

            return market_data

        except Exception as e:
            logger.error(f"Error fetching HK market data: {str(e)}")
            return None

    def _get_a_share_market_data(
        self,
        stock_code: str,
        symbol: str,
        market: str
    ) -> Optional[Dict[str, Any]]:
        """Get A-share market data"""
        try:
            # Fetch A-share real-time data
            df = ak.stock_zh_a_spot_em()

            # Find the stock
            stock_row = df[df['代码'] == stock_code]

            if stock_row.empty:
                logger.warning(f"No data found for {symbol}")
                return None

            row = stock_row.iloc[0]

            now = datetime.now()
            market_date = now.date()

            # Extract data
            current_price = float(row['最新价']) if pd.notna(row['最新价']) else 0
            open_price = float(row['今开']) if pd.notna(row['今开']) else 0
            prev_close = float(row['昨收']) if pd.notna(row['昨收']) else 0
            high_price = float(row['最高']) if pd.notna(row['最高']) else 0
            low_price = float(row['最低']) if pd.notna(row['最低']) else 0
            volume = int(row['成交量']) if pd.notna(row['成交量']) else 0
            change_number = float(row['涨跌额']) if pd.notna(row['涨跌额']) else 0
            change_rate = float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0

            market_data = {
                'stock_code': self._format_stock_code(symbol),
                'last_price': round(current_price, 4),
                'change_number': round(change_number, 4),
                'change_rate': round(change_rate, 4),
                'open_price': round(open_price, 4),
                'pre_close': round(prev_close, 4),
                'high_price': round(high_price, 4),
                'low_price': round(low_price, 4),
                'volume': volume,
                'turnover': round(volume * current_price, 4) if volume > 0 else None,
                'day_low': round(low_price, 4),
                'day_high': round(high_price, 4),
                'price_range_percent': round(
                    ((high_price - low_price) / low_price * 100), 4
                ) if low_price > 0 else None,
                'week52_high': None,
                'week52_low': None,
                'market_cap': None,
                'pe_ratio': None,
                'pb_ratio': None,
                'quote_time': now,
                'market_date': market_date,
                'data_source': 'akshare',
                'index_str': {
                    'dividend_yield': None,
                    'eps': None,
                    'beta': None
                }
            }

            return market_data

        except Exception as e:
            logger.error(f"Error fetching A-share market data: {str(e)}")
            return None

    def _parse_symbol(self, symbol: str) -> tuple:
        """
        Parse symbol into stock_code and market type.

        Args:
            symbol: Symbol like '0700.HK', '000001.SZ'

        Returns:
            Tuple of (stock_code, market)
            Example: ('00700', 'HK'), ('000001', 'SZ')
        """
        if '.' in symbol:
            parts = symbol.split('.')
            stock_code = parts[0]
            market = parts[1].upper()

            # Map market codes
            if market == 'HK':
                return stock_code, 'HK'
            elif market in ('SS', 'SH'):
                return stock_code, 'SH'
            elif market == 'SZ':
                return stock_code, 'SZ'
            else:
                return stock_code, market
        else:
            # Default to US or unknown
            return symbol, 'UNKNOWN'

    def _format_stock_code(self, symbol: str) -> str:
        """Format symbol to stock_code format"""
        # Keep the original format with dot notation
        if '.' in symbol:
            parts = symbol.split('.')
            return f"{parts[0]}.{parts[1].upper()}"
        return f"{symbol}.US"


# Singleton instance
akshare_service = AkShareService()
