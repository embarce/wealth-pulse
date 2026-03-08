"""
新浪港股新闻爬虫相关的 Schema 定义
"""
from pydantic import BaseModel, Field
from typing import List, Optional


# ==================== 新闻爬取相关模型 ====================

class HKStockNewsItem(BaseModel):
    """港股新闻条目"""
    title: str = Field(..., description="新闻标题")
    url: str = Field(..., description="新闻链接")
    datasource: str = Field(default="新浪财经", description="数据来源")
    publish_time: Optional[str] = Field(None, description="发布时间")


class HKStockImportantNews(BaseModel):
    """港股要闻"""
    title: str = Field(..., description="新闻标题")
    url: str = Field(..., description="新闻链接")
    datasource: str = Field(default="新浪财经", description="数据来源")


class HKStockNewsSummary(BaseModel):
    """港股新闻汇总统计"""
    important_news_count: int = Field(..., description="要闻数量")
    rank_news_count: int = Field(..., description="研报数量")
    company_news_count: int = Field(..., description="公司新闻数量")
    total_count: int = Field(..., description="总新闻数量")


class HKStockNewsResult(BaseModel):
    """港股新闻爬取结果"""
    important_news: List[HKStockImportantNews] = Field(default_factory=list, description="要闻列表")
    rank_news: Optional[List[HKStockNewsItem]] = Field(default_factory=list, description="大行研报列表")
    company_news: Optional[List[HKStockNewsItem]] = Field(default_factory=list, description="公司新闻列表")
    summary: HKStockNewsSummary = Field(..., description="汇总统计")
    warnings: Optional[List[str]] = Field(default_factory=list, description="警告信息列表")


class HKStockHomePageResult(BaseModel):
    """港股首页新闻爬取结果"""
    important_news: List[HKStockImportantNews] = Field(default_factory=list, description="要闻列表")
    rank_url: Optional[str] = Field(None, description="大行研报列表页 URL")
    company_news_url: Optional[str] = Field(None, description="公司新闻列表页 URL")
    rank_url_fallback: bool = Field(default=False, description="是否使用默认研报 URL")
    company_news_url_fallback: bool = Field(default=False, description="是否使用默认公司新闻 URL")


class HKStockSingleNewsResult(BaseModel):
    """单个新闻列表爬取结果（研报/公司新闻）"""
    news: List[HKStockNewsItem] = Field(default_factory=list, description="新闻列表")
    url_used: Optional[str] = Field(None, description="实际使用的 URL")
    url_fallback: bool = Field(default=False, description="是否使用了默认 URL")
    skipped: bool = Field(default=False, description="是否跳过爬取")


# ==================== AI 分析相关模型 ====================

class HKStockMarketAnalysisRequest(BaseModel):
    """港股市场 AI 分析请求"""
    provider: Optional[str] = Field(default=None, description="LLM 供应商：doubao/openai")
    model: Optional[str] = Field(default=None, description="模型名称")


class HKStockMarketAnalysisVo(BaseModel):
    """港股市场 AI 分析结果"""
    report: str = Field(..., description="Markdown 格式的投资建议报告")
    news_summary: Optional[dict] = Field(None, description="新闻摘要统计信息")
