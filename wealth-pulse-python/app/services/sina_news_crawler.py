"""
新浪财经新闻爬虫服务
爬取港股个股新闻资讯
"""
import logging
import re
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SinaNewsCrawler:
    """新浪财经新闻爬虫"""

    BASE_URL = "https://stock.finance.sina.com.cn/hkstock/news/"
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
            stock_code: 股票代码 (如: 0700.HK, 09868.HK)

        Returns:
            新浪格式的股票代码 (如: 00700, 09868)
        """
        # 移除 .HK 后缀
        code = stock_code.replace('.HK', '').replace('.hk', '')

        # 补齐到5位
        if len(code) < 5:
            code = code.zfill(5)

        return code

    async def fetch_stock_news(self, stock_code: str) -> List[Dict[str, str]]:
        """
        爬取指定股票的新闻列表

        Args:
            stock_code: 股票代码 (如: 0700.HK)

        Returns:
            新闻列表，每条新闻包含:
            - title: 新闻标题
            - url: 新闻链接
            - datasource: 数据源(固定为"新浪财经")
            - publish_time: 发布时间(如果存在)

        Raises:
            Exception: 爬取失败时抛出异常
        """
        # 标准化股票代码
        normalized_code = self.normalize_stock_code(stock_code)
        url = f"{self.BASE_URL}{normalized_code}.html"

        logger.info(f"[SinaNewsCrawler] Fetching news for {stock_code} from {url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()

                # 设置正确的编码
                response.encoding = 'gb2312'

                # 解析 HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 查找新闻列表
                news_list = soup.find('ul', class_='list01', id='js_ggzx')

                if not news_list:
                    logger.warning(f"[SinaNewsCrawler] No news list found for {stock_code}")
                    return []

                # 提取新闻项
                news_items = []
                list_items = news_list.find_all('li')

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

                    news_url = link_tag.get('href', '').strip()

                    # 提取发布时间
                    time_tag = li.find('span', class_='rt')
                    publish_time = time_tag.text.strip() if time_tag else None

                    # 只添加有效新闻
                    if title and news_url:
                        news_items.append({
                            'title': title,
                            'url': news_url,
                            'datasource': self.DATASOURCE,
                            'publish_time': publish_time
                        })

                logger.info(f"[SinaNewsCrawler] Successfully fetched {len(news_items)} news for {stock_code}")
                return news_items

        except httpx.TimeoutException:
            logger.error(f"[SinaNewsCrawler] Timeout fetching news for {stock_code}")
            raise Exception(f"请求超时: {url}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaNewsCrawler] HTTP error {e.response.status_code} for {stock_code}")
            raise Exception(f"HTTP错误: {e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaNewsCrawler] Error fetching news for {stock_code}: {str(e)}")
            raise Exception(f"爬取新闻失败: {str(e)}")

    def fetch_stock_news_sync(self, stock_code: str) -> List[Dict[str, str]]:
        """
        同步方式爬取指定股票的新闻列表

        Args:
            stock_code: 股票代码 (如: 0700.HK)

        Returns:
            新闻列表
        """
        import asyncio

        import asyncio

        # 使用 asyncio.run() 创建新的事件循环运行，避免与已存在的事件循环冲突
        return asyncio.run(self.fetch_stock_news(stock_code))


# 创建全局实例
sina_news_crawler = SinaNewsCrawler()
