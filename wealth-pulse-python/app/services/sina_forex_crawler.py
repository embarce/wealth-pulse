"""
新浪外汇行情爬虫服务（异步版本）
爬取外汇实时行情数据
"""
import logging
import re
from typing import List, Dict, Optional
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)


class SinaForexCrawler:
    """新浪外汇行情爬虫（异步版本）"""

    # 外汇行情基础 URL
    QUOTES_URL = "https://hq.sinajs.cn/"

    # 默认外汇代码列表
    DEFAULT_FOREX_CODES = [
        "AUDUSD",  # 澳元美元
        "EURUSD",  # 欧元美元
        "GBPUSD",  # 英镑美元
        "NZDUSD",  # 新西兰元美元
        "USDCAD",  # 美元加元
        "USDCHF",  # 美元瑞郎
        "USDCNY",  # 美元人民币
        "USDHKD",  # 美元港元
        "USDJPY",  # 美元日元
        "USDMYR",  # 美元马来西亚林吉特
        "USDSGD",  # 美元新加坡元
        "USDTWD",  # 美元新台币
        "DINIW",   # 美元指数
    ]

    DATASOURCE = "新浪财经"

    def __init__(self, timeout: int = 30):
        """
        初始化爬虫

        Args:
            timeout: 请求超时时间 (秒)
        """
        self.timeout = timeout
        self.headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Host': 'hq.sinajs.cn',
            'Pragma': 'no-cache',
            'Referer': 'https://vip.stock.finance.sina.com.cn/',
            'Sec-Fetch-Dest': 'script',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-Storage-Access': 'active',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
            'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Microsoft Edge";v="146"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        }

    def _generate_rn_param(self) -> str:
        """
        生成加密参数 rn
        算法：Math.round(Math.random() * 60466176).toString(36)
        60466176 = 36^6，所以结果是 6 位 36 进制字符串

        Returns:
            rn 参数值 (6 位 36 进制字符串)
        """
        import random
        value = random.randint(0, 60466176)
        # 正确的 36 进制转换（使用 0-9a-z）
        chars = '0123456789abcdefghijklmnopqrstuvwxyz'
        result = ''
        while value > 0 or len(result) < 6:
            result = chars[value % 36] + result
            value //= 36
        return result.lower()

    def _build_request_url(self, forex_codes: List[str]) -> str:
        """
        构建请求 URL

        Args:
            forex_codes: 外汇代码列表

        Returns:
            完整的请求 URL
        """
        rn_param = self._generate_rn_param()
        codes_str = ",".join(forex_codes)
        return f"{self.QUOTES_URL}rn={rn_param}&list={codes_str}"

    def _parse_forex_data(self, content: str, encoding: str = 'GB18030') -> List[Dict]:
        """
        解析返回的外汇行情数据

        数据格式示例:
        var hq_str_AUDUSD = "22:25:54,0.7069,0.7070,0.6979,91,0.6993,0.7076,0.6985,0.7069，澳元美元，2026-03-16";

        字段说明（按逗号分隔）:
        0: 时间
        1: 最新价
        2: 买一价/开盘价
        3: 卖一价/最高价
        4: 成交量
        5: 买一价
        6: 卖一价
        7: 最低报价
        8: 昨收价
        9: 名称
        10: 日期

        Args:
            content: 响应内容
            encoding: 内容编码

        Returns:
            解析后的外汇行情数据列表
        """
        # 解码内容（处理 GB18030 编码）
        try:
            decoded_content = content.encode('latin-1').decode(encoding)
        except Exception:
            decoded_content = content

        forex_data = []

        # 正则匹配 var hq_str_CODE = "..."
        pattern = r'var\s+hq_str_(\w+)\s*=\s*"([^"]+)"'
        matches = re.findall(pattern, decoded_content)

        for code, data_str in matches:
            try:
                # 分割数据字段
                fields = data_str.split(',')

                if len(fields) < 10:
                    logger.warning(f"[SinaForexCrawler] Invalid data format for {code}: {data_str}")
                    continue

                # 解析各字段
                time_str = fields[0].strip() if len(fields) > 0 else None
                last_price = float(fields[1]) if len(fields) > 1 and fields[1].strip() else None
                open_price = float(fields[2]) if len(fields) > 2 and fields[2].strip() else None
                high_price = float(fields[3]) if len(fields) > 3 and fields[3].strip() else None
                volume = int(float(fields[4])) if len(fields) > 4 and fields[4].strip() else None
                bid_price = float(fields[5]) if len(fields) > 5 and fields[5].strip() else None
                ask_price = float(fields[6]) if len(fields) > 6 and fields[6].strip() else None
                low_price = float(fields[7]) if len(fields) > 7 and fields[7].strip() else None
                pre_close = float(fields[8]) if len(fields) > 8 and fields[8].strip() else None
                name = fields[9].strip() if len(fields) > 9 else None
                date_str = fields[10].strip() if len(fields) > 10 else None

                # 计算涨跌额和涨跌幅
                change_number = None
                change_rate = None
                if last_price is not None and pre_close is not None and pre_close != 0:
                    change_number = round(last_price - pre_close, 4)
                    change_rate = round((change_number / pre_close) * 100, 4)

                # 构建时间戳
                quote_time = None
                if time_str and date_str:
                    try:
                        quote_time = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        quote_time = datetime.now()
                else:
                    quote_time = datetime.now()

                forex_data.append({
                    'forex_code': code.upper(),
                    'name': name,
                    'last_price': last_price,
                    'change_number': change_number,
                    'change_rate': change_rate,
                    'open_price': open_price,
                    'high_price': high_price,
                    'low_price': low_price,
                    'pre_close': pre_close,
                    'bid_price': bid_price,
                    'ask_price': ask_price,
                    'volume': volume,
                    'time': time_str,
                    'date': date_str,
                    'quote_time': quote_time.isoformat() if quote_time else None,
                    'data_source': self.DATASOURCE,
                })

            except Exception as e:
                logger.error(f"[SinaForexCrawler] Error parsing data for {code}: {str(e)}")
                continue

        return forex_data

    async def fetch_forex_rates(self, forex_codes: Optional[List[str]] = None) -> Dict:
        """
        获取外汇实时行情

        Args:
            forex_codes: 外汇代码列表，如果为 None 则使用默认列表

        Returns:
            包含外汇行情数据的字典:
            - success: 是否成功
            - data: 行情数据列表
            - count: 数据条数
            - error: 错误信息（如果有）
        """
        if forex_codes is None:
            forex_codes = self.DEFAULT_FOREX_CODES

        request_url = self._build_request_url(forex_codes)

        logger.info(f"[SinaForexCrawler] Fetching forex rates from {request_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(request_url)
                response.raise_for_status()

                # 获取编码（通常是 GB18030）
                content_type = response.headers.get('Content-Type', '')
                encoding = 'GB18030'
                if 'charset=' in content_type:
                    encoding = content_type.split('charset=')[-1].strip()

                # 解析数据
                forex_data = self._parse_forex_data(response.text, encoding)

                result = {
                    'success': True,
                    'data': forex_data,
                    'count': len(forex_data),
                    'request_url': request_url,
                }

                logger.info(f"[SinaForexCrawler] Successfully fetched {len(forex_data)} forex rates")
                return result

        except httpx.TimeoutException:
            logger.error(f"[SinaForexCrawler] Timeout fetching forex rates")
            return {
                'success': False,
                'data': [],
                'count': 0,
                'error': f'请求超时：{self.timeout}秒',
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaForexCrawler] HTTP error {e.response.status_code}")
            return {
                'success': False,
                'data': [],
                'count': 0,
                'error': f'HTTP 错误：{e.response.status_code}',
            }

        except Exception as e:
            logger.error(f"[SinaForexCrawler] Error fetching forex rates: {str(e)}")
            return {
                'success': False,
                'data': [],
                'count': 0,
                'error': f'爬取失败：{str(e)}',
            }

    async def fetch_single_forex(self, forex_code: str) -> Optional[Dict]:
        """
        获取单个外汇行情

        Args:
            forex_code: 外汇代码（如"AUDUSD"）

        Returns:
            单个外汇行情数据，失败返回 None
        """
        result = await self.fetch_forex_rates([forex_code.upper()])
        if result['success'] and result['data']:
            return result['data'][0]
        return None

    async def fetch_usd_cny(self) -> Optional[Dict]:
        """
        获取美元/人民币汇率

        Returns:
            美元/人民币汇率数据，失败返回 None
        """
        return await self.fetch_single_forex('USDCNY')

    async def fetch_usd_hkd(self) -> Optional[Dict]:
        """
        获取美元/港元汇率

        Returns:
            美元/港元汇率数据，失败返回 None
        """
        return await self.fetch_single_forex('USDHKD')


# 创建全局实例
sina_forex_crawler = SinaForexCrawler()
