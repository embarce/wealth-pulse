"""
UBS 南向资金流向爬虫服务
爬取 UBS 南向资金流向数据
"""
import logging
import re
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

import httpx

logger = logging.getLogger(__name__)


class UBSSouthboundCrawler:
    """UBS 南向资金流向爬虫"""

    # UBS 南向资金流向 API
    BASE_URL = "https://warrants.ubs.com/sc/ajax/underlying/southbound_moneyflow_turnover"

    DATASOURCE = "UBS 瑞银"

    def __init__(self, timeout: int = 30):
        """
        初始化爬虫

        Args:
            timeout: 请求超时时间 (秒)
        """
        self.timeout = timeout
        self.headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5',
            'Cache-Control': 'no-cache',
            'Host': 'warrants.ubs.com',
            'Pragma': 'no-cache',
            'Referer': 'https://warrants.ubs.com/sc/underlying/southbound-moneyflow-turnover',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
        }

    def _build_request_url(self, date_from: str, date_to: str, period: int = 1) -> str:
        """
        构建请求 URL

        Args:
            date_from: 开始日期 (YYYY-MM-DD)
            date_to: 结束日期 (YYYY-MM-DD)
            period: 周期 (1=日，2=周，3=月)

        Returns:
            完整的请求 URL
        """
        timestamp = int(datetime.now().timestamp() * 1000)
        return f"{self.BASE_URL}?period={period}&date_from={date_from}&date_to={date_to}&_={timestamp}"

    def _build_date_list_url(self, period: int = 1) -> str:
        """
        构建日期列表请求 URL

        Args:
            period: 周期 (1=日，2=周，3=月)

        Returns:
            完整的日期列表 URL
        """
        timestamp = int(datetime.now().timestamp() * 1000)
        return f"{self.BASE_URL}/action/udate_list?period={period}&_={timestamp}"

    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """
        解析金额字符串（如"79.84 亿"、"3.44 千万"）为数值（单位：亿）

        Args:
            amount_str: 金额字符串

        Returns:
            解析后的金额（单位：亿）
        """
        if not amount_str:
            return None

        amount_str = amount_str.strip()

        # 移除 HTML 标签
        amount_str = re.sub(r'<[^>]+>', '', amount_str)

        try:
            if '亿' in amount_str:
                value = float(amount_str.replace('亿', '').strip())
            elif '千万' in amount_str:
                value = float(amount_str.replace('千万', '').strip()) / 10  # 转换为亿
            else:
                # 尝试直接解析
                value = float(amount_str)
            return round(value, 2)
        except (ValueError, AttributeError):
            logger.warning(f"[UBSSouthbound] 无法解析金额：{amount_str}")
            return None

    def _parse_percentage(self, pct_str: str) -> Optional[float]:
        """
        解析百分比字符串

        Args:
            pct_str: 百分比字符串（如"19.75%"）

        Returns:
            解析后的百分比值
        """
        if not pct_str:
            return None

        try:
            pct_str = pct_str.strip().replace('%', '')
            return round(float(pct_str), 2)
        except (ValueError, AttributeError):
            return None

    def _parse_stock_info(self, stock_text: str) -> Dict[str, Any]:
        """
        解析股票信息文本

        Args:
            stock_text: 股票信息文本（如"香港盈富基金 (2800) $26.12, +1.55%"）

        Returns:
            包含股票信息的字典
        """
        result = {
            'name': None,
            'code': None,
            'price': None,
            'change_rate': None,
        }

        if not stock_text:
            return result

        # 提取股票代码 (括号内的数字)
        code_match = re.search(r'\((\d{4,5})\)', stock_text)
        if code_match:
            result['code'] = code_match.group(1)

        # 提取股票名称 (括号前的文字)
        name_match = re.search(r'^([^()]+)\s*\(', stock_text)
        if name_match:
            result['name'] = name_match.group(1).strip()

        # 提取价格 ($XX.XX)
        price_match = re.search(r'\$(\d+\.?\d*)', stock_text)
        if price_match:
            result['price'] = float(price_match.group(1))

        # 提取涨跌幅 (+X.XX% 或 -X.XX%)
        change_match = re.search(r'[+|-](\d+\.?\d*)%', stock_text)
        if change_match:
            change_rate = float(change_match.group(1))
            if '-' in stock_text[stock_text.find('+'):stock_text.find('%')+1] or stock_text.count('-') > 1:
                change_rate = -change_rate
            result['change_rate'] = change_rate

        return result

    def _parse_html_table(self, html: str) -> List[Dict[str, Any]]:
        """
        解析 HTML 表格数据

        Args:
            html: HTML 表格字符串

        Returns:
            解析后的数据列表
        """
        if not html:
            return []

        results = []
        soup = BeautifulSoup(html, 'html.parser')

        for tr in soup.find_all('tr'):
            try:
                tds = tr.find_all('td')
                if len(tds) < 6:
                    continue

                # 排名
                rank_td = tds[1].text.strip()
                rank = int(rank_td) if rank_td.isdigit() else None

                # 股票信息
                stock_text = tds[2].get_text(separator=' ', strip=True)
                stock_info = self._parse_stock_info(stock_text)

                # 净流入/流出金额
                amount_td = tds[3]
                amount_text = amount_td.get_text(strip=True)
                # 判断是流入还是流出
                is_bull = 'bull' in amount_td.get('class', [])
                is_bear = 'bear' in amount_td.get('class', [])
                amount = self._parse_amount(amount_text)

                # 成交额
                turnover_text = tds[4].get_text(strip=True)
                turnover = self._parse_amount(turnover_text)

                # 占比
                ratio_text = tds[5].get_text(strip=True)
                ratio = self._parse_percentage(ratio_text)

                # 相关窝轮信息
                warrants = []
                highlight_td = tds[6] if len(tds) > 6 else None
                if highlight_td:
                    for a in highlight_td.find_all('a', href=True):
                        warrant_code_match = re.search(r'/code/(\d{5,6})', a.get('href', ''))
                        if warrant_code_match:
                            warrant_text = a.get_text(strip=True)
                            # 判断是购还是沽
                            warrant_type = 'call' if 'call' in a.get('href', '').lower() or '购' in warrant_text else 'put'
                            warrants.append({
                                'code': warrant_code_match.group(1),
                                'type': warrant_type,
                                'text': warrant_text
                            })

                results.append({
                    'rank': rank,
                    'stock_code': stock_info.get('code'),
                    'stock_name': stock_info.get('name'),
                    'price': stock_info.get('price'),
                    'change_rate': stock_info.get('change_rate'),
                    'money_flow': amount,  # 单位：亿
                    'turnover': turnover,  # 单位：亿
                    'ratio': ratio,  # 占比%
                    'is_net_inflow': is_bull or not is_bear,  # True=净流入，False=净流出
                    'warrants': warrants[:2] if warrants else [],  # 只取前 2 个窝轮
                })

            except Exception as e:
                logger.warning(f"[UBSSouthbound] 解析表格行失败：{e}")
                continue

        return results

    async def fetch_available_dates(self, period: int = 1) -> Dict[str, str]:
        """
        获取可用的交易日期列表

        Args:
            period: 周期 (1=日，2=周，3=月)

        Returns:
            包含可用日期的字典 {"udate_from": "...", "udate_to": "..."}
        """
        request_url = self._build_date_list_url(period)
        logger.info(f"[UBSSouthbound] Fetching available dates from {request_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(request_url)
                response.raise_for_status()

                json_data = response.json()
                logger.info(f"[UBSSouthbound] Successfully fetched available dates: {json_data}")
                return json_data

        except httpx.TimeoutException:
            logger.error(f"[UBSSouthbound] Timeout fetching available dates")
            return {}

        except httpx.HTTPStatusError as e:
            logger.error(f"[UBSSouthbound] HTTP error {e.response.status_code} fetching dates")
            return {}

        except Exception as e:
            logger.error(f"[UBSSouthbound] Error fetching available dates: {str(e)}")
            return {}

    async def fetch_southbound_flow(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        period: int = 1,
        auto_fetch_dates: bool = True
    ) -> Dict[str, Any]:
        """
        获取南向资金流向数据

        Args:
            date_from: 开始日期 (YYYY-MM-DD)，默认从 UBS API 自动获取
            date_to: 结束日期 (YYYY-MM-DD)，默认从 UBS API 自动获取
            period: 周期 (1=日，2=周，3=月)
            auto_fetch_dates: 是否自动从 UBS API 获取可用日期（默认 True）

        Returns:
            包含南向资金流向数据的字典
        """
        # 自动获取可用交易日期
        if auto_fetch_dates and (not date_from or not date_to):
            available_dates = await self.fetch_available_dates(period)
            if available_dates:
                date_from = date_from or available_dates.get('udate_from')
                date_to = date_to or available_dates.get('udate_to')
                logger.info(f"[UBSSouthbound] Auto-fetched dates: {date_from} to {date_to}")
            else:
                # 如果自动获取失败，使用昨天的日期作为 fallback
                yesterday = datetime.now() - timedelta(days=1)
                date_from = date_from or yesterday.strftime('%Y-%m-%d')
                date_to = date_to or yesterday.strftime('%Y-%m-%d')
                logger.warning(f"[UBSSouthbound] Failed to auto-fetch dates, using fallback: {date_from} to {date_to}")

        # 如果仍然没有日期（极端情况），返回错误
        if not date_from or not date_to:
            return {
                'success': False,
                'data': {},
                'error': '无法获取日期参数',
            }

        request_url = self._build_request_url(date_from, date_to, period)

        logger.info(f"[UBSSouthbound] Fetching southbound flow from {request_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(request_url)
                response.raise_for_status()

                # 解析 JSON 响应
                json_data = response.json()

                # 解析净流入表格
                inflow_data = self._parse_html_table(json_data.get('mflow_in_table', ''))

                # 解析净流出表格
                outflow_data = self._parse_html_table(json_data.get('mflow_out_table', ''))

                # 计算统计信息
                total_inflow = sum(item.get('money_flow', 0) or 0 for item in inflow_data)
                total_outflow = sum(item.get('money_flow', 0) or 0 for item in outflow_data)
                net_inflow = total_inflow - total_outflow

                result = {
                    'success': True,
                    'data': {
                        'date_from': date_from,
                        'date_to': date_to,
                        'period': period,
                        'inflow_stocks': inflow_data,  # 净流入股票列表
                        'outflow_stocks': outflow_data,  # 净流出股票列表
                        'inflow_count': json_data.get('mflow_in_no', len(inflow_data)),
                        'outflow_count': json_data.get('mflow_out_no', len(outflow_data)),
                        'total_inflow': round(total_inflow, 2),  # 总流入（亿）
                        'total_outflow': round(total_outflow, 2),  # 总流出（亿）
                        'net_inflow': round(net_inflow, 2),  # 净流入（亿）
                    },
                    'request_url': request_url,
                    'data_source': self.DATASOURCE,
                }

                logger.info(f"[UBSSouthbound] Successfully fetched southbound flow: "
                           f"流入={total_inflow:.2f}亿，流出={total_outflow:.2f}亿，净流入={net_inflow:.2f}亿")
                return result

        except httpx.TimeoutException:
            logger.error(f"[UBSSouthbound] Timeout fetching southbound flow")
            return {
                'success': False,
                'data': {},
                'error': f'请求超时：{self.timeout}秒',
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"[UBSSouthbound] HTTP error {e.response.status_code}")
            return {
                'success': False,
                'data': {},
                'error': f'HTTP 错误：{e.response.status_code}',
            }

        except Exception as e:
            logger.error(f"[UBSSouthbound] Error fetching southbound flow: {str(e)}")
            return {
                'success': False,
                'data': {},
                'error': f'爬取失败：{str(e)}',
            }

    async def fetch_recent_flow(self, days: int = 5) -> Dict[str, Any]:
        """
        获取最近 N 天的南向资金流向数据

        Args:
            days: 获取多少天的数据

        Returns:
            包含多天南向资金流向数据的字典
        """
        # 先尝试获取可用日期，从最新的交易日开始往前推
        available_dates = await self.fetch_available_dates(period=1)
        if available_dates and available_dates.get('udate_to'):
            # 使用 UBS API 返回的最新日期作为结束日期
            end_date = datetime.strptime(available_dates['udate_to'], '%Y-%m-%d')
            logger.info(f"[UBSSouthbound] Using latest trading date from API: {available_dates['udate_to']}")
        else:
            # 如果获取失败，使用昨天作为结束日期
            end_date = datetime.now() - timedelta(days=1)
            logger.warning(f"[UBSSouthbound] Failed to fetch dates, using yesterday: {end_date.strftime('%Y-%m-%d')}")

        start_date = end_date - timedelta(days=days - 1)

        date_from = start_date.strftime('%Y-%m-%d')
        date_to = end_date.strftime('%Y-%m-%d')

        logger.info(f"[UBSSouthbound] Fetching {days} days southbound flow from {date_from} to {date_to}")

        return await self.fetch_southbound_flow(date_from, date_to, period=1, auto_fetch_dates=False)


# 创建全局实例
ubs_southbound_crawler = UBSSouthboundCrawler()
