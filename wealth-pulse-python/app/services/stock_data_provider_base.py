"""
Base class for stock data providers.

This module defines the interface that all stock data providers must implement.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import pandas as pd
from datetime import date


class BaseStockDataProvider(ABC):
    """
    Abstract base class for stock data providers.

    All stock data providers (yfinance, akshare, etc.) must implement this interface.
    """

    def __init__(self, request_delay: float = 0.5, max_retries: int = 3):
        """
        Initialize the data provider.

        Args:
            request_delay: Delay between requests in seconds
            max_retries: Maximum number of retry attempts
        """
        self.request_delay = request_delay
        self.max_retries = max_retries

    @abstractmethod
    def get_batch_stock_info(self, symbols: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch stock information for multiple symbols in batch.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to stock info (None if failed)
        """
        pass

    @abstractmethod
    def get_batch_market_data(self, symbols: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch current market data for multiple symbols in batch.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to market data (None if failed)
        """
        pass

    @abstractmethod
    def get_batch_combined_data(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch both stock info and market data in optimized way.

        This is the most efficient method as it minimizes API calls.

        Args:
            symbols: List of stock symbols

        Returns:
            Dictionary mapping symbol to {'info': ..., 'market_data': ...}
        """
        pass

    @abstractmethod
    def get_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical price data.

        Args:
            symbol: Stock symbol
            period: Time period
            interval: Data interval

        Returns:
            DataFrame with historical data or None if failed
        """
        pass

    @abstractmethod
    def _format_stock_code(self, symbol: str) -> str:
        """
        Format symbol to stock_code format.

        Args:
            symbol: Raw symbol string

        Returns:
            Formatted stock code
        """
        pass
