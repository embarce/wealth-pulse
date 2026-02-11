"""
yfinance 数据提供者实现
使用 Yahoo Finance API 获取股票数据
"""
from typing import List, Dict, Optional, Any
from datetime import date, datetime, timedelta
import logging

import yfinance as yf

from app.services.stock_data_provider_base import BaseStockDataProvider

logger = logging.getLogger(__name__)


class YFinanceProvider(BaseStockDataProvider):
    """
    Yahoo Finance 数据提供者

    支持全球股票、港股、美股等市场数据
    """

    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        super().__init__(max_retries, retry_delay)
        self.provider_name = "yfinance"

    def get_stock_market_data(self, stock_code: str) -> Optional[Dict[str, Any]]:
        """
        获取单个股票的实时行情数据

        Args:
            stock_code: 股票代码 (如: "NVDA", "0700.HK")

        Returns:
            包含市场数据的字典
        """
        try:
            ticker = yf.Ticker(stock_code)

            # 使用 fast_info 获取快速实时数据
            fast_info = ticker.fast_info

            # 使用 info 获取详细数据
            info = ticker.info

            # 获取最新价格
            last_price = fast_info.last_price if hasattr(fast_info, 'last_price') else None

            # 获取前收盘价
            pre_close = info.get('previousClose') if info else None

            # 计算涨跌额和涨跌幅
            change_number = None
            change_rate = None
            if last_price and pre_close:
                change_number = last_price - pre_close
                change_rate = (change_number / pre_close) * 100 if pre_close != 0 else None

            # 构建返回数据
            data = {
                'last_price': last_price,
                'change_number': change_number,
                'change_rate': change_rate,
                'open_price': fast_info.open if hasattr(fast_info, 'open') else None,
                'pre_close': pre_close,
                'high_price': fast_info.day_high if hasattr(fast_info, 'day_high') else None,
                'low_price': fast_info.day_low if hasattr(fast_info, 'day_low') else None,
                'volume': fast_info.last_volume if hasattr(fast_info, 'last_volume') else None,
                'turnover': None,  # yfinance fast_info 不直接提供成交额
                'week52_high': info.get('fiftyTwoWeekHigh') if info else None,
                'week52_low': info.get('fiftyTwoWeekLow') if info else None,
                'market_cap': fast_info.market_cap if hasattr(fast_info, 'market_cap') else None,
                'pe_ratio': info.get('trailingPE') if info else None,
                'pb_ratio': info.get('priceToBook') if info else None,
                'quote_time': datetime.now(),
                'market_date': date.today(),
                'data_source': self.provider_name,
                'index_str': {
                    'currency': info.get('currency') if info else None,
                    'exchange': info.get('exchange') if info else None,
                }
            }

            return data

        except Exception as e:
            logger.error(f"[yfinance] 获取 {stock_code} 数据失败: {str(e)}")
            raise

    def get_batch_market_data(self, stock_codes: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        批量获取股票的实时行情数据

        Args:
            stock_codes: 股票代码列表

        Returns:
            字典，key为stock_code，value为对应的市场数据
        """
        result = {}

        # yfinance 可以使用多线程优化，这里先使用简单循环
        for stock_code in stock_codes:
            try:
                data = self.get_stock_market_data(stock_code)
                result[stock_code] = data
            except Exception as e:
                logger.error(f"[yfinance] 批量获取 {stock_code} 失败: {str(e)}")
                result[stock_code] = None

        return result

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
            历史数据列表
        """
        try:
            ticker = yf.Ticker(stock_code)

            # 设置默认日期范围（最近30天）
            if not start_date:
                start_date = date.today() - timedelta(days=30)
            if not end_date:
                end_date = date.today()

            # 获取历史数据
            df = ticker.history(start=start_date, end=end_date)

            if df.empty:
                logger.warning(f"[yfinance] {stock_code} 没有历史数据")
                return None

            # 转换为字典列表
            history_data = []
            for trade_date, row in df.iterrows():
                history_data.append({
                    'trade_date': trade_date.date(),
                    'open_price': float(row['Open']) if row['Open'] else None,
                    'high_price': float(row['High']) if row['High'] else None,
                    'low_price': float(row['Low']) if row['Low'] else None,
                    'close_price': float(row['Close']) if row['Close'] else None,
                    'adj_close': float(row['Adj Close']) if 'Adj Close' in df.columns and row['Adj Close'] else None,
                    'volume': int(row['Volume']) if row['Volume'] else None,
                })

            return history_data

        except Exception as e:
            logger.error(f"[yfinance] 获取 {stock_code} 历史数据失败: {str(e)}")
            raise

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
            字典，key为stock_code，value为对应的历史数据列表
        """
        result = {}

        for stock_code in stock_codes:
            try:
                data = self.get_stock_history_data(stock_code, start_date, end_date)
                result[stock_code] = data
            except Exception as e:
                logger.error(f"[yfinance] 批量获取 {stock_code} 历史数据失败: {str(e)}")
                result[stock_code] = None

        return result
