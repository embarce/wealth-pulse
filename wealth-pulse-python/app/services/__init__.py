"""
Services module initialization.

This module provides access to stock data providers and services.
"""

# Stock data provider factory (recommended for batch operations)
from app.services.stock_data_provider_factory import (
    get_stock_data_provider,
    get_default_provider,
    reset_provider,
    get_current_provider_type
)

# Base class (for type hints)
from app.services.stock_data_provider_base import BaseStockDataProvider

# Batch providers (for multiple stocks)
from app.services.yfinance_batch_service import YFinanceBatchService
from app.services.akshare_batch_service import AkShareBatchService

# Single stock services (for individual operations)
from app.services.yfinance_service import YFinanceService, yfinance_service
from app.services.akshare_service import AkShareService, akshare_service

__all__ = [
    # Factory functions (recommended for batch operations)
    'get_stock_data_provider',
    'get_default_provider',
    'reset_provider',
    'get_current_provider_type',

    # Base class
    'BaseStockDataProvider',

    # Batch providers (use factory instead)
    'YFinanceBatchService',
    'AkShareBatchService',

    # Single stock services (use for individual stock operations)
    'YFinanceService',
    'yfinance_service',
    'AkShareService',
    'akshare_service',
]
