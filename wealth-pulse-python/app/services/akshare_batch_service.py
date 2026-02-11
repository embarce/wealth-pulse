"""
AkShare batch service for fetching Chinese and Hong Kong stock data.

This service uses akshare library to fetch stock data from Chinese sources.
It implements the same interface as YFinanceBatchService for easy switching.
"""
import akshare as ak
import pandas as pd
from typing import Optional, Dict, Any, List
from datetime import datetime, date
import time
import logging

from app.services.stock_data_provider_base import BaseStockDataProvider

logger = logging.getLogger(__name__)


class AkShareBatchService(BaseStockDataProvider):
    """
    AkShare service with batch support and rate limiting.

    Features:
    - Support for A-shares and Hong Kong stocks
    - Request delays to avoid rate limiting
    - Automatic retries with exponential backoff
    - Efficient data fetching for multiple symbols

    Note: AkShare doesn't support true batch requests like yfinance,
    so it makes individual requests with delays.
    """

    # Symbol format mapping
    # For HK stocks: symbol should be like "00700" for Tencent
    # For A-shares: symbol should be like "000001" for平安银行
    SYMBOL_FORMAT_MAP = {
        'HK': '.HK',
        'SH': '.SS',  # Shanghai
        'SZ': '.SZ',  # Shenzhen
    }

    def __init__(self, request_delay: float = 0.5, max_retries: int = 3):
        """
        Initialize the batch service.

        Args:
            request_delay: Delay between requests in seconds (default: 0.5s)
            max_retries: Maximum number of retry attempts
        """
        super().__init__(request_delay, max_retries)

    def get_batch_stock_info(self, symbols: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch stock information for multiple symbols.

        Note: AkShare doesn't have a dedicated stock info API like yfinance.
        We'll fetch basic info from market data.

        Args:
            symbols: List of stock symbols (e.g., ['0700.HK', '000001.SZ'])

        Returns:
            Dictionary mapping symbol to stock info (None if failed)
        """
        results = {}

        for symbol in symbols:
            try:
                time.sleep(self.request_delay)

                stock_code = self._format_stock_code(symbol)
                info = self._get_stock_info_from_market(symbol)

                if info:
                    results[symbol] = info
                    logger.debug(f"Successfully fetched info for {symbol}")
                else:
                    results[symbol] = None

            except Exception as e:
                logger.error(f"Error fetching info for {symbol}: {str(e)}")
                results[symbol] = None

        return results

    def get_batch_market_data(self, symbols: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch current market data for multiple symbols.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to market data (None if failed)
        """
        results = {}

        for symbol in symbols:
            try:
                time.sleep(self.request_delay)
                market_data = self._get_market_data_with_retry(symbol)

                results[symbol] = market_data

            except Exception as e:
                logger.error(f"Error fetching market data for {symbol}: {str(e)}")
                results[symbol] = None

        return results

    def get_batch_combined_data(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch both stock info and market data.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to {'info': ..., 'market_data': ...}
        """
        results = {}

        logger.info(f"Fetching combined data for {len(symbols)} symbols using AkShare")

        for symbol in symbols:
            try:
                time.sleep(self.request_delay)

                # Get market data (which also contains basic info)
                market_data = self._get_market_data_with_retry(symbol)

                # Extract basic info from market data
                stock_info = self._get_stock_info_from_market(symbol)

                results[symbol] = {
                    'info': stock_info,
                    'market_data': market_data
                }

                logger.debug(f"Successfully fetched combined data for {symbol}")

            except Exception as e:
                logger.error(f"Error processing {symbol}: {str(e)}")
                results[symbol] = {'info': None, 'market_data': None}

        logger.info(f"Batch fetch completed: {len(symbols)} symbols processed")
        return results

    def get_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical price data.

        Args:
            symbol: Stock symbol (e.g., '0700.HK', '000001.SZ')
            period: Time period (akshare uses specific date ranges)
            interval: Data interval (akshare mostly supports daily)

        Returns:
            DataFrame with historical data or None if failed
        """
        try:
            # Parse the symbol
            stock_code, market = self._parse_symbol(symbol)

            if market == 'HK':
                # Fetch Hong Kong stock historical data
                hist = ak.stock_hk_hist_sina(symbol=stock_code)
            elif market in ('SH', 'SZ'):
                # Fetch A-share historical data
                hist = ak.stock_zh_a_hist(
                    symbol=stock_code,
                    period="daily",
                    adjust=""  # No adjustment by default
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

    def _get_stock_info_from_market(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Extract stock info from market data"""
        try:
            stock_code, market = self._parse_symbol(symbol)

            # For HK stocks, we can get basic info
            if market == 'HK':
                # Try to get stock name from historical data header
                hist = ak.stock_hk_hist_sina(symbol=stock_code)
                if not hist.empty:
                    # AkShare doesn't always provide company name in historical data
                    # We'll use a generic name based on stock code
                    company_name = f"HK Stock {stock_code}"
                    short_name = stock_code
                else:
                    return None
            elif market in ('SH', 'SZ'):
                # For A-shares
                hist = ak.stock_zh_a_hist(symbol=stock_code, period="daily")
                if not hist.empty:
                    company_name = f"A-Share {stock_code}"
                    short_name = stock_code
                else:
                    return None
            else:
                return None

            return {
                'stock_code': self._format_stock_code(symbol),
                'company_name': company_name,
                'short_name': short_name,
                'stock_type': self._determine_type(market),
                'exchange': self._determine_exchange(market),
                'currency': self._determine_currency(market),
                'industry': '',
                'market_cap': None,
                'display_order': 0,
                'stock_status': 1
            }

        except Exception as e:
            logger.error(f"Error getting stock info for {symbol}: {str(e)}")
            return None

    def _get_market_data_with_retry(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get market data with retry logic"""
        for attempt in range(self.max_retries):
            try:
                stock_code, market = self._parse_symbol(symbol)

                if market == 'HK':
                    # Fetch Hong Kong stock real-time data
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
                    # AkShare HK columns: 代码, 名称, 最新价, 涨跌额, 涨跌幅, 开盘, 昨收, 最高, 最低, 成交量, etc.
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

                elif market in ('SH', 'SZ'):
                    # For A-shares, use real-time data
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

                else:
                    logger.warning(f"Unsupported market type for {symbol}")
                    return None

            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait_time = (2 ** attempt) * self.request_delay
                    logger.warning(f"Retry {attempt + 1} for {symbol} after {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to fetch market data for {symbol} after {self.max_retries} attempts: {str(e)}")
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

    def _determine_currency(self, market: str) -> str:
        """Determine currency from market type"""
        if market == 'HK':
            return 'HKD'
        elif market in ('SH', 'SZ'):
            return 'CNY'
        else:
            return 'USD'

    def _determine_exchange(self, market: str) -> str:
        """Determine exchange from market type"""
        if market == 'HK':
            return 'HKEX'
        elif market == 'SH':
            return 'SSE'
        elif market == 'SZ':
            return 'SZSE'
        else:
            return 'UNKNOWN'

    def _determine_type(self, market: str) -> str:
        """Determine security type from market"""
        return 'STOCK'


# Singleton instance with configurable delay
def get_batch_service(request_delay: float = 0.5) -> AkShareBatchService:
    """Get or create batch service instance"""
    return AkShareBatchService(request_delay=request_delay)


# Global instance
akshare_batch_service = AkShareBatchService(request_delay=0.5)


# Provider type identifier
PROVIDER_TYPE = "akshare"
