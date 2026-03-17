"""
新浪港股实时行情爬虫服务
爬取港股实时行情数据（实时行情 + 分时数据）
参考:
- 实时行情：https://hq.sinajs.cn/list=rt_hk{symbol}
- 分时数据：https://stock.finance.sina.com.cn/hkstock/api/openapi.php/HK_StockService.getHKMinline
"""
import logging
import re
import httpx
import json
from typing import Dict, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class SinaHKRealtimeCrawler:
    """新浪港股实时行情爬虫"""

    # 基础 URL - 使用 https 协议
    BASE_URL = "https://hq.sinajs.cn"

    DATASOURCE = "新浪财经"

    def __init__(self, timeout: int = 10):
        """
        初始化爬虫

        Args:
            timeout: 请求超时时间 (秒)
        """
        self.timeout = timeout
        # 基础请求头（Referer 会根据股票代码动态生成）
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
        }

    @staticmethod
    def normalize_stock_code(stock_code: str) -> str:
        """
        标准化股票代码

        Args:
            stock_code: 原始股票代码 (可能是 00700.HK, 700.HK, 00700 等格式)

        Returns:
            5 位数字的股票代码
        """
        # 移除后缀
        code = stock_code.replace('.HK', '').replace('.hk', '').replace('.Hk', '')
        # 补齐 5 位
        if len(code) < 5:
            code = code.zfill(5)
        return code

    def _parse_realtime_data(self, symbol: str, raw_data: str) -> Dict:
        """
        解析实时行情数据

        JS 返回格式示例:
        var hq_str_rt_hk01810 = "XIAOMI-W，小米集团-W,35.400,35.200,36.620,35.220,35.360,0.160,0.455,35.340,35.360,7400552700.880,206256757,34.302,0.000,61.450,31.200,2026/03/17,16:08:16,100|0,N|Y|Y,35.360|33.600|37.120,0|||0.000|0.000|0.000, |0,Y";

        数据字段索引:
        0: 英文名
        1: 中文名
        2: 开盘价
        3: 昨收价
        4: 最高价
        5: 最低价
        6: 当前价
        7: 涨跌额
        8: 涨跌幅
        9: 卖一价
        10: 买一价
        11: 成交额
        12: 成交量
        13: 市盈率
        14: 收益率
        15: 52 周最高
        16: 52 周最低
        17: 日期
        18: 时间

        Args:
            symbol: 股票代码
            raw_data: 原始数据字符串

        Returns:
            解析后的数据字典
        """
        result = {
            'symbol': symbol,
            'datasource': self.DATASOURCE,
            'fetch_time': datetime.now().isoformat(),
            'status': 'success',
            'error': None
        }

        if not raw_data or raw_data.strip() == '':
            result['status'] = 'error'
            result['error'] = 'Empty data returned'
            return result

        # 分割数据
        fields = raw_data.split(',')

        if len(fields) < 19:
            result['status'] = 'error'
            result['error'] = f'Invalid data format, expected at least 19 fields, got {len(fields)}'
            return result

        try:
            # 基本信息
            result['english_name'] = fields[0] if fields[0] else None
            result['chinese_name'] = fields[1] if fields[1] else None

            # 价格数据
            result['open'] = self._safe_float(fields[2])      # 开盘
            result['previous_close'] = self._safe_float(fields[3])  # 昨收
            result['high'] = self._safe_float(fields[4])      # 最高
            result['low'] = self._safe_float(fields[5])       # 最低
            result['current'] = self._safe_float(fields[6])   # 当前
            result['change'] = self._safe_float(fields[7])    # 涨跌额
            result['change_percent'] = self._safe_float(fields[8])  # 涨跌幅

            # 买卖盘
            result['ask1'] = self._safe_float(fields[9])      # 卖一
            result['bid1'] = self._safe_float(fields[10])     # 买一

            # 成交数据
            result['turnover'] = self._safe_float(fields[11])  # 成交额
            result['volume'] = self._safe_int(fields[12])      # 成交量

            # 其他指标
            result['pe_ratio'] = self._safe_float(fields[13])  # 市盈率
            result['yield'] = self._safe_float(fields[14])     # 收益率
            result['high_52w'] = self._safe_float(fields[15])  # 52 周最高
            result['low_52w'] = self._safe_float(fields[16])   # 52 周最低

            # 时间信息
            result['date'] = fields[17] if fields[17] else None
            result['time'] = fields[18] if fields[18] else None

            # 合并 datetime
            if fields[17] and fields[18]:
                result['datetime'] = f"{fields[17]} {fields[18]}"

            # 计算振幅
            if result['previous_close'] and result['high'] and result['low']:
                result['amplitude'] = round((result['high'] - result['low']) * 100 / result['previous_close'], 3)

            # 处理停牌状态 (status 字段在后续数据中)
            if len(fields) > 21:
                status_field = fields[21] if fields[21] else ''
                if 'N' in status_field:
                    result['trading_status'] = 'normal'
                elif 'Y' in status_field:
                    result['trading_status'] = 'suspended'
                else:
                    result['trading_status'] = 'unknown'

            # 额外数据（如果有）
            if len(fields) > 19:
                result['extra_fields'] = fields[19:]

        except Exception as e:
            result['status'] = 'error'
            result['error'] = f'Parse error: {str(e)}'
            logger.error(f"[SinaHKRealtimeCrawler] Parse error for {symbol}: {str(e)}")

        return result

    @staticmethod
    def _safe_float(value: str) -> Optional[float]:
        """安全转换为浮点数"""
        if not value or value == 'undefined' or value == 'NaN':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _safe_int(value: str) -> Optional[int]:
        """安全转换为整数"""
        if not value or value == 'undefined' or value == 'NaN':
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    async def _do_request(self, params: str, referer: str) -> Optional[str]:
        """
        执行 HTTP 请求（使用 httpx 异步客户端）

        Args:
            params: URL 参数字符串
            referer: Referer 头，用于模拟从具体股票页面访问

        Returns:
            响应内容或 None
        """
        url = f"{self.BASE_URL}/{params}"

        # 构建请求头，添加动态 Referer
        headers = self.headers.copy()
        headers['Referer'] = referer

        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(url, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                # 尝试使用 gbk 解码（新浪财经使用 gbk 编码）
                content = response.content.decode('gbk', errors='ignore')
                return content
        except httpx.TimeoutException as e:
            logger.error(f"[SinaHKRealtimeCrawler] Timeout: {str(e)}")
            return None
        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaHKRealtimeCrawler] HTTP error {e.response.status_code}")
            return None
        except httpx.RequestError as e:
            logger.error(f"[SinaHKRealtimeCrawler] Request error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"[SinaHKRealtimeCrawler] Unexpected error: {str(e)}")
            return None

    async def fetch_realtime_quote(self, stock_code: str) -> Dict:
        """
        获取单只股票的实时行情（异步版本）

        Args:
            stock_code: 股票代码 (支持格式：00700.HK, 700.HK, 00700, 1810 等)

        Returns:
            包含实时行情数据的字典
        """
        # 标准化股票代码
        symbol = self.normalize_stock_code(stock_code)

        # 动态生成 Referer，模拟从具体股票页面访问
        referer = f"https://stock.finance.sina.com.cn/hkstock/quotes/{symbol}.html"

        logger.info(f"[SinaHKRealtimeCrawler] Fetching realtime quote for {stock_code} (symbol: {symbol})")

        # 请求实时行情数据
        params = f"list=rt_hk{symbol}"
        content = await self._do_request(params, referer)

        if not content:
            return {
                'symbol': stock_code,
                'normalized_symbol': symbol,
                'fetch_time': datetime.now().isoformat(),
                'datasource': self.DATASOURCE,
                'realtime_data': {'status': 'error', 'error': 'Request failed', 'symbol': symbol}
            }

        # 提取实时行情数据
        realtime_match = re.search(r'var hq_str_rt_hk{}="([^"]*)"'.format(symbol), content)

        result = {
            'symbol': stock_code,
            'normalized_symbol': symbol,
            'fetch_time': datetime.now().isoformat(),
            'datasource': self.DATASOURCE
        }

        # 解析实时行情
        if realtime_match:
            result['realtime_data'] = self._parse_realtime_data(symbol, realtime_match.group(1))
        else:
            result['realtime_data'] = {
                'status': 'error',
                'error': 'No realtime data found',
                'symbol': symbol
            }

        return result


# 创建全局实例
sina_hk_realtime_crawler = SinaHKRealtimeCrawler()


class SinaHKMinuteCrawler:
    """新浪港股分时数据爬虫"""

    # 基础 URL - 使用 https 协议
    BASE_URL = "https://stock.finance.sina.com.cn/hkstock/api/openapi.php/HK_StockService.getHKMinline"

    DATASOURCE = "新浪财经"

    def __init__(self, timeout: int = 10):
        """
        初始化爬虫

        Args:
            timeout: 请求超时时间 (秒)
        """
        self.timeout = timeout
        # 基础请求头（Referer 会根据股票代码动态生成）
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
        }

    @staticmethod
    def normalize_stock_code(stock_code: str) -> str:
        """
        标准化股票代码（去除后缀，保留纯数字）

        Args:
            stock_code: 原始股票代码 (可能是 00700.HK, 700.HK, 00700 等格式)

        Returns:
            纯数字股票代码（不带后缀）
        """
        # 移除后缀
        code = stock_code.replace('.HK', '').replace('.hk', '').replace('.Hk', '')
        return code

    def _parse_minute_data(self, symbol: str, json_data: str) -> Dict:
        """
        解析分时数据

        JSON 格式示例:
        {"result":{"status":{"code":0},"data":[
          {"m":"09:30:00","v":"3041344","a":"107844354","p":"35.56","avg_p":"35.459","prevOpenVolume":"4588800"},
          {"m":"09:31:00","v":"2011150","a":"71653098","p":"35.66","avg_p":"35.527"},
          ...
        ]}}

        数据字段:
        - m: 时间 (HH:MM:SS)
        - v: 成交量
        - a: 成交额/turnover
        - p: 价格
        - avg_p: 均价
        - prevOpenVolume: 前开盘量（仅第一条记录）

        Args:
            symbol: 股票代码
            json_data: JSON 格式的数据字符串

        Returns:
            解析后的数据字典
        """
        result = {
            'symbol': symbol,
            'datasource': self.DATASOURCE,
            'fetch_time': datetime.now().isoformat(),
            'status': 'success',
            'error': None,
            'minute_data': []
        }

        try:
            data = json.loads(json_data)

            # 检查状态码
            status = data.get('result', {}).get('status', {})
            code = status.get('code', -1)

            if code != 0:
                result['status'] = 'error'
                result['error'] = f'API returned error code: {code}'
                return result

            # 提取分时数据
            minute_list = data.get('result', {}).get('data', [])

            for item in minute_list:
                minute_record = {
                    'time': item.get('m'),           # 时间
                    'volume': self._safe_int(item.get('v')),      # 成交量
                    'turnover': self._safe_float(item.get('a')),  # 成交额
                    'price': self._safe_float(item.get('p')),     # 价格
                    'avg_price': self._safe_float(item.get('avg_p'))  # 均价
                }

                # 处理可选字段
                if 'prevOpenVolume' in item:
                    minute_record['prev_open_volume'] = self._safe_int(item['prevOpenVolume'])

                result['minute_data'].append(minute_record)

        except json.JSONDecodeError as e:
            result['status'] = 'error'
            result['error'] = f'JSON parse error: {str(e)}'
            logger.error(f"[SinaHKMinuteCrawler] JSON parse error for {symbol}: {str(e)}")
        except Exception as e:
            result['status'] = 'error'
            result['error'] = f'Parse error: {str(e)}'
            logger.error(f"[SinaHKMinuteCrawler] Parse error for {symbol}: {str(e)}")

        return result

    @staticmethod
    def _safe_float(value: str) -> Optional[float]:
        """安全转换为浮点数"""
        if not value or value == 'undefined' or value == 'NaN':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _safe_int(value: str) -> Optional[int]:
        """安全转换为整数"""
        if not value or value == 'undefined' or value == 'NaN':
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    async def _do_request(self, url: str, referer: str) -> Optional[str]:
        """
        执行 HTTP 请求（使用 httpx 异步客户端）

        Args:
            url: 完整 URL
            referer: Referer 头

        Returns:
            响应内容或 None
        """
        headers = self.headers.copy()
        headers['Referer'] = referer

        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(url, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                content = response.text
                return content
        except httpx.TimeoutException as e:
            logger.error(f"[SinaHKMinuteCrawler] Timeout: {str(e)}")
            return None
        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaHKMinuteCrawler] HTTP error {e.response.status_code}")
            return None
        except httpx.RequestError as e:
            logger.error(f"[SinaHKMinuteCrawler] Request error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"[SinaHKMinuteCrawler] Unexpected error: {str(e)}")
            return None

    async def fetch_minute_data(self, stock_code: str) -> Dict:
        """
        获取单只股票的分时数据（异步版本）

        Args:
            stock_code: 股票代码 (支持格式：00700.HK, 700.HK, 00700, 1810 等)

        Returns:
            包含分时数据的字典
        """
        # 标准化股票代码（纯数字格式）
        symbol = self.normalize_stock_code(stock_code)

        # 动态生成 Referer
        referer = f"https://stock.finance.sina.com.cn/hkstock/quotes/{symbol}.html"

        # 生成时间戳
        timestamp = int(datetime.now().timestamp() * 1000)

        # 构建 URL（不传 callback 参数，直接返回 JSON）
        url = f"{self.BASE_URL}?symbol={symbol}&random={timestamp}"

        logger.info(f"[SinaHKMinuteCrawler] Fetching minute data for {stock_code} (symbol: {symbol})")

        # 执行请求
        content = await self._do_request(url, referer)

        if not content:
            return {
                'symbol': stock_code,
                'normalized_symbol': symbol,
                'fetch_time': datetime.now().isoformat(),
                'datasource': self.DATASOURCE,
                'status': 'error',
                'error': 'Request failed',
                'minute_data': []
            }

        # 解析分钟数据（content 已经是标准 JSON）
        result = self._parse_minute_data(symbol, content)
        result['symbol'] = stock_code
        result['normalized_symbol'] = symbol

        return result


# 创建全局实例
sina_hk_minute_crawler = SinaHKMinuteCrawler()
