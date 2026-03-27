"""
新浪港股新闻爬虫 API
提供港股要闻、大行研报、公司新闻的爬取接口
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import ApiException
from app.core.security import get_current_user
from app.schemas.common import success_response, ResponseCode
from app.services.sina_hkstock_crawler import SinaHKStockCrawler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hkstock", tags=["hkstock"])


@router.get("/news/home", summary="Get HK stock homepage news")
async def get_homepage_news(
        current_user: dict = Depends(get_current_user)
):
    """
    获取港股首页新闻（要闻 + 研报 URL+ 公司新闻 URL）(requires authentication)

    爬取新浪财经港股频道的首页新闻，包括：
    - 要闻列表
    - 大行研报列表页 URL
    - 公司新闻列表页 URL

    **Data Source:**
    - Sina Finance (https://finance.sina.com.cn/stock/hkstock/)

    **Returned Fields:**
    - important_news: 要闻列表
    - rank_url: 大行研报列表页 URL
    - company_news_url: 公司新闻列表页 URL
    - rank_url_fallback: 是否使用默认研报 URL
    - company_news_url_fallback: 是否使用默认公司新闻 URL

    **Note:**
    - 如果无法从页面获取到研报/公司新闻 URL，会使用默认 URL 并返回 warning
    - 要闻数据直接返回，研报和公司新闻需要调用对应的详情接口
    """
    try:
        crawler = SinaHKStockCrawler()
        result = await crawler.fetch_hkstock_news()

        logger.info(f"[HKStockNews] Successfully fetched homepage news: {len(result['important_news'])} items")

        return success_response(
            data=result,
            msg="Homepage news retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error fetching homepage news: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve homepage news: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/news/rank", summary="Get HK stock analyst reports")
async def get_rank_news(
        url: Optional[str] = Query(None, description="自定义研报列表页 URL"),
        skip_if_url_missing: bool = Query(False, description="如果 URL 缺失是否跳过爬取"),
        current_user: dict = Depends(get_current_user)
):
    """
    获取港股大行研报 (requires authentication)

    爬取新浪财经港股频道的大行研报列表（第一页）

    **Query Parameters:**
    - `url`: 可选，自定义研报列表页 URL，如果不传则从首页获取或使用默认 URL
    - `skip_if_url_missing`: 可选，如果 URL 缺失是否跳过爬取（返回空列表），默认 False

    **Data Source:**
    - Sina Finance (https://finance.sina.com.cn/roll/c/57028.shtml)

    **Returned Fields:**
    - news: 研报新闻列表
    - url_used: 实际使用的 URL
    - url_fallback: 是否使用了默认 URL
    - skipped: 是否跳过爬取

    **News Item Fields:**
    - title: 新闻标题
    - url: 新闻链接
    - datasource: 数据来源（固定为"新浪财经"）
    - publish_time: 发布时间
    """
    try:
        crawler = SinaHKStockCrawler()
        result = await crawler.fetch_rank_news(url=url, skip_if_url_missing=skip_if_url_missing)

        logger.info(f"[HKStockNews] Successfully fetched rank news: {len(result['news'])} items")

        return success_response(
            data=result,
            msg="Rank news retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error fetching rank news: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve rank news: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/news/company", summary="Get HK stock company news")
async def get_company_news(
        url: Optional[str] = Query(None, description="自定义公司新闻列表页 URL"),
        skip_if_url_missing: bool = Query(False, description="如果 URL 缺失是否跳过爬取"),
        current_user: dict = Depends(get_current_user)
):
    """
    获取港股公司新闻 (requires authentication)

    爬取新浪财经港股频道的公司新闻列表（第一页）

    **Query Parameters:**
    - `url`: 可选，自定义公司新闻列表页 URL，如果不传则从首页获取或使用默认 URL
    - `skip_if_url_missing`: 可选，如果 URL 缺失是否跳过爬取（返回空列表），默认 False

    **Data Source:**
    - Sina Finance (https://finance.sina.com.cn/roll/c/57038.shtml)

    **Returned Fields:**
    - news: 公司新闻列表
    - url_used: 实际使用的 URL
    - url_fallback: 是否使用了默认 URL
    - skipped: 是否跳过爬取

    **News Item Fields:**
    - title: 新闻标题
    - url: 新闻链接
    - datasource: 数据来源（固定为"新浪财经"）
    - publish_time: 发布时间
    """
    try:
        crawler = SinaHKStockCrawler()
        result = await crawler.fetch_company_news(url=url, skip_if_url_missing=skip_if_url_missing)

        logger.info(f"[HKStockNews] Successfully fetched company news: {len(result['news'])} items")

        return success_response(
            data=result,
            msg="Company news retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Error fetching company news: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve company news: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/news/all", summary="Get all HK stock news")
async def get_all_news(
        current_user: dict = Depends(get_current_user)
):
    """
    获取所有港股新闻（汇总）(requires authentication)

    一次性获取所有港股相关新闻，包括：
    - 要闻
    - 大行研报
    - 公司新闻

    **Data Source:**
    - Sina Finance (https://finance.sina.com.cn/stock/hkstock/)

    **Returned Fields:**
    - important_news: 要闻列表
    - rank_news: 大行研报列表
    - company_news: 公司新闻列表
    - summary: 汇总统计信息
        - important_news_count: 要闻数量
        - rank_news_count: 研报数量
        - company_news_count: 公司新闻数量
        - total_count: 总新闻数量
    - warnings: 警告信息列表

    **Note:**
    - 如果某个分类爬取失败，会返回 warning 但不会影响其他分类的数据
    - 失败的分类返回空列表
    """
    try:
        crawler = SinaHKStockCrawler()
        result = await crawler.fetch_all_news()

        logger.info(f"[HKStockNews] Successfully fetched all news: {result['summary']['total_count']} items")

        return success_response(
            data=result,
            msg=f"All news retrieved successfully: {result['summary']['total_count']} items"
        )

    except Exception as e:
        logger.error(f"Error fetching all news: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve all news: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )


@router.get("/news/all-raw", summary="Get all HK stock news")
async def get_all_news_raw():
    """
    获取所有港股新闻（原始数据，无需认证）

    一次性获取所有港股相关新闻，包括：
    - 要闻
    - 大行研报
    - 公司新闻

    此接口不需要认证，供 Java 后端内部调用使用

    **Data Source:**
    - Sina Finance (https://finance.sina.com.cn/stock/hkstock/)

    **Returned Fields:**
    - important_news: 要闻列表
    - rank_news: 大行研报列表
    - company_news: 公司新闻列表
    - summary: 汇总统计信息
        - important_news_count: 要闻数量
        - rank_news_count: 研报数量
        - company_news_count: 公司新闻数量
        - total_count: 总新闻数量
    - warnings: 警告信息列表

    **Note:**
    - 如果某个分类爬取失败，会返回 warning 但不会影响其他分类的数据
    - 失败的分类返回空列表
    """
    try:
        crawler = SinaHKStockCrawler()
        result = await crawler.fetch_all_news()

        logger.info(f"[HKStockNews] Successfully fetched all news: {result['summary']['total_count']} items")

        return success_response(
            data=result,
            msg=f"All news retrieved successfully: {result['summary']['total_count']} items"
        )

    except Exception as e:
        logger.error(f"Error fetching all news: {str(e)}")
        raise ApiException(
            msg=f"Failed to retrieve all news: {str(e)}",
            code=ResponseCode.INTERNAL_ERROR
        )
