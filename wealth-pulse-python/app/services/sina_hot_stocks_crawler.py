"""
新浪热门股票爬虫服务
爬取新浪今日热门港股数据
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)


class SinaHotStocksCrawler:
    """新浪热门股票爬虫"""

    # 新浪热门港股 API
    BASE_URL = "https://stock.finance.sina.com.cn/iphone/api/openapi.php/HqService.getList"

    DATASOURCE = "Sina 新浪"

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
            'Host': 'stock.finance.sina.com.cn',
            'Origin': 'https://stock.finance.sina.com.cn',
            'Pragma': 'no-cache',
            'Referer': 'https://stock.finance.sina.com.cn/hk/indices.html',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
        }

    def _build_request_url(self, stock_type: str = "hot_hk") -> str:
        """
        构建请求 URL

        Args:
            stock_type: 股票类型 (hot_hk=热门港股，hot_us=热门美股，hot_sh=热门沪市，hot_sz=热门深市)

        Returns:
            完整的请求 URL
        """
        return f"{self.BASE_URL}?type={stock_type}"

    def _parse_stock_data(self, stock_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        解析单个股票数据

        Args:
            stock_data: 原始股票数据

        Returns:
            解析后的股票数据
        """
        try:
            # 股票代码格式化（添加前缀 0）
            symbol = stock_data.get('symbol', '')
            if symbol and len(symbol) == 5:
                symbol = '0' + symbol

            # 解析数值字段
            def parse_float(value: Any, default: float = 0.0) -> float:
                if value is None or value == '':
                    return default
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return default

            lasttrade = parse_float(stock_data.get('lasttrade'), 0.0)
            prevclose = parse_float(stock_data.get('prevclose'), 0.0)
            price_change = parse_float(stock_data.get('pricechange'), 0.0)
            change_percent = parse_float(stock_data.get('changepercent'), 0.0)

            return {
                'symbol': symbol,
                'name': stock_data.get('name', ''),
                'engname': stock_data.get('engname', ''),
                'lasttrade': lasttrade,
                'prevclose': prevclose,
                'open': parse_float(stock_data.get('open'), 0.0),
                'high': parse_float(stock_data.get('high'), 0.0),
                'low': parse_float(stock_data.get('low'), 0.0),
                'volume': int(parse_float(stock_data.get('volume'), 0.0)),
                'amount': parse_float(stock_data.get('amount'), 0.0),
                'price_change': price_change,
                'change_percent': change_percent,
                'high_52week': parse_float(stock_data.get('high_52week'), 0.0),
                'low_52week': parse_float(stock_data.get('low_52week'), 0.0),
                'buy': parse_float(stock_data.get('buy'), 0.0),
                'sell': parse_float(stock_data.get('sell'), 0.0),
                'ticktime': stock_data.get('ticktime', ''),
            }

        except Exception as e:
            logger.warning(f"[SinaHotStocks] 解析股票数据失败：{e}")
            return None

    async def fetch_hot_stocks(
        self,
        stock_type: str = "hot_hk",
        limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        获取热门股票数据

        Args:
            stock_type: 股票类型 (hot_hk=热门港股，hot_us=热门美股，hot_sh=热门沪市，hot_sz=热门深市)
            limit: 限制返回数量，None 表示全部

        Returns:
            包含热门股票数据的字典
        """
        request_url = self._build_request_url(stock_type)
        logger.info(f"[SinaHotStocks] Fetching hot stocks from {request_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(request_url)
                response.raise_for_status()

                # 解析 JSON 响应
                json_data = response.json()

                # 检查状态码
                result = json_data.get('result', {})
                status = result.get('status', {})
                code = status.get('code', -1)

                if code != 0:
                    logger.warning(f"[SinaHotStocks] API returned non-zero status: {code}")
                    return {
                        'success': False,
                        'data': {},
                        'error': f'API 返回状态码：{code}',
                    }

                # 解析股票列表
                data_list = result.get('data', {}).get('data', [])
                stocks = []

                for item in data_list:
                    stock_info = self._parse_stock_data(item)
                    if stock_info:
                        stocks.append(stock_info)

                # 限制返回数量
                if limit:
                    stocks = stocks[:limit]

                # 获取行情时间
                hq_info = result.get('data', {}).get('hq_info', {})
                hq_time = hq_info.get('hq_time', '')
                hq_status = hq_info.get('msg', '')

                result = {
                    'success': True,
                    'data': {
                        'stock_type': stock_type,
                        'stocks': stocks,
                        'count': len(stocks),
                        'hq_time': hq_time,
                        'hq_status': hq_status,
                    },
                    'request_url': request_url,
                    'data_source': self.DATASOURCE,
                }

                logger.info(f"[SinaHotStocks] Successfully fetched {len(stocks)} hot stocks")
                return result

        except httpx.TimeoutException:
            logger.error(f"[SinaHotStocks] Timeout fetching hot stocks")
            return {
                'success': False,
                'data': {},
                'error': f'请求超时：{self.timeout}秒',
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaHotStocks] HTTP error {e.response.status_code}")
            return {
                'success': False,
                'data': {},
                'error': f'HTTP 错误：{e.response.status_code}',
            }

        except Exception as e:
            logger.error(f"[SinaHotStocks] Error fetching hot stocks: {str(e)}")
            return {
                'success': False,
                'data': {},
                'error': f'爬取失败：{str(e)}',
            }


# 创建全局实例
sina_hot_stocks_crawler = SinaHotStocksCrawler()
