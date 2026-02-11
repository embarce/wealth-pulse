"""
股票数据服务
整合数据提供者和数据库操作的统一服务层
"""
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
import logging

from app.models.stock_info import StockInfo
from app.models.stock_market_data import StockMarketData
from app.models.stock_market_history import StockMarketHistory
from app.services.stock_data_provider_base import BaseStockDataProvider, MarketDataResult, HistoryDataResult
from app.services.stock_data_provider_factory import get_stock_data_provider

logger = logging.getLogger(__name__)


class StockService:
    """
    股票数据服务

    提供股票数据的查询和更新功能，整合数据提供者和数据库操作
    """

    def __init__(self, db: Session):
        """
        初始化服务

        Args:
            db: SQLAlchemy数据库会话
        """
        self.db = db
        self.provider: BaseStockDataProvider = get_stock_data_provider()
        logger.info(f"[StockService] 初始化完成，使用数据提供者: {self.provider.provider_name}")

    # ==================== 股票信息查询 ====================

    def get_all_stocks(self, skip: int = 0, limit: int = 100) -> List[StockInfo]:
        """
        获取所有股票列表

        Args:
            skip: 跳过的记录数
            limit: 返回的记录数

        Returns:
            股票信息列表
        """
        return self.db.query(StockInfo).offset(skip).limit(limit).all()

    def get_stock_by_code(self, stock_code: str) -> Optional[StockInfo]:
        """
        根据股票代码获取股票信息

        Args:
            stock_code: 股票代码

        Returns:
            股票信息对象，如果不存在返回None
        """
        return self.db.query(StockInfo).filter(StockInfo.stock_code == stock_code).first()

    def get_active_stocks(self) -> List[StockInfo]:
        """
        获取所有活跃的股票（stock_status = 1）

        Returns:
            活跃股票列表
        """
        return self.db.query(StockInfo).filter(StockInfo.stock_status == 1).all()

    # ==================== 市场数据查询 ====================

    def get_market_data(self, stock_code: str, market_date: date) -> Optional[StockMarketData]:
        """
        获取指定日期的市场数据

        Args:
            stock_code: 股票代码
            market_date: 市场日期

        Returns:
            市场数据对象，如果不存在返回None
        """
        return self.db.query(StockMarketData).filter(
            and_(
                StockMarketData.stock_code == stock_code,
                StockMarketData.market_date == market_date
            )
        ).first()

    def get_latest_market_data(self, stock_code: str) -> Optional[StockMarketData]:
        """
        获取最新的市场数据

        Args:
            stock_code: 股票代码

        Returns:
            最新市场数据对象，如果不存在返回None
        """
        return self.db.query(StockMarketData).filter(
            StockMarketData.stock_code == stock_code
        ).order_by(desc(StockMarketData.quote_time)).first()

    def get_all_latest_market_data(self) -> Dict[str, StockMarketData]:
        """
        获取所有股票的最新市场数据

        Returns:
            字典，key为stock_code，value为最新市场数据
        """
        # 子查询：获取每个股票的最新quote_time
        subquery = self.db.query(
            StockMarketData.stock_code,
            StockMarketData.quote_time
        ).distinct().order_by(
            StockMarketData.stock_code,
            desc(StockMarketData.quote_time)
        ).subquery()

        # 主查询：根据子查询获取完整数据
        market_data_list = self.db.query(StockMarketData).join(
            subquery,
            and_(
                StockMarketData.stock_code == subquery.c.stock_code,
                StockMarketData.quote_time == subquery.c.quote_time
            )
        ).all()

        return {data.stock_code: data for data in market_data_list}

    # ==================== 历史数据查询 ====================

    def get_historical_data(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100
    ) -> List[StockMarketHistory]:
        """
        获取历史数据

        Args:
            stock_code: 股票代码
            start_date: 开始日期
            end_date: 结束日期
            limit: 最大返回记录数

        Returns:
            历史数据列表
        """
        query = self.db.query(StockMarketHistory).filter(
            StockMarketHistory.stock_code == stock_code
        )

        if start_date:
            query = query.filter(StockMarketHistory.trade_date >= start_date)
        if end_date:
            query = query.filter(StockMarketHistory.trade_date <= end_date)

        return query.order_by(desc(StockMarketHistory.trade_date)).limit(limit).all()

    # ==================== 数据更新操作 ====================

    def update_market_data(self, stock_code: str, data: Dict[str, Any]) -> StockMarketData:
        """
        更新或创建市场数据

        Args:
            stock_code: 股票代码
            data: 市场数据字典

        Returns:
            更新或创建的市场数据对象
        """
        # 查找当天是否已有数据
        market_date = data.get('market_date', date.today())
        existing_data = self.get_market_data(stock_code, market_date)

        if existing_data:
            # 更新现有数据
            for key, value in data.items():
                if hasattr(existing_data, key):
                    setattr(existing_data, key, value)
            self.db.commit()
            self.db.refresh(existing_data)
            logger.info(f"[StockService] 更新市场数据: {stock_code} @ {market_date}")
            return existing_data
        else:
            # 创建新数据
            new_data = StockMarketData(**data)
            self.db.add(new_data)
            self.db.commit()
            self.db.refresh(new_data)
            logger.info(f"[StockService] 创建市场数据: {stock_code} @ {market_date}")
            return new_data

    def update_batch_market_data(self, results: List[MarketDataResult]) -> Dict[str, bool]:
        """
        批量更新市场数据

        Args:
            results: MarketDataResult对象列表

        Returns:
            字典，key为stock_code，value为是否成功
        """
        success_map = {}
        success_count = 0
        failed_count = 0

        for result in results:
            if result.success and result.data:
                try:
                    self.update_market_data(result.stock_code, result.data)
                    success_map[result.stock_code] = True
                    success_count += 1
                except Exception as e:
                    logger.error(f"[StockService] 更新 {result.stock_code} 失败: {str(e)}")
                    success_map[result.stock_code] = False
                    failed_count += 1
            else:
                success_map[result.stock_code] = False
                failed_count += 1

        logger.info(f"[StockService] 批量更新市场数据完成: 成功 {success_count}, 失败 {failed_count}")
        return success_map

    def update_history_data(self, stock_code: str, history_list: List[Dict[str, Any]]) -> int:
        """
        更新或创建历史数据

        Args:
            stock_code: 股票代码
            history_list: 历史数据字典列表

        Returns:
            插入或更新的记录数
        """
        count = 0
        for history_data in history_list:
            trade_date = history_data.get('trade_date')
            if not trade_date:
                continue

            # 查找是否已有该日期的数据
            existing = self.db.query(StockMarketHistory).filter(
                and_(
                    StockMarketHistory.stock_code == stock_code,
                    StockMarketHistory.trade_date == trade_date
                )
            ).first()

            if existing:
                # 更新现有数据
                for key, value in history_data.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
                count += 1
            else:
                # 创建新数据
                new_history = StockMarketHistory(stock_code=stock_code, **history_data)
                self.db.add(new_history)
                count += 1

        self.db.commit()
        logger.info(f"[StockService] 更新历史数据: {stock_code}, 共 {count} 条记录")
        return count

    # ==================== 数据刷新操作 ====================

    def refresh_stock_market_data(self, stock_code: str) -> Optional[StockMarketData]:
        """
        从数据提供者刷新单个股票的市场数据

        Args:
            stock_code: 股票代码

        Returns:
            更新后的市场数据对象，如果失败返回None
        """
        try:
            result = self.provider.get_stock_market_data_with_retry(stock_code)

            if result.success:
                return self.update_market_data(result.stock_code, result.data)
            else:
                logger.error(f"[StockService] 刷新 {stock_code} 失败: {result.error_message}")
                return None

        except Exception as e:
            logger.error(f"[StockService] 刷新 {stock_code} 市场数据异常: {str(e)}")
            return None

    def refresh_batch_market_data(self, stock_codes: List[str]) -> Dict[str, bool]:
        """
        批量刷新市场数据

        Args:
            stock_codes: 股票代码列表

        Returns:
            字典，key为stock_code，value为是否成功
        """
        logger.info(f"[StockService] 开始批量刷新 {len(stock_codes)} 只股票的市场数据")
        results = self.provider.get_batch_market_data_with_retry(stock_codes)
        return self.update_batch_market_data(results)

    def refresh_all_market_data(self) -> Dict[str, bool]:
        """
        刷新所有活跃股票的市场数据

        Returns:
            字典，key为stock_code，value为是否成功
        """
        active_stocks = self.get_active_stocks()
        stock_codes = [stock.stock_code for stock in active_stocks]

        logger.info(f"[StockService] 刷新所有活跃股票市场数据，共 {len(stock_codes)} 只")
        return self.refresh_batch_market_data(stock_codes)

    def refresh_stock_history_data(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Optional[int]:
        """
        从数据提供者刷新单个股票的历史数据

        Args:
            stock_code: 股票代码
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            更新的记录数，如果失败返回None
        """
        try:
            result = self.provider.get_stock_history_data_with_retry(stock_code, start_date, end_date)

            if result.success and result.data:
                return self.update_history_data(result.stock_code, result.data)
            else:
                logger.error(f"[StockService] 刷新 {stock_code} 历史数据失败: {result.error_message}")
                return None

        except Exception as e:
            logger.error(f"[StockService] 刷新 {stock_code} 历史数据异常: {str(e)}")
            return None

    def refresh_batch_history_data(
        self,
        stock_codes: List[str],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, int]:
        """
        批量刷新历史数据

        Args:
            stock_codes: 股票代码列表
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            字典，key为stock_code，value为更新的记录数（-1表示失败）
        """
        result_map = {}

        for stock_code in stock_codes:
            try:
                count = self.refresh_stock_history_data(stock_code, start_date, end_date)
                result_map[stock_code] = count if count is not None else -1
            except Exception as e:
                logger.error(f"[StockService] 批量刷新 {stock_code} 历史数据失败: {str(e)}")
                result_map[stock_code] = -1

        return result_map

    # ==================== 股票信息创建 ====================

    def create_stock(self, stock_data: Dict[str, Any]) -> StockInfo:
        """
        创建新的股票信息

        Args:
            stock_data: 股票数据字典

        Returns:
            创建的股票信息对象
        """
        new_stock = StockInfo(**stock_data)
        self.db.add(new_stock)
        self.db.commit()
        self.db.refresh(new_stock)
        logger.info(f"[StockService] 创建股票信息: {new_stock.stock_code}")
        return new_stock

    def get_or_create_stock(self, stock_data: Dict[str, Any]) -> StockInfo:
        """
        获取或创建股票信息

        Args:
            stock_data: 股票数据字典，必须包含 stock_code

        Returns:
            股票信息对象
        """
        stock_code = stock_data.get('stock_code')
        if not stock_code:
            raise ValueError("stock_data 必须包含 stock_code")

        stock = self.get_stock_by_code(stock_code)

        if stock:
            return stock
        else:
            return self.create_stock(stock_data)

    def update_stock(self, stock_code: str, stock_data: Dict[str, Any]) -> Optional[StockInfo]:
        """
        更新股票信息

        Args:
            stock_code: 股票代码
            stock_data: 要更新的数据字典

        Returns:
            更新后的股票信息对象，如果不存在返回None
        """
        stock = self.get_stock_by_code(stock_code)

        if stock:
            for key, value in stock_data.items():
                if hasattr(stock, key) and key != 'stock_code':
                    setattr(stock, key, value)

            self.db.commit()
            self.db.refresh(stock)
            logger.info(f"[StockService] 更新股票信息: {stock_code}")
            return stock
        else:
            logger.warning(f"[StockService] 股票 {stock_code} 不存在，无法更新")
            return None
