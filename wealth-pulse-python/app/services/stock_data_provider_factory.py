"""
股票数据提供者工厂
根据配置创建和管理数据提供者实例
"""
from typing import Optional
import logging

from app.core.config import settings
from app.services.stock_data_provider_base import BaseStockDataProvider
from app.services.yfinance_provider import YFinanceProvider
from app.services.akshare_provider import AkShareProvider

logger = logging.getLogger(__name__)


class StockDataProviderFactory:
    """
    股票数据提供者工厂

    负责根据配置创建和管理数据提供者实例
    支持的数据源：
    - yfinance: Yahoo Finance数据源
    - akshare: AkShare数据源
    """

    # 类变量，缓存数据提供者实例
    _provider_instance: Optional[BaseStockDataProvider] = None
    _current_provider_name: Optional[str] = None

    @classmethod
    def get_provider(cls) -> BaseStockDataProvider:
        """
        获取当前配置的数据提供者实例

        使用单例模式缓存提供者实例，避免重复创建

        Returns:
            BaseStockDataProvider 实例
        """
        provider_name = settings.STOCK_DATA_PROVIDER.lower()

        # 如果缓存存在且配置未变化，返回缓存的实例
        if cls._provider_instance is not None and cls._current_provider_name == provider_name:
            return cls._provider_instance

        # 创建新的提供者实例
        logger.info(f"[Factory] 创建数据提供者: {provider_name}")

        if provider_name == "yfinance":
            cls._provider_instance = YFinanceProvider()
        elif provider_name == "akshare":
            cls._provider_instance = AkShareProvider()
        else:
            logger.warning(f"[Factory] 未知的提供者: {provider_name}，使用默认的 akshare")
            cls._provider_instance = AkShareProvider()
            provider_name = "akshare"

        cls._current_provider_name = provider_name
        return cls._provider_instance

    @classmethod
    def create_provider(cls, provider_name: str) -> BaseStockDataProvider:
        """
        创建指定名称的数据提供者实例

        Args:
            provider_name: 提供者名称 ('yfinance' 或 'akshare')

        Returns:
            BaseStockDataProvider 实例
        """
        provider_name = provider_name.lower()

        logger.info(f"[Factory] 创建数据提供者: {provider_name}")

        if provider_name == "yfinance":
            return YFinanceProvider()
        elif provider_name == "akshare":
            return AkShareProvider()
        else:
            logger.warning(f"[Factory] 未知的提供者: {provider_name}，使用默认的 akshare")
            return AkShareProvider()

    @classmethod
    def reset_cache(cls):
        """
        重置提供者缓存

        在切换数据源或需要刷新实例时使用
        """
        logger.info("[Factory] 重置数据提供者缓存")
        cls._provider_instance = None
        cls._current_provider_name = None

    @classmethod
    def get_current_provider_name(cls) -> str:
        """
        获取当前使用的数据提供者名称

        Returns:
            提供者名称
        """
        return settings.STOCK_DATA_PROVIDER.lower()

    @classmethod
    def switch_provider(cls, provider_name: str) -> BaseStockDataProvider:
        """
        切换到指定的数据提供者

        Args:
            provider_name: 提供者名称 ('yfinance' 或 'akshare')

        Returns:
            新的提供者实例
        """
        logger.info(f"[Factory] 切换数据提供者: {cls._current_provider_name} -> {provider_name}")

        # 重置缓存
        cls.reset_cache()

        # 临时更新配置（注意：这不会修改settings.STOCK_DATA_PROVIDER的值）
        # 在实际使用中，应该通过修改环境变量或配置文件来永久切换
        cls._current_provider_name = provider_name.lower()

        # 创建并返回新实例
        return cls.create_provider(provider_name)


# 便捷函数：直接获取当前配置的提供者
def get_stock_data_provider() -> BaseStockDataProvider:
    """
    获取当前配置的数据提供者实例

    这是最常用的方法，直接返回配置文件中指定的数据提供者

    Returns:
        BaseStockDataProvider 实例
    """
    return StockDataProviderFactory.get_provider()
