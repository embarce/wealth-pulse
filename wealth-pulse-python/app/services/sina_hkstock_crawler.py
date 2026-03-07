"""
新浪港股信息爬虫服务
爬取港股市场要闻、大行研报、公司新闻
"""
import logging
from typing import List, Dict, Optional, Tuple
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SinaHKStockCrawler:
    """新浪港股信息爬虫"""

    # 基础 URL
    BASE_URL = "https://finance.sina.com.cn/stock/hkstock/"
    # 大行研报列表页 URL
    RANK_LIST_URL = "https://finance.sina.com.cn/roll/c/57028.shtml"
    # 公司新闻列表页 URL
    COMPANY_NEWS_LIST_URL = "https://finance.sina.com.cn/roll/c/57038.shtml"

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

    async def fetch_hkstock_news(self) -> Dict:
        """
        爬取港股首页新闻，获取要闻、大行研报链接、公司新闻链接

        Returns:
            包含以下内容的字典:
            - important_news: 要闻列表，每条包含 title, url, datasource
            - rank_url: 大行研报列表页 URL (None 表示未获取到)
            - company_news_url: 公司新闻列表页 URL (None 表示未获取到)
            - rank_url_fallback: 是否使用默认研报 URL
            - company_news_url_fallback: 是否使用默认公司新闻 URL
        """
        logger.info(f"[SinaHKStockCrawler] Fetching news from {self.BASE_URL}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = await client.get(self.BASE_URL)
                response.raise_for_status()

                # 设置正确的编码
                response.encoding = 'gb2312'

                # 解析 HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 1. 获取要闻 (ywkx 下的新闻)
                important_news = self._extract_important_news(soup)

                # 2. 获取大行研报 URL
                rank_url = self._extract_rank_url(soup)
                rank_url_fallback = False
                if not rank_url:
                    logger.warning("[SinaHKStockCrawler] 未获取到大行研报 URL，将使用默认 URL")
                    print("⚠️  警告：未获取到大行研报 URL，将使用默认 URL")
                    rank_url = self.RANK_LIST_URL
                    rank_url_fallback = True

                # 3. 获取公司新闻 URL
                company_news_url = self._extract_company_news_url(soup)
                company_news_url_fallback = False
                if not company_news_url:
                    logger.warning("[SinaHKStockCrawler] 未获取到公司新闻 URL，将使用默认 URL")
                    print("⚠️  警告：未获取到公司新闻 URL，将使用默认 URL")
                    company_news_url = self.COMPANY_NEWS_LIST_URL
                    company_news_url_fallback = True

                result = {
                    'important_news': important_news,
                    'rank_url': rank_url,
                    'company_news_url': company_news_url,
                    'rank_url_fallback': rank_url_fallback,
                    'company_news_url_fallback': company_news_url_fallback
                }

                logger.info(f"[SinaHKStockCrawler] Successfully fetched {len(important_news)} important news")
                return result

        except httpx.TimeoutException:
            logger.error(f"[SinaHKStockCrawler] Timeout fetching news")
            raise Exception(f"请求超时：{self.BASE_URL}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaHKStockCrawler] HTTP error {e.response.status_code}")
            raise Exception(f"HTTP 错误：{e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaHKStockCrawler] Error fetching news: {str(e)}")
            raise Exception(f"爬取新闻失败：{str(e)}")

    def _extract_important_news(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """
        提取要闻列表

        Args:
            soup: BeautifulSoup 对象

        Returns:
            要闻列表，每条包含 title, url, datasource
        """
        news_items = []

        # 查找 ywkx 容器
        ywkx_div = soup.find('div', class_='ywkx')
        if not ywkx_div:
            logger.warning("[SinaHKStockCrawler] No ywkx div found")
            return news_items

        # 查找要闻内容区域
        tab_body = ywkx_div.find('div', class_='tab-body02')
        if not tab_body:
            logger.warning("[SinaHKStockCrawler] No tab-body02 div found")
            return news_items

        # 查找新闻列表
        news_lists = tab_body.find_all('ul', class_='news-item')

        for news_list in news_lists:
            for li in news_list.find_all('li'):
                link_tag = li.find('a')
                if not link_tag:
                    continue

                title = link_tag.get('title', '').strip()
                if not title:
                    title = link_tag.text.strip()

                url = link_tag.get('href', '').strip()

                if title and url:
                    news_items.append({
                        'title': title,
                        'url': url,
                        'datasource': self.DATASOURCE
                    })

        return news_items

    def _extract_rank_url(self, soup: BeautifulSoup) -> Optional[str]:
        """
        提取大行研报列表页 URL

        Args:
            soup: BeautifulSoup 对象

        Returns:
            大行研报列表页 URL
        """
        # 查找包含"大行研报"的链接
        for link in soup.find_all('a'):
            text = link.text.strip()
            if '大行研报' in text:
                url = link.get('href', '').strip()
                if url:
                    return urljoin(self.BASE_URL, url)

        return None

    def _extract_company_news_url(self, soup: BeautifulSoup) -> Optional[str]:
        """
        提取公司新闻列表页 URL

        Args:
            soup: BeautifulSoup 对象

        Returns:
            公司新闻列表页 URL
        """
        # 查找包含"公司新闻"的链接
        for link in soup.find_all('a'):
            text = link.text.strip()
            if '公司新闻' in text:
                url = link.get('href', '').strip()
                if url:
                    return urljoin(self.BASE_URL, url)

        return None

    async def fetch_rank_news(self, url: Optional[str] = None, skip_if_url_missing: bool = False) -> Dict:
        """
        爬取大行研报新闻列表

        Args:
            url: 大行研报列表页 URL，如果为 None 则使用默认 URL
            skip_if_url_missing: 如果 URL 缺失是否跳过（返回空列表），默认 False

        Returns:
            字典，包含:
            - news: 研报新闻列表
            - url_used: 实际使用的 URL
            - url_fallback: 是否使用了默认 URL
            - skipped: 是否跳过爬取
        """
        result = {
            'news': [],
            'url_used': None,
            'url_fallback': False,
            'skipped': False
        }

        # 如果没有提供 URL，尝试从首页获取
        if url is None:
            try:
                logger.info("[SinaHKStockCrawler] Fetching rank URL from homepage")
                async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                    response = await client.get(self.BASE_URL)
                    response.raise_for_status()
                    response.encoding = 'gb2312'
                    soup = BeautifulSoup(response.text, 'html.parser')
                    url = self._extract_rank_url(soup)
            except Exception as e:
                logger.warning(f"[SinaHKStockCrawler] Failed to fetch homepage: {str(e)}")
                url = None

        # 处理 URL 缺失情况
        if url is None:
            url = self.RANK_LIST_URL
            result['url_fallback'] = True
            logger.warning(f"[SinaHKStockCrawler] 未获取到大行研报 URL，使用默认 URL: {url}")
            print(f"⚠️  警告：未获取到大行研报 URL，使用默认 URL")

        if skip_if_url_missing and result['url_fallback']:
            logger.info("[SinaHKStockCrawler] Skipping rank news fetch due to URL missing")
            result['skipped'] = True
            return result

        target_url = url
        result['url_used'] = target_url
        logger.info(f"[SinaHKStockCrawler] Fetching rank news from {target_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = await client.get(target_url)
                response.raise_for_status()

                # 设置正确的编码
                response.encoding = 'gb2312'

                # 解析 HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 查找新闻列表
                news_items = self._extract_rank_news_items(soup)
                result['news'] = news_items

                logger.info(f"[SinaHKStockCrawler] Successfully fetched {len(news_items)} rank news")
                return result

        except httpx.TimeoutException:
            logger.error(f"[SinaHKStockCrawler] Timeout fetching rank news")
            raise Exception(f"请求超时：{target_url}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaHKStockCrawler] HTTP error {e.response.status_code} for rank news")
            raise Exception(f"HTTP 错误：{e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaHKStockCrawler] Error fetching rank news: {str(e)}")
            raise Exception(f"爬取研报失败：{str(e)}")

    def _extract_rank_news_items(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """
        提取研报新闻列表

        Args:
            soup: BeautifulSoup 对象

        Returns:
            研报新闻列表
        """
        news_items = []

        # 查找 listcontent 列表
        list_content = soup.find('ul', id='listcontent')
        if not list_content:
            logger.warning("[SinaHKStockCrawler] No listcontent ul found")
            return news_items

        for li in list_content.find_all('li'):
            # 跳过空白项
            if not li.text.strip():
                continue

            link_tag = li.find('a')
            if not link_tag:
                continue

            title = link_tag.get('title', '').strip()
            if not title:
                title = link_tag.text.strip()

            url = link_tag.get('href', '').strip()

            # 提取发布时间 (span 标签)
            time_tag = li.find('span')
            publish_time = time_tag.text.strip() if time_tag else None

            if title and url:
                news_items.append({
                    'title': title,
                    'url': url,
                    'datasource': self.DATASOURCE,
                    'publish_time': publish_time
                })

        return news_items

    async def fetch_company_news(self, url: Optional[str] = None, skip_if_url_missing: bool = False) -> Dict:
        """
        爬取公司新闻列表

        Args:
            url: 公司新闻列表页 URL，如果为 None 则使用默认 URL
            skip_if_url_missing: 如果 URL 缺失是否跳过（返回空列表），默认 False

        Returns:
            字典，包含:
            - news: 公司新闻列表
            - url_used: 实际使用的 URL
            - url_fallback: 是否使用了默认 URL
            - skipped: 是否跳过爬取
        """
        result = {
            'news': [],
            'url_used': None,
            'url_fallback': False,
            'skipped': False
        }

        # 如果没有提供 URL，尝试从首页获取
        if url is None:
            try:
                logger.info("[SinaHKStockCrawler] Fetching company news URL from homepage")
                async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                    response = await client.get(self.BASE_URL)
                    response.raise_for_status()
                    response.encoding = 'gb2312'
                    soup = BeautifulSoup(response.text, 'html.parser')
                    url = self._extract_company_news_url(soup)
            except Exception as e:
                logger.warning(f"[SinaHKStockCrawler] Failed to fetch homepage: {str(e)}")
                url = None

        # 处理 URL 缺失情况
        if url is None:
            url = self.COMPANY_NEWS_LIST_URL
            result['url_fallback'] = True
            logger.warning(f"[SinaHKStockCrawler] 未获取到公司新闻 URL，使用默认 URL: {url}")
            print(f"⚠️  警告：未获取到公司新闻 URL，使用默认 URL")

        if skip_if_url_missing and result['url_fallback']:
            logger.info("[SinaHKStockCrawler] Skipping company news fetch due to URL missing")
            result['skipped'] = True
            return result

        target_url = url
        result['url_used'] = target_url
        logger.info(f"[SinaHKStockCrawler] Fetching company news from {target_url}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = await client.get(target_url)
                response.raise_for_status()

                # 设置正确的编码
                response.encoding = 'gb2312'

                # 解析 HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 查找新闻列表
                news_items = self._extract_company_news_items(soup)
                result['news'] = news_items

                logger.info(f"[SinaHKStockCrawler] Successfully fetched {len(news_items)} company news")
                return result

        except httpx.TimeoutException:
            logger.error(f"[SinaHKStockCrawler] Timeout fetching company news")
            raise Exception(f"请求超时：{target_url}")

        except httpx.HTTPStatusError as e:
            logger.error(f"[SinaHKStockCrawler] HTTP error {e.response.status_code} for company news")
            raise Exception(f"HTTP 错误：{e.response.status_code}")

        except Exception as e:
            logger.error(f"[SinaHKStockCrawler] Error fetching company news: {str(e)}")
            raise Exception(f"爬取公司新闻失败：{str(e)}")

    def _extract_company_news_items(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """
        提取公司新闻列表

        Args:
            soup: BeautifulSoup 对象

        Returns:
            公司新闻列表
        """
        news_items = []

        # 查找 listcontent 列表
        list_content = soup.find('ul', id='listcontent')
        if not list_content:
            logger.warning("[SinaHKStockCrawler] No listcontent ul found")
            return news_items

        for li in list_content.find_all('li'):
            # 跳过空白项
            if not li.text.strip():
                continue

            link_tag = li.find('a')
            if not link_tag:
                continue

            title = link_tag.get('title', '').strip()
            if not title:
                title = link_tag.text.strip()

            url = link_tag.get('href', '').strip()

            # 提取发布时间 (span 标签)
            time_tag = li.find('span')
            publish_time = time_tag.text.strip() if time_tag else None

            if title and url:
                news_items.append({
                    'title': title,
                    'url': url,
                    'datasource': self.DATASOURCE,
                    'publish_time': publish_time
                })

        return news_items

    async def fetch_all_news(self) -> Dict:
        """
        爬取所有港股新闻（要闻 + 研报 + 公司新闻）

        Returns:
            包含以下内容的字典:
            - important_news: 要闻列表
            - rank_news: 大行研报列表 (None 表示跳过)
            - company_news: 公司新闻列表 (None 表示跳过)
            - summary: 汇总统计信息
            - warnings: 警告信息列表
        """
        logger.info("[SinaHKStockCrawler] Fetching all HK stock news")
        warnings = []

        try:
            # 1. 先获取首页，获取要闻和列表页 URL
            home_result = await self.fetch_hkstock_news()

            # 收集警告信息
            if home_result.get('rank_url_fallback'):
                warnings.append("未获取到大行研报 URL，使用默认 URL")
            if home_result.get('company_news_url_fallback'):
                warnings.append("未获取到公司新闻 URL，使用默认 URL")

            rank_news = []
            company_news = []

            # 2. 获取研报和公司新闻
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                # 获取研报新闻
                try:
                    rank_response = await client.get(home_result['rank_url'])
                    rank_response.raise_for_status()
                    rank_response.encoding = 'gb2312'
                    rank_soup = BeautifulSoup(rank_response.text, 'html.parser')
                    rank_news = self._extract_rank_news_items(rank_soup)
                    logger.info(f"[SinaHKStockCrawler] Successfully fetched {len(rank_news)} rank news")
                except Exception as e:
                    error_msg = f"爬取大行研报失败：{str(e)}"
                    logger.error(f"[SinaHKStockCrawler] {error_msg}")
                    warnings.append(f"跳过：大行研报爬取失败 - {str(e)}")
                    print(f"⚠️  警告：跳过大行研报 - {str(e)}")

                # 获取公司新闻
                try:
                    company_response = await client.get(home_result['company_news_url'])
                    company_response.raise_for_status()
                    company_response.encoding = 'gb2312'
                    company_soup = BeautifulSoup(company_response.text, 'html.parser')
                    company_news = self._extract_company_news_items(company_soup)
                    logger.info(f"[SinaHKStockCrawler] Successfully fetched {len(company_news)} company news")
                except Exception as e:
                    error_msg = f"爬取公司新闻失败：{str(e)}"
                    logger.error(f"[SinaHKStockCrawler] {error_msg}")
                    warnings.append(f"跳过：公司新闻爬取失败 - {str(e)}")
                    print(f"⚠️  警告：跳过公司新闻 - {str(e)}")

            result = {
                'important_news': home_result['important_news'],
                'rank_news': rank_news,
                'company_news': company_news,
                'summary': {
                    'important_news_count': len(home_result['important_news']),
                    'rank_news_count': len(rank_news),
                    'company_news_count': len(company_news),
                    'total_count': len(home_result['important_news']) + len(rank_news) + len(company_news)
                },
                'warnings': warnings
            }

            logger.info(f"[SinaHKStockCrawler] Successfully fetched all news, total: {result['summary']['total_count']}")
            if warnings:
                logger.warning(f"[SinaHKStockCrawler] Warnings: {warnings}")
            return result

        except Exception as e:
            logger.error(f"[SinaHKStockCrawler] Error fetching all news: {str(e)}")
            raise Exception(f"爬取所有新闻失败：{str(e)}")

    def fetch_all_news_sync(self) -> Dict:
        """
        同步方式爬取所有港股新闻

        Returns:
            包含所有新闻的字典
        """
        import asyncio

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.fetch_all_news())


# 创建全局实例
sina_hkstock_crawler = SinaHKStockCrawler()
