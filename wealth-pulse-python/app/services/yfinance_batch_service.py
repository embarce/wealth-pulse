import yfinance as yf
import pandas as pd
from typing import Optional, Dict, Any, List
from datetime import datetime, date
import time
import logging

logger = logging.getLogger(__name__)


class YFinanceBatchService:
    """
    Enhanced yfinance service with batch support and rate limiting.

    Features:
    - Batch requests to reduce API calls
    - Request delays to avoid rate limiting
    - Automatic retries with exponential backoff
    - Efficient data fetching for multiple symbols
    """

    def __init__(self, request_delay: float = 0.5, max_retries: int = 3):
        """
        Initialize the batch service.

        Args:
            request_delay: Delay between requests in seconds (default: 0.5s)
            max_retries: Maximum number of retry attempts
        """
        self.request_delay = request_delay
        self.max_retries = max_retries

    def get_batch_stock_info(self, symbols: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch stock information for multiple symbols in batch.

        Args:
            symbols: List of stock symbols (e.g., ['0700.HK', 'NVDA'])

        Returns:
            Dictionary mapping symbol to stock info (None if failed)
        """
        results = {}

        try:
            # Use Tickers (plural) for batch requests
            tickers = yf.Tickers(symbols)

            for symbol in symbols:
                try:
                    ticker = tickers.tickers[symbol]
                    info = ticker.info

                    # Map symbol to stock_code format
                    stock_code = self._format_stock_code(symbol)

                    # Extract relevant information
                    stock_info = {
                        'stock_code': stock_code,
                        'company_name': info.get('longName') or info.get('shortName', ''),
                        'short_name': info.get('shortName', ''),
                        'stock_type': self._determine_type(info),
                        'exchange': info.get('exchange', ''),
                        'currency': self._determine_currency(info, symbol),
                        'industry': info.get('industry', ''),
                        'market_cap': str(info.get('marketCap', 0)) if info.get('marketCap') else None,
                        'display_order': 0,
                        'stock_status': 1
                    }

                    results[symbol] = stock_info
                    logger.debug(f"Successfully fetched info for {symbol}")

                except Exception as e:
                    logger.error(f"Error fetching info for {symbol}: {str(e)}")
                    results[symbol] = None

        except Exception as e:
            logger.error(f"Error in batch stock info fetch: {str(e)}")
            # Fallback to individual requests if batch fails
            for symbol in symbols:
                results[symbol] = self._get_stock_info_with_retry(symbol)

        return results

    def get_batch_market_data(self, symbols: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch current market data for multiple symbols in batch.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to market data (None if failed)
        """
        results = {}
        now = datetime.now()
        market_date = now.date()
        quote_time = now

        try:
            # Batch download recent historical data
            # yfinance download() is more efficient than individual requests
            data = yf.download(
                symbols,
                period="5d",
                interval="1d",
                group_by='ticker',
                progress=False
            )

            # Fetch additional info (PE, PB, etc.) in batch
            tickers = yf.Tickers(symbols)

            for symbol in symbols:
                try:
                    ticker = tickers.tickers[symbol]

                    # Extract historical data for this symbol
                    if len(symbols) == 1:
                        hist = data
                    else:
                        hist = data[symbol] if symbol in data else None

                    if hist is None or hist.empty:
                        logger.warning(f"No history data for {symbol}")
                        results[symbol] = None
                        continue

                    # Get the most recent trading day
                    latest = hist.iloc[-1]

                    # Calculate change
                    current_price = latest['Close']
                    prev_close = latest['Open']
                    if len(hist) > 1:
                        prev_close = hist.iloc[-2]['Close']

                    change = current_price - prev_close
                    change_rate = (change / prev_close * 100) if prev_close > 0 else 0

                    # Get additional info
                    info = ticker.info

                    stock_code = self._format_stock_code(symbol)

                    market_data = {
                        'stock_code': stock_code,
                        'last_price': round(float(current_price), 4),
                        'change_number': round(float(change), 4),
                        'change_rate': round(float(change_rate), 4),
                        'open_price': round(float(latest['Open']), 4),
                        'pre_close': round(float(prev_close), 4),
                        'high_price': round(float(latest['High']), 4),
                        'low_price': round(float(latest['Low']), 4),
                        'volume': int(latest['Volume']) if pd.notna(latest['Volume']) else None,
                        'turnover': round(float(latest['Volume'] * current_price), 4) if pd.notna(latest['Volume']) else None,
                        'day_low': round(float(latest['Low']), 4),
                        'day_high': round(float(latest['High']), 4),
                        'price_range_percent': round(
                            ((float(latest['High']) - float(latest['Low'])) / float(latest['Low']) * 100), 4) if latest[
                                                                                                                     'Low'] > 0 else None,
                        'week52_high': info.get('fiftyTwoWeekHigh'),
                        'week52_low': info.get('fiftyTwoWeekLow'),
                        'market_cap': info.get('marketCap'),
                        'pe_ratio': info.get('trailingPE'),
                        'pb_ratio': info.get('priceToBook'),
                        'quote_time': quote_time,
                        'market_date': market_date,
                        'data_source': 'yfinance',
                        'index_str': {
                            'dividend_yield': info.get('dividendYield') * 100 if info.get('dividendYield') else None,
                            'eps': info.get('trailingEps'),
                            'beta': info.get('beta')
                        }
                    }

                    results[symbol] = market_data
                    logger.debug(f"Successfully fetched market data for {symbol}")

                except Exception as e:
                    logger.error(f"Error processing market data for {symbol}: {str(e)}")
                    results[symbol] = None

        except Exception as e:
            logger.error(f"Error in batch market data fetch: {str(e)}")
            # Fallback to individual requests with delay
            for symbol in symbols:
                time.sleep(self.request_delay)
                results[symbol] = self._get_market_data_with_retry(symbol)

        return results

    def get_batch_combined_data(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch both stock info and market data in optimized way.

        This is the most efficient method as it minimizes API calls.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to {'info': ..., 'market_data': ...}
        """
        results = {}

        logger.info(f"Fetching combined data for {len(symbols)} symbols (batch mode)")

        try:
            # Step 1: Get all market data in one download call (most efficient)
            data = yf.download(
                symbols,
                period="5d",
                interval="1d",
                group_by='ticker',
                progress=False,
                show_errors=True
            )

            # Step 2: Get ticker objects for info
            tickers = yf.Tickers(symbols)
            time.sleep(self.request_delay)  # Delay after creating tickers

            now = datetime.now()
            market_date = now.date()
            quote_time = now

            for symbol in symbols:
                try:
                    ticker = tickers.tickers[symbol]
                    info = ticker.info
                    stock_code = self._format_stock_code(symbol)

                    # Extract stock info
                    stock_info = {
                        'stock_code': stock_code,
                        'company_name': info.get('longName') or info.get('shortName', ''),
                        'short_name': info.get('shortName', ''),
                        'stock_type': self._determine_type(info),
                        'exchange': info.get('exchange', ''),
                        'currency': self._determine_currency(info, symbol),
                        'industry': info.get('industry', ''),
                        'market_cap': str(info.get('marketCap', 0)) if info.get('marketCap') else None,
                        'display_order': 0,
                        'stock_status': 1
                    }

                    # Extract historical data
                    if len(symbols) == 1:
                        hist = data
                    else:
                        hist = data[symbol] if symbol in data else None

                    if hist is None or hist.empty:
                        results[symbol] = {'info': stock_info, 'market_data': None}
                        logger.warning(f"No market data for {symbol}")
                        continue

                    latest = hist.iloc[-1]
                    current_price = latest['Close']
                    prev_close = latest['Open'] if len(hist) == 1 else hist.iloc[-2]['Close']
                    change = current_price - prev_close
                    change_rate = (change / prev_close * 100) if prev_close > 0 else 0

                    market_data = {
                        'stock_code': stock_code,
                        'last_price': round(float(current_price), 4),
                        'change_number': round(float(change), 4),
                        'change_rate': round(float(change_rate), 4),
                        'open_price': round(float(latest['Open']), 4),
                        'pre_close': round(float(prev_close), 4),
                        'high_price': round(float(latest['High']), 4),
                        'low_price': round(float(latest['Low']), 4),
                        'volume': int(latest['Volume']) if pd.notna(latest['Volume']) else None,
                        'turnover': round(float(latest['Volume'] * current_price), 4) if pd.notna(latest['Volume']) else None,
                        'day_low': round(float(latest['Low']), 4),
                        'day_high': round(float(latest['High']), 4),
                        'price_range_percent': round(
                            ((float(latest['High']) - float(latest['Low'])) / float(latest['Low']) * 100), 4) if latest[
                                                                                                                     'Low'] > 0 else None,
                        'week52_high': info.get('fiftyTwoWeekHigh'),
                        'week52_low': info.get('fiftyTwoWeekLow'),
                        'market_cap': info.get('marketCap'),
                        'pe_ratio': info.get('trailingPE'),
                        'pb_ratio': info.get('priceToBook'),
                        'quote_time': quote_time,
                        'market_date': market_date,
                        'data_source': 'yfinance',
                        'index_str': {
                            'dividend_yield': info.get('dividendYield') * 100 if info.get('dividendYield') else None,
                            'eps': info.get('trailingEps'),
                            'beta': info.get('beta')
                        }
                    }

                    results[symbol] = {
                        'info': stock_info,
                        'market_data': market_data
                    }

                    logger.debug(f"Successfully fetched combined data for {symbol}")

                except Exception as e:
                    logger.error(f"Error processing {symbol}: {str(e)}")
                    results[symbol] = {'info': None, 'market_data': None}

        except Exception as e:
            logger.error(f"Error in batch combined data fetch: {str(e)}")
            # Fallback to individual methods with delay
            for symbol in symbols:
                time.sleep(self.request_delay)
                info = self._get_stock_info_with_retry(symbol)
                time.sleep(self.request_delay)
                market_data = self._get_market_data_with_retry(symbol)
                results[symbol] = {'info': info, 'market_data': market_data}

        logger.info(f"Batch fetch completed: {len(symbols)} symbols processed")
        return results

    def get_historical_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> Optional[pd.DataFrame]:
        """
        Fetch historical price data (unchanged from original).

        Args:
            symbol: Stock symbol
            period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

        Returns:
            DataFrame with historical data or None if failed
        """
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval=interval)

            if hist.empty:
                logger.warning(f"No historical data for {symbol}")
                return None

            # Reset index to make Date a column
            hist = hist.reset_index()

            # Rename columns to match database schema
            hist.columns = ['trade_date', 'open_price', 'high_price', 'low_price',
                            'close_price', 'adj_close', 'volume']

            # Add stock_code column
            stock_code = self._format_stock_code(symbol)
            hist['stock_code'] = stock_code

            # Convert trade_date to date
            hist['trade_date'] = pd.to_datetime(hist['trade_date']).dt.date

            return hist

        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
            return None

    def _get_stock_info_with_retry(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get stock info with retry logic"""
        for attempt in range(self.max_retries):
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info

                stock_code = self._format_stock_code(symbol)
                stock_info = {
                    'stock_code': stock_code,
                    'company_name': info.get('longName') or info.get('shortName', ''),
                    'short_name': info.get('shortName', ''),
                    'stock_type': self._determine_type(info),
                    'exchange': info.get('exchange', ''),
                    'currency': self._determine_currency(info, symbol),
                    'industry': info.get('industry', ''),
                    'market_cap': str(info.get('marketCap', 0)) if info.get('marketCap') else None,
                    'display_order': 0,
                    'stock_status': 1
                }
                return stock_info

            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait_time = (2 ** attempt) * self.request_delay
                    logger.warning(f"Retry {attempt + 1} for {symbol} after {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to fetch info for {symbol} after {self.max_retries} attempts")
                    return None

    def _get_market_data_with_retry(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get market data with retry logic"""
        for attempt in range(self.max_retries):
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                hist = ticker.history(period="5d", interval="1d")

                if hist.empty:
                    return None

                latest = hist.iloc[-1]
                current_price = latest['Close']
                prev_close = latest['Open'] if len(hist) == 1 else hist.iloc[-2]['Close']
                change = current_price - prev_close
                change_rate = (change / prev_close * 100) if prev_close > 0 else 0

                now = datetime.now()
                stock_code = self._format_stock_code(symbol)

                market_data = {
                    'stock_code': stock_code,
                    'last_price': round(float(current_price), 4),
                    'change_number': round(float(change), 4),
                    'change_rate': round(float(change_rate), 4),
                    'open_price': round(float(latest['Open']), 4),
                    'pre_close': round(float(prev_close), 4),
                    'high_price': round(float(latest['High']), 4),
                    'low_price': round(float(latest['Low']), 4),
                    'volume': int(latest['Volume']) if pd.notna(latest['Volume']) else None,
                    'turnover': round(float(latest['Volume'] * current_price), 4) if pd.notna(latest['Volume']) else None,
                    'week52_high': info.get('fiftyTwoWeekHigh'),
                    'week52_low': info.get('fiftyTwoWeekLow'),
                    'market_cap': info.get('marketCap'),
                    'pe_ratio': info.get('trailingPE'),
                    'pb_ratio': info.get('priceToBook'),
                    'quote_time': now,
                    'market_date': now.date(),
                    'data_source': 'yfinance',
                    'index_str': {
                        'dividend_yield': info.get('dividendYield') * 100 if info.get('dividendYield') else None,
                        'eps': info.get('trailingEps'),
                        'beta': info.get('beta')
                    }
                }
                return market_data

            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait_time = (2 ** attempt) * self.request_delay
                    logger.warning(f"Retry {attempt + 1} for {symbol} after {wait_time}s")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to fetch market data for {symbol} after {self.max_retries} attempts")
                    return None

    def _format_stock_code(self, symbol: str) -> str:
        """Format symbol to stock_code format"""
        if '.' in symbol:
            return symbol.upper()
        return f"{symbol}.US"

    def _determine_currency(self, info: Dict[str, Any], symbol: str) -> str:
        """Determine currency from info and symbol"""
        if symbol.endswith('.HK'):
            return 'HKD'
        elif symbol.endswith(('.TO', '.V')):
            return 'CAD'
        elif symbol.endswith(('.L', '.F')):
            return 'EUR'
        elif symbol.endswith('.SS'):
            return 'CNY'
        elif symbol.endswith('.T'):
            return 'JPY'
        else:
            return 'USD'

    def _determine_type(self, info: Dict[str, Any]) -> str:
        """Determine security type from info"""
        if info.get('quoteType') == 'ETF':
            return 'ETF'
        elif info.get('quoteType') == 'INDEX':
            return 'INDEX'
        elif info.get('quoteType') == 'MUTUALFUND':
            return 'FUND'
        else:
            return 'STOCK'


# Singleton instance with configurable delay
def get_batch_service(request_delay: float = 0.5) -> YFinanceBatchService:
    """Get or create batch service instance"""
    return YFinanceBatchService(request_delay=request_delay)


# Global instance
yfinance_batch_service = YFinanceBatchService(request_delay=0.5)
