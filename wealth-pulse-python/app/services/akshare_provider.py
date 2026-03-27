"""
AkShare 数据提供者实现 - 专注港股市场和指数数据
使用新浪财经/东方财富接口获取港股和指数实时和历史数据
"""
import logging
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Any

import akshare as ak
import pandas as pd

from app.services.stock_data_provider_base import BaseStockDataProvider

logger = logging.getLogger(__name__)


class AkShareProvider(BaseStockDataProvider):
    """
    AkShare 数据提供者 - 港股专用

    专注于香港股票市场数据，使用新浪财经接口
    实时行情数据来源：新浪财经（15 分钟延时）
    历史数据来源：东方财富网/新浪财经（容错切换）
    财务指标数据来源：东方财富网
    指数数据来源：东方财富网/新浪财经（容错切换）
    """

    # 财务指标字段映射：中文字段名 -> 英文字段名
    FINANCIAL_FIELD_MAPPING = {
        '基本每股收益 (元)': 'eps_basic',
        '每股净资产 (元)': 'net_assets_per_share',
        '法定股本 (股)': 'authorized_capital',
        '每手股': 'lot_size',
        '每股股息 TTM(港元)': 'dividend_per_share_ttm',
        '派息比率 (%)': 'payout_ratio',
        '已发行股本 (股)': 'issued_shares',
        '已发行股本-H 股 (股)': 'issued_shares_h_share',
        '每股经营现金流 (元)': 'operating_cash_flow_per_share',
        '股息率 TTM(%)': 'dividend_yield_ttm',
        '总市值 (港元)': 'market_cap_total',
        '港股市值 (港元)': 'market_cap_hk',
        '营业总收入': 'total_revenue',
        '营业总收入滚动环比增长 (%)': 'revenue_growth_qoq',
        '销售净利率 (%)': 'net_profit_margin',
        '净利润': 'net_profit',
        '净利润滚动环比增长 (%)': 'net_profit_growth_qoq',
        '股东权益回报率 (%)': 'roe',
        '市盈率': 'pe_ratio',
        '市净率': 'pb_ratio',
        '总资产回报率 (%)': 'roa'
    }

    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        super().__init__(max_retries, retry_delay)
        self.provider_name = "akshare"
        # 历史数据源容错计数器
        self._hist_source_failures = {}  # {stock_code: failure_count}
        # 指数数据源容错计数器
        self._index_source_failures = {}  # {index_code: failure_count}

    def _normalize_stock_code(self, stock_code: str) -> str:
        """
        标准化港股代码

        Args:
            stock_code: 股票代码（如："00700", "0700.HK", "9988"）

        Returns:
            标准化后的 5 位港股代码（如："00700"）
        """
        # 移除后缀和前缀
        code = stock_code.replace('.HK', '').replace('HK', '').strip()
        # 补齐到 5 位
        return code.zfill(5)

    def get_stock_market_data(self, stock_code: str) -> Optional[Dict[str, Any]]:
        """
        获取单个港股的实时行情数据

        Args:
            stock_code: 股票代码

        Returns:
            包含市场数据的字典，如果失败返回 None
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
                logger.warning(f"[akshare] 港股 {stock_code} (标准化：{norm_code}) 未找到数据")
                return None

            row = matching_rows.iloc[0]
            return self._parse_spot_row(row, stock_code)

        except Exception as e:
            logger.error(f"[akshare] 获取 {stock_code} 数据失败：{str(e)}")
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
            字典，key 为 stock_code，value 为对应的市场数据
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
                        logger.error(f"[akshare] 解析 {original_code} 数据失败：{str(e)}")
                        result[original_code] = None
                else:
                    logger.warning(f"[akshare] 港股 {original_code} 未找到")
                    result[original_code] = None

            return result

        except Exception as e:
            logger.error(f"[akshare] 批量获取港股数据失败：{str(e)}")
            # 如果整体失败，返回 None
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
            历史数据列表，如果失败返回 None
        """
        try:
            norm_code = self._normalize_stock_code(stock_code)

            # 设置默认日期范围（最近 3 个月）
            if not start_date:
                start_date = date.today() - timedelta(days=90)
            if not end_date:
                end_date = date.today()

            # 使用新浪接口获取历史数据
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
            logger.error(f"[akshare] 获取 {stock_code} 历史数据失败：{str(e)}")
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
            字典，key 为 stock_code，value 为对应的历史数据列表
        """
        result = {}

        for stock_code in stock_codes:
            try:
                data = self.get_stock_history_data(stock_code, start_date, end_date)
                result[stock_code] = data
            except Exception as e:
                logger.error(f"[akshare] 批量获取 {stock_code} 历史数据失败：{str(e)}")
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
            浮点数或 None
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
            整数或 None
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
        """
        try:
            norm_code = self._normalize_stock_code(stock_code)

            if not end_date:
                end_date = datetime.now()
            if not start_date:
                start_date = end_date - timedelta(days=1)

            start_date_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
            end_date_str = end_date.strftime('%Y-%m-%d %H:%M:%S')

            logger.info(f"[akshare] 获取 {stock_code} 分钟级数据：period={period}, adjust={adjust}, "
                       f"start={start_date_str}, end={end_date_str}")

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

                if period == '1':
                    data_item['latest_price'] = self._safe_float(row.get('最新价'))
                else:
                    data_item['change_rate'] = self._safe_float(row.get('涨跌幅'))
                    data_item['change_number'] = self._safe_float(row.get('涨跌额'))
                    data_item['amplitude'] = self._safe_float(row.get('振幅'))
                    data_item['turnover_rate'] = self._safe_float(row.get('换手率'))

                history_data.append(data_item)

            logger.info(f"[akshare] 获取 {stock_code} 分钟级数据成功，共 {len(history_data)} 条记录")
            return history_data

        except Exception as e:
            logger.error(f"[akshare] 获取 {stock_code} 分钟级数据失败：{str(e)}")
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

        支持数据源容错：
        1. 优先使用东方财富网接口（ak.stock_hk_hist）
        2. 失败两次后自动切换到新浪源（ak.stock_hk_daily）
        """
        norm_code = self._normalize_stock_code(stock_code)
        failure_key = f"{stock_code}_{period}"

        if not start_date:
            start_date = date.today() - timedelta(days=365)
        if not end_date:
            end_date = date.today()

        failure_count = self._hist_source_failures.get(failure_key, 0)

        if failure_count < 2:
            try:
                return self._get_hist_from_eastmoney(
                    stock_code, norm_code, start_date, end_date, period, adjust
                )
            except Exception as e:
                self._hist_source_failures[failure_key] = failure_count + 1
                logger.warning(f"[akshare] 东方财富网接口失败 (第{failure_count + 1}次): {str(e)}")

        try:
            logger.info(f"[akshare] 切换到新浪源获取 {stock_code} 数据")
            data = self._get_hist_from_sina(
                stock_code, norm_code, start_date, end_date, adjust
            )
            if failure_key in self._hist_source_failures:
                del self._hist_source_failures[failure_key]
            return data
        except Exception as e:
            logger.error(f"[akshare] 新浪源接口也失败：{str(e)}")
            self._hist_source_failures[failure_key] = self._hist_source_failures.get(failure_key, 0) + 1
            raise

    def _get_hist_from_eastmoney(
        self,
        stock_code: str,
        norm_code: str,
        start_date: date,
        end_date: date,
        period: str,
        adjust: str
    ) -> List[Dict[str, Any]]:
        """从东方财富网获取历史数据"""
        start_date_str = start_date.strftime('%Y%m%d')
        end_date_str = end_date.strftime('%Y%m%d')

        logger.info(f"[akshare-东方财富] 获取 {stock_code} 增强型{period}数据：adjust={adjust}, "
                   f"start={start_date_str}, end={end_date_str}")

        df = ak.stock_hk_hist(
            symbol=norm_code,
            period=period,
            start_date=start_date_str,
            end_date=end_date_str,
            adjust=adjust
        )

        if df.empty:
            logger.warning(f"[akshare-东方财富] 港股 {stock_code} 没有增强型{period}数据")
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

        logger.info(f"[akshare-东方财富] 获取 {stock_code} 增强型{period}数据成功，共 {len(history_data)} 条记录")
        return history_data

    def _get_hist_from_sina(
        self,
        stock_code: str,
        norm_code: str,
        start_date: date,
        end_date: date,
        adjust: str
    ) -> List[Dict[str, Any]]:
        """从新浪财经获取历史数据（备用数据源）"""
        logger.info(f"[akshare-新浪] 获取 {stock_code} 增强型日 K 数据：adjust={adjust}, "
                   f"start={start_date}, end={end_date}")

        sina_adjust = 'hfq' if adjust in ['hfq', 'qfq'] else ''

        df = ak.stock_hk_daily(
            symbol=norm_code,
            adjust=sina_adjust
        )

        if df.empty:
            logger.warning(f"[akshare-新浪] 港股 {stock_code} 没有历史数据")
            return None

        df['date'] = pd.to_datetime(df['date'])
        df = df[(df['date'] >= pd.Timestamp(start_date)) &
                (df['date'] <= pd.Timestamp(end_date))]

        if df.empty:
            logger.warning(f"[akshare-新浪] 港股 {stock_code} 在指定日期范围内没有数据")
            return None

        history_data = []
        for _, row in df.iterrows():
            close = self._safe_float(row.get('close'))
            open_price = self._safe_float(row.get('open'))
            high = self._safe_float(row.get('high'))
            low = self._safe_float(row.get('low'))

            change_rate = None
            change_number = None

            history_data.append({
                'stock_code': stock_code,
                'period': 'daily',
                'trade_date': row['date'].date(),
                'open_price': open_price,
                'close_price': close,
                'high_price': high,
                'low_price': low,
                'volume': self._safe_int(row.get('volume')),
                'turnover': None,
                'amplitude': None,
                'change_rate': change_rate,
                'change_number': change_number,
                'turnover_rate': None,
            })

        for i in range(1, len(history_data)):
            prev_close = history_data[i - 1]['close_price']
            curr_close = history_data[i]['close_price']
            if prev_close and curr_close and prev_close != 0:
                history_data[i]['change_number'] = curr_close - prev_close
                history_data[i]['change_rate'] = ((curr_close - prev_close) / prev_close) * 100

            high = history_data[i]['high_price']
            low = history_data[i]['low_price']
            if prev_close and high and low and prev_close != 0:
                history_data[i]['amplitude'] = ((high - low) / prev_close) * 100

        logger.info(f"[akshare-新浪] 获取 {stock_code} 增强型日 K 数据成功，共 {len(history_data)} 条记录")
        return history_data

    # ==================== 财务指标相关方法 ====================

    def _parse_financial_number(self, value) -> Optional[float]:
        """解析财务数字值"""
        if value is None or pd.isna(value) or value == '':
            return None

        try:
            if isinstance(value, (int, float)):
                return float(value)

            if isinstance(value, str):
                cleaned = value.replace(',', '').replace('%', '').strip()
                return float(cleaned)

        except (ValueError, TypeError):
            pass

        return None

    def get_stock_financial_indicator(self, stock_code: str) -> Dict[str, Optional[str]]:
        """获取港股财务指标数据"""
        try:
            norm_code = self._normalize_stock_code(stock_code)

            logger.info(f"[akshare] Fetching financial indicators for {stock_code} (code: {norm_code})")

            df = ak.stock_hk_financial_indicator_em(symbol=norm_code)

            if df is None or df.empty:
                logger.warning(f"[akshare] No financial indicator data found for {stock_code}")
                return {}

            if len(df) > 0:
                row = df.iloc[0]

                result = {
                    'stock_code': stock_code,
                    'datasource': 'AkShare(东方财富)',
                    'data_type': '数据已经完成复权处理'
                }

                for chinese_field, value in row.items():
                    english_field = self.FINANCIAL_FIELD_MAPPING.get(chinese_field)

                    if english_field:
                        if english_field in ['roe', 'net_profit_margin', 'payout_ratio',
                                            'dividend_yield_ttm', 'revenue_growth_qoq',
                                            'net_profit_growth_qoq', 'roa']:
                            result[english_field] = self._parse_financial_number(value)
                        else:
                            result[english_field] = self._parse_financial_number(value)

                        if result[english_field] is None and value is not None:
                            result[english_field] = str(value)

                result['_raw_fields'] = {}
                for chinese_field, value in row.items():
                    if pd.notna(value):
                        result['_raw_fields'][chinese_field] = str(value)

                logger.info(f"[akshare] Successfully fetched {len(result) - 3} financial indicators for {stock_code}")

                return result
            else:
                logger.warning(f"[akshare] Empty financial indicator data for {stock_code}")
                return {}

        except Exception as e:
            logger.error(f"[akshare] Error fetching financial indicators for {stock_code}: {str(e)}")
            raise Exception(f"获取 AkShare 财务指标失败：{str(e)}")

    def get_stock_financial_indicator_sync(self, stock_code: str) -> Dict[str, Optional[str]]:
        """同步方式获取财务指标"""
        return self.get_stock_financial_indicator(stock_code)

    def get_batch_financial_indicators(
        self,
        stock_codes: List[str]
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """批量获取港股的财务指标数据"""
        result = {}

        for stock_code in stock_codes:
            try:
                data = self.get_stock_financial_indicator(stock_code)
                result[stock_code] = data
            except Exception as e:
                logger.error(f"[akshare] 批量获取 {stock_code} 财务指标失败：{str(e)}")
                result[stock_code] = None

        return result

    # ==================== 港股指数数据相关方法 ====================

    def get_all_hk_indices(self) -> List[Dict[str, Any]]:
        """
        获取全量港股指数列表（实时行情）

        多数据源策略：
        1. 优先使用东方财富网 (stock_hk_index_spot_em)
        2. 失败时自动切换到新浪财经 (stock_hk_index_spot_sina)

        Returns:
            港股指数列表，每个元素包含指数代码、名称、行情数据等
        """
        try:
            logger.info("[akshare] 获取全量港股指数列表（优先东方财富网）")
            # 尝试东方财富源
            df = ak.stock_hk_index_spot_em()

            if df is None or df.empty:
                logger.warning("[akshare] 东方财富网港股指数数据为空，切换到新浪财经源")
                return self._get_all_hk_indices_sina()

            logger.info(f"[akshare] 获取到 {len(df)} 个港股指数（东方财富网）")

            indices = []
            for _, row in df.iterrows():
                index_code = str(row.get('代码', ''))
                if not index_code:
                    continue

                try:
                    index_data = self._parse_index_spot_row(row, index_code)
                    indices.append(index_data)
                except Exception as e:
                    logger.warning(f"[akshare] 解析指数 {index_code} 失败：{str(e)}")
                    continue

            logger.info(f"[akshare] 成功解析 {len(indices)} 个港股指数（东方财富网）")
            return indices

        except Exception as e:
            logger.warning(f"[akshare] 东方财富网源失败：{str(e)}, 切换到新浪财经源")
            return self._get_all_hk_indices_sina()

    def _get_all_hk_indices_sina(self) -> List[Dict[str, Any]]:
        """
        从新浪财经获取全量港股指数列表（备用源）

        Returns:
            港股指数列表
        """
        try:
            logger.info("[akshare-新浪] 获取全量港股指数列表")

            df = ak.stock_hk_index_spot_sina()

            if df is None or df.empty:
                logger.warning("[akshare-新浪] 港股指数数据为空")
                return []

            logger.info(f"[akshare-新浪] 获取到 {len(df)} 个港股指数")

            indices = []
            for _, row in df.iterrows():
                index_code = str(row.get('代码', ''))
                if not index_code:
                    continue

                try:
                    index_data = self._parse_index_spot_row(row, index_code)
                    indices.append(index_data)
                except Exception as e:
                    logger.warning(f"[akshare-新浪] 解析指数 {index_code} 失败：{str(e)}")
                    continue

            logger.info(f"[akshare-新浪] 成功解析 {len(indices)} 个港股指数")
            return indices

        except Exception as e:
            logger.error(f"[akshare-新浪] 获取全量港股指数失败：{str(e)}")
            return []

    def get_index_spot_data(self, index_code: str) -> Optional[Dict[str, Any]]:
        """
        获取港股指数实时行情数据

        Args:
            index_code: 指数代码 (如：HSI, HSTECH, CESHKM 等)

        Returns:
            包含指数市场数据的字典，如果失败返回 None
        """
        return self._get_hk_index_spot(index_code)

    def _get_hk_index_spot(self, index_code: str) -> Optional[Dict[str, Any]]:
        """
        获取港股指数实时行情（带容错机制）

        容错策略：
        1. 优先使用东方财富网 (stock_hk_index_spot_em)
        2. 失败时自动切换到新浪财经 (stock_hk_index_spot_sina)
        3. 支持代码、名称、5 位标准化代码多种匹配方式

        Args:
            index_code: 指数代码

        Returns:
            指数行情数据，失败返回 None
        """
        # 尝试东方财富源
        try:
            df = ak.stock_hk_index_spot_em()
            if df is not None and not df.empty:
                logger.info(f"[akshare-东方财富] 港股指数数据获取成功，共 {len(df)} 条记录")

                # 多种匹配策略
                for match_strategy in ['code_exact', 'code_zfill', 'name']:
                    if match_strategy == 'code_exact':
                        matching_rows = df[df['代码'].astype(str) == index_code]
                    elif match_strategy == 'code_zfill':
                        matching_rows = df[df['代码'].astype(str).str.zfill(5) == index_code.zfill(5)]
                    else:  # name
                        matching_rows = df[df['名称'].astype(str) == index_code]

                    if not matching_rows.empty:
                        row = matching_rows.iloc[0]
                        logger.info(f"[akshare-东方财富] 通过 {match_strategy} 策略匹配到指数 {index_code}")
                        return self._parse_index_spot_row(row, index_code)

                logger.warning(f"[akshare-东方财富] 港股指数 {index_code} 未找到（尝试所有匹配策略）")
            else:
                logger.warning("[akshare-东方财富] 港股指数数据为空")

        except Exception as e:
            logger.warning(f"[akshare-东方财富] 获取指数 {index_code} 失败：{str(e)}, 切换到新浪源")

        # 切换到新浪备用源
        logger.info(f"[akshare-新浪] 获取港股指数 {index_code}")
        return self._get_hk_index_spot_sina(index_code)

    def _get_hk_index_spot_sina(self, index_code: str) -> Optional[Dict[str, Any]]:
        """
        从新浪财经获取港股指数行情（备用源）

        Args:
            index_code: 指数代码

        Returns:
            指数行情数据
        """
        try:
            # 新浪港股指数接口
            df = ak.stock_hk_index_spot_sina()
            if df is None or df.empty:
                logger.warning("[akshare-新浪] 港股指数数据为空")
                return None

            # 尝试匹配
            for match_strategy in ['code_exact', 'code_zfill', 'name']:
                if match_strategy == 'code_exact':
                    if '代码' in df.columns:
                        matching_rows = df[df['代码'].astype(str) == index_code]
                    else:
                        continue
                elif match_strategy == 'code_zfill':
                    if '代码' in df.columns:
                        matching_rows = df[df['代码'].astype(str).str.zfill(5) == index_code.zfill(5)]
                    else:
                        continue
                else:  # name
                    if '名称' in df.columns:
                        matching_rows = df[df['名称'].astype(str) == index_code]
                    elif 'name' in df.columns:
                        matching_rows = df[df['name'].astype(str) == index_code]
                    else:
                        continue

                if not matching_rows.empty:
                    logger.info(f"[akshare-新浪] 通过 {match_strategy} 策略匹配到指数 {index_code}")
                    return self._parse_index_spot_row(matching_rows.iloc[0], index_code)

            logger.warning(f"[akshare-新浪] 港股指数 {index_code} 未找到")
            return None

        except Exception as e:
            logger.error(f"[akshare-新浪] 获取港股指数 {index_code} 失败：{str(e)}")
            return None

    def _parse_index_spot_row(self, row: pd.Series, index_code: str) -> Dict[str, Any]:
        """
        解析指数实时行情数据行

        Args:
            row: 数据行
            index_code: 指数代码

        Returns:
            标准化的指数市场数据字典
        """
        last_price = self._safe_float(row.get('最新价')) or self._safe_float(row.get('price')) or self._safe_float(row.get('now'))
        pre_close = self._safe_float(row.get('昨收')) or self._safe_float(row.get('close'))

        change_number = self._safe_float(row.get('涨跌额'))
        change_rate = self._safe_float(row.get('涨跌幅'))

        if change_number is None and last_price is not None and pre_close is not None:
            change_number = last_price - pre_close
        if change_rate is None and change_number is not None and pre_close is not None and pre_close != 0:
            change_rate = (change_number / pre_close) * 100

        index_name = row.get('名称') or row.get('name') or index_code

        return {
            'index_code': index_code,
            'index_name': index_name,
            'index_type': 'HK',
            'last_price': last_price,
            'change_number': change_number,
            'change_rate': change_rate,
            'open_price': self._safe_float(row.get('今开')) or self._safe_float(row.get('open')),
            'pre_close': pre_close,
            'high_price': self._safe_float(row.get('最高')) or self._safe_float(row.get('high')),
            'low_price': self._safe_float(row.get('最低')) or self._safe_float(row.get('low')),
            'volume': self._safe_int(row.get('成交量')) or self._safe_int(row.get('vol')),
            'turnover': self._safe_float(row.get('成交额')) or self._safe_float(row.get('amount')),
            'market_cap': None,
            'week52_high': None,
            'week52_low': None,
            'pe_ratio': self._safe_float(row.get('市盈率')),
            'pb_ratio': self._safe_float(row.get('市净率')),
            'dividend_yield': None,
            'quote_time': datetime.now(),
            'market_date': date.today(),
            'data_source': 'akshare_em',
            'index_str': {
                'market': 'HK',
                'name_cn': index_name,
            }
        }

    def get_batch_index_spot_data(self, index_codes: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        批量获取港股指数实时行情数据

        Args:
            index_codes: 指数代码列表

        Returns:
            字典，key 为 index_code，value 为对应的市场数据
        """
        result = {}

        try:
            # 优先使用东方财富网
            try:
                df_hk = ak.stock_hk_index_spot_em()
                source_used = "东方财富网"
                logger.info(f"[akshare] 获取到 {len(df_hk)} 条港股指数记录（东方财富网）")
            except Exception as e:
                logger.warning(f"[akshare] 东方财富网港股指数源失败：{str(e)}, 切换到新浪源")
                df_hk = ak.stock_hk_index_spot_sina()
                source_used = "新浪财经"
                logger.info(f"[akshare] 获取到 {len(df_hk)} 条港股指数记录（新浪财经）")

            if df_hk is not None and not df_hk.empty:
                for code in index_codes:
                    matched = False

                    # 多种匹配策略
                    for match_strategy in ['code_exact', 'code_zfill', 'name']:
                        if matched:
                            break

                        if match_strategy == 'code_exact':
                            matching_rows = df_hk[df_hk['代码'].astype(str) == code]
                        elif match_strategy == 'code_zfill':
                            matching_rows = df_hk[df_hk['代码'].astype(str).str.zfill(5) == code.zfill(5)]
                        else:  # name
                            matching_rows = df_hk[df_hk['名称'].astype(str) == code]

                        if not matching_rows.empty:
                            data = self._parse_index_spot_row(matching_rows.iloc[0], code)
                            result[code] = data
                            matched = True
                            logger.info(f"[akshare-{source_used}] 批量获取 {code} 成功（{match_strategy}）")

                    if not matched:
                        logger.warning(f"[akshare-{source_used}] 港股指数 {code} 未找到")
                        result[code] = None
            else:
                logger.warning(f"[akshare-{source_used}] 港股指数主数据源为空")
                for code in index_codes:
                    result[code] = None

            logger.info(f"[akshare] 批量获取 {len(index_codes)} 个指数行情完成")
            return result

        except Exception as e:
            logger.error(f"[akshare] 批量获取指数行情失败：{str(e)}")
            for code in index_codes:
                result[code] = None
            return result

    def get_index_history_data(
        self,
        index_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        period: str = "daily"
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取港股指数历史行情数据

        Args:
            index_code: 指数代码 (如：HSI, HSTECH)
            start_date: 开始日期
            end_date: 结束日期
            period: 周期类型 ('daily'=日线，'weekly'=周线，'monthly'=月线)

        Returns:
            历史数据列表，如果失败返回 None
        """
        return self._get_hk_index_history(index_code, start_date, end_date, period)

    def _get_hk_index_history(
        self,
        index_code: str,
        start_date: Optional[date],
        end_date: Optional[date],
        period: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取港股指数历史数据

        Args:
            index_code: 指数代码
            start_date: 开始日期
            end_date: 结束日期
            period: 周期类型

        Returns:
            历史数据列表
        """
        # 设置默认日期范围
        if not start_date:
            start_date = date.today() - timedelta(days=365)
        if not end_date:
            end_date = date.today()

        start_date_str = start_date.strftime('%Y%m%d')
        end_date_str = end_date.strftime('%Y%m%d')

        logger.info(f"[akshare-东方财富] 获取港股指数 {index_code} 历史数据：start={start_date_str}, end={end_date_str}")

        df = ak.stock_hk_index_daily_em(symbol=index_code, start_date=start_date_str, end_date=end_date_str)

        if df.empty:
            logger.warning(f"[akshare] 港股指数 {index_code} 没有历史数据")
            return None

        history_data = []
        for _, row in df.iterrows():
            history_data.append({
                'index_code': index_code,
                'period': period,
                'trade_date': pd.to_datetime(row['日期']).date(),
                'open_price': self._safe_float(row.get('开盘')),
                'close_price': self._safe_float(row.get('收盘')),
                'high_price': self._safe_float(row.get('最高')),
                'low_price': self._safe_float(row.get('最低')),
                'volume': self._safe_int(row.get('成交量')),
                'turnover': self._safe_float(row.get('成交额')),
                'change_number': self._safe_float(row.get('涨跌额')),
                'change_rate': self._safe_float(row.get('涨跌幅')),
                'data_source': 'akshare_em'
            })

        logger.info(f"[akshare] 获取港股指数 {index_code} 历史数据成功，共 {len(history_data)} 条记录")
        return history_data

    def get_batch_index_history_data(
        self,
        index_codes: List[str],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        period: str = "daily"
    ) -> Dict[str, Optional[List[Dict[str, Any]]]]:
        """
        批量获取指数历史行情数据

        Args:
            index_codes: 指数代码列表
            start_date: 开始日期
            end_date: 结束日期
            period: 周期类型

        Returns:
            字典，key 为 index_code，value 为对应的历史数据列表
        """
        result = {}

        for code in index_codes:
            try:
                data = self.get_index_history_data(code, start_date, end_date, period)
                result[code] = data
            except Exception as e:
                logger.error(f"[akshare] 批量获取指数 {code} 历史数据失败：{str(e)}")
                result[code] = None

        return result

    def get_index_constituents(self, index_code: str) -> Optional[List[Dict[str, Any]]]:
        """
        获取港股指数成分股列表

        Args:
            index_code: 指数代码 (如：HSI)

        Returns:
            成分股列表，每个元素包含股票代码、权重等信息
        """
        try:
            logger.info(f"[akshare] 获取港股指数 {index_code} 成分股")

            # 港股指数成分股
            df = ak.index_stock_cons(symbol=index_code)

            if df is None or df.empty:
                logger.warning(f"[akshare] 指数 {index_code} 没有成分股数据")
                return None

            constituents = []
            for _, row in df.iterrows():
                constituents.append({
                    'stock_code': row.get('股票代码') or row.get('代码'),
                    'stock_name': row.get('股票名称') or row.get('名称'),
                    'weight': self._safe_float(row.get('权重')) or self._safe_float(row.get('成分股权重')),
                    'industry': row.get('行业') or row.get('所属行业'),
                })

            logger.info(f"[akshare] 获取指数 {index_code} 成分股成功，共 {len(constituents)} 只股票")
            return constituents

        except Exception as e:
            logger.error(f"[akshare] 获取指数 {index_code} 成分股失败：{str(e)}")
            return None

    # ==================== 美股指数数据相关方法 ====================

    def get_us_index_spot(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        获取美股指数实时行情数据

        支持的美股指数：
        - .IXIC: 纳斯达克综合指数 (NASDAQ Composite)
        - .DJI: 道琼斯工业平均指数 (Dow Jones Industrial Average)
        - .INX: 标普 500 指数 (S&P 500)
        - .NDX: 纳斯达克 100 指数 (NASDAQ-100)

        Args:
            symbol: 指数符号 (如：".INX", ".DJI", ".IXIC", ".NDX")

        Returns:
            包含指数市场数据的字典，如果失败返回 None
        """
        try:
            logger.info(f"[akshare] 获取美股指数行情：{symbol}")

            df = ak.index_us_stock_sina(symbol=symbol)

            if df is None or df.empty:
                logger.warning(f"[akshare] 美股指数 {symbol} 数据为空")
                return None

            # 获取最新一行数据
            latest_row = df.iloc[-1]
            return self._parse_us_index_spot_row(latest_row, symbol)

        except Exception as e:
            logger.error(f"[akshare] 获取美股指数 {symbol} 行情失败：{str(e)}")
            return None

    def _parse_us_index_spot_row(self, row: pd.Series, symbol: str) -> Dict[str, Any]:
        """
        解析美股指数行情数据行

        Args:
            row: 数据行
            symbol: 指数符号

        Returns:
            标准化的指数市场数据字典
        """
        close_price = self._safe_float(row.get('close'))
        open_price = self._safe_float(row.get('open'))
        high_price = self._safe_float(row.get('high'))
        low_price = self._safe_float(row.get('low'))

        # 计算涨跌额和涨跌幅
        change_number = None
        change_rate = None
        if open_price is not None and close_price is not None and open_price != 0:
            change_number = close_price - open_price
            change_rate = (change_number / open_price) * 100

        # 映射符号到指数名称
        index_name_map = {
            '.INX': 'S&P 500',
            '.DJI': 'Dow Jones Industrial Average',
            '.IXIC': 'NASDAQ Composite',
            '.NDX': 'NASDAQ-100',
            #纳斯达克中国金龙指数
            '.HXC': 'NASDAQ China Golden Dragon Index'
        }
        index_name = index_name_map.get(symbol, symbol)

        trade_date = None
        date_val = row.get('date')
        if date_val is not None:
            try:
                if isinstance(date_val, (datetime, date)):
                    trade_date = date_val
                else:
                    trade_date = pd.to_datetime(date_val).date()
            except Exception:
                trade_date = date.today()

        return {
            'index_code': symbol,
            'index_name': index_name,
            'index_type': 'US',
            'last_price': close_price,
            'change_number': change_number,
            'change_rate': change_rate,
            'open_price': open_price,
            'pre_close': open_price,  # 使用开盘价作为昨收
            'high_price': high_price,
            'low_price': low_price,
            'volume': self._safe_int(row.get('volume')),
            'turnover': self._safe_float(row.get('amount')),
            'market_cap': None,
            'week52_high': None,
            'week52_low': None,
            'pe_ratio': None,
            'pb_ratio': None,
            'dividend_yield': None,
            'quote_time': datetime.now(),
            'market_date': trade_date,
            'data_source': 'akshare_sina',
            'index_str': {
                'market': 'US',
                'name_cn': index_name,
            }
        }

    def get_all_us_indices(self) -> List[Dict[str, Any]]:
        """
        获取所有美股指数行情数据

        Returns:
            美股指数列表，包含主要的美股指数
        """
        symbols = ['.INX', '.DJI', '.IXIC', '.NDX' ,'.HXC']
        indices = []

        for symbol in symbols:
            try:
                data = self.get_us_index_spot(symbol)
                if data:
                    indices.append(data)
            except Exception as e:
                logger.warning(f"[akshare] 获取美股指数 {symbol} 失败：{str(e)}")
                continue

        logger.info(f"[akshare] 成功获取 {len(indices)}/{len(symbols)} 个美股指数")
        return indices

    def get_us_index_history(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        获取美股指数历史行情数据

        Args:
            symbol: 指数符号 (如：".INX", ".DJI")
            start_date: 开始日期
            end_date: 结束日期

        Returns:
            历史数据列表，如果失败返回 None
        """
        try:
            # 设置默认日期范围（最近 1 年）
            if not start_date:
                start_date = date.today() - timedelta(days=365)
            if not end_date:
                end_date = date.today()

            logger.info(f"[akshare] 获取美股指数 {symbol} 历史数据：start={start_date}, end={end_date}")

            df = ak.index_us_stock_sina(symbol=symbol)

            if df is None or df.empty:
                logger.warning(f"[akshare] 美股指数 {symbol} 数据为空")
                return None

            # 转换日期并过滤
            df['date'] = pd.to_datetime(df['date'])
            df = df[(df['date'] >= pd.Timestamp(start_date)) &
                    (df['date'] <= pd.Timestamp(end_date))]

            if df.empty:
                logger.warning(f"[akshare] 美股指数 {symbol} 在指定日期范围内没有数据")
                return None

            history_data = []
            for _, row in df.iterrows():
                trade_date = pd.to_datetime(row['date']).date()
                open_price = self._safe_float(row.get('open'))
                close_price = self._safe_float(row.get('close'))
                high_price = self._safe_float(row.get('high'))
                low_price = self._safe_float(row.get('low'))

                # 计算涨跌额和涨跌幅
                change_number = None
                change_rate = None
                if open_price is not None and close_price is not None and open_price != 0:
                    change_number = close_price - open_price
                    change_rate = (change_number / open_price) * 100

                history_data.append({
                    'index_code': symbol,
                    'trade_date': trade_date,
                    'open_price': open_price,
                    'close_price': close_price,
                    'high_price': high_price,
                    'low_price': low_price,
                    'volume': self._safe_int(row.get('volume')),
                    'turnover': self._safe_float(row.get('amount')),
                    'change_number': change_number,
                    'change_rate': change_rate,
                    'data_source': 'akshare_sina'
                })

            logger.info(f"[akshare] 获取美股指数 {symbol} 历史数据成功，共 {len(history_data)} 条记录")
            return history_data

        except Exception as e:
            logger.error(f"[akshare] 获取美股指数 {symbol} 历史数据失败：{str(e)}")
            return None


