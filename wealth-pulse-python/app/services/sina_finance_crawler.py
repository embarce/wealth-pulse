"""
新浪财经财务指标爬虫服务
爬取港股财务指标数据并计算关键比率
"""
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SinaFinanceCrawler:
    """新浪财经财务指标爬虫"""

    BASE_URL = "https://stock.finance.sina.com.cn/hkstock/finance/"
    DATASOURCE = "新浪财经"

    def __init__(self, timeout: int = 30):
        """
        初始化爬虫

        Args:
            timeout: 请求超时时间(秒)
        """
        self.timeout = timeout
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    @staticmethod
    def normalize_stock_code(stock_code: str) -> str:
        """
        标准化股票代码为新浪格式

        Args:
            stock_code: 股票代码 (如: 0700.HK, 01810.HK)

        Returns:
            新浪格式的股票代码 (如: 00700, 01810)
        """
        # 移除 .HK 后缀
        code = stock_code.replace('.HK', '').replace('.hk', '')

        # 补齐到5位
        if len(code) < 5:
            code = code.zfill(5)

        return code

    def _parse_number(self, value_str: str) -> Optional[float]:
        """
        解析数字字符串

        Args:
            value_str: 数字字符串，可能包含负号、逗号等

        Returns:
            解析后的浮点数，如果解析失败返回None
        """
        if not value_str or value_str.strip() in ['--', '', '-', '0']:
            return None

        try:
            # 移除逗号和空格
            cleaned = re.sub(r'[,\s]', '', str(value_str))
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    def _extract_key_financials(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        提取重要财务指标表格数据

        Args:
            soup: BeautifulSoup对象

        Returns:
            财务数据列表，每个元素代表一个报告期
        """
        financial_data = []

        # 查找重要财务指标表格
        table = soup.find('table', class_='tab05')

        if not table:
            logger.warning("[SinaFinanceCrawler] Key financial table not found")
            return financial_data

        # 获取表头（第一行是指标名称）
        rows = table.find_all('tr')

        if len(rows) < 5:
            logger.warning("[SinaFinanceCrawler] Not enough data rows")
            return financial_data

        # 第一行是开始日期，第二行是截止日期
        # 表格结构：第一列是指标名，后续各列是不同时期的值
        num_periods = 0

        # 从第二行（截止日期）确定列数
        date_row = rows[1]
        cells = date_row.find_all(['td', 'th'])
        if len(cells) > 1:
            num_periods = len(cells) - 1  # 减去第一列（标签列）

        # 初始化每个时期的数据结构
        periods_data = []
        for i in range(num_periods):
            periods_data.append({
                'period_index': i,
                'start_date': None,
                'end_date': None,
                'announcement_date': None,
                'report_type': None
            })

        # 解析每一行数据
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if not cells:
                continue

            label = cells[0].get_text(strip=True)

            # 解析每个时期的数据
            for i in range(min(num_periods, len(cells) - 1)):
                cell_index = i + 1
                value_str = cells[cell_index].get_text(strip='')

                # 根据标签存储到相应字段
                if label == '开始日期':
                    periods_data[i]['start_date'] = value_str
                elif label == '截止日期':
                    periods_data[i]['end_date'] = value_str
                elif label == '公告日期':
                    periods_data[i]['announcement_date'] = value_str
                elif label == '报表类型':
                    periods_data[i]['report_type'] = value_str
                elif label == '营业额':
                    periods_data[i]['revenue'] = self._parse_number(value_str)
                elif label == '损益额':
                    periods_data[i]['net_profit'] = self._parse_number(value_str)
                elif label == '基本每股盈利(仙)':
                    periods_data[i]['eps_basic'] = self._parse_number(value_str)
                elif label == '摊薄每股盈利(仙)':
                    periods_data[i]['eps_diluted'] = self._parse_number(value_str)

        # 计算毛利率和净利率（如果有营业额和毛利/损益额）
        # 注意：这些数据在损益表中，不是在重要指标表中

        return periods_data

    def _extract_profit_loss(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        提取综合损益表数据（用于计算毛利率和净利率）

        Args:
            soup: BeautifulSoup对象

        Returns:
            损益表数据
        """
        profit_loss = {}

        # 查找损益表 - 通常是第四个表格（a4）
        # 或者查找包含"毛利"、"经营盈利"等关键词的表格
        tables = soup.find_all('table', class_='tab05')

        for table in tables:
            # 检查这个表格是否包含损益相关数据
            table_text = table.get_text()

            if '毛利' in table_text or '经营盈利' in table_text:
                # 获取最新一期的数据（通常是第二列，第一列是标签）
                rows = table.find_all('tr')

                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 2:
                        continue

                    label = cells[0].get_text(strip='')

                    # 获取最新一期的值（第二列）
                    if len(cells) > 1:
                        value = self._parse_number(cells[1].get_text(strip=''))

                        if label == '营业额':
                            profit_loss['revenue'] = value
                        elif label == '毛利':
                            profit_loss['gross_profit'] = value
                        elif label == '经营盈利':
                            profit_loss['operating_profit'] = value
                        elif label == '损益额':
                            profit_loss['net_profit'] = value

                # 找到损益表后跳出
                break

        return profit_loss

    def _extract_balance_sheet(self, soup: BeautifulSoup) -> Dict[str, Optional[float]]:
        """
        提取资产负债表数据

        Args:
            soup: BeautifulSoup对象

        Returns:
            资产负债表关键数据
        """
        balance_sheet = {}

        # 查找资产负债表 - 通常是第二个表格（a2）
        tables = soup.find_all('table', class_='tab05')

        for table in tables:
            table_text = table.get_text()

            # 检查是否包含资产负债相关数据
            if '流动资产' in table_text or '非流动资产' in table_text:
                rows = table.find_all('tr')

                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 2:
                        continue

                    label = cells[0].get_text(strip='')

                    # 获取最新一期的值
                    if len(cells) > 1:
                        value = self._parse_number(cells[1].get_text(strip=''))

                        if label == '流动资产合计':
                            balance_sheet['current_assets'] = value
                        elif label == '流动负债合计':
                            balance_sheet['current_liabilities'] = value
                        elif label == '非流动负债合计':
                            balance_sheet['non_current_liabilities'] = value
                        elif label == '负债总计':
                            balance_sheet['total_liabilities'] = value
                        elif label == '股东权益合计':
                            balance_sheet['total_equity'] = value

                # 找到资产负债表后跳出
                break

        return balance_sheet

    def _extract_cash_flow(self, soup: BeautifulSoup) -> Dict[str, Optional[float]]:
        """
        提取现金流量表数据

        Args:
            soup: BeautifulSoup对象

        Returns:
            现金流量表关键数据
        """
        cash_flow = {}

        # 查找现金流量表 - 通常是第三个表格（a3）
        tables = soup.find_all('table', class_='tab05')

        for table in tables:
            table_text = table.get_text()

            # 检查是否包含现金流相关数据
            if '经营活动现金流量' in table_text or '投资活动现金流量' in table_text:
                rows = table.find_all('tr')

                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 2:
                        continue

                    label = cells[0].get_text(strip='')

                    # 获取最新一期的值
                    if len(cells) > 1:
                        value = self._parse_number(cells[1].get_text(strip=''))

                        if '经营' in label and '现金流量净额' in label:
                            cash_flow['operating_cash_flow'] = value
                        elif '投资' in label and '现金流量净额' in label:
                            cash_flow['investing_cash_flow'] = value
                        elif '筹资' in label and '现金流量净额' in label:
                            cash_flow['financing_cash_flow'] = value
                        elif '现金及现金等价物净增加额' in label:
                            cash_flow['net_increase'] = value

                # 找到现金流量表后跳出
                break

        return cash_flow

    def _calculate_ratios(
        self,
        profit_loss: Dict[str, Optional[float]],
        balance_sheet: Dict[str, Optional[float]]
    ) -> Dict[str, Optional[float]]:
        """
        计算财务比率

        Args:
            profit_loss: 损益表数据
            balance_sheet: 资产负债表数据

        Returns:
            计算得到的财务比率
        """
        ratios = {}

        # 计算毛利率 = (毛利 / 营业额) * 100
        if profit_loss.get('gross_profit') and profit_loss.get('revenue'):
            if profit_loss['revenue'] != 0:
                ratios['gross_profit_margin'] = round(
                    (profit_loss['gross_profit'] / profit_loss['revenue']) * 100, 2
                )

        # 计算净利率 = (净利润 / 营业额) * 100
        if profit_loss.get('net_profit') and profit_loss.get('revenue'):
            if profit_loss['revenue'] != 0:
                ratios['net_profit_margin'] = round(
                    (profit_loss['net_profit'] / profit_loss['revenue']) * 100, 2
                )

        # 计算流动比率 = 流动资产 / 流动负债
        if balance_sheet.get('current_assets') and balance_sheet.get('current_liabilities'):
            if balance_sheet['current_liabilities'] != 0:
                ratios['current_ratio'] = round(
                    balance_sheet['current_assets'] / balance_sheet['current_liabilities'], 2
                )

        # 计算负债率 = 总负债 / 总资产
        # 注意：新浪没有直接提供总资产，需要计算 = 总负债 + 股东权益
        if (balance_sheet.get('total_liabilities') and balance_sheet.get('total_equity')):
            total_assets = balance_sheet['total_liabilities'] + balance_sheet['total_equity']
            if total_assets != 0:
                ratios['debt_ratio'] = round(
                    (balance_sheet['total_liabilities'] / total_assets) * 100, 2
                )

        return ratios

    async def fetch_financial_indicators(self, stock_code: str) -> Dict[str, Any]:
        """
        爬取并计算财务指标

        Args:
            stock_code: 股票代码 (如: 01810.HK)

        Returns:
            财务指标字典，包含：
            - stock_code: 股票代码
            - datasource: 数据源
            - latest_period: 最新报告期信息
            - profitability: 盈利能力指标
            - financial_health: 财务健康指标
            - historical_data: 历史数据列表

        Raises:
            Exception: 爬取失败时抛出异常
        """
        # 标准化股票代码
        normalized_code = self.normalize_stock_code(stock_code)
        url = f"{self.BASE_URL}{normalized_code}.html"

        logger.info(f"[SinaFinanceCrawler] Fetching financial indicators for {stock_code} from {url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()

                # 设置正确的编码
                response.encoding = 'gb2312'

                # 解析 HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 提取各类财务数据
                key_financials = self._extract_key_financials(soup)
                profit_loss = self._extract_profit_loss(soup)
                balance_sheet = self._extract_balance_sheet(soup)
                cash_flow = self._extract_cash_flow(soup)

                # 计算财务比率
                ratios = self._calculate_ratios(profit_loss, balance_sheet)

                # 获取最新报告期的数据
                latest_period = key_financials[0] if key_financials else {}

                # 构建返回结果
                result = {
                    'stock_code': stock_code,
                    'datasource': self.DATASOURCE,
                    'latest_period': {
                        'end_date': latest_period.get('end_date'),
                        'report_type': latest_period.get('report_type'),
                        'announcement_date': latest_period.get('announcement_date'),
                    },
                    # 盈利能力
                    'profitability': {
                        'revenue': profit_loss.get('revenue'),  # 营业收入（百万元）
                        'net_profit': profit_loss.get('net_profit'),  # 净利润（百万元）
                        'gross_profit_margin': ratios.get('gross_profit_margin'),  # 毛利率（%）
                        'net_profit_margin': ratios.get('net_profit_margin'),  # 净利率（%）
                        'eps_basic': latest_period.get('eps_basic'),  # 基本每股盈利（仙）
                        'operating_profit': profit_loss.get('operating_profit'),  # 经营盈利（百万元）
                    },
                    # 财务健康
                    'financial_health': {
                        'current_ratio': ratios.get('current_ratio'),  # 流动比率
                        'debt_ratio': ratios.get('debt_ratio'),  # 负债率（%）
                        'operating_cash_flow': cash_flow.get('operating_cash_flow'),  # 经营现金流（百万元）
                        'current_assets': balance_sheet.get('current_assets'),  # 流动资产（百万元）
                        'current_liabilities': balance_sheet.get('current_liabilities'),  # 流动负债（百万元）
                        'total_equity': balance_sheet.get('total_equity'),  # 股东权益（百万元）
                    },
                    # 历史数据（最近8个报告期）
                    'historical_data': key_financials
                }

                logger.info(f"[SinaFinanceCrawler] Successfully fetched financial indicators for {stock_code}")

                return result

        except httpx.TimeoutException:
            logger.error(f"[SinaFinanceCrawler] Timeout fetching financial indicators for {stock_code}")
            raise Exception(f"请求超时: {url}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaFinanceCrawler] HTTP error {e.response.status_code} for {stock_code}")
            raise Exception(f"HTTP错误: {e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaFinanceCrawler] Error fetching financial indicators for {stock_code}: {str(e)}")
            raise Exception(f"爬取财务指标失败: {str(e)}")

    def fetch_financial_indicators_sync(self, stock_code: str) -> Dict[str, Any]:
        """
        同步方式爬取财务指标

        Args:
            stock_code: 股票代码 (如: 01810.HK)

        Returns:
            财务指标字典
        """
        import asyncio

        import asyncio

        # 使用 asyncio.run() 创建新的事件循环运行，避免与已存在的事件循环冲突
        return asyncio.run(self.fetch_financial_indicators(stock_code))


# 创建全局实例
sina_finance_crawler = SinaFinanceCrawler()
