"""
Factory for creating stock data provider instances.

This module provides a factory function that returns the appropriate
stock data provider based on environment variable configuration.
"""
import logging
from typing import Optional

from app.services.stock_data_provider_base import BaseStockDataProvider
from app.services.yfinance_batch_service import YFinanceBatchService, PROVIDER_TYPE as YFINANCE_TYPE
from app.services.akshare_batch_service import AkShareBatchService, PROVIDER_TYPE as AKSHARE_TYPE
from app.core.config import settings

logger = logging.getLogger(__name__)

# Provider instances cache
_provider_instance: Optional[BaseStockDataProvider] = None


def get_stock_data_provider(
    provider_type: Optional[str] = None,
    request_delay: float = 0.5,
    force_refresh: bool = False
) -> BaseStockDataProvider:
    """
    Get the stock data provider instance based on configuration.

    Args:
        provider_type: Provider type ('yfinance' or 'akshare'). If None, reads from environment.
        request_delay: Delay between requests in seconds
        force_refresh: Force create new instance even if cached

    Returns:
        Stock data provider instance

    Raises:
        ValueError: If provider_type is invalid
    """
    global _provider_instance

    # Determine provider type
    if provider_type is None:
        provider_type = getattr(settings, 'STOCK_DATA_PROVIDER', 'yfinance')

    # Check if we can reuse cached instance
    if not force_refresh and _provider_instance is not None:
        # Verify the cached instance is of the correct type
        cached_type = _provider_instance.__class__.__name__
        if (provider_type == 'yfinance' and cached_type == 'YFinanceBatchService') or \
           (provider_type == 'akshare' and cached_type == 'AkShareBatchService'):
            logger.debug(f"Reusing cached {provider_type} provider instance")
            return _provider_instance

    # Create new instance based on provider type
    logger.info(f"Creating new stock data provider: {provider_type}")

    if provider_type == 'yfinance':
        _provider_instance = YFinanceBatchService(request_delay=request_delay)
    elif provider_type == 'akshare':
        _provider_instance = AkShareBatchService(request_delay=request_delay)
    else:
        raise ValueError(
            f"Invalid stock data provider type: {provider_type}. "
            f"Supported types: 'yfinance', 'akshare'"
        )

    logger.info(f"Stock data provider '{provider_type}' initialized successfully")
    return _provider_instance


def reset_provider():
    """Reset the cached provider instance (useful for testing or config changes)"""
    global _provider_instance
    _provider_instance = None
    logger.debug("Stock data provider cache reset")


def get_current_provider_type() -> str:
    """Get the current provider type from settings"""
    return getattr(settings, 'STOCK_DATA_PROVIDER', 'yfinance')


# Convenience function to get the default provider
def get_default_provider() -> BaseStockDataProvider:
    """Get the default stock data provider based on environment configuration"""
    return get_stock_data_provider()
