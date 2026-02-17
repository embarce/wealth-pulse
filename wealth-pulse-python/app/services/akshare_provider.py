"""
AkShare 数据提供者实现 - 专注港股市场
使用新浪财经接口获取港股实时和历史数据
"""
from typing import List, Dict, Optional, Any
from datetime import date, datetime, timedelta
import logging

import akshare as ak
import pandas as pd

from app.services.stock_data_provider_base import BaseStockDataProvider

logger = logging.getLogger(__name__)


class AkShareProvider(BaseStockDataProvider):
    """
    AkShare 数据提供者 - 港股专用

    专注于香港股票市场数据，使用新浪财经接口
    实时行情数据来源：新浪财经（15分钟延时）
    历史数据来源：新浪财经
    """

    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        super().__init__(max_retries, retry_delay)
        self.provider_name = "akshare"

    def _normalize_stock_code(self, stock_code: str) -> str:
        """
        标准化港股代码

        Args:
            stock_code: 股票代码（如: "00700", "0700.HK", "9988"）

        Returns:
            标准化后的5位港股代码（如: "00700"）
        """
        # 移除后缀和前缀
        code = stock_code.replace('.HK', '').replace('HK', '').strip()
        # 补齐到5位
        return code.zfill(5)

    def get_stock_market_data(self, stock_code: str) -> Optional[Dict[str, Any]]:
        """
        获取单个港股的实时行情数据

        Args:
            stock_code: 股票代码

        Returns:
            包含市场数据的字典，如果失败返回None
        """
        try:
            norm_code = self._normalize_stock_code(stock_code)

            # 获取所有港股实时行情（新浪接口）
            df = ak.stock_hk_spot()

            # 查找对应股票
            matching_rows = df[
                df['代码'].astype(str).str.zfill(5) == norm_code
            ]

            if matching_rows.empty:
                logger.warning(f"[akshare] 港股 {stock_code} (标准化: {norm_code}) 未找到数据")
                return None

            row = matching_rows.iloc[0]
            return self._parse_spot_row(row, stock_code)

        except Exception as e:
            logger.error(f"[akshare] 获取 {stock_code} 数据失败: {str(e)}")
            raise

    def _parse_spot_row(self, row: pd.Series, original_code: str) -> Dict[str, Any]:
        """
        解析新浪实时行情数据行

        Args:
            row: 数据行
            original_code: 原始股票代码

        Returns:
            标准化的市场数据字典
        """
        last_price = self._safe_float(row.get('最新价'))
        pre_close = self._safe_float(row.get('昨收'))

        change_number = None
        change_rate = None
        if last_price is not None and pre_close is not None and pre_close != 0:
            change_number = last_price - pre_close
            change_rate = (change_number / pre_close) * 100

        return {
            'stock_code': original_code,
            'last_price': last_price,
            'change_number': change_number,
            'change_rate': change_rate,
            'open_price': self._safe_float(row.get('今开')),
            'pre_close': pre_close,
            'high_price': self._safe_float(row.get('最高')),
            'low_price': self._safe_float(row.get('最低')),
            'volume': self._safe_int(row.get('成交量')),
            'turnover': self._safe_float(row.get('成交额')),
            'week52_high': None,
            'week52_low': None,
            'market_cap': None,
            'pe_ratio': None,
            'pb_ratio': None,
            'quote_time': datetime.now(),
            'market_date': date.today(),
            'data_source': self.provider_name,
            'index_str': {
                'market': 'HK',
                'name_cn': row.get('中文名称'),
                'name_en': row.get('英文名称'),
                'trade_type': row.get('交易类型'),
                'bid1': self._safe_float(row.get('买一')),
                'ask1': self._safe_float(row.get('卖一')),
            }
        }

    def get_batch_market_data(self, stock_codes: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        批量获取港股的实时行情数据

        新浪接口一次性返回所有港股数据，因此批量获取非常高效

        Args:
            stock_codes: 股票代码列表

        Returns:
            字典，key为stock_code，value为对应的市场数据
        """
        result = {}

        try:
            # 一次性获取所有港股数据
            df = ak.stock_hk_spot()

            logger.info(f"[akshare] 获取 {len(stock_codes)} 个港股数据")

            # 标准化所有查询的代码
            normalized_codes = {}
            for code in stock_codes:
                norm_code = self._normalize_stock_code(code)
                normalized_codes[norm_code] = code

            # 查找每个股票的数据
            for norm_code, original_code in normalized_codes.items():
                matching_rows = df[
                    df['代码'].astype(str).str.zfill(5) == norm_code
                ]

                if not matching_rows.empty:
                    try:
                        data = self._parse_spot_row(matching_rows.iloc[0], original_code)
                        result[original_code] = data
                    except Exception as e:
                        logger.error(f"[akshare] 解析 {original_code} 数据失败: {str(e)}")
                        result[original_code] = None
                else:
                    logger.warning(f"[akshare] 港股 {original_code} 未找到")
                    result[original_code] = None

            return result

        except Exception as e:
            logger.error(f"[akshare] 批量获取港股数据失败: {str(e)}")
            # 如果整体失败，返回None
            for code in stock_codes:
                result[code] = None
            return result

    def get_stock_history_data(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取单个港股的历史行情数据

        Args:
            stock_code: 股票代码
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            历史数据列表，如果失败返回None
        """
        try:
            norm_code = self._normalize_stock_code(stock_code)

            # 设置默认日期范围（最近3个月）
            if not start_date:
                start_date = date.today() - timedelta(days=90)
            if not end_date:
                end_date = date.today()

            # 使用新浪接口获取历史数据
            # 注意：新浪历史数据接口可能需要尝试不同的方法
            df = ak.stock_hk_hist(
                symbol=norm_code,
                period="daily",
                start_date=start_date.strftime('%Y%m%d'),
                end_date=end_date.strftime('%Y%m%d'),
                adjust="qfq"  # 前复权
            )

            if df.empty:
                logger.warning(f"[akshare] 港股 {stock_code} 没有历史数据")
                return None

            history_data = []
            for _, row in df.iterrows():
                history_data.append({
                    'trade_date': pd.to_datetime(row['日期']).date(),
                    'open_price': self._safe_float(row.get('开盘')),
                    'high_price': self._safe_float(row.get('最高')),
                    'low_price': self._safe_float(row.get('最低')),
                    'close_price': self._safe_float(row.get('收盘')),
                    'adj_close': None,  # 新浪数据已复权
                    'volume': self._safe_int(row.get('成交量')),
                })

            logger.info(f"[akshare] 获取 {stock_code} 历史数据成功，共 {len(history_data)} 条记录")
            return history_data

        except Exception as e:
            logger.error(f"[akshare] 获取 {stock_code} 历史数据失败: {str(e)}")
            raise

    def get_batch_history_data(
        self,
        stock_codes: List[str],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Optional[List[Dict[str, Any]]]]:
        """
        批量获取港股的历史行情数据

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
                logger.error(f"[akshare] 批量获取 {stock_code} 历史数据失败: {str(e)}")
                result[stock_code] = None

        return result

    # ==================== 辅助方法 ====================

    @staticmethod
    def _safe_float(value) -> Optional[float]:
        """
        安全地转换为浮点数

        Args:
            value: 输入值

        Returns:
            浮点数或None
        """
        if pd.isna(value) or value == '-' or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _safe_int(value) -> Optional[int]:
        """
        安全地转换为整数

        Args:
            value: 输入值

        Returns:
            整数或None
        """
        if pd.isna(value) or value == '-' or value == '':
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def get_stock_minute_history(
        self,
        stock_code: str,
        period: str = '1',
        adjust: str = '',
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取港股分钟级历史数据

        Args:
            stock_code: 股票代码（如: "00700", "0700.HK"）
            period: 周期类型（'1'=1分钟, '5'=5分钟, '15'=15分钟, '30'=30分钟, '60'=60分钟）
            adjust: 复权类型（''=不复权, 'hfq'=后复权）
            start_date: 开始时间
            end_date: 结束时间

        Returns:
            分钟级历史数据列表，如果失败返回None
        """
        try:
            norm_code = self._normalize_stock_code(stock_code)

            # 设置默认时间范围（最近1个交易日）
            if not end_date:
                end_date = datetime.now()
            if not start_date:
                start_date = end_date - timedelta(days=1)

            # 格式化时间参数
            start_date_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
            end_date_str = end_date.strftime('%Y-%m-%d %H:%M:%S')

            logger.info(f"[akshare] 获取 {stock_code} 分钟级数据: period={period}, adjust={adjust}, "
                       f"start={start_date_str}, end={end_date_str}")

            # 调用 AkShare 接口
            df = ak.stock_hk_hist_min_em(
                symbol=norm_code,
                period=period,
                adjust=adjust,
                start_date=start_date_str,
                end_date=end_date_str
            )

            if df.empty:
                logger.warning(f"[akshare] 港股 {stock_code} 没有分钟级数据")
                return None

            history_data = []
            for _, row in df.iterrows():
                # 基础字段（所有周期都有）
                data_item = {
                    'trade_time': pd.to_datetime(row['时间']),
                    'stock_code': stock_code,
                    'period': period,
                    'open_price': self._safe_float(row.get('开盘')),
                    'close_price': self._safe_float(row.get('收盘')),
                    'high_price': self._safe_float(row.get('最高')),
                    'low_price': self._safe_float(row.get('最低')),
                    'volume': self._safe_float(row.get('成交量')),
                    'turnover': self._safe_float(row.get('成交额')),
                }

                # 1分钟数据特有字段
                if period == '1':
                    data_item['latest_price'] = self._safe_float(row.get('最新价'))

                # 其他周期字段（5, 15, 30, 60分钟）
                else:
                    data_item['change_rate'] = self._safe_float(row.get('涨跌幅'))
                    data_item['change_number'] = self._safe_float(row.get('涨跌额'))
                    data_item['amplitude'] = self._safe_float(row.get('振幅'))
                    data_item['turnover_rate'] = self._safe_float(row.get('换手率'))

                history_data.append(data_item)

            logger.info(f"[akshare] 获取 {stock_code} 分钟级数据成功，共 {len(history_data)} 条记录")
            return history_data

        except Exception as e:
            logger.error(f"[akshare] 获取 {stock_code} 分钟级数据失败: {str(e)}")
            raise

    def get_stock_daily_history_enhanced(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        period: str = 'daily',
        adjust: str = ''
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取港股增强型历史数据（包含振幅、涨跌幅、换手率等）

        Args:
            stock_code: 股票代码（如: "00700", "0700.HK"）
            start_date: 开始日期
            end_date: 结束日期
            period: 周期类型 ('daily'=日线, 'weekly'=周线, 'monthly'=月线)
            adjust: 复权类型（''=不复权, 'qfq'=前复权, 'hfq'=后复权）

        Returns:
            增强型历史数据列表，如果失败返回None
        """
        try:
            norm_code = self._normalize_stock_code(stock_code)

            # 设置默认日期范围（最近1年）
            if not start_date:
                start_date = date.today() - timedelta(days=365)
            if not end_date:
                end_date = date.today()

            # 格式化日期参数（YYYYMMDD格式）
            start_date_str = start_date.strftime('%Y%m%d')
            end_date_str = end_date.strftime('%Y%m%d')

            logger.info(f"[akshare] 获取 {stock_code} 增强型{period}数据: adjust={adjust}, "
                       f"start={start_date_str}, end={end_date_str}")

            # 调用 AkShare 接口
            df = ak.stock_hk_hist(
                symbol=norm_code,
                period=period,
                start_date=start_date_str,
                end_date=end_date_str,
                adjust=adjust
            )

            if df.empty:
                logger.warning(f"[akshare] 港股 {stock_code} 没有增强型{period}数据")
                return None

            history_data = []
            for _, row in df.iterrows():
                history_data.append({
                    'stock_code': stock_code,
                    'period': period,
                    'trade_date': pd.to_datetime(row['日期']).date(),
                    'open_price': self._safe_float(row.get('开盘')),
                    'close_price': self._safe_float(row.get('收盘')),
                    'high_price': self._safe_float(row.get('最高')),
                    'low_price': self._safe_float(row.get('最低')),
                    'volume': self._safe_int(row.get('成交量')),
                    'turnover': self._safe_float(row.get('成交额')),
                    'amplitude': self._safe_float(row.get('振幅')),
                    'change_rate': self._safe_float(row.get('涨跌幅')),
                    'change_number': self._safe_float(row.get('涨跌额')),
                    'turnover_rate': self._safe_float(row.get('换手率')),
                })

            logger.info(f"[akshare] 获取 {stock_code} 增强型{period}数据成功，共 {len(history_data)} 条记录")
            return history_data

        except Exception as e:
            logger.error(f"[akshare] 获取 {stock_code} 增强型{period}数据失败: {str(e)}")
            raise
