"""
股票数据提供者抽象基类
定义所有数据提供者必须实现的接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from datetime import date, datetime
from dataclasses import dataclass
import time
import logging

from app.models.stock_market_data import StockMarketData
from app.models.stock_market_history import StockMarketHistory

logger = logging.getLogger(__name__)


@dataclass
class MarketDataResult:
    """市场数据结果"""
    stock_code: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


@dataclass
class HistoryDataResult:
    """历史数据结果"""
    stock_code: str
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None


class BaseStockDataProvider(ABC):
    """
    股票数据提供者抽象基类
    所有数据提供者（akshare、yfinance等）必须实现此接口
    """

    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        """
        初始化数据提供者

        Args:
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
        """
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.provider_name = self.__class__.__name__

    # ==================== 抽象方法 ====================

    @abstractmethod
    def get_stock_market_data(self, stock_code: str) -> Optional[Dict[str, Any]]:
        """
        获取单个股票的实时行情数据

        Args:
            stock_code: 股票代码

        Returns:
            包含市场数据的字典，如果失败返回None
        """
        pass

    @abstractmethod
    def get_batch_market_data(self, stock_codes: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        批量获取股票的实时行情数据

        Args:
            stock_codes: 股票代码列表

        Returns:
            字典，key为stock_code，value为对应的市场数据或None
        """
        pass

    @abstractmethod
    def get_stock_history_data(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取单个股票的历史行情数据

        Args:
            stock_code: 股票代码
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            历史数据列表，如果失败返回None
        """
        pass

    @abstractmethod
    def get_batch_history_data(
        self,
        stock_codes: List[str],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Optional[List[Dict[str, Any]]]]:
        """
        批量获取股票的历史行情数据

        Args:
            stock_codes: 股票代码列表
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            字典，key为stock_code，value为对应的历史数据列表或None
        """
        pass

    # ==================== 通用方法 ====================

    def get_stock_market_data_with_retry(self, stock_code: str) -> MarketDataResult:
        """
        获取单个股票实时行情数据（带重试）

        Args:
            stock_code: 股票代码

        Returns:
            MarketDataResult对象
        """
        for attempt in range(self.max_retries):
            try:
                data = self.get_stock_market_data(stock_code)
                if data:
                    logger.info(f"[{self.provider_name}] 成功获取 {stock_code} 实时行情数据")
                    return MarketDataResult(
                        stock_code=stock_code,
                        success=True,
                        data=data
                    )
                else:
                    logger.warning(f"[{self.provider_name}] {stock_code} 返回空数据 (尝试 {attempt + 1}/{self.max_retries})")
            except Exception as e:
                logger.error(f"[{self.provider_name}] 获取 {stock_code} 实时行情数据失败: {str(e)} (尝试 {attempt + 1}/{self.max_retries})")

            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay)

        return MarketDataResult(
            stock_code=stock_code,
            success=False,
            error_message=f"重试 {self.max_retries} 次后仍然失败"
        )

    def get_batch_market_data_with_retry(self, stock_codes: List[str]) -> List[MarketDataResult]:
        """
        批量获取股票实时行情数据（带重试）

        Args:
            stock_codes: 股票代码列表

        Returns:
            MarketDataResult对象列表
        """
        # 默认实现：优先使用具体实现类的批量接口，以便像 AkShare 这类
        # 一次性返回全市场数据的 provider 能真正做到「批量一次请求」，
        # 而不是循环单个请求。
        last_error: Optional[str] = None

        for attempt in range(self.max_retries):
            try:
                raw_result = self.get_batch_market_data(stock_codes)

                results: List[MarketDataResult] = []
                for code in stock_codes:
                    data = raw_result.get(code) if raw_result is not None else None

                    if data:
                        results.append(
                            MarketDataResult(
                                stock_code=code,
                                success=True,
                                data=data,
                            )
                        )
                    else:
                        results.append(
                            MarketDataResult(
                                stock_code=code,
                                success=False,
                                error_message="批量接口返回空数据",
                            )
                        )

                logger.info(
                    f"[{self.provider_name}] 批量获取实时行情完成，"
                    f"股票数: {len(stock_codes)} (尝试 {attempt + 1}/{self.max_retries})"
                )
                return results

            except Exception as e:
                last_error = str(e)
                logger.error(
                    f"[{self.provider_name}] 批量获取实时行情失败: {last_error} "
                    f"(尝试 {attempt + 1}/{self.max_retries})"
                )
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)

        # 如果多次批量调用都失败，则为每个股票返回失败结果
        fallback_results: List[MarketDataResult] = []
        for code in stock_codes:
            fallback_results.append(
                MarketDataResult(
                    stock_code=code,
                    success=False,
                    error_message=last_error
                    or f"批量接口重试 {self.max_retries} 次后仍然失败",
                )
            )
        return fallback_results

    def get_stock_history_data_with_retry(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> HistoryDataResult:
        """
        获取单个股票历史数据（带重试）

        Args:
            stock_code: 股票代码
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            HistoryDataResult对象
        """
        for attempt in range(self.max_retries):
            try:
                data = self.get_stock_history_data(stock_code, start_date, end_date)
                if data:
                    logger.info(f"[{self.provider_name}] 成功获取 {stock_code} 历史数据")
                    return HistoryDataResult(
                        stock_code=stock_code,
                        success=True,
                        data=data
                    )
                else:
                    logger.warning(f"[{self.provider_name}] {stock_code} 返回空历史数据 (尝试 {attempt + 1}/{self.max_retries})")
            except Exception as e:
                logger.error(f"[{self.provider_name}] 获取 {stock_code} 历史数据失败: {str(e)} (尝试 {attempt + 1}/{self.max_retries})")

            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay)

        return HistoryDataResult(
            stock_code=stock_code,
            success=False,
            error_message=f"重试 {self.max_retries} 次后仍然失败"
        )

    # ==================== 数据转换辅助方法 ====================

    def to_market_data_model(self, data: Dict[str, Any], stock_code: str) -> StockMarketData:
        """
        将原始数据转换为StockMarketData模型

        Args:
            data: 原始数据字典
            stock_code: 股票代码

        Returns:
            StockMarketData对象
        """
        return StockMarketData(
            stock_code=stock_code,
            last_price=data.get('last_price'),
            change_number=data.get('change_number'),
            change_rate=data.get('change_rate'),
            open_price=data.get('open_price'),
            pre_close=data.get('pre_close'),
            high_price=data.get('high_price'),
            low_price=data.get('low_price'),
            volume=data.get('volume'),
            turnover=data.get('turnover'),
            week52_high=data.get('week52_high'),
            week52_low=data.get('week52_low'),
            market_cap=data.get('market_cap'),
            pe_ratio=data.get('pe_ratio'),
            pb_ratio=data.get('pb_ratio'),
            quote_time=data.get('quote_time', datetime.now()),
            market_date=data.get('market_date', date.today()),
            data_source=data.get('data_source', self.provider_name),
            index_str=data.get('index_str')
        )

    def to_history_data_model(self, data: Dict[str, Any], stock_code: str) -> StockMarketHistory:
        """
        将原始数据转换为StockMarketHistory模型

        Args:
            data: 原始数据字典
            stock_code: 股票代码

        Returns:
            StockMarketHistory对象
        """
        return StockMarketHistory(
            stock_code=stock_code,
            trade_date=data.get('trade_date'),
            open_price=data.get('open_price'),
            high_price=data.get('high_price'),
            low_price=data.get('low_price'),
            close_price=data.get('close_price'),
            adj_close=data.get('adj_close'),
            volume=data.get('volume')
        )
