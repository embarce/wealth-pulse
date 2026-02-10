import yfinance as yf
import pandas as pd
from typing import Optional, Dict, Any
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

class YFinanceService:
    """Service for fetching stock data from Yahoo Finance via yfinance"""

    def __init__(self):
        self.cache_timeout = 300  # 5 minutes

    def get_stock_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch stock information

        Args:
            symbol: Stock symbol (e.g., '0700.HK' for Tencent, 'NVDA' for NVIDIA)

        Returns:
            Dictionary containing stock info or None if failed
        """
        try:
            ticker = yf.Ticker(symbol)
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
            ticker = yf.Ticker(symbol)

            # Get recent data
            info = ticker.info
            hist = ticker.history(period="5d", interval="1d")

            if hist.empty:
                logger.warning(f"No history data for {symbol}")
                return None

            # Get the most recent trading day
            latest = hist.iloc[-1]

            # Calculate change
            current_price = latest['Close']
            prev_close = latest['Open']
            if len(hist) > 1:
                prev_close = hist.iloc[-2]['Close']

            change = current_price - prev_close
            change_rate = (change / prev_close * 100) if prev_close > 0 else 0

            # Get current date
            now = datetime.now()
            market_date = now.date()
            quote_time = now

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

            return market_data

        except Exception as e:
            logger.error(f"Error fetching market data for {symbol}: {str(e)}")
            return None

    def get_historical_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> Optional[pd.DataFrame]:
        """
        Fetch historical price data

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

    def _format_stock_code(self, symbol: str) -> str:
        """Format symbol to stock_code format"""
        # Convert yfinance format to stock_code format
        # e.g., "0700.HK" stays as "0700.HK"
        # "NVDA" -> "NVDA.US"
        if '.' in symbol:
            return symbol.upper()

        # Add .US for US stocks
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


# Singleton instance
yfinance_service = YFinanceService()
