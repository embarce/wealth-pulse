"""
新浪财经公司信息爬虫服务
爬取港股公司资料信息
"""
import logging
import re
from typing import Dict, Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SinaCompanyInfoCrawler:
    """新浪财经公司信息爬虫"""

    BASE_URL = "https://stock.finance.sina.com.cn/hkstock/info/"
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

    def _extract_table_data(self, soup: BeautifulSoup) -> Dict[str, str]:
        """
        从HTML中提取表格数据

        Args:
            soup: BeautifulSoup对象

        Returns:
            提取的公司信息字典
        """
        company_info = {}

        # 查找公司资料表格
        table = soup.find('table', class_='tab05')

        if not table:
            logger.warning("[SinaCompanyInfoCrawler] Company info table not found")
            return company_info

        # 遍历表格行
        for row in table.find_all('tr'):
            cells = row.find_all('td')

            if len(cells) >= 2:
                label_cell = cells[0]
                value_cell = cells[1]

                # 获取标签和值
                label = label_cell.get_text(strip=True)
                value = value_cell.get_text(strip=True)

                # 移除标签中的多余空格和特殊字符
                label = re.sub(r'\s+', '', label)

                # 映射到标准字段名
                field_mapping = {
                    '证劵代码': 'security_code',
                    '公司名称(中文)': 'company_name_cn',
                    '公司名称(英文)': 'company_name_en',
                    '公司业务': 'business_description',
                    '所属行业': 'industry',
                    '港股股份数目': 'total_shares',
                    '主席': 'chairman',
                    '主要持股人': 'major_shareholders',
                    '董事': 'directors',
                    '公司秘书': 'company_secretary',
                    '注册办事处': 'registered_office',
                    '公司总部': 'headquarters',
                    '股份过户登记处': 'share_registrar',
                    '核数师': 'auditor',
                    '主要往来银行': 'main_bank',
                    '法律顾问': 'legal_advisor',
                    '公司网址': 'website',
                    '电邮地址': 'email',
                    '电话号码': 'phone',
                    '传真号码': 'fax'
                }

                # 使用映射后的字段名
                if label in field_mapping:
                    field_name = field_mapping[label]
                    company_info[field_name] = value

        return company_info

    async def fetch_company_info(self, stock_code: str) -> Dict[str, Optional[str]]:
        """
        爬取指定股票的公司信息

        Args:
            stock_code: 股票代码 (如: 01810.HK)

        Returns:
            公司信息字典，包含以下字段:
            - security_code: 证券代码
            - company_name_cn: 公司名称(中文)
            - company_name_en: 公司名称(英文)
            - business_description: 公司业务
            - industry: 所属行业
            - total_shares: 港股股份数目
            - chairman: 主席
            - major_shareholders: 主要持股人
            - directors: 董事
            - company_secretary: 公司秘书
            - registered_office: 注册办事处
            - headquarters: 公司总部
            - share_registrar: 股份过户登记处
            - auditor: 核数师
            - main_bank: 主要往来银行
            - legal_advisor: 法律顾问
            - website: 公司网址
            - email: 电邮地址
            - phone: 电话号码
            - fax: 传真号码
            - datasource: 数据源(固定为"新浪财经")

        Raises:
            Exception: 爬取失败时抛出异常
        """
        # 标准化股票代码
        normalized_code = self.normalize_stock_code(stock_code)
        url = f"{self.BASE_URL}{normalized_code}.html"

        logger.info(f"[SinaCompanyInfoCrawler] Fetching company info for {stock_code} from {url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()

                # 设置正确的编码
                response.encoding = 'gb2312'

                # 解析 HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 提取表格数据
                company_info = self._extract_table_data(soup)

                # 添加数据源
                company_info['datasource'] = self.DATASOURCE

                # 添加原始股票代码
                company_info['stock_code'] = stock_code

                if not company_info or len(company_info) <= 2:  # 只有datasource和stock_code
                    logger.warning(f"[SinaCompanyInfoCrawler] No company info found for {stock_code}")
                    return {}

                logger.info(f"[SinaCompanyInfoCrawler] Successfully fetched company info for {stock_code} with {len(company_info)} fields")

                return company_info

        except httpx.TimeoutException:
            logger.error(f"[SinaCompanyInfoCrawler] Timeout fetching company info for {stock_code}")
            raise Exception(f"请求超时: {url}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaCompanyInfoCrawler] HTTP error {e.response.status_code} for {stock_code}")
            raise Exception(f"HTTP错误: {e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaCompanyInfoCrawler] Error fetching company info for {stock_code}: {str(e)}")
            raise Exception(f"爬取公司信息失败: {str(e)}")

    def fetch_company_info_sync(self, stock_code: str) -> Dict[str, Optional[str]]:
        """
        同步方式爬取指定股票的公司信息

        Args:
            stock_code: 股票代码 (如: 01810.HK)

        Returns:
            公司信息字典
        """
        import asyncio

        # 使用 asyncio.run() 创建新的事件循环运行，避免与已存在的事件循环冲突
        return asyncio.run(self.fetch_company_info(stock_code))


# 创建全局实例
sina_company_info_crawler = SinaCompanyInfoCrawler()
