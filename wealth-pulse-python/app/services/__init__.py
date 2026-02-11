"""
Services module initialization.

This module provides access to stock data providers and services.
"""

# Stock data provider factory (recommended for all operations)
from app.services.stock_data_provider_factory import (
    get_stock_data_provider,
    StockDataProviderFactory
)

# Base class (for type hints)
from app.services.stock_data_provider_base import BaseStockDataProvider

# Unified stock service (recommended for database operations)
from app.services.stock_service import StockService

# Provider implementations (use factory instead)
from app.services.yfinance_provider import YFinanceProvider
from app.services.akshare_provider import AkShareProvider

__all__ = [
    # Factory functions (recommended for all operations)
    'get_stock_data_provider',
    'StockDataProviderFactory',

    # Base class
    'BaseStockDataProvider',

    # Unified service
    'StockService',

    # Provider implementations
    'YFinanceProvider',
    'AkShareProvider',
]
