"""
新浪财经公司公告爬虫服务
爬取港股公司公告信息
"""
import logging
import re
from typing import List, Dict

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SinaCompanyNoticeCrawler:
    """新浪财经公司公告爬虫"""

    BASE_URL = "https://stock.finance.sina.com.cn/hkstock/notice/"
    DATASOURCE = "新浪财经"

    def __init__(self, timeout: int = 30):
        """
        初始化爬虫

        Args:
            timeout: 请求超时时间 (秒)
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
            stock_code: 股票代码 (如：0700.HK, 09868.HK)

        Returns:
            新浪格式的股票代码 (如：00700, 09868)
        """
        # 移除 .HK 后缀
        code = stock_code.replace('.HK', '').replace('.hk', '')

        # 补齐到 5 位
        if len(code) < 5:
            code = code.zfill(5)

        return code

    async def fetch_company_notices(
        self,
        stock_code: str,
        max_pages: int = 1
    ) -> List[Dict[str, str]]:
        """
        爬取指定股票的公司公告列表

        Args:
            stock_code: 股票代码 (如：09868.HK)
            max_pages: 最大爬取页数 (默认 1 页)

        Returns:
            公告列表，每条公告包含:
            - title: 公告标题
            - url: 公告链接
            - datasource: 数据源 (固定为"新浪财经")
            - publish_time: 发布时间 (如果存在)

        Raises:
            Exception: 爬取失败时抛出异常
        """
        # 标准化股票代码
        normalized_code = self.normalize_stock_code(stock_code)
        url = f"{self.BASE_URL}{normalized_code}.html"

        logger.info(f"[SinaCompanyNoticeCrawler] Fetching notices for {stock_code} from {url}")

        all_notices = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                for page in range(1, max_pages + 1):
                    # 如果是第一页，使用原始 URL；否则使用分页 URL
                    if page == 1:
                        page_url = url
                    else:
                        page_url = f"https://stock.finance.sina.com.cn/hkstock/go/CompanyNotice/page/{page}/code/{normalized_code}.html"

                    logger.info(f"[SinaCompanyNoticeCrawler] Fetching page {page}: {page_url}")

                    response = await client.get(page_url)
                    response.raise_for_status()

                    # 设置正确的编码
                    response.encoding = 'gb2312'

                    # 解析 HTML
                    soup = BeautifulSoup(response.text, 'html.parser')

                    # 查找公告列表
                    notice_list = soup.find('ul', class_='list01')

                    if not notice_list:
                        logger.warning(f"[SinaCompanyNoticeCrawler] No notice list found on page {page}")
                        break

                    # 提取公告项
                    page_notices = []
                    list_items = notice_list.find_all('li')

                    for li in list_items:
                        # 跳过空白项
                        if not li.text.strip():
                            continue

                        # 提取链接和标题
                        link_tag = li.find('a')
                        if not link_tag:
                            continue

                        title = link_tag.get('title', '').strip()
                        if not title:
                            title = link_tag.text.strip()

                        notice_url = link_tag.get('href', '').strip()

                        # 提取发布时间
                        time_tag = li.find('span', class_='rt')
                        publish_time = time_tag.text.strip() if time_tag else None

                        # 只添加有效公告
                        if title and notice_url:
                            page_notices.append({
                                'title': title,
                                'url': notice_url,
                                'datasource': self.DATASOURCE,
                                'publish_time': publish_time
                            })

                    if not page_notices:
                        logger.warning(f"[SinaCompanyNoticeCrawler] No notices found on page {page}")
                        break

                    all_notices.extend(page_notices)
                    logger.info(f"[SinaCompanyNoticeCrawler] Found {len(page_notices)} notices on page {page}")

                    # 检查是否还有下一页
                    # 如果页面上的公告数量明显少于 30 条，说明可能是最后一页
                    if len(page_notices) < 25:
                        break

            logger.info(f"[SinaCompanyNoticeCrawler] Successfully fetched {len(all_notices)} notices for {stock_code}")

            return all_notices

        except httpx.TimeoutException:
            logger.error(f"[SinaCompanyNoticeCrawler] Timeout fetching notices for {stock_code}")
            raise Exception(f"请求超时：{url}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaCompanyNoticeCrawler] HTTP error {e.response.status_code} for {stock_code}")
            raise Exception(f"HTTP 错误：{e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaCompanyNoticeCrawler] Error fetching notices for {stock_code}: {str(e)}")
            raise Exception(f"爬取公司公告失败：{str(e)}")


# 创建全局实例
sina_company_notice_crawler = SinaCompanyNoticeCrawler()
